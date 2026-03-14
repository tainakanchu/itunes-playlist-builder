# iTunes Library Playlist Builder

Implementation Specification for Claude Code
Version: 0.3

---

## 1. Purpose

Implement a cross-platform CLI tool that:

1. Reads an existing `iTunes Library.xml`
2. Evaluates declarative playlist rules
3. Generates static playlists and folder hierarchy
4. Appends the generated playlists to the existing library structure
5. Writes a new XML file
6. Exposes reusable core logic for a future GUI

This tool is intended to offload expensive smart-playlist-like logic from iTunes / Music.app into an external build step, while preserving compatibility with DJ software that can read `iTunes Library.xml`.

The tool must work on **Windows/macOS/Linux** and **must not access any Apple internal database**.

All input/output must be based on exported `iTunes Library.xml`.

---

## 2. Product Concept

This tool is a **playlist build system**.

```text
source library.xml
+ rules.yml
→ build
→ generated library.generated.xml
```

Responsibilities are split as follows.

### iTunes / Music.app side

* master track library
* metadata editing
* ratings
* manual playlists
* optional minimal first-stage smart playlists if desired

### this tool

* evaluate smart-playlist-like conditions
* resolve playlist dependencies
* build nested folder playlists
* output static playlists for DJ software

---

## 3. Architecture

Use **TypeScript** with **Node.js >= 20**.

Project structure:

```text
packages/
  core/
  cli/
```

Future GUI is out of scope for now, but core must be reusable.

```text
future:
packages/
  core/
  cli/
  gui/
```

### core

Contains all business logic.

### cli

Thin wrapper around core.

---

## 4. Recommended Dependencies

Use these unless there is a compelling reason not to.

### runtime

* `plist`
* `commander`
* `yaml`
* `fs-extra`
* `zod`

### dev

* `typescript`
* `vitest`
* `tsx`
* `@types/node`

Reasoning:

* `plist` because `iTunes Library.xml` is a plist XML, not generic arbitrary XML
* `zod` for validating rules and internal normalization
* `vitest` for fast unit tests

---

## 5. Deliverables

Claude Code should produce:

* TypeScript monorepo or workspace project
* reusable core package
* CLI package
* tests
* README
* sample rules file
* sample config comments
* robust error messages

---

## 6. Core Modules

Implement the following modules in `packages/core/src/`.

```text
models.ts
libraryParser.ts
ruleSchema.ts
ruleParser.ts
conditionEvaluator.ts
playlistRegistry.ts
ruleEvaluator.ts
generatorExpander.ts
sorter.ts
folderTreeBuilder.ts
xmlWriter.ts
builder.ts
preview.ts
errors.ts
```

Recommended responsibilities:

### models.ts

Shared types.

### libraryParser.ts

Parse `iTunes Library.xml` into internal models.

### ruleSchema.ts

Zod schemas for YAML rule file.

### ruleParser.ts

Load YAML and normalize into internal rule model.

### conditionEvaluator.ts

Evaluate conditions on a single track.

### playlistRegistry.ts

Resolve existing and generated playlists by path/name.

### ruleEvaluator.ts

Evaluate playlist rules in order.

### generatorExpander.ts

Expand declarative generators such as BPM ranges into concrete playlist rules.

### sorter.ts

Sort track IDs according to sort rules.

### folderTreeBuilder.ts

Build folder hierarchy nodes from generated playlist paths.

### xmlWriter.ts

Merge generated folder/playlists into plist object and serialize.

### builder.ts

Top-level orchestration.

### preview.ts

Render tree and summary for CLI preview.

### errors.ts

Domain-specific error classes.

---

## 7. Data Model

### 7.1 Track

```ts
export type Track = {
  trackId: number
  persistentId?: string
  name?: string
  artist?: string
  albumArtist?: string
  composer?: string
  album?: string
  genre?: string
  bpm?: number
  rating?: number
  playCount?: number
  skipCount?: number
  year?: number
  trackNumber?: number
  discNumber?: number
  dateAdded?: Date
  dateModified?: Date
  location?: string
  comments?: string
  grouping?: string
  compilation?: boolean
  podcast?: boolean
  disabled?: boolean
  kind?: string
}
```

