import "server-only";
import type { Prisma } from "@prisma/client";
import { assertFindingState } from "@/domain/evidence/finding-state";
import { moveRank, normalizeRanks } from "@/domain/diagnostics/priority";
import { computeLeakExposure, DEFAULT_WEEKS_PER_MONTH } from "@/domain/leak/exposure";
import { scoringRulesSchema } from "@/domain/scoring/rules";
import { assertValidScore } from "@/domain/scoring/score";
import { DomainRuleError } from "@/domain/shared/errors";
import { writeAudit } from "../audit/log";
import { assertPermission, type Actor } from "../auth/permissions";
import { db } from "../db";
import { beginDiagnosticEdit, linkableEvidence } from "./editable";
import {
  diagnosticCreateSchema,
  findingSchema,
  intakeSchema,
  leakScenarioSchema,
  narrativeSchema,
  priorityFixSchema,
  sectionSchema,
  zoneScoreSchema,
} from "./schemas";

type Tx = Prisma.TransactionClient;

const subset = (row: object, shape: object) =>
  Object.fromEntries(Object.keys(shape).map((k) => [k, (row as Record<string, unknown>)[k]]));

// ───────────────────────────── Read ─────────────────────────────

export async function listDiagnostics(actor: Actor) {
  assertPermission(actor, "diagnostics:read");
  return db.diagnostic.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      qaStatus: true,
      updatedAt: true,
      client: { select: { id: true, displayName: true } },
      frameworkVersion: { select: { code: true } },
      _count: { select: { evidence: true, findings: true } },
      sectionResults: { select: { status: true } },
      zoneScores: { select: { score: true } },
    },
  });
}

export async function getDiagnostic(actor: Actor, id: string) {
  assertPermission(actor, "diagnostics:read");
  const d = await db.diagnostic.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, displayName: true } },
      opportunity: { select: { id: true, businessObjective: true } },
      frameworkVersion: { select: { code: true, label: true } },
      scoringVersion: { select: { code: true, rules: true } },
      reportTemplateVersion: { select: { code: true } },
      promptVersion: { select: { code: true } },
      createdBy: { select: { name: true } },
      evidence: { orderBy: { capturedAt: "asc" }, include: { capturedBy: { select: { name: true } } } },
      zoneScores: {
        orderBy: { zoneDefinition: { position: "asc" } },
        include: { zoneDefinition: true, evidence: { select: { evidenceItemId: true } } },
      },
      sectionResults: {
        orderBy: { sectionDefinition: { number: "asc" } },
        include: { sectionDefinition: true, evidence: { select: { evidenceItemId: true } } },
      },
      findings: { orderBy: { createdAt: "asc" }, include: { evidence: { select: { evidenceItemId: true } } } },
      leakScenarios: { orderBy: { createdAt: "asc" } },
      priorityFixes: { orderBy: { rank: "asc" }, include: { evidence: { select: { evidenceItemId: true } } } },
    },
  });
  if (!d) throw new DomainRuleError("NOT_FOUND", "Diagnostic not found.");
  return { ...d, scoringRules: scoringRulesSchema.parse(d.scoringVersion.rules) };
}

// ──────────────────────────── Create ────────────────────────────

/** Pins the active framework, scoring, and report-template versions (invariant L4 groundwork). */
export async function createDiagnostic(actor: Actor, raw: unknown) {
  assertPermission(actor, "diagnostics:write");
  const input = diagnosticCreateSchema.parse(raw);
  return db.$transaction(async (tx) => {
    const client = await tx.client.count({ where: { id: input.clientId } });
    if (!client) throw new DomainRuleError("NOT_FOUND", "Client not found.");
    if (input.opportunityId) {
      const ok = await tx.opportunity.count({ where: { id: input.opportunityId, clientId: input.clientId } });
      if (!ok) throw new DomainRuleError("OPPORTUNITY_CLIENT_MISMATCH", "The opportunity must belong to this client.");
    }
    // Exactly one ACTIVE version of each kind; ambiguity is an error, never a guess.
    const [frameworks, scorings, templates] = await Promise.all([
      tx.frameworkVersion.findMany({ where: { status: "ACTIVE" }, include: { zones: true, sections: true } }),
      tx.scoringVersion.findMany({ where: { status: "ACTIVE" } }),
      tx.reportTemplateVersion.findMany({ where: { status: "ACTIVE" } }),
    ]);
    for (const [kind, rows] of [["framework", frameworks], ["scoring", scorings], ["report-template", templates]] as const) {
      if (rows.length === 0) throw new DomainRuleError("NO_ACTIVE_VERSION", `No active ${kind} version. Run the seed.`);
      if (rows.length > 1) throw new DomainRuleError("MULTIPLE_ACTIVE_VERSIONS", `More than one active ${kind} version. An Admin must retire all but one.`);
    }
    const [framework, scoring, template] = [frameworks[0], scorings[0], templates[0]];
    if (framework.zones.length !== 5 || framework.sections.length !== 15) {
      throw new DomainRuleError("FRAMEWORK_SHAPE", "The active framework must define 5 zones and 15 sections.");
    }

    const d = await tx.diagnostic.create({
      data: {
        clientId: input.clientId,
        opportunityId: input.opportunityId,
        title: input.title,
        frameworkVersionId: framework.id,
        scoringVersionId: scoring.id,
        reportTemplateVersionId: template.id,
        createdById: actor.id,
        zoneScores: { create: framework.zones.map((z) => ({ zoneDefinitionId: z.id, scoringVersionId: scoring.id })) },
        sectionResults: { create: framework.sections.map((s) => ({ sectionDefinitionId: s.id })) },
      },
    });
    await writeAudit(
      {
        userId: actor.id,
        entityType: "Diagnostic",
        entityId: d.id,
        action: "CREATE",
        after: { ...input, framework: framework.code, scoring: scoring.code, reportTemplate: template.code },
      },
      tx,
    );
    return d;
  });
}

