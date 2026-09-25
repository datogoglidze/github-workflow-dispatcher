from __future__ import annotations

from dataclasses import dataclass

from app.infra.sqlite.database import Sqlite
from app.runner.settings import Settings


@dataclass(frozen=True)
class AppContainer:
    database: Sqlite

    @classmethod
    def build(cls, settings: Settings) -> AppContainer:
        return cls(
            database=Sqlite(database_url=settings.database_url),
        )
