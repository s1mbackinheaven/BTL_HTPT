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
ORDER_STATUS_UPDATED_ROUTING_KEY = "order.status_updated"
PAYMENT_EXCHANGE = "payment_exchange"
PAYMENT_CREATED_ROUTING_KEY = "payment.created"
PAYMENT_PAID_ROUTING_KEY = "payment.paid"
QUEUE_NAME = "notification_queue"


def start_consumer(session_factory):
    connection = pika.BlockingConnection(pika.URLParameters(settings.RABBITMQ_URL))
    channel = connection.channel()
    channel.exchange_declare(exchange=ORDER_EXCHANGE, exchange_type="direct", durable=True)
    channel.exchange_declare(exchange=PAYMENT_EXCHANGE, exchange_type="direct", durable=True)
    channel.queue_declare(queue=QUEUE_NAME, durable=True)
    for rk in [ORDER_CREATED_ROUTING_KEY, ORDER_STATUS_UPDATED_ROUTING_KEY, PAYMENT_CREATED_ROUTING_KEY, PAYMENT_PAID_ROUTING_KEY]:
        channel.queue_bind(queue=QUEUE_NAME, exchange=ORDER_EXCHANGE if rk.startswith("order.") else PAYMENT_EXCHANGE, routing_key=rk)

    logger.info("notification-service consumer started and waiting for messages")

    def callback(ch, method, properties, body):
        db: Session = session_factory()
        request_id = (properties.headers or {}).get("x-request-id") if properties and properties.headers else None
        set_request_id(request_id)
        try:
            payload = json.loads(body.decode())
            routing_key = method.routing_key
            if routing_key == ORDER_CREATED_ROUTING_KEY:
                notification = Notification(
                    user_id=payload["user_id"],
                    type="ORDER_CREATED",
                    content=f"Order #{payload['order_id']} created successfully",
                    status="unread",
                )
            elif routing_key == ORDER_STATUS_UPDATED_ROUTING_KEY:
                notification = Notification(
                    user_id=payload["user_id"],
                    type="ORDER_STATUS_UPDATED",
                    content=f"Order #{payload['order_id']} changed from {payload['old_status']} to {payload['new_status']}",
                    status="unread",
                )
            elif routing_key == PAYMENT_CREATED_ROUTING_KEY:
                notification = Notification(
                    user_id=payload["user_id"],
                    type="PAYMENT_CREATED",
                    content=f"Payment #{payload['payment_id']} created for Order #{payload['order_id']}",
                    status="unread",
                )
            elif routing_key == PAYMENT_PAID_ROUTING_KEY:
                notification = Notification(
                    user_id=payload["user_id"],
                    type="PAYMENT_PAID",
                    content=f"Payment for Order #{payload['order_id']} has been paid",
                    status="unread",
                )
            else:
                raise ValueError(f"Unsupported routing key: {routing_key}")

            db.add(notification)
            db.commit()
            ch.basic_ack(delivery_tag=method.delivery_tag)
            logger.info("processed %s event for order_id=%s request_id=%s", routing_key, payload.get("order_id"), request_id)
        except Exception:
            db.rollback()
            logger.exception("failed to process %s message request_id=%s", getattr(method, "routing_key", "unknown"), request_id)
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        finally:
            db.close()

    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=callback)
    channel.start_consuming()
