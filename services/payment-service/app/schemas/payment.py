from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class PaymentCreate(BaseModel):
    order_id: int
    user_id: int
    method: str = Field(default="cash", min_length=1, max_length=50)
    note: str | None = None


class PaymentStatusUpdate(BaseModel):
    status: str = Field(min_length=1, max_length=50)


class PaymentResponse(BaseModel):
    id: int
    order_id: int
    user_id: int
    amount: Decimal
    method: str
    status: str
    transaction_ref: str | None = None
    note: str | None = None
    paid_at: datetime | None = None

    class Config:
        from_attributes = True
