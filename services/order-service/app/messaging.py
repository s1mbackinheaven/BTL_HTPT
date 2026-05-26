import json

import pika

from app.config import settings
from app.request_id import get_request_id

ORDER_EXCHANGE = "order_exchange"
ORDER_CREATED_ROUTING_KEY = "order.created"


def publish_order_created(payload: dict) -> None:
    connection = pika.BlockingConnection(pika.URLParameters(settings.RABBITMQ_URL))
    channel = connection.channel()
    channel.exchange_declare(exchange=ORDER_EXCHANGE, exchange_type="direct", durable=True)
    headers = {"x-request-id": get_request_id()} if get_request_id() else {}
    channel.basic_publish(
        exchange=ORDER_EXCHANGE,
        routing_key=ORDER_CREATED_ROUTING_KEY,
        body=json.dumps(payload),
        properties=pika.BasicProperties(content_type="application/json", delivery_mode=2, headers=headers),
    )
    connection.close()
