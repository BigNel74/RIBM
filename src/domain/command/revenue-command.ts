/**
 * Revenue Command engine (01 §5, 04 §5, BD §6).
 *
 * Revenue Gap                     = Cash Target − Collected − Contracted Near-Term
 * Required Wins                   = Revenue Gap / Average First-Sale Revenue
 * Required Proposals              = Required Wins / Proposal Close Rate
 * Required Qualified Conversations = Required Proposals / Conversation-to-Proposal Rate
 *
 * Rates are derived from trailing counts, never typed in, so the engine can
 * refuse to manufacture precision when the sample is too small (R2).
 * All money math is done in integer cents; all ratios as integer fractions.
 */

export interface RevenueCommandInput {
  cashTarget: number;
  collectedToDate: number;
  contractedNearTerm: number;
  recurringRevenue: number;
  avgFirstSaleRevenue: number | null;
  decidedProposals: number;
  wonProposals: number;
  qualifiedConversations: number;
  proposalsFromConversations: number;
  /** First day of the period's month (UTC). */
  periodStart: Date;
  asOf: Date;
  /** Minimum denominator before a rate is used (ScoringRules.funnelRateMinSample). */
  minSample: number;
}

export interface TrailingRate {
  numerator: number;
  denominator: number;
  /** null when the sample is insufficient. */
  value: number | null;
  sufficient: boolean;
  minSample: number;
}

export type Requirement =
  | { status: "OK"; value: number }
  | { status: "NOT_NEEDED"; value: 0 }
  | { status: "INSUFFICIENT_DATA"; reason: string }
  | { status: "ZERO_RATE"; reason: string };

export interface RevenueCommand {
  revenueGap: number;
  targetCovered: boolean;
  recurringRevenue: number;
  closeRate: TrailingRate;
  conversationToProposalRate: TrailingRate;
  requiredWins: Requirement;
  requiredProposals: Requirement;
  requiredConversations: Requirement;
  weeksRemaining: number;
  conversationsThisWeek: Requirement;
  primaryCommand: string;
}

const toCents = (n: number) => Math.round(n * 100);
const ceilDiv = (a: number, b: number) => Math.floor((a + b - 1) / b);

function trailingRate(numerator: number, denominator: number, minSample: number): TrailingRate {
  const sufficient = denominator >= minSample;
  return {
    numerator,
    denominator,
    sufficient,
    minSample,
    value: sufficient && denominator > 0 ? numerator / denominator : null,
  };
}

/** Whole weeks left in the period's calendar month, counting the current week. Minimum 1. */
export function weeksRemainingInPeriod(periodStart: Date, asOf: Date): number {
  const end = Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1);
  const today = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate());
  const days = Math.max(0, Math.round((end - today) / 86_400_000));
  return Math.max(1, Math.ceil(days / 7));
}

/** Divide an integer requirement by an integer fraction numerator/denominator, rounding up (R4). */
function scaleUp(required: number, rate: TrailingRate, label: string): Requirement {
  if (!rate.sufficient) {
    return {
      status: "INSUFFICIENT_DATA",
      reason: `${label}: ${rate.denominator} in the trailing sample (minimum ${rate.minSample}).`,
    };
  }
  if (rate.numerator === 0) {
    return { status: "ZERO_RATE", reason: `${label} is 0 of ${rate.denominator} in the trailing sample.` };
  }
  return { status: "OK", value: ceilDiv(required * rate.denominator, rate.numerator) };
}

function chain(prev: Requirement, rate: TrailingRate, label: string): Requirement {
  if (prev.status === "NOT_NEEDED") return prev;
  if (prev.status !== "OK") return prev;
  return scaleUp(prev.value, rate, label);
}

