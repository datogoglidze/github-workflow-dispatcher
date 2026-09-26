# github-workflow-dispatcher

A GitHub Actions scheduler and on-demand dispatcher. Target workflows use `workflow_dispatch`. A FastAPI backend, authenticated as a GitHub App on one organization, caches repositories and workflows in SQLite and fires dispatches with APScheduler (UTC). Every scheduled or manual dispatch is written to an audit log with the Actions run URL. The React UI browses repositories and workflows, manages schedules, runs workflows, and inspects logs.

## Architecture

| Layer | Path | Role |
|---|---|---|
| Core | `app/core` | Repositories, workflows, schedules, logs, sync, and dispatch |
| Infrastructure | `app/infra` | FastAPI routers, SQLite, Alembic, APScheduler |
| GitHub | `app/plugins/github` | GitHub App client and workflow YAML parsing |
| Runner | `app/runner` | Settings, CLI, and composition root |
| Web | `web/` | Vite, React, and TypeScript UI |

## GitHub App setup

Create a GitHub App, install it on the organization, and set the environment variables below.

**Permissions**

| Permission | Access |
|---|---|
| Actions | Read & write |
| Contents | Read |
| Metadata | Read |

Generate a private key and note the App ID and installation ID.

## Environment variables

Copy the examples and fill in the GitHub App values:

```bash
cp .env.example .env
cp web/.env.example web/.env
```

### Backend

All backend variables use the `WORKFLOW_DISPATCHER_` prefix.

| Variable | Default | Description |
|---|---|---|
| `WORKFLOW_DISPATCHER_LOG_LEVEL` | `INFO` | Python log level |
| `WORKFLOW_DISPATCHER_FRONTEND_ORIGINS` | `*` | Comma-separated CORS origins |
| `WORKFLOW_DISPATCHER_DATABASE_URL` | `sqlite:///./github_workflow_dispatcher.sqlite` | SQLAlchemy database URL |
| `WORKFLOW_DISPATCHER_DATABASE_MIGRATE` | `true` | Run Alembic migrations on startup |
| `WORKFLOW_DISPATCHER_GITHUB_ORG` | | Organization login |
| `WORKFLOW_DISPATCHER_GITHUB_APP_ID` | | GitHub App ID |
| `WORKFLOW_DISPATCHER_GITHUB_APP_INSTALLATION_ID` | `0` | Installation ID |
| `WORKFLOW_DISPATCHER_GITHUB_APP_PRIVATE_KEY` | | PEM private key (`\n` escapes are accepted) |
| `WORKFLOW_DISPATCHER_RATE_LIMIT_PER_SECOND` | `3.0` | GitHub API token refill rate |
| `WORKFLOW_DISPATCHER_RATE_LIMIT_BURST` | `5` | Token bucket capacity |
| `WORKFLOW_DISPATCHER_JITTER_MIN_SECONDS` | `1.0` | Minimum dispatch jitter |
| `WORKFLOW_DISPATCHER_JITTER_MAX_SECONDS` | `15.0` | Maximum dispatch jitter |
| `WORKFLOW_DISPATCHER_SYNC_INTERVAL_HOURS` | `6` | Repository sync interval (`0` disables it) |

### Frontend

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | API origin |
| `VITE_BASE_PATH` | `/github-workflow-dispatcher-web/` | Vite base path |

## Local development

Prerequisites: Python 3.13+, Poetry, and Node.js 24.

Set `WORKFLOW_DISPATCHER_FRONTEND_ORIGINS=http://localhost:3000` in `.env`, then start both apps:

```bash
make install
make run

cd web && npm ci && npm run dev
```

The API listens on <http://localhost:8000> (`/docs` for OpenAPI). The UI listens on <http://localhost:3000>.

| Target | Description |
|---|---|
| `make install` | Install Python dependencies |
| `make run` | Start the API on port 8000 |
| `make lint` | `poetry check`, `ruff`, and `mypy` |
| `make test` | Run the test suite |
| `make build` | Build the API Docker image |

## Docker

API image (port 8000, health check on `GET /health`, database volume at `/var/databases`):

```bash
make build
docker run --env-file .env -p 8000:8000 github-workflow-dispatcher:latest
```

Web image (nginx on port 80):

```bash
docker build -t github-workflow-dispatcher-web:latest \
  --build-arg VITE_API_BASE_URL=http://localhost:8000 \
  web
docker run -p 3000:80 github-workflow-dispatcher-web:latest
```

## CI

Push to `main`, version tags (`v*.*.*`), and pull requests run two workflows:

- `.github/workflows/api.yml` — lint, unit tests, integration tests, then a Docker build. Pushes `ghcr.io/<owner>/github-workflow-dispatcher` on non-PR events. Ignores `web/**`.
- `.github/workflows/web.yml` — lint, test, and build, then a Docker build. Pushes `ghcr.io/<owner>/github-workflow-dispatcher-web` on non-PR events. Runs only when `web/**` changes.

Images are tagged `latest` on the default branch, short SHA, and semver.

## Built with IBM Bob

IBM Bob built this repository:

- Backend layers in `app/core`, `app/infra`, `app/plugins/github`, and `app/runner`
- React UI in `web/`, including schedules, workflows, repositories, logs, and the dashboard
- Both Docker images and the `api.yml` and `web.yml` workflows
