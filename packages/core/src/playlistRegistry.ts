import type { Playlist, GeneratedPlaylist, BuildOptions } from "./models.js";
import type { PlaylistRef } from "./ruleSchema.js";
import {
  PlaylistResolutionError,
  AmbiguousPlaylistReferenceError,
} from "./errors.js";

export class PlaylistRegistry {
  private existingByFullPath = new Map<string, Playlist>();
  private existingByName = new Map<string, Playlist[]>();
  private generatedByPath = new Map<string, GeneratedPlaylist>();
  private generatedTrackSets = new Map<string, Set<number>>();

  constructor(
    existingPlaylists: Playlist[],
    private options: BuildOptions
  ) {
    for (const pl of existingPlaylists) {
      this.existingByFullPath.set(pl.fullPath, pl);
      const nameList = this.existingByName.get(pl.name) ?? [];
      nameList.push(pl);
      this.existingByName.set(pl.name, nameList);
    }
  }

  resolveExisting(name: string): Set<number> | undefined {
    // Try full path first
    const byPath = this.existingByFullPath.get(name);
    if (byPath) {
      return new Set(byPath.trackIds);
    }

    // Fall back to name
    const byName = this.existingByName.get(name);
    if (!byName || byName.length === 0) {
      if (this.options.failOnMissingPlaylist) {
        throw new PlaylistResolutionError(
          `Referenced existing playlist not found: "${name}"`
        );
      }
      return new Set();
    }

    if (byName.length > 1) {
      throw new AmbiguousPlaylistReferenceError(
        `Multiple existing playlists matched name "${name}"; use nested path when available`
      );
    }

    return new Set(byName[0].trackIds);
  }

  resolveGenerated(name: string): Set<number> | undefined {
    return this.generatedTrackSets.get(name);
  }

  resolve(ref: PlaylistRef): Set<number> | undefined {
    if (ref.source === "existing") {
      return this.resolveExisting(ref.name);
    }
    return this.resolveGenerated(ref.name);
  }

  registerGenerated(playlist: GeneratedPlaylist): void {
    this.generatedByPath.set(playlist.path, playlist);
    this.generatedTrackSets.set(
      playlist.path,
      new Set(playlist.trackIds)
    );
  }

  hasGenerated(path: string): boolean {
    return this.generatedByPath.has(path);
  }

  getGenerated(path: string): GeneratedPlaylist | undefined {
    return this.generatedByPath.get(path);
  }

  getAllGenerated(): GeneratedPlaylist[] {
    return Array.from(this.generatedByPath.values());
  }
}
