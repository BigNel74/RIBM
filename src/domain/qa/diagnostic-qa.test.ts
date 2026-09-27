import { describe, expect, it } from "vitest";
import { evaluateDiagnosticQa, type DiagnosticQaSnapshot } from "./diagnostic-qa";
import { assertQaTransition, assertReportPublishable, canTransitionQa } from "./qa-status";

function completeSnapshot(): DiagnosticQaSnapshot {
  return {
    intakeComplete: true,
    expectedZoneCount: 5,
    zones: Array.from({ length: 5 }, (_, i) => ({
      key: `Z${i}`,
      score: 5,
      diagnosis: "d",
      primaryWeakness: "w",
      scoreValid: true,
    })),
    expectedSectionCount: 15,
    sections: Array.from({ length: 15 }, (_, i) => ({ number: i + 1, status: "COMPLETE" as const })),
    findings: [
      { id: "f1", isMaterial: true, clientFacing: true, evidenceState: "VERIFIED", evidenceCount: 2 },
      { id: "f2", isMaterial: true, clientFacing: true, evidenceState: "ASSUMPTION", evidenceCount: 0 },
    ],
    leakScenarios: [{ id: "l1", computed: true, resultState: "ASSUMPTION", inputsLabeled: true }],
    priorityFixCount: 3,
    narrative: {
      executiveDiagnosis: "x",
      biggestConstraint: "x",
      finalRecommendation: "x",
      implementationReadiness: "x",
      measurementPlan: "x",
      nextDecision: "x",
    },
    attestations: { noFabricatedMetrics: true, aestheticsNotOverRewarded: true },
  };
}

describe("evaluateDiagnosticQa", () => {
  it("passes a complete, evidence-mapped diagnostic", () => {
    const r = evaluateDiagnosticQa(completeSnapshot());
    expect(r.checks.filter((c) => !c.passed)).toEqual([]);
    expect(r.resultStatus).toBe("QA_PASSED");
  });

  it("fails when a material claim has no evidence and no assumption label", () => {
    const s = completeSnapshot();
    s.findings.push({ id: "f3", isMaterial: true, clientFacing: true, evidenceState: "VERIFIED", evidenceCount: 0 });
    const r = evaluateDiagnosticQa(s);
    expect(r.resultStatus).toBe("QA_FAILED");
    expect(r.checks.find((c) => c.key === "MATERIAL_CLAIMS_MAPPED")?.passed).toBe(false);
    expect(r.checks.find((c) => c.key === "ASSUMPTIONS_LABELED")?.passed).toBe(false);
  });

  it("fails when a material client-facing claim is NOT_VERIFIED", () => {
    const s = completeSnapshot();
    s.findings.push({ id: "f4", isMaterial: true, clientFacing: true, evidenceState: "NOT_VERIFIED", evidenceCount: 1 });
    expect(evaluateDiagnosticQa(s).checks.find((c) => c.key === "ASSUMPTIONS_LABELED")?.passed).toBe(false);
  });

  it("ignores internal (non-client-facing) findings for claim mapping", () => {
    const s = completeSnapshot();
    s.findings.push({ id: "f5", isMaterial: true, clientFacing: false, evidenceState: "NOT_VERIFIED", evidenceCount: 0 });
    expect(evaluateDiagnosticQa(s).passed).toBe(true);
  });

  it("fails when fewer than 15 sections are complete", () => {
    const s = completeSnapshot();
    s.sections[14].status = "DRAFT";
    const r = evaluateDiagnosticQa(s);
    expect(r.checks.find((c) => c.key === "FIFTEEN_SECTIONS_COMPLETE")).toMatchObject({ passed: false, detail: "14 of 15 sections complete." });
  });

  it("fails when a zone score violates evidence rules", () => {
    const s = completeSnapshot();
    s.zones[0].scoreValid = false;
    expect(evaluateDiagnosticQa(s).checks.find((c) => c.key === "SCORECARD_COMPLETE")?.passed).toBe(false);
  });

  it("requires both operator attestations", () => {
    const s = completeSnapshot();
    s.attestations = { noFabricatedMetrics: false, aestheticsNotOverRewarded: false };
    const failed = evaluateDiagnosticQa(s).checks.filter((c) => !c.passed).map((c) => c.key);
    expect(failed).toEqual(["NO_FABRICATED_METRICS", "AESTHETICS_NOT_OVER_REWARDED"]);
  });

  it("fails with no priority plan or missing narrative", () => {
    const s = completeSnapshot();
    s.priorityFixCount = 0;
    s.narrative.measurementPlan = "  ";
    const failed = evaluateDiagnosticQa(s).checks.filter((c) => !c.passed).map((c) => c.key);
    expect(failed).toEqual(["PRIORITY_PLAN_COMPLETE", "REPORT_COMPLETE"]);
  });
});

describe("QA state machine (L1) and publish gate (L5)", () => {
  it("report publishing fails when QA has not passed", () => {
    for (const status of ["NOT_READY", "READY_FOR_QA", "QA_FAILED"] as const) {
      expect(() => assertReportPublishable(status)).toThrow(/until QA has passed/);
    }
    expect(() => assertReportPublishable("QA_PASSED")).not.toThrow();
    expect(() => assertReportPublishable("FINALIZED")).not.toThrow();
  });

  it("cannot skip QA", () => {
    expect(canTransitionQa("NOT_READY", "QA_PASSED")).toBe(false);
    expect(canTransitionQa("NOT_READY", "FINALIZED")).toBe(false);
    expect(canTransitionQa("QA_FAILED", "FINALIZED")).toBe(false);
  });

  it("treats FINALIZED as terminal", () => {
    expect(() => assertQaTransition("FINALIZED", "NOT_READY")).toThrow(/superseding diagnostic/);
  });

  it("follows the happy path", () => {
    expect(() => {
      assertQaTransition("NOT_READY", "READY_FOR_QA");
      assertQaTransition("READY_FOR_QA", "QA_PASSED");
      assertQaTransition("QA_PASSED", "FINALIZED");
    }).not.toThrow();
  });
});
