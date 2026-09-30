/**
 * Phase 4 against PostgreSQL: QA gate, finalization, publish lock, frozen
 * snapshots, republish/withdraw, and client isolation for report reads.
 */
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@/server/auth/permissions";
import {
  createDiagnostic,
  createFinding,
  createLeakScenario,
  createPriorityFix,
  updateIntake,
  updateNarrative,
  updateSection,
  updateZoneScore,
} from "@/server/diagnostics/service";
import { createEvidence } from "@/server/evidence/service";
import { finalizeDiagnostic, runQa } from "@/server/qa/service";
import { getReportForViewer, publishReport, withdrawReport } from "@/server/reports/service";

const db = new PrismaClient();
const tag = `p4test_${Date.now()}`;
let op: Actor;
let clientA: string;
let clientB: string;
let viewerA: Actor;
let viewerB: Actor;
const ATTEST = { noFabricatedMetrics: "on", aestheticsNotOverRewarded: "on" };

beforeAll(async () => {
  const u = await db.user.create({ data: { email: `${tag}@test.local`, name: "P4 Operator", role: "OPERATOR", passwordHash: "x" } });
  op = { id: u.id, role: "OPERATOR", clientId: null };
  clientA = (await db.client.create({ data: { legalName: `${tag} A`, displayName: `${tag} A`, notes: "CLIENT-NOTE-INTERNAL" } })).id;
  clientB = (await db.client.create({ data: { legalName: `${tag} B`, displayName: `${tag} B` } })).id;
  viewerA = { id: "va", role: "CLIENT", clientId: clientA };
  viewerB = { id: "vb", role: "CLIENT", clientId: clientB };
});

afterAll(async () => {
  const ids = [clientA, clientB];
  await db.clientReport.deleteMany({ where: { clientId: { in: ids } } });
  const ds = (await db.diagnostic.findMany({ where: { clientId: { in: ids } }, select: { id: true } })).map((d) => d.id);
  await db.zoneScoreEvidence.deleteMany({ where: { zoneScore: { diagnosticId: { in: ds } } } });
  await db.sectionResultEvidence.deleteMany({ where: { sectionResult: { diagnosticId: { in: ds } } } });
  await db.findingEvidence.deleteMany({ where: { finding: { diagnosticId: { in: ds } } } });
  await db.priorityFixEvidence.deleteMany({ where: { priorityFix: { diagnosticId: { in: ds } } } });
  await db.evidenceItem.deleteMany({ where: { clientId: { in: ids } } });
  await db.diagnostic.deleteMany({ where: { clientId: { in: ids } } });
  await db.client.deleteMany({ where: { id: { in: ids } } });
  await db.user.updateMany({ where: { email: { startsWith: tag } }, data: { active: false } });
  await db.$disconnect();
});

/** A diagnostic that satisfies every QA check, built only through services. */
async function completeDiagnostic(clientId: string) {
  const d = await createDiagnostic(op, { clientId, title: `${tag} complete` });
  await updateIntake(op, d.id, { intakeObjective: "o", intakeWebsiteUrl: "https://x.example", intakeCurrentSystems: "c", intakeDemandSources: "s" });
  const ev = await createEvidence(
    op,
    d.id,
    { type: "WEBSITE_OBSERVATION", source: "Homepage", sourceUrl: "https://x.example", capturedText: "No booking CTA", evidenceState: "VERIFIED", stateReason: "seen", operatorNotes: "OPERATOR-NOTE-INTERNAL" },
    null,
  );
  for (const z of await db.zoneScore.findMany({ where: { diagnosticId: d.id } })) {
    await updateZoneScore(op, z.id, { score: "5", diagnosis: "d", primaryWeakness: "w", evidenceIds: [ev.id] });
  }
  for (const s of await db.sectionResult.findMany({ where: { diagnosticId: d.id } })) {
    await updateSection(op, s.id, { status: "COMPLETE", findingsSummary: "summary", evidenceIds: [] });
  }
  await createFinding(op, d.id, { statement: "No booking CTA on mobile", evidenceState: "VERIFIED", isMaterial: "on", clientFacing: "on", evidenceIds: [ev.id] });
  await createFinding(op, d.id, { statement: "INTERNAL-FINDING owner hesitant", evidenceState: "ASSUMPTION", isMaterial: "", clientFacing: "", evidenceIds: [] });
  await createPriorityFix(op, d.id, { problem: "No CTA", fix: "Add Book Now", evidenceIds: [ev.id] });
  await createLeakScenario(op, d.id, { label: "Calls", averageClientValue: "850", averageClientValueState: "CLIENT_PROVIDED", missedBookingsPerWeek: "3", missedBookingsState: "ASSUMPTION" });
  await updateNarrative(op, d.id, {
    executiveDiagnosis: "Original diagnosis",
    revenueSpineStrength: "s",
    biggestConstraint: "c",
    recommendedInterventionDirection: "r",
    implementationReadiness: "i",
    measurementPlan: "m",
    nextDecision: "n",
    finalRecommendation: "f",
    internalNotes: "NARRATIVE-INTERNAL-NOTE",
  });
  return d.id;
}

