import { describe, expect, it } from "vitest";
import { DIAGNOSTIC_SECTIONS, DIAGNOSTIC_ZONES, OFFERS, REPORT_TEMPLATE_VERSION } from "./revenue-spine-framework";

describe("Revenue Spine framework seed", () => {
  it("has exactly five zones in doctrine order", () => {
    expect(DIAGNOSTIC_ZONES.map((z) => z.name)).toEqual([
      "Brand Clarity",
      "Digital Presence",
      "Positioning",
      "Content & Communication",
      "Systems & Infrastructure",
    ]);
  });

  it("has exactly 15 sections numbered 1–15 with unique keys", () => {
    expect(DIAGNOSTIC_SECTIONS.map((s) => s.number)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
    expect(new Set(DIAGNOSTIC_SECTIONS.map((s) => s.key)).size).toBe(15);
  });

  it("has exactly one PRIMARY offer", () => {
    expect(OFFERS.filter((o) => o.status === "PRIMARY").map((o) => o.name)).toEqual(["Revenue Spine Conversion Infrastructure"]);
  });

  it("has the 13-part MVP 1 report sequence", () => {
    expect(REPORT_TEMPLATE_VERSION.sections).toHaveLength(13);
    expect(REPORT_TEMPLATE_VERSION.sections[0]).toBe("COVER");
    expect(REPORT_TEMPLATE_VERSION.sections.at(-1)).toBe("NEXT_DECISION");
  });
});
