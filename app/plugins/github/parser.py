from __future__ import annotations

import logging
from typing import Any

import yaml

_logger = logging.getLogger(__name__)


def is_workflow_dispatchable(yaml_text: str) -> bool:
    """Return True if the workflow YAML declares a workflow_dispatch trigger."""
    try:
        doc: Any = yaml.safe_load(yaml_text)
    except Exception:
        return False

    if not isinstance(doc, dict):
        return False

    # `on:` in YAML without quotes parses as the boolean True key
    trigger = doc.get("on") or doc.get(True)
    if trigger is None:
        return False

    if isinstance(trigger, str):
        return trigger == "workflow_dispatch"
    if isinstance(trigger, list):
        return "workflow_dispatch" in trigger
    if isinstance(trigger, dict):
        return "workflow_dispatch" in trigger
    return False
