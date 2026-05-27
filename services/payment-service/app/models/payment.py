from sqlalchemy import Column, DateTime, Integer, Numeric, String, Text, func

from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    method = Column(String(50), nullable=False, default="cash")
    status = Column(String(50), nullable=False, default="pending")
    transaction_ref = Column(String(128), nullable=True, unique=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    paid_at = Column(DateTime(timezone=True), nullable=True)
