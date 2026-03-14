import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseLibraryXml } from "../src/libraryParser.js";
import { parseRulesYaml } from "../src/ruleParser.js";
import { evaluateLibrary } from "../src/builder.js";
import { renderPreview } from "../src/preview.js";
import { mergeGeneratedPlaylists, buildPlistXml } from "../src/xmlWriter.js";

const FIXTURE_DIR = resolve(import.meta.dirname, "fixtures");

function loadFixture(name: string): string {
  return readFileSync(resolve(FIXTURE_DIR, name), "utf-8");
}

describe("integration", () => {
  describe("basic rules", () => {
    const xml = loadFixture("library.minimal.xml");
    const rules = loadFixture("rules.basic.yml");

    it("evaluates all rules and produces correct counts", () => {
      const library = parseLibraryXml(xml);
      const rulesFile = parseRulesYaml(rules);
      const result = evaluateLibrary(library, rulesFile);

      // Base/Favorites/4stars+ should match tracks 100 (rating=100), 101 (rating=80), 103 (rating=100), 106 (rating=80)
      // But 105 is podcast so excluded
      const fourStars = result.generated.find(
        (p) => p.path === "Base/Favorites/4stars+"
      );
      expect(fourStars).toBeDefined();
      expect(fourStars!.trackIds).toHaveLength(4);
      expect(fourStars!.trackIds).toContain(100);
      expect(fourStars!.trackIds).toContain(101);
      expect(fourStars!.trackIds).toContain(103);
      expect(fourStars!.trackIds).toContain(106);
      // Podcast (105) should NOT be in the list even though rating=100
      expect(fourStars!.trackIds).not.toContain(105);
    });

    it("Genre/House/All filters from generated 4stars+ with House genre", () => {
      const library = parseLibraryXml(xml);
      const rulesFile = parseRulesYaml(rules);
      const result = evaluateLibrary(library, rulesFile);

      const houseAll = result.generated.find(
        (p) => p.path === "Genre/House/All"
      );
      expect(houseAll).toBeDefined();
      // Track 100 (House, rating=100) and 106 (Tech House, rating=80) match
      expect(houseAll!.trackIds).toContain(100);
      expect(houseAll!.trackIds).toContain(106);
      // Track 102 (Deep House, rating=60) should NOT be in 4stars+ first
      expect(houseAll!.trackIds).not.toContain(102);
    });

    it("existing playlist reference works", () => {
      const library = parseLibraryXml(xml);
      const rulesFile = parseRulesYaml(rules);
      const result = evaluateLibrary(library, rulesFile);

      const fromFavorites = result.generated.find(
        (p) => p.path === "Existing/FromFavorites"
      );
      expect(fromFavorites).toBeDefined();
      expect(fromFavorites!.trackIds).toContain(100);
      expect(fromFavorites!.trackIds).toContain(103);
    });

    it("set operation (A minus B) works", () => {
      const library = parseLibraryXml(xml);
      const rulesFile = parseRulesYaml(rules);
      const result = evaluateLibrary(library, rulesFile);

      const houseMinusExclude = result.generated.find(
        (p) => p.path === "SetOps/HouseMinusExclude"
      );
      expect(houseMinusExclude).toBeDefined();
      // House Set has [100, 102, 104], Exclude has [104]
      // Result should be [100, 102]
      expect(houseMinusExclude!.trackIds).toContain(100);
      expect(houseMinusExclude!.trackIds).toContain(102);
      expect(houseMinusExclude!.trackIds).not.toContain(104);
    });

    it("preview renders tree correctly", () => {
      const library = parseLibraryXml(xml);
      const rulesFile = parseRulesYaml(rules);
      const { tree, playlistCount, folderCount } = evaluateLibrary(
        library,
        rulesFile
      );
      const preview = renderPreview({ tree, playlistCount, folderCount });
      expect(preview).toContain("_Generated");
      expect(preview).toContain("4stars+");
      expect(preview).toContain("House");
      expect(preview).toContain("generated playlists:");
    });
  });

  describe("generators", () => {
    const xml = loadFixture("library.minimal.xml");
    const rules = loadFixture("rules.generators.yml");

    it("expands BPM range generator into concrete playlists", () => {
      const library = parseLibraryXml(xml);
      const rulesFile = parseRulesYaml(rules);
      const result = evaluateLibrary(library, rulesFile);

      // BPM range from 120 to 140, step 5 = 4 buckets
      const bpmPlaylists = result.generated.filter((p) =>
        p.path.startsWith("BPM/")
      );
      expect(bpmPlaylists).toHaveLength(4);

      // Check bucket names
      expect(bpmPlaylists.map((p) => p.name)).toEqual([
        "120-124",
        "125-129",
        "130-134",
        "135-139",
      ]);
    });

    it("correctly distributes tracks to BPM buckets", () => {
      const library = parseLibraryXml(xml);
      const rulesFile = parseRulesYaml(rules);
      const result = evaluateLibrary(library, rulesFile);

      // Track 100: BPM=128, rating=100 -> BPM/125-129
      const bpm125 = result.generated.find((p) => p.path === "BPM/125-129");
      expect(bpm125!.trackIds).toContain(100);

      // Track 101: BPM=135, rating=80 -> BPM/135-139
      const bpm135 = result.generated.find((p) => p.path === "BPM/135-139");
      expect(bpm135!.trackIds).toContain(101);

      // Track 106: BPM=130, rating=80 -> BPM/130-134
      const bpm130 = result.generated.find((p) => p.path === "BPM/130-134");
      expect(bpm130!.trackIds).toContain(106);
    });
  });

  describe("XML merge", () => {
    it("produces valid plist XML output", () => {
      const xml = loadFixture("library.minimal.xml");
      const rules = loadFixture("rules.basic.yml");

      const library = parseLibraryXml(xml);
      const rulesFile = parseRulesYaml(rules);
      const { tree, options } = evaluateLibrary(library, rulesFile);

      const merged = mergeGeneratedPlaylists(
        library.rawPlist,
        rulesFile.namespace,
        tree,
        [],
        options.removeExistingNamespace
      );

      const outputXml = buildPlistXml(merged);
      expect(outputXml).toContain("<?xml");
      expect(outputXml).toContain("<plist");

      // Re-parse output to ensure it's valid
      const reparsed = parseLibraryXml(outputXml);
      expect(reparsed.tracks.size).toBe(7);
      // Original 4 playlists + generated folders/playlists
      expect(reparsed.playlists.length).toBeGreaterThan(4);
    });

    it("generated playlists appear with correct track IDs", () => {
      const xml = loadFixture("library.minimal.xml");
      const rules = loadFixture("rules.basic.yml");

      const library = parseLibraryXml(xml);
      const rulesFile = parseRulesYaml(rules);
      const { tree, options } = evaluateLibrary(library, rulesFile);

      const merged = mergeGeneratedPlaylists(
        library.rawPlist,
        rulesFile.namespace,
        tree,
        [],
        options.removeExistingNamespace
      );

      const reparsed = parseLibraryXml(buildPlistXml(merged));

      // Find the generated 4stars+ playlist
      const genFourStars = reparsed.playlists.find(
        (p) => p.name === "4stars+"
      );
      expect(genFourStars).toBeDefined();
      expect(genFourStars!.trackIds).toContain(100);
    });
  });

  describe("error handling", () => {
    it("throws on forward reference", () => {
      const xml = loadFixture("library.minimal.xml");
      const rulesYaml = `
namespace: "_Generated"
playlists:
  - name: "A"
    match:
      inPlaylist:
        source: generated
        name: "B"
  - name: "B"
    match:
      field: rating
      gte: 80
`;
      const library = parseLibraryXml(xml);
      const rulesFile = parseRulesYaml(rulesYaml);
      expect(() => evaluateLibrary(library, rulesFile)).toThrow(
        "references later playlist"
      );
    });

    it("throws on duplicate playlist path", () => {
      const xml = loadFixture("library.minimal.xml");
      const rulesYaml = `
namespace: "_Generated"
playlists:
  - name: "Base/A"
    match:
      field: rating
      gte: 80
  - name: "Base/A"
    match:
      field: rating
      gte: 60
`;
      const library = parseLibraryXml(xml);
      const rulesFile = parseRulesYaml(rulesYaml);
      expect(() => evaluateLibrary(library, rulesFile)).toThrow(
        "Duplicate"
      );
    });
  });
});
