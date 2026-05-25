from fastapi import FastAPI

from config import settings

app = FastAPI(title=settings.SERVICE_NAME)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.SERVICE_NAME}
