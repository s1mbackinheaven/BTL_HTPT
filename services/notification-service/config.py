import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    SERVICE_NAME = "notification-service"
    HOST = "0.0.0.0"
    PORT = int(os.getenv("NOTIFICATION_SERVICE_PORT", "8004"))
    DB_HOST = os.getenv("MYSQL_HOST", "localhost")
    DB_PORT = os.getenv("MYSQL_PORT", "3306")
    DB_USER = os.getenv("MYSQL_USER", "root")
    DB_PASSWORD = os.getenv("MYSQL_PASSWORD", "adminmySQL2004")
    DB_NAME = os.getenv("NOTIFICATION_DB_NAME", "notification_db")
    RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")

    @property
    def database_url(self) -> str:
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"


settings = Settings()
