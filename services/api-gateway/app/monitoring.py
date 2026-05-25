from __future__ import annotations

from dataclasses import dataclass
from time import perf_counter

import httpx


@dataclass(frozen=True)
class ServiceCheck:
    name: str
    url: str


async def check_service_health(service: ServiceCheck) -> dict:
    started = perf_counter()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{service.url.rstrip('/')}/health")
        elapsed_ms = round((perf_counter() - started) * 1000, 2)
        status = "healthy" if response.status_code == 200 else "degraded"
        payload = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
        return {
            "name": service.name,
            "url": service.url,
            "status": status,
            "http_status": response.status_code,
            "response_time_ms": elapsed_ms,
            "payload": payload,
            "error": None,
        }
    except Exception as exc:
        elapsed_ms = round((perf_counter() - started) * 1000, 2)
        return {
            "name": service.name,
            "url": service.url,
            "status": "down",
            "http_status": None,
            "response_time_ms": elapsed_ms,
            "payload": None,
            "error": str(exc),
        }
