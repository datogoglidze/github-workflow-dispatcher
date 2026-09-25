from __future__ import annotations

import typer

from app.infra.logging import configure_logging
from app.runner.fastapi import UvicornServer
from app.runner.settings import Settings

cli = typer.Typer(no_args_is_help=True, add_completion=False)


@cli.command()
def run(
    host: str = typer.Option("0.0.0.0", help="Bind host"),
    port: int = typer.Option(8000, help="Bind port"),
    root_path: str = typer.Option("", help="ASGI root path (behind a proxy)"),
) -> None:
    """Start the github-workflow-dispatcher API server."""
    settings = Settings()
    configure_logging(settings.log_level)

    from app.runner.app import create_app

    api = create_app(settings)

    UvicornServer().with_host(host).with_port(port).with_path(root_path).run(api)
