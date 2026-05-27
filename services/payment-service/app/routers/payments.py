from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.clients import get_order
from app.correlation import get_request_id
from app.dependencies import get_db
from app.logging_utils import get_logger
from app.messaging import publish_payment_created, publish_payment_paid
from app.models.payment import Payment
from app.schemas.payment import PaymentCreate, PaymentResponse, PaymentStatusUpdate

router = APIRouter(prefix="/payments", tags=["payments"])
logger = get_logger("payment-service")

ALLOWED_METHODS = {"cash", "card", "bank_transfer", "momo", "vnpay"}
ALLOWED_STATUSES = {"pending", "paid", "failed", "refunded", "cancelled"}


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(payload: PaymentCreate, db: Session = Depends(get_db)):
    method = payload.method.strip().lower()
    if method not in ALLOWED_METHODS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid method. Allowed: {sorted(ALLOWED_METHODS)}")

    try:
        order = get_order(payload.order_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Order not found or unavailable: {exc}") from exc

    if int(order["user_id"]) != payload.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Payment user does not match order owner")

    existing = db.query(Payment).filter(Payment.order_id == payload.order_id).order_by(Payment.id.desc()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment already exists for this order")

    payment = Payment(
        order_id=payload.order_id,
        user_id=payload.user_id,
        amount=order["total_amount"],
        method=method,
        status="pending",
        transaction_ref=f"PAY-{uuid4().hex[:12].upper()}",
        note=payload.note,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    publish_payment_created({"payment_id": payment.id, "order_id": payment.order_id, "user_id": payment.user_id, "status": payment.status, "amount": str(payment.amount)})
    logger.info("payment created payment_id=%s order_id=%s request_id=%s", payment.id, payment.order_id, get_request_id())
    return payment


@router.get("", response_model=list[PaymentResponse])
def list_payments(db: Session = Depends(get_db)):
    return db.query(Payment).order_by(Payment.id.desc()).all()


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(payment_id: int, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    return payment


@router.get("/order/{order_id}", response_model=list[PaymentResponse])
def get_payments_by_order(order_id: int, db: Session = Depends(get_db)):
    return db.query(Payment).filter(Payment.order_id == order_id).order_by(Payment.id.desc()).all()


@router.patch("/{payment_id}/status", response_model=PaymentResponse)
def update_payment_status(payment_id: int, payload: PaymentStatusUpdate, db: Session = Depends(get_db)):
    new_status = payload.status.strip().lower()
    if new_status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status. Allowed: {sorted(ALLOWED_STATUSES)}")

    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    payment.status = new_status
    if new_status == "paid":
        payment.paid_at = datetime.now(timezone.utc)
        publish_payment_paid({"payment_id": payment.id, "order_id": payment.order_id, "user_id": payment.user_id, "status": payment.status, "amount": str(payment.amount)})
    db.commit()
    db.refresh(payment)
    logger.info("payment status updated payment_id=%s status=%s request_id=%s", payment.id, payment.status, get_request_id())
    return payment