describe("QA gate (BD §13)", () => {
  it("fails an incomplete diagnostic, records the run, and blocks publishing", async () => {
    const d = await createDiagnostic(op, { clientId: clientA, title: `${tag} incomplete` });
    const r = await runQa(op, d.id, ATTEST);
    expect(r.resultStatus).toBe("QA_FAILED");
    expect(r.checks.filter((c) => !c.passed).map((c) => c.key)).toContain("FIFTEEN_SECTIONS_COMPLETE");
    expect(await db.qaRun.count({ where: { diagnosticId: d.id } })).toBe(1);
    await expect(publishReport(op, d.id)).rejects.toThrow(/until QA has passed/);
  });

  it("requires both attestations", async () => {
    const id = await completeDiagnostic(clientA);
    const r = await runQa(op, id, { noFabricatedMetrics: "on" });
    expect(r.resultStatus).toBe("QA_FAILED");
    expect(r.checks.find((c) => c.key === "AESTHETICS_NOT_OVER_REWARDED")?.passed).toBe(false);
  });

  it("passes a complete diagnostic; CLIENT cannot run QA", async () => {
    const id = await completeDiagnostic(clientA);
    await expect(runQa(viewerA, id, ATTEST)).rejects.toThrow(/do not have access/);
    const r = await runQa(op, id, ATTEST);
    expect(r.checks.filter((c) => !c.passed)).toEqual([]);
    expect((await db.diagnostic.findUniqueOrThrow({ where: { id } })).qaStatus).toBe("QA_PASSED");
    await expect(runQa(op, id, ATTEST)).rejects.toThrow(/already passed/);
  });
});

describe("publishing and snapshots (L5, L6, ADR-009)", () => {
  it("publishes a frozen, client-safe snapshot with version ids", async () => {
    const id = await completeDiagnostic(clientA);
    await runQa(op, id, ATTEST);
    const report = await publishReport(op, id);
    const d = await db.diagnostic.findUniqueOrThrow({ where: { id } });
    expect([report.frameworkVersionId, report.scoringVersionId, report.reportTemplateVersionId]).toEqual([d.frameworkVersionId, d.scoringVersionId, d.reportTemplateVersionId]);

    const json = JSON.stringify(report.snapshot);
    for (const secret of ["OPERATOR-NOTE-INTERNAL", "NARRATIVE-INTERNAL-NOTE", "INTERNAL-FINDING", "CLIENT-NOTE-INTERNAL", "promptText"]) {
      expect(json).not.toContain(secret);
    }

    // Editing after publish reopens QA but never changes the published snapshot.
    await updateNarrative(op, id, { executiveDiagnosis: "Edited later", nextDecision: "n" });
    expect((await db.diagnostic.findUniqueOrThrow({ where: { id } })).qaStatus).toBe("NOT_READY");
    const view = await getReportForViewer(viewerA, report.id);
    expect(view.snapshot.narrative.executiveDiagnosis).toBe("Original diagnosis");
    await expect(publishReport(op, id)).rejects.toThrow(/until QA has passed/);
  });

  it("republishing withdraws the previous report", async () => {
    const id = await completeDiagnostic(clientA);
    await runQa(op, id, ATTEST);
    const first = await publishReport(op, id);
    const second = await publishReport(op, id);
    const statuses = await db.clientReport.findMany({ where: { id: { in: [first.id, second.id] } }, select: { id: true, status: true } });
    expect(statuses.find((s) => s.id === first.id)?.status).toBe("WITHDRAWN");
    expect(statuses.find((s) => s.id === second.id)?.status).toBe("PUBLISHED");
  });
});

describe("client isolation for reports (A1)", () => {
  it("lets a client read only their own published reports", async () => {
    const id = await completeDiagnostic(clientA);
    await runQa(op, id, ATTEST);
    const r = await publishReport(op, id);

    expect((await getReportForViewer(viewerA, r.id)).snapshot.clientName).toBe(`${tag} A`);
    await expect(getReportForViewer(viewerB, r.id)).rejects.toThrow(/not found/i);
    await expect(getReportForViewer({ id: "u", role: "CLIENT", clientId: null }, r.id)).rejects.toThrow(/not found/i);
    await expect(getReportForViewer({ id: "c", role: "CONTRACTOR", clientId: null }, r.id)).rejects.toThrow(/not found/i);

    await expect(withdrawReport(op, r.id, " ")).rejects.toThrow(/requires a reason/);
    await withdrawReport(op, r.id, "Client asked for a correction");
    await expect(getReportForViewer(viewerA, r.id)).rejects.toThrow(/not found/i);
    expect((await getReportForViewer(op, r.id)).status).toBe("WITHDRAWN"); // internal can still see it
  });
});

describe("finalization (L4)", () => {
  it("finalizes only after QA passes and freezes the versions", async () => {
    const id = await completeDiagnostic(clientA);
    await expect(finalizeDiagnostic(op, id)).rejects.toThrow();
    await runQa(op, id, ATTEST);
    await finalizeDiagnostic(op, id);
    const d = await db.diagnostic.findUniqueOrThrow({ where: { id } });
    expect(d).toMatchObject({ qaStatus: "FINALIZED", finalizedById: op.id });
    await expect(updateNarrative(op, id, { executiveDiagnosis: "x" })).rejects.toThrow(/finalized/);
    const log = await db.auditLog.findFirstOrThrow({ where: { entityId: id, action: "FINALIZE" } });
    expect(log.after).toMatchObject({ qaStatus: "FINALIZED", frameworkVersionId: d.frameworkVersionId, scoringVersionId: d.scoringVersionId });
    // A finalized diagnostic can still be published.
    expect((await publishReport(op, id)).status).toBe("PUBLISHED");
  });
});
