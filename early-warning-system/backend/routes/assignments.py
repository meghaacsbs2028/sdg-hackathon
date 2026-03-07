"""
Assignment routes — Google Classroom-style.

Faculty creates assignments scoped to year/section.
Students upload PDF/DOCX submissions.
Faculty grades them. Scores auto-update AcademicRecord + ML.
"""

import os
import pickle
import shutil
from datetime import datetime, timezone
from typing import Optional

import numpy as np
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.db import get_db
from models.user import User
from models.student_profile import StudentProfile
from models.academic_record import AcademicRecord
from models.assignment import Assignment, AssignmentSubmission
from auth.dependencies import get_current_user, require_role

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "assignments")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── ML model ──────────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "risk_model.pkl")
with open(MODEL_PATH, "rb") as f:
    _bundle = pickle.load(f)
_model = _bundle["model"]
_scaler = _bundle["scaler"]
_feature_names = _bundle["features"]

router = APIRouter(prefix="/assignments", tags=["Assignments"])


# ── Schemas ────────────────────────────────────────────────────────────────────
class AssignmentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    subject_name: str
    year: int
    section: str
    due_date: str          # ISO format
    max_score: float = 100.0


class GradeBody(BaseModel):
    student_id: int
    score: float
    feedback: Optional[str] = None


# ── Helpers ────────────────────────────────────────────────────────────────────
def _calc_assignment_score_pct(db: Session, student_id: int) -> float:
    """Average assignment score % from all graded submissions."""
    subs = db.query(AssignmentSubmission).filter(
        AssignmentSubmission.student_id == student_id,
        AssignmentSubmission.score.isnot(None),
    ).all()
    if not subs:
        return 0.0
    total_score = sum(s.score for s in subs)
    total_max = sum(s.assignment.max_score for s in subs)
    if total_max == 0:
        return 0.0
    return round((total_score / total_max) * 100, 2)


def _update_record_and_predict(db: Session, student_id: int, assignment_pct: float):
    """Update AcademicRecord.assignment_score and re-run ML."""
    latest = db.query(AcademicRecord).filter(
        AcademicRecord.student_id == student_id
    ).order_by(AcademicRecord.created_at.desc()).first()

    if not latest:
        latest = AcademicRecord(
            student_id=student_id,
            term=f"Auto-{datetime.now().strftime('%Y')}",
            attendance=0.0, internal_marks=0.0,
            assignment_score=assignment_pct, lms_activity=0.0,
        )
        db.add(latest)
        db.flush()
    else:
        latest.assignment_score = assignment_pct

    features = [getattr(latest, f, 0.0) or 0.0 for f in _feature_names]
    X = np.array(features).reshape(1, -1)
    X_scaled = _scaler.transform(X)
    prob = float(_model.predict_proba(X_scaled)[0][1])
    return {
        "risk_score": round(prob, 4),
        "risk_level": "Green" if prob < 0.4 else ("Yellow" if prob <= 0.7 else "Red"),
    }


def _assignment_dict(a: Assignment, include_submissions=False):
    d = {
        "id": a.id,
        "title": a.title,
        "description": a.description,
        "subject_name": a.subject_name,
        "year": a.year,
        "section": a.section,
        "due_date": a.due_date.isoformat() if a.due_date else None,
        "max_score": a.max_score,
        "faculty_name": a.faculty.name if a.faculty else None,
        "department_id": a.department_id,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "total_submissions": len(a.submissions) if a.submissions else 0,
        "graded_count": sum(1 for s in (a.submissions or []) if s.score is not None),
    }
    if include_submissions:
        d["submissions"] = [_submission_dict(s) for s in (a.submissions or [])]
    return d


def _submission_dict(s: AssignmentSubmission):
    return {
        "id": s.id,
        "assignment_id": s.assignment_id,
        "student_id": s.student_id,
        "student_name": s.student.user.name if s.student and s.student.user else None,
        "roll_number": s.student.roll_number if s.student else None,
        "file_name": s.file_name,
        "file_url": f"/uploads/assignments/{s.assignment_id}/{os.path.basename(s.file_path)}",
        "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
        "score": s.score,
        "max_score": s.assignment.max_score if s.assignment else 100,
        "percentage": round((s.score / s.assignment.max_score) * 100, 1) if s.score is not None and s.assignment else None,
        "feedback": s.feedback,
        "status": s.status,
        "graded_at": s.graded_at.isoformat() if s.graded_at else None,
    }


