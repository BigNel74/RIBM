import { describe, expect, it } from "vitest";
import { SCORING_RULES_V1, scoringRulesSchema } from "./rules";
import { assertValidScore, scoreViolations } from "./score";

const rules = SCORING_RULES_V1;

describe("score range validation (invariant S1)", () => {
  it.each([0, 11, -3, 100])("rejects %s", (score) => {
    expect(() => assertValidScore({ score, linkedEvidenceStates: [] }, rules)).toThrow(/between 1 and 10/);
  });

  it("rejects non-integers", () => {
    expect(() => assertValidScore({ score: 6.5, linkedEvidenceStates: [] }, rules)).toThrow(/whole numbers/);
  });

  it("allows an unscored zone (null)", () => {
    expect(scoreViolations({ score: null, linkedEvidenceStates: [] }, rules)).toEqual([]);
  });

  it.each([1, 3, 6])("allows %s without verified evidence", (score) => {
    expect(scoreViolations({ score, linkedEvidenceStates: ["ASSUMPTION"] }, rules)).toEqual([]);
  });
});

describe("evidence thresholds (invariant S2)", () => {
  it("requires verified evidence for 7+", () => {
    const v = scoreViolations({ score: 7, linkedEvidenceStates: ["CLIENT_PROVIDED", "ASSUMPTION"] }, rules);
    expect(v.map((x) => x.code)).toEqual(["SCORE_NEEDS_VERIFIED_EVIDENCE"]);
  });

  it("accepts 7 with one verified item", () => {
    expect(scoreViolations({ score: 7, linkedEvidenceStates: ["VERIFIED"] }, rules)).toEqual([]);
  });

  it("requires two verified items and a justification for 9+", () => {
    const v = scoreViolations({ score: 9, linkedEvidenceStates: ["VERIFIED"] }, rules);
    expect(v.map((x) => x.code).sort()).toEqual(["SCORE_NEEDS_JUSTIFICATION", "SCORE_NEEDS_VERIFIED_EVIDENCE"]);
  });

  it("accepts 10 with two verified items and a justification", () => {
    expect(
      scoreViolations(
        { score: 10, linkedEvidenceStates: ["VERIFIED", "VERIFIED"], justification: "Sub-60s response, verified." },
        rules,
      ),
    ).toEqual([]);
  });
});

describe("scoring rules schema", () => {
  it("accepts the v1 defaults", () => {
    expect(scoringRulesSchema.parse(SCORING_RULES_V1)).toEqual(SCORING_RULES_V1);
  });
});
