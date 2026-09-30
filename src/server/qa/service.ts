import "server-only";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { assertFinalizable } from "@/domain/diagnostics/lifecycle";
import { computeLeakExposure } from "@/domain/leak/exposure";
import { evaluateDiagnosticQa, type DiagnosticQaSnapshot, type QaResult } from "@/domain/qa/diagnostic-qa";
import { assertQaTransition } from "@/domain/qa/qa-status";
import { scoringRulesSchema } from "@/domain/scoring/rules";
import { scoreViolations } from "@/domain/scoring/score";
import { DomainRuleError } from "@/domain/shared/errors";
import { writeAudit } from "../audit/log";
import { assertPermission, type Actor } from "../auth/permissions";
import { db } from "../db";
import { checkbox, optionalText } from "../forms/fields";

type Tx = Prisma.TransactionClient;

/** Builds the pure QA input from the database (the rules live in domain/qa). */
export async function loadQaSnapshot(tx: Tx, diagnosticId: string, attestations: DiagnosticQaSnapshot["attestations"]): Promise<DiagnosticQaSnapshot> {
  const d = await tx.diagnostic.findUnique({
    where: { id: diagnosticId },
    include: {
      scoringVersion: true,
      frameworkVersion: { include: { _count: { select: { zones: true, sections: true } } } },
      evidence: { select: { id: true, evidenceState: true } },
      zoneScores: { include: { zoneDefinition: true, evidence: { select: { evidenceItemId: true } } } },
      sectionResults: { include: { sectionDefinition: true } },
      findings: { include: { _count: { select: { evidence: true } } } },
      leakScenarios: true,
      _count: { select: { priorityFixes: true } },
    },
  });
  if (!d) throw new DomainRuleError("NOT_FOUND", "Diagnostic not found.");
  const rules = scoringRulesSchema.parse(d.scoringVersion.rules);
  const stateOf = new Map(d.evidence.map((e) => [e.id, e.evidenceState]));

  return {
    intakeComplete: d.intakeCompletedAt !== null,
    expectedZoneCount: d.frameworkVersion._count.zones,
    zones: d.zoneScores.map((z) => ({
      key: z.zoneDefinition.key,
      score: z.score,
      diagnosis: z.diagnosis,
      primaryWeakness: z.primaryWeakness,
      scoreValid:
        scoreViolations(
          { score: z.score, linkedEvidenceStates: z.evidence.map((e) => stateOf.get(e.evidenceItemId)!).filter(Boolean), justification: z.justification },
          rules,
        ).length === 0,
    })),
    expectedSectionCount: d.frameworkVersion._count.sections,
    sections: d.sectionResults.map((s) => ({ number: s.sectionDefinition.number, status: s.status })),
    findings: d.findings.map((f) => ({
      id: f.id,
      isMaterial: f.isMaterial,
      clientFacing: f.clientFacing,
      evidenceState: f.evidenceState,
      evidenceCount: f._count.evidence,
    })),
    leakScenarios: d.leakScenarios.map((s) => {
      // Recompute rather than trust the stored number: labels must match the inputs today.
      const r = computeLeakExposure({
        averageClientValue: { value: s.averageClientValue === null ? null : Number(s.averageClientValue), state: s.averageClientValueState },
        missedBookingsPerWeek: { value: s.missedBookingsPerWeek === null ? null : Number(s.missedBookingsPerWeek), state: s.missedBookingsState },
        weeksPerMonth: { value: Number(s.weeksPerMonth), state: s.weeksPerMonthState },
      });
      const storedMatches = r.computed
        ? s.estimatedMonthlyExposure !== null && Number(s.estimatedMonthlyExposure) === r.estimatedMonthlyExposure && s.resultState === r.resultState
        : s.estimatedMonthlyExposure === null;
      return { id: s.id, computed: r.computed, resultState: r.resultState, inputsLabeled: storedMatches };
    }),
    priorityFixCount: d._count.priorityFixes,
    narrative: {
      executiveDiagnosis: d.executiveDiagnosis,
      biggestConstraint: d.biggestConstraint,
      finalRecommendation: d.finalRecommendation,
      implementationReadiness: d.implementationReadiness,
      measurementPlan: d.measurementPlan,
      nextDecision: d.nextDecision,
    },
    attestations,
  };
}

