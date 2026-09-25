from __future__ import annotations

import asyncio
import base64
import datetime
import logging
import time
from dataclasses import dataclass, field
from typing import Any

import httpx
import jwt

from app.core.dispatcher.limiter import TokenBucketRateLimiter
from app.core.errors import GitHubApiError, GitHubNotConfiguredError

_logger = logging.getLogger(__name__)

_GITHUB_API = "https://api.github.com"
_DEFAULT_HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}
_MAX_RETRIES = 3


@dataclass
class _TokenCache:
    token: str
    expires_at: float  # monotonic


@dataclass
class GitHubClient:
    app_id: str
    private_key: str
    org: str
    installation_id: int
    rate_limiter: TokenBucketRateLimiter

    _token_cache: _TokenCache | None = field(default=None, init=False, repr=False)
    _resolved_installation_id: int = field(default=0, init=False, repr=False)

    def _check_configured(self) -> None:
        missing = []
        if not self.org:
            missing.append("github_org")
        if not self.app_id:
            missing.append("github_app_id")
        if not self.private_key:
            missing.append("github_app_private_key")
        if missing:
            raise GitHubNotConfiguredError(missing=missing)

    def _make_jwt(self) -> str:
        now = int(time.time())
        payload = {
            "iat": now - 60,
            "exp": now + 600,
            "iss": self.app_id,
        }
        return jwt.encode(payload, self.private_key, algorithm="RS256")

    async def _get_installation_id(self) -> int:
        if self._resolved_installation_id:
            return self._resolved_installation_id
        if self.installation_id != 0:
            self._resolved_installation_id = self.installation_id
            return self.installation_id
        token = self._make_jwt()
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{_GITHUB_API}/orgs/{self.org}/installation",
                headers={**_DEFAULT_HEADERS, "Authorization": f"Bearer {token}"},
            )
        if resp.status_code != 200:
            raise GitHubApiError(resp.status_code, resp.text)
        data = resp.json()
        self._resolved_installation_id = int(data["id"])
        return self._resolved_installation_id

    async def _get_access_token(self) -> str:
        now = time.monotonic()
        if self._token_cache and self._token_cache.expires_at > now:
            return self._token_cache.token

        inst_id = await self._get_installation_id()
        jwt_token = self._make_jwt()
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{_GITHUB_API}/app/installations/{inst_id}/access_tokens",
                headers={**_DEFAULT_HEADERS, "Authorization": f"Bearer {jwt_token}"},
            )
        if resp.status_code not in (200, 201):
            raise GitHubApiError(resp.status_code, resp.text)

        data = resp.json()
        # GitHub returns ISO 8601; convert to a monotonic deadline with a 5-min buffer
        raw_expires = data.get("expires_at", "")
        try:
            dt = datetime.datetime.fromisoformat(raw_expires.replace("Z", "+00:00"))
            utc_now = datetime.datetime.now(datetime.UTC)
            ttl = (dt - utc_now).total_seconds() - 300  # 5-min buffer
        except Exception:
            ttl = 3300  # fallback: ~55 min

        self._token_cache = _TokenCache(
            token=data["token"],
            expires_at=now + max(ttl, 60),
        )
        return self._token_cache.token

    async def _request(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        self._check_configured()
        for attempt in range(_MAX_RETRIES):
            await self.rate_limiter.acquire()
            token = await self._get_access_token()
            headers = {**_DEFAULT_HEADERS, "Authorization": f"Bearer {token}"}
            async with httpx.AsyncClient() as client:
                resp = await client.request(method, url, headers=headers, **kwargs)

            if resp.status_code in (403, 429):
                retry_after = float(resp.headers.get("Retry-After", "60"))
                if attempt < _MAX_RETRIES - 1:
                    _logger.warning(
                        "Rate-limited by GitHub (attempt %d/%d), waiting %.1fs",
                        attempt + 1,
                        _MAX_RETRIES,
                        retry_after,
                    )
                    await asyncio.sleep(retry_after)
                    continue
            return resp
        return resp  # last attempt result

    async def list_org_repositories(self) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        page = 1
        while True:
            resp = await self._request(
                "GET",
                f"{_GITHUB_API}/orgs/{self.org}/repos",
                params={"per_page": 100, "page": page},
            )
            if resp.status_code != 200:
                raise GitHubApiError(resp.status_code, resp.text)
            batch: list[dict[str, Any]] = resp.json()
            if not batch:
                break
            for repo in batch:
                if not repo.get("archived") and not repo.get("disabled"):
                    results.append(repo)
            if len(batch) < 100:
                break
            page += 1
        return results

    async def list_repo_workflows(self, owner: str, repo: str) -> list[dict[str, Any]]:
        resp = await self._request(
            "GET",
            f"{_GITHUB_API}/repos/{owner}/{repo}/actions/workflows",
            params={"per_page": 100},
        )
        if resp.status_code == 404:
            return []
        if resp.status_code != 200:
            raise GitHubApiError(resp.status_code, resp.text)
        data = resp.json()
        return data.get("workflows", [])

    async def get_workflow_file(
        self, owner: str, repo: str, path: str
    ) -> tuple[str | None, str | None]:
        resp = await self._request(
            "GET",
            f"{_GITHUB_API}/repos/{owner}/{repo}/contents/{path}",
        )
        if resp.status_code == 404:
            return None, None
        if resp.status_code != 200:
            raise GitHubApiError(resp.status_code, resp.text)
        data = resp.json()
        encoded = data.get("content", "")
        sha = data.get("sha")
        try:
            content = base64.b64decode(encoded).decode("utf-8")
        except Exception:
            content = None
        return content, sha