// ───────────────────────── Intake / narrative ─────────────────────────

export async function updateIntake(actor: Actor, id: string, raw: unknown) {
  assertPermission(actor, "diagnostics:write");
  const data = intakeSchema.parse(raw);
  return db.$transaction(async (tx) => {
    await beginDiagnosticEdit(tx, actor, id);
    const before = await tx.diagnostic.findUniqueOrThrow({ where: { id } });
    // Intake is complete when every intake question has an answer.
    const complete = Object.values(data).every((v) => v !== null);
    await tx.diagnostic.update({ where: { id }, data: { ...data, intakeCompletedAt: complete ? (before.intakeCompletedAt ?? new Date()) : null } });
    await writeAudit({ userId: actor.id, entityType: "Diagnostic", entityId: id, action: "UPDATE", before: subset(before, data), after: data }, tx);
  });
}

export async function updateNarrative(actor: Actor, id: string, raw: unknown) {
  assertPermission(actor, "diagnostics:write");
  const data = narrativeSchema.parse(raw);
  return db.$transaction(async (tx) => {
    await beginDiagnosticEdit(tx, actor, id);
    const before = await tx.diagnostic.findUniqueOrThrow({ where: { id } });
    await tx.diagnostic.update({ where: { id }, data });
    await writeAudit({ userId: actor.id, entityType: "Diagnostic", entityId: id, action: "UPDATE", before: subset(before, data), after: data }, tx);
  });
}

// ──────────────────────────── Zone scores ────────────────────────────

/**
 * Invariants S1–S4: range and evidence thresholds from the PINNED scoring
 * version; score changes need a reason and are audited as SCORE_CHANGE.
 */
export async function updateZoneScore(actor: Actor, zoneScoreId: string, raw: unknown) {
  assertPermission(actor, "diagnostics:write");
  const input = zoneScoreSchema.parse(raw);
  return db.$transaction(async (tx) => {
    const before = await tx.zoneScore.findUnique({
      where: { id: zoneScoreId },
      include: { scoringVersion: true, evidence: { select: { evidenceItemId: true } }, zoneDefinition: { select: { name: true } } },
    });
    if (!before) throw new DomainRuleError("NOT_FOUND", "Zone score not found.");
    await beginDiagnosticEdit(tx, actor, before.diagnosticId);

    const linked = await linkableEvidence(tx, before.diagnosticId, input.evidenceIds);
    const rules = scoringRulesSchema.parse(before.scoringVersion.rules);
    assertValidScore({ score: input.score, linkedEvidenceStates: linked.map((e) => e.evidenceState), justification: input.justification }, rules);

    const scoreChanged = before.score !== input.score;
    if (scoreChanged && before.score !== null && !input.changeReason) {
      throw new DomainRuleError("SCORE_CHANGE_REASON", "Changing an existing score requires a reason. It is kept in the audit log.");
    }

    const { evidenceIds, changeReason, ...fields } = input;
    await tx.zoneScore.update({ where: { id: zoneScoreId }, data: fields });
    await tx.zoneScoreEvidence.deleteMany({ where: { zoneScoreId } });
    if (linked.length) await tx.zoneScoreEvidence.createMany({ data: linked.map((e) => ({ zoneScoreId, evidenceItemId: e.id })) });

    const beforeState = { ...subset(before, fields), evidenceIds: before.evidence.map((e) => e.evidenceItemId).sort() };
    const afterState = { ...fields, evidenceIds: [...new Set(evidenceIds)].sort() };
    await writeAudit(
      {
        userId: actor.id,
        entityType: "ZoneScore",
        entityId: zoneScoreId,
        action: scoreChanged ? "SCORE_CHANGE" : "UPDATE",
        before: beforeState,
        after: afterState,
        reason: scoreChanged ? (changeReason ?? `Initial score for ${before.zoneDefinition.name}`) : changeReason,
      },
      tx,
    );
  });
}

