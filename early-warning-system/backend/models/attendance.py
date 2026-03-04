"""DailyAttendance model — tracks per-day student attendance."""

from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.db import Base


class DailyAttendance(Base):
    """One row per student per date.

    status can be: 'Present', 'Absent', or 'Late'.
    """
    __tablename__ = "daily_attendance"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    student = relationship("StudentProfile")

    date = Column(Date, nullable=False, index=True)
    status = Column(String(10), nullable=False, default="Present")  # Present / Absent / Late

    recorded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    recorded_by = relationship("User")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Prevent duplicate attendance for the same student on the same day
    __table_args__ = (
        UniqueConstraint("student_id", "date", name="uq_student_date"),
    )
