---
name: release
description: Publish npm packages and create GitHub releases. Use this skill when the user wants to release, publish to npm, create a new version, cut a release, or ship packages. Triggers on phrases like "publish", "release", "npm に出して", "リリースして", "バージョン上げて", "ship it". Also use when the user mentions version bumping in the context of publishing.
user_invocable: true
---

# Release

Publish packages to npm via the GitHub Actions publish workflow, then create a GitHub release at the resulting tag.

## Arguments

When invoked as `/release`, arguments follow the skill name:

- `<version>`: Required. `patch`, `minor`, `major`, or an exact semver like `0.3.0`
- `--dry-run`: Optional. Runs the publish workflow in dry-run mode (no actual publish or release)

When auto-triggered from conversation, ask the user for the version if not specified.

## Workflow

### 1. Trigger the publish workflow

```bash
gh workflow run publish.yml -f "version=<version>" -f "dry-run=<true|false>"
```

### 2. Find and watch the run

Wait a few seconds for GitHub to register the run, then find it and watch for completion:

```bash
sleep 5
RUN_ID=$(gh run list --workflow=publish.yml --limit=1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID"
```

### 3. Check result

```bash
CONCLUSION=$(gh run view "$RUN_ID" --json conclusion --jq '.conclusion')
```

If the run failed, show the error:

```bash
gh run view "$RUN_ID" --log-failed 2>&1 | tail -30
```

Report the failure with a link to the run and stop.

### 4. If dry-run, stop here

Report that the dry-run succeeded and no packages were published.

### 5. Create GitHub release

On success, fetch the tags that lerna created and make a release:

```bash
git fetch --tags
# lerna independent mode creates tags like @tainakanchu/itunes-playlist-builder-core@0.2.0
# Use the most recent tag as the release tag
TAG=$(git tag --sort=-creatordate | head -1)
gh release create "$TAG" --generate-notes --title "$TAG"
```

Report the release URL to the user.

## Prerequisites

- `NPM_PUBLISH_TOKEN` must be set in GitHub repository secrets (Granular Access Token, not Classic)
- The `gh` CLI must be authenticated with push access
- Working tree should be clean (lerna version will fail on dirty trees)

## Error handling

- If `gh workflow run` fails: check if the workflow file exists and if the user is authenticated
- If the run fails at format/build/typecheck/test: the code has issues that need fixing before release
- If the run fails at "Verify npm token": the NPM_PUBLISH_TOKEN is invalid or requires OTP — need a Granular Access Token
- If the run fails at "Lerna publish": check npm permissions for the @tainakanchu scope
