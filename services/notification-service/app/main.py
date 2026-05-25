import logging
import threading

from fastapi import FastAPI

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.messaging import start_consumer
from app.models.notification import Notification
from app.routers.notifications import router as notifications_router

logging.basicConfig(level=logging.INFO)

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.SERVICE_NAME)
app.include_router(notifications_router)


@app.on_event("startup")
def startup_event():
    consumer_thread = threading.Thread(target=start_consumer, args=(SessionLocal,), daemon=True)
    consumer_thread.start()


@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.SERVICE_NAME}
