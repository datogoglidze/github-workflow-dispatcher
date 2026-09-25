from __future__ import annotations

from dataclasses import dataclass


@dataclass
class DoesNotExistError(Exception):
    entity: str
    id: str

    def __str__(self) -> str:
        return f"{self.entity} with id '{self.id}' not found"


@dataclass
class ExistsError(Exception):
    entity: str
    field: str
    value: str

    def __str__(self) -> str:
        return f"{self.entity} with {self.field} '{self.value}' already exists"
