import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    SERVICE_NAME: str = "api-gateway"
    SERVICE_PORT: int = int(os.getenv("GATEWAY_PORT", "8000"))
    AUTH_SERVICE_URL: str = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")
    PRODUCT_SERVICE_URL: str = os.getenv("PRODUCT_SERVICE_URL", "http://localhost:8002")
    ORDER_SERVICE_URL: str = os.getenv("ORDER_SERVICE_URL", "http://localhost:8003")
    NOTIFICATION_SERVICE_URL: str = os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:8004")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change_me_please")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")


settings = Settings()
