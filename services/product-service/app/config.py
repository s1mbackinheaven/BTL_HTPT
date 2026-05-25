import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    SERVICE_NAME: str = "product-service"
    SERVICE_PORT: int = int(os.getenv("PRODUCT_SERVICE_PORT", "8002"))
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT", "3307"))
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "adminmySQL2004")
    PRODUCT_DB_NAME: str = os.getenv("PRODUCT_DB_NAME", "product_db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change_me_please")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")


settings = Settings()
