import json
import logging

import pika
from sqlalchemy.orm import Session

from app.config import settings
from app.models.notification import Notification
from app.request_id import set_request_id

logger = logging.getLogger(__name__)

ORDER_EXCHANGE = "order_exchange"
ORDER_CREATED_ROUTING_KEY = "order.created"
QUEUE_NAME = "notification_queue"


def start_consumer(session_factory):
    connection = pika.BlockingConnection(pika.URLParameters(settings.RABBITMQ_URL))
    channel = connection.channel()
    channel.exchange_declare(exchange=ORDER_EXCHANGE, exchange_type="direct", durable=True)
    channel.queue_declare(queue=QUEUE_NAME, durable=True)
    channel.queue_bind(queue=QUEUE_NAME, exchange=ORDER_EXCHANGE, routing_key=ORDER_CREATED_ROUTING_KEY)

    logger.info("notification-service consumer started and waiting for messages")

    def callback(ch, method, properties, body):
        db: Session = session_factory()
        request_id = (properties.headers or {}).get("x-request-id") if properties and properties.headers else None
        set_request_id(request_id)
        try:
            payload = json.loads(body.decode())
            notification = Notification(
                user_id=payload["user_id"],
                type="ORDER_CREATED",
                content=f"Order #{payload['order_id']} created successfully",
                status="unread",
            )
            db.add(notification)
            db.commit()
            ch.basic_ack(delivery_tag=method.delivery_tag)
            logger.info("processed order.created event for order_id=%s request_id=%s", payload.get("order_id"), request_id)
        except Exception:
            db.rollback()
            logger.exception("failed to process order.created message request_id=%s", request_id)
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        finally:
            db.close()

    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=callback)
    channel.start_consuming()
