"""StudentProfile model — academic identity layer."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.db import Base


class StudentProfile(Base):
    """Academic identity for users with role='student'."""
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)

    # One-to-one link to User (only role=student)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    user = relationship("User", back_populates="student_profile")

    roll_number = Column(String(50), nullable=False)

    # Department link
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True)
    department = relationship("Department", back_populates="student_profiles")

    year = Column(Integer, nullable=True)
    section = Column(String(10), nullable=True)
    admission_year = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Academic records (one-to-many, time-series)
    academic_records = relationship("AcademicRecord", back_populates="student", cascade="all, delete-orphan",
                                    order_by="AcademicRecord.created_at.desc()")

    # Composite unique: no duplicate roll_number within the same department
    __table_args__ = (
        UniqueConstraint("department_id", "roll_number", name="uq_dept_roll"),
    )
