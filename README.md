# github-workflow-dispatcher

A GitHub Actions workflow scheduler and on-demand dispatcher. The system synchronizes repositories and `workflow_dispatch` workflows from a target GitHub organization, evaluates schedules in UTC using APScheduler, and records every dispatch in an audit log with links to the corresponding GitHub Actions run. It includes a FastAPI backend and a React/TypeScript web interface.

## Table of Contents

- [Architecture](#architecture)
- [GitHub App Setup](#github-app-setup)
- [Environment Configuration](#environment-configuration)
  - [Backend Configuration](#backend-configuration)
  - [Frontend Configuration](#frontend-configuration)
- [Running the Project](#running-the-project)
  - [1. Docker Compose (Local Build)](#1-docker-compose-local-build)
  - [2. Prebuilt Docker Packages (GHCR)](#2-prebuilt-docker-packages-ghcr)
  - [3. Local Development (make run and npm run dev)](#3-local-development-make-run-and-npm-run-dev)
- [Development and Testing](#development-and-testing)
  - [Backend Commands](#backend-commands)
  - [Frontend Commands](#frontend-commands)
- [API Documentation](#api-documentation)
- [CI/CD and Container Registry](#cicd-and-container-registry)

## Architecture

| Layer | Path | Description |
|---|---|---|
| Core | `app/core` | Domain logic: repository sync, workflow dispatching, schedule execution, and audit logging |
| Infrastructure | `app/infra` | FastAPI routers, SQLite database with Alembic migrations, APScheduler |
| GitHub Plugin | `app/plugins/github` | GitHub App authentication, API client, and workflow YAML parser |
| Runner | `app/runner` | Application settings, CLI entry points, and dependency injection root |
| Web UI | `web/` | React 19, TypeScript, Vite, and Tailwind CSS frontend |

## GitHub App Setup

The dispatcher authenticates to GitHub as an installed GitHub App.

1. Navigate to your GitHub Organization settings > **Developer settings** > **GitHub Apps** > **New GitHub App**.
2. Configure permissions:

| Permission | Access | Purpose |
|---|---|---|
| Actions | Read & write | Trigger workflows and read workflow run details |
| Contents | Read | Read workflow definitions (`.github/workflows/*.yml`) |
| Metadata | Read | Organization and repository metadata |

3. Generate a private key (`.pem`) under the App settings.
4. Install the App onto your organization.
5. Record the **App ID**, **Installation ID**, and **Organization Name**.

## Environment Configuration

Copy the example configuration files:

```bash
cp .env.example .env
cp web/.env.example web/.env
```

### Backend Configuration

All backend environment variables are prefixed with `WORKFLOW_DISPATCHER_`:

| Variable | Default | Description |
|---|---|---|
| `WORKFLOW_DISPATCHER_GITHUB_ORG` | | GitHub organization login (required) |
| `WORKFLOW_DISPATCHER_GITHUB_APP_ID` | | GitHub App ID (required) |
| `WORKFLOW_DISPATCHER_GITHUB_APP_INSTALLATION_ID` | `0` | GitHub App Installation ID (required) |
| `WORKFLOW_DISPATCHER_GITHUB_APP_PRIVATE_KEY` | | PEM private key string (literal `\n` characters supported) |
| `WORKFLOW_DISPATCHER_DATABASE_URL` | `sqlite:///./github_workflow_dispatcher.sqlite` | SQLAlchemy database connection string |
| `WORKFLOW_DISPATCHER_DATABASE_MIGRATE` | `true` | Automatically run Alembic migrations on startup |
| `WORKFLOW_DISPATCHER_FRONTEND_ORIGINS` | `*` | Allowed CORS origins (comma-separated list) |
| `WORKFLOW_DISPATCHER_LOG_LEVEL` | `INFO` | Python logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
| `WORKFLOW_DISPATCHER_RATE_LIMIT_PER_SECOND` | `3.0` | GitHub API rate limiter refill rate per second |
| `WORKFLOW_DISPATCHER_RATE_LIMIT_BURST` | `5` | Maximum token bucket burst capacity |
| `WORKFLOW_DISPATCHER_JITTER_MIN_SECONDS` | `1.0` | Minimum execution jitter for scheduled jobs |
| `WORKFLOW_DISPATCHER_JITTER_MAX_SECONDS` | `15.0` | Maximum execution jitter for scheduled jobs |
| `WORKFLOW_DISPATCHER_SYNC_INTERVAL_HOURS` | `6` | Repository sync interval in hours (`0` disables periodic sync) |

### Frontend Configuration

Configured in `web/.env`:

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend API URL |
| `VITE_BASE_PATH` | `/` | Base routing path for the frontend |

## Running the Project

> **Note:** All terminal commands throughout this guide assume a Bash shell (e.g. **Git Bash** on Windows, or standard terminal on Linux/macOS).

### 1. Docker Compose (Local Build)

Build and start both the backend API and frontend UI using the included `docker-compose.yml`:

```bash
# Using Makefile:
make up
# or start containers with raw command
docker compose up -d --build
```

- **Backend API**: <http://localhost:8001> (OpenAPI documentation at <http://localhost:8001/docs>)
- **Web UI**: <http://localhost:8002>
- **Data Persistence**: SQLite database is stored locally as `github_workflow_dispatcher.sqlite` via volume mount `./:/var/databases`.

To view container logs:

```bash
docker compose logs -f
```

To stop containers:

```bash
# Using Makefile:
make down
# Or with raw command:
docker compose down
```

### 2. Prebuilt Docker Packages (GHCR)

Pre-built Docker images are published to GitHub Container Registry (GHCR):

- API: `ghcr.io/datogoglidze/github-workflow-dispatcher:latest`
- Web UI: `ghcr.io/datogoglidze/github-workflow-dispatcher-web:latest`

#### Option A: Running with Standalone Docker Commands

1. Create a Docker network:
```bash
docker network create dispatcher-net
```

2. Run the Backend API:
```bash
docker run -d \
  --name workflow-dispatcher-api \
  --network dispatcher-net \
  --env-file .env \
  -e WORKFLOW_DISPATCHER_DATABASE_URL=sqlite:////var/databases/github_workflow_dispatcher.sqlite \
  -v "$(pwd)/data:/var/databases" \
  -p 8001:8000 \
  ghcr.io/datogoglidze/github-workflow-dispatcher:latest
```

3. Run the Frontend Web UI:
```bash
docker run -d \
  --name workflow-dispatcher-web \
  --network dispatcher-net \
  -p 8002:80 \
  ghcr.io/datogoglidze/github-workflow-dispatcher-web:latest
```

#### Option B: Running with Docker Compose using Published Images

Create a compose file (e.g., `docker-compose.ghcr.yml` or edit `docker-compose.yml`) referencing the published images:

```yaml
services:
  backend:
    image: ghcr.io/datogoglidze/github-workflow-dispatcher:latest
    ports:
      - "8001:8000"
    volumes:
      - ./:/var/databases
    environment:
      - WORKFLOW_DISPATCHER_DATABASE_URL=sqlite:////var/databases/github_workflow_dispatcher.sqlite
    env_file:
      - .env

  frontend:
    image: ghcr.io/datogoglidze/github-workflow-dispatcher-web:latest
    ports:
      - "8002:80"
```

Start the containers:

```bash
docker compose -f docker-compose.ghcr.yml up -d
```

### 3. Local Development (make run and npm run dev)

Run the backend and frontend directly on your local machine.

#### Prerequisites

- Python 3.13+
- Poetry
- Node.js 24+ and npm

#### Setup Configuration

Ensure `.env` allows CORS from the local frontend dev server:

```env
# In .env
WORKFLOW_DISPATCHER_FRONTEND_ORIGINS=http://localhost:3000
```

Ensure `web/.env` points to the local backend server:

```env
# In web/.env
VITE_API_BASE_URL=http://localhost:8000
VITE_BASE_PATH=/
```

#### Starting the Backend

```bash
make install
make run
```

The backend server starts on <http://localhost:8000>.

#### Starting the Frontend

In a separate terminal:

```bash
cd web
npm ci
npm run dev
```

The frontend server starts on <http://localhost:3000>.

## Development and Testing

### Backend Commands

| Command | Action |
|---|---|
| `make install` | Install Python dependencies via Poetry |
| `make run` | Start the FastAPI backend on port 8000 |
| `make lint` | Run `poetry check`, `ruff`, and `mypy` |
| `make format` | Format code using `ruff format` and `ruff check --fix` |
| `make test` | Run all pytest test suites |
| `make test-unit` | Run unit tests only (`tests/unit`) |
| `make test-integration` | Run integration tests only (`tests/integration`) |
| `make test-coverage` | Run tests with coverage reports (XML and terminal) |
| `make build` | Build the API Docker image locally |

### Frontend Commands

From the `web/` directory:

| Command | Action |
|---|---|
| `npm run dev` | Start the Vite development server on port 3000 |
| `npm run build` | Type-check and compile the production build into `dist/` |
| `npm run lint` | Lint frontend code using `oxlint` |
| `npm test` | Run frontend tests with `vitest` |
| `npm run preview` | Preview production build locally |

## API Documentation

When the backend is running, API specifications are accessible at:

- Swagger UI: <http://localhost:8000/docs> (or port 8001 under Docker Compose)
- ReDoc: <http://localhost:8000/redoc> (or port 8001 under Docker Compose)
- Health Check: `GET http://localhost:8000/health`

## CI/CD and Container Registry

GitHub Actions workflows run on pushes to `main`, tags matching `v*.*.*`, and pull requests:

- `.github/workflows/api.yml`: Lints and tests backend code, builds the container, and publishes `ghcr.io/datogoglidze/github-workflow-dispatcher`.
- `.github/workflows/web.yml`: Lints, tests, and builds frontend code, then builds and publishes `ghcr.io/datogoglidze/github-workflow-dispatcher-web`.
