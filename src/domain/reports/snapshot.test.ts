import { describe, expect, it } from "vitest";
import { buildReportSnapshot, type ReportSource } from "./snapshot";

const src: ReportSource = {
  title: "Peachtree Dental — Revenue Spine Diagnostic",
  clientName: "Peachtree Dental",
  versions: { framework: "RS-FW-2.1", scoring: "RS-SC-1.0", reportTemplate: "RS-RT-1.0", prompt: null },
  templateSections: ["COVER", "EXECUTIVE_DIAGNOSIS", "NEXT_DECISION"],
  narrative: {
    executiveDiagnosis: "Demand exists; the booking path loses it.",
    revenueSpineStrength: "s",
    biggestConstraint: "c",
    recommendedInterventionDirection: "r",
    finalRecommendation: "f",
    implementationReadiness: "i",
    measurementPlan: "m",
    nextDecision: "n",
  },
  zones: [
    { name: "Digital Presence", position: 2, score: 4, diagnosis: "d2", primaryWeakness: "w2", confidence: "MEDIUM", evidenceIds: ["e2"] },
    { name: "Brand Clarity", position: 1, score: 6, diagnosis: "d1", primaryWeakness: "w1", confidence: "LOW", evidenceIds: [] },
  ],
  findings: [
    { statement: "No booking button on mobile", evidenceState: "VERIFIED", isMaterial: true, clientFacing: true, section: "05", evidenceIds: ["e1"] },
    { statement: "INTERNAL: owner seems price sensitive", evidenceState: "ASSUMPTION", isMaterial: false, clientFacing: false, section: null, evidenceIds: ["e3"] },
  ],
  fixes: [
    { rank: 2, problem: "p2", fix: "f2", interventionClass: null, effort: null, evidenceIds: [] },
    { rank: 1, problem: "p1", fix: "f1", interventionClass: "Booking", effort: "2 days", evidenceIds: ["e1"] },
  ],
  scenarios: [
    {
      label: "After-hours calls",
      averageClientValue: 850,
      averageClientValueState: "CLIENT_PROVIDED",
      missedBookingsPerWeek: 3,
      missedBookingsState: "ASSUMPTION",
      weeksPerMonth: 4,
      weeksPerMonthState: "ASSUMPTION",
      estimatedMonthlyExposure: 10200,
      resultState: "ASSUMPTION",
    },
    {
      label: "Unknown",
      averageClientValue: null,
      averageClientValueState: "NOT_VERIFIED",
      missedBookingsPerWeek: 1,
      missedBookingsState: "ASSUMPTION",
      weeksPerMonth: 4,
      weeksPerMonthState: "ASSUMPTION",
      estimatedMonthlyExposure: null,
      resultState: "NOT_VERIFIED",
    },
  ],
  evidence: [
    { id: "e1", type: "WEBSITE_OBSERVATION", source: "Homepage", sourceUrl: "https://x", capturedText: "no button", evidenceState: "VERIFIED", operatorNotes: "SECRET OPERATOR NOTE" },
    { id: "e2", type: "CLIENT_STATEMENT", source: "Owner call", sourceUrl: null, capturedText: "we miss calls", evidenceState: "CLIENT_PROVIDED" },
    { id: "e3", type: "CALL_NOTE", source: "Internal note", sourceUrl: null, capturedText: "UNUSED-INTERNAL", evidenceState: "ASSUMPTION" },
    { id: "e4", type: "OTHER", source: "Unlinked", sourceUrl: null, capturedText: "UNLINKED", evidenceState: "NOT_VERIFIED" },
  ],
  preparedAt: new Date(Date.UTC(2026, 8, 30)),
};

describe("buildReportSnapshot", () => {
  const snap = buildReportSnapshot(src);
  const json = JSON.stringify(snap);

  it("never contains internal fields or internal findings", () => {
    expect(json).not.toContain("SECRET OPERATOR NOTE");
    expect(json).not.toContain("operatorNotes");
    expect(json).not.toContain("INTERNAL: owner");
    expect(json).not.toContain("UNUSED-INTERNAL"); // evidence used only by an internal finding
    expect(json).not.toContain("UNLINKED");
  });

  it("carries version codes and the template's section order", () => {
    expect(snap.versions).toEqual({ framework: "RS-FW-2.1", scoring: "RS-SC-1.0", reportTemplate: "RS-RT-1.0", prompt: null });
    expect(snap.sections).toEqual(["COVER", "EXECUTIVE_DIAGNOSIS", "NEXT_DECISION"]);
    expect(snap.schemaVersion).toBe(1);
  });

  it("labels every finding's evidence state and references evidence", () => {
    expect(snap.findings).toEqual([
      { statement: "No booking button on mobile", state: "VERIFIED", stateLabel: "Verified", material: true, section: "05", evidenceRefs: ["E1"] },
    ]);
    expect(snap.evidence.map((e) => [e.ref, e.source, e.stateLabel])).toEqual([
      ["E1", "Homepage", "Verified"],
      ["E2", "Owner call", "Client-provided (Owner call)"],
    ]);
  });

  it("orders zones by position and fixes by rank", () => {
    expect(snap.zones.map((z) => z.name)).toEqual(["Brand Clarity", "Digital Presence"]);
    expect(snap.zones[1].evidenceRefs).toEqual(["E2"]);
    expect(snap.fixes.map((f) => f.rank)).toEqual([1, 2]);
  });

  it("labels exposure as a scenario and never shows a number for unverified inputs", () => {
    expect(snap.exposureLabel).toBe("Estimated revenue exposure");
    expect(snap.scenarios[0]).toMatchObject({ isScenario: true, resultLabel: "Assumption — used for scenario modeling only" });
    expect(snap.scenarios[1]).toMatchObject({ estimatedMonthlyExposure: null, resultLabel: "Not verified from available evidence." });
  });
});
