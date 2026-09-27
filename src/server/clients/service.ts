import "server-only";
import { db } from "../db";
import { writeAudit } from "../audit/log";
import { assertPermission, type Actor } from "../auth/permissions";
import { DomainRuleError } from "@/domain/shared/errors";
import { clientInputSchema, contactInputSchema } from "./schemas";

/** Internal list for operators. Never reachable by CLIENT (clients:read). */
export async function listClients(actor: Actor) {
  assertPermission(actor, "clients:read");
  return db.client.findMany({
    orderBy: { displayName: "asc" },
    select: {
      id: true,
      displayName: true,
      industry: true,
      market: true,
      updatedAt: true,
      _count: { select: { contacts: true } },
      opportunities: { select: { stage: true } },
    },
  });
}

export async function getClient(actor: Actor, id: string) {
  assertPermission(actor, "clients:read");
  const client = await db.client.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { name: "asc" } },
      opportunities: {
        orderBy: { updatedAt: "desc" },
        select: { id: true, stage: true, businessObjective: true, nextAction: true, nextActionDate: true },
      },
    },
  });
  if (!client) throw new DomainRuleError("NOT_FOUND", "Client not found.");
  return client;
}

export async function createClient(actor: Actor, raw: unknown) {
  assertPermission(actor, "clients:write");
  const data = clientInputSchema.parse(raw);
  return db.$transaction(async (tx) => {
    const client = await tx.client.create({ data });
    await writeAudit({ userId: actor.id, entityType: "Client", entityId: client.id, action: "CREATE", after: data }, tx);
    return client;
  });
}

export async function updateClient(actor: Actor, id: string, raw: unknown) {
  assertPermission(actor, "clients:write");
  const data = clientInputSchema.parse(raw);
  return db.$transaction(async (tx) => {
    const before = await tx.client.findUnique({ where: { id } });
    if (!before) throw new DomainRuleError("NOT_FOUND", "Client not found.");
    const after = await tx.client.update({ where: { id }, data });
    await writeAudit({ userId: actor.id, entityType: "Client", entityId: id, action: "UPDATE", before: pick(before, data), after: data }, tx);
    return after;
  });
}

export async function createContact(actor: Actor, clientId: string, raw: unknown) {
  assertPermission(actor, "clients:write");
  const data = contactInputSchema.parse(raw);
  return db.$transaction(async (tx) => {
    const exists = await tx.client.count({ where: { id: clientId } });
    if (!exists) throw new DomainRuleError("NOT_FOUND", "Client not found.");
    const contact = await tx.contact.create({ data: { ...data, clientId } });
    await writeAudit({ userId: actor.id, entityType: "Contact", entityId: contact.id, action: "CREATE", after: { clientId, ...data } }, tx);
    return contact;
  });
}

export async function updateContact(actor: Actor, contactId: string, raw: unknown) {
  assertPermission(actor, "clients:write");
  const data = contactInputSchema.parse(raw);
  return db.$transaction(async (tx) => {
    const before = await tx.contact.findUnique({ where: { id: contactId } });
    if (!before) throw new DomainRuleError("NOT_FOUND", "Contact not found.");
    const after = await tx.contact.update({ where: { id: contactId }, data });
    await writeAudit({ userId: actor.id, entityType: "Contact", entityId: contactId, action: "UPDATE", before: pick(before, data), after: data }, tx);
    return after;
  });
}

/** The subset of `row` whose keys appear in `shape` — keeps audit diffs focused. */
function pick<T extends object>(row: T, shape: object): Partial<T> {
  return Object.fromEntries(Object.keys(shape).map((k) => [k, (row as Record<string, unknown>)[k]])) as Partial<T>;
}
