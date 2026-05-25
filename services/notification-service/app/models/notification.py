from sqlalchemy import Column, DateTime, Integer, String, Text, func

from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    type = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="unread")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
