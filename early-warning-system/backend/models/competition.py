"""CompetitionEntry model — tracks student competition participation with scoring."""

from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.db import Base


# ── Scoring tables (used for ML features later) ────────────────────────────
TYPE_SCORES = {
    "hackathon": 10,
    "paper": 9,
    "sports": 8,
    "cultural": 7,
    "workshop": 6,
    "other": 5,
}

LEVEL_SCORES = {
    "international": 20,
    "national": 15,
    "state": 10,
    "college": 5,
}

RESULT_SCORES = {
    "winner": 20,
    "runner_up": 15,
    "finalist": 12,
    "merit": 10,
    "participant": 5,
}


def calc_competition_score(comp_type: str, level: str, result: str) -> float:
    """Calculate a composite score from type + level + result."""
    t = TYPE_SCORES.get(comp_type, 5)
    l = LEVEL_SCORES.get(level, 5)
    r = RESULT_SCORES.get(result, 5)
    return float(t + l + r)


class CompetitionEntry(Base):
    """A single competition participation submitted by a student."""
    __tablename__ = "competition_entries"

    id = Column(Integer, primary_key=True, index=True)

    # Link to student
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    student = relationship("StudentProfile")

    # Competition details
    name = Column(String(200), nullable=False)               # e.g. "Smart India Hackathon"
    comp_type = Column(String(50), nullable=False)            # hackathon, sports, cultural, paper, workshop, other
    level = Column(String(50), nullable=False)                # college, state, national, international
    date = Column(Date, nullable=False)
    result = Column(String(50), nullable=False, default="participant")  # winner, runner_up, finalist, merit, participant
    proof_url = Column(String(500), nullable=True)            # link to certificate/proof
    description = Column(Text, nullable=True)                 # optional notes

    # Scoring (computed from type + level + result)
    type_score = Column(Float, nullable=False, default=5.0)
    level_score = Column(Float, nullable=False, default=5.0)
    result_score = Column(Float, nullable=False, default=5.0)
    total_score = Column(Float, nullable=False, default=15.0)

    # Review workflow
    status = Column(String(20), nullable=False, default="pending")  # pending / approved / rejected
    review_comment = Column(String(300), nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
