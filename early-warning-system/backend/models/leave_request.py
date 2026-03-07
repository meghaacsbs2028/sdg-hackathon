"""LeaveRequest model — Leave and OD (On Duty) request tracking."""

from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.db import Base


class LeaveRequest(Base):
    """Student leave/OD requests with faculty review workflow."""
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    student = relationship("StudentProfile")

    request_type = Column(String(10), nullable=False)  # "leave" or "od"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=False)
    event_name = Column(String(200), nullable=True)  # For OD requests
    proof_url = Column(String(500), nullable=True)

    status = Column(String(20), nullable=False, default="pending")  # pending, approved, rejected
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    review_comment = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
