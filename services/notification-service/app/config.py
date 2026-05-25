import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    SERVICE_NAME: str = "notification-service"
    SERVICE_PORT: int = int(os.getenv("NOTIFICATION_SERVICE_PORT", "8004"))
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT", "3307"))
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "adminmySQL2004")
    NOTIFICATION_DB_NAME: str = os.getenv("NOTIFICATION_DB_NAME", "notification_db")
    RABBITMQ_URL: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")


settings = Settings()
