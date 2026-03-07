"""Competition participation routes — student submit + faculty/HOD review."""

from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from database.db import get_db
from models.competition import (
    CompetitionEntry, calc_competition_score,
    TYPE_SCORES, LEVEL_SCORES, RESULT_SCORES,
)
from models.student_profile import StudentProfile
from models.user import User
from auth.dependencies import get_current_user

router = APIRouter(prefix="/competitions", tags=["Competitions"])


# ── Schemas ───────────────────────────────────────────────────────────────────
class CompetitionCreate(BaseModel):
    name: str
    comp_type: str           # hackathon, sports, cultural, paper, workshop, other
    level: str               # college, state, national, international
    date: str                # YYYY-MM-DD
    result: str = "participant"  # winner, runner_up, finalist, merit, participant
    proof_url: Optional[str] = None
    description: Optional[str] = None


class ReviewBody(BaseModel):
    action: str              # "approved" or "rejected"
    comment: Optional[str] = None


# ── Student: Submit a new competition ────────────────────────────────────────
@router.post("", status_code=201)
def submit_competition(
    body: CompetitionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(403, "Only students can submit competition entries")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(404, "Student profile not found")

    # Calculate scores
    t_score = TYPE_SCORES.get(body.comp_type, 5)
    l_score = LEVEL_SCORES.get(body.level, 5)
    r_score = RESULT_SCORES.get(body.result, 5)
    total = calc_competition_score(body.comp_type, body.level, body.result)

    entry = CompetitionEntry(
        student_id=profile.id,
        name=body.name,
        comp_type=body.comp_type,
        level=body.level,
        date=datetime.strptime(body.date, "%Y-%m-%d").date(),
        result=body.result,
        proof_url=body.proof_url,
        description=body.description,
        type_score=t_score,
        level_score=l_score,
        result_score=r_score,
        total_score=total,
        status="pending",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"message": "Competition entry submitted for review", "id": entry.id, "total_score": total}


# ── Student: List own entries ────────────────────────────────────────────────
@router.get("/my")
def get_my_competitions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(404, "Student profile not found")

    entries = (
        db.query(CompetitionEntry)
        .filter(CompetitionEntry.student_id == profile.id)
        .order_by(CompetitionEntry.created_at.desc())
        .all()
    )
    return {
        "entries": [_entry_dict(e) for e in entries],
        "total_approved_score": sum(e.total_score for e in entries if e.status == "approved"),
        "approved_count": sum(1 for e in entries if e.status == "approved"),
    }


# ── Student: Delete own pending entry ────────────────────────────────────────
@router.delete("/{entry_id}")
def delete_competition(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(404, "Student profile not found")

    entry = db.query(CompetitionEntry).filter(
        CompetitionEntry.id == entry_id,
        CompetitionEntry.student_id == profile.id,
    ).first()
    if not entry:
        raise HTTPException(404, "Entry not found")
    if entry.status != "pending":
        raise HTTPException(400, "Can only delete pending entries")

    db.delete(entry)
    db.commit()
    return {"message": "Entry deleted"}


# ── Faculty/HOD/Admin: List all entries (filterable) ────────────────────────
@router.get("")
def list_competitions(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("faculty", "hod", "admin"):
        raise HTTPException(403, "Only faculty, HOD, or admin can view all entries")

    q = db.query(CompetitionEntry).options(
        joinedload(CompetitionEntry.student)
    ).order_by(CompetitionEntry.created_at.desc())

    if status_filter:
        q = q.filter(CompetitionEntry.status == status_filter)

    # Faculty/HOD see only their department students
    if current_user.role in ("faculty", "hod"):
        q = q.join(StudentProfile).filter(StudentProfile.department_id == current_user.department_id)

    entries = q.all()
    return {
        "entries": [_entry_dict(e, include_student=True) for e in entries],
        "pending_count": sum(1 for e in entries if e.status == "pending"),
    }


# ── Faculty/HOD/Admin: Review (approve/reject) ──────────────────────────────
@router.put("/{entry_id}/review")
def review_competition(
    entry_id: int,
    body: ReviewBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("faculty", "hod", "admin"):
        raise HTTPException(403, "Only faculty, HOD, or admin can review entries")
    if body.action not in ("approved", "rejected"):
        raise HTTPException(400, "Action must be 'approved' or 'rejected'")

    entry = db.query(CompetitionEntry).filter(CompetitionEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Entry not found")

    entry.status = body.action
    entry.review_comment = body.comment
    entry.reviewed_by = current_user.id
    entry.reviewed_at = datetime.utcnow()
    db.commit()

    # ── On approval: update AcademicRecord + re-run ML ────────────────────
    if body.action == "approved":
        _update_competition_score(entry.student_id, db)

    return {"message": f"Entry {body.action}", "id": entry.id}


def _update_competition_score(student_id: int, db: Session):
    """Recalculate avg competition score and update AcademicRecord."""
    from models.academic_record import AcademicRecord
    from routes.predictions import predict_and_save
    from sqlalchemy import desc

    # Average total_score across all approved entries for this student
    approved = (
        db.query(CompetitionEntry)
        .filter(
            CompetitionEntry.student_id == student_id,
            CompetitionEntry.status == "approved",
        )
        .all()
    )

    if approved:
        # Max possible score = 50 (type 10 + level 20 + result 20)
        # Normalize to 0-100 scale
        avg_raw = sum(e.total_score for e in approved) / len(approved)
        normalized = min(100.0, (avg_raw / 50.0) * 100.0)
    else:
        normalized = 0.0

    # Update latest AcademicRecord
    record = (
        db.query(AcademicRecord)
        .filter(AcademicRecord.student_id == student_id)
        .order_by(desc(AcademicRecord.created_at))
        .first()
    )
    if record:
        record.competition_score = round(normalized, 1)
        db.commit()

        # Re-run ML prediction
        try:
            predict_and_save(student_id, db)
        except Exception:
            pass


# ── Scoring info endpoint ───────────────────────────────────────────────────
@router.get("/scoring")
def get_scoring_info():
    """Return the scoring tables so frontend can show point values."""
    return {
        "type_scores": TYPE_SCORES,
        "level_scores": LEVEL_SCORES,
        "result_scores": RESULT_SCORES,
    }


# ── Helper ───────────────────────────────────────────────────────────────────
def _entry_dict(e: CompetitionEntry, include_student: bool = False) -> dict:
    d = {
        "id": e.id,
        "name": e.name,
        "comp_type": e.comp_type,
        "level": e.level,
        "date": str(e.date),
        "result": e.result,
        "proof_url": e.proof_url,
        "description": e.description,
        "type_score": e.type_score,
        "level_score": e.level_score,
        "result_score": e.result_score,
        "total_score": e.total_score,
        "status": e.status,
        "review_comment": e.review_comment,
        "reviewed_by": e.reviewed_by,
        "reviewed_at": str(e.reviewed_at) if e.reviewed_at else None,
        "created_at": str(e.created_at) if e.created_at else None,
    }
    if include_student and e.student:
        d["student_name"] = e.student.user.name if e.student.user else None
        d["roll_number"] = e.student.roll_number
        d["student_id"] = e.student_id
    return d
