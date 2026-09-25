from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.infra.fastapi.response import ResourceFound

router = APIRouter(tags=["root"])


@router.get("/", response_model=None)
async def root() -> dict[str, Any]:
    return ResourceFound(
        message="Hello, World!",
        service="github-workflow-dispatcher",
        version="0.1.0",
        docs="/docs",
    )
