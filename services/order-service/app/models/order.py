from sqlalchemy import JSON, Column, DateTime, Integer, Numeric, String, func

from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    order_items = Column(JSON, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    note = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
