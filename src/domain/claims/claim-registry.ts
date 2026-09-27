import { DomainRuleError } from "../shared/errors";
import type { ClaimStatus, ClaimType, EvidenceState, Role } from "../shared/enums";

/**
 * Marketing Claim Registry (BD §15, 04 §28, 02 §14 "Proof Registry").
 * Publication lock: quantitative public claims cannot be VERIFIED without
 * verified evidence records and a reproducible calculation basis.
 */

const QUANTITATIVE = /\d|%|×|\bper ?cent\b/i;
const PERCENTAGE = /%|\bper ?cent\b/i;

/** Detects numbers, percentages, and multipliers ("3x", "×3"). */
export function detectQuantitative(statement: string): boolean {
  return QUANTITATIVE.test(statement);
}

/** The operator may flag a claim quantitative; they may not un-flag one the detector caught. */
export function resolveIsQuantitative(statement: string, operatorFlag: boolean): boolean {
  return detectQuantitative(statement) || operatorFlag;
}

export interface ClaimForVerification {
  statement: string;
  claimType: ClaimType;
  isQuantitative: boolean;
  evidenceStates: readonly EvidenceState[];
  cohortDefinition?: string | null;
  timeWindow?: string | null;
  calculationMethod?: string | null;
  reviewDate?: Date | null;
}

export interface ClaimGap {
  code: string;
  message: string;
}

const filled = (s?: string | null) => Boolean(s && s.trim());

/** Everything preventing this claim from being VERIFIED. Empty = verifiable. */
export function claimVerificationGaps(claim: ClaimForVerification, now: Date): ClaimGap[] {
  const gaps: ClaimGap[] = [];
  const quantitative = resolveIsQuantitative(claim.statement, claim.isQuantitative);

  if (claim.evidenceStates.length === 0) {
    gaps.push({ code: "CLAIM_EVIDENCE_REQUIRED", message: "Link at least one evidence record." });
  }
  if (quantitative && claim.evidenceStates.some((s) => s !== "VERIFIED")) {
    gaps.push({
      code: "CLAIM_EVIDENCE_NOT_VERIFIED",
      message: "Quantitative claims require every linked evidence record to be VERIFIED.",
    });
  }
  if (!filled(claim.timeWindow)) {
    gaps.push({ code: "CLAIM_TIME_WINDOW_REQUIRED", message: "Define the time window." });
  }
  if (quantitative && !filled(claim.calculationMethod)) {
    gaps.push({ code: "CLAIM_CALCULATION_REQUIRED", message: "Record a reproducible calculation method." });
  }
  const needsCohort =
    claim.claimType === "AVERAGE" || claim.claimType === "BENCHMARK" || PERCENTAGE.test(claim.statement);
  if (needsCohort && !filled(claim.cohortDefinition)) {
    gaps.push({
      code: "CLAIM_COHORT_REQUIRED",
      message: "Averages, benchmarks, and percentages require a cohort definition (who is included, minimum size).",
    });
  }
  if (claim.reviewDate && claim.reviewDate.getTime() <= now.getTime()) {
    gaps.push({ code: "CLAIM_REVIEW_DATE_PASSED", message: "The review date has passed. Re-verify and set a new review date." });
  }
  return gaps;
}

/** Invariant C1. Only an ADMIN may approve a claim to VERIFIED, and only with no gaps. */
export function assertClaimVerifiable(claim: ClaimForVerification, actorRole: Role, now: Date): void {
  if (actorRole !== "ADMIN") {
    throw new DomainRuleError("CLAIM_APPROVAL_FORBIDDEN", "Only an Admin can approve a claim as VERIFIED.");
  }
  const [first, ...rest] = claimVerificationGaps(claim, now);
  if (first) {
    throw new DomainRuleError(first.code, rest.length ? `${first.message} (+${rest.length} more)` : first.message);
  }
}

/** Invariant C2. What the claim's status means for publication today. */
export function effectiveClaimStatus(status: ClaimStatus, reviewDate: Date | null | undefined, now: Date): ClaimStatus {
  if (status === "VERIFIED" && reviewDate && reviewDate.getTime() <= now.getTime()) return "EXPIRED";
  return status;
}

export function isPublishable(status: ClaimStatus, reviewDate: Date | null | undefined, now: Date): boolean {
  return effectiveClaimStatus(status, reviewDate, now) === "VERIFIED";
}
