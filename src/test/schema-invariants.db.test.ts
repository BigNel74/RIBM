/**
 * Database-level invariants from the init migration. Requires a migrated and
 * seeded database (npm run db:migrate && npm run db:seed).
 */
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PrismaClient();
const tag = `dbtest_${Date.now()}`;
let operatorId: string;
let clientId: string;

beforeAll(async () => {
  const op = await db.user.create({
    data: { email: `${tag}@test.local`, name: "DB Test Operator", role: "OPERATOR", passwordHash: "x" },
  });
  operatorId = op.id;
  const client = await db.client.create({ data: { legalName: `${tag} LLC`, displayName: tag } });
  clientId = client.id;
});

afterAll(async () => {
  // Evidence restricts diagnostic deletion (E4), so it goes first.
  await db.evidenceItem.deleteMany({ where: { clientId } });
  await db.diagnostic.deleteMany({ where: { clientId } });
  await db.user.deleteMany({ where: { email: { startsWith: tag } } });
  await db.client.deleteMany({ where: { id: clientId } });
  await db.$disconnect();
});

describe("seeded framework", () => {
  it("has the active framework with 5 zones and 15 sections", async () => {
    const fw = await db.frameworkVersion.findUniqueOrThrow({
      where: { code: "RS-FW-2.1" },
      include: { zones: true, sections: true },
    });
    expect(fw.status).toBe("ACTIVE");
    expect(fw.zones).toHaveLength(5);
    expect(fw.sections.map((s) => s.number).sort((a, b) => a - b)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
    expect(fw.adoptedAt).toBeNull(); // DECISIONS C-02
  });

  it("has exactly one PRIMARY offer, TESTING, with LOW confidence on all five dimensions", async () => {
    const primary = await db.offer.findMany({ where: { status: "PRIMARY" }, include: { confidence: true } });
    expect(primary.map((o) => o.name)).toEqual(["Revenue Spine Conversion Infrastructure"]);
    expect(primary[0].validationState).toBe("TESTING");
    expect(primary[0].confidence.map((c) => c.level)).toEqual(["LOW", "LOW", "LOW", "LOW", "LOW"]);
  });
});

describe("diagnostic version pinning and score constraints", () => {
  it("pins versions, rejects out-of-range scores, and keeps pins after edits", async () => {
    const fw = await db.frameworkVersion.findUniqueOrThrow({ where: { code: "RS-FW-2.1" }, include: { zones: true } });
    const sc = await db.scoringVersion.findUniqueOrThrow({ where: { code: "RS-SC-1.0" } });
    const rt = await db.reportTemplateVersion.findUniqueOrThrow({ where: { code: "RS-RT-1.0" } });

    const d = await db.diagnostic.create({
      data: {
        clientId,
        title: "DB test diagnostic",
        frameworkVersionId: fw.id,
        scoringVersionId: sc.id,
        reportTemplateVersionId: rt.id,
        createdById: operatorId,
        zoneScores: { create: fw.zones.map((z) => ({ zoneDefinitionId: z.id, scoringVersionId: sc.id })) },
      },
      include: { zoneScores: true },
    });
    expect(d.zoneScores).toHaveLength(5);

    const zs = d.zoneScores[0];
    await expect(db.zoneScore.update({ where: { id: zs.id }, data: { score: 11 } })).rejects.toThrow(/ZoneScore_score_range/);
    await expect(db.zoneScore.update({ where: { id: zs.id }, data: { score: 0 } })).rejects.toThrow(/ZoneScore_score_range/);
    await db.zoneScore.update({ where: { id: zs.id }, data: { score: 4 } });

    await db.diagnostic.update({ where: { id: d.id }, data: { executiveDiagnosis: "edited" } });
    const after = await db.diagnostic.findUniqueOrThrow({ where: { id: d.id } });
    expect([after.frameworkVersionId, after.scoringVersionId, after.reportTemplateVersionId]).toEqual([fw.id, sc.id, rt.id]);
  });

  it("blocks deleting evidence that a score references (E4)", async () => {
    const d = await db.diagnostic.findFirstOrThrow({ where: { clientId }, include: { zoneScores: true } });
    const ev = await db.evidenceItem.create({
      data: { clientId, diagnosticId: d.id, type: "WEBSITE_OBSERVATION", source: "homepage", capturedById: operatorId },
    });
    expect(ev.evidenceState).toBe("NOT_VERIFIED"); // E2: never defaults to VERIFIED
    await db.zoneScoreEvidence.create({ data: { zoneScoreId: d.zoneScores[0].id, evidenceItemId: ev.id } });
    await expect(db.evidenceItem.delete({ where: { id: ev.id } })).rejects.toThrow();
    await db.zoneScoreEvidence.deleteMany({ where: { evidenceItemId: ev.id } });
  });
});

describe("access constraints", () => {
  it("rejects a CLIENT user without a client binding", async () => {
    await expect(
      db.user.create({ data: { email: `${tag}-c@test.local`, name: "x", role: "CLIENT", passwordHash: "x" } }),
    ).rejects.toThrow(/User_client_binding/);
  });

  it("rejects an internal user bound to a client", async () => {
    await expect(
      db.user.create({ data: { email: `${tag}-o@test.local`, name: "x", role: "OPERATOR", passwordHash: "x", clientId } }),
    ).rejects.toThrow(/User_client_binding/);
  });
});

describe("audit log", () => {
  it("is append-only", async () => {
    const row = await db.auditLog.create({
      data: { userId: null, entityType: "Test", entityId: tag, action: "CREATE", after: { ok: true } },
    });
    await expect(db.auditLog.update({ where: { id: row.id }, data: { reason: "tamper" } })).rejects.toThrow(/append-only/);
    await expect(db.auditLog.delete({ where: { id: row.id } })).rejects.toThrow(/append-only/);
  });
});

describe("revenue period constraints", () => {
  it("rejects more wins than decided proposals", async () => {
    await expect(
      db.revenuePeriod.create({
        data: { periodStart: new Date("1999-01-01"), cashTarget: 1000, decidedProposals: 2, wonProposals: 3, enteredById: operatorId },
      }),
    ).rejects.toThrow(/RevenuePeriod_won_le_decided/);
  });
});
