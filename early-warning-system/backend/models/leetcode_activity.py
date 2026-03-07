"""LeetCode activity models — profile stats + contest history."""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.db import Base


class LeetCodeProfile(Base):
    """Stores a student's linked LeetCode account and auto-fetched stats."""
    __tablename__ = "leetcode_profiles"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(
        Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"),
        nullable=False, unique=True, index=True,
    )
    student = relationship("StudentProfile")

    leetcode_username = Column(String(100), nullable=False)

    # ── Auto-fetched problem stats ──
    easy_solved = Column(Integer, nullable=False, default=0)
    medium_solved = Column(Integer, nullable=False, default=0)
    hard_solved = Column(Integer, nullable=False, default=0)
    total_solved = Column(Integer, nullable=False, default=0)

    # ── Auto-fetched contest stats ──
    contest_rating = Column(Float, nullable=False, default=0.0)
    contests_attended = Column(Integer, nullable=False, default=0)
    global_ranking = Column(Integer, nullable=False, default=0)

    # ── Computed score (0–100) ──
    activity_score = Column(Float, nullable=False, default=0.0)

    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to contest history
    contest_history = relationship(
        "ContestHistory", back_populates="profile",
        cascade="all, delete-orphan", lazy="dynamic",
    )


class ContestHistory(Base):
    """Individual contest participation record (weekly / biweekly)."""
    __tablename__ = "leetcode_contest_history"

    id = Column(Integer, primary_key=True, index=True)

    profile_id = Column(
        Integer, ForeignKey("leetcode_profiles.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    profile = relationship("LeetCodeProfile", back_populates="contest_history")

    contest_title = Column(String(200), nullable=False)
    problems_solved = Column(Integer, nullable=False, default=0)
    total_problems = Column(Integer, nullable=False, default=4)
    ranking = Column(Integer, nullable=False, default=0)
    rating_after = Column(Float, nullable=False, default=0.0)
    finish_time_seconds = Column(Integer, nullable=False, default=0)
    contest_timestamp = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("profile_id", "contest_title", name="uq_profile_contest"),
    )
