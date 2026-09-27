import { z } from "zod";

/**
 * Parameters stored in ScoringVersion.rules. Changing any value requires a
 * new ScoringVersion so historical diagnostics stay reproducible.
 */
export const scoringRulesSchema = z.object({
  minScore: z.literal(1),
  maxScore: z.literal(10),
  /** Scores at or above this need `strongEvidenceMinVerified` VERIFIED links. (04 §8: 7+) */
  strongEvidenceThreshold: z.number().int().min(2).max(10),
  strongEvidenceMinVerified: z.number().int().min(1),
  /** Scores at or above this need `exceptionalMinVerified` VERIFIED links and a justification. (04 §8: 9–10) */
  exceptionalThreshold: z.number().int().min(2).max(10),
  exceptionalMinVerified: z.number().int().min(1),
  /** Minimum denominator before a trailing funnel rate is used (DECISIONS C-12). */
  funnelRateMinSample: z.number().int().min(1),
});

export type ScoringRules = z.infer<typeof scoringRulesSchema>;

/** RS-SC-1.0 — founder-confirmed 2026-09-27 (DECISIONS C-12, C-13). */
export const SCORING_RULES_V1: ScoringRules = {
  minScore: 1,
  maxScore: 10,
  strongEvidenceThreshold: 7,
  strongEvidenceMinVerified: 1,
  exceptionalThreshold: 9,
  exceptionalMinVerified: 2,
  funnelRateMinSample: 5,
};
