import { describe, expect, it } from "vitest";
import { moveRank, normalizeRanks } from "./priority";

const items = [
  { id: "c", rank: 7 },
  { id: "a", rank: 2 },
  { id: "b", rank: 5 },
];

describe("priority ranks", () => {
  it("normalizes to a dense 1..n sequence in order", () => {
    expect(normalizeRanks(items)).toEqual([
      { id: "a", rank: 1 },
      { id: "b", rank: 2 },
      { id: "c", rank: 3 },
    ]);
  });
  it("moves up and down", () => {
    expect(moveRank(items, "b", "up").map((x) => x.id)).toEqual(["b", "a", "c"]);
    expect(moveRank(items, "b", "down").map((x) => x.id)).toEqual(["a", "c", "b"]);
  });
  it("is a no-op at the edges", () => {
    expect(moveRank(items, "a", "up").map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(moveRank(items, "c", "down").map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});