// ───────────────────────────── Sections ─────────────────────────────

export async function updateSection(actor: Actor, sectionResultId: string, raw: unknown) {
  assertPermission(actor, "diagnostics:write");
  const input = sectionSchema.parse(raw);
  return db.$transaction(async (tx) => {
    const before = await tx.sectionResult.findUnique({ where: { id: sectionResultId }, include: { evidence: { select: { evidenceItemId: true } } } });
    if (!before) throw new DomainRuleError("NOT_FOUND", "Section not found.");
    await beginDiagnosticEdit(tx, actor, before.diagnosticId);
    if (input.status === "COMPLETE" && !input.findingsSummary) {
      throw new DomainRuleError("SECTION_SUMMARY_REQUIRED", "A section can only be marked complete with a written summary.");
    }
    const linked = await linkableEvidence(tx, before.diagnosticId, input.evidenceIds);
    const { evidenceIds, ...fields } = input;
    await tx.sectionResult.update({ where: { id: sectionResultId }, data: fields });
    await tx.sectionResultEvidence.deleteMany({ where: { sectionResultId } });
    if (linked.length) await tx.sectionResultEvidence.createMany({ data: linked.map((e) => ({ sectionResultId, evidenceItemId: e.id })) });
    await writeAudit(
      {
        userId: actor.id,
        entityType: "SectionResult",
        entityId: sectionResultId,
        action: "UPDATE",
        before: { ...subset(before, fields), evidenceIds: before.evidence.map((e) => e.evidenceItemId).sort() },
        after: { ...fields, evidenceIds: [...new Set(evidenceIds)].sort() },
      },
      tx,
    );
  });
}

// ───────────────────────────── Findings ─────────────────────────────

async function assertSectionInDiagnostic(tx: Tx, diagnosticId: string, sectionResultId: string | null) {
  if (!sectionResultId) return;
  const ok = await tx.sectionResult.count({ where: { id: sectionResultId, diagnosticId } });
  if (!ok) throw new DomainRuleError("SECTION_NOT_IN_DIAGNOSTIC", "That section belongs to another diagnostic.");
}

export async function createFinding(actor: Actor, diagnosticId: string, raw: unknown) {
  assertPermission(actor, "diagnostics:write");
  const input = findingSchema.parse(raw);
  return db.$transaction(async (tx) => {
    await beginDiagnosticEdit(tx, actor, diagnosticId);
    await assertSectionInDiagnostic(tx, diagnosticId, input.sectionResultId);
    const linked = await linkableEvidence(tx, diagnosticId, input.evidenceIds);
    assertFindingState(input.evidenceState, linked.map((e) => e.evidenceState));
    const { evidenceIds, ...fields } = input;
    const f = await tx.finding.create({ data: { ...fields, diagnosticId } });
    if (linked.length) await tx.findingEvidence.createMany({ data: linked.map((e) => ({ findingId: f.id, evidenceItemId: e.id })) });
    await writeAudit({ userId: actor.id, entityType: "Finding", entityId: f.id, action: "CREATE", after: { ...fields, evidenceIds } }, tx);
    return f;
  });
}

export async function updateFinding(actor: Actor, findingId: string, raw: unknown) {
  assertPermission(actor, "diagnostics:write");
  const input = findingSchema.parse(raw);
  return db.$transaction(async (tx) => {
    const before = await tx.finding.findUnique({ where: { id: findingId }, include: { evidence: { select: { evidenceItemId: true } } } });
    if (!before) throw new DomainRuleError("NOT_FOUND", "Finding not found.");
    await beginDiagnosticEdit(tx, actor, before.diagnosticId);
    await assertSectionInDiagnostic(tx, before.diagnosticId, input.sectionResultId);
    const linked = await linkableEvidence(tx, before.diagnosticId, input.evidenceIds);
    assertFindingState(input.evidenceState, linked.map((e) => e.evidenceState));
    const { evidenceIds, ...fields } = input;
    await tx.finding.update({ where: { id: findingId }, data: fields });
    await tx.findingEvidence.deleteMany({ where: { findingId } });
    if (linked.length) await tx.findingEvidence.createMany({ data: linked.map((e) => ({ findingId, evidenceItemId: e.id })) });
    await writeAudit(
      {
        userId: actor.id,
        entityType: "Finding",
        entityId: findingId,
        action: "UPDATE",
        before: { ...subset(before, fields), evidenceIds: before.evidence.map((e) => e.evidenceItemId).sort() },
        after: { ...fields, evidenceIds: [...new Set(evidenceIds)].sort() },
      },
      tx,
    );
  });
}

