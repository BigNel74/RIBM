import { describe, expect, it } from "vitest";
import { assertFindingState, findingStateGap } from "./finding-state";

describe("findings cannot claim more certainty than their evidence", () => {
  it("requires verified evidence for a verified finding", () => {
    expect(() => assertFindingState("VERIFIED", ["CLIENT_PROVIDED", "ASSUMPTION"])).toThrow(/verified evidence/);
    expect(() => assertFindingState("VERIFIED", [])).toThrow();
    expect(findingStateGap("VERIFIED", ["VERIFIED"])).toBeNull();
  });

  it("requires client-provided or verified evidence for a client-provided finding", () => {
    expect(() => assertFindingState("CLIENT_PROVIDED", ["ASSUMPTION"])).toThrow(/client-provided or verified/);
    expect(findingStateGap("CLIENT_PROVIDED", ["VERIFIED"])).toBeNull();
    expect(findingStateGap("CLIENT_PROVIDED", ["CLIENT_PROVIDED"])).toBeNull();
  });

  it("allows assumptions and unverified findings without evidence", () => {
    expect(findingStateGap("ASSUMPTION", [])).toBeNull();
    expect(findingStateGap("NOT_VERIFIED", [])).toBeNull();
  });
});
