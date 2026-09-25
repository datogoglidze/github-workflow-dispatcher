from __future__ import annotations

from app.runner.settings import Settings


def test_cors_origins_single_wildcard() -> None:
    s = Settings(frontend_origins="*")
    assert s.cors_origins == ["*"]


def test_cors_origins_multiple_values() -> None:
    s = Settings(frontend_origins="http://localhost:3000, https://example.com")
    assert s.cors_origins == ["http://localhost:3000", "https://example.com"]


def test_cors_origins_strips_whitespace() -> None:
    s = Settings(frontend_origins="  http://a.com  ,  http://b.com  ")
    assert s.cors_origins == ["http://a.com", "http://b.com"]


def test_cors_origins_single_value() -> None:
    s = Settings(frontend_origins="https://myapp.example.com")
    assert s.cors_origins == ["https://myapp.example.com"]


def test_default_log_level() -> None:
    s = Settings()
    assert s.log_level == "INFO"
