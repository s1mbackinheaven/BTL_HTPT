import json

import pika

from app.config import settings
from app.request_id import get_request_id

ORDER_EXCHANGE = "order_exchange"
ORDER_CREATED_ROUTING_KEY = "order.created"
ORDER_STATUS_UPDATED_ROUTING_KEY = "order.status_updated"


def _publish(routing_key: str, payload: dict) -> None:
    connection = pika.BlockingConnection(pika.URLParameters(settings.RABBITMQ_URL))
    channel = connection.channel()
    channel.exchange_declare(exchange=ORDER_EXCHANGE, exchange_type="direct", durable=True)
    headers = {"x-request-id": get_request_id()} if get_request_id() else {}
    channel.basic_publish(
        exchange=ORDER_EXCHANGE,
        routing_key=routing_key,
        body=json.dumps(payload),
        properties=pika.BasicProperties(content_type="application/json", delivery_mode=2, headers=headers),
    )
    connection.close()


def publish_order_created(payload: dict) -> None:
    _publish(ORDER_CREATED_ROUTING_KEY, payload)


def publish_order_status_updated(payload: dict) -> None:
    _publish(ORDER_STATUS_UPDATED_ROUTING_KEY, payload)
