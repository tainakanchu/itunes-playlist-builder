// Public API
export { buildLibrary, previewLibrary, evaluateLibrary } from "./builder.js";
export { parseLibraryXml, parseLibraryFile } from "./libraryParser.js";
export { parseRulesYaml, parseRulesFile } from "./ruleParser.js";
export { evaluateCondition } from "./conditionEvaluator.js";
export { PlaylistRegistry } from "./playlistRegistry.js";
export { evaluateRules } from "./ruleEvaluator.js";
export { expandGenerators } from "./generatorExpander.js";
export { sortTrackIds } from "./sorter.js";
export { buildFolderTree, countNodes } from "./folderTreeBuilder.js";
export {
  mergeGeneratedPlaylists,
  buildPlistXml,
  writePlistFile,
} from "./xmlWriter.js";
export { renderTree, renderPreview, renderPreviewJson } from "./preview.js";

// Types
export type {
  Track,
  Playlist,
  GeneratedPlaylist,
  SortRule,
  FolderNode,
  PlaylistNode,
  BuildOptions,
  BuildParams,
  BuildResult,
  PreviewResult,
  Library,
  SupportedField,
} from "./models.js";
export { SUPPORTED_FIELDS, DEFAULT_BUILD_OPTIONS } from "./models.js";

export type {
  RulesFile,
  PlaylistRule,
  Condition,
  Generator,
  GeneratorEntry,
  GeneratorTemplate,
  TemplateRefGenerator,
  BpmRangeGenerator,
  RangesGenerator,
  RangeEntry,
  TagsGenerator,
  PlaylistRef,
  SortRuleInput,
} from "./ruleSchema.js";

// Errors
export {
  LibraryParseError,
  RuleValidationError,
  PlaylistResolutionError,
  ForwardReferenceError,
  DuplicatePlaylistPathError,
  AmbiguousPlaylistReferenceError,
  XmlWriteError,
} from "./errors.js";
