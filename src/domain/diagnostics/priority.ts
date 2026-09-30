/**
 * Priority-plan ordering. Ranks are a dense 1..n sequence; moves swap neighbours.
 * Pure so the persistence layer only applies the returned assignments.
 */
export interface Ranked {
  id: string;
  rank: number;
}

/** Re-number to 1..n preserving current order. */
export function normalizeRanks(items: readonly Ranked[]): Ranked[] {
  return [...items].sort((a, b) => a.rank - b.rank).map((it, i) => ({ id: it.id, rank: i + 1 }));
}

/** New ranks after moving `id` one place up or down. Unchanged when at the edge. */
export function moveRank(items: readonly Ranked[], id: string, direction: "up" | "down"): Ranked[] {
  const ordered = normalizeRanks(items);
  const i = ordered.findIndex((it) => it.id === id);
  if (i < 0) throw new RangeError("Priority fix not found.");
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= ordered.length) return ordered;
  const ids = ordered.map((it) => it.id);
  [ids[i], ids[j]] = [ids[j], ids[i]];
  return ids.map((x, k) => ({ id: x, rank: k + 1 }));
}
