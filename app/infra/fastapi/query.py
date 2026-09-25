from __future__ import annotations

from typing import Any


def parse_query_filters(query_params: Any) -> dict[str, Any]:
    """Parse FastAPI query parameters into filter kwargs and sort_by list.

    Converts ``field[op]=v`` → ``field__op=v``.
    Repeated keys are turned into a list.
    ``sort`` is returned as ``sort_by``: a comma-separated list split into parts.
    """
    filters: dict[str, Any] = {}
    sort_by: list[str] | None = None

    for raw_key, value in query_params.multi_items():
        if raw_key == "sort":
            sort_by = [s.strip() for s in value.split(",") if s.strip()]
            continue

        if "[" in raw_key and raw_key.endswith("]"):
            field, op_part = raw_key[:-1].split("[", 1)
            key = f"{field}__{op_part}"
        else:
            key = raw_key

        # skip pagination/sort params that belong to the route itself
        if key in ("limit", "offset"):
            continue

        if key in filters:
            existing = filters[key]
            if isinstance(existing, list):
                existing.append(value)
            else:
                filters[key] = [existing, value]
        else:
            filters[key] = value

    return {"sort_by": sort_by, **filters}
