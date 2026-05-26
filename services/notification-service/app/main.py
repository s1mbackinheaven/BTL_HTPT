import threading

from fastapi import FastAPI

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.logging_utils import configure_logging, get_logger
from app.messaging import start_consumer
from app.middleware import RequestLoggingMiddleware
from app.models.notification import Notification
from app.routers.notifications import router as notifications_router

configure_logging("notification-service")
logger = get_logger("notification-service")

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.SERVICE_NAME)
app.add_middleware(RequestLoggingMiddleware)
app.include_router(notifications_router)


@app.on_event("startup")
def startup_event():
    logger.info("starting notification consumer thread")
    consumer_thread = threading.Thread(target=start_consumer, args=(SessionLocal,), daemon=True)
    consumer_thread.start()


@app.get("/health")
def health_check():
    logger.info("health check requested")
    return {"status": "ok", "service": settings.SERVICE_NAME}
