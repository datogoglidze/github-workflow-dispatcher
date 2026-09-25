from __future__ import annotations

import asyncio
import time


class TokenBucketRateLimiter:
    """Async token bucket rate limiter.

    Args:
        rate: tokens replenished per second.
        capacity: maximum burst capacity (bucket size).
    """

    def __init__(self, rate: float, capacity: float) -> None:
        self._rate = rate
        self._capacity = capacity
        self._tokens = float(capacity)
        self._last_refill = time.monotonic()
        self._lock = asyncio.Lock()

    def _refill(self) -> None:
        now = time.monotonic()
        elapsed = now - self._last_refill
        self._tokens = min(self._capacity, self._tokens + elapsed * self._rate)
        self._last_refill = now

    @property
    def rate_per_second(self) -> float:
        return self._rate

    @property
    def capacity(self) -> float:
        return self._capacity

    @property
    def current_tokens(self) -> float:
        return self._tokens

    async def acquire(self) -> None:
        async with self._lock:
            self._refill()
            if self._tokens >= 1.0:
                self._tokens -= 1.0
                return
            # Wait for enough tokens
            deficit = 1.0 - self._tokens
            wait_time = deficit / self._rate
        await asyncio.sleep(wait_time)
        async with self._lock:
            self._refill()
            self._tokens = max(0.0, self._tokens - 1.0)
