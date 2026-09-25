from __future__ import annotations

from app.plugins.github.parser import is_workflow_dispatchable


class TestIsWorkflowDispatchable:
    def test_string_form(self) -> None:
        yaml = "on: workflow_dispatch\njobs: {}"
        assert is_workflow_dispatchable(yaml) is True

    def test_list_form(self) -> None:
        yaml = "on: [push, workflow_dispatch]\njobs: {}"
        assert is_workflow_dispatchable(yaml) is True

    def test_mapping_form(self) -> None:
        yaml = "on:\n  workflow_dispatch:\n  push:\njobs: {}"
        assert is_workflow_dispatchable(yaml) is True

    def test_true_key_quirk(self) -> None:
        # Unquoted `on:` parses the key as boolean True in PyYAML
        yaml = "on:\n  workflow_dispatch:\njobs: {}"
        assert is_workflow_dispatchable(yaml) is True

    def test_no_dispatch(self) -> None:
        yaml = "on: push\njobs: {}"
        assert is_workflow_dispatchable(yaml) is False

    def test_list_without_dispatch(self) -> None:
        yaml = "on: [push, pull_request]\njobs: {}"
        assert is_workflow_dispatchable(yaml) is False

    def test_invalid_yaml(self) -> None:
        assert is_workflow_dispatchable("}{invalid yaml{{") is False

    def test_empty_string(self) -> None:
        assert is_workflow_dispatchable("") is False

    def test_non_dict_yaml(self) -> None:
        assert is_workflow_dispatchable("- item1\n- item2") is False
