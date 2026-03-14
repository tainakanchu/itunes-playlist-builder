import type { Track, SortRule } from "./models.js";

function compareValues(a: unknown, b: unknown): number {
  // undefined/null sort last
  if (a === undefined || a === null) {
    if (b === undefined || b === null) return 0;
    return 1;
  }
  if (b === undefined || b === null) return -1;

  // Date comparison
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  // Number comparison
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  // String comparison (case-insensitive)
  const strA = String(a).toLowerCase();
  const strB = String(b).toLowerCase();
  if (strA < strB) return -1;
  if (strA > strB) return 1;
  return 0;
}

export function sortTrackIds(
  trackIds: number[],
  tracks: Map<number, Track>,
  sortRules: SortRule[],
): number[] {
  if (sortRules.length === 0) return trackIds;

  const sorted = [...trackIds];

  sorted.sort((idA, idB) => {
    const trackA = tracks.get(idA);
    const trackB = tracks.get(idB);

    if (!trackA && !trackB) return 0;
    if (!trackA) return 1;
    if (!trackB) return -1;

    for (const rule of sortRules) {
      const valA = (trackA as Record<string, unknown>)[rule.field];
      const valB = (trackB as Record<string, unknown>)[rule.field];
      const cmp = compareValues(valA, valB);

      if (cmp !== 0) {
        return rule.order === "desc" ? -cmp : cmp;
      }
    }

    return 0;
  });

  return sorted;
}
