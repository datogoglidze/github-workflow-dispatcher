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

    @cached_property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.frontend_origins.split(",") if o.strip()]


_logger = logging.getLogger(__name__)
