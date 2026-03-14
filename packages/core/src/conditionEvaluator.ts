import type { Track, BuildOptions } from "./models.js";
import type { Condition, PlaylistRef } from "./ruleSchema.js";

export type PlaylistLookup = (ref: PlaylistRef) => Set<number> | undefined;

function getFieldValue(track: Track, field: string): unknown {
  return (track as Record<string, unknown>)[field];
}

function compareStrings(a: string, b: string, caseSensitive: boolean): boolean {
  if (caseSensitive) return a === b;
  return a.toLowerCase() === b.toLowerCase();
}

function stringContains(haystack: string, needle: string, caseSensitive: boolean): boolean {
  if (caseSensitive) return haystack.includes(needle);
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function evaluateFieldCondition(
  track: Track,
  condition: Record<string, unknown>,
  options: BuildOptions,
): boolean {
  const field = condition["field"] as string;
  const value = getFieldValue(track, field);

  if ("exists" in condition) {
    const shouldExist = condition["exists"] as boolean;
    const fieldExists = value !== undefined && value !== null;
    return shouldExist ? fieldExists : !fieldExists;
  }

  if ("equals" in condition) {
    const expected = condition["equals"];
    if (value === undefined || value === null) return false;
    if (typeof value === "string" && typeof expected === "string") {
      return compareStrings(value, expected, options.caseSensitiveContains);
    }
    if (value instanceof Date && expected instanceof Date) {
      return value.getTime() === expected.getTime();
    }
    return value === expected;
  }

  if ("contains" in condition) {
    const needle = condition["contains"] as string;
    if (value === undefined || value === null) return false;
    return stringContains(String(value), needle, options.caseSensitiveContains);
  }

  if ("in" in condition) {
    const list = condition["in"] as unknown[];
    if (value === undefined || value === null) return false;
    return list.some((item) => {
      if (typeof value === "string" && typeof item === "string") {
        return compareStrings(value, item, options.caseSensitiveContains);
      }
      return value === item;
    });
  }

  if ("gt" in condition) {
    if (value === undefined || value === null) return false;
    return Number(value) > Number(condition["gt"]);
  }

  if ("gte" in condition) {
    if (value === undefined || value === null) return false;
    return Number(value) >= Number(condition["gte"]);
  }

  if ("lt" in condition) {
    if (value === undefined || value === null) return false;
    return Number(value) < Number(condition["lt"]);
  }

  if ("lte" in condition) {
    if (value === undefined || value === null) return false;
    return Number(value) <= Number(condition["lte"]);
  }

  return false;
}

export function evaluateCondition(
  track: Track,
  condition: Condition,
  options: BuildOptions,
  playlistLookup: PlaylistLookup,
): boolean {
  const cond = condition as Record<string, unknown>;

  if ("all" in cond) {
    const children = cond["all"] as Condition[];
    return children.every((child) => evaluateCondition(track, child, options, playlistLookup));
  }

  if ("any" in cond) {
    const children = cond["any"] as Condition[];
    return children.some((child) => evaluateCondition(track, child, options, playlistLookup));
  }

  if ("not" in cond) {
    const inner = cond["not"] as Condition;
    return !evaluateCondition(track, inner, options, playlistLookup);
  }

  if ("inPlaylist" in cond) {
    const ref = cond["inPlaylist"] as PlaylistRef;
    const trackIds = playlistLookup(ref);
    if (!trackIds) return false;
    return trackIds.has(track.trackId);
  }

  if ("field" in cond) {
    return evaluateFieldCondition(track, cond, options);
  }

  return false;
}
