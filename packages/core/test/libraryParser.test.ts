import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseLibraryXml } from "../src/libraryParser.js";

const FIXTURE_DIR = resolve(import.meta.dirname, "fixtures");

function loadFixture(name: string): string {
  return readFileSync(resolve(FIXTURE_DIR, name), "utf-8");
}

describe("libraryParser", () => {
  const xml = loadFixture("library.minimal.xml");

  it("parses tracks correctly", () => {
    const lib = parseLibraryXml(xml);
    expect(lib.tracks.size).toBe(7);

    const track100 = lib.tracks.get(100);
    expect(track100).toBeDefined();
    expect(track100!.name).toBe("Track A");
    expect(track100!.artist).toBe("Artist 1");
    expect(track100!.genre).toBe("House");
    expect(track100!.bpm).toBe(128);
    expect(track100!.rating).toBe(100);
    expect(track100!.playCount).toBe(50);
    expect(track100!.year).toBe(2020);
    expect(track100!.trackNumber).toBe(1);
    expect(track100!.dateAdded).toBeInstanceOf(Date);
    expect(track100!.kind).toBe("MPEG audio file");
  });

  it("normalizes boolean fields", () => {
    const lib = parseLibraryXml(xml);

    const podcast = lib.tracks.get(105);
    expect(podcast!.podcast).toBe(true);

    const disabled = lib.tracks.get(106);
    expect(disabled!.disabled).toBe(true);

    const normal = lib.tracks.get(100);
    expect(normal!.podcast).toBeUndefined();
  });

  it("parses playlists", () => {
    const lib = parseLibraryXml(xml);
    expect(lib.playlists.length).toBe(4);
  });

  it("resolves playlist full paths with parent relationships", () => {
    const lib = parseLibraryXml(xml);

    const houseSet = lib.playlists.find((p) => p.name === "House Set");
    expect(houseSet).toBeDefined();
    expect(houseSet!.fullPath).toBe("DJ/House Set");

    const exclude = lib.playlists.find((p) => p.name === "Exclude");
    expect(exclude).toBeDefined();
    expect(exclude!.fullPath).toBe("DJ/Exclude");
  });

  it("identifies folder playlists", () => {
    const lib = parseLibraryXml(xml);
    const djFolder = lib.playlists.find((p) => p.name === "DJ");
    expect(djFolder).toBeDefined();
    expect(djFolder!.isFolder).toBe(true);
  });

  it("parses playlist track IDs", () => {
    const lib = parseLibraryXml(xml);
    const favorites = lib.playlists.find((p) => p.name === "My Favorites");
    expect(favorites!.trackIds).toEqual([100, 103]);
  });

  it("throws on invalid XML", () => {
    expect(() => parseLibraryXml("not xml")).toThrow("Failed to parse plist XML");
  });

  it("throws when Tracks section missing", () => {
    const noTracks = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Playlists</key>
  <array></array>
</dict>
</plist>`;
    expect(() => parseLibraryXml(noTracks)).toThrow("missing Tracks");
  });
});
