from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func

from database.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)  # bcrypt hash
    role = Column(String(20), nullable=False, default="student")  # admin / faculty / student
    created_at = Column(DateTime(timezone=True), server_default=func.now())
