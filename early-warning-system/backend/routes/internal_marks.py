"""
Internal Assessment (IA) marks routes.

Faculty/HOD enter subject-wise IA1/IA2/IA3 marks.
After saving, the system auto-updates the student's AcademicRecord.internal_marks
and re-runs the ML risk prediction.
"""

import io
import os
import pickle
from typing import List, Optional

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func as sqfunc

from database.db import get_db
from models.user import User
from models.student_profile import StudentProfile
from models.academic_record import AcademicRecord
from models.internal_mark import InternalMark
from auth.dependencies import get_current_user, require_role

# ── Load ML model ─────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "risk_model.pkl")
with open(MODEL_PATH, "rb") as f:
    _bundle = pickle.load(f)
_model = _bundle["model"]
_scaler = _bundle["scaler"]
_feature_names = _bundle["features"]

router = APIRouter(prefix="/ia-marks", tags=["Internal Marks"])


# ── Schemas ────────────────────────────────────────────────────────────────────
class SingleMarkEntry(BaseModel):
    student_id: int
    obtained_marks: float


class BulkMarkRequest(BaseModel):
    subject_name: str
    ia_type: str          # "IA1", "IA2", "IA3"
    max_marks: float = 100.0
    marks: List[SingleMarkEntry]


# ── Helpers ────────────────────────────────────────────────────────────────────
def _calc_internal_marks_pct(db: Session, student_id: int) -> float:
    """Calculate overall internal marks % from all IA entries for a student."""
    rows = db.query(InternalMark).filter(
        InternalMark.student_id == student_id
    ).all()
    if not rows:
        return 0.0
    total_max = sum(r.max_marks for r in rows)
    total_obtained = sum(r.obtained_marks for r in rows)
    if total_max == 0:
        return 0.0
    return round((total_obtained / total_max) * 100, 2)


def _update_academic_record_and_predict(db: Session, student_id: int, internal_marks_pct: float):
    """Update the latest AcademicRecord with the computed internal_marks and re-run ML."""
    latest = db.query(AcademicRecord).filter(
        AcademicRecord.student_id == student_id
    ).order_by(AcademicRecord.created_at.desc()).first()

    if not latest:
        from datetime import datetime
        latest = AcademicRecord(
            student_id=student_id,
            term=f"Auto-{datetime.now().strftime('%Y')}",
            attendance=0.0,
            internal_marks=internal_marks_pct,
            assignment_score=0.0,
            lms_activity=0.0,
        )
        db.add(latest)
        db.flush()
    else:
        latest.internal_marks = internal_marks_pct

    # Run ML prediction
    features = [getattr(latest, f, 0.0) or 0.0 for f in _feature_names]
    X = np.array(features).reshape(1, -1)
    X_scaled = _scaler.transform(X)
    prob = float(_model.predict_proba(X_scaled)[0][1])

    return {
        "risk_score": round(prob, 4),
        "risk_level": "Green" if prob < 0.4 else ("Yellow" if prob <= 0.7 else "Red"),
    }


def _mark_to_dict(m: InternalMark):
    return {
        "id": m.id,
        "student_id": m.student_id,
        "student_name": m.student.user.name if m.student and m.student.user else None,
        "roll_number": m.student.roll_number if m.student else None,
        "subject_name": m.subject_name,
        "ia_type": m.ia_type,
        "max_marks": m.max_marks,
        "obtained_marks": m.obtained_marks,
        "percentage": round((m.obtained_marks / m.max_marks) * 100, 1) if m.max_marks else 0,
        "faculty_id": m.faculty_id,
    }


