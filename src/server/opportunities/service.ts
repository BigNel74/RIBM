import "server-only";
import type { OpportunityStage, Prisma } from "@prisma/client";
import { db } from "../db";
import { writeAudit } from "../audit/log";
import { assertPermission, type Actor } from "../auth/permissions";
import { DomainRuleError } from "@/domain/shared/errors";
import { assertStageChange, LIVE_STAGES } from "@/domain/opportunities/stage-rules";
import { opportunityCreateSchema, opportunityDetailsSchema, stageChangeSchema, type OpportunityDetails } from "./schemas";

type Tx = Prisma.TransactionClient;

/** Referential integrity the schema cannot express: contact must belong to the same client. */
async function assertContactBelongs(tx: Tx, clientId: string, contactId: string | null) {
  if (!contactId) return;
  const ok = await tx.contact.count({ where: { id: contactId, clientId } });
  if (!ok) throw new DomainRuleError("CONTACT_CLIENT_MISMATCH", "The primary contact must belong to this client.");
}

async function assertOfferExists(tx: Tx, offerId: string | null) {
  if (!offerId) return;
  const ok = await tx.offer.count({ where: { id: offerId } });
  if (!ok) throw new DomainRuleError("NOT_FOUND", "Offer not found.");
}

export async function listOpportunities(actor: Actor, filter: { stages?: OpportunityStage[] } = {}) {
  assertPermission(actor, "opportunities:read");
  return db.opportunity.findMany({
    where: filter.stages ? { stage: { in: filter.stages } } : undefined,
    orderBy: [{ nextActionDate: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
    select: {
      id: true,
      stage: true,
      businessObjective: true,
      nextAction: true,
      nextActionDate: true,
      qualificationState: true,
      client: { select: { id: true, displayName: true } },
      offer: { select: { name: true, status: true } },
    },
  });
}

export async function getOpportunity(actor: Actor, id: string) {
  assertPermission(actor, "opportunities:read");
  const opp = await db.opportunity.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, displayName: true, contacts: { orderBy: { name: "asc" }, select: { id: true, name: true, title: true } } } },
      primaryContact: { select: { id: true, name: true, title: true, authorityLevel: true } },
      offer: { select: { id: true, name: true, status: true } },
    },
  });
  if (!opp) throw new DomainRuleError("NOT_FOUND", "Opportunity not found.");
  return opp;
}

export async function createOpportunity(actor: Actor, raw: unknown) {
  assertPermission(actor, "opportunities:write");
  const data = opportunityCreateSchema.parse(raw);
  return db.$transaction(async (tx) => {
    const client = await tx.client.count({ where: { id: data.clientId } });
    if (!client) throw new DomainRuleError("NOT_FOUND", "Client not found.");
    await assertContactBelongs(tx, data.clientId, data.primaryContactId);
    await assertOfferExists(tx, data.offerId);
    const opp = await tx.opportunity.create({ data: { ...data, stage: "TARGET" } });
    await writeAudit({ userId: actor.id, entityType: "Opportunity", entityId: opp.id, action: "CREATE", after: { ...data, stage: "TARGET" } }, tx);
    return opp;
  });
}

/** Edits qualification context. Stage moves go through changeStage only. */
export async function updateOpportunityDetails(actor: Actor, id: string, raw: unknown) {
  assertPermission(actor, "opportunities:write");
  const data: OpportunityDetails = opportunityDetailsSchema.parse(raw);
  return db.$transaction(async (tx) => {
    const before = await tx.opportunity.findUnique({ where: { id } });
    if (!before) throw new DomainRuleError("NOT_FOUND", "Opportunity not found.");
    if (LIVE_STAGES.includes(before.stage) && (!data.nextAction || !data.nextActionDate)) {
      throw new DomainRuleError("STAGE_NEXT_ACTION", "Every live opportunity needs a next action and a next-action date.");
    }
    await assertContactBelongs(tx, before.clientId, data.primaryContactId);
    await assertOfferExists(tx, data.offerId);
    const after = await tx.opportunity.update({ where: { id }, data });
    const beforeSubset = Object.fromEntries(Object.keys(data).map((k) => [k, before[k as keyof typeof before]]));
    await writeAudit({ userId: actor.id, entityType: "Opportunity", entityId: id, action: "UPDATE", before: beforeSubset, after: data }, tx);
    return after;
  });
}

export async function changeStage(actor: Actor, id: string, raw: unknown) {
  assertPermission(actor, "opportunities:write");
  const input = stageChangeSchema.parse(raw);
  return db.$transaction(async (tx) => {
    const opp = await tx.opportunity.findUnique({ where: { id } });
    if (!opp) throw new DomainRuleError("NOT_FOUND", "Opportunity not found.");

    // Carry forward the existing next action when the form leaves it blank.
    const nextAction = input.nextAction ?? opp.nextAction;
    const nextActionDate = input.nextActionDate ?? opp.nextActionDate;

    const result = assertStageChange({
      from: opp.stage,
      to: input.toStage,
      authorityState: opp.authorityState,
      demandSourceState: opp.demandSourceState,
      reason: input.reason,
      overrideReason: input.overrideReason,
      disqualificationReason: input.disqualificationReason,
      nextAction,
      nextActionDate,
    });

    const data: Prisma.OpportunityUpdateInput = {
      stage: input.toStage,
      stageChangedAt: new Date(),
      nextAction,
      nextActionDate,
      ...(result.qualificationState ? { qualificationState: result.qualificationState } : {}),
      ...(input.toStage === "DISQUALIFIED" ? { disqualificationReason: input.disqualificationReason } : {}),
      ...(input.toStage === "TARGET" && opp.stage === "DISQUALIFIED" ? { disqualificationReason: null } : {}),
    };
    const updated = await tx.opportunity.update({ where: { id }, data });

    const reason =
      [
        result.qualificationOverridden ? `QUALIFICATION OVERRIDE: ${input.overrideReason}` : null,
        input.disqualificationReason ? `Disqualified: ${input.disqualificationReason}` : null,
        input.reason,
      ]
        .filter(Boolean)
        .join(" | ") || null;

    await writeAudit(
      {
        userId: actor.id,
        entityType: "Opportunity",
        entityId: id,
        action: "STATE_CHANGE",
        before: { stage: opp.stage, qualificationState: opp.qualificationState },
        after: { stage: updated.stage, qualificationState: updated.qualificationState, qualificationOverridden: result.qualificationOverridden },
        reason,
      },
      tx,
    );
    return updated;
  });
}

export async function opportunityHistory(actor: Actor, id: string) {
  assertPermission(actor, "opportunities:read");
  return db.auditLog.findMany({
    where: { entityType: "Opportunity", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: { id: true, action: true, before: true, after: true, reason: true, createdAt: true, user: { select: { name: true } } },
  });
}
