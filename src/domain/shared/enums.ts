/**
 * Domain-level enum values. Kept in sync with prisma/schema.prisma by
 * enums.test.ts so domain code never imports the ORM.
 */
export const ROLES = ["ADMIN", "OPERATOR", "SALES_ADVISOR", "CONTRACTOR", "CLIENT"] as const;
export type Role = (typeof ROLES)[number];

export const EVIDENCE_STATES = ["VERIFIED", "CLIENT_PROVIDED", "ASSUMPTION", "NOT_VERIFIED"] as const;
export type EvidenceState = (typeof EVIDENCE_STATES)[number];

export const QA_STATUSES = ["NOT_READY", "READY_FOR_QA", "QA_FAILED", "QA_PASSED", "FINALIZED"] as const;
export type QaStatus = (typeof QA_STATUSES)[number];

export const OPPORTUNITY_STAGES = [
  "TARGET",
  "CONTACTED",
  "CONVERSATION",
  "QUALIFIED",
  "DIAGNOSTIC",
  "PRESCRIPTION_PENDING",
  "PROPOSAL",
  "WON",
  "LOST",
  "DEFERRED",
  "DISQUALIFIED",
] as const;
export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];

export const QUALIFICATION_STATES = ["UNASSESSED", "IN_PROGRESS", "QUALIFIED", "DISQUALIFIED"] as const;
export type QualificationState = (typeof QUALIFICATION_STATES)[number];

export const DEMAND_SOURCE_STATES = ["UNKNOWN", "NONE", "WEAK", "MEANINGFUL"] as const;
export type DemandSourceState = (typeof DEMAND_SOURCE_STATES)[number];

export const AUTHORITY_STATES = ["UNKNOWN", "PARTIAL", "CONFIRMED"] as const;
export type AuthorityState = (typeof AUTHORITY_STATES)[number];

export const URGENCY_LEVELS = ["UNKNOWN", "LOW", "MEDIUM", "HIGH"] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

export const AUTHORITY_LEVELS = ["UNKNOWN", "DECISION_MAKER", "INFLUENCER", "GATEKEEPER"] as const;
export type AuthorityLevel = (typeof AUTHORITY_LEVELS)[number];

export const DECISION_ROLES = ["UNKNOWN", "ECONOMIC_BUYER", "CHAMPION", "TECHNICAL_EVALUATOR", "END_USER"] as const;
export type DecisionRole = (typeof DECISION_ROLES)[number];

export const OFFER_STATUSES = ["PRIMARY", "TEST", "POST_SALE", "DEFERRED", "RETIRED"] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const VALIDATION_DECISIONS = ["DOUBLE", "TWEAK", "PAUSE", "KILL"] as const;
export type ValidationDecisionState = (typeof VALIDATION_DECISIONS)[number];

export const CONFIDENCE_DIMENSIONS = [
  "DEMAND",
  "WILLINGNESS_TO_PAY",
  "DELIVERY",
  "OUTCOME",
  "RECURRING_VALUE",
] as const;
export type ConfidenceDimension = (typeof CONFIDENCE_DIMENSIONS)[number];

export const CONFIDENCE_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const CLAIM_TYPES = ["OUTCOME", "AVERAGE", "MARGIN", "SPEED", "TESTIMONIAL", "BENCHMARK"] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const CLAIM_STATUSES = ["DRAFT", "VERIFIED", "EXPIRED", "BLOCKED"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

/** Exact display text for NOT_VERIFIED (04 §7 "UNKNOWN RULE"). */
export const NOT_VERIFIED_DISPLAY = "Not verified from available evidence.";

export const EVIDENCE_STATE_LABELS: Record<EvidenceState, string> = {
  VERIFIED: "Verified",
  CLIENT_PROVIDED: "Client-provided",
  ASSUMPTION: "Assumption",
  NOT_VERIFIED: NOT_VERIFIED_DISPLAY,
};
