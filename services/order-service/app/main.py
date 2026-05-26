from fastapi import FastAPI

from app.config import settings
from app.database import Base, engine
from app.logging_utils import configure_logging, get_logger
from app.middleware import RequestLoggingMiddleware
from app.models.order import Order
from app.routers.orders import router as orders_router

configure_logging("order-service")
logger = get_logger("order-service")

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.SERVICE_NAME)
app.add_middleware(RequestLoggingMiddleware)
app.include_router(orders_router)


@app.get("/health")
def health_check():
    logger.info("health check requested")
    return {"status": "ok", "service": settings.SERVICE_NAME}
