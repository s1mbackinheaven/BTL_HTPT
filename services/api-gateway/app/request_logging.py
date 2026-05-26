import time
from collections.abc import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.correlation import get_request_id, set_request_id
from app.logging_utils import get_logger, log_request

logger = get_logger("api-gateway.http")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        request_id = request.headers.get("x-request-id") or get_request_id()
        set_request_id(request_id)
        start = time.perf_counter()
        response: Response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000
        response.headers["x-request-id"] = request_id
        log_request(logger, request.method, request.url.path, response.status_code, elapsed_ms, extra={"request_id": request_id})
        return response
