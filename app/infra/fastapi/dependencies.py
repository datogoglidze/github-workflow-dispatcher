from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request

from app.core.repositories.service import RepositoriesService


def get_repositories_service(request: Request) -> RepositoriesService:
    """Provide a RepositoriesService backed by the request's database."""
    database = request.app.state.database
    return RepositoriesService(uow=database.uow())


RepositoriesServiceDependency = Annotated[
    RepositoriesService, Depends(get_repositories_service)
]