export function computeRevenueCommand(input: RevenueCommandInput): RevenueCommand {
  const gapCents = toCents(input.cashTarget) - toCents(input.collectedToDate) - toCents(input.contractedNearTerm);
  const revenueGap = gapCents / 100;
  const targetCovered = gapCents <= 0;

  const closeRate = trailingRate(input.wonProposals, input.decidedProposals, input.minSample);
  const conversationToProposalRate = trailingRate(
    input.proposalsFromConversations,
    input.qualifiedConversations,
    input.minSample,
  );

  let requiredWins: Requirement;
  if (targetCovered) {
    requiredWins = { status: "NOT_NEEDED", value: 0 };
  } else if (input.avgFirstSaleRevenue === null || input.avgFirstSaleRevenue <= 0) {
    requiredWins = { status: "INSUFFICIENT_DATA", reason: "Trailing average first-sale revenue is not recorded." };
  } else {
    requiredWins = { status: "OK", value: ceilDiv(gapCents, toCents(input.avgFirstSaleRevenue)) };
  }

  const requiredProposals = chain(requiredWins, closeRate, "Proposal close rate");
  const requiredConversations = chain(requiredProposals, conversationToProposalRate, "Conversation-to-proposal rate");

  const weeksRemaining = weeksRemainingInPeriod(input.periodStart, input.asOf);
  const conversationsThisWeek: Requirement =
    requiredConversations.status === "OK"
      ? { status: "OK", value: ceilDiv(requiredConversations.value, weeksRemaining) }
      : requiredConversations;

  return {
    revenueGap,
    targetCovered,
    recurringRevenue: input.recurringRevenue,
    closeRate,
    conversationToProposalRate,
    requiredWins,
    requiredProposals,
    requiredConversations,
    weeksRemaining,
    conversationsThisWeek,
    primaryCommand: primaryCommandFor({ requiredWins, requiredProposals, conversationsThisWeek, closeRate, minSample: input.minSample }),
  };
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function primaryCommandFor(args: {
  requiredWins: Requirement;
  requiredProposals: Requirement;
  conversationsThisWeek: Requirement;
  closeRate: TrailingRate;
  minSample: number;
}): string {
  const { requiredWins, requiredProposals, conversationsThisWeek } = args;

  if (requiredWins.status === "NOT_NEEDED") {
    return "The cash target is covered by collected and contracted revenue. Next priority: convert contracted revenue into collected cash.";
  }
  if (requiredWins.status !== "OK") {
    return "Record trailing average first-sale revenue to compute how many wins the revenue gap requires.";
  }
  if (conversationsThisWeek.status === "OK") {
    return `You need ${plural(conversationsThisWeek.value, "additional qualified conversation", "additional qualified conversations")} this week to maintain the current revenue target.`;
  }
  if (conversationsThisWeek.status === "ZERO_RATE" || requiredProposals.status === "ZERO_RATE") {
    return `The revenue gap requires ${plural(requiredWins.value, "win", "wins")}, but the trailing sample shows no conversions at one stage. Fix that stage before adding volume.`;
  }
  return `The revenue gap requires ${plural(requiredWins.value, "additional win", "additional wins")}. Conversion history is insufficient (minimum ${args.minSample} per stage) — plan from scenario ranges, not point estimates.`;
}

export interface ScenarioRates {
  label: string;
  /** Operator-supplied, 0 < rate ≤ 1. Always an ASSUMPTION. */
  closeRate: number;
  conversationToProposalRate: number;
}

export interface ScenarioResult extends ScenarioRates {
  evidenceState: "ASSUMPTION";
  requiredProposals: number;
  requiredConversations: number;
}

/** Scenario ranges for when history is insufficient (R3). Every row is labeled ASSUMPTION. */
export function computeScenarioRange(requiredWins: number, scenarios: readonly ScenarioRates[]): ScenarioResult[] {
  return scenarios.map((s) => {
    if (!(s.closeRate > 0 && s.closeRate <= 1) || !(s.conversationToProposalRate > 0 && s.conversationToProposalRate <= 1)) {
      throw new RangeError(`Scenario "${s.label}" rates must be between 0 (exclusive) and 1.`);
    }
    // Round to basis points first so floating error can't add a phantom unit (e.g. 3 / 0.6).
    const bpClose = Math.round(s.closeRate * 10_000);
    const bpConv = Math.round(s.conversationToProposalRate * 10_000);
    const requiredProposals = ceilDiv(requiredWins * 10_000, bpClose);
    const requiredConversations = ceilDiv(requiredProposals * 10_000, bpConv);
    return { ...s, evidenceState: "ASSUMPTION", requiredProposals, requiredConversations };
  });
}
