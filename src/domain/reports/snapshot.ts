import type { EvidenceState } from "../shared/enums";
import { describeEvidenceState } from "../evidence/evidence-state";
import { EXPOSURE_LABEL } from "../leak/exposure";

/**
 * Client report snapshot (BD §14, ADR-009). A pure projection from the
 * structured diagnostic into client-safe, versioned JSON. The snapshot is
 * frozen at publish; the client view renders only from it.
 *
 * Never included: internal notes, operator notes, non-client-facing findings,
 * evidence files, prompts, user identities other than "prepared by".
 */

export const REPORT_SCHEMA_VERSION = 1 as const;

export interface ReportSourceEvidence {
  id: string;
  type: string;
  source: string;
  sourceUrl: string | null;
  capturedText: string | null;
  evidenceState: EvidenceState;
  /** Internal — must never appear in the snapshot. */
  operatorNotes?: string | null;
}

export interface ReportSource {
  title: string;
  clientName: string;
  versions: { framework: string; scoring: string; reportTemplate: string; prompt: string | null };
  templateSections: readonly string[];
  narrative: {
    executiveDiagnosis: string | null;
    revenueSpineStrength: string | null;
    biggestConstraint: string | null;
    recommendedInterventionDirection: string | null;
    finalRecommendation: string | null;
    implementationReadiness: string | null;
    measurementPlan: string | null;
    nextDecision: string | null;
  };
  zones: Array<{
    name: string;
    position: number;
    score: number | null;
    diagnosis: string | null;
    primaryWeakness: string | null;
    confidence: "LOW" | "MEDIUM" | "HIGH";
    evidenceIds: string[];
  }>;
  findings: Array<{ statement: string; evidenceState: EvidenceState; isMaterial: boolean; clientFacing: boolean; section: string | null; evidenceIds: string[] }>;
  fixes: Array<{ rank: number; problem: string; fix: string; interventionClass: string | null; effort: string | null; evidenceIds: string[] }>;
  scenarios: Array<{
    label: string;
    averageClientValue: number | null;
    averageClientValueState: EvidenceState;
    missedBookingsPerWeek: number | null;
    missedBookingsState: EvidenceState;
    weeksPerMonth: number;
    weeksPerMonthState: EvidenceState;
    estimatedMonthlyExposure: number | null;
    resultState: EvidenceState;
  }>;
  evidence: ReportSourceEvidence[];
  preparedAt: Date;
}

export interface SnapshotEvidence {
  ref: string; // "E1", "E2"… stable within the report
  type: string;
  source: string;
  sourceUrl: string | null;
  capturedText: string | null;
  state: EvidenceState;
  stateLabel: string;
}

export interface ReportSnapshotV1 {
  schemaVersion: typeof REPORT_SCHEMA_VERSION;
  title: string;
  clientName: string;
  preparedBy: "RUN It BAC Media";
  preparedAt: string;
  versions: ReportSource["versions"];
  sections: string[];
  narrative: ReportSource["narrative"];
  zones: Array<Omit<ReportSource["zones"][number], "evidenceIds"> & { evidenceRefs: string[] }>;
  findings: Array<{ statement: string; state: EvidenceState; stateLabel: string; material: boolean; section: string | null; evidenceRefs: string[] }>;
  fixes: Array<Omit<ReportSource["fixes"][number], "evidenceIds"> & { evidenceRefs: string[] }>;
  scenarios: Array<ReportSource["scenarios"][number] & { label: string; resultLabel: string; isScenario: boolean }>;
  exposureLabel: typeof EXPOSURE_LABEL;
  evidence: SnapshotEvidence[];
}

export function buildReportSnapshot(src: ReportSource): ReportSnapshotV1 {
  const clientFindings = src.findings.filter((f) => f.clientFacing);

  // Only evidence that supports something the client will read.
  const usedIds = new Set<string>([
    ...src.zones.flatMap((z) => z.evidenceIds),
    ...clientFindings.flatMap((f) => f.evidenceIds),
    ...src.fixes.flatMap((f) => f.evidenceIds),
  ]);
  const evidence = src.evidence.filter((e) => usedIds.has(e.id));
  const refOf = new Map(evidence.map((e, i) => [e.id, `E${i + 1}`]));
  const refs = (ids: string[]) => ids.map((id) => refOf.get(id)).filter((r): r is string => Boolean(r));

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    title: src.title,
    clientName: src.clientName,
    preparedBy: "RUN It BAC Media",
    preparedAt: src.preparedAt.toISOString(),
    versions: { ...src.versions },
    sections: [...src.templateSections],
    narrative: { ...src.narrative },
    zones: [...src.zones]
      .sort((a, b) => a.position - b.position)
      .map(({ evidenceIds, ...z }) => ({ ...z, evidenceRefs: refs(evidenceIds) })),
    findings: clientFindings.map((f) => ({
      statement: f.statement,
      state: f.evidenceState,
      stateLabel: describeEvidenceState(f.evidenceState),
      material: f.isMaterial,
      section: f.section,
      evidenceRefs: refs(f.evidenceIds),
    })),
    fixes: [...src.fixes].sort((a, b) => a.rank - b.rank).map(({ evidenceIds, ...f }) => ({ ...f, evidenceRefs: refs(evidenceIds) })),
    scenarios: src.scenarios.map((s) => ({
      ...s,
      resultLabel: s.estimatedMonthlyExposure === null ? describeEvidenceState("NOT_VERIFIED") : describeEvidenceState(s.resultState),
      isScenario: s.resultState === "ASSUMPTION",
    })),
    exposureLabel: EXPOSURE_LABEL,
    evidence: evidence.map((e) => ({
      ref: refOf.get(e.id)!,
      type: e.type,
      source: e.source,
      sourceUrl: e.sourceUrl,
      capturedText: e.capturedText,
      state: e.evidenceState,
      stateLabel: describeEvidenceState(e.evidenceState, e.evidenceState === "CLIENT_PROVIDED" ? e.source : null),
    })),
  };
}
