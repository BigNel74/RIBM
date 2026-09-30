/**
 * Phase 2 service tests against PostgreSQL: permissions, qualification gate,
 * cross-client integrity, and audit records written with each mutation.
 */
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@/server/auth/permissions";
import { createClient, createContact, updateClient } from "@/server/clients/service";
import { changeStage, createOpportunity, updateOpportunityDetails } from "@/server/opportunities/service";
import { recordFrameworkAdoption } from "@/server/framework/service";

const db = new PrismaClient();
const tag = `p2test_${Date.now()}`;
let operator: Actor;
let sales: Actor;
let admin: Actor;
const clientRole: Actor = { id: "nobody", role: "CLIENT", clientId: "whatever" };
const clientIds: string[] = [];
let fwId: string;

const nextWeek = "2099-01-08";

beforeAll(async () => {
  const mk = (role: "OPERATOR" | "SALES_ADVISOR" | "ADMIN") =>
    db.user.create({ data: { email: `${tag}-${role}@test.local`, name: role, role, passwordHash: "x" } });
  const [o, s, a] = await Promise.all([mk("OPERATOR"), mk("SALES_ADVISOR"), mk("ADMIN")]);
  operator = { id: o.id, role: "OPERATOR", clientId: null };
  sales = { id: s.id, role: "SALES_ADVISOR", clientId: null };
  admin = { id: a.id, role: "ADMIN", clientId: null };
  // Isolated framework row so the real RS-FW-2.1 adoption is never touched by tests.
  fwId = (await db.frameworkVersion.create({ data: { code: `${tag}-FW`, label: "test", status: "ACTIVE" } })).id;
});

afterAll(async () => {
  await db.opportunity.deleteMany({ where: { clientId: { in: clientIds } } });
  await db.contact.deleteMany({ where: { clientId: { in: clientIds } } });
  await db.client.deleteMany({ where: { id: { in: clientIds } } });
  // Users and the test framework have audit rows (append-only), so they are deactivated/left, not deleted.
  await db.user.updateMany({ where: { email: { startsWith: tag } }, data: { active: false } });
  // Never leave a second ACTIVE framework behind — diagnostics require exactly one.
  await db.frameworkVersion.updateMany({ where: { code: { startsWith: "p2test_" } }, data: { status: "RETIRED" } });
  await db.$disconnect();
});

async function newClient(name: string) {
  const c = await createClient(operator, { legalName: `${tag} ${name} LLC`, displayName: `${tag} ${name}` });
  clientIds.push(c.id);
  return c;
}

describe("clients", () => {
  it("creates and edits with audit entries", async () => {
    const c = await newClient("Alpha");
    await updateClient(operator, c.id, { legalName: `${tag} Alpha LLC`, displayName: `${tag} Alpha Dental`, website: "https://alpha.example" });
    const logs = await db.auditLog.findMany({ where: { entityType: "Client", entityId: c.id }, orderBy: { createdAt: "asc" } });
    expect(logs.map((l) => l.action)).toEqual(["CREATE", "UPDATE"]);
    expect(logs[1].after).toMatchObject({ displayName: `${tag} Alpha Dental` });
  });

  it("rejects invalid input with field errors", async () => {
    await expect(createClient(operator, { legalName: "", displayName: "x", website: "not a url" })).rejects.toThrow();
  });

  it("denies SALES_ADVISOR and CLIENT from writing clients", async () => {
    await expect(createClient(sales, { legalName: "x", displayName: "x" })).rejects.toThrow(/do not have access/);
    await expect(createClient(clientRole, { legalName: "x", displayName: "x" })).rejects.toThrow(/do not have access/);
  });
});

