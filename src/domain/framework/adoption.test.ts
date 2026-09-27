import { describe, expect, it } from "vitest";
import { assertAdoptable } from "./adoption";

describe("assertAdoptable (C-02)", () => {
  it("allows a first adoption of the active version with a statement", () => {
    expect(() => assertAdoptable({ status: "ACTIVE", adoptedAt: null }, "I adopt RS-FW-2.1.")).not.toThrow();
  });
  it("refuses a second adoption", () => {
    expect(() => assertAdoptable({ status: "ACTIVE", adoptedAt: new Date() }, "again")).toThrow(/already recorded/);
  });
  it("refuses non-active versions", () => {
    expect(() => assertAdoptable({ status: "DRAFT", adoptedAt: null }, "x")).toThrow(/active/);
  });
  it("requires a statement", () => {
    expect(() => assertAdoptable({ status: "ACTIVE", adoptedAt: null }, "  ")).toThrow(/statement/);
  });
});
