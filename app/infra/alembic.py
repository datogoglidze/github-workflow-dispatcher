from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

from alembic import command
from alembic.config import Config

_logger = logging.getLogger(__name__)

# Resolve the migrations directory relative to this file so it works regardless
# of the process working directory.
_MIGRATIONS_DIR = Path(__file__).parent.parent.parent / "migrations"
_ALEMBIC_INI = Path(__file__).parent.parent.parent / "alembic.ini"


@dataclass(frozen=True)
class Alembic:
    config: Config

    @classmethod
    def for_database(cls, url: str) -> Alembic:
        cfg = Config(str(_ALEMBIC_INI))
        cfg.set_main_option("script_location", str(_MIGRATIONS_DIR))
        cfg.set_main_option("sqlalchemy.url", url)
        return cls(config=cfg)

    def upgrade(self, revision: str = "head") -> None:
        command.upgrade(self.config, revision)


def migrate_database(url: str, *, enabled: bool) -> None:
    """Run Alembic migrations if enabled."""
    if not enabled:
        _logger.info("Database migrations disabled; skipping")
        return
    _logger.info("Running database migrations")
    Alembic.for_database(url).upgrade("head")
    _logger.info("Database migrations complete")
