import { describe, expect, it } from "vitest";
import { assertStageChange, isOverdue, qualificationGaps, type StageChangeInput } from "./stage-rules";

const nextWeek = new Date(Date.UTC(2026, 9, 4));
const base: StageChangeInput = {
  from: "CONVERSATION",
  to: "QUALIFIED",
  authorityState: "CONFIRMED",
  demandSourceState: "MEANINGFUL",
  nextAction: "Book diagnostic call",
  nextActionDate: nextWeek,
};

describe("qualification gate (C-20)", () => {
  it("passes with known authority and a meaningful demand source", () => {
    expect(assertStageChange(base)).toEqual({ qualificationState: "QUALIFIED", qualificationOverridden: false });
  });

  it("blocks when demand source is NONE, naming the reason", () => {
    expect(() => assertStageChange({ ...base, demandSourceState: "NONE" })).toThrow(/No demand source/);
  });

  it("blocks when authority is unknown", () => {
    expect(() => assertStageChange({ ...base, authorityState: "UNKNOWN" })).toThrow(/authority is unknown/);
  });

  it("allows an explicit override and flags it for the audit log", () => {
    const r = assertStageChange({ ...base, demandSourceState: "WEAK", overrideReason: "Referral partner guarantees volume" });
    expect(r).toEqual({ qualificationState: "QUALIFIED", qualificationOverridden: true });
  });

  it("applies when skipping straight past QUALIFIED", () => {
    expect(() => assertStageChange({ ...base, from: "TARGET", to: "DIAGNOSTIC", demandSourceState: "UNKNOWN" })).toThrow(/Not qualified/);
  });

  it("does not re-apply between qualified stages", () => {
    expect(assertStageChange({ ...base, from: "QUALIFIED", to: "DIAGNOSTIC", demandSourceState: "WEAK" }).qualificationOverridden).toBe(false);
  });

  it("lists gaps", () => {
    expect(qualificationGaps({ authorityState: "UNKNOWN", demandSourceState: "UNKNOWN" })).toHaveLength(2);
  });
});

describe("proposal requires confirmed authority (04 §28)", () => {
  it("blocks PARTIAL authority even with an override", () => {
    expect(() =>
      assertStageChange({ ...base, from: "DIAGNOSTIC", to: "PROPOSAL", authorityState: "PARTIAL", overrideReason: "x" }),
    ).toThrow(/confirmed decision authority/);
  });
  it("allows CONFIRMED", () => {
    expect(() => assertStageChange({ ...base, from: "PRESCRIPTION_PENDING", to: "PROPOSAL" })).not.toThrow();
  });
});

describe("next action discipline", () => {
  it("requires a next action and date for live stages", () => {
    expect(() => assertStageChange({ ...base, nextAction: " " })).toThrow(/next action/);
    expect(() => assertStageChange({ ...base, nextActionDate: null })).toThrow(/next action/);
  });
  it("requires a date to defer", () => {
    expect(() => assertStageChange({ ...base, to: "DEFERRED", nextActionDate: null })).toThrow(/deferred with date/);
  });
  it("does not require a next action to close", () => {
    expect(() => assertStageChange({ ...base, from: "PROPOSAL", to: "LOST", nextAction: null, nextActionDate: null })).not.toThrow();
  });
});

describe("closing and reopening", () => {
  it("requires a disqualification reason", () => {
    expect(() => assertStageChange({ ...base, to: "DISQUALIFIED" })).toThrow(/requires a reason/);
    expect(assertStageChange({ ...base, to: "DISQUALIFIED", disqualificationReason: "No demand source" }).qualificationState).toBe("DISQUALIFIED");
  });
  it("treats WON as terminal", () => {
    expect(() => assertStageChange({ ...base, from: "WON", to: "PROPOSAL" })).toThrow(/closed/);
  });
  it("reopens LOST only to TARGET, with a reason, resetting qualification", () => {
    expect(() => assertStageChange({ ...base, from: "LOST", to: "CONVERSATION", reason: "r" })).toThrow(/only be reopened to Target/);
    expect(() => assertStageChange({ ...base, from: "LOST", to: "TARGET" })).toThrow(/requires a reason/);
    expect(assertStageChange({ ...base, from: "DISQUALIFIED", to: "TARGET", reason: "New demand source" }).qualificationState).toBe("UNASSESSED");
  });
  it("rejects no-op changes", () => {
    expect(() => assertStageChange({ ...base, from: "QUALIFIED", to: "QUALIFIED" })).toThrow();
  });
});

describe("isOverdue", () => {
  const now = new Date(Date.UTC(2026, 8, 27, 15));
  it("flags live opportunities with past dates only", () => {
    expect(isOverdue("CONVERSATION", new Date(Date.UTC(2026, 8, 26)), now)).toBe(true);
    expect(isOverdue("CONVERSATION", new Date(Date.UTC(2026, 8, 27)), now)).toBe(false);
    expect(isOverdue("LOST", new Date(Date.UTC(2026, 8, 1)), now)).toBe(false);
    expect(isOverdue("TARGET", null, now)).toBe(false);
  });
});
