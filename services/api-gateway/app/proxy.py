import json
from collections.abc import Mapping

import httpx
from fastapi import HTTPException, Request, status


async def forward_request(
    request: Request,
    target_url: str,
    path_suffix: str = "",
    *,
    json_body: dict | None = None,
    form_body: dict | None = None,
) -> httpx.Response:
    url = f"{target_url.rstrip('/')}/{path_suffix.lstrip('/')}"
    query_string = request.url.query
    if query_string:
        url = f"{url}?{query_string}"

    headers = {k: v for k, v in request.headers.items() if k.lower() not in {"host", "content-length", "content-type"}}
    kwargs: dict = {"method": request.method, "url": url, "headers": headers}
    if json_body is not None:
        kwargs["json"] = json_body
        headers["content-type"] = "application/json"
    elif form_body is not None:
        kwargs["data"] = form_body
        headers["content-type"] = "application/x-www-form-urlencoded"
    else:
        body = await request.body()
        if body:
            kwargs["content"] = body

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            upstream = await client.request(**kwargs)
        except httpx.RequestError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Upstream service unavailable: {exc}") from exc

    response_headers = {
        k: v
        for k, v in upstream.headers.items()
        if k.lower() not in {"content-length", "transfer-encoding", "connection", "content-encoding"}
    }
    return httpx.Response(
        status_code=upstream.status_code,
        headers=response_headers,
        content=upstream.content,
        request=upstream.request,
    )
