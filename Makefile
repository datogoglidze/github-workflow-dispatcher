.PHONY: help install lock update format lint test test-unit test-integration test-coverage run build

help:
	poetry run python -m app.runner --help

install:
	pip install --upgrade pip poetry
	poetry install --no-root

lock:
	poetry lock

update:
	poetry update

format:
	poetry run ruff format app tests
	poetry run ruff check app tests --fix

lint:
	poetry check --strict
	poetry run ruff format --check app tests
	poetry run ruff check app tests
	poetry run mypy app tests

test:
	poetry run pytest tests

test-unit:
	poetry run pytest tests/unit

test-integration:
	poetry run pytest tests/integration

test-coverage:
	poetry run pytest tests --cov=app --cov-report=term-missing --cov-report=xml

run:
	poetry run python -m app.runner --host 0.0.0.0 --port 8000

build:
	docker build -t github-workflow-dispatcher:latest --build-arg RELEASE=$$(git rev-parse --short HEAD) .
