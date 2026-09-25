# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1: Builder — export pinned requirements
# ---------------------------------------------------------------------------
FROM python:3.13-slim AS builder

WORKDIR /build

RUN pip install --no-cache-dir poetry poetry-plugin-export

COPY pyproject.toml poetry.lock ./

RUN poetry export --without-hashes --only main -f requirements.txt -o requirements.txt \
    && python -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# ---------------------------------------------------------------------------
# Stage 2: Runtime
# ---------------------------------------------------------------------------
FROM python:3.13-slim AS runtime

ENV PATH=/opt/venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    WORKFLOW_DISPATCHER_DATABASE_URL=sqlite:////var/databases/github_workflow_dispatcher.sqlite

ARG RELEASE=unknown
ENV RELEASE=$RELEASE

WORKDIR /code

# Copy the virtual environment and application source
COPY --from=builder /opt/venv /opt/venv
COPY app/ ./app/
COPY migrations/ ./migrations/
COPY alembic.ini ./

# Create database directory owned by the app user, then declare it as a volume
RUN addgroup --system appgroup \
    && adduser --system --ingroup appgroup appuser \
    && mkdir -p /var/databases \
    && chown appuser:appgroup /var/databases

USER appuser

VOLUME ["/var/databases"]

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')"

CMD ["python", "-m", "app.runner", "--host", "0.0.0.0", "--port", "8000"]
