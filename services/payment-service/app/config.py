import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    SERVICE_NAME: str = "payment-service"
    SERVICE_PORT: int = int(os.getenv("PAYMENT_SERVICE_PORT", "8005"))
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "")
    PAYMENT_DB_NAME: str = os.getenv("PAYMENT_DB_NAME", "payment_db")
    ORDER_SERVICE_URL: str = os.getenv("ORDER_SERVICE_URL", "http://localhost:8003")
    RABBITMQ_URL: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")


settings = Settings()
