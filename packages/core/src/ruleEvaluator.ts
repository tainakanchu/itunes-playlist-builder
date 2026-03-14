import type { Track, GeneratedPlaylist, BuildOptions, SortRule } from "./models.js";
import type { PlaylistRule, Condition } from "./ruleSchema.js";
import { evaluateCondition } from "./conditionEvaluator.js";
import { PlaylistRegistry } from "./playlistRegistry.js";
import { sortTrackIds } from "./sorter.js";
import {
  ForwardReferenceError,
  DuplicatePlaylistPathError,
} from "./errors.js";

export function evaluateRules(
  rules: PlaylistRule[],
  namespace: string,
  tracks: Map<number, Track>,
  registry: PlaylistRegistry,
  options: BuildOptions
): GeneratedPlaylist[] {
  const generated: GeneratedPlaylist[] = [];
  const seenPaths = new Set<string>();

  for (const rule of rules) {
    const path = rule.name;
    const fullPath = `${namespace}/${path}`;

    // Check duplicate paths
    if (seenPaths.has(path)) {
      throw new DuplicatePlaylistPathError(
        `Duplicate generated playlist path: "${path}"`
      );
    }
    seenPaths.add(path);

    // Check for forward references
    validateNoForwardReferences(rule.match as Condition, path, registry);

    // Evaluate conditions against all tracks
    let matchedTrackIds: number[] = [];

    for (const [trackId, track] of tracks) {
      const matches = evaluateCondition(
        track,
        rule.match as Condition,
        options,
        (ref) => registry.resolve(ref)
      );
      if (matches) {
        matchedTrackIds.push(trackId);
      }
    }

    // Dedupe
    if (options.dedupeTrackIds) {
      matchedTrackIds = [...new Set(matchedTrackIds)];
    }

    // Sort
    const sortRules: SortRule[] = (rule.sort ?? []).map((s) => ({
      field: s.field as SortRule["field"],
      order: s.order,
    }));

    if (sortRules.length > 0) {
      matchedTrackIds = sortTrackIds(matchedTrackIds, tracks, sortRules);
    }

    const playlist: GeneratedPlaylist = {
      name: path.split("/").pop()!,
      path,
      fullPath,
      parentPath: path.includes("/")
        ? path.split("/").slice(0, -1).join("/")
        : undefined,
      trackIds: matchedTrackIds,
      sort: sortRules.length > 0 ? sortRules : undefined,
      ruleKey: path,
    };

    generated.push(playlist);
    registry.registerGenerated(playlist);
  }

  return generated;
}

function validateNoForwardReferences(
  condition: Condition,
  currentPath: string,
  registry: PlaylistRegistry
): void {
  const cond = condition as Record<string, unknown>;

  if ("all" in cond) {
    for (const child of cond["all"] as Condition[]) {
      validateNoForwardReferences(child, currentPath, registry);
    }
    return;
  }

  if ("any" in cond) {
    for (const child of cond["any"] as Condition[]) {
      validateNoForwardReferences(child, currentPath, registry);
    }
    return;
  }

  if ("not" in cond) {
    validateNoForwardReferences(cond["not"] as Condition, currentPath, registry);
    return;
  }

  if ("inPlaylist" in cond) {
    const ref = cond["inPlaylist"] as { source: string; name: string };
    if (ref.source === "generated" && !registry.hasGenerated(ref.name)) {
      throw new ForwardReferenceError(
        `Generated playlist "${currentPath}" references later playlist "${ref.name}"`
      );
    }
  }
}
