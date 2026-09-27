import { describe, expect, it } from "vitest";
import { assertFinalizable, qaStatusAfterEdit, type VersionPins } from "./lifecycle";

const pins: VersionPins = {
  frameworkVersionId: "fw_2_1",
  scoringVersionId: "sc_1_0",
  promptVersionId: null,
  reportTemplateVersionId: "rt_1_0",
};

describe("finalization retains historical version IDs (L4)", () => {
  it("returns exactly the pinned versions to freeze", () => {
    expect(assertFinalizable("QA_PASSED", pins, { generationUsed: false })).toEqual(pins);
  });

  it("requires the prompt version when generation was used", () => {
    expect(() => assertFinalizable("QA_PASSED", pins, { generationUsed: true })).toThrow(/prompt version/);
    expect(assertFinalizable("QA_PASSED", { ...pins, promptVersionId: "pr_1" }, { generationUsed: true }).promptVersionId).toBe("pr_1");
  });

  it("refuses to finalize without framework, scoring, and template versions", () => {
    expect(() =>
      assertFinalizable("QA_PASSED", { ...pins, scoringVersionId: null, reportTemplateVersionId: null }, { generationUsed: false }),
    ).toThrow(/scoring, report template/);
  });

  it("refuses to finalize before QA passes", () => {
    expect(() => assertFinalizable("READY_FOR_QA", pins, { generationUsed: false })).toThrow();
  });
});

describe("edits after QA (L3)", () => {
  it("reopens QA when a QA-passed diagnostic is edited", () => {
    expect(qaStatusAfterEdit("QA_PASSED")).toBe("NOT_READY");
    expect(qaStatusAfterEdit("QA_FAILED")).toBe("NOT_READY");
  });

  it("rejects edits to finalized diagnostics", () => {
    expect(() => qaStatusAfterEdit("FINALIZED")).toThrow(/superseding/);
  });
});