export async function deleteFinding(actor: Actor, findingId: string) {
  assertPermission(actor, "diagnostics:write");
  return db.$transaction(async (tx) => {
    const before = await tx.finding.findUnique({ where: { id: findingId } });
    if (!before) throw new DomainRuleError("NOT_FOUND", "Finding not found.");
    await beginDiagnosticEdit(tx, actor, before.diagnosticId);
    await tx.finding.delete({ where: { id: findingId } });
    await writeAudit({ userId: actor.id, entityType: "Finding", entityId: findingId, action: "DELETE", before: { statement: before.statement, evidenceState: before.evidenceState } }, tx);
  });
}

// ─────────────────────── Revenue exposure scenarios ───────────────────────

function leakData(input: ReturnType<typeof leakScenarioSchema.parse>) {
  const weeks = input.weeksPerMonth ?? DEFAULT_WEEKS_PER_MONTH.value!;
  const exposure = computeLeakExposure({
    averageClientValue: { value: input.averageClientValue, state: input.averageClientValueState },
    missedBookingsPerWeek: { value: input.missedBookingsPerWeek, state: input.missedBookingsState },
    weeksPerMonth: { value: weeks, state: input.weeksPerMonthState },
  });
  return {
    label: input.label,
    averageClientValue: input.averageClientValue,
    averageClientValueState: input.averageClientValueState,
    missedBookingsPerWeek: input.missedBookingsPerWeek,
    missedBookingsState: input.missedBookingsState,
    weeksPerMonth: weeks,
    weeksPerMonthState: input.weeksPerMonthState,
    notes: input.notes,
    estimatedMonthlyExposure: exposure.computed ? exposure.estimatedMonthlyExposure : null,
    resultState: exposure.resultState,
  };
}

export async function createLeakScenario(actor: Actor, diagnosticId: string, raw: unknown) {
  assertPermission(actor, "diagnostics:write");
  const data = leakData(leakScenarioSchema.parse(raw));
  return db.$transaction(async (tx) => {
    await beginDiagnosticEdit(tx, actor, diagnosticId);
    const s = await tx.revenueLeakScenario.create({ data: { ...data, diagnosticId } });
    await writeAudit({ userId: actor.id, entityType: "RevenueLeakScenario", entityId: s.id, action: "CREATE", after: data }, tx);
    return s;
  });
}

export async function updateLeakScenario(actor: Actor, scenarioId: string, raw: unknown) {
  assertPermission(actor, "diagnostics:write");
  const data = leakData(leakScenarioSchema.parse(raw));
  return db.$transaction(async (tx) => {
    const before = await tx.revenueLeakScenario.findUnique({ where: { id: scenarioId } });
    if (!before) throw new DomainRuleError("NOT_FOUND", "Scenario not found.");
    await beginDiagnosticEdit(tx, actor, before.diagnosticId);
    await tx.revenueLeakScenario.update({ where: { id: scenarioId }, data });
    await writeAudit({ userId: actor.id, entityType: "RevenueLeakScenario", entityId: scenarioId, action: "UPDATE", before: subset(before, data), after: data }, tx);
  });
}

export async function deleteLeakScenario(actor: Actor, scenarioId: string) {
  assertPermission(actor, "diagnostics:write");
  return db.$transaction(async (tx) => {
    const before = await tx.revenueLeakScenario.findUnique({ where: { id: scenarioId } });
    if (!before) throw new DomainRuleError("NOT_FOUND", "Scenario not found.");
    await beginDiagnosticEdit(tx, actor, before.diagnosticId);
    await tx.revenueLeakScenario.delete({ where: { id: scenarioId } });
    await writeAudit({ userId: actor.id, entityType: "RevenueLeakScenario", entityId: scenarioId, action: "DELETE", before: { label: before.label } }, tx);
  });
}

// ───────────────────────────── Priority plan ─────────────────────────────

