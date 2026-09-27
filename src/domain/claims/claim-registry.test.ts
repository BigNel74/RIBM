import { describe, expect, it } from "vitest";
import {
  assertClaimVerifiable,
  claimVerificationGaps,
  detectQuantitative,
  effectiveClaimStatus,
  isPublishable,
  resolveIsQuantitative,
  type ClaimForVerification,
} from "./claim-registry";

const now = new Date(Date.UTC(2026, 8, 27));

// The exact unverified claims named in 02 §4 and §14.
const websiteClaim: ClaimForVerification = {
  statement: "3x avg booking increase",
  claimType: "AVERAGE",
  isQuantitative: false,
  evidenceStates: [],
};

describe("detectQuantitative", () => {
  it.each(["3x avg booking increase", "65%+ gross margin delivered", "$8K new revenue", "Live in 14 days", "×3 bookings"])(
    "flags %s",
    (s) => expect(detectQuantitative(s)).toBe(true),
  );
  it("does not flag purely qualitative statements", () => {
    expect(detectQuantitative("We diagnose where revenue gets stuck.")).toBe(false);
  });
  it("does not let an operator un-flag a detected quantitative claim", () => {
    expect(resolveIsQuantitative("65% margin", false)).toBe(true);
  });
});

describe("unsupported quantitative claims cannot be VERIFIED (C1)", () => {
  it("blocks the current website claim with no records", () => {
    expect(() => assertClaimVerifiable(websiteClaim, "ADMIN", now)).toThrow(/evidence/);
    const codes = claimVerificationGaps(websiteClaim, now).map((g) => g.code);
    expect(codes).toEqual([
      "CLAIM_EVIDENCE_REQUIRED",
      "CLAIM_TIME_WINDOW_REQUIRED",
      "CLAIM_CALCULATION_REQUIRED",
      "CLAIM_COHORT_REQUIRED",
    ]);
  });

  it("blocks when any linked evidence is only client-provided or assumed", () => {
    const codes = claimVerificationGaps(
      { ...websiteClaim, evidenceStates: ["VERIFIED", "CLIENT_PROVIDED"], timeWindow: "Q3 2026", calculationMethod: "m", cohortDefinition: "c" },
      now,
    ).map((g) => g.code);
    expect(codes).toEqual(["CLAIM_EVIDENCE_NOT_VERIFIED"]);
  });

  it("requires a cohort for any percentage, whatever the claim type", () => {
    const codes = claimVerificationGaps(
      { statement: "65%+ gross margin delivered", claimType: "MARGIN", isQuantitative: true, evidenceStates: ["VERIFIED"], timeWindow: "2026", calculationMethod: "m" },
      now,
    ).map((g) => g.code);
    expect(codes).toEqual(["CLAIM_COHORT_REQUIRED"]);
  });

  it("only an ADMIN can approve", () => {
    const ok: ClaimForVerification = {
      ...websiteClaim,
      evidenceStates: ["VERIFIED", "VERIFIED", "VERIFIED"],
      timeWindow: "Jun–Sep 2026",
      calculationMethod: "post-install bookings / baseline bookings, 30-day windows",
      cohortDefinition: "All installs live ≥30 days, n=3",
    };
    expect(() => assertClaimVerifiable(ok, "OPERATOR", now)).toThrow(/Only an Admin/);
    expect(() => assertClaimVerifiable(ok, "ADMIN", now)).not.toThrow();
  });

  it("allows a qualitative testimonial with one client-provided record", () => {
    expect(
      claimVerificationGaps(
        { statement: "They found the leak we missed.", claimType: "TESTIMONIAL", isQuantitative: false, evidenceStates: ["CLIENT_PROVIDED"], timeWindow: "Sep 2026" },
        now,
      ),
    ).toEqual([]);
  });
});

describe("expiry (C2)", () => {
  const past = new Date(Date.UTC(2026, 7, 1));
  const future = new Date(Date.UTC(2027, 0, 1));
  it("treats a verified claim past its review date as EXPIRED", () => {
    expect(effectiveClaimStatus("VERIFIED", past, now)).toBe("EXPIRED");
    expect(isPublishable("VERIFIED", past, now)).toBe(false);
  });
  it("keeps a current verified claim publishable", () => {
    expect(isPublishable("VERIFIED", future, now)).toBe(true);
    expect(isPublishable("DRAFT", future, now)).toBe(false);
  });
});
