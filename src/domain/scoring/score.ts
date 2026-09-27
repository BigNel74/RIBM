import { DomainRuleError } from "../shared/errors";
import type { EvidenceState } from "../shared/enums";
import type { ScoringRules } from "./rules";

export interface ScoreInput {
  score: number | null;
  /** States of the evidence items linked to this score. */
  linkedEvidenceStates: readonly EvidenceState[];
  justification?: string | null;
}

export interface ScoreViolation {
  code: "SCORE_NOT_INTEGER" | "SCORE_OUT_OF_RANGE" | "SCORE_NEEDS_VERIFIED_EVIDENCE" | "SCORE_NEEDS_JUSTIFICATION";
  message: string;
}

/**
 * Invariants S1–S2. A score is a consistency instrument, not a measurement:
 * high scores must be backed by observable (VERIFIED) evidence. Returns all
 * violations so the scoring UI can show them next to the evidence.
 */
export function scoreViolations(input: ScoreInput, rules: ScoringRules): ScoreViolation[] {
  const { score } = input;
  if (score === null) return [];

  if (!Number.isInteger(score)) {
    return [{ code: "SCORE_NOT_INTEGER", message: "Scores must be whole numbers." }];
  }
  if (score < rules.minScore || score > rules.maxScore) {
    return [
      {
        code: "SCORE_OUT_OF_RANGE",
        message: `Scores must be between ${rules.minScore} and ${rules.maxScore}.`,
      },
    ];
  }

  const violations: ScoreViolation[] = [];
  const verified = input.linkedEvidenceStates.filter((s) => s === "VERIFIED").length;

  if (score >= rules.exceptionalThreshold) {
    if (verified < rules.exceptionalMinVerified) {
      violations.push({
        code: "SCORE_NEEDS_VERIFIED_EVIDENCE",
        message: `A score of ${rules.exceptionalThreshold}+ requires exceptional execution backed by at least ${rules.exceptionalMinVerified} verified evidence items (linked: ${verified}).`,
      });
    }
    if (!input.justification?.trim()) {
      violations.push({
        code: "SCORE_NEEDS_JUSTIFICATION",
        message: `A score of ${rules.exceptionalThreshold}+ requires a written justification.`,
      });
    }
  } else if (score >= rules.strongEvidenceThreshold && verified < rules.strongEvidenceMinVerified) {
    violations.push({
      code: "SCORE_NEEDS_VERIFIED_EVIDENCE",
      message: `A score of ${rules.strongEvidenceThreshold}+ requires strong observable evidence: at least ${rules.strongEvidenceMinVerified} verified evidence item (linked: ${verified}).`,
    });
  }

  return violations;
}

export function assertValidScore(input: ScoreInput, rules: ScoringRules): void {
  const [first] = scoreViolations(input, rules);
  if (first) throw new DomainRuleError(first.code, first.message);
}
