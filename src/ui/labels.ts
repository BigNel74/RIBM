import type {
  AuthorityLevel,
  AuthorityState,
  DecisionRole,
  DemandSourceState,
  QualificationState,
  UrgencyLevel,
} from "@/domain/shared/enums";

export const AUTHORITY_STATE_LABELS: Record<AuthorityState, string> = {
  UNKNOWN: "Unknown",
  PARTIAL: "Partial — decision process unclear",
  CONFIRMED: "Confirmed — decision-maker and process known",
};

export const DEMAND_SOURCE_LABELS: Record<DemandSourceState, string> = {
  UNKNOWN: "Unknown",
  NONE: "None — no inbound demand",
  WEAK: "Weak",
  MEANINGFUL: "Meaningful — traffic, referrals, ads, or inquiries",
};

export const URGENCY_LABELS: Record<UrgencyLevel, string> = { UNKNOWN: "Unknown", LOW: "Low", MEDIUM: "Medium", HIGH: "High" };

export const QUALIFICATION_LABELS: Record<QualificationState, string> = {
  UNASSESSED: "Unassessed",
  IN_PROGRESS: "In progress",
  QUALIFIED: "Qualified",
  DISQUALIFIED: "Disqualified",
};

export const AUTHORITY_LEVEL_LABELS: Record<AuthorityLevel, string> = {
  UNKNOWN: "Unknown",
  DECISION_MAKER: "Decision-maker",
  INFLUENCER: "Influencer",
  GATEKEEPER: "Gatekeeper",
};

export const DECISION_ROLE_LABELS: Record<DecisionRole, string> = {
  UNKNOWN: "Unknown",
  ECONOMIC_BUYER: "Economic buyer",
  CHAMPION: "Champion",
  TECHNICAL_EVALUATOR: "Technical evaluator",
  END_USER: "End user",
};

export const fmtDate = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "—");

/** Build select options from a label map. */
export function optionsFrom<T extends string>(labels: Record<T, string>) {
  return (Object.entries(labels) as Array<[T, string]>).map(([value, label]) => ({ value, label }));
}
