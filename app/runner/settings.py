from __future__ import annotations

import logging
from functools import cached_property

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {
        "env_file": ".env",
        "env_prefix": "WORKFLOW_DISPATCHER_",
        "extra": "ignore",
    }

    log_level: str = "INFO"
    frontend_origins: str = "*"
    database_url: str = "sqlite:///./github_workflow_dispatcher.sqlite"
    database_migrate: bool = True

    # GitHub App
    github_org: str = ""
    github_app_id: str = ""
    github_app_installation_id: int = 0
    github_app_private_key: str = ""

    # Rate limiting
    rate_limit_per_second: float = 3.0
    rate_limit_burst: int = 5

    @cached_property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.frontend_origins.split(",") if o.strip()]

    @cached_property
    def github_private_key_pem(self) -> str:
        """Replace literal \\n with real newlines (useful for env var injection)."""
        return self.github_app_private_key.replace("\\n", "\n")


_logger = logging.getLogger(__name__)
