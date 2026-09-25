from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.core.schedules.entities import Schedule

_logger = logging.getLogger(__name__)


@dataclass
class SchedulerService:
    """In-memory APScheduler wrapper. Jobs are not persisted by APScheduler itself."""

    uow_factory: Callable[[], Any]
    sync_interval_hours: int = 6
    dispatcher_service: Any = None
    sync_service: Any = None

    def __post_init__(self) -> None:
        self._scheduler = AsyncIOScheduler(timezone=UTC)

    def start(self) -> None:
        with self.uow_factory() as uow:
            enabled = uow.schedules.read_many(limit=None, is_enabled=True)
        for schedule in enabled:
            self.add_or_update_schedule_job(schedule)
        if self.sync_interval_hours > 0:
            self._scheduler.add_job(
                self._run_periodic_sync,
                trigger=IntervalTrigger(hours=self.sync_interval_hours),
                id="periodic_repository_sync",
                replace_existing=True,
                misfire_grace_time=300,
                coalesce=True,
                max_instances=1,
            )
        self._scheduler.start()
        _logger.info("Scheduler started")

    def add_or_update_schedule_job(self, schedule: Schedule) -> None:
        if not schedule.is_enabled:
            self.remove_schedule_job(schedule.id)
            return
        self._scheduler.add_job(
            self._run_schedule,
            trigger=CronTrigger.from_crontab(schedule.cron_expression, timezone=UTC),
            args=[schedule.id],
            id=f"schedule_{schedule.id}",
            replace_existing=True,
            misfire_grace_time=300,
            coalesce=True,
            max_instances=1,
        )

    def remove_schedule_job(self, schedule_id: str) -> None:
        job_id = f"schedule_{schedule_id}"
        if self._scheduler.get_job(job_id) is not None:
            self._scheduler.remove_job(job_id)

    def shutdown(self) -> None:
        if self._scheduler.running:
            self._scheduler.shutdown(wait=False)

    def get_status(self) -> dict[str, Any]:
        jobs = self._scheduler.get_jobs()
        return {
            "is_running": self._scheduler.running,
            "jobs_count": len(jobs),
            "jobs": [
                {"id": job.id, "next_run_time": job.next_run_time} for job in jobs
            ],
        }

    async def _run_schedule(self, schedule_id: str) -> None:
        try:
            if self.dispatcher_service is None:
                _logger.error("Dispatcher is not configured")
                return
            await self.dispatcher_service.dispatch(schedule_id)
        except Exception:
            _logger.exception("Scheduled dispatch failed for %s", schedule_id)

    async def _run_periodic_sync(self) -> None:
        try:
            if self.sync_service is None:
                _logger.error("Sync service is not configured")
                return
            await self.sync_service.sync_all()
        except Exception:
            _logger.exception("Periodic repository sync failed")
