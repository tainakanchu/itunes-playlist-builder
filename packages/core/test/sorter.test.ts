import { describe, it, expect } from "vitest";
import { sortTrackIds } from "../src/sorter.js";
import type { Track, SortRule } from "../src/models.js";

function makeTracks(list: Partial<Track>[]): Map<number, Track> {
  const map = new Map<number, Track>();
  for (const t of list) {
    const track = { trackId: 0, ...t } as Track;
    map.set(track.trackId, track);
  }
  return map;
}

describe("sorter", () => {
  it("sorts by single numeric field ascending", () => {
    const tracks = makeTracks([
      { trackId: 1, bpm: 140 },
      { trackId: 2, bpm: 120 },
      { trackId: 3, bpm: 130 },
    ]);

    const result = sortTrackIds([1, 2, 3], tracks, [
      { field: "bpm", order: "asc" },
    ]);
    expect(result).toEqual([2, 3, 1]);
  });

  it("sorts descending", () => {
    const tracks = makeTracks([
      { trackId: 1, bpm: 120 },
      { trackId: 2, bpm: 140 },
      { trackId: 3, bpm: 130 },
    ]);

    const result = sortTrackIds([1, 2, 3], tracks, [
      { field: "bpm", order: "desc" },
    ]);
    expect(result).toEqual([2, 3, 1]);
  });

  it("sorts strings case-insensitively", () => {
    const tracks = makeTracks([
      { trackId: 1, artist: "Charlie" },
      { trackId: 2, artist: "alpha" },
      { trackId: 3, artist: "Beta" },
    ]);

    const result = sortTrackIds([1, 2, 3], tracks, [
      { field: "artist", order: "asc" },
    ]);
    expect(result).toEqual([2, 3, 1]);
  });

  it("puts undefined values last", () => {
    const tracks = makeTracks([
      { trackId: 1, bpm: 130 },
      { trackId: 2 },
      { trackId: 3, bpm: 120 },
    ]);

    const result = sortTrackIds([1, 2, 3], tracks, [
      { field: "bpm", order: "asc" },
    ]);
    expect(result).toEqual([3, 1, 2]);
  });

  it("multi-field sort with tiebreaker", () => {
    const tracks = makeTracks([
      { trackId: 1, bpm: 128, artist: "ZZZ" },
      { trackId: 2, bpm: 128, artist: "AAA" },
      { trackId: 3, bpm: 120, artist: "MMM" },
    ]);

    const rules: SortRule[] = [
      { field: "bpm", order: "asc" },
      { field: "artist", order: "asc" },
    ];

    const result = sortTrackIds([1, 2, 3], tracks, rules);
    expect(result).toEqual([3, 2, 1]);
  });

  it("returns input unchanged when no sort rules", () => {
    const tracks = makeTracks([
      { trackId: 3 },
      { trackId: 1 },
      { trackId: 2 },
    ]);

    const result = sortTrackIds([3, 1, 2], tracks, []);
    expect(result).toEqual([3, 1, 2]);
  });
});
