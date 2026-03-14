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
  | { field: string; equals?: unknown; contains?: string; in?: unknown[]; gt?: number; gte?: number; lt?: number; lte?: number; exists?: boolean }
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
  ])
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

const generatorSchema = z.discriminatedUnion("type", [bpmRangeGeneratorSchema]);

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
  generators: z.array(generatorSchema).optional().default([]),
});

export type RulesFile = z.infer<typeof rulesFileSchema>;
export type PlaylistRule = z.infer<typeof playlistRuleSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type Generator = z.infer<typeof generatorSchema>;
export type BpmRangeGenerator = z.infer<typeof bpmRangeGeneratorSchema>;
export type PlaylistRef = z.infer<typeof playlistRefSchema>;
export type SortRuleInput = z.infer<typeof sortRuleSchema>;
