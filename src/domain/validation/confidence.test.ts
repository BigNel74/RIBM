import { describe, expect, it } from "vitest";
import { confidenceFor, confidenceProfile, deriveOfferValidationState, type ConfidenceEvidence } from "./confidence";

const none: ConfidenceEvidence = {
  qualifiedConversations: 0,
  repeatedPain: false,
  commercialAdvancement: false,
  paidEngagements: 0,
  paidAtTargetScopePrice: 0,
  deliveriesWithDocumentedFriction: 0,
  repeatableDeliveriesWithinCapacity: 0,
  verifiedOutcomes: 0,
  comparableVerifiedOutcomes: 0,
  retainedClients: 0,
  retainedWithExplicitOngoingJob: 0,
};

const proven: ConfidenceEvidence = {
  qualifiedConversations: 12,
  repeatedPain: true,
  commercialAdvancement: true,
  paidEngagements: 4,
  paidAtTargetScopePrice: 3,
  deliveriesWithDocumentedFriction: 1,
  repeatableDeliveriesWithinCapacity: 3,
  verifiedOutcomes: 3,
  comparableVerifiedOutcomes: 3,
  retainedClients: 2,
  retainedWithExplicitOngoingJob: 2,
};

describe("confidenceFor (04 §28 table)", () => {
  it("starts LOW everywhere with no evidence", () => {
    expect(Object.values(confidenceProfile(none))).toEqual(["LOW", "LOW", "LOW", "LOW", "LOW"]);
  });

  it("demand: 3–9 conversations with repeated pain is MEDIUM; 10+ needs commercial advancement for HIGH", () => {
    expect(confidenceFor("DEMAND", { ...none, qualifiedConversations: 3, repeatedPain: true })).toBe("MEDIUM");
    expect(confidenceFor("DEMAND", { ...none, qualifiedConversations: 9, repeatedPain: false })).toBe("LOW");
    expect(confidenceFor("DEMAND", { ...none, qualifiedConversations: 15, repeatedPain: true })).toBe("MEDIUM");
    expect(confidenceFor("DEMAND", { ...none, qualifiedConversations: 10, repeatedPain: true, commercialAdvancement: true })).toBe("HIGH");
  });

  it("willingness to pay: 1 paid is MEDIUM; HIGH needs 3 at target scope/price", () => {
    expect(confidenceFor("WILLINGNESS_TO_PAY", { ...none, paidEngagements: 1 })).toBe("MEDIUM");
    expect(confidenceFor("WILLINGNESS_TO_PAY", { ...none, paidEngagements: 5, paidAtTargetScopePrice: 2 })).toBe("MEDIUM");
    expect(confidenceFor("WILLINGNESS_TO_PAY", { ...none, paidEngagements: 3, paidAtTargetScopePrice: 3 })).toBe("HIGH");
  });

  it("recurring: one retained client is MEDIUM", () => {
    expect(confidenceFor("RECURRING_VALUE", { ...none, retainedClients: 1 })).toBe("MEDIUM");
  });
});

describe("deriveOfferValidationState (00 memo)", () => {
  it("stays TESTING when evidence is incomplete", () => {
    const r = deriveOfferValidationState(confidenceProfile(none), { positive: false, basis: null });
    expect(r.state).toBe("TESTING");
    expect(r.blockers).toHaveLength(5);
  });

  it("stays TESTING with two paid engagements even though the 01 WTP gate passes (C-11)", () => {
    const r = deriveOfferValidationState(confidenceProfile({ ...proven, paidAtTargetScopePrice: 2 }), { positive: true, basis: "b" });
    expect(r.state).toBe("TESTING");
  });

  it("stays TESTING without positive unit economics", () => {
    expect(deriveOfferValidationState(confidenceProfile(proven), { positive: true, basis: " " }).state).toBe("TESTING");
  });

  it("does not require recurring value for VALIDATED", () => {
    const r = deriveOfferValidationState(confidenceProfile({ ...proven, retainedClients: 0, retainedWithExplicitOngoingJob: 0 }), {
      positive: true,
      basis: "3 closeouts at ≥ margin floor",
    });
    expect(r).toEqual({ state: "VALIDATED", blockers: [] });
  });
});
