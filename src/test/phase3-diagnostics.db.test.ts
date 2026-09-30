/**
 * Phase 3 service tests against PostgreSQL: version pinning, evidence
 * integrity, scoring thresholds, finding certainty, exposure scenarios,
 * finalization immutability, QA reset, and private file storage.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@/server/auth/permissions";
import {
  createDiagnostic,
  createFinding,
  createLeakScenario,
  createPriorityFix,
  deletePriorityFix,
  movePriorityFix,
  updateNarrative,
  updateSection,
  updateZoneScore,
} from "@/server/diagnostics/service";
import { changeEvidenceState, createEvidence, deleteEvidence, getEvidenceFile, updateEvidenceContent } from "@/server/evidence/service";

const db = new PrismaClient();
const tag = `p3test_${Date.now()}`;
const storage = mkdtempSync(path.join(tmpdir(), "ribm-storage-"));
process.env.STORAGE_DIR = storage;

let op: Actor;
let clientId: string;
let diagnosticId: string;
const clientActor: Actor = { id: "x", role: "CLIENT", clientId: "x" };
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

beforeAll(async () => {
  const u = await db.user.create({ data: { email: `${tag}@test.local`, name: "P3 Operator", role: "OPERATOR", passwordHash: "x" } });
  op = { id: u.id, role: "OPERATOR", clientId: null };
  clientId = (await db.client.create({ data: { legalName: `${tag} LLC`, displayName: tag } })).id;
  diagnosticId = (await createDiagnostic(op, { clientId, title: `${tag} diagnostic` })).id;
});

afterAll(async () => {
  const ds = await db.diagnostic.findMany({ where: { clientId }, select: { id: true } });
  const ids = ds.map((d) => d.id);
  await db.zoneScoreEvidence.deleteMany({ where: { zoneScore: { diagnosticId: { in: ids } } } });
  await db.sectionResultEvidence.deleteMany({ where: { sectionResult: { diagnosticId: { in: ids } } } });
  await db.findingEvidence.deleteMany({ where: { finding: { diagnosticId: { in: ids } } } });
  await db.priorityFixEvidence.deleteMany({ where: { priorityFix: { diagnosticId: { in: ids } } } });
  await db.evidenceItem.deleteMany({ where: { clientId } });
  await db.diagnostic.deleteMany({ where: { clientId } });
  await db.client.delete({ where: { id: clientId } });
  await db.user.updateMany({ where: { email: { startsWith: tag } }, data: { active: false } });
  await db.$disconnect();
  rmSync(storage, { recursive: true, force: true });
});

const evidence = (state: "NOT_VERIFIED" | "VERIFIED" | "CLIENT_PROVIDED" | "ASSUMPTION" = "NOT_VERIFIED", extra: Record<string, unknown> = {}) =>
  createEvidence(
    op,
    diagnosticId,
    {
      type: "WEBSITE_OBSERVATION",
      source: "Homepage",
      sourceUrl: state === "VERIFIED" ? "https://example.com/" : "",
      evidenceState: state,
      stateReason: state === "NOT_VERIFIED" ? "" : "Observed directly",
      ...extra,
    },
    null,
  );

describe("diagnostic creation", () => {
  it("pins active versions and creates 5 zones and 15 sections", async () => {
    const d = await db.diagnostic.findUniqueOrThrow({
      where: { id: diagnosticId },
      include: { frameworkVersion: true, scoringVersion: true, reportTemplateVersion: true, _count: { select: { zoneScores: true, sectionResults: true } } },
    });
    expect([d.frameworkVersion.code, d.scoringVersion.code, d.reportTemplateVersion?.code]).toEqual(["RS-FW-2.1", "RS-SC-1.0", "RS-RT-1.0"]);
    expect(d._count).toEqual({ zoneScores: 5, sectionResults: 15 });
    expect(d.qaStatus).toBe("NOT_READY");
  });

  it("rejects an opportunity from another client", async () => {
    await expect(createDiagnostic(op, { clientId, opportunityId: "not-this-clients", title: "x" })).rejects.toThrow(/must belong/);
  });
});

describe("evidence states (E1, E2)", () => {
  it("defaults to NOT_VERIFIED", async () => {
    expect((await evidence()).evidenceState).toBe("NOT_VERIFIED");
  });

  it("refuses VERIFIED at capture without a source", async () => {
    await expect(
      createEvidence(op, diagnosticId, { type: "WEBSITE_OBSERVATION", source: "x", evidenceState: "VERIFIED", stateReason: "seen" }, null),
    ).rejects.toThrow(/observed source/);
  });

  it("refuses ASSUMPTION → VERIFIED without a verification source, then allows it with one", async () => {
    const e = await evidence("ASSUMPTION");
    await expect(changeEvidenceState(op, e.id, { to: "VERIFIED", reason: "checked" })).rejects.toThrow(/observed source/);
    await changeEvidenceState(op, e.id, { to: "VERIFIED", reason: "checked", verificationSource: "https://example.com/book" });
    const log = await db.auditLog.findFirstOrThrow({ where: { entityId: e.id, action: "EVIDENCE_STATE_CHANGE" } });
    expect(log).toMatchObject({ reason: "checked", before: { evidenceState: "ASSUMPTION" } });
  });

  it("CLIENT role cannot capture or read evidence files", async () => {
    await expect(createEvidence(clientActor, diagnosticId, { type: "OTHER", source: "x" }, null)).rejects.toThrow(/do not have access/);
    await expect(getEvidenceFile(clientActor, "any")).rejects.toThrow(/do not have access/);
  });
});

describe("evidence files", () => {
  it("stores allowed files privately and serves them back", async () => {
    const e = await createEvidence(op, diagnosticId, { type: "SCREENSHOT", source: "Booking page" }, { name: "../../booking.png", bytes: PNG });
    expect(e).toMatchObject({ fileMimeType: "image/png", fileName: "booking.png", fileSize: PNG.byteLength });
    expect(e.fileRef).toMatch(/^evidence\/[a-z0-9]+\/[0-9a-f-]+\.png$/);
    const f = await getEvidenceFile(op, e.id);
    expect(new Uint8Array(f.bytes)).toEqual(PNG);
  });

  it("rejects disallowed content whatever the file name says", async () => {
    await expect(
      createEvidence(op, diagnosticId, { type: "SCREENSHOT", source: "x" }, { name: "shot.png", bytes: new TextEncoder().encode("<svg onload=alert(1)>") }),
    ).rejects.toThrow(/Only PNG/);
  });
});

describe("scoring (S1–S4)", () => {
  it("blocks 7+ without verified evidence, accepts it with verified evidence, and audits SCORE_CHANGE", async () => {
    const zone = await db.zoneScore.findFirstOrThrow({ where: { diagnosticId }, orderBy: { zoneDefinition: { position: "asc" } } });
    const weak = await evidence("CLIENT_PROVIDED");
    await expect(updateZoneScore(op, zone.id, { score: "7", evidenceIds: [weak.id] })).rejects.toThrow(/strong observable evidence/);

    const strong = await evidence("VERIFIED");
    await updateZoneScore(op, zone.id, { score: "7", evidenceIds: [strong.id, weak.id], diagnosis: "d", primaryWeakness: "w" });
    const log = await db.auditLog.findFirstOrThrow({ where: { entityId: zone.id, action: "SCORE_CHANGE" } });
    expect(log.after).toMatchObject({ score: 7 });

    await expect(updateZoneScore(op, zone.id, { score: "5", evidenceIds: [strong.id] })).rejects.toThrow(/requires a reason/);
    await updateZoneScore(op, zone.id, { score: "5", evidenceIds: [strong.id], changeReason: "Booking flow broken on mobile" });
    expect((await db.zoneScore.findUniqueOrThrow({ where: { id: zone.id } })).score).toBe(5);
  });

  it("cannot link evidence from another diagnostic", async () => {
    const other = await createDiagnostic(op, { clientId, title: `${tag} other` });
    const foreign = await createEvidence(op, other.id, { type: "OTHER", source: "elsewhere" }, null);
    const zone = await db.zoneScore.findFirstOrThrow({ where: { diagnosticId } });
    await expect(updateZoneScore(op, zone.id, { score: "3", evidenceIds: [foreign.id], changeReason: "r" })).rejects.toThrow(/only be linked from this diagnostic/);
  });
});

describe("evidence integrity (E4)", () => {
  it("keeps links through content edits and blocks deleting referenced evidence", async () => {
    const e = await evidence("VERIFIED");
    const section = await db.sectionResult.findFirstOrThrow({ where: { diagnosticId } });
    await updateSection(op, section.id, { status: "DRAFT", findingsSummary: "", evidenceIds: [e.id] });
    await updateEvidenceContent(op, e.id, { type: "WEBSITE_OBSERVATION", source: "Homepage (edited)", sourceUrl: "https://example.com/" });
    expect(await db.sectionResultEvidence.count({ where: { evidenceItemId: e.id } })).toBe(1);
    await expect(deleteEvidence(op, e.id)).rejects.toThrow(/cannot be deleted/);

    const loose = await evidence();
    await deleteEvidence(op, loose.id);
    expect(await db.evidenceItem.count({ where: { id: loose.id } })).toBe(0);
  });

  it("requires a summary to complete a section", async () => {
    const section = await db.sectionResult.findFirstOrThrow({ where: { diagnosticId } });
    await expect(updateSection(op, section.id, { status: "COMPLETE", findingsSummary: " " })).rejects.toThrow(/written summary/);
  });
});

describe("findings", () => {
  it("cannot claim more certainty than the linked evidence", async () => {
    const assumed = await evidence("ASSUMPTION");
    await expect(
      createFinding(op, diagnosticId, { statement: "Booking takes 7 steps", evidenceState: "VERIFIED", isMaterial: "on", clientFacing: "on", evidenceIds: [assumed.id] }),
    ).rejects.toThrow(/verified evidence/);
    const f = await createFinding(op, diagnosticId, { statement: "Booking likely loses mobile users", evidenceState: "ASSUMPTION", isMaterial: "on", clientFacing: "on", evidenceIds: [] });
    expect(f).toMatchObject({ isMaterial: true, clientFacing: true, evidenceState: "ASSUMPTION" });
  });
});

describe("revenue exposure scenarios (R5)", () => {
  it("stores the estimate with its weakest input state", async () => {
    const s = await createLeakScenario(op, diagnosticId, {
      label: "Missed after-hours calls",
      averageClientValue: "$1,200",
      averageClientValueState: "CLIENT_PROVIDED",
      missedBookingsPerWeek: "2",
      missedBookingsState: "ASSUMPTION",
      weeksPerMonth: "",
      weeksPerMonthState: "ASSUMPTION",
    });
    expect(Number(s.estimatedMonthlyExposure)).toBe(9_600);
    expect(s.resultState).toBe("ASSUMPTION");
  });

  it("stores no number when an input is not verified", async () => {
    const s = await createLeakScenario(op, diagnosticId, { label: "Unknown", averageClientValue: "900", averageClientValueState: "NOT_VERIFIED", missedBookingsPerWeek: "1", missedBookingsState: "ASSUMPTION" });
    expect(s.estimatedMonthlyExposure).toBeNull();
    expect(s.resultState).toBe("NOT_VERIFIED");
  });
});

describe("priority plan", () => {
  it("keeps a dense ranking through moves and deletes", async () => {
    const a = await createPriorityFix(op, diagnosticId, { problem: "A", fix: "a" });
    const b = await createPriorityFix(op, diagnosticId, { problem: "B", fix: "b" });
    const c = await createPriorityFix(op, diagnosticId, { problem: "C", fix: "c" });
    await movePriorityFix(op, c.id, "up");
    await deletePriorityFix(op, a.id);
    const rows = await db.priorityFix.findMany({ where: { diagnosticId }, orderBy: { rank: "asc" }, select: { problem: true, rank: true } });
    expect(rows).toEqual([
      { problem: "C", rank: 1 },
      { problem: "B", rank: 2 },
    ]);
    void b;
  });
});

describe("QA reset and finalization (L1, L3, L4)", () => {
  it("sends a QA-passed diagnostic back to NOT_READY on edit, with an audit entry", async () => {
    await db.diagnostic.update({ where: { id: diagnosticId }, data: { qaStatus: "QA_PASSED" } });
    await updateNarrative(op, diagnosticId, { executiveDiagnosis: "Edited after QA" });
    expect((await db.diagnostic.findUniqueOrThrow({ where: { id: diagnosticId } })).qaStatus).toBe("NOT_READY");
    const log = await db.auditLog.findFirstOrThrow({ where: { entityId: diagnosticId, action: "STATE_CHANGE" } });
    expect(log.after).toEqual({ qaStatus: "NOT_READY" });
  });

  it("rejects every edit to a finalized diagnostic and keeps its version ids", async () => {
    const d = await createDiagnostic(op, { clientId, title: `${tag} finalized` });
    const zone = await db.zoneScore.findFirstOrThrow({ where: { diagnosticId: d.id } });
    const pinned = await db.diagnostic.findUniqueOrThrow({ where: { id: d.id } });
    await db.diagnostic.update({ where: { id: d.id }, data: { qaStatus: "FINALIZED", finalizedAt: new Date(), finalizedById: op.id } });

    await expect(updateNarrative(op, d.id, { executiveDiagnosis: "tamper" })).rejects.toThrow(/finalized/);
    await expect(updateZoneScore(op, zone.id, { score: "2" })).rejects.toThrow(/finalized/);
    await expect(createEvidence(op, d.id, { type: "OTHER", source: "late" }, null)).rejects.toThrow(/finalized/);
    await expect(createFinding(op, d.id, { statement: "late", evidenceState: "ASSUMPTION" })).rejects.toThrow(/finalized/);

    const after = await db.diagnostic.findUniqueOrThrow({ where: { id: d.id } });
    expect([after.frameworkVersionId, after.scoringVersionId, after.reportTemplateVersionId]).toEqual([
      pinned.frameworkVersionId,
      pinned.scoringVersionId,
      pinned.reportTemplateVersionId,
    ]);
    expect(after.executiveDiagnosis).toBeNull();
  });
});
