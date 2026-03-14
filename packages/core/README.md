# @tainakanchu/itunes-playlist-builder-core

Core library for iTunes Playlist Builder. Parses iTunes Library.xml, evaluates declarative playlist rules, and generates output XML compatible with DJ software (rekordbox, Serato, Traktor, etc.).

## Install

```bash
npm install @tainakanchu/itunes-playlist-builder-core
```

## Usage

```typescript
import {
  parseLibraryFile,
  parseRulesFile,
  buildLibrary,
  previewLibrary,
} from "@tainakanchu/itunes-playlist-builder-core";

// Parse inputs
const library = await parseLibraryFile("iTunes Library.xml");
const rules = await parseRulesFile("rules.yml");

// Preview
const preview = previewLibrary({ library, rules });
console.log(preview.tree);

// Build
const result = buildLibrary({ library, rules });
// result.xml contains the generated XML string
```

## API

### Parsing

- `parseLibraryFile(path)` / `parseLibraryXml(xml)` — Parse iTunes Library.xml
- `parseRulesFile(path)` / `parseRulesYaml(yaml)` — Parse rules YAML

### Building

- `buildLibrary(params)` — Evaluate rules and produce output XML
- `previewLibrary(params)` — Evaluate rules and return a tree preview
- `evaluateLibrary(params)` — Evaluate rules without XML generation

### Evaluation

- `evaluateCondition(track, condition, context)` — Test a single condition against a track
- `evaluateRules(library, rules)` — Evaluate all rules and generators
- `expandGenerators(generators, context)` — Expand generator templates

### Output

- `mergeGeneratedPlaylists(library, playlists, options)` — Merge generated playlists into library
- `buildPlistXml(library)` / `writePlistFile(library, path)` — Serialize to XML

### Preview

- `renderTree(nodes)` — Render folder tree as string
- `renderPreview(result)` / `renderPreviewJson(result)` — Format preview output

## Rules Schema

A JSON Schema is included for editor validation:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/tainakanchu/itunes-playlist-builder/master/packages/core/rules.schema.json
```

## License

MIT
