from decimal import Decimal

from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    price: Decimal = Field(gt=0)
    category: str | None = Field(default=None, max_length=100)
    image_url: str | None = Field(default=None, max_length=500)
    is_available: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    price: Decimal | None = Field(default=None, gt=0)
    category: str | None = Field(default=None, max_length=100)
    image_url: str | None = Field(default=None, max_length=500)
    is_available: bool | None = None


class ProductResponse(ProductBase):
    id: int

    class Config:
        from_attributes = True
