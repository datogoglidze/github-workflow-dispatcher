from __future__ import annotations

from dataclasses import dataclass

from app.core.dispatcher.limiter import TokenBucketRateLimiter
from app.core.dispatcher.service import DispatcherService
from app.core.sync.service import SyncService
from app.infra.sqlite.database import Sqlite
from app.plugins.github.client import GitHubClient
from app.runner.settings import Settings


@dataclass(frozen=True)
class AppContainer:
    database: Sqlite
    rate_limiter: TokenBucketRateLimiter | None = None
    github_client: GitHubClient | None = None
    sync_service: SyncService | None = None
    dispatcher_service: DispatcherService | None = None

    @classmethod
    def build(cls, settings: Settings) -> AppContainer:
        database = Sqlite(database_url=settings.database_url)
        rate_limiter = TokenBucketRateLimiter(
            rate=settings.rate_limit_per_second,
            capacity=settings.rate_limit_burst,
        )
        github_client = GitHubClient(
            app_id=settings.github_app_id,
            private_key=settings.github_private_key_pem,
            org=settings.github_org,
            installation_id=settings.github_app_installation_id,
            rate_limiter=rate_limiter,
        )
        sync_service = SyncService(
            uow_factory=database.uow,
            github_client=github_client,
        )
        dispatcher_service = DispatcherService(
            uow_factory=database.uow,
            github_client=github_client,
        )
        return cls(
            database=database,
            rate_limiter=rate_limiter,
            github_client=github_client,
            sync_service=sync_service,
            dispatcher_service=dispatcher_service,
        )
