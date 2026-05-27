import uuid
from contextvars import ContextVar

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")


def get_request_id() -> str:
    request_id = request_id_ctx.get()
    if request_id == "-":
        request_id = str(uuid.uuid4())
        request_id_ctx.set(request_id)
    return request_id


def set_request_id(request_id: str) -> None:
    request_id_ctx.set(request_id or str(uuid.uuid4()))
