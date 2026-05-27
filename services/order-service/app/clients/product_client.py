import os

import requests

PRODUCT_SERVICE_BASE_URL = os.getenv("PRODUCT_SERVICE_BASE_URL", "http://product-service:8002")


def get_product(product_id: int) -> dict:
    response = requests.get(f"{PRODUCT_SERVICE_BASE_URL.rstrip('/')}/products/{product_id}", timeout=5)
    response.raise_for_status()
    return response.json()