describe("opportunities", () => {
  it("requires a next action on create", async () => {
    const c = await newClient("NoNext");
    await expect(createOpportunity(operator, { clientId: c.id })).rejects.toThrow();
  });

  it("rejects a primary contact from another client", async () => {
    const a = await newClient("A");
    const b = await newClient("B");
    const bContact = await createContact(operator, b.id, { name: "Bea" });
    await expect(
      createOpportunity(operator, { clientId: a.id, primaryContactId: bContact.id, nextAction: "Call", nextActionDate: nextWeek }),
    ).rejects.toThrow(/must belong to this client/);
  });

  it("enforces the qualification gate, logs overrides, and lets SALES_ADVISOR advance stages", async () => {
    const c = await newClient("Gate");
    const opp = await createOpportunity(sales, { clientId: c.id, nextAction: "Intro call", nextActionDate: nextWeek });
    expect(opp.stage).toBe("TARGET");

    await expect(changeStage(sales, opp.id, { toStage: "QUALIFIED" })).rejects.toThrow(/Not qualified/);

    await changeStage(sales, opp.id, { toStage: "QUALIFIED", overrideReason: "Owner confirmed 40 inbound calls/week verbally" });
    const after = await db.opportunity.findUniqueOrThrow({ where: { id: opp.id } });
    expect(after).toMatchObject({ stage: "QUALIFIED", qualificationState: "QUALIFIED" });

    const log = await db.auditLog.findFirstOrThrow({ where: { entityId: opp.id, action: "STATE_CHANGE" } });
    expect(log.reason).toMatch(/^QUALIFICATION OVERRIDE: Owner confirmed/);
    expect(log.userId).toBe(sales.id);
    expect(log.after).toMatchObject({ qualificationOverridden: true });
  });

  it("blocks PROPOSAL without confirmed authority, then allows it once confirmed", async () => {
    const c = await newClient("Proposal");
    const opp = await createOpportunity(operator, {
      clientId: c.id,
      nextAction: "Diagnostic",
      nextActionDate: nextWeek,
      authorityState: "PARTIAL",
      demandSourceState: "MEANINGFUL",
    });
    await changeStage(operator, opp.id, { toStage: "QUALIFIED" });
    await expect(changeStage(operator, opp.id, { toStage: "PROPOSAL" })).rejects.toThrow(/confirmed decision authority/);
    await updateOpportunityDetails(operator, opp.id, {
      authorityState: "CONFIRMED",
      demandSourceState: "MEANINGFUL",
      nextAction: "Send proposal",
      nextActionDate: nextWeek,
    });
    await changeStage(operator, opp.id, { toStage: "PROPOSAL" });
    expect((await db.opportunity.findUniqueOrThrow({ where: { id: opp.id } })).stage).toBe("PROPOSAL");
  });

  it("stores the disqualification reason", async () => {
    const c = await newClient("DQ");
    const opp = await createOpportunity(operator, { clientId: c.id, nextAction: "Call", nextActionDate: nextWeek });
    await changeStage(operator, opp.id, { toStage: "DISQUALIFIED", disqualificationReason: "No demand source" });
    expect(await db.opportunity.findUniqueOrThrow({ where: { id: opp.id } })).toMatchObject({
      stage: "DISQUALIFIED",
      qualificationState: "DISQUALIFIED",
      disqualificationReason: "No demand source",
    });
  });

  it("denies CLIENT from reading or writing opportunities", async () => {
    await expect(changeStage(clientRole, "x", { toStage: "QUALIFIED" })).rejects.toThrow(/do not have access/);
  });
});

describe("framework adoption (C-02)", () => {
  it("is ADMIN-only", async () => {
    await expect(recordFrameworkAdoption(operator, fwId, "I adopt")).rejects.toThrow(/do not have access/);
  });

  it("records once, attributed to the acting admin, with the statement audit-logged", async () => {
    await recordFrameworkAdoption(admin, fwId, "Founder adopts this framework.");
    const fw = await db.frameworkVersion.findUniqueOrThrow({ where: { id: fwId } });
    expect(fw.adoptedById).toBe(admin.id);
    expect(fw.adoptedAt).not.toBeNull();
    const log = await db.auditLog.findFirstOrThrow({ where: { entityId: fwId, action: "FRAMEWORK_CHANGE" } });
    expect(log).toMatchObject({ userId: admin.id, reason: "Founder adopts this framework." });
    await expect(recordFrameworkAdoption(admin, fwId, "again")).rejects.toThrow(/already recorded/);
  });
});
