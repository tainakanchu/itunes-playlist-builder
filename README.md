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

## BPM Range Generator

Creates playlists for each BPM bucket from a source playlist:

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
```

Generates: `BPM/080-084`, `BPM/085-089`, ..., `BPM/175-179`

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
