import { describe, it, expect } from "vitest";
import { evaluateCondition } from "../src/conditionEvaluator.js";
import type { Track, BuildOptions } from "../src/models.js";
import { DEFAULT_BUILD_OPTIONS } from "../src/models.js";
import type { Condition } from "../src/ruleSchema.js";

const defaultOptions: BuildOptions = { ...DEFAULT_BUILD_OPTIONS };

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    trackId: 1,
    name: "Test Track",
    artist: "Test Artist",
    genre: "House",
    bpm: 128,
    rating: 80,
    ...overrides,
  };
}

const noopLookup = () => undefined;

describe("conditionEvaluator", () => {
  describe("field comparisons", () => {
    it("equals - string match", () => {
      const cond: Condition = { field: "genre", equals: "House" } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(true);
    });

    it("equals - case insensitive by default", () => {
      const cond: Condition = { field: "genre", equals: "house" } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(true);
    });

    it("equals - number match", () => {
      const cond: Condition = { field: "bpm", equals: 128 } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(true);
    });

    it("equals - mismatch returns false", () => {
      const cond: Condition = { field: "genre", equals: "Techno" } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(false);
    });

    it("contains - substring match", () => {
      const cond: Condition = { field: "genre", contains: "ous" } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(true);
    });

    it("contains - case insensitive by default", () => {
      const cond: Condition = { field: "genre", contains: "HOUSE" } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(true);
    });

    it("contains - missing field returns false", () => {
      const cond: Condition = { field: "comments", contains: "foo" } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(false);
    });

    it("in - value in list", () => {
      const cond: Condition = { field: "genre", in: ["House", "Techno"] } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(true);
    });

    it("in - value not in list", () => {
      const cond: Condition = { field: "genre", in: ["Trance", "Ambient"] } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(false);
    });

    it("gte - greater than or equal", () => {
      const cond: Condition = { field: "rating", gte: 80 } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(true);
    });

    it("gte - less than threshold returns false", () => {
      const cond: Condition = { field: "rating", gte: 100 } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(false);
    });

    it("gt - greater than", () => {
      const cond: Condition = { field: "bpm", gt: 127 } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(true);
    });

    it("lt - less than", () => {
      const cond: Condition = { field: "bpm", lt: 130 } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(true);
    });

    it("lte - less than or equal", () => {
      const cond: Condition = { field: "bpm", lte: 128 } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(true);
    });

    it("exists - true when field present", () => {
      const cond: Condition = { field: "genre", exists: true } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(true);
    });

    it("exists - false when field missing", () => {
      const cond: Condition = { field: "comments", exists: true } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(false);
    });

    it("exists false - true when field missing", () => {
      const cond: Condition = { field: "comments", exists: false } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(true);
    });

    it("numeric on undefined returns false", () => {
      const cond: Condition = { field: "bpm", gte: 100 } as Condition;
      const track = makeTrack({ bpm: undefined });
      expect(evaluateCondition(track, cond, defaultOptions, noopLookup)).toBe(false);
    });
  });

  describe("logical conditions", () => {
    it("all - AND", () => {
      const cond: Condition = {
        all: [
          { field: "rating", gte: 80 } as Condition,
          { field: "genre", equals: "House" } as Condition,
        ],
      } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(true);
    });

    it("all - fails when one fails", () => {
      const cond: Condition = {
        all: [
          { field: "rating", gte: 80 } as Condition,
          { field: "genre", equals: "Techno" } as Condition,
        ],
      } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(false);
    });

    it("any - OR", () => {
      const cond: Condition = {
        any: [
          { field: "genre", equals: "Techno" } as Condition,
          { field: "genre", equals: "House" } as Condition,
        ],
      } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(true);
    });

    it("not - negation", () => {
      const cond: Condition = {
        not: { field: "genre", equals: "Techno" } as Condition,
      } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(true);
    });

    it("nested all/any/not", () => {
      const cond: Condition = {
        all: [
          { field: "rating", gte: 80 } as Condition,
          {
            any: [
              { field: "genre", equals: "House" } as Condition,
              { field: "genre", equals: "Techno" } as Condition,
            ],
          } as Condition,
          {
            not: { field: "podcast", equals: true } as Condition,
          } as Condition,
        ],
      } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(true);
    });
  });

  describe("playlist membership", () => {
    it("inPlaylist - track in set", () => {
      const trackSet = new Set([1, 2, 3]);
      const lookup = () => trackSet;
      const cond: Condition = {
        inPlaylist: { source: "existing" as const, name: "Test" },
      } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, lookup)).toBe(true);
    });

    it("inPlaylist - track not in set", () => {
      const trackSet = new Set([5, 6, 7]);
      const lookup = () => trackSet;
      const cond: Condition = {
        inPlaylist: { source: "existing" as const, name: "Test" },
      } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, lookup)).toBe(false);
    });

    it("inPlaylist - undefined set returns false", () => {
      const cond: Condition = {
        inPlaylist: { source: "generated" as const, name: "Missing" },
      } as Condition;
      expect(evaluateCondition(makeTrack(), cond, defaultOptions, noopLookup)).toBe(false);
    });
  });
});
