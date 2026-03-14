import { describe, it, expect } from "vitest";
import { expandGenerators } from "../src/generatorExpander.js";
import type {
  BpmRangeGenerator,
  RangesGenerator,
  TagsGenerator,
  GeneratorTemplate,
  TemplateRefGenerator,
} from "../src/ruleSchema.js";

describe("generatorExpander", () => {
  it("expands bpmRange into concrete rules", () => {
    const gen: BpmRangeGenerator = {
      type: "bpmRange",
      basePath: "BPM",
      sourcePlaylist: { source: "generated", name: "Base/All" },
      from: 120,
      to: 135,
      step: 5,
      pad: 3,
    };

    const rules = expandGenerators([gen]);
    expect(rules).toHaveLength(3);

    expect(rules[0].name).toBe("BPM/120-124");
    expect(rules[1].name).toBe("BPM/125-129");
    expect(rules[2].name).toBe("BPM/130-134");
  });

  it("uses zero-padded names", () => {
    const gen: BpmRangeGenerator = {
      type: "bpmRange",
      basePath: "BPM",
      sourcePlaylist: { source: "generated", name: "Base/All" },
      from: 80,
      to: 90,
      step: 5,
      pad: 3,
    };

    const rules = expandGenerators([gen]);
    expect(rules[0].name).toBe("BPM/080-084");
    expect(rules[1].name).toBe("BPM/085-089");
  });

  it("handles partial last bucket", () => {
    const gen: BpmRangeGenerator = {
      type: "bpmRange",
      basePath: "BPM",
      sourcePlaylist: { source: "generated", name: "Base/All" },
      from: 120,
      to: 123,
      step: 5,
      pad: 3,
    };

    const rules = expandGenerators([gen]);
    expect(rules).toHaveLength(1);
    expect(rules[0].name).toBe("BPM/120-122");
  });

  it("propagates sort rules", () => {
    const gen: BpmRangeGenerator = {
      type: "bpmRange",
      basePath: "BPM",
      sourcePlaylist: { source: "generated", name: "Base/All" },
      from: 120,
      to: 125,
      step: 5,
      pad: 0,
      sort: [{ field: "bpm", order: "asc" }],
    };

    const rules = expandGenerators([gen]);
    expect(rules[0].sort).toEqual([{ field: "bpm", order: "asc" }]);
  });

  it("without padding uses raw numbers", () => {
    const gen: BpmRangeGenerator = {
      type: "bpmRange",
      basePath: "BPM",
      sourcePlaylist: { source: "generated", name: "Base/All" },
      from: 120,
      to: 130,
      step: 5,
      pad: 0,
    };

    const rules = expandGenerators([gen]);
    expect(rules[0].name).toBe("BPM/120-124");
    expect(rules[1].name).toBe("BPM/125-129");
  });

  describe("template references", () => {
    const templates: Record<string, GeneratorTemplate> = {
      bpmBuckets: {
        type: "bpmRange",
        from: 120,
        to: 135,
        step: 5,
        pad: 3,
        sort: [{ field: "bpm", order: "asc" }],
      },
    };

    it("resolves template reference and expands", () => {
      const ref: TemplateRefGenerator = {
        template: "bpmBuckets",
        basePath: "House/BPM",
        sourcePlaylist: { source: "generated", name: "Genre/House/All" },
      };

      const rules = expandGenerators([ref], templates);
      expect(rules).toHaveLength(3);
      expect(rules[0].name).toBe("House/BPM/120-124");
      expect(rules[1].name).toBe("House/BPM/125-129");
      expect(rules[2].name).toBe("House/BPM/130-134");
    });

    it("reuses same template for multiple sources", () => {
      const refs: TemplateRefGenerator[] = [
        {
          template: "bpmBuckets",
          basePath: "House/BPM",
          sourcePlaylist: { source: "generated", name: "Genre/House/All" },
        },
        {
          template: "bpmBuckets",
          basePath: "Techno/BPM",
          sourcePlaylist: { source: "generated", name: "Genre/Techno/All" },
        },
      ];

      const rules = expandGenerators(refs, templates);
      expect(rules).toHaveLength(6); // 3 buckets x 2 genres
      expect(rules[0].name).toBe("House/BPM/120-124");
      expect(rules[3].name).toBe("Techno/BPM/120-124");
    });

    it("template sort can be overridden by ref", () => {
      const ref: TemplateRefGenerator = {
        template: "bpmBuckets",
        basePath: "Custom/BPM",
        sourcePlaylist: { source: "generated", name: "Base/All" },
        sort: [{ field: "artist", order: "desc" }],
      };

      const rules = expandGenerators([ref], templates);
      expect(rules[0].sort).toEqual([{ field: "artist", order: "desc" }]);
    });

    it("uses template sort when ref has no sort", () => {
      const ref: TemplateRefGenerator = {
        template: "bpmBuckets",
        basePath: "Custom/BPM",
        sourcePlaylist: { source: "generated", name: "Base/All" },
      };

      const rules = expandGenerators([ref], templates);
      expect(rules[0].sort).toEqual([{ field: "bpm", order: "asc" }]);
    });

    it("throws on unknown template", () => {
      const ref: TemplateRefGenerator = {
        template: "nonExistent",
        basePath: "BPM",
        sourcePlaylist: { source: "generated", name: "Base/All" },
      };

      expect(() => expandGenerators([ref], templates)).toThrow(
        'unknown template "nonExistent"'
      );
    });

    it("can mix inline and template-ref generators", () => {
      const inline: BpmRangeGenerator = {
        type: "bpmRange",
        basePath: "Inline/BPM",
        sourcePlaylist: { source: "generated", name: "Base/All" },
        from: 100,
        to: 110,
        step: 5,
        pad: 3,
      };

      const ref: TemplateRefGenerator = {
        template: "bpmBuckets",
        basePath: "Template/BPM",
        sourcePlaylist: { source: "generated", name: "Base/All" },
      };

      const rules = expandGenerators([inline, ref], templates);
      expect(rules).toHaveLength(5); // 2 inline + 3 template
      expect(rules[0].name).toBe("Inline/BPM/100-104");
      expect(rules[2].name).toBe("Template/BPM/120-124");
    });

    it("resolves ranges template reference", () => {
      const rangesTemplates: Record<string, GeneratorTemplate> = {
        djZones: {
          type: "ranges",
          field: "bpm",
          ranges: [
            { name: "House", gte: 118, lt: 138 },
            { name: "Techno", gte: 125, lt: 148 },
          ],
          pad: 0,
        },
      };

      const ref: TemplateRefGenerator = {
        template: "djZones",
        basePath: "Favorites/Zones",
        sourcePlaylist: { source: "generated", name: "Base/All" },
      };

      const rules = expandGenerators([ref], rangesTemplates);
      expect(rules).toHaveLength(2);
      expect(rules[0].name).toBe("Favorites/Zones/House");
      expect(rules[1].name).toBe("Favorites/Zones/Techno");
    });
  });

  describe("ranges generator", () => {
    it("expands named ranges", () => {
      const gen: RangesGenerator = {
        type: "ranges",
        basePath: "Zones",
        sourcePlaylist: { source: "generated", name: "Base/All" },
        field: "bpm",
        pad: 0,
        ranges: [
          { name: "Slow", gte: 70, lt: 105 },
          { name: "House", gte: 118, lt: 138 },
          { name: "Techno", gte: 125, lt: 148 },
        ],
      };

      const rules = expandGenerators([gen]);
      expect(rules).toHaveLength(3);
      expect(rules[0].name).toBe("Zones/Slow");
      expect(rules[1].name).toBe("Zones/House");
      expect(rules[2].name).toBe("Zones/Techno");
    });

    it("auto-generates name from gte/lt when name omitted", () => {
      const gen: RangesGenerator = {
        type: "ranges",
        basePath: "BPM",
        sourcePlaylist: { source: "generated", name: "Base/All" },
        field: "bpm",
        pad: 3,
        ranges: [
          { gte: 120, lt: 130 },
          { gte: 130, lt: 140 },
        ],
      };

      const rules = expandGenerators([gen]);
      expect(rules[0].name).toBe("BPM/120-129");
      expect(rules[1].name).toBe("BPM/130-139");
    });

    it("auto-generates name with padding", () => {
      const gen: RangesGenerator = {
        type: "ranges",
        basePath: "BPM",
        sourcePlaylist: { source: "generated", name: "Base/All" },
        field: "bpm",
        pad: 3,
        ranges: [{ gte: 80, lt: 100 }],
      };

      const rules = expandGenerators([gen]);
      expect(rules[0].name).toBe("BPM/080-099");
    });

    it("supports overlapping ranges", () => {
      const gen: RangesGenerator = {
        type: "ranges",
        basePath: "Tempo",
        sourcePlaylist: { source: "generated", name: "Base/All" },
        field: "bpm",
        pad: 0,
        ranges: [
          { name: "House", gte: 120, lt: 138 },
          { name: "Techno", gte: 128, lt: 145 },
        ],
      };

      const rules = expandGenerators([gen]);
      expect(rules).toHaveLength(2);
      // Both should have bpm conditions that overlap at 128-137
      expect(rules[0].name).toBe("Tempo/House");
      expect(rules[1].name).toBe("Tempo/Techno");
    });

    it("works with any numeric field (year)", () => {
      const gen: RangesGenerator = {
        type: "ranges",
        basePath: "Era",
        sourcePlaylist: { source: "generated", name: "Base/All" },
        field: "year",
        pad: 0,
        ranges: [
          { name: "90s", gte: 1990, lt: 2000 },
          { name: "00s", gte: 2000, lt: 2010 },
          { name: "2020s", gte: 2020, lt: 2030 },
        ],
      };

      const rules = expandGenerators([gen]);
      expect(rules).toHaveLength(3);
      expect(rules[0].name).toBe("Era/90s");
      expect(rules[1].name).toBe("Era/00s");
      expect(rules[2].name).toBe("Era/2020s");
    });

    it("works with rating field", () => {
      const gen: RangesGenerator = {
        type: "ranges",
        basePath: "Stars",
        sourcePlaylist: { source: "generated", name: "Base/All" },
        field: "rating",
        pad: 0,
        ranges: [
          { name: "3stars", gte: 60, lt: 80 },
          { name: "4stars", gte: 80, lt: 100 },
          { name: "5stars", gte: 100, lte: 100 },
        ],
      };

      const rules = expandGenerators([gen]);
      expect(rules).toHaveLength(3);
      expect(rules[0].name).toBe("Stars/3stars");
    });

    it("auto-name with only lower bound shows plus", () => {
      const gen: RangesGenerator = {
        type: "ranges",
        basePath: "BPM",
        sourcePlaylist: { source: "generated", name: "Base/All" },
        field: "bpm",
        pad: 3,
        ranges: [{ gte: 160 }],
      };

      const rules = expandGenerators([gen]);
      expect(rules[0].name).toBe("BPM/160+");
    });

    it("propagates sort rules", () => {
      const gen: RangesGenerator = {
        type: "ranges",
        basePath: "Zones",
        sourcePlaylist: { source: "generated", name: "Base/All" },
        field: "bpm",
        pad: 0,
        ranges: [{ name: "House", gte: 120, lt: 138 }],
        sort: [{ field: "bpm", order: "asc" }],
      };

      const rules = expandGenerators([gen]);
      expect(rules[0].sort).toEqual([{ field: "bpm", order: "asc" }]);
    });
  });

  describe("tags generator", () => {
    it("expands tag values into playlists", () => {
      const gen: TagsGenerator = {
        type: "tags",
        basePath: "Style",
        sourcePlaylist: { source: "generated", name: "Base/All" },
        field: "genre",
        values: ["House", "Techno", "DnB"],
      };

      const rules = expandGenerators([gen]);
      expect(rules).toHaveLength(3);
      expect(rules[0].name).toBe("Style/House");
      expect(rules[1].name).toBe("Style/Techno");
      expect(rules[2].name).toBe("Style/DnB");
    });

    it("uses contains condition for matching", () => {
      const gen: TagsGenerator = {
        type: "tags",
        basePath: "Style",
        sourcePlaylist: { source: "generated", name: "Base/All" },
        field: "genre",
        values: ["House"],
      };

      const rules = expandGenerators([gen]);
      // The match should have all: [inPlaylist, {field: genre, contains: "House"}]
      const match = rules[0].match as { all: Record<string, unknown>[] };
      expect(match.all).toHaveLength(2);
      expect(match.all[1]).toEqual({ field: "genre", contains: "House" });
    });

    it("propagates sort rules", () => {
      const gen: TagsGenerator = {
        type: "tags",
        basePath: "Region",
        sourcePlaylist: { source: "generated", name: "Base/All" },
        field: "genre",
        values: ["J-POP"],
        sort: [{ field: "artist", order: "asc" }],
      };

      const rules = expandGenerators([gen]);
      expect(rules[0].sort).toEqual([{ field: "artist", order: "asc" }]);
    });

    it("works as template reference", () => {
      const templates: Record<string, GeneratorTemplate> = {
        styles: {
          type: "tags",
          field: "genre",
          values: ["House", "Techno", "Trance"],
        },
      };

      const ref: TemplateRefGenerator = {
        template: "styles",
        basePath: "Genre/Styles",
        sourcePlaylist: { source: "generated", name: "Base/All" },
      };

      const rules = expandGenerators([ref], templates);
      expect(rules).toHaveLength(3);
      expect(rules[0].name).toBe("Genre/Styles/House");
      expect(rules[1].name).toBe("Genre/Styles/Techno");
      expect(rules[2].name).toBe("Genre/Styles/Trance");
    });

    it("reuses template for multiple source playlists", () => {
      const templates: Record<string, GeneratorTemplate> = {
        styles: {
          type: "tags",
          field: "genre",
          values: ["House", "DnB"],
        },
      };

      const refs: TemplateRefGenerator[] = [
        {
          template: "styles",
          basePath: "Region/J-POP/Style",
          sourcePlaylist: { source: "generated", name: "Region/J-POP" },
        },
        {
          template: "styles",
          basePath: "Region/Taiwan/Style",
          sourcePlaylist: { source: "generated", name: "Region/Taiwan" },
        },
      ];

      const rules = expandGenerators(refs, templates);
      expect(rules).toHaveLength(4);
      expect(rules[0].name).toBe("Region/J-POP/Style/House");
      expect(rules[1].name).toBe("Region/J-POP/Style/DnB");
      expect(rules[2].name).toBe("Region/Taiwan/Style/House");
      expect(rules[3].name).toBe("Region/Taiwan/Style/DnB");
    });
  });
});
