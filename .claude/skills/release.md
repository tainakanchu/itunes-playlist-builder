---
name: release
description: Publish packages to npm and create a GitHub release. Usage: /release <version> [--dry-run]
user_invocable: true
---

# Release

Publish packages to npm via GitHub Actions and create a GitHub release.

## Arguments

- `<version>`: Required. One of `patch`, `minor`, `major`, or an exact version like `0.3.0`
- `--dry-run`: Optional. Run publish in dry-run mode (no actual publish)

## Steps

1. Parse arguments to extract version and dry-run flag
2. Trigger the "Publish to npm" workflow via `gh workflow run publish.yml`
3. Wait for the workflow run to complete
4. If the run failed, report the error with a link to the failed run
5. If dry-run, report success and stop
6. If the run succeeded, find the git tag created by lerna (format: `@tainakanchu/itunes-playlist-builder-core@<version>` or similar)
7. Create a GitHub release using `gh release create` at the tag, with auto-generated release notes

## Implementation

```bash
# 1. Trigger workflow
gh workflow run publish.yml -f version=<version> -f dry-run=<true|false>

# 2. Wait a moment for the run to register, then find it
sleep 5
RUN_ID=$(gh run list --workflow=publish.yml --limit=1 --json databaseId --jq '.[0].databaseId')

# 3. Wait for completion
gh run watch $RUN_ID

# 4. Check result
gh run view $RUN_ID --json conclusion --jq '.conclusion'

# 5. If not dry-run and successful, find the tags and create release
# lerna creates tags like: @tainakanchu/itunes-playlist-builder-core@0.2.0
# Use the core package tag as the release tag
git fetch --tags
TAG=$(git tag --sort=-creatordate | head -1)
gh release create "$TAG" --generate-notes --title "$TAG"
```

## Important

- The NPM_PUBLISH_TOKEN secret must be configured in GitHub repository settings
- The token must be a Granular Access Token (not Classic) to avoid OTP issues
- Always run with `--dry-run` first if unsure
