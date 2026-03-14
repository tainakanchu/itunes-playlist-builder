import type { PlaylistRule, Generator, BpmRangeGenerator, Condition } from "./ruleSchema.js";

function expandBpmRange(gen: BpmRangeGenerator): PlaylistRule[] {
  const rules: PlaylistRule[] = [];
  const padWidth = gen.pad ?? 0;

  for (let lower = gen.from; lower < gen.to; lower += gen.step) {
    const upper = Math.min(lower + gen.step, gen.to);
    const lowerStr = padWidth > 0 ? String(lower).padStart(padWidth, "0") : String(lower);
    const upperStr =
      padWidth > 0
        ? String(upper - 1).padStart(padWidth, "0")
        : String(upper - 1);

    const name = `${gen.basePath}/${lowerStr}-${upperStr}`;

    const conditions: Condition[] = [
      {
        inPlaylist: gen.sourcePlaylist,
      } as Condition,
      {
        field: "bpm" as const,
        gte: lower,
      } as Condition,
      {
        field: "bpm" as const,
        lt: upper,
      } as Condition,
    ];

    const rule = {
      name,
      match: {
        all: conditions,
      },
      sort: gen.sort,
    } as PlaylistRule;

    rules.push(rule);
  }

  return rules;
}

export function expandGenerators(generators: Generator[]): PlaylistRule[] {
  const allRules: PlaylistRule[] = [];

  for (const gen of generators) {
    switch (gen.type) {
      case "bpmRange":
        allRules.push(...expandBpmRange(gen as BpmRangeGenerator));
        break;
    }
  }

  return allRules;
}
