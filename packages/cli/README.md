# @tainakanchu/itunes-playlist-builder-cli

CLI for iTunes Playlist Builder. Define playlist rules in YAML, generate static playlists with folder hierarchy, and output XML compatible with DJ software (rekordbox, Serato, Traktor, etc.).

## Install

```bash
npm install -g @tainakanchu/itunes-playlist-builder-cli
```

## Commands

### `preview`

Preview generated playlist structure without writing any files.

```bash
itunes-playlist-builder preview \
  --input "iTunes Library.xml" \
  --rules rules.yml
```

Options:

- `--json` — Output as JSON
- `--verbose` — Print resolved rule summary

### `build`

Build playlists and write output XML.

```bash
itunes-playlist-builder build \
  --input "iTunes Library.xml" \
  --rules rules.yml \
  --output "iTunes Library.generated.xml"
```

Options:

- `--dry-run` — Evaluate and preview without writing

## Example Output

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

## Rules File

See the [main repository README](https://github.com/tainakanchu/itunes-playlist-builder#rules-file-format) for full rules documentation.

## License

MIT
