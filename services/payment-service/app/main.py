import threading
import time

from fastapi import FastAPI

from app.config import settings
from app.database import Base, engine, ensure_database_exists, SessionLocal
from app.logging_utils import configure_logging, get_logger
from app.messaging import start_consumer
from app.middleware import RequestLoggingMiddleware
from app.models.payment import Payment
from app.routers.payments import router as payments_router

configure_logging("payment-service")
logger = get_logger("payment-service")

app = FastAPI(title=settings.SERVICE_NAME)
app.add_middleware(RequestLoggingMiddleware)
app.include_router(payments_router)


@app.on_event("startup")
def startup_event():
    ensure_database_exists()
    Base.metadata.create_all(bind=engine)
    consumer_thread = threading.Thread(target=start_consumer, args=(SessionLocal,), daemon=True)
    consumer_thread.start()
    logger.info("payment-service startup complete")


@app.get("/health")
def health_check():
    logger.info("health check requested")
    return {"status": "ok", "service": settings.SERVICE_NAME}
