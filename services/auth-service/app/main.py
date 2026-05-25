from fastapi import FastAPI

from app.config import settings
from app.database import Base, engine
from app.models.user import User
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.SERVICE_NAME)
app.include_router(auth_router)
app.include_router(users_router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.SERVICE_NAME}
