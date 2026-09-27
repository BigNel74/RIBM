import { DomainRuleError } from "../shared/errors";
import type {
  AuthorityState,
  DemandSourceState,
  OpportunityStage,
  QualificationState,
} from "../shared/enums";

/**
 * Opportunity stage rules (BD §8, 01 §6, 01 §13, 04 §11, 04 §28; DECISIONS C-06, C-20, C-21).
 *
 * - Entering QUALIFIED-or-later from an unqualified stage requires known authority
 *   and a MEANINGFUL demand source, or a written override reason (audit-logged).
 * - PROPOSAL requires CONFIRMED authority. No override (04 §28).
 * - DISQUALIFIED requires a disqualification reason.
 * - DEFERRED requires a dated next action ("deferred with date").
 * - Every live stage requires a next action and a next-action date (01 §9).
 * - WON is terminal in MVP 1 (post-sale belongs to Deal/Install, MVP 2–3).
 *   LOST and DISQUALIFIED can only be reopened to TARGET, with a reason.
 */

export const TERMINAL_STAGES: readonly OpportunityStage[] = ["WON", "LOST", "DISQUALIFIED"];
export const LIVE_STAGES: readonly OpportunityStage[] = [
  "TARGET",
  "CONTACTED",
  "CONVERSATION",
  "QUALIFIED",
  "DIAGNOSTIC",
  "PRESCRIPTION_PENDING",
  "PROPOSAL",
  "DEFERRED",
];
/** Stages that assume the qualification gate has been passed. */
export const QUALIFIED_STAGES: readonly OpportunityStage[] = [
  "QUALIFIED",
  "DIAGNOSTIC",
  "PRESCRIPTION_PENDING",
  "PROPOSAL",
  "WON",
];

export const STAGE_LABELS: Record<OpportunityStage, string> = {
  TARGET: "Target",
  CONTACTED: "Contacted",
  CONVERSATION: "Conversation",
  QUALIFIED: "Qualified",
  DIAGNOSTIC: "Diagnostic",
  PRESCRIPTION_PENDING: "Prescription pending",
  PROPOSAL: "Proposal",
  WON: "Won",
  LOST: "Lost",
  DEFERRED: "Deferred",
  DISQUALIFIED: "Disqualified",
};

export interface QualificationSignals {
  authorityState: AuthorityState;
  demandSourceState: DemandSourceState;
}

/** Why the qualification gate is not met. Empty = met. */
export function qualificationGaps(s: QualificationSignals): string[] {
  const gaps: string[] = [];
  if (s.authorityState === "UNKNOWN") gaps.push("Decision authority is unknown.");
  if (s.demandSourceState !== "MEANINGFUL") {
    gaps.push(
      s.demandSourceState === "NONE"
        ? "No demand source — conversion infrastructure cannot help a business with no inbound demand."
        : "Demand source is not confirmed as meaningful.",
    );
  }
  return gaps;
}

export interface StageChangeInput extends QualificationSignals {
  from: OpportunityStage;
  to: OpportunityStage;
  /** Why the stage is changing. Required for reopening. */
  reason?: string | null;
  /** Required to pass the qualification gate when its signals are not met. */
  overrideReason?: string | null;
  disqualificationReason?: string | null;
  nextAction?: string | null;
  nextActionDate?: Date | null;
}

export interface StageChangeResult {
  /** Qualification state to store after the change. */
  qualificationState: QualificationState | null;
  /** True when the qualification gate was passed by override; must be audit-logged. */
  qualificationOverridden: boolean;
}

const filled = (s?: string | null) => Boolean(s && s.trim());

export function assertStageChange(input: StageChangeInput): StageChangeResult {
  const { from, to } = input;

  if (from === to) throw new DomainRuleError("STAGE_NO_CHANGE", "The opportunity is already in that stage.");

  if (from === "WON") {
    throw new DomainRuleError("STAGE_WON_TERMINAL", "Won opportunities are closed. Post-sale work belongs to the install record.");
  }
  if ((from === "LOST" || from === "DISQUALIFIED") && to !== "TARGET") {
    throw new DomainRuleError("STAGE_REOPEN_TO_TARGET", "Lost or disqualified opportunities can only be reopened to Target.");
  }
  if ((from === "LOST" || from === "DISQUALIFIED") && !filled(input.reason)) {
    throw new DomainRuleError("STAGE_REOPEN_REASON", "Reopening an opportunity requires a reason.");
  }

  if (to === "DISQUALIFIED" && !filled(input.disqualificationReason)) {
    throw new DomainRuleError("STAGE_DISQUALIFY_REASON", "Disqualifying an opportunity requires a reason.");
  }

  if (LIVE_STAGES.includes(to) && (!filled(input.nextAction) || !input.nextActionDate)) {
    throw new DomainRuleError(
      to === "DEFERRED" ? "STAGE_DEFER_DATE" : "STAGE_NEXT_ACTION",
      to === "DEFERRED"
        ? "Deferring requires a dated next action (deferred with date)."
        : "Every live opportunity needs a next action and a next-action date.",
    );
  }

  if (to === "PROPOSAL" && input.authorityState !== "CONFIRMED") {
    throw new DomainRuleError(
      "STAGE_PROPOSAL_AUTHORITY",
      "A proposal requires confirmed decision authority. Confirm who decides and how before proposing.",
    );
  }

  let qualificationOverridden = false;
  const enteringQualified = QUALIFIED_STAGES.includes(to) && !QUALIFIED_STAGES.includes(from);
  if (enteringQualified) {
    const gaps = qualificationGaps(input);
    if (gaps.length > 0) {
      if (!filled(input.overrideReason)) {
        throw new DomainRuleError("STAGE_QUALIFICATION_GATE", `Not qualified: ${gaps.join(" ")} Record an override reason to proceed anyway.`);
      }
      qualificationOverridden = true;
    }
  }

  let qualificationState: QualificationState | null = null;
  if (to === "DISQUALIFIED") qualificationState = "DISQUALIFIED";
  else if (enteringQualified) qualificationState = "QUALIFIED";
  else if (to === "TARGET" && (from === "LOST" || from === "DISQUALIFIED")) qualificationState = "UNASSESSED";
  else if (to === "CONVERSATION") qualificationState = "IN_PROGRESS";

  return { qualificationState, qualificationOverridden };
}

/** A live opportunity whose next-action date is before today (UTC). */
export function isOverdue(stage: OpportunityStage, nextActionDate: Date | null, now: Date): boolean {
  if (!LIVE_STAGES.includes(stage) || !nextActionDate) return false;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return nextActionDate.getTime() < today;
}
