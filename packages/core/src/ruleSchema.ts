import { z } from "zod";
import { SUPPORTED_FIELDS } from "./models.js";

const supportedFieldEnum = z.enum(SUPPORTED_FIELDS as unknown as [string, ...string[]]);

const sortRuleSchema = z.object({
  field: supportedFieldEnum,
  order: z.enum(["asc", "desc"]),
});

const playlistRefSchema = z.object({
  source: z.enum(["existing", "generated"]),
  name: z.string(),
});

// Forward declaration for recursive condition
type ConditionInput =
  | {
      field: string;
      equals?: unknown;
      contains?: string;
      in?: unknown[];
      gt?: number;
      gte?: number;
      lt?: number;
      lte?: number;
      exists?: boolean;
    }
  | { inPlaylist: { source: "existing" | "generated"; name: string } }
  | { all: ConditionInput[] }
  | { any: ConditionInput[] }
  | { not: ConditionInput };

const fieldConditionSchema = z.object({
  field: supportedFieldEnum,
  equals: z.unknown().optional(),
  contains: z.string().optional(),
  in: z.array(z.unknown()).optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  exists: z.boolean().optional(),
});

const playlistMembershipSchema = z.object({
  inPlaylist: playlistRefSchema,
});

// Recursive condition schema using z.lazy
const conditionSchema: z.ZodType<ConditionInput> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(conditionSchema) }),
    z.object({ any: z.array(conditionSchema) }),
    z.object({ not: conditionSchema }),
    playlistMembershipSchema,
    fieldConditionSchema,
  ]),
);

const matchSchema = z.union([
  z.object({ all: z.array(conditionSchema) }),
  z.object({ any: z.array(conditionSchema) }),
  conditionSchema,
]);

const playlistRuleSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  match: matchSchema,
  sort: z.array(sortRuleSchema).optional(),
  mode: z.string().optional(),
});

// --- Range entry (for ranges generator) ---

const rangeEntrySchema = z.object({
  name: z.string().optional(),
  gte: z.number().optional(),
  gt: z.number().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
});

// --- Generator templates ---

// BPM range template: reusable BPM bucket definition (no basePath/sourcePlaylist)
const bpmRangeTemplateSchema = z.object({
  type: z.literal("bpmRange"),
  from: z.number(),
  to: z.number(),
  step: z.number(),
  pad: z.number().optional().default(0),
  sort: z.array(sortRuleSchema).optional(),
});

// Ranges template: named arbitrary ranges on any numeric field (overlaps OK)
const rangesTemplateSchema = z.object({
  type: z.literal("ranges"),
  field: supportedFieldEnum,
  ranges: z.array(rangeEntrySchema),
  pad: z.number().optional().default(0),
  sort: z.array(sortRuleSchema).optional(),
});

// Tags template: split by field contains, one playlist per tag value
const tagsTemplateSchema = z.object({
  type: z.literal("tags"),
  field: supportedFieldEnum,
  values: z.array(z.string()),
  sort: z.array(sortRuleSchema).optional(),
});

const generatorTemplateSchema = z.discriminatedUnion("type", [
  bpmRangeTemplateSchema,
  rangesTemplateSchema,
  tagsTemplateSchema,
]);

// --- Generators (inline or template-ref) ---

// Inline bpmRange
const bpmRangeGeneratorSchema = z.object({
  type: z.literal("bpmRange"),
  basePath: z.string(),
  sourcePlaylist: playlistRefSchema,
  from: z.number(),
  to: z.number(),
  step: z.number(),
  pad: z.number().optional().default(0),
  sort: z.array(sortRuleSchema).optional(),
});

// Inline ranges
const rangesGeneratorSchema = z.object({
  type: z.literal("ranges"),
  basePath: z.string(),
  sourcePlaylist: playlistRefSchema,
  field: supportedFieldEnum,
  ranges: z.array(rangeEntrySchema),
  pad: z.number().optional().default(0),
  sort: z.array(sortRuleSchema).optional(),
});

// Template-ref: references a named template, supplies basePath + sourcePlaylist
const templateRefGeneratorSchema = z.object({
  template: z.string(),
  basePath: z.string(),
  sourcePlaylist: playlistRefSchema,
  sort: z.array(sortRuleSchema).optional(),
});

// Inline tags
const tagsGeneratorSchema = z.object({
  type: z.literal("tags"),
  basePath: z.string(),
  sourcePlaylist: playlistRefSchema,
  field: supportedFieldEnum,
  values: z.array(z.string()),
  sort: z.array(sortRuleSchema).optional(),
});

const inlineGeneratorSchema = z.discriminatedUnion("type", [
  bpmRangeGeneratorSchema,
  rangesGeneratorSchema,
  tagsGeneratorSchema,
]);

// A generator entry is either inline or a template reference
const generatorEntrySchema = z.union([inlineGeneratorSchema, templateRefGeneratorSchema]);

const optionsSchema = z.object({
  removeExistingNamespace: z.boolean().optional(),
  failOnMissingPlaylist: z.boolean().optional(),
  dedupeTrackIds: z.boolean().optional(),
  caseSensitiveContains: z.boolean().optional(),
});

export const rulesFileSchema = z.object({
  namespace: z.string(),
  options: optionsSchema.optional(),
  playlists: z.array(playlistRuleSchema).optional().default([]),
  templates: z.record(z.string(), generatorTemplateSchema).optional(),
  generators: z.array(generatorEntrySchema).optional().default([]),
});

export type RulesFile = z.infer<typeof rulesFileSchema>;
export type PlaylistRule = z.infer<typeof playlistRuleSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type InlineGenerator = z.infer<typeof inlineGeneratorSchema>;
export type TemplateRefGenerator = z.infer<typeof templateRefGeneratorSchema>;
export type GeneratorEntry = z.infer<typeof generatorEntrySchema>;
export type Generator = z.infer<typeof inlineGeneratorSchema>;
export type BpmRangeGenerator = z.infer<typeof bpmRangeGeneratorSchema>;
export type RangesGenerator = z.infer<typeof rangesGeneratorSchema>;
export type RangeEntry = z.infer<typeof rangeEntrySchema>;
export type TagsGenerator = z.infer<typeof tagsGeneratorSchema>;
export type GeneratorTemplate = z.infer<typeof generatorTemplateSchema>;
export type PlaylistRef = z.infer<typeof playlistRefSchema>;
export type SortRuleInput = z.infer<typeof sortRuleSchema>;
