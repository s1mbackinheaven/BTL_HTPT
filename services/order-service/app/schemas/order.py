from decimal import Decimal

from pydantic import BaseModel, Field


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class OrderItemResponse(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    price: Decimal = Field(gt=0)


class OrderCreate(BaseModel):
    user_id: int
    order_items: list[OrderItemCreate]
    note: str | None = None


class OrderStatusUpdate(BaseModel):
    status: str = Field(min_length=1, max_length=50)


class OrderResponse(BaseModel):
    id: int
    user_id: int
    order_items: list[OrderItemResponse]
    total_amount: Decimal
    status: str

    class Config:
        from_attributes = True