# ── POST /ia-marks/ — Bulk enter marks for a class ───────────────────────────
@router.post("/")
def save_ia_marks(
    payload: BulkMarkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    """Bulk-save IA marks for a subject. Upserts (updates if already exists)."""
    if payload.ia_type not in ("IA1", "IA2", "IA3"):
        raise HTTPException(400, "ia_type must be IA1, IA2, or IA3")

    saved = 0
    updated = 0
    affected_students = set()

    for entry in payload.marks:
        # Validate student exists and belongs to department
        profile = db.query(StudentProfile).filter(StudentProfile.id == entry.student_id).first()
        if not profile:
            continue
        if current_user.role in ("hod", "faculty") and profile.department_id != current_user.department_id:
            continue

        # Clamp marks
        obtained = max(0, min(entry.obtained_marks, payload.max_marks))

        # Upsert
        existing = db.query(InternalMark).filter(
            InternalMark.student_id == entry.student_id,
            InternalMark.subject_name == payload.subject_name,
            InternalMark.ia_type == payload.ia_type,
        ).first()

        if existing:
            existing.obtained_marks = obtained
            existing.max_marks = payload.max_marks
            existing.faculty_id = current_user.id
            updated += 1
        else:
            db.add(InternalMark(
                student_id=entry.student_id,
                subject_name=payload.subject_name,
                ia_type=payload.ia_type,
                max_marks=payload.max_marks,
                obtained_marks=obtained,
                faculty_id=current_user.id,
            ))
            saved += 1

        affected_students.add(entry.student_id)

    db.flush()

    # Auto-update academic records and re-run ML for each affected student
    predictions = []
    for sid in affected_students:
        pct = _calc_internal_marks_pct(db, sid)
        pred = _update_academic_record_and_predict(db, sid, pct)
        predictions.append({"student_id": sid, "internal_marks_pct": pct, **pred})

    db.commit()

    return {
        "message": "IA marks saved and risk predictions updated",
        "subject": payload.subject_name,
        "ia_type": payload.ia_type,
        "new_records": saved,
        "updated_records": updated,
        "predictions": predictions,
    }


# ── GET /ia-marks/ — List marks (faculty/admin view) ─────────────────────────
@router.get("/")
def get_ia_marks(
    ia_type: Optional[str] = None,
    subject_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    """Get all IA marks, filterable by ia_type and subject."""
    query = db.query(InternalMark).join(StudentProfile)

    # Department scope
    if current_user.role in ("hod", "faculty"):
        query = query.filter(StudentProfile.department_id == current_user.department_id)

    if ia_type:
        query = query.filter(InternalMark.ia_type == ia_type)
    if subject_name:
        query = query.filter(InternalMark.subject_name == subject_name)

    marks = query.order_by(InternalMark.subject_name, InternalMark.ia_type).all()
    return {"marks": [_mark_to_dict(m) for m in marks]}


# ── GET /ia-marks/subjects — List distinct subjects ──────────────────────────
@router.get("/subjects")
def get_ia_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    """Return distinct subject names that have been entered for the department."""
    query = db.query(InternalMark.subject_name).join(StudentProfile).distinct()

    if current_user.role in ("hod", "faculty"):
        query = query.filter(StudentProfile.department_id == current_user.department_id)

    subjects = [row[0] for row in query.all()]
    return {"subjects": sorted(subjects)}


# ── GET /ia-marks/my — Student's own marks ────────────────────────────────────
@router.get("/my")
def get_my_ia_marks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the current student's IA marks grouped by subject."""
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(404, "Student profile not found")

    marks = db.query(InternalMark).filter(
        InternalMark.student_id == profile.id
    ).order_by(InternalMark.subject_name, InternalMark.ia_type).all()

    # Group by subject
    subjects = {}
    for m in marks:
        if m.subject_name not in subjects:
            subjects[m.subject_name] = {"subject": m.subject_name, "marks": {}}
        subjects[m.subject_name]["marks"][m.ia_type] = {
            "obtained": m.obtained_marks,
            "max": m.max_marks,
            "percentage": round((m.obtained_marks / m.max_marks) * 100, 1) if m.max_marks else 0,
        }

    # Calculate average per subject
    result = []
    for subj_data in subjects.values():
        marks_list = subj_data["marks"]
        total_obtained = sum(v["obtained"] for v in marks_list.values())
        total_max = sum(v["max"] for v in marks_list.values())
        subj_data["average_pct"] = round((total_obtained / total_max) * 100, 1) if total_max else 0
        result.append(subj_data)

    # Overall average
    all_marks = [m for m in marks]
    overall_pct = 0
    if all_marks:
        t_obt = sum(m.obtained_marks for m in all_marks)
        t_max = sum(m.max_marks for m in all_marks)
        overall_pct = round((t_obt / t_max) * 100, 1) if t_max else 0

    return {
        "student_id": profile.id,
        "overall_percentage": overall_pct,
        "subjects": result,
    }


# ── GET /ia-marks/student/{id} — Specific student's marks ────────────────────
@router.get("/student/{student_id}")
def get_student_ia_marks(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    """Return a specific student's IA marks grouped by subject."""
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(404, "Student not found")

    if current_user.role in ("hod", "faculty") and profile.department_id != current_user.department_id:
        raise HTTPException(403, "Student is not in your department")

    marks = db.query(InternalMark).filter(
        InternalMark.student_id == student_id
    ).order_by(InternalMark.subject_name, InternalMark.ia_type).all()

    subjects = {}
    for m in marks:
        if m.subject_name not in subjects:
            subjects[m.subject_name] = {"subject": m.subject_name, "marks": {}}
        subjects[m.subject_name]["marks"][m.ia_type] = {
            "obtained": m.obtained_marks,
            "max": m.max_marks,
            "percentage": round((m.obtained_marks / m.max_marks) * 100, 1) if m.max_marks else 0,
        }

    result = []
    for subj_data in subjects.values():
        marks_list = subj_data["marks"]
        total_obtained = sum(v["obtained"] for v in marks_list.values())
        total_max = sum(v["max"] for v in marks_list.values())
        subj_data["average_pct"] = round((total_obtained / total_max) * 100, 1) if total_max else 0
        result.append(subj_data)

    all_marks = [m for m in marks]
    overall_pct = 0
    if all_marks:
        t_obt = sum(m.obtained_marks for m in all_marks)
        t_max = sum(m.max_marks for m in all_marks)
        overall_pct = round((t_obt / t_max) * 100, 1) if t_max else 0

    return {
        "student_id": student_id,
        "student_name": profile.user.name if profile.user else None,
        "roll_number": profile.roll_number,
        "overall_percentage": overall_pct,
        "subjects": result,
    }


# ── POST /ia-marks/upload — CSV upload ────────────────────────────────────────
@router.post("/upload")
def upload_ia_marks_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    """
    Upload CSV to bulk-insert IA marks.

    CSV format: roll_number,subject,ia_type,max_marks,obtained_marks
    Example:
        CS001,Mathematics,IA1,20,18
        CS001,DBMS,IA1,20,15
    """
    try:
        content = file.file.read().decode("utf-8")
        df = pd.read_csv(io.StringIO(content))
    except Exception as e:
        raise HTTPException(400, f"Invalid CSV: {str(e)}")

    required_cols = {"roll_number", "subject", "ia_type"}
    if not required_cols.issubset(set(df.columns)):
        raise HTTPException(400, f"CSV must have columns: {required_cols}. Got: {list(df.columns)}")

    saved = 0
    updated = 0
    skipped = 0
    affected_students = set()

    for _, row in df.iterrows():
        roll = str(row["roll_number"]).strip()
        subject = str(row["subject"]).strip()
        ia_type = str(row["ia_type"]).strip().upper()
        max_m = float(row.get("max_marks", 20))
        obtained = float(row.get("obtained_marks", 0))

        if ia_type not in ("IA1", "IA2", "IA3"):
            skipped += 1
            continue

        # Find student by roll number within department scope
        query = db.query(StudentProfile).filter(StudentProfile.roll_number == roll)
        if current_user.role in ("hod", "faculty"):
            query = query.filter(StudentProfile.department_id == current_user.department_id)
        profile = query.first()

        if not profile:
            skipped += 1
            continue

        obtained = max(0, min(obtained, max_m))

        existing = db.query(InternalMark).filter(
            InternalMark.student_id == profile.id,
            InternalMark.subject_name == subject,
            InternalMark.ia_type == ia_type,
        ).first()

        if existing:
            existing.obtained_marks = obtained
            existing.max_marks = max_m
            existing.faculty_id = current_user.id
            updated += 1
        else:
            db.add(InternalMark(
                student_id=profile.id,
                subject_name=subject,
                ia_type=ia_type,
                max_marks=max_m,
                obtained_marks=obtained,
                faculty_id=current_user.id,
            ))
            saved += 1

        affected_students.add(profile.id)

    db.flush()

    # Auto-update academic records
    for sid in affected_students:
        pct = _calc_internal_marks_pct(db, sid)
        _update_academic_record_and_predict(db, sid, pct)

    db.commit()

    return {
        "message": "CSV uploaded successfully",
        "new_records": saved,
        "updated_records": updated,
        "skipped": skipped,
        "students_affected": len(affected_students),
    }