### 7.2 Playlist

```ts
export type Playlist = {
  playlistId: number
  persistentId?: string
  name: string
  fullPath: string
  parentId?: number
  isFolder: boolean
  isGenerated: boolean
  source: "existing" | "generated"
  trackIds: number[]
}
```

### 7.3 GeneratedPlaylist

```ts
export type GeneratedPlaylist = {
  playlistId?: number
  name: string
  path: string            // relative path without namespace prefix
  fullPath: string        // namespace + path
  parentPath?: string
  trackIds: number[]
  sort?: SortRule[]
  ruleKey: string
}
```

### 7.4 FolderNode

```ts
export type FolderNode = {
  type: "folder"
  name: string
  fullPath: string
  parentPath?: string
  children: Array<FolderNode | PlaylistNode>
}
```

### 7.5 PlaylistNode

```ts
export type PlaylistNode = {
  type: "playlist"
  name: string
  fullPath: string
  parentPath?: string
  trackIds: number[]
}
```

---

## 8. Input Files

### 8.1 Library XML

Input is an exported `iTunes Library.xml`.

The real sample XML will be provided separately.

The code must not hardcode assumptions beyond what is needed for standard plist-based iTunes library exports.

### 8.2 Rules YAML

Rules are declared in YAML.

---

## 9. Parsing Strategy

Use `plist.parse()` to parse the library XML into a JS object.

Expected top-level keys include:

* `Tracks`
* `Playlists`

### 9.1 Tracks

Tracks are keyed by track ID string in plist. Normalize to numeric `trackId`.

### 9.2 Playlists

Normalize playlists into internal `Playlist` records.

Need to capture:

* playlist id
* name
* folder flag
* parent persistent/ID relation if available
* playlist item track ids

### 9.3 Existing playlist full path resolution

Existing playlists may already be nested. Build their `fullPath` by resolving parent relationships.

If parent relationships are missing or ambiguous, fall back to flat name as full path.

---

## 10. Rule File Format

Rules file root:

```yaml
namespace: "_Generated"

options:
  removeExistingNamespace: true
  failOnMissingPlaylist: true
  dedupeTrackIds: true
  caseSensitiveContains: false

playlists:
  - name: "Base/Favorites/4stars+"
    match:
      all:
        - field: rating
          gte: 80

generators:
  - type: bpmRange
    basePath: "BPM"
    sourcePlaylist:
      source: generated
      name: "Base/Favorites/4stars+"
    from: 80
    to: 180
    step: 5
    pad: 3
```

---

## 11. Rule Root Schema

### namespace

Required string. All generated folders/playlists are placed under this root folder.

Example:

```yaml
namespace: "_Generated"
```

### options

Optional behavior flags.

### playlists

Concrete playlist rules.

### generators

Optional higher-level generators that expand into concrete playlist rules before evaluation.

---

## 12. Options

```ts
type BuildOptionsYaml = {
  removeExistingNamespace?: boolean
  failOnMissingPlaylist?: boolean
  dedupeTrackIds?: boolean
  caseSensitiveContains?: boolean
}
```

Default values:

```ts
{
  removeExistingNamespace: true,
  failOnMissingPlaylist: true,
  dedupeTrackIds: true,
  caseSensitiveContains: false
}
```

Meaning:

* `removeExistingNamespace`: remove previously generated namespace subtree before appending fresh generated playlists
* `failOnMissingPlaylist`: error when referenced playlist is not found
* `dedupeTrackIds`: ensure playlist items are unique
* `caseSensitiveContains`: default behavior of string `contains`

---

## 13. Playlist Rule Format

Example:

```yaml
- name: "Genre/House/Favorites/120-124"
  description: "Favorite house tracks with BPM 120-124"
  match:
    all:
      - inPlaylist:
          source: generated
          name: "Genre/House/Favorites"
      - field: bpm
        gte: 120
      - field: bpm
        lt: 125
  sort:
    - field: bpm
      order: asc
    - field: artist
      order: asc
    - field: name
      order: asc
```

Fields:

### name

Required relative path under namespace. Slash-separated path.

### description

Optional. Internal metadata only; no need to persist unless easy.

### match

Required condition tree.

### sort

