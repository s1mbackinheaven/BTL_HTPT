import requests

from app.config import settings

PRODUCT_SERVICE_BASE_URL = "http://localhost:8002"


def get_product(product_id: int) -> dict:
    response = requests.get(f"{PRODUCT_SERVICE_BASE_URL}/products/{product_id}", timeout=5)
    response.raise_for_status()
    return response.json()
