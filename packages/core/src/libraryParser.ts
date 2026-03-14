import plist from "plist";
import { readFileSync } from "node:fs";
import type { Library, Playlist, Track } from "./models.js";
import { LibraryParseError } from "./errors.js";

type PlistTrackDict = Record<string, unknown>;
type PlistPlaylistItem = { "Track ID": number };
type PlistPlaylist = {
  "Playlist ID": number;
  "Playlist Persistent ID"?: string;
  "Parent Persistent ID"?: string;
  Name?: string;
  Folder?: boolean;
  Master?: boolean;
  "Distinguished Kind"?: number;
  "Playlist Items"?: PlistPlaylistItem[];
  [key: string]: unknown;
};

const PLIST_FIELD_MAP: Record<string, keyof Track> = {
  "Track ID": "trackId",
  "Persistent ID": "persistentId",
  Name: "name",
  Artist: "artist",
  "Album Artist": "albumArtist",
  Composer: "composer",
  Album: "album",
  Genre: "genre",
  BPM: "bpm",
  Rating: "rating",
  "Play Count": "playCount",
  "Skip Count": "skipCount",
  Year: "year",
  "Track Number": "trackNumber",
  "Disc Number": "discNumber",
  "Date Added": "dateAdded",
  "Date Modified": "dateModified",
  Location: "location",
  Comments: "comments",
  Grouping: "grouping",
  Compilation: "compilation",
  Podcast: "podcast",
  Disabled: "disabled",
  Kind: "kind",
};

function normalizeTrack(raw: PlistTrackDict): Track {
  const track: Partial<Track> = {};

  for (const [plistKey, modelKey] of Object.entries(PLIST_FIELD_MAP)) {
    const value = raw[plistKey];
    if (value === undefined || value === null) continue;

    if (modelKey === "dateAdded" || modelKey === "dateModified") {
      track[modelKey] = value instanceof Date ? value : new Date(value as string);
    } else if (
      modelKey === "compilation" ||
      modelKey === "podcast" ||
      modelKey === "disabled"
    ) {
      track[modelKey] = Boolean(value);
    } else if (
      modelKey === "trackId" ||
      modelKey === "bpm" ||
      modelKey === "rating" ||
      modelKey === "playCount" ||
      modelKey === "skipCount" ||
      modelKey === "year" ||
      modelKey === "trackNumber" ||
      modelKey === "discNumber"
    ) {
      track[modelKey] = Number(value);
    } else {
      (track as Record<string, unknown>)[modelKey] = value;
    }
  }

  if (track.trackId === undefined) {
    throw new LibraryParseError("Track missing Track ID");
  }

  return track as Track;
}

function buildPlaylistFullPaths(playlists: Playlist[]): void {
  const byPersistentId = new Map<string, Playlist>();
  for (const pl of playlists) {
    if (pl.persistentId) {
      byPersistentId.set(pl.persistentId, pl);
    }
  }

  for (const pl of playlists) {
    if (pl.parentPersistentId) {
      const parent = byPersistentId.get(pl.parentPersistentId);
      if (parent) {
        pl.parentId = parent.playlistId;
      }
    }
  }

  function resolvePath(pl: Playlist, visited: Set<number>): string {
    if (pl.fullPath) return pl.fullPath;
    if (visited.has(pl.playlistId)) return pl.name;

    visited.add(pl.playlistId);

    if (pl.parentPersistentId) {
      const parent = byPersistentId.get(pl.parentPersistentId);
      if (parent) {
        const parentPath = resolvePath(parent, visited);
        pl.fullPath = `${parentPath}/${pl.name}`;
        return pl.fullPath;
      }
    }

    pl.fullPath = pl.name;
    return pl.fullPath;
  }

  for (const pl of playlists) {
    if (!pl.fullPath) {
      resolvePath(pl, new Set());
    }
  }
}

function normalizePlaylist(raw: PlistPlaylist): Playlist | null {
  // Skip master, distinguished, and special playlists
  if (raw.Master || raw["Distinguished Kind"] !== undefined) {
    return null;
  }

  const trackIds: number[] = [];
  if (raw["Playlist Items"]) {
    for (const item of raw["Playlist Items"]) {
      if (item["Track ID"] !== undefined) {
        trackIds.push(item["Track ID"]);
      }
    }
  }

  return {
    playlistId: raw["Playlist ID"],
    persistentId: raw["Playlist Persistent ID"],
    name: raw.Name ?? "",
    fullPath: "", // resolved later
    parentPersistentId: raw["Parent Persistent ID"],
    isFolder: Boolean(raw.Folder),
    isGenerated: false,
    source: "existing",
    trackIds,
  };
}

export function parseLibraryXml(xmlContent: string): Library {
  let parsed: Record<string, unknown>;
  try {
    parsed = plist.parse(xmlContent) as Record<string, unknown>;
  } catch (e) {
    throw new LibraryParseError(
      `Failed to parse plist XML: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  const rawTracks = parsed["Tracks"] as Record<string, PlistTrackDict> | undefined;
  if (!rawTracks) {
    throw new LibraryParseError("Library XML missing Tracks section");
  }

  const tracks = new Map<number, Track>();
  for (const [, rawTrack] of Object.entries(rawTracks)) {
    const track = normalizeTrack(rawTrack);
    tracks.set(track.trackId, track);
  }

  const rawPlaylists = parsed["Playlists"] as PlistPlaylist[] | undefined;
  const playlists: Playlist[] = [];
  if (rawPlaylists) {
    for (const rawPl of rawPlaylists) {
      const pl = normalizePlaylist(rawPl);
      if (pl) {
        playlists.push(pl);
      }
    }
  }

  buildPlaylistFullPaths(playlists);

  return {
    tracks,
    playlists,
    rawPlist: parsed,
  };
}

export function parseLibraryFile(filePath: string): Library {
  const content = readFileSync(filePath, "utf-8");
  return parseLibraryXml(content);
}