Optional sort rules for track order in output playlist items.

### mode

Optional future use; ignore for now if omitted.

---

## 14. Condition DSL

Support these condition forms.

### 14.1 Logical conditions

#### all

AND over child conditions.

```yaml
match:
  all:
    - field: rating
      gte: 80
    - field: genre
      contains: "House"
```

#### any

OR over child conditions.

```yaml
match:
  any:
    - field: genre
      contains: "House"
    - field: genre
      contains: "Deep House"
```

#### not

Negation.

```yaml
match:
  all:
    - not:
        field: podcast
        equals: true
```

---

### 14.2 Field comparison

```yaml
- field: bpm
  gte: 120
```

Supported operators:

* `equals`
* `contains`
* `in`
* `gt`
* `gte`
* `lt`
* `lte`
* `exists`

Examples:

```yaml
- field: genre
  equals: "House"

- field: genre
  contains: "House"

- field: bpm
  gte: 120

- field: bpm
  lt: 125

- field: comments
  exists: true

- field: genre
  in: ["House", "Deep House", "Tech House"]
```

---

### 14.3 Playlist membership condition

```yaml
- inPlaylist:
    source: generated
    name: "Base/Favorites/4stars+"
```

Supported sources:

* `existing`
* `generated`

Semantics:

* `existing` references a playlist already present in input XML
* `generated` references a concrete playlist produced earlier in evaluation order

Forward references to generated playlists are forbidden.

---

### 14.4 Set operations through conditions

Do not add separate set-operation syntax yet. Use logical combination.

Example: A minus B

```yaml
match:
  all:
    - inPlaylist:
        source: existing
        name: "All House"
    - not:
        inPlaylist:
          source: existing
          name: "Exclude/DoNotPlay"
```

---

## 15. Supported Track Fields

Support these fields in v1:

* `trackId`
* `name`
* `artist`
* `albumArtist`
* `composer`
* `album`
* `genre`
* `bpm`
* `rating`
* `playCount`
* `skipCount`
* `year`
* `trackNumber`
* `discNumber`
* `dateAdded`
* `dateModified`
* `location`
* `comments`
* `grouping`
* `compilation`
* `podcast`
* `disabled`
* `kind`

Unknown fields must throw validation error during rule parsing.

---

## 16. Type Coercion Rules

Normalize parsed values:

* numeric plist fields → numbers
* date plist fields → `Date`
* boolean plist flags → booleans
* missing fields → `undefined`

Comparison rules:

* numeric comparisons on missing values return false
* string comparisons on missing values return false
* `exists: true` means field is not `undefined` and not null
* `exists: false` means field is `undefined` or null

For `contains`:

* default case-insensitive unless explicitly overridden in future
* normalize both sides to strings

---

## 17. Sort DSL

Support optional sort per playlist.

Example:

```yaml
sort:
  - field: bpm
    order: asc
  - field: artist
    order: asc
  - field: album
    order: asc
  - field: trackNumber
    order: asc
```

Schema:

```ts
type SortRule = {
  field: SupportedField
  order: "asc" | "desc"
}
```

Sorting behavior:

* stable sort
* undefined values sort last
* compare strings case-insensitively
* compare dates by timestamp
* compare numbers numerically

If no sort specified:

* preserve original track iteration order from input track registry order or natural playlist filter order

---

## 18. Generators

Generators expand to concrete playlist rules before evaluation.

This is important for BPM buckets and future repetitive rule generation.

Support v1:

### 18.1 BPM range generator

Example:

```yaml
generators:
  - type: bpmRange
    basePath: "BPM"
    sourcePlaylist:
      source: generated
      name: "Base/Favorites/4stars+"
    from: 80
    to: 180
    step: 5
    pad: 3
    sort:
      - field: bpm
        order: asc
      - field: artist
        order: asc
```

Expansion behavior:

* create playlists for each half-open bucket
* example with `from=80`, `to=90`, `step=5`:

  * `BPM/080-084`
  * `BPM/085-089`

Semantics:

* lower bound inclusive
* upper bound exclusive for each bucket

Generated rule example:

```yaml
- name: "BPM/080-084"
  match:
    all:
      - inPlaylist:
          source: generated
          name: "Base/Favorites/4stars+"
      - field: bpm
        gte: 80
      - field: bpm
        lt: 85
```

