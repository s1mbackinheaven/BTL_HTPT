from fastapi import FastAPI

from app.config import settings
from app.database import Base, engine
from app.logging_utils import configure_logging, get_logger
from app.middleware import RequestLoggingMiddleware
from app.models.user import User
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router

configure_logging("auth-service")
logger = get_logger("auth-service")

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.SERVICE_NAME)
app.add_middleware(RequestLoggingMiddleware)
app.include_router(auth_router)
app.include_router(users_router)


@app.get("/health")
def health_check():
    logger.info("health check requested")
    return {"status": "ok", "service": settings.SERVICE_NAME}
