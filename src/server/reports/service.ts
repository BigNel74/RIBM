import "server-only";
import type { Prisma } from "@prisma/client";
import { assertReportPublishable } from "@/domain/qa/qa-status";
import { buildReportSnapshot, type ReportSnapshotV1 } from "@/domain/reports/snapshot";
import { DomainRuleError } from "@/domain/shared/errors";
import { writeAudit } from "../audit/log";
import { assertClientAccess, assertPermission, canAccessClient, hasPermission, type Actor } from "../auth/permissions";
import { db } from "../db";

type Tx = Prisma.TransactionClient;

/** Maps the diagnostic to the pure snapshot input. Internal fields are selected only where needed and dropped by the projection. */
async function snapshotFor(tx: Tx, diagnosticId: string): Promise<ReportSnapshotV1> {
  const d = await tx.diagnostic.findUniqueOrThrow({
    where: { id: diagnosticId },
    include: {
      client: { select: { displayName: true } },
      frameworkVersion: { select: { code: true } },
      scoringVersion: { select: { code: true } },
      promptVersion: { select: { code: true } },
      reportTemplateVersion: { select: { code: true, sections: true } },
      evidence: { orderBy: { capturedAt: "asc" }, select: { id: true, type: true, source: true, sourceUrl: true, capturedText: true, evidenceState: true } },
      zoneScores: { include: { zoneDefinition: true, evidence: { select: { evidenceItemId: true } } } },
      findings: { orderBy: { createdAt: "asc" }, include: { sectionResult: { include: { sectionDefinition: true } }, evidence: { select: { evidenceItemId: true } } } },
      priorityFixes: { include: { evidence: { select: { evidenceItemId: true } } } },
      leakScenarios: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!d.reportTemplateVersion) throw new DomainRuleError("REPORT_TEMPLATE_MISSING", "This diagnostic has no report template version.");
  const num = (v: { toString(): string } | null) => (v === null ? null : Number(v.toString()));

  return buildReportSnapshot({
    title: d.title,
    clientName: d.client.displayName,
    versions: {
      framework: d.frameworkVersion.code,
      scoring: d.scoringVersion.code,
      reportTemplate: d.reportTemplateVersion.code,
      prompt: d.promptVersion?.code ?? null,
    },
    templateSections: d.reportTemplateVersion.sections as string[],
    narrative: {
      executiveDiagnosis: d.executiveDiagnosis,
      revenueSpineStrength: d.revenueSpineStrength,
      biggestConstraint: d.biggestConstraint,
      recommendedInterventionDirection: d.recommendedInterventionDirection,
      finalRecommendation: d.finalRecommendation,
      implementationReadiness: d.implementationReadiness,
      measurementPlan: d.measurementPlan,
      nextDecision: d.nextDecision,
    },
    zones: d.zoneScores.map((z) => ({
      name: z.zoneDefinition.name,
      position: z.zoneDefinition.position,
      score: z.score,
      diagnosis: z.diagnosis,
      primaryWeakness: z.primaryWeakness,
      confidence: z.confidence,
      evidenceIds: z.evidence.map((e) => e.evidenceItemId),
    })),
    findings: d.findings.map((f) => ({
      statement: f.statement,
      evidenceState: f.evidenceState,
      isMaterial: f.isMaterial,
      clientFacing: f.clientFacing,
      section: f.sectionResult ? f.sectionResult.sectionDefinition.name : null,
      evidenceIds: f.evidence.map((e) => e.evidenceItemId),
    })),
    fixes: d.priorityFixes.map((f) => ({
      rank: f.rank,
      problem: f.problem,
      fix: f.fix,
      interventionClass: f.interventionClass,
      effort: f.effort,
      evidenceIds: f.evidence.map((e) => e.evidenceItemId),
    })),
    scenarios: d.leakScenarios.map((s) => ({
      label: s.label,
      averageClientValue: num(s.averageClientValue),
      averageClientValueState: s.averageClientValueState,
      missedBookingsPerWeek: num(s.missedBookingsPerWeek),
      missedBookingsState: s.missedBookingsState,
      weeksPerMonth: Number(s.weeksPerMonth),
      weeksPerMonthState: s.weeksPerMonthState,
      estimatedMonthlyExposure: num(s.estimatedMonthlyExposure),
      resultState: s.resultState,
    })),
    evidence: d.evidence,
    preparedAt: new Date(),
  });
}

/**
 * Invariants L5, L6, ADR-009: publish only after QA passes; store a frozen
 * snapshot with every version id; a republish withdraws the previous report.
 */
export async function publishReport(actor: Actor, diagnosticId: string) {
  assertPermission(actor, "reports:publish");
  return db.$transaction(async (tx) => {
    const d = await tx.diagnostic.findUnique({ where: { id: diagnosticId } });
    if (!d) throw new DomainRuleError("NOT_FOUND", "Diagnostic not found.");
    assertReportPublishable(d.qaStatus);
    if (!d.reportTemplateVersionId) throw new DomainRuleError("REPORT_TEMPLATE_MISSING", "This diagnostic has no report template version.");

    const snapshot = await snapshotFor(tx, diagnosticId);
    const withdrawn = await tx.clientReport.updateMany({ where: { diagnosticId, status: "PUBLISHED" }, data: { status: "WITHDRAWN" } });
    const report = await tx.clientReport.create({
      data: {
        diagnosticId,
        clientId: d.clientId,
        status: "PUBLISHED",
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        frameworkVersionId: d.frameworkVersionId,
        scoringVersionId: d.scoringVersionId,
        promptVersionId: d.promptVersionId,
        reportTemplateVersionId: d.reportTemplateVersionId,
        publishedAt: new Date(),
        publishedById: actor.id,
      },
    });
    await writeAudit(
      {
        userId: actor.id,
        entityType: "ClientReport",
        entityId: report.id,
        action: "PUBLISH",
        after: { diagnosticId, qaStatus: d.qaStatus, versions: snapshot.versions, withdrewPrevious: withdrawn.count },
      },
      tx,
    );
    return report;
  });
}

export async function withdrawReport(actor: Actor, reportId: string, reason: string) {
  assertPermission(actor, "reports:publish");
  if (!reason.trim()) throw new DomainRuleError("REPORT_WITHDRAW_REASON", "Withdrawing a report requires a reason.");
  return db.$transaction(async (tx) => {
    const r = await tx.clientReport.findUnique({ where: { id: reportId } });
    if (!r) throw new DomainRuleError("NOT_FOUND", "Report not found.");
    if (r.status !== "PUBLISHED") throw new DomainRuleError("REPORT_NOT_PUBLISHED", "Only a published report can be withdrawn.");
    await tx.clientReport.update({ where: { id: reportId }, data: { status: "WITHDRAWN" } });
    await writeAudit({ userId: actor.id, entityType: "ClientReport", entityId: reportId, action: "STATE_CHANGE", before: { status: "PUBLISHED" }, after: { status: "WITHDRAWN" }, reason: reason.trim() }, tx);
  });
}

export async function listReports(actor: Actor, filter: { diagnosticId?: string } = {}) {
  assertPermission(actor, "diagnostics:read");
  return db.clientReport.findMany({
    where: filter.diagnosticId ? { diagnosticId: filter.diagnosticId } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      publishedAt: true,
      diagnostic: { select: { id: true, title: true } },
      client: { select: { id: true, displayName: true } },
      publishedBy: { select: { name: true } },
    },
  });
}

/**
 * The only read path for report content. CLIENT users get their own client's
 * PUBLISHED reports; anything else is indistinguishable from "not found" (A1).
 * Internal readers can view any report, including withdrawn ones.
 */
export async function getReportForViewer(actor: Actor, reportId: string) {
  const r = await db.clientReport.findUnique({
    where: { id: reportId },
    select: { id: true, clientId: true, status: true, snapshot: true, publishedAt: true },
  });
  const internal = hasPermission(actor.role, "diagnostics:read");
  const clientOk = actor.role === "CLIENT" && hasPermission(actor.role, "reports:read_own") && r?.status === "PUBLISHED" && canAccessClient(actor, r.clientId);
  if (!r || !r.snapshot || !(internal || clientOk)) throw new DomainRuleError("NOT_FOUND", "Report not found.");
  if (!internal) assertClientAccess(actor, r.clientId);
  return { id: r.id, status: r.status, publishedAt: r.publishedAt, snapshot: r.snapshot as unknown as ReportSnapshotV1 };
}
