# iTunes Playlist Builder

Declarative playlist build system for iTunes Library.xml. Define playlist rules in YAML, generate static playlists with folder hierarchy, and output a new XML file compatible with DJ software (rekordbox, Serato, Traktor, etc.).

## Overview

```
iTunes Library.xml + rules.yml → build → library.generated.xml
```

iTunes/Music.app manages your master track library, metadata, ratings, and manual playlists. This tool handles:

- Smart-playlist-like condition evaluation
- Playlist dependency resolution
- Nested folder hierarchy generation
- BPM range bucketing and other generators
- Static playlist output for DJ software

## Requirements

- Node.js >= 20
- pnpm
- mise (optional, for dev toolchain)

## Install

```bash
pnpm install
pnpm -r build
```

## Usage

### Preview

```bash
npx tsx packages/cli/src/cli.ts preview \
  --input "iTunes Library.xml" \
  --rules rules.yml
```

Output:

```
_Generated
 ├ Base
 │  └ Favorites
 │     └ 4stars+ (7680)
 └ BPM
    └ Favorites
       ├ 120-124 (455)
       ├ 125-129 (734)
       └ 130-134 (544)

Summary:
  generated playlists: 4
  generated folders: 3
  referenced tracks: 8282
```

Options:
- `--json` for machine-readable output
- `--verbose` for detailed rule info

### Build

```bash
npx tsx packages/cli/src/cli.ts build \
  --input "iTunes Library.xml" \
  --rules rules.yml \
  --output "iTunes Library.generated.xml"
```

Options:
- `--dry-run` to evaluate and preview without writing

## Rules File Format

A JSON Schema is provided for editor validation and autocompletion. Add this comment at the top of your YAML file:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/tainakanchu/itunes-playlist-builder/master/packages/core/rules.schema.json
```

Requires the [YAML extension for VS Code](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) (or equivalent for your editor).

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
```

## Condition DSL

### Field comparisons

| Operator | Description |
|----------|-------------|
| `equals` | Exact match (strings are case-insensitive by default) |
| `contains` | Substring match |
| `in` | Value in list |
| `gt` | Greater than |
| `gte` | Greater than or equal |
| `lt` | Less than |
| `lte` | Less than or equal |
| `exists` | Field is present (true) or absent (false) |

### Logical operators

- `all` — AND over child conditions
- `any` — OR over child conditions
- `not` — Negation

### Playlist membership

```yaml
- inPlaylist:
    source: existing    # or "generated"
    name: "My Playlist"
```

### Set operations via conditions

A minus B:

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

## Supported Track Fields

`trackId`, `name`, `artist`, `albumArtist`, `composer`, `album`, `genre`, `bpm`, `rating`, `playCount`, `skipCount`, `year`, `trackNumber`, `discNumber`, `dateAdded`, `dateModified`, `location`, `comments`, `grouping`, `compilation`, `podcast`, `disabled`, `kind`

## Generators

### BPM Range

Creates playlists for each BPM bucket (equal-step arithmetic):

```yaml
generators:
  - type: bpmRange
    basePath: "BPM"
    sourcePlaylist: { source: generated, name: "Base/Favorites/4stars+" }
    from: 80
    to: 180
    step: 5
    pad: 3
```

Generates: `BPM/080-084`, `BPM/085-089`, ..., `BPM/175-179`

### Ranges

Arbitrary named numeric ranges (overlapping OK):

```yaml
generators:
  - type: ranges
    basePath: "DJ/Zones"
    sourcePlaylist: { source: generated, name: "Base/Favorites/4stars+" }
    field: bpm
    pad: 0
    ranges:
      - name: "House"
        gte: 118
        lt: 138
      - name: "Techno"
        gte: 125
        lt: 148
```

If `name` is omitted, auto-generates from bounds (e.g., `120-137`). Supports `gte`, `gt`, `lt`, `lte`.

### Tags

Creates one playlist per tag value using `contains` matching:

```yaml
generators:
  - type: tags
    basePath: "Style"
    sourcePlaylist: { source: generated, name: "Base/Favorites/4stars+" }
    field: genre
    values: ["House", "Techno", "Trance", "DnB"]
```

Generates: `Style/House`, `Style/Techno`, etc.

### Templates

Define generator parameters once and reuse across multiple sources:

```yaml
templates:
  bpmBuckets:
    type: bpmRange
    from: 70
    to: 180
    step: 5
    pad: 3
    sort:
      - field: bpm
        order: asc

generators:
  - template: bpmBuckets
    basePath: "Genre/House/BPM"
    sourcePlaylist: { source: generated, name: "Genre/House/All" }
  - template: bpmBuckets
    basePath: "Genre/Techno/BPM"
    sourcePlaylist: { source: generated, name: "Genre/Techno/All" }
```

Template types: `bpmRange`, `ranges`, `tags`. The `sort` in a template ref overrides the template's sort.

## Architecture

```
packages/
  core/   — Business logic (reusable for future GUI)
  cli/    — Thin CLI wrapper
```

## Testing

```bash
cd packages/core
pnpm test
```

## Known Limitations

- XML serialization format may need tuning for specific DJ software compatibility
- No regex matching (planned)
- No date-relative conditions like `afterDaysAgo` (planned)
- No watch mode (planned)
