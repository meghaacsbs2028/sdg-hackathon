"""Assignment and AssignmentSubmission models — Google Classroom-style assignments."""

from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.db import Base


class Assignment(Base):
    """Faculty-created assignment scoped to year/section."""
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    subject_name = Column(String(100), nullable=False)

    # Scope
    year = Column(Integer, nullable=False)
    section = Column(String(10), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=False)
    max_score = Column(Float, nullable=False, default=100.0)

    # Who created
    faculty_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    faculty = relationship("User", foreign_keys=[faculty_id])

    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    department = relationship("Department")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Submissions
    submissions = relationship("AssignmentSubmission", back_populates="assignment",
                               cascade="all, delete-orphan")


class AssignmentSubmission(Base):
    """Student submission for an assignment."""
    __tablename__ = "assignment_submissions"

    id = Column(Integer, primary_key=True, index=True)

    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"),
                           nullable=False, index=True)
    assignment = relationship("Assignment", back_populates="submissions")

    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    student = relationship("StudentProfile")

    # File
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(200), nullable=False)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    # Grading
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    graded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    graded_at = Column(DateTime(timezone=True), nullable=True)

    status = Column(String(20), nullable=False, default="submitted")  # submitted, graded, late

    __table_args__ = (
        UniqueConstraint("assignment_id", "student_id", name="uq_assignment_student"),
    )
