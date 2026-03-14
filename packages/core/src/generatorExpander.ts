import type {
  PlaylistRule,
  BpmRangeGenerator,
  RangesGenerator,
  RangeEntry,
  TagsGenerator,
  Condition,
  GeneratorEntry,
  GeneratorTemplate,
  InlineGenerator,
} from "./ruleSchema.js";
import { RuleValidationError } from "./errors.js";

function padNum(value: number, padWidth: number): string {
  return padWidth > 0 ? String(value).padStart(padWidth, "0") : String(value);
}

function expandBpmRange(gen: BpmRangeGenerator): PlaylistRule[] {
  const rules: PlaylistRule[] = [];
  const padWidth = gen.pad ?? 0;

  for (let lower = gen.from; lower < gen.to; lower += gen.step) {
    const upper = Math.min(lower + gen.step, gen.to);
    const lowerStr = padNum(lower, padWidth);
    const upperStr = padNum(upper - 1, padWidth);

    const name = `${gen.basePath}/${lowerStr}-${upperStr}`;

    const conditions: Condition[] = [
      { inPlaylist: gen.sourcePlaylist } as Condition,
      { field: "bpm" as const, gte: lower } as Condition,
      { field: "bpm" as const, lt: upper } as Condition,
    ];

    rules.push({
      name,
      match: { all: conditions },
      sort: gen.sort,
    } as PlaylistRule);
  }

  return rules;
}

function buildRangeName(range: RangeEntry, padWidth: number): string {
  if (range.name) return range.name;

  // Auto-generate name from bounds
  const parts: string[] = [];

  const lower = range.gte ?? range.gt;
  const upper = range.lt ?? range.lte;

  if (lower !== undefined && upper !== undefined) {
    const lowerStr = padNum(lower, padWidth);
    // For lt, show lt-1 as the display upper bound; for lte, show as-is
    const displayUpper = range.lt !== undefined ? range.lt - 1 : upper;
    const upperStr = padNum(displayUpper, padWidth);
    return `${lowerStr}-${upperStr}`;
  }

  if (lower !== undefined) {
    parts.push(`${padNum(lower, padWidth)}+`);
  }
  if (upper !== undefined) {
    const displayUpper = range.lt !== undefined ? range.lt - 1 : upper;
    parts.push(`-${padNum(displayUpper, padWidth)}`);
  }

  return parts.join("") || "unknown";
}

function expandRanges(gen: RangesGenerator): PlaylistRule[] {
  const rules: PlaylistRule[] = [];
  const padWidth = gen.pad ?? 0;

  for (const range of gen.ranges) {
    const rangeName = buildRangeName(range, padWidth);
    const name = `${gen.basePath}/${rangeName}`;

    const conditions: Condition[] = [{ inPlaylist: gen.sourcePlaylist } as Condition];

    if (range.gte !== undefined) {
      conditions.push({
        field: gen.field as string,
        gte: range.gte,
      } as Condition);
    }
    if (range.gt !== undefined) {
      conditions.push({
        field: gen.field as string,
        gt: range.gt,
      } as Condition);
    }
    if (range.lt !== undefined) {
      conditions.push({
        field: gen.field as string,
        lt: range.lt,
      } as Condition);
    }
    if (range.lte !== undefined) {
      conditions.push({
        field: gen.field as string,
        lte: range.lte,
      } as Condition);
    }

    rules.push({
      name,
      match: { all: conditions },
      sort: gen.sort,
    } as PlaylistRule);
  }

  return rules;
}

function expandTags(gen: TagsGenerator): PlaylistRule[] {
  const rules: PlaylistRule[] = [];

  for (const value of gen.values) {
    const name = `${gen.basePath}/${value}`;

    const conditions: Condition[] = [
      { inPlaylist: gen.sourcePlaylist } as Condition,
      { field: gen.field as string, contains: value } as Condition,
    ];

    rules.push({
      name,
      match: { all: conditions },
      sort: gen.sort,
    } as PlaylistRule);
  }

  return rules;
}

function resolveTemplateRef(
  entry: {
    template: string;
    basePath: string;
    sourcePlaylist: { source: "existing" | "generated"; name: string };
    sort?: { field: string; order: "asc" | "desc" }[];
  },
  templates: Record<string, GeneratorTemplate>,
): InlineGenerator {
  const tmpl = templates[entry.template];
  if (!tmpl) {
    throw new RuleValidationError(`Generator references unknown template "${entry.template}"`);
  }

  const sort = entry.sort ?? tmpl.sort;

  if (tmpl.type === "bpmRange") {
    return {
      type: "bpmRange",
      basePath: entry.basePath,
      sourcePlaylist: entry.sourcePlaylist,
      from: tmpl.from,
      to: tmpl.to,
      step: tmpl.step,
      pad: tmpl.pad,
      sort,
    } as BpmRangeGenerator;
  }

  if (tmpl.type === "ranges") {
    return {
      type: "ranges",
      basePath: entry.basePath,
      sourcePlaylist: entry.sourcePlaylist,
      field: tmpl.field,
      ranges: tmpl.ranges,
      pad: tmpl.pad,
      sort,
    } as RangesGenerator;
  }

  if (tmpl.type === "tags") {
    return {
      type: "tags",
      basePath: entry.basePath,
      sourcePlaylist: entry.sourcePlaylist,
      field: tmpl.field,
      values: tmpl.values,
      sort,
    } as TagsGenerator;
  }

  throw new RuleValidationError(
    `Unknown template type "${(tmpl as Record<string, unknown>).type}"`,
  );
}

function expandInline(gen: InlineGenerator): PlaylistRule[] {
  switch (gen.type) {
    case "bpmRange":
      return expandBpmRange(gen as BpmRangeGenerator);
    case "ranges":
      return expandRanges(gen as RangesGenerator);
    case "tags":
      return expandTags(gen as TagsGenerator);
  }
}

export function expandGenerators(
  generators: GeneratorEntry[],
  templates?: Record<string, GeneratorTemplate>,
): PlaylistRule[] {
  const allRules: PlaylistRule[] = [];
  const tmplMap = templates ?? {};

  for (const entry of generators) {
    if ("template" in entry) {
      const resolved = resolveTemplateRef(entry, tmplMap);
      allRules.push(...expandInline(resolved));
    } else {
      allRules.push(...expandInline(entry));
    }
  }

  return allRules;
}
