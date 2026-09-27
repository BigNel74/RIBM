import { describe, expect, it } from "vitest";
import { computeLeakExposure, DEFAULT_WEEKS_PER_MONTH, EXPOSURE_LABEL } from "./exposure";

describe("computeLeakExposure (invariant R5)", () => {
  it("applies the doctrine formula ACV × missed/week × 4", () => {
    const r = computeLeakExposure({
      averageClientValue: { value: 850, state: "CLIENT_PROVIDED" },
      missedBookingsPerWeek: { value: 3, state: "ASSUMPTION" },
      weeksPerMonth: DEFAULT_WEEKS_PER_MONTH,
    });
    expect(r).toEqual({
      computed: true,
      label: EXPOSURE_LABEL,
      estimatedMonthlyExposure: 10_200,
      resultState: "ASSUMPTION",
      isScenario: true,
    });
  });

  it("labels the result with the weakest input state", () => {
    const r = computeLeakExposure({
      averageClientValue: { value: 1_200, state: "VERIFIED" },
      missedBookingsPerWeek: { value: 2, state: "CLIENT_PROVIDED" },
      weeksPerMonth: { value: 4.33, state: "VERIFIED" },
    });
    expect(r.computed && r.resultState).toBe("CLIENT_PROVIDED");
    expect(r.computed && r.isScenario).toBe(false);
    expect(r.computed && r.estimatedMonthlyExposure).toBe(10_392);
  });

  it("refuses to compute from NOT_VERIFIED inputs", () => {
    const r = computeLeakExposure({
      averageClientValue: { value: 850, state: "NOT_VERIFIED" },
      missedBookingsPerWeek: { value: 3, state: "ASSUMPTION" },
      weeksPerMonth: DEFAULT_WEEKS_PER_MONTH,
    });
    expect(r).toEqual({ computed: false, label: EXPOSURE_LABEL, resultState: "NOT_VERIFIED", missing: ["averageClientValue"] });
  });

  it("refuses to compute with missing values", () => {
    const r = computeLeakExposure({
      averageClientValue: { value: null, state: "CLIENT_PROVIDED" },
      missedBookingsPerWeek: { value: null, state: "ASSUMPTION" },
      weeksPerMonth: DEFAULT_WEEKS_PER_MONTH,
    });
    expect(r.computed).toBe(false);
    expect(!r.computed && r.missing).toEqual(["averageClientValue", "missedBookingsPerWeek"]);
  });

  it("rejects negative inputs", () => {
    expect(() =>
      computeLeakExposure({
        averageClientValue: { value: -1, state: "VERIFIED" },
        missedBookingsPerWeek: { value: 1, state: "VERIFIED" },
        weeksPerMonth: DEFAULT_WEEKS_PER_MONTH,
      }),
    ).toThrow(RangeError);
  });

  it("never uses the phrase 'lost'", () => {
    expect(EXPOSURE_LABEL.toLowerCase()).not.toContain("lost");
  });
});