### 18.2 Design requirement for future generators

Implement generator expansion in a modular way so additional generator types can be added later.

Possible future generators:

* rating buckets
* year ranges
* genre splits from a configured list
* date rolling windows

---

## 19. Evaluation Order

Evaluation order:

1. parse root options
2. parse concrete playlists
3. expand generators into concrete playlists
4. concatenate into final concrete rule list
5. evaluate rules top-to-bottom

Generated playlists can only reference:

* existing playlists
* previously evaluated generated playlists

Forward reference is an error.

---

## 20. Dependency Handling

At minimum:

* detect direct forward references
* detect duplicate generated playlist full paths

Optional but recommended:

* build a dependency graph for generated references and validate no cycles, even though strict top-to-bottom model should already block most cases

Error examples:

* generated playlist references a later generated playlist
* duplicate path `Base/Favorites/4stars+`

---

## 21. Namespace and Path Semantics

### 21.1 Namespace

`namespace` is the root generated folder.

If `namespace: "_Generated"` and rule name is:

```text
Base/Favorites/4stars+
```

full output path is:

```text
_Generated/Base/Favorites/4stars+
```

### 21.2 Path parsing

Treat `/` as folder separator.
Last segment is the playlist name.
Parent segments are folders.

### 21.3 Folder auto-generation

All intermediate folders are auto-created.
No explicit folder rule syntax is needed.

### 21.4 Empty folders

Do not generate empty folders.

---

## 22. Existing Playlist Resolution

Need reliable lookup for `inPlaylist.source: existing`.

Implement lookup by `fullPath` first.
If no nested path available in existing library, fall back to exact `name`.

Rules:

* if exact one match found, use it
* if multiple matches found by name only, throw ambiguity error and instruct user to disambiguate with full path once supported by source data
* if none found:

  * throw error if `failOnMissingPlaylist = true`
  * otherwise treat as empty playlist

---

## 23. Generated Playlist Resolution

Generated playlist references must use the declared relative path, not namespace-prefixed path.

Example:

```yaml
- inPlaylist:
    source: generated
    name: "Base/Favorites/4stars+"
```

This resolves to:

```text
_Generated/Base/Favorites/4stars+
```

internally.

---

## 24. Dedupe Semantics

If `dedupeTrackIds = true`:

* each generated playlist must contain unique track IDs
* preserve first occurrence order before sorting
* then apply sorting if configured

If false:

* duplicates may remain, though in practice duplicates should still not appear under normal filtering

---

## 25. Preview Command

CLI must support previewing generated structure and counts.

Command:

```bash
itunes-playlist-builder preview \
  --input "iTunes Library.xml" \
  --rules playlists.yml
```

Output should include:

* folder tree
* playlist counts
* summary totals

Example:

```text
_Generated
 ├ Base
 │  └ Favorites
 │      └ 4stars+ (532)
 └ BPM
    ├ 080-084 (41)
    ├ 085-089 (65)
    └ 090-094 (82)

Summary:
  generated playlists: 4
  generated folders: 3
  referenced tracks: 720
```

Optional flags:

* `--json` for machine-readable preview
* `--verbose` to print resolved rule summary

---

## 26. Build Command

Command:

```bash
itunes-playlist-builder build \
  --input "iTunes Library.xml" \
  --rules playlists.yml \
  --output "iTunes Library.generated.xml"
```

Behavior:

* read input XML
* evaluate all rules
* clone plist object
* remove prior generated namespace subtree if configured
* append generated folders and playlists
* write output plist XML

Optional flags:

* `--pretty` if plist builder formatting allows
* `--dry-run` to evaluate and preview without writing

---

## 27. XML Merge Strategy

### 27.1 Do not mutate source file

Never overwrite input file by default.

### 27.2 Remove previous generated namespace subtree

If `removeExistingNamespace` is true:

* locate namespace folder playlist
* remove it and all descendants from playlist array
* then append fresh generated namespace subtree

### 27.3 Preserve everything else

Must preserve:

* all existing tracks
* all non-generated playlists
* unrelated metadata at plist root

---

