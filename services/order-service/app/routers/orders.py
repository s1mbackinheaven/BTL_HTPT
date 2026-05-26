from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.clients.product_client import get_product
from app.core.security import get_token_payload
from app.dependencies import get_db
from app.messaging import publish_order_created, publish_order_status_updated
from app.models.order import Order
from app.schemas.order import OrderCreate, OrderItemResponse, OrderResponse, OrderStatusUpdate

router = APIRouter(prefix="/orders", tags=["orders"])

ALLOWED_STATUSES = {"pending", "delivering", "completed", "cancelled"}
ADMIN_ROLES = {"admin"}


def _is_admin(token_payload: dict) -> bool:
    role = str(token_payload.get("role", "")).lower()
    return role in ADMIN_ROLES


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    token_payload: dict = Depends(get_token_payload),
):
    if int(token_payload.get("sub", 0)) != payload.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only create order for yourself")

    enriched_items = []
    total_amount = Decimal("0")

    for item in payload.order_items:
        product = get_product(item.product_id)
        price = Decimal(str(product["price"]))
        line_total = price * item.quantity
        total_amount += line_total
        enriched_items.append(
            {
                "product_id": item.product_id,
                "quantity": item.quantity,
                "price": str(price),
            }
        )

    order = Order(
        user_id=payload.user_id,
        order_items=enriched_items,
        total_amount=total_amount,
        status="pending",
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    publish_order_created(
        {
            "event_type": "order_created",
            "order_id": order.id,
            "user_id": order.user_id,
            "total_amount": str(order.total_amount),
            "status": order.status,
            "order_items": order.order_items,
        }
    )

    return order


@router.get("", response_model=list[OrderResponse])
def get_orders(db: Session = Depends(get_db), token_payload: dict = Depends(get_token_payload)):
    user_id = int(token_payload.get("sub", 0))
    if _is_admin(token_payload):
        return db.query(Order).order_by(Order.id.asc()).all()
    return db.query(Order).filter(Order.user_id == user_id).order_by(Order.id.asc()).all()


@router.get("/admin", response_model=list[OrderResponse])
def get_all_orders(db: Session = Depends(get_db), token_payload: dict = Depends(get_token_payload)):
    if not _is_admin(token_payload):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return db.query(Order).order_by(Order.id.asc()).all()


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db), token_payload: dict = Depends(get_token_payload)):
    user_id = int(token_payload.get("sub", 0))
    query = db.query(Order).filter(Order.id == order_id)
    if not _is_admin(token_payload):
        query = query.filter(Order.user_id == user_id)
    order = query.first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    token_payload: dict = Depends(get_token_payload),
):
    if not _is_admin(token_payload):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    new_status = payload.status.strip().lower()
    if new_status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status. Allowed: {sorted(ALLOWED_STATUSES)}")

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    old_status = order.status
    order.status = new_status
    db.commit()
    db.refresh(order)

    publish_order_status_updated(
        {
            "event_type": "order_status_updated",
            "order_id": order.id,
            "user_id": order.user_id,
            "old_status": old_status,
            "new_status": order.status,
            "total_amount": str(order.total_amount),
            "order_items": order.order_items,
        }
    )

    return order
