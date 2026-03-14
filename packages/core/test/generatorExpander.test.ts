import { describe, it, expect } from "vitest";
import { expandGenerators } from "../src/generatorExpander.js";
import type { BpmRangeGenerator } from "../src/ruleSchema.js";

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
});
