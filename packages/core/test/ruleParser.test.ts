import { describe, it, expect } from "vitest";
import { parseRulesYaml } from "../src/ruleParser.js";

describe("ruleParser", () => {
  it("parses a basic rules file", () => {
    const yaml = `
namespace: "_Generated"
options:
  removeExistingNamespace: true
  failOnMissingPlaylist: true
playlists:
  - name: "Base/Favorites"
    match:
      all:
        - field: rating
          gte: 80
`;
    const result = parseRulesYaml(yaml);
    expect(result.namespace).toBe("_Generated");
    expect(result.playlists).toHaveLength(1);
    expect(result.playlists[0].name).toBe("Base/Favorites");
  });

  it("parses generators", () => {
    const yaml = `
namespace: "_Generated"
generators:
  - type: bpmRange
    basePath: "BPM"
    sourcePlaylist:
      source: generated
      name: "Base/All"
    from: 120
    to: 140
    step: 5
    pad: 3
`;
    const result = parseRulesYaml(yaml);
    expect(result.generators).toHaveLength(1);
    expect(result.generators[0].type).toBe("bpmRange");
  });

  it("throws on invalid YAML", () => {
    expect(() => parseRulesYaml("{{invalid")).toThrow("Failed to parse YAML");
  });

  it("throws on missing namespace", () => {
    const yaml = `
playlists:
  - name: "Test"
    match:
      field: rating
      gte: 80
`;
    expect(() => parseRulesYaml(yaml)).toThrow("Rule validation");
  });

  it("throws on unknown field", () => {
    const yaml = `
namespace: "_Generated"
playlists:
  - name: "Test"
    match:
      field: unknownField
      gte: 80
`;
    expect(() => parseRulesYaml(yaml)).toThrow("Rule validation");
  });

  it("parses complex nested conditions", () => {
    const yaml = `
namespace: "_Generated"
playlists:
  - name: "Complex"
    match:
      all:
        - field: rating
          gte: 80
        - any:
            - field: genre
              equals: "House"
            - field: genre
              equals: "Techno"
        - not:
            field: podcast
            equals: true
`;
    const result = parseRulesYaml(yaml);
    expect(result.playlists).toHaveLength(1);
  });

  it("parses sort rules", () => {
    const yaml = `
namespace: "_Generated"
playlists:
  - name: "Sorted"
    match:
      field: rating
      gte: 80
    sort:
      - field: bpm
        order: asc
      - field: artist
        order: desc
`;
    const result = parseRulesYaml(yaml);
    expect(result.playlists[0].sort).toHaveLength(2);
    expect(result.playlists[0].sort![0]).toEqual({
      field: "bpm",
      order: "asc",
    });
  });
});
