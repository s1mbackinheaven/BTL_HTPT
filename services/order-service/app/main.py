from fastapi import FastAPI

from app.config import settings
from app.database import Base, engine
from app.models.order import Order
from app.routers.orders import router as orders_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.SERVICE_NAME)
app.include_router(orders_router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.SERVICE_NAME}
