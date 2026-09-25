from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Generic, TypeVar

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.infra.sqlite import Base

ModelT = TypeVar("ModelT", bound=Base)
EntityT = TypeVar("EntityT")


@dataclass
class BaseSqliteRepository(Generic[ModelT, EntityT]):  # noqa: UP046
    session: Session
    model: type[ModelT]

    # ------------------------------------------------------------------
    # Subclass contract
    # ------------------------------------------------------------------

    def _serialize(self, entity: EntityT) -> ModelT:  # pragma: no cover
        raise NotImplementedError

    def _load(self, model: ModelT) -> EntityT:  # pragma: no cover
        raise NotImplementedError

    # ------------------------------------------------------------------
    # Filter helper — exact equality on columns only
    # Step 3 replaces this with a full query engine.
    # ------------------------------------------------------------------

    def _apply_filters(self, stmt: Any, **filters: Any) -> Any:
        for key, value in filters.items():
            column = getattr(self.model, key)
            stmt = stmt.where(column == value)
        return stmt

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def read_many(
        self,
        limit: int | None = None,
        offset: int | None = None,
        **filters: Any,
    ) -> list[EntityT]:
        stmt = select(self.model)
        stmt = self._apply_filters(stmt, **filters)
        if offset is not None:
            stmt = stmt.offset(offset)
        if limit is not None:
            stmt = stmt.limit(limit)
        rows: list[ModelT] = list(self.session.execute(stmt).scalars().all())
        return [self._load(row) for row in rows]

    def read_one(self, id: str) -> EntityT | None:  # noqa: A002
        row = self.session.get(self.model, id)
        if row is None:
            return None
        return self._load(row)

    def count(self, **filters: Any) -> int:
        stmt = select(func.count()).select_from(self.model)
        stmt = self._apply_filters(stmt, **filters)
        result: int = self.session.execute(stmt).scalar_one()
        return result

    def exists(self, **filters: Any) -> bool:
        return self.count(**filters) > 0

    def create_one(self, entity: EntityT) -> EntityT:
        model = self._serialize(entity)
        self.session.add(model)
        self.session.flush()
        return self._load(model)

    def update_one(self, id: str, entity: EntityT) -> EntityT:  # noqa: A002
        row = self.session.get(self.model, id)
        if row is None:
            raise ValueError(f"Record with id '{id}' not found")
        updated = self._serialize(entity)
        pk_names = {c.key for c in self.model.__table__.primary_key}
        for col in self.model.__table__.columns:
            if col.key not in pk_names:
                setattr(row, col.key, getattr(updated, col.key))
        self.session.flush()
        return self._load(row)

    def delete_one(self, id: str) -> None:  # noqa: A002
        row = self.session.get(self.model, id)
        if row is not None:
            self.session.delete(row)
            self.session.flush()