## 28. Folder and Playlist Serialization

Since actual sample XML will be provided later, implement serialization in a way that is easy to adapt once confirmed.

General requirements:

* represent folders as folder playlist entries
* represent child relationships via parent linkage fields if present/required
* represent playlist items using track references by track ID
* assign fresh playlist IDs for all generated folders and playlists

Important:

* keep writer modular so field names used for folder/playlists can be adjusted when sample XML is available
* do not hardcode more than necessary before sample inspection

This means `xmlWriter.ts` should isolate all format-specific mapping logic.

---

## 29. Playlist ID Allocation

Determine current maximum playlist ID from existing library.
Assign new IDs sequentially for:

* namespace root folder
* generated folders
* generated playlists

Never reuse removed generated IDs in the same run unless convenient; sequential fresh allocation is fine.

---

## 30. Track Item Serialization

For standard playlists, serialize track references as playlist items using `Track ID`.

Generated folders must not contain `Playlist Items`.

---

## 31. Core Public API

Expose at least:

```ts
export type BuildParams = {
  inputXmlPath: string
  rulesPath: string
  outputXmlPath: string
}

export async function buildLibrary(params: BuildParams): Promise<BuildResult>

export async function previewLibrary(params: {
  inputXmlPath: string
  rulesPath: string
}): Promise<PreviewResult>
```

Suggested result objects:

```ts
type BuildResult = {
  generatedPlaylistCount: number
  generatedFolderCount: number
  outputXmlPath: string
}

type PreviewResult = {
  tree: FolderNode
  playlistCount: number
  folderCount: number
}
```

This API is intended to be reused by a future GUI.

---

## 32. Error Handling

Create explicit domain errors.

Recommended error classes:

* `RuleValidationError`
* `LibraryParseError`
* `PlaylistResolutionError`
* `ForwardReferenceError`
* `DuplicatePlaylistPathError`
* `AmbiguousPlaylistReferenceError`
* `XmlWriteError`

Examples:

### unknown field

`Unknown field "foo" in rule "Base/Favorites/4stars+"`

### missing playlist

`Referenced existing playlist not found: "Liked Songs"`

### forward reference

`Generated playlist "B" references later playlist "C"`

### ambiguity

`Multiple existing playlists matched name "Favorites"; use nested path when available`

Error messages must be human-readable because the user will edit YAML directly.

---

## 33. Performance Targets

Target library size:

* 10,000 tracks
* 100 concrete rules after generator expansion

Target runtime:

* under 1 second on a normal modern machine, excluding file I/O variability

Guidelines:

* avoid repeated full scans where unnecessary
* playlist membership lookups should use `Set<number>`
* generated playlist registry should be map-based
* sorting only after filter results are collected

---

## 34. Testing Strategy

Use `vitest`.

### 34.1 Unit tests

* track normalization
* playlist normalization
* field conditions
* logical conditions
* playlist membership conditions
* sort behavior
* generator expansion
* folder tree building

### 34.2 Integration tests

* sample plist parse → build → plist output
* namespace replacement
* generated folder hierarchy
* preview output generation

### 34.3 Edge cases

* missing fields
* missing playlist references
* duplicate playlist paths
* ambiguous existing playlist names
* empty result playlists
* nested not/all/any combinations

---

## 35. Suggested Test Fixtures

Create minimal fixtures:

* `fixtures/library.minimal.xml`
* `fixtures/library.with-folders.xml`
* `fixtures/rules.basic.yml`
* `fixtures/rules.generators.yml`

Once the real sample XML is provided, add fixture(s) derived from it in anonymized/minimal form if possible.

---

## 36. Implementation Order

Implement in this order:

1. models and errors
2. libraryParser
3. ruleSchema and ruleParser
4. conditionEvaluator
5. playlistRegistry
6. sort module
7. generatorExpander
8. ruleEvaluator
9. folderTreeBuilder
10. xmlWriter
11. builder orchestration
12. preview
13. CLI
14. tests
15. README

This order minimizes thrash and keeps format-specific writer work isolated until parsing and evaluation are stable.

---

## 37. README Requirements

README should include:

* purpose
* install
* build command
* preview command
* rules file example
* BPM generator example
* supported fields
* known limitations
* note that actual XML compatibility may be tuned after sample file inspection

