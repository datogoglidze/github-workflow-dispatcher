from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from app.core.repositories.entities import Repository
from app.core.workflows.entities import Workflow
from app.plugins.github.client import GitHubClient
from app.plugins.github.parser import is_workflow_dispatchable

_logger = logging.getLogger(__name__)


@dataclass
class SyncResult:
    repositories_synced: int
    workflows_synced: int
    workflows_marked_deleted: int


@dataclass
class SyncService:
    uow_factory: Callable[[], Any]
    github_client: GitHubClient

    async def sync_all(self) -> SyncResult:
        # ----------------------------------------------------------------
        # Phase 1: Fetch everything from GitHub BEFORE opening the UoW
        # ----------------------------------------------------------------
        _logger.info(
            "Fetching repositories from GitHub org: %s", self.github_client.org
        )
        gh_repos = await self.github_client.list_org_repositories()
        _logger.info("Found %d repositories", len(gh_repos))

        # Map: github_repository_id -> repo data
        repo_data: dict[int, dict[str, Any]] = {}
        for r in gh_repos:
            repo_data[r["id"]] = r

        # Fetch workflows and file content for each repo
        # Map: github_repository_id -> list of workflow dicts
        repo_workflows: dict[int, list[dict[str, Any]]] = {}
        # Map: (github_repository_id, github_workflow_id) -> (yaml_content, sha)
        workflow_files: dict[tuple[int, int], tuple[str | None, str | None]] = {}

        for r in gh_repos:
            owner = r["owner"]["login"]
            repo_name = r["name"]
            gh_repo_id = r["id"]
            workflows = await self.github_client.list_repo_workflows(owner, repo_name)
            repo_workflows[gh_repo_id] = workflows
            for wf in workflows:
                content, sha = await self.github_client.get_workflow_file(
                    owner, repo_name, wf["path"]
                )
                workflow_files[(gh_repo_id, wf["id"])] = (content, sha)

        # ----------------------------------------------------------------
        # Phase 2: Write in a single synchronous UoW block
        # ----------------------------------------------------------------
        now = datetime.now(UTC)
        repos_synced = 0
        wfs_synced = 0
        wfs_deleted = 0

        with self.uow_factory() as uow:
            # --- Upsert repositories ---
            # Load existing repos by github_repository_id
            existing_repos = uow.repositories.read_many(limit=None)
            existing_by_gh_id: dict[int, Repository] = {
                r.github_repository_id: r
                for r in existing_repos
                if r.github_repository_id is not None
            }

            gh_repo_ids_seen: set[int] = set()
            repo_id_by_gh_id: dict[int, str] = {}  # github_repo_id -> our UUID

            for gh_id, r in repo_data.items():
                gh_repo_ids_seen.add(gh_id)
                new_entity = Repository(
                    name=r["name"],
                    full_name=r["full_name"],
                    default_branch=r.get("default_branch", "main"),
                    github_repository_id=gh_id,
                    is_active=True,
                    last_synced_at=now,
                    url=r.get("html_url"),
                )
                if gh_id in existing_by_gh_id:
                    existing = existing_by_gh_id[gh_id]
                    updated = Repository(
                        id=existing.id,
                        name=new_entity.name,
                        full_name=new_entity.full_name,
                        default_branch=new_entity.default_branch,
                        github_repository_id=gh_id,
                        is_active=True,
                        last_synced_at=now,
                        url=new_entity.url,
                    )
                    uow.repositories.update_one(existing.id, updated)
                    repo_id_by_gh_id[gh_id] = existing.id
                else:
                    created = uow.repositories.create_one(new_entity)
                    repo_id_by_gh_id[gh_id] = created.id
                repos_synced += 1

            # Mark repos no longer on GitHub as inactive
            for gh_id, existing in existing_by_gh_id.items():
                if gh_id not in gh_repo_ids_seen:
                    inactive = Repository(
                        id=existing.id,
                        name=existing.name,
                        full_name=existing.full_name,
                        default_branch=existing.default_branch,
                        github_repository_id=existing.github_repository_id,
                        is_active=False,
                        last_synced_at=existing.last_synced_at,
                        url=existing.url,
                    )
                    uow.repositories.update_one(existing.id, inactive)

            # --- Upsert workflows ---
            # Load all existing workflows for the repos we're syncing
            existing_workflows = uow.workflows.read_many(limit=None)
            # key: (repo_id, github_workflow_id) -> Workflow
            existing_wf_map: dict[tuple[str, int], Workflow] = {
                (w.repo_id, w.github_workflow_id): w for w in existing_workflows
            }
            seen_wf_keys: set[tuple[str, int]] = set()

            for gh_repo_id, workflows in repo_workflows.items():
                repo_id = repo_id_by_gh_id.get(gh_repo_id)
                if repo_id is None:
                    continue
                for wf in workflows:
                    gh_wf_id = wf["id"]
                    key = (repo_id, gh_wf_id)
                    seen_wf_keys.add(key)

                    content, sha = workflow_files.get(
                        (gh_repo_id, gh_wf_id), (None, None)
                    )
                    existing_wf = existing_wf_map.get(key)

                    # Determine dispatchable: reuse if SHA unchanged
                    if (
                        existing_wf is not None
                        and existing_wf.sha is not None
                        and existing_wf.sha == sha
                    ):
                        is_dispatchable = existing_wf.is_dispatchable
                    else:
                        is_dispatchable = (
                            is_workflow_dispatchable(content) if content else False
                        )

                    new_wf = Workflow(
                        repo_id=repo_id,
                        github_workflow_id=gh_wf_id,
                        name=wf.get("name", ""),
                        path=wf.get("path", ""),
                        state=wf.get("state", "active"),
                        is_dispatchable=is_dispatchable,
                        sha=sha,
                        url=wf.get("html_url"),
                    )

                    if existing_wf is not None:
                        updated_wf = Workflow(
                            id=existing_wf.id,
                            repo_id=repo_id,
                            github_workflow_id=gh_wf_id,
                            name=new_wf.name,
                            path=new_wf.path,
                            state=new_wf.state,
                            is_dispatchable=new_wf.is_dispatchable,
                            sha=new_wf.sha,
                            url=new_wf.url,
                        )
                        uow.workflows.update_one(existing_wf.id, updated_wf)
                    else:
                        uow.workflows.create_one(new_wf)
                    wfs_synced += 1

            # Mark deleted workflows
            for key, existing_wf in existing_wf_map.items():
                if key not in seen_wf_keys and existing_wf.state != "deleted":
                    deleted_wf = Workflow(
                        id=existing_wf.id,
                        repo_id=existing_wf.repo_id,
                        github_workflow_id=existing_wf.github_workflow_id,
                        name=existing_wf.name,
                        path=existing_wf.path,
                        state="deleted",
                        is_dispatchable=False,
                        sha=existing_wf.sha,
                        url=existing_wf.url,
                    )
                    uow.workflows.update_one(existing_wf.id, deleted_wf)
                    wfs_deleted += 1

        return SyncResult(
            repositories_synced=repos_synced,
            workflows_synced=wfs_synced,
            workflows_marked_deleted=wfs_deleted,
        )
