# github-workflow-dispatcher

A GitHub Actions workflow dispatcher and scheduler with a web UI.

## Why

GitHub's native `on: schedule` cron triggers are unreliable — runs are delayed at the top of the hour, skipped under load, and compete for runners. **github-workflow-dispatcher** replaces them:

1. Target workflows use the `workflow_dispatch` trigger.
2. A FastAPI backend authenticates as a **GitHub App** installed on one organization. It syncs the organization's repositories and workflows into a local SQLite cache and fires workflow dispatches on time using APScheduler cron jobs (all in UTC).
3. Every dispatch — scheduled or manual — is recorded in an audit log that includes the GitHub Actions run URL.
4. A React web UI lets users browse repositories and workflows, manage schedules, run workflows on demand, inspect logs, and check system health.

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Python 3.13, Poetry |
| API | FastAPI, Uvicorn (single worker) |
| Validation | Pydantic v2, pydantic-settings |
| CLI | Typer |
| Database | SQLAlchemy 2.0, Alembic, SQLite |
| Scheduler | APScheduler 3.x |
| GitHub | httpx, PyJWT (crypto), PyYAML |
| Frontend | Vite, React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| Quality | ruff, mypy (strict), pytest, pytest-asyncio |
| CI | GitHub Actions → GHCR |

## Local development

### Prerequisites

- Python 3.13+
- Poetry
- (Optional) Docker

### Install and run

```bash
make install   # install all dependencies
make run       # start the API on http://localhost:8000
```

Open <http://localhost:8000/docs> for the interactive API documentation.

## Make targets

| Target | Description |
|---|---|
| `make help` | Show CLI help |
| `make install` | Install all dependencies via Poetry |
| `make lock` | Regenerate `poetry.lock` |
| `make update` | Update all dependencies |
| `make format` | Auto-format and fix lint issues |
| `make lint` | Run `poetry check`, `ruff`, and `mypy` |
| `make test` | Run all tests |
| `make test-unit` | Run unit tests only |
| `make test-integration` | Run integration tests only |
| `make test-coverage` | Run tests with coverage report |
| `make run` | Start the API server |
| `make build` | Build the Docker image |

## Running with Docker

```bash
# Build
make build

# Run
docker run -p 8000:8000 \
  -e WORKFLOW_DISPATCHER_LOG_LEVEL=INFO \
  github-workflow-dispatcher:latest
```

The container exposes port 8000 and includes a health check on `GET /health`.

## Environment variables

Copy `.env.example` to `.env` and adjust:

```bash
cp .env.example .env
```

All variables are prefixed with `WORKFLOW_DISPATCHER_`:

| Variable | Default | Description |
|---|---|---|
| `WORKFLOW_DISPATCHER_LOG_LEVEL` | `INFO` | Python log level |
| `WORKFLOW_DISPATCHER_FRONTEND_ORIGINS` | `*` | Comma-separated CORS origins |
| `WORKFLOW_DISPATCHER_DATABASE_URL` | `sqlite:///./github_workflow_dispatcher.sqlite` | SQLAlchemy database URL |
| `WORKFLOW_DISPATCHER_DATABASE_MIGRATE` | `true` | Run Alembic migrations on startup |

The database file is created and migrated automatically on first start. In Docker the database lives at `/var/databases/github_workflow_dispatcher.sqlite` on a declared volume.

## API endpoints (Step 2)

### Health

```
GET /health
```
Returns `{ "status": "healthy", "database": "connected" }`.

### Repositories

All responses use the envelope `{ "status": "success", "code": 200, "data": { ... } }`. Errors use `{ "status": "fail", "code": <int>, "error": { "message": "..." } }`.

#### List repositories
```
GET /repositories?limit=100&offset=0
```
Returns a paginated list. `total` is the unpaginated count; `count` is the number of items returned.

```json
{
  "status": "success",
  "code": 200,
  "data": {
    "repositories": [...],
    "count": 2,
    "total": 42,
    "limit": 100,
    "offset": 0
  }
}
```

Query parameters:
| Parameter | Default | Constraints |
|---|---|---|
| `limit` | `100` | 1–1000 |
| `offset` | `0` | ≥ 0 |

#### Get a repository
```
GET /repositories/{repo_id}
```
Returns `{ "data": { "repository": { ... } } }` or a 404 error envelope if not found.

## CI

GitHub Actions runs on every push to `main`, on version tags (`v*.*.*`), and on pull requests.

**Jobs:**
- **Lint** — `poetry check`, `ruff`, `mypy`
- **Unit Tests** — `pytest tests/unit`
- **Integration Tests** — `pytest tests/integration` (exit 5 treated as success while empty)
- **Docker** — builds the image; pushes to GHCR only on non-PR events

**Image published to:** `ghcr.io/<owner>/github-workflow-dispatcher`

Tagged as `latest` (default branch), short SHA, semver version, and PR reference.
