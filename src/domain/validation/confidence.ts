import type { ConfidenceDimension, ConfidenceLevel } from "../shared/enums";

/**
 * Confidence by dimension (04 §28 table). Never a single success probability (V1).
 *
 * | Dimension | LOW | MEDIUM | HIGH |
 * | Demand    | <3 qualified conversations | 3–9 with repeated pain | 10+ with repeated pain AND commercial advancement |
 * | WTP       | no paid proof | 1 paid test | 3+ paid engagements at target scope/price |
 * | Delivery  | unbounded / founder-heavy | delivered once with documented friction | 3+ repeatable deliveries within target capacity |
 * | Outcome   | no verified outcome | 1–2 verified outcomes | 3+ comparable verified outcomes |
 * | Recurring | no continuing job | one retained client | multiple retained clients with explicit ongoing job |
 */

export interface ConfidenceEvidence {
  qualifiedConversations: number;
  /** Buyers independently described the same pain. */
  repeatedPain: boolean;
  /** At least one buyer advanced to a commercial next step. */
  commercialAdvancement: boolean;
  paidEngagements: number;
  /** Of the paid engagements, how many were at target scope/price. */
  paidAtTargetScopePrice: number;
  deliveriesWithDocumentedFriction: number;
  repeatableDeliveriesWithinCapacity: number;
  verifiedOutcomes: number;
  comparableVerifiedOutcomes: number;
  retainedClients: number;
  retainedWithExplicitOngoingJob: number;
}

export function confidenceFor(dimension: ConfidenceDimension, e: ConfidenceEvidence): ConfidenceLevel {
  switch (dimension) {
    case "DEMAND":
      if (e.qualifiedConversations >= 10 && e.repeatedPain && e.commercialAdvancement) return "HIGH";
      if (e.qualifiedConversations >= 3 && e.repeatedPain) return "MEDIUM";
      return "LOW";
    case "WILLINGNESS_TO_PAY":
      if (e.paidAtTargetScopePrice >= 3) return "HIGH";
      if (e.paidEngagements >= 1) return "MEDIUM";
      return "LOW";
    case "DELIVERY":
      if (e.repeatableDeliveriesWithinCapacity >= 3) return "HIGH";
      if (e.deliveriesWithDocumentedFriction >= 1 || e.repeatableDeliveriesWithinCapacity >= 1) return "MEDIUM";
      return "LOW";
    case "OUTCOME":
      if (e.comparableVerifiedOutcomes >= 3) return "HIGH";
      if (e.verifiedOutcomes >= 1) return "MEDIUM";
      return "LOW";
    case "RECURRING_VALUE":
      if (e.retainedWithExplicitOngoingJob >= 2) return "HIGH";
      if (e.retainedClients >= 1) return "MEDIUM";
      return "LOW";
  }
}

export type ConfidenceProfile = Record<ConfidenceDimension, ConfidenceLevel>;

export function confidenceProfile(e: ConfidenceEvidence): ConfidenceProfile {
  return {
    DEMAND: confidenceFor("DEMAND", e),
    WILLINGNESS_TO_PAY: confidenceFor("WILLINGNESS_TO_PAY", e),
    DELIVERY: confidenceFor("DELIVERY", e),
    OUTCOME: confidenceFor("OUTCOME", e),
    RECURRING_VALUE: confidenceFor("RECURRING_VALUE", e),
  };
}

const REQUIRED_FOR_VALIDATED: readonly ConfidenceDimension[] = ["DEMAND", "WILLINGNESS_TO_PAY", "DELIVERY", "OUTCOME"];

/**
 * Invariant V2 (00 memo): an offer is VALIDATED only with HIGH evidence on
 * Demand, Willingness to Pay, Delivery, and Outcome, plus positive unit
 * economics. Otherwise it is TESTING.
 */
export function deriveOfferValidationState(
  profile: ConfidenceProfile,
  unitEconomics: { positive: boolean; basis: string | null },
): { state: "TESTING" | "VALIDATED"; blockers: string[] } {
  const blockers = REQUIRED_FOR_VALIDATED.filter((d) => profile[d] !== "HIGH").map((d) => `${d} is ${profile[d]}, needs HIGH`);
  if (!unitEconomics.positive || !unitEconomics.basis?.trim()) {
    blockers.push("Positive unit economics not recorded with a basis");
  }
  return { state: blockers.length === 0 ? "VALIDATED" : "TESTING", blockers };
}
