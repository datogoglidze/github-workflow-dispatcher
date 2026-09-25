from __future__ import annotations

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Health check response schema.

    Later steps will add database, scheduler, and rate-limiter fields.
    """

    status: str
