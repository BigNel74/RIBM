import { describe, expect, it } from "vitest";
import { assertEvidenceStateChange, describeEvidenceState, weakestEvidenceState } from "./evidence-state";

describe("assertEvidenceStateChange (invariant E1)", () => {
  it("rejects ASSUMPTION → VERIFIED without a verification source", () => {
    expect(() =>
      assertEvidenceStateChange({
        from: "ASSUMPTION",
        to: "VERIFIED",
        actorRole: "OPERATOR",
        reason: "Looked at the site",
      }),
    ).toThrow(/observed source/);
  });

  it("rejects ASSUMPTION → VERIFIED without a reason", () => {
    expect(() =>
      assertEvidenceStateChange({
        from: "ASSUMPTION",
        to: "VERIFIED",
        actorRole: "OPERATOR",
        verificationSource: "https://example.com/book",
      }),
    ).toThrow(/reason/);
  });

  it("rejects whitespace-only reason and source", () => {
    expect(() =>
      assertEvidenceStateChange({
        from: "NOT_VERIFIED",
        to: "VERIFIED",
        actorRole: "ADMIN",
        reason: "   ",
        verificationSource: "  ",
      }),
    ).toThrow();
  });

  it.each(["CLIENT", "CONTRACTOR", "SALES_ADVISOR"] as const)("forbids %s from changing evidence state", (role) => {
    expect(() =>
      assertEvidenceStateChange({
        from: "ASSUMPTION",
        to: "VERIFIED",
        actorRole: role,
        reason: "r",
        verificationSource: "s",
      }),
    ).toThrow(/Only an Admin or Operator/);
  });

  it("allows an explicit, sourced verification by an operator", () => {
    expect(() =>
      assertEvidenceStateChange({
        from: "ASSUMPTION",
        to: "VERIFIED",
        actorRole: "OPERATOR",
        reason: "Booking page observed with no confirmation step",
        verificationSource: "screenshot:ev_123.png",
      }),
    ).not.toThrow();
  });

  it("allows downgrading with a reason but no source", () => {
    expect(() =>
      assertEvidenceStateChange({ from: "VERIFIED", to: "ASSUMPTION", actorRole: "ADMIN", reason: "Page changed" }),
    ).not.toThrow();
  });

  it("rejects no-op changes", () => {
    expect(() =>
      assertEvidenceStateChange({ from: "ASSUMPTION", to: "ASSUMPTION", actorRole: "ADMIN", reason: "x" }),
    ).toThrow();
  });
});

describe("weakestEvidenceState", () => {
  it("returns the weakest state", () => {
    expect(weakestEvidenceState(["VERIFIED", "CLIENT_PROVIDED"])).toBe("CLIENT_PROVIDED");
    expect(weakestEvidenceState(["VERIFIED", "ASSUMPTION", "CLIENT_PROVIDED"])).toBe("ASSUMPTION");
    expect(weakestEvidenceState(["VERIFIED", "NOT_VERIFIED"])).toBe("NOT_VERIFIED");
  });

  it("treats no evidence as NOT_VERIFIED", () => {
    expect(weakestEvidenceState([])).toBe("NOT_VERIFIED");
  });
});

describe("describeEvidenceState", () => {
  it("uses the exact unknown-rule phrase", () => {
    expect(describeEvidenceState("NOT_VERIFIED")).toBe("Not verified from available evidence.");
  });
  it("labels client-provided values with their source", () => {
    expect(describeEvidenceState("CLIENT_PROVIDED", "owner interview")).toBe("Client-provided (owner interview)");
  });
});
