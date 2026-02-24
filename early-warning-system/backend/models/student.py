from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from database.db import Base


class Student(Base):
    """Student metadata and academic info."""
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    department = Column(String(100))
    year = Column(Integer)

    # ML feature columns
    attendance = Column(Float, default=0.0)
    internal_marks = Column(Float, default=0.0)
    assignment_score = Column(Float, default=0.0)
    lms_activity = Column(Float, default=0.0)
    stress_score = Column(Float, default=0.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