# ── POST /assignments/ — Create assignment ────────────────────────────────────
@router.post("/")
def create_assignment(
    body: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    try:
        due = datetime.fromisoformat(body.due_date)
    except ValueError:
        raise HTTPException(400, "Invalid due_date format. Use ISO format.")

    a = Assignment(
        title=body.title,
        description=body.description,
        subject_name=body.subject_name,
        year=body.year,
        section=body.section,
        due_date=due,
        max_score=body.max_score,
        faculty_id=current_user.id,
        department_id=current_user.department_id,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return {"message": "Assignment created", "assignment": _assignment_dict(a)}


# ── GET /assignments/ — List assignments (faculty) ────────────────────────────
@router.get("/")
def list_assignments(
    year: Optional[int] = None,
    section: Optional[str] = None,
    subject_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    query = db.query(Assignment)
    if current_user.role in ("hod", "faculty"):
        query = query.filter(Assignment.department_id == current_user.department_id)
    if year:
        query = query.filter(Assignment.year == year)
    if section:
        query = query.filter(Assignment.section == section)
    if subject_name:
        query = query.filter(Assignment.subject_name == subject_name)
    assignments = query.order_by(Assignment.created_at.desc()).all()
    return {"assignments": [_assignment_dict(a) for a in assignments]}


# ── GET /assignments/{id} — Detail + submissions ─────────────────────────────
@router.get("/{assignment_id}")
def get_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Assignment not found")
    return {"assignment": _assignment_dict(a, include_submissions=True)}


# ── DELETE /assignments/{id} ──────────────────────────────────────────────────
@router.delete("/{assignment_id}")
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Assignment not found")
    if current_user.role == "faculty" and a.faculty_id != current_user.id:
        raise HTTPException(403, "You can only delete your own assignments")

    # Delete files
    folder = os.path.join(UPLOAD_DIR, str(assignment_id))
    if os.path.exists(folder):
        shutil.rmtree(folder)

    db.delete(a)
    db.commit()
    return {"message": "Assignment deleted"}


# ── GET /assignments/my — Student's assignments ──────────────────────────────
@router.get("/my/list")
def get_my_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(404, "Student profile not found")

    assignments = db.query(Assignment).filter(
        Assignment.department_id == profile.department_id,
        Assignment.year == profile.year,
        Assignment.section == profile.section,
    ).order_by(Assignment.due_date.desc()).all()

    # Get this student's submissions
    my_subs = {
        s.assignment_id: s for s in
        db.query(AssignmentSubmission).filter(
            AssignmentSubmission.student_id == profile.id
        ).all()
    }

    result = []
    for a in assignments:
        ad = _assignment_dict(a)
        sub = my_subs.get(a.id)
        if sub:
            ad["my_submission"] = _submission_dict(sub)
        else:
            now = datetime.now(timezone.utc)
            ad["my_submission"] = None
            if a.due_date and a.due_date.replace(tzinfo=timezone.utc) < now:
                ad["is_overdue"] = True
            else:
                ad["is_overdue"] = False
        result.append(ad)

    # Overall assignment score
    graded = [s for s in my_subs.values() if s.score is not None]
    overall_pct = 0
    if graded:
        t_score = sum(s.score for s in graded)
        t_max = sum(s.assignment.max_score for s in graded)
        overall_pct = round((t_score / t_max) * 100, 1) if t_max else 0

    return {
        "student_id": profile.id,
        "overall_assignment_pct": overall_pct,
        "assignments": result,
    }


# ── POST /assignments/{id}/submit — Student uploads file ─────────────────────
@router.post("/{assignment_id}/submit")
def submit_assignment(
    assignment_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate assignment
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Assignment not found")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(404, "Student profile not found")

    # Check student belongs to this class
    if profile.year != a.year or profile.section != a.section or profile.department_id != a.department_id:
        raise HTTPException(403, "This assignment is not for your class")

    # Validate file type
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".pdf", ".docx", ".doc", ".pptx", ".txt", ".zip"):
        raise HTTPException(400, "Only PDF, DOCX, DOC, PPTX, TXT, ZIP files are allowed")

    # Save file
    folder = os.path.join(UPLOAD_DIR, str(assignment_id))
    os.makedirs(folder, exist_ok=True)
    safe_name = f"{profile.id}_{file.filename}"
    file_path = os.path.join(folder, safe_name)
    with open(file_path, "wb") as f:
        content = file.file.read()
        f.write(content)

    # Check late
    now = datetime.now(timezone.utc)
    is_late = a.due_date and a.due_date.replace(tzinfo=timezone.utc) < now
    sub_status = "late" if is_late else "submitted"

    # Upsert
    existing = db.query(AssignmentSubmission).filter(
        AssignmentSubmission.assignment_id == assignment_id,
        AssignmentSubmission.student_id == profile.id,
    ).first()

    if existing:
        # Delete old file if different
        if existing.file_path and os.path.exists(existing.file_path) and existing.file_path != file_path:
            try:
                os.remove(existing.file_path)
            except OSError:
                pass
        existing.file_path = file_path
        existing.file_name = file.filename
        existing.submitted_at = now
        existing.status = sub_status if existing.status != "graded" else "graded"
    else:
        sub = AssignmentSubmission(
            assignment_id=assignment_id,
            student_id=profile.id,
            file_path=file_path,
            file_name=file.filename,
            submitted_at=now,
            status=sub_status,
        )
        db.add(sub)

    db.commit()
    return {"message": "Assignment submitted", "status": sub_status, "late": is_late}


# ── POST /assignments/{id}/grade — Faculty grades ────────────────────────────
@router.post("/{assignment_id}/grade")
def grade_submission(
    assignment_id: int,
    body: GradeBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Assignment not found")

    sub = db.query(AssignmentSubmission).filter(
        AssignmentSubmission.assignment_id == assignment_id,
        AssignmentSubmission.student_id == body.student_id,
    ).first()
    if not sub:
        raise HTTPException(404, "No submission found for this student")

    # Clamp score
    score = max(0, min(body.score, a.max_score))

    sub.score = score
    sub.feedback = body.feedback
    sub.graded_by = current_user.id
    sub.graded_at = datetime.now(timezone.utc)
    sub.status = "graded"

    db.flush()

    # Update academic record + ML
    pct = _calc_assignment_score_pct(db, body.student_id)
    pred = _update_record_and_predict(db, body.student_id, pct)

    db.commit()

    return {
        "message": "Graded successfully",
        "score": score,
        "max_score": a.max_score,
        "assignment_pct": pct,
        **pred,
    }
