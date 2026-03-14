import { readFileSync } from "node:fs";
import type { BuildParams, BuildResult, BuildOptions, PreviewResult, Library } from "./models.js";
import { DEFAULT_BUILD_OPTIONS } from "./models.js";
import { parseLibraryXml } from "./libraryParser.js";
import { parseRulesYaml } from "./ruleParser.js";
import type { RulesFile, PlaylistRule } from "./ruleSchema.js";
import { PlaylistRegistry } from "./playlistRegistry.js";
import { evaluateRules } from "./ruleEvaluator.js";
import { expandGenerators } from "./generatorExpander.js";
import { buildFolderTree, countNodes } from "./folderTreeBuilder.js";
import { mergeGeneratedPlaylists, writePlistFile } from "./xmlWriter.js";

function resolveOptions(rulesFile: RulesFile): BuildOptions {
  return {
    ...DEFAULT_BUILD_OPTIONS,
    ...rulesFile.options,
  };
}

function buildConcreteRules(rulesFile: RulesFile): PlaylistRule[] {
  const concreteRules = [...rulesFile.playlists];
  const generatorRules = expandGenerators(rulesFile.generators, rulesFile.templates);
  return [...concreteRules, ...generatorRules];
}

export function evaluateLibrary(library: Library, rulesFile: RulesFile) {
  const options = resolveOptions(rulesFile);
  const allRules = buildConcreteRules(rulesFile);
  const registry = new PlaylistRegistry(library.playlists, options);
  const generated = evaluateRules(allRules, rulesFile.namespace, library.tracks, registry, options);
  const tree = buildFolderTree(rulesFile.namespace, generated);
  const { folderCount, playlistCount } = countNodes(tree);

  return { generated, tree, folderCount, playlistCount, options };
}

export async function buildLibrary(params: BuildParams): Promise<BuildResult> {
  const xmlContent = readFileSync(params.inputXmlPath, "utf-8");
  const rulesContent = readFileSync(params.rulesPath, "utf-8");

  const library = parseLibraryXml(xmlContent);
  const rulesFile = parseRulesYaml(rulesContent);

  const { tree, folderCount, playlistCount, options } = evaluateLibrary(library, rulesFile);

  const mergedPlist = mergeGeneratedPlaylists(
    library.rawPlist,
    rulesFile.namespace,
    tree,
    [],
    options.removeExistingNamespace,
  );

  writePlistFile(params.outputXmlPath, mergedPlist);

  return {
    generatedPlaylistCount: playlistCount,
    generatedFolderCount: folderCount,
    outputXmlPath: params.outputXmlPath,
  };
}

export async function previewLibrary(params: {
  inputXmlPath: string;
  rulesPath: string;
}): Promise<PreviewResult> {
  const xmlContent = readFileSync(params.inputXmlPath, "utf-8");
  const rulesContent = readFileSync(params.rulesPath, "utf-8");

  const library = parseLibraryXml(xmlContent);
  const rulesFile = parseRulesYaml(rulesContent);

  const { tree, folderCount, playlistCount } = evaluateLibrary(library, rulesFile);

  return {
    tree,
    playlistCount,
    folderCount,
  };
}
