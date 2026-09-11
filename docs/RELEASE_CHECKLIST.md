# Release checklist

Use this checklist after the release scope has been merged into `main`.

## Before tagging

- [ ] Every change is linked to an issue and merged through a reviewed pull request.
- [ ] Required CI checks are green on `main`.
- [ ] The `latest` and `sha-<commit>` images are visible in GHCR.
- [ ] The published image starts and its `/health` endpoint responds successfully.
- [ ] Known limitations have been collected from the merged pull requests.

## Tag and package

```bash
git switch main
git pull --ff-only
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

- [ ] The publish workflow succeeds for the version tag.
- [ ] `ghcr.io/zayonx-0/final-challenge:1.0.0` points to the expected commit.
- [ ] OCI labels expose the repository, revision, build time, and version.
- [ ] Build provenance and the SBOM are attached to the published package.

## GitHub Release notes

```markdown
## New features

- ...

## Bug fixes

- ...

## Tests and quality

- Node.js 20/22 CI, lint, test count, and container scan results.

## Docker image

- `ghcr.io/zayonx-0/final-challenge:1.0.0`
- `ghcr.io/zayonx-0/final-challenge:sha-<commit>`

## Known limitations

- ...
```

- [ ] Create the GitHub Release from the existing `v1.0.0` tag.
- [ ] Link important issues and pull requests in the release notes.
- [ ] Verify that the release and package both resolve to the same commit.