---

## 38. Non-goals for This Version

Do not implement:

* direct Apple Music/iTunes DB access
* full compatibility with native iTunes smart playlist semantics
* GUI
* filesystem watch mode
* live sync
* arbitrary user-defined JavaScript conditions
* playlist rule inheritance syntax
* regex matching

---

## 39. Planned Future Extensions

Design now so these can be added later without major refactor:

* date conditions like `afterDaysAgo`
* regex string matching
* reusable named condition blocks
* rule inheritance
* additional generators
* GUI rule editor
* diff preview between previous and current generation
* watch mode
* export of diagnostic evaluation report

---

## 40. Additional Design Requirements That Matter Later

These are worth accounting for now.

### 40.1 Keep rule parsing and evaluation separate

So GUI can validate rules without building XML.

### 40.2 Keep writer isolated

Because actual plist playlist folder representation may need tuning after real sample inspection.

### 40.3 Make preview independent of writer

Preview should work from internal tree model, not from serialized plist.

### 40.4 Use normalized fullPath internally everywhere

This avoids path ambiguity when nesting grows.

### 40.5 Do not bake namespace into rule names

Rules stay relative; namespace is an environment-level concern.

---

## 41. Example Rules File

```yaml
namespace: "_Generated"

options:
  removeExistingNamespace: true
  failOnMissingPlaylist: true
  dedupeTrackIds: true
  caseSensitiveContains: false

playlists:
  - name: "Base/Favorites/4stars+"
    match:
      all:
        - field: rating
          gte: 80
        - not:
            field: podcast
            equals: true
    sort:
      - field: artist
        order: asc
      - field: album
        order: asc
      - field: trackNumber
        order: asc

  - name: "Genre/House/Favorites"
    match:
      all:
        - inPlaylist:
            source: generated
            name: "Base/Favorites/4stars+"
        - field: genre
          contains: "House"
    sort:
      - field: bpm
        order: asc
      - field: artist
        order: asc
      - field: name
        order: asc

  - name: "Manual/HighPriority"
    match:
      all:
        - inPlaylist:
            source: existing
            name: "DJ/HighPriority"
        - field: disabled
          notEquals: true
```

Note: `notEquals` is not otherwise specified above.
To keep v1 small, **do not implement `notEquals`**. Rewrite using `not + equals` in docs/examples.

Corrected example:

```yaml
  - name: "Manual/HighPriority"
    match:
      all:
        - inPlaylist:
            source: existing
            name: "DJ/HighPriority"
        - not:
            field: disabled
            equals: true
```

Generators example:

```yaml
generators:
  - type: bpmRange
    basePath: "BPM/Favorites"
    sourcePlaylist:
      source: generated
      name: "Base/Favorites/4stars+"
    from: 80
    to: 180
    step: 5
    pad: 3
    sort:
      - field: bpm
        order: asc
      - field: artist
        order: asc
```

---

## 42. Concrete Acceptance Criteria

The implementation is acceptable when all of the following are true:

1. CLI `build` reads a valid library XML and rules YAML and writes a new XML file.
2. CLI `preview` shows a nested generated folder tree.
3. Generated playlists may reference existing playlists.
4. Generated playlists may reference earlier generated playlists.
5. Nested folder hierarchy is created automatically from slash-separated names.
6. BPM range generator expands into concrete playlists.
7. Sort rules affect playlist item order.
8. Prior generated namespace subtree is replaced cleanly.
9. Errors are human-readable.
10. Core logic is callable independently of CLI.

---

## 43. Important Note About Real XML Sample

A real sample `iTunes Library.xml` will be provided separately.

When implementing:

* keep plist parse/write logic flexible
* isolate all raw plist field mapping in parser/writer modules
* after sample arrives, adjust folder serialization details if necessary without changing rule/evaluation architecture

This is critical.

---

## 44. Final Instruction to Claude Code

Implement the project exactly according to this specification, prioritizing:

1. correctness of internal models
2. reusable core architecture
3. robust rule parsing and evaluation
4. easy adaptation after real XML sample inspection

Do not overbuild beyond the specification.
Keep the code readable, modular, and testable.
