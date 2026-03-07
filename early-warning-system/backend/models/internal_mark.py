"""InternalMark model — subject-wise IA1/IA2/IA3 marks."""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.db import Base


class InternalMark(Base):
    """Stores individual IA marks per student per subject.

    ia_type is one of: "IA1", "IA2", "IA3"
    Each (student, subject, ia_type) combination is unique.
    """
    __tablename__ = "internal_marks"

    id = Column(Integer, primary_key=True, index=True)

    # Which student
    student_id = Column(
        Integer,
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student = relationship("StudentProfile")

    # Subject info
    subject_name = Column(String(100), nullable=False)

    # IA type: "IA1", "IA2", "IA3"
    ia_type = Column(String(10), nullable=False)

    # Marks
    max_marks = Column(Float, nullable=False, default=100.0)
    obtained_marks = Column(Float, nullable=False, default=0.0)

    # Who entered it
    faculty_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    faculty = relationship("User")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # One mark per student per subject per IA type
    __table_args__ = (
        UniqueConstraint("student_id", "subject_name", "ia_type", name="uq_student_subject_ia"),
    )
