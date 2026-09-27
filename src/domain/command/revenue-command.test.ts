import { describe, expect, it } from "vitest";
import { computeRevenueCommand, computeScenarioRange, weeksRemainingInPeriod, type RevenueCommandInput } from "./revenue-command";

const base: RevenueCommandInput = {
  cashTarget: 30_000,
  collectedToDate: 8_000,
  contractedNearTerm: 4_000,
  recurringRevenue: 1_600,
  avgFirstSaleRevenue: 4_500,
  decidedProposals: 10,
  wonProposals: 4,
  qualifiedConversations: 20,
  proposalsFromConversations: 10,
  periodStart: new Date(Date.UTC(2026, 8, 1)),
  asOf: new Date(Date.UTC(2026, 8, 27)),
  minSample: 5,
};

describe("computeRevenueCommand — sufficient history", () => {
  const r = computeRevenueCommand(base);

  it("computes the revenue gap (R1) without subtracting recurring revenue twice", () => {
    expect(r.revenueGap).toBe(18_000);
    expect(r.targetCovered).toBe(false);
  });

  it("chains wins → proposals → conversations, rounding up (R4)", () => {
    // 18,000 / 4,500 = 4 wins; 4 / (4/10) = 10 proposals; 10 / (10/20) = 20 conversations
    expect(r.requiredWins).toEqual({ status: "OK", value: 4 });
    expect(r.requiredProposals).toEqual({ status: "OK", value: 10 });
    expect(r.requiredConversations).toEqual({ status: "OK", value: 20 });
  });

  it("issues one executable primary command for this week", () => {
    // Sep 27 → Oct 1 = 4 days → 1 week remaining
    expect(r.weeksRemaining).toBe(1);
    expect(r.conversationsThisWeek).toEqual({ status: "OK", value: 20 });
    expect(r.primaryCommand).toBe(
      "You need 20 additional qualified conversations this week to maintain the current revenue target.",
    );
  });

  it("rounds partial wins up", () => {
    const x = computeRevenueCommand({ ...base, avgFirstSaleRevenue: 5_000 });
    expect(x.requiredWins).toEqual({ status: "OK", value: 4 }); // 3.6 → 4
  });

  it("does not introduce floating-point phantom units", () => {
    // 3 wins at 3/5 close rate = exactly 5 proposals, not 6
    const x = computeRevenueCommand({
      ...base,
      cashTarget: 3_000 + 12_000,
      avgFirstSaleRevenue: 1_000,
      decidedProposals: 5,
      wonProposals: 3,
    });
    expect(x.requiredWins).toEqual({ status: "OK", value: 3 });
    expect(x.requiredProposals).toEqual({ status: "OK", value: 5 });
  });
});

describe("computeRevenueCommand — insufficient data never yields false precision (R2)", () => {
  it("returns INSUFFICIENT_DATA with no number when close-rate sample is too small", () => {
    const r = computeRevenueCommand({ ...base, decidedProposals: 3, wonProposals: 1 });
    expect(r.closeRate.value).toBeNull();
    expect(r.requiredWins).toEqual({ status: "OK", value: 4 });
    expect(r.requiredProposals.status).toBe("INSUFFICIENT_DATA");
    expect(r.requiredConversations.status).toBe("INSUFFICIENT_DATA");
    expect(r.conversationsThisWeek.status).toBe("INSUFFICIENT_DATA");
    expect("value" in r.requiredProposals).toBe(false);
    expect(r.primaryCommand).toMatch(/insufficient/);
    expect(r.primaryCommand).not.toMatch(/conversations this week/);
  });

  it("returns INSUFFICIENT_DATA when conversation history is too small", () => {
    const r = computeRevenueCommand({ ...base, qualifiedConversations: 4, proposalsFromConversations: 2 });
    expect(r.requiredProposals.status).toBe("OK");
    expect(r.requiredConversations.status).toBe("INSUFFICIENT_DATA");
  });

  it("returns INSUFFICIENT_DATA when average first-sale revenue is unknown", () => {
    const r = computeRevenueCommand({ ...base, avgFirstSaleRevenue: null });
    expect(r.requiredWins.status).toBe("INSUFFICIENT_DATA");
    expect(r.requiredProposals.status).toBe("INSUFFICIENT_DATA");
    expect(r.primaryCommand).toMatch(/average first-sale revenue/);
  });

  it("handles a brand-new company with zero history", () => {
    const r = computeRevenueCommand({
      ...base,
      decidedProposals: 0,
      wonProposals: 0,
      qualifiedConversations: 0,
      proposalsFromConversations: 0,
    });
    expect(r.closeRate).toMatchObject({ value: null, sufficient: false });
    expect(r.requiredProposals.status).toBe("INSUFFICIENT_DATA");
  });

  it("flags a zero conversion rate instead of dividing by zero", () => {
    const r = computeRevenueCommand({ ...base, wonProposals: 0 });
    expect(r.requiredProposals.status).toBe("ZERO_RATE");
    expect(r.primaryCommand).toMatch(/no conversions/);
  });
});

describe("computeRevenueCommand — target covered", () => {
  it("reports NOT_NEEDED when collected + contracted meets the target", () => {
    const r = computeRevenueCommand({ ...base, collectedToDate: 20_000, contractedNearTerm: 10_000 });
    expect(r.revenueGap).toBe(0);
    expect(r.targetCovered).toBe(true);
    expect(r.requiredWins.status).toBe("NOT_NEEDED");
    expect(r.requiredConversations.status).toBe("NOT_NEEDED");
    expect(r.primaryCommand).toMatch(/covered/);
  });

  it("handles cents precisely", () => {
    const r = computeRevenueCommand({ ...base, cashTarget: 100.3, collectedToDate: 100.1, contractedNearTerm: 0.2 });
    expect(r.revenueGap).toBe(0);
    expect(r.targetCovered).toBe(true);
  });
});

describe("weeksRemainingInPeriod", () => {
  it("counts the current week and never returns less than 1", () => {
    const sep = new Date(Date.UTC(2026, 8, 1));
    expect(weeksRemainingInPeriod(sep, new Date(Date.UTC(2026, 8, 1)))).toBe(5); // 30 days
    expect(weeksRemainingInPeriod(sep, new Date(Date.UTC(2026, 8, 24)))).toBe(1); // 7 days
    expect(weeksRemainingInPeriod(sep, new Date(Date.UTC(2026, 8, 23)))).toBe(2); // 8 days
    expect(weeksRemainingInPeriod(sep, new Date(Date.UTC(2026, 9, 5)))).toBe(1); // past period
  });
});

describe("computeScenarioRange (R3)", () => {
  it("labels every scenario ASSUMPTION and rounds up", () => {
    const rows = computeScenarioRange(3, [
      { label: "Conservative", closeRate: 0.2, conversationToProposalRate: 0.3 },
      { label: "Expected", closeRate: 0.6, conversationToProposalRate: 0.5 },
    ]);
    expect(rows[0]).toMatchObject({ evidenceState: "ASSUMPTION", requiredProposals: 15, requiredConversations: 50 });
    expect(rows[1]).toMatchObject({ evidenceState: "ASSUMPTION", requiredProposals: 5, requiredConversations: 10 });
  });

  it("rejects impossible rates", () => {
    expect(() => computeScenarioRange(3, [{ label: "x", closeRate: 0, conversationToProposalRate: 0.5 }])).toThrow();
    expect(() => computeScenarioRange(3, [{ label: "x", closeRate: 1.2, conversationToProposalRate: 0.5 }])).toThrow();
  });
});
