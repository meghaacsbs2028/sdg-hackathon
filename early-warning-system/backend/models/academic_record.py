"""AcademicRecord model — time-based academic metrics."""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.db import Base


class AcademicRecord(Base):
    """Time-series academic metrics for a student.

    Each row represents one term / assessment period.
    Risk prediction always uses the latest record (by created_at).
    """
    __tablename__ = "academic_records"

    id = Column(Integer, primary_key=True, index=True)

    # Link to StudentProfile
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    student = relationship("StudentProfile", back_populates="academic_records")

    term = Column(String(50), nullable=False)  # e.g. "Sem1", "Midterm1"

    # ML feature columns
    attendance = Column(Float, nullable=False, default=0.0)
    internal_marks = Column(Float, nullable=False, default=0.0)
    assignment_score = Column(Float, nullable=False, default=0.0)
    lms_activity = Column(Float, nullable=False, default=0.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
