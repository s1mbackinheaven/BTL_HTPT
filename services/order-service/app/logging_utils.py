import logging
import sys
from pathlib import Path
from typing import Any


LOG_FORMAT = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
LOG_DIR = Path(__file__).resolve().parent.parent / "logs"


def _ensure_log_dir() -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)


def configure_logging(service_name: str = "app") -> None:
    _ensure_log_dir()
    logger = logging.getLogger()
    logger.handlers.clear()
    logger.setLevel(logging.INFO)

    formatter = logging.Formatter(LOG_FORMAT)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)

    file_handler = logging.FileHandler(LOG_DIR / f"{service_name}.log", encoding="utf-8")
    file_handler.setFormatter(formatter)

    logger.addHandler(console_handler)
    logger.addHandler(file_handler)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def log_request(
    logger: logging.Logger,
    method: str,
    path: str,
    status_code: int | None = None,
    elapsed_ms: float | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    parts = [f"request_id={extra.get('request_id', '-') if extra else '-'}", f"method={method}", f"path={path}"]
    if status_code is not None:
        parts.append(f"status_code={status_code}")
    if elapsed_ms is not None:
        parts.append(f"elapsed_ms={elapsed_ms:.2f}")
    if extra:
        for key, value in extra.items():
            if key != "request_id":
                parts.append(f"{key}={value}")
    logger.info("request | %s", " | ".join(parts))
