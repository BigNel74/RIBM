import type { EvidenceState } from "../shared/enums";

/**
 * Diagnostic QA gate (BD §13, 04 §21 minus prescription checks — DECISIONS C-08).
 * Pure function over a snapshot of the diagnostic; the server builds the snapshot.
 */

export interface QaFindingSnapshot {
  id: string;
  isMaterial: boolean;
  clientFacing: boolean;
  evidenceState: EvidenceState;
  evidenceCount: number;
}

export interface QaLeakSnapshot {
  id: string;
  computed: boolean;
  resultState: EvidenceState;
  /** All three inputs carry an explicit evidence state (always true when stored via domain/leak). */
  inputsLabeled: boolean;
}

export interface DiagnosticQaSnapshot {
  intakeComplete: boolean;
  expectedZoneCount: number;
  zones: Array<{ key: string; score: number | null; diagnosis: string | null; primaryWeakness: string | null; scoreValid: boolean }>;
  expectedSectionCount: number;
  sections: Array<{ number: number; status: "NOT_STARTED" | "DRAFT" | "COMPLETE" }>;
  findings: QaFindingSnapshot[];
  leakScenarios: QaLeakSnapshot[];
  priorityFixCount: number;
  narrative: {
    executiveDiagnosis: string | null;
    biggestConstraint: string | null;
    finalRecommendation: string | null;
    implementationReadiness: string | null;
    measurementPlan: string | null;
    nextDecision: string | null;
  };
  attestations: {
    /** Operator confirms no metric in the diagnostic was invented. */
    noFabricatedMetrics: boolean;
    /** Operator confirms scores do not reward aesthetics over conversion infrastructure (DECISIONS C-14). */
    aestheticsNotOverRewarded: boolean;
  };
}

export type QaCheckKey =
  | "INTAKE_COMPLETE"
  | "FIVE_ZONES_COMPLETE"
  | "FIFTEEN_SECTIONS_COMPLETE"
  | "SCORECARD_COMPLETE"
  | "MATERIAL_CLAIMS_MAPPED"
  | "NO_FABRICATED_METRICS"
  | "ASSUMPTIONS_LABELED"
  | "REVENUE_SCENARIOS_LABELED"
  | "PRIORITY_PLAN_COMPLETE"
  | "FINAL_RECOMMENDATION_PRESENT"
  | "REPORT_COMPLETE"
  | "AESTHETICS_NOT_OVER_REWARDED";

export interface QaCheck {
  key: QaCheckKey;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface QaResult {
  passed: boolean;
  resultStatus: "QA_PASSED" | "QA_FAILED";
  checks: QaCheck[];
}

const filled = (s: string | null | undefined) => Boolean(s && s.trim());

export function evaluateDiagnosticQa(d: DiagnosticQaSnapshot): QaResult {
  const checks: QaCheck[] = [];
  const add = (key: QaCheckKey, label: string, passed: boolean, detail?: string) =>
    checks.push({ key, label, passed, ...(passed || !detail ? {} : { detail }) });

  add("INTAKE_COMPLETE", "Intake complete", d.intakeComplete, "Complete the intake before QA.");

  const zonesWritten = d.zones.filter((z) => filled(z.diagnosis) && filled(z.primaryWeakness));
  add(
    "FIVE_ZONES_COMPLETE",
    "Five zones complete",
    d.zones.length === d.expectedZoneCount && zonesWritten.length === d.expectedZoneCount,
    `${zonesWritten.length} of ${d.expectedZoneCount} zones have a diagnosis and primary weakness.`,
  );

  const sectionsDone = d.sections.filter((s) => s.status === "COMPLETE");
  add(
    "FIFTEEN_SECTIONS_COMPLETE",
    "15 sections complete",
    d.sections.length === d.expectedSectionCount && sectionsDone.length === d.expectedSectionCount,
    `${sectionsDone.length} of ${d.expectedSectionCount} sections complete.`,
  );

  const scored = d.zones.filter((z) => z.score !== null && z.scoreValid);
  add(
    "SCORECARD_COMPLETE",
    "Scorecard complete",
    d.zones.length === d.expectedZoneCount && scored.length === d.expectedZoneCount,
    `${scored.length} of ${d.expectedZoneCount} zones have a valid, evidence-supported score.`,
  );

  // A material client-facing claim must either link evidence or be visibly labeled ASSUMPTION.
  const unmapped = d.findings.filter(
    (f) => f.isMaterial && f.clientFacing && f.evidenceCount === 0 && f.evidenceState !== "ASSUMPTION",
  );
  add(
    "MATERIAL_CLAIMS_MAPPED",
    "Material claims mapped to evidence",
    unmapped.length === 0,
    `${unmapped.length} material finding(s) have no linked evidence and are not labeled as assumptions.`,
  );

  add(
    "NO_FABRICATED_METRICS",
    "No fabricated metrics (operator attestation)",
    d.attestations.noFabricatedMetrics,
    "The operator must attest that no metric was invented.",
  );

  // VERIFIED/CLIENT_PROVIDED claims need evidence; NOT_VERIFIED claims must not be presented as material fact.
  const mislabeled = d.findings.filter(
    (f) =>
      f.isMaterial &&
      f.clientFacing &&
      (((f.evidenceState === "VERIFIED" || f.evidenceState === "CLIENT_PROVIDED") && f.evidenceCount === 0) ||
        f.evidenceState === "NOT_VERIFIED"),
  );
  add(
    "ASSUMPTIONS_LABELED",
    "Assumptions labeled",
    mislabeled.length === 0,
    `${mislabeled.length} material finding(s) claim a state their evidence does not support, or are not verified.`,
  );

  const badScenarios = d.leakScenarios.filter((s) => !s.inputsLabeled || (s.computed && s.resultState === "NOT_VERIFIED"));
  add(
    "REVENUE_SCENARIOS_LABELED",
    "Revenue scenarios labeled",
    badScenarios.length === 0,
    `${badScenarios.length} revenue scenario(s) have unlabeled inputs.`,
  );

  add(
    "PRIORITY_PLAN_COMPLETE",
    "Priority plan complete",
    d.priorityFixCount > 0,
    "Add at least one ranked priority fix.",
  );

  add(
    "FINAL_RECOMMENDATION_PRESENT",
    "Final recommendation present",
    filled(d.narrative.finalRecommendation),
    "Write the final recommendation.",
  );

  const n = d.narrative;
  const missingNarrative = (
    [
      ["Executive diagnosis", n.executiveDiagnosis],
      ["Biggest constraint", n.biggestConstraint],
      ["Implementation readiness", n.implementationReadiness],
      ["Measurement plan", n.measurementPlan],
      ["Next decision", n.nextDecision],
    ] as const
  )
    .filter(([, v]) => !filled(v))
    .map(([k]) => k);
  add("REPORT_COMPLETE", "Report content complete", missingNarrative.length === 0, `Missing: ${missingNarrative.join(", ")}.`);

  add(
    "AESTHETICS_NOT_OVER_REWARDED",
    "Scores do not reward aesthetics over conversion infrastructure (operator attestation)",
    d.attestations.aestheticsNotOverRewarded,
    "The operator must attest that visual polish did not offset broken commercial infrastructure.",
  );

  const passed = checks.every((c) => c.passed);
  return { passed, resultStatus: passed ? "QA_PASSED" : "QA_FAILED", checks };
}
