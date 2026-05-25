import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    SERVICE_NAME = "product-service"
    HOST = "0.0.0.0"
    PORT = int(os.getenv("PRODUCT_SERVICE_PORT", "8002"))
    DB_HOST = os.getenv("MYSQL_HOST", "localhost")
    DB_PORT = os.getenv("MYSQL_PORT", "3306")
    DB_USER = os.getenv("MYSQL_USER", "root")
    DB_PASSWORD = os.getenv("MYSQL_PASSWORD", "adminmySQL2004")
    DB_NAME = os.getenv("PRODUCT_DB_NAME", "product_db")

    @property
    def database_url(self) -> str:
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"


settings = Settings()
