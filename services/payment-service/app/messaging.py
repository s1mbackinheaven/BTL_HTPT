import json
import logging

import pika
from sqlalchemy.orm import Session

from app.clients import get_order
from app.config import settings
from app.correlation import get_request_id, set_request_id
from app.models.payment import Payment

logger = logging.getLogger(__name__)

ORDER_EXCHANGE = "order_exchange"
ORDER_CREATED_ROUTING_KEY = "order.created"
ORDER_STATUS_UPDATED_ROUTING_KEY = "order.status_updated"
PAYMENT_EXCHANGE = "payment_exchange"
PAYMENT_CREATED_ROUTING_KEY = "payment.created"
PAYMENT_PAID_ROUTING_KEY = "payment.paid"
QUEUE_NAME = "payment_queue"


def _publish(routing_key: str, payload: dict) -> None:
    connection = pika.BlockingConnection(pika.URLParameters(settings.RABBITMQ_URL))
    channel = connection.channel()
    channel.exchange_declare(exchange=PAYMENT_EXCHANGE, exchange_type="direct", durable=True)
    headers = {"x-request-id": get_request_id()} if get_request_id() else {}
    channel.basic_publish(
        exchange=PAYMENT_EXCHANGE,
        routing_key=routing_key,
        body=json.dumps(payload),
        properties=pika.BasicProperties(content_type="application/json", delivery_mode=2, headers=headers),
    )
    connection.close()


def publish_payment_created(payload: dict) -> None:
    _publish(PAYMENT_CREATED_ROUTING_KEY, payload)


def publish_payment_paid(payload: dict) -> None:
    _publish(PAYMENT_PAID_ROUTING_KEY, payload)


def start_consumer(session_factory):
    connection = pika.BlockingConnection(pika.URLParameters(settings.RABBITMQ_URL))
    channel = connection.channel()
    channel.exchange_declare(exchange=ORDER_EXCHANGE, exchange_type="direct", durable=True)
    channel.queue_declare(queue=QUEUE_NAME, durable=True)
    channel.queue_bind(queue=QUEUE_NAME, exchange=ORDER_EXCHANGE, routing_key=ORDER_CREATED_ROUTING_KEY)
    logger.info("payment-service consumer started and waiting for order.created messages")

    def callback(ch, method, properties, body):
        db: Session = session_factory()
        request_id = (properties.headers or {}).get("x-request-id") if properties and properties.headers else None
        set_request_id(request_id)
        try:
            payload = json.loads(body.decode())
            if method.routing_key != ORDER_CREATED_ROUTING_KEY:
                raise ValueError(f"Unsupported routing key: {method.routing_key}")

            order_id = int(payload["order_id"])
            user_id = int(payload["user_id"])
            amount = payload["total_amount"]

            exists = db.query(Payment).filter(Payment.order_id == order_id).first()
            if not exists:
                payment = Payment(
                    order_id=order_id,
                    user_id=user_id,
                    amount=amount,
                    method="cash",
                    status="pending",
                    transaction_ref=f"PAY-{order_id}",
                    note=payload.get("note") or "Auto-created from order.created event",
                )
                db.add(payment)
                db.commit()
                db.refresh(payment)
                logger.info("auto payment created payment_id=%s order_id=%s request_id=%s", payment.id, order_id, request_id)
                publish_payment_created({"payment_id": payment.id, "order_id": payment.order_id, "user_id": payment.user_id, "status": payment.status, "amount": str(payment.amount)})
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception:
            db.rollback()
            logger.exception("failed to process %s message request_id=%s", getattr(method, "routing_key", "unknown"), request_id)
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        finally:
            db.close()

    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=callback)
    channel.start_consuming()