/** Apply new ranks without tripping the (diagnosticId, rank) unique index. */
async function applyRanks(tx: Tx, diagnosticId: string, ranks: Array<{ id: string; rank: number }>) {
  const offset = 10_000;
  for (const r of ranks) await tx.priorityFix.update({ where: { id: r.id }, data: { rank: r.rank + offset } });
  for (const r of ranks) await tx.priorityFix.update({ where: { id: r.id }, data: { rank: r.rank } });
}

export async function createPriorityFix(actor: Actor, diagnosticId: string, raw: unknown) {
  assertPermission(actor, "diagnostics:write");
  const input = priorityFixSchema.parse(raw);
  return db.$transaction(async (tx) => {
    await beginDiagnosticEdit(tx, actor, diagnosticId);
    const linked = await linkableEvidence(tx, diagnosticId, input.evidenceIds);
    const { evidenceIds, ...fields } = input;
    const max = await tx.priorityFix.aggregate({ where: { diagnosticId }, _max: { rank: true } });
    const fix = await tx.priorityFix.create({ data: { ...fields, diagnosticId, rank: (max._max.rank ?? 0) + 1 } });
    if (linked.length) await tx.priorityFixEvidence.createMany({ data: linked.map((e) => ({ priorityFixId: fix.id, evidenceItemId: e.id })) });
    await writeAudit({ userId: actor.id, entityType: "PriorityFix", entityId: fix.id, action: "CREATE", after: { ...fields, rank: fix.rank, evidenceIds } }, tx);
    return fix;
  });
}

export async function updatePriorityFix(actor: Actor, fixId: string, raw: unknown) {
  assertPermission(actor, "diagnostics:write");
  const input = priorityFixSchema.parse(raw);
  return db.$transaction(async (tx) => {
    const before = await tx.priorityFix.findUnique({ where: { id: fixId }, include: { evidence: { select: { evidenceItemId: true } } } });
    if (!before) throw new DomainRuleError("NOT_FOUND", "Priority fix not found.");
    await beginDiagnosticEdit(tx, actor, before.diagnosticId);
    const linked = await linkableEvidence(tx, before.diagnosticId, input.evidenceIds);
    const { evidenceIds, ...fields } = input;
    await tx.priorityFix.update({ where: { id: fixId }, data: fields });
    await tx.priorityFixEvidence.deleteMany({ where: { priorityFixId: fixId } });
    if (linked.length) await tx.priorityFixEvidence.createMany({ data: linked.map((e) => ({ priorityFixId: fixId, evidenceItemId: e.id })) });
    await writeAudit(
      {
        userId: actor.id,
        entityType: "PriorityFix",
        entityId: fixId,
        action: "UPDATE",
        before: { ...subset(before, fields), evidenceIds: before.evidence.map((e) => e.evidenceItemId).sort() },
        after: { ...fields, evidenceIds: [...new Set(evidenceIds)].sort() },
      },
      tx,
    );
  });
}

export async function movePriorityFix(actor: Actor, fixId: string, direction: "up" | "down") {
  assertPermission(actor, "diagnostics:write");
  return db.$transaction(async (tx) => {
    const fix = await tx.priorityFix.findUnique({ where: { id: fixId } });
    if (!fix) throw new DomainRuleError("NOT_FOUND", "Priority fix not found.");
    await beginDiagnosticEdit(tx, actor, fix.diagnosticId);
    const all = await tx.priorityFix.findMany({ where: { diagnosticId: fix.diagnosticId }, select: { id: true, rank: true } });
    const next = moveRank(all, fixId, direction);
    await applyRanks(tx, fix.diagnosticId, next);
    await writeAudit(
      {
        userId: actor.id,
        entityType: "PriorityFix",
        entityId: fixId,
        action: "UPDATE",
        before: { rank: fix.rank },
        after: { rank: next.find((r) => r.id === fixId)!.rank },
      },
      tx,
    );
  });
}

export async function deletePriorityFix(actor: Actor, fixId: string) {
  assertPermission(actor, "diagnostics:write");
  return db.$transaction(async (tx) => {
    const fix = await tx.priorityFix.findUnique({ where: { id: fixId } });
    if (!fix) throw new DomainRuleError("NOT_FOUND", "Priority fix not found.");
    await beginDiagnosticEdit(tx, actor, fix.diagnosticId);
    await tx.priorityFix.delete({ where: { id: fixId } });
    const rest = await tx.priorityFix.findMany({ where: { diagnosticId: fix.diagnosticId }, select: { id: true, rank: true } });
    await applyRanks(tx, fix.diagnosticId, normalizeRanks(rest));
    await writeAudit({ userId: actor.id, entityType: "PriorityFix", entityId: fixId, action: "DELETE", before: { rank: fix.rank, problem: fix.problem } }, tx);
  });
}