export const runQaSchema = z.object({
  noFabricatedMetrics: checkbox,
  aestheticsNotOverRewarded: checkbox,
  notes: optionalText(3_000),
});

/**
 * Human QA (BD §13, 04 §21). Moves NOT_READY/QA_FAILED → READY_FOR_QA → QA_PASSED or QA_FAILED,
 * records the full checklist as a QaRun, and audits the result. Never a manual override (L2).
 */
export async function runQa(actor: Actor, diagnosticId: string, raw: unknown): Promise<QaResult> {
  assertPermission(actor, "qa:run");
  const input = runQaSchema.parse(raw);
  return db.$transaction(async (tx) => {
    const d = await tx.diagnostic.findUnique({ where: { id: diagnosticId }, select: { qaStatus: true } });
    if (!d) throw new DomainRuleError("NOT_FOUND", "Diagnostic not found.");
    if (d.qaStatus === "QA_PASSED") throw new DomainRuleError("QA_ALREADY_PASSED", "QA has already passed. Any content edit reopens QA.");
    if (d.qaStatus !== "READY_FOR_QA") assertQaTransition(d.qaStatus, "READY_FOR_QA");

    const attestations = { noFabricatedMetrics: input.noFabricatedMetrics, aestheticsNotOverRewarded: input.aestheticsNotOverRewarded };
    const result = evaluateDiagnosticQa(await loadQaSnapshot(tx, diagnosticId, attestations));
    assertQaTransition("READY_FOR_QA", result.resultStatus);

    await tx.diagnostic.update({ where: { id: diagnosticId }, data: { qaStatus: result.resultStatus } });
    await tx.qaRun.create({
      data: {
        diagnosticId,
        runById: actor.id,
        resultStatus: result.resultStatus,
        checks: result.checks as unknown as Prisma.InputJsonValue,
        attestations,
        notes: input.notes,
      },
    });
    await writeAudit(
      {
        userId: actor.id,
        entityType: "Diagnostic",
        entityId: diagnosticId,
        action: "STATE_CHANGE",
        before: { qaStatus: d.qaStatus },
        after: { qaStatus: result.resultStatus, failedChecks: result.checks.filter((c) => !c.passed).map((c) => c.key) },
        reason: "QA run",
      },
      tx,
    );
    return result;
  });
}

/** Invariant L4: freeze a QA-passed diagnostic with every version pinned. */
export async function finalizeDiagnostic(actor: Actor, diagnosticId: string) {
  assertPermission(actor, "diagnostics:finalize");
  return db.$transaction(async (tx) => {
    const d = await tx.diagnostic.findUnique({ where: { id: diagnosticId } });
    if (!d) throw new DomainRuleError("NOT_FOUND", "Diagnostic not found.");
    const pins = assertFinalizable(
      d.qaStatus,
      {
        frameworkVersionId: d.frameworkVersionId,
        scoringVersionId: d.scoringVersionId,
        promptVersionId: d.promptVersionId,
        reportTemplateVersionId: d.reportTemplateVersionId,
      },
      { generationUsed: d.promptVersionId !== null },
    );
    await tx.diagnostic.update({ where: { id: diagnosticId }, data: { qaStatus: "FINALIZED", finalizedAt: new Date(), finalizedById: actor.id } });
    await writeAudit(
      { userId: actor.id, entityType: "Diagnostic", entityId: diagnosticId, action: "FINALIZE", before: { qaStatus: d.qaStatus }, after: { qaStatus: "FINALIZED", ...pins } },
      tx,
    );
  });
}

export async function listQaRuns(actor: Actor, diagnosticId: string) {
  assertPermission(actor, "diagnostics:read");
  return db.qaRun.findMany({
    where: { diagnosticId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, resultStatus: true, checks: true, attestations: true, notes: true, createdAt: true, runBy: { select: { name: true } } },
  });
}
