import json
import logging

import pika

from app.config import settings

logger = logging.getLogger(__name__)

ORDER_EXCHANGE = "order_exchange"
ORDER_CREATED_ROUTING_KEY = "order.created"


def publish_order_created(payload: dict) -> None:
    connection = pika.BlockingConnection(pika.URLParameters(settings.RABBITMQ_URL))
    channel = connection.channel()
    channel.exchange_declare(exchange=ORDER_EXCHANGE, exchange_type="direct", durable=True)
    channel.basic_publish(
        exchange=ORDER_EXCHANGE,
        routing_key=ORDER_CREATED_ROUTING_KEY,
        body=json.dumps(payload),
        properties=pika.BasicProperties(content_type="application/json", delivery_mode=2),
    )
    logger.info("published order.created event for order_id=%s", payload.get("order_id"))
    connection.close()
