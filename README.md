# Task Management API — Final Challenge

Small Node.js REST API delivered through a complete GitHub, CI, container, security, and release workflow. The repository is designed to be reproducible from a clean checkout and does not require environment-specific source changes.

## Requirements

- Node.js 20 or 22
- npm
- Docker with Docker Compose v2

## Local development

Install all development dependencies and start the service:

```bash
npm install
npm start
```

The API listens on `http://localhost:3000` by default. Copy `.env.example` only if your local tooling loads environment files; `.env` files are intentionally ignored by Git.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP listening port |
| `NODE_ENV` | development locally, `production` in the container | Runtime environment |

No secret is required by the application. Do not commit `.env` files, credentials, or registry tokens.

## Quality checks

Run the same application checks used by CI:

```bash
npm run lint
npm test
npm run check
```

The test suite uses the Node.js test runner. It covers the health endpoint and Task API behavior, including validation and missing-resource cases as features are added. `npm run check` validates that the application entrypoint parses successfully.

## API

The service exposes these base routes:

- `GET /health` — container and service health;
- `GET /tasks` — list tasks;
- `GET /tasks/:id` — retrieve a task;
- `POST /tasks` — create a task.

Feature branches extend the Task API according to [CHALLENGE.md](CHALLENGE.md), with automated tests accompanying every behavior change.

## Docker

Build and start the production image:

```bash
docker build -t task-api .
docker run --rm -p 3000:3000 task-api
```

The multi-stage `Dockerfile` installs production dependencies only. Its runtime stage uses the official `node:22-alpine` image, copies no host dependency directory, runs as the unprivileged `node` user, and includes a health check against `/health`.

Use another host and container port consistently with `PORT`:

```bash
docker run --rm -e PORT=8080 -p 8080:8080 task-api
```

## Docker Compose

Build and start the complete local environment with one command:

```bash
docker compose up --build
```

Compose exposes `${PORT:-3000}`, keeps the container filesystem read-only, provides a temporary `/tmp`, and reports health through the application endpoint. Stop it with `Ctrl+C`, then run `docker compose down` if cleanup is needed.

## Branching and contribution workflow

`main` is the protected delivery branch. Every change follows this cycle:

```text
GitHub issue -> dedicated branch -> commits -> pull request -> review + green CI -> merge
```

Use branch names that communicate intent:

- `feature/<short-name>` for user-facing behavior;
- `fix/<short-name>` for defect corrections;
- `chore/<short-name>` for delivery, maintenance, or technical debt.

Each pull request references its issue with `Closes #<number>`, explains verification, and receives a useful technical review from another team member. Commits go through pull requests; contributors do not commit directly to `main`.

## Continuous integration and delivery

GitHub Actions separates validation from production publication.

### Pull requests and `main`

`.github/workflows/ci.yml` performs:

1. clean `npm ci` installs on Node.js 20 and 22;
2. lint, automated tests, and the application check;
3. a Docker Buildx build without publishing;
4. a Trivy scan of the built image;
5. SARIF upload to GitHub Security when a report is produced.

Concurrent obsolete CI runs for the same branch are cancelled. A fixed `HIGH` or `CRITICAL` image vulnerability fails the container gate.

### Merges and version tags

`.github/workflows/publish.yml` runs for pushes to `main` and semantic tags such as `v1.0.0`. It repeats the application checks, builds a release candidate, blocks publication if the Trivy policy fails, authenticates with the short-lived `GITHUB_TOKEN`, then publishes to GHCR.

The workflow declares only `contents: read` and `packages: write`. The first permission allows checkout; the second allows the verified image to be pushed. No personal access token is stored in the repository.

Weekly dependency and repository scans are defined in `.github/workflows/security.yml`. Dependabot also proposes focused npm and GitHub Actions updates.

## Container registry and traceability

Published images use:

```text
ghcr.io/zayonx-0/final-challenge
```

Available tags are generated automatically:

- `latest` for the current `main` build;
- `sha-<commit>` for an immutable commit-specific build;
- `1.0.0` and `1.0` for a pushed `v1.0.0` tag.

Pull a published image with:

```bash
docker pull ghcr.io/zayonx-0/final-challenge:latest
```

Docker metadata adds OCI source, revision, creation time, description, and version labels. Together with the `sha-*` tag, these labels trace a package back to its source repository and exact commit. Build provenance and an SBOM are also attached during publication.

## Release process

After all intended pull requests are reviewed, green, and merged:

1. verify the `main` publication workflow and GHCR package;
2. create and push a semantic tag, for example `v1.0.0`;
3. verify the matching versioned image tags;
4. create a GitHub Release from the same tag;
5. include features, fixes, test evidence, image coordinates, and known limitations in the release notes.

The checklist and release-note structure are available in [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md).

## Architecture

```text
Developer
   |
GitHub issue -> branch -> pull request -> teammate review
                                  |
                            GitHub Actions
                       +----------+----------+
                       |                     |
                 lint + tests          Docker build
                                             |
                                        Trivy scan
                                             |
                                  merge/tag on main only
                                             |
                                           GHCR
                                             |
                                      GitHub Release
```

The application remains independent from the delivery platform: runtime configuration enters through environment variables, while Docker, Compose, GitHub Actions, scanning, and release metadata stay at the repository boundary.
