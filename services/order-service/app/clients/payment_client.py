import os

import requests

PAYMENT_SERVICE_URL = os.getenv("PAYMENT_SERVICE_URL", "http://payment-service:8005")


def get_payments_by_order(order_id: int) -> list[dict]:
    response = requests.get(f"{PAYMENT_SERVICE_URL.rstrip('/')}/payments/order/{order_id}", timeout=5)
    response.raise_for_status()
    return response.json()
