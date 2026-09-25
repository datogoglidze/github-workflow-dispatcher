from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Generic, TypeVar

from sqlalchemy import Boolean, asc, desc, func, inspect, select
from sqlalchemy.orm import Session

from app.infra.sqlite import Base

ModelT = TypeVar("ModelT", bound=Base)
EntityT = TypeVar("EntityT")

_BOOL_TRUE = {"true", "1", "yes"}
_BOOL_FALSE = {"false", "0", "no"}


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
    # Query engine
    # ------------------------------------------------------------------

    def _resolve_column(self, field: str) -> Any:
        """Return (column, join_model_or_None) for a field name or dot-path."""
        if "." not in field:
            mapper = inspect(self.model)
            if field not in {c.key for c in mapper.columns}:
                raise ValueError(f"Unknown filter field: '{field}'")
            return getattr(self.model, field), None

        parts = field.split(".", 1)
        rel_name, rel_field = parts[0], parts[1]
        mapper = inspect(self.model)
        rel_prop = mapper.relationships.get(rel_name)
        if rel_prop is None or not rel_prop.info.get("filterable"):
            raise ValueError(f"Unknown or non-filterable relationship: '{rel_name}'")
        related_model = rel_prop.mapper.class_
        rel_mapper = inspect(related_model)
        if rel_field not in {c.key for c in rel_mapper.columns}:
            raise ValueError(f"Unknown field '{rel_field}' on '{rel_name}'")
        return getattr(related_model, rel_field), related_model

    def _coerce_value(self, column: Any, value: Any) -> Any:
        """Coerce string 'true'/'false' to bool when the column is Boolean."""
        try:
            col_type = column.property.columns[0].type
        except Exception:
            return value
        if isinstance(col_type, Boolean) and isinstance(value, str):
            if value.lower() in _BOOL_TRUE:
                return True
            if value.lower() in _BOOL_FALSE:
                return False
        return value

    def _apply_filters(self, stmt: Any, **filters: Any) -> Any:
        """Apply filters with optional operator suffix (field__op)."""
        joins: set[Any] = set()
        for key, value in filters.items():
            if "__" in key:
                field, op = key.rsplit("__", 1)
            else:
                field, op = key, "eq"

            column, join_model = self._resolve_column(field)

            if join_model is not None and join_model not in joins:
                stmt = stmt.join(join_model, isouter=True)
                joins.add(join_model)

            value = self._coerce_value(column, value)

            if op == "eq":
                stmt = stmt.where(column == value)
            elif op == "ne":
                stmt = stmt.where(column != value)
            elif op == "ilike":
                stmt = stmt.where(column.ilike(value))
            elif op == "in":
                vals = value if isinstance(value, list) else [value]
                stmt = stmt.where(column.in_(vals))
            elif op == "lt":
                stmt = stmt.where(column < value)
            elif op == "gt":
                stmt = stmt.where(column > value)
            elif op == "has":
                # dot-path relationship filter via .has()
                rel_attr = getattr(self.model, field.split(".")[0])
                rel_col_name = field.split(".")[1]
                related_model = rel_attr.property.mapper.class_
                rel_column = getattr(related_model, rel_col_name)
                stmt = stmt.where(rel_attr.has(rel_column == value))
            else:
                raise ValueError(f"Unknown filter operator: '{op}'")
        return stmt

    def _apply_sort(self, stmt: Any, sort_by: list[str]) -> Any:
        joins: set[Any] = set()
        for sort_key in sort_by:
            descending = sort_key.startswith("-")
            field = sort_key.lstrip("-")
            column, join_model = self._resolve_column(field)
            if join_model is not None and join_model not in joins:
                stmt = stmt.join(join_model, isouter=True)
                joins.add(join_model)
            stmt = stmt.order_by(desc(column) if descending else asc(column))
        return stmt

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def read_many(
        self,
        limit: int | None = None,
        offset: int | None = None,
        sort_by: list[str] | None = None,
        **filters: Any,
    ) -> list[EntityT]:
        stmt = select(self.model)
        stmt = self._apply_filters(stmt, **filters)
        if sort_by:
            stmt = self._apply_sort(stmt, sort_by)
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
