import os

import requests

ORDER_SERVICE_URL = os.getenv("ORDER_SERVICE_URL", "http://order-service:8003")


def get_order(order_id: int) -> dict:
    response = requests.get(f"{ORDER_SERVICE_URL.rstrip('/')}/orders/internal/{order_id}", timeout=5)
    response.raise_for_status()
    return response.json()
