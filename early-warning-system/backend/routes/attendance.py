"""
Attendance routes — daily attendance tracking with ML automation.

Faculty/HOD mark students Present or Absent each day.
After saving, the backend automatically:
  1. Recalculates the student's overall attendance percentage.
  2. Updates their latest AcademicRecord.
  3. Runs the ML prediction model.
"""

import pickle
import os
from datetime import date, datetime, timedelta
from typing import List, Optional

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func as sqfunc

from database.db import get_db
from models.user import User
from models.student_profile import StudentProfile
from models.academic_record import AcademicRecord
from models.attendance import DailyAttendance
from auth.dependencies import get_current_user, require_role

# ── Load ML model ─────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "risk_model.pkl")
with open(MODEL_PATH, "rb") as f:
    _bundle = pickle.load(f)
_model = _bundle["model"]
_scaler = _bundle["scaler"]
_feature_names = _bundle["features"]

router = APIRouter(prefix="/attendance", tags=["Attendance"])


# ── Schemas ────────────────────────────────────────────────────────────────────
class AttendanceEntry(BaseModel):
    student_id: int
    status: str  # "Present" | "Absent" | "Late"


class BulkAttendanceRequest(BaseModel):
    date: str  # "YYYY-MM-DD"
    records: List[AttendanceEntry]


class AttendanceStudentOut(BaseModel):
    student_id: int
    name: Optional[str] = None
    roll_number: Optional[str] = None
    year: Optional[int] = None
    section: Optional[str] = None
    status: Optional[str] = None  # None = not marked yet
    attendance_pct: Optional[float] = None


# ── Helpers ────────────────────────────────────────────────────────────────────
def _calc_attendance_pct(db: Session, student_id: int) -> float:
    """Calculate overall attendance % for a student from all DailyAttendance rows."""
    total = db.query(sqfunc.count(DailyAttendance.id)).filter(
        DailyAttendance.student_id == student_id
    ).scalar() or 0
    if total == 0:
        return 0.0
    present = db.query(sqfunc.count(DailyAttendance.id)).filter(
        DailyAttendance.student_id == student_id,
        DailyAttendance.status.in_(["Present", "Late"]),
    ).scalar() or 0
    return round((present / total) * 100, 2)


def _calc_streak(db: Session, student_id: int) -> int:
    """Count consecutive Present/Late days working backwards from the most recent record."""
    rows = (
        db.query(DailyAttendance.status)
        .filter(DailyAttendance.student_id == student_id)
        .order_by(DailyAttendance.date.desc())
        .limit(60)
        .all()
    )
    streak = 0
    for (st,) in rows:
        if st in ("Present", "Late"):
            streak += 1
        else:
            break
    return streak


def _run_ml_for_student(db: Session, student_id: int, attendance_pct: float):
    """Update the latest AcademicRecord's attendance and re-run ML prediction."""
    latest = db.query(AcademicRecord).filter(
        AcademicRecord.student_id == student_id
    ).order_by(AcademicRecord.created_at.desc()).first()

    if not latest:
        # No academic record yet — create a minimal one for the current term
        latest = AcademicRecord(
            student_id=student_id,
            term=f"Auto-{datetime.now().strftime('%Y')}",
            attendance=attendance_pct,
            internal_marks=0.0,
            assignment_score=0.0,
            lms_activity=0.0,
        )
        db.add(latest)
        db.flush()
    else:
        latest.attendance = attendance_pct

    # Run prediction
    features = [getattr(latest, f, 0.0) or 0.0 for f in _feature_names]
    X = np.array(features).reshape(1, -1)
    X_scaled = _scaler.transform(X)
    prob = float(_model.predict_proba(X_scaled)[0][1])

    return {
        "risk_score": round(prob, 4),
        "risk_level": "Green" if prob < 0.4 else ("Yellow" if prob <= 0.7 else "Red"),
    }


# ── GET /attendance?date=YYYY-MM-DD ───────────────────────────────────────────
@router.get("/")
def get_attendance(
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    """Get all students in the user's department with their attendance status for a date."""
    target_date = datetime.strptime(date, "%Y-%m-%d").date() if date else datetime.now().date()

    # Get students filtered by department (except admin sees all)
    query = db.query(StudentProfile)
    if current_user.role in ("hod", "faculty"):
        query = query.filter(StudentProfile.department_id == current_user.department_id)

    students = query.order_by(StudentProfile.roll_number).all()

    # Get existing attendance entries for this date
    student_ids = [s.id for s in students]
    existing = db.query(DailyAttendance).filter(
        DailyAttendance.date == target_date,
        DailyAttendance.student_id.in_(student_ids),
    ).all()
    status_map = {a.student_id: a.status for a in existing}

    result = []
    for s in students:
        # Calculate overall attendance percentage
        att_pct = _calc_attendance_pct(db, s.id)
        result.append({
            "student_id": s.id,
            "name": s.user.name if s.user else None,
            "roll_number": s.roll_number,
            "year": s.year,
            "section": s.section,
            "status": status_map.get(s.id),
            "attendance_pct": att_pct,
            "streak": _calc_streak(db, s.id),
        })

    return {
        "date": target_date.isoformat(),
        "total_students": len(result),
        "marked_count": len(existing),
        "students": result,
    }


# ── POST /attendance ──────────────────────────────────────────────────────────
@router.post("/")
def save_attendance(
    payload: BulkAttendanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    """Bulk-save attendance for a specific date. Upserts (updates if already exists)."""
    target_date = datetime.strptime(payload.date, "%Y-%m-%d").date()
    saved = 0
    updated = 0
    predictions = []

    for entry in payload.records:
        if entry.status not in ("Present", "Absent", "Late"):
            continue

        # Department access control
        profile = db.query(StudentProfile).filter(StudentProfile.id == entry.student_id).first()
        if not profile:
            continue
        if current_user.role in ("hod", "faculty") and profile.department_id != current_user.department_id:
            continue

        # Upsert attendance record
        existing = db.query(DailyAttendance).filter(
            DailyAttendance.student_id == entry.student_id,
            DailyAttendance.date == target_date,
        ).first()

        if existing:
            existing.status = entry.status
            existing.recorded_by_id = current_user.id
            updated += 1
        else:
            db.add(DailyAttendance(
                student_id=entry.student_id,
                date=target_date,
                status=entry.status,
                recorded_by_id=current_user.id,
            ))
            saved += 1

    db.flush()

    # ── AUTOMATION: Recalculate attendance % and run ML for each student ──
    for entry in payload.records:
        if entry.status not in ("Present", "Absent", "Late"):
            continue
        att_pct = _calc_attendance_pct(db, entry.student_id)
        prediction = _run_ml_for_student(db, entry.student_id, att_pct)
        predictions.append({
            "student_id": entry.student_id,
            "attendance_pct": att_pct,
            **prediction,
        })

    db.commit()

    return {
        "message": "Attendance saved and risk predictions updated",
        "date": target_date.isoformat(),
        "new_records": saved,
        "updated_records": updated,
        "predictions": predictions,
    }


# ── GET /attendance/summary ───────────────────────────────────────────────────
@router.get("/summary")
def attendance_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    """Get overall attendance summary for the department."""
    query = db.query(StudentProfile)
    if current_user.role in ("hod", "faculty"):
        query = query.filter(StudentProfile.department_id == current_user.department_id)

    students = query.all()
    summary = []
    for s in students:
        att_pct = _calc_attendance_pct(db, s.id)
        total_days = db.query(sqfunc.count(DailyAttendance.id)).filter(
            DailyAttendance.student_id == s.id
        ).scalar() or 0
        present_days = db.query(sqfunc.count(DailyAttendance.id)).filter(
            DailyAttendance.student_id == s.id,
            DailyAttendance.status.in_(["Present", "Late"]),
        ).scalar() or 0

        summary.append({
            "student_id": s.id,
            "name": s.user.name if s.user else None,
            "roll_number": s.roll_number,
            "total_days": total_days,
            "present_days": present_days,
            "attendance_pct": att_pct,
        })

    return {"students": summary}


# ── GET /attendance/defaulters ────────────────────────────────────────────────
@router.get("/defaulters")
def get_defaulters(
    threshold: float = 75.0,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    """Return students whose attendance is below the given threshold (default 75%)."""
    query = db.query(StudentProfile)
    if current_user.role in ("hod", "faculty"):
        query = query.filter(StudentProfile.department_id == current_user.department_id)

    students = query.order_by(StudentProfile.roll_number).all()

    defaulters = []
    for s in students:
        total_days = db.query(sqfunc.count(DailyAttendance.id)).filter(
            DailyAttendance.student_id == s.id
        ).scalar() or 0

        if total_days == 0:
            continue  # Skip students with no attendance records

        present_days = db.query(sqfunc.count(DailyAttendance.id)).filter(
            DailyAttendance.student_id == s.id,
            DailyAttendance.status.in_(["Present", "Late"]),
        ).scalar() or 0

        absent_days = db.query(sqfunc.count(DailyAttendance.id)).filter(
            DailyAttendance.student_id == s.id,
            DailyAttendance.status == "Absent",
        ).scalar() or 0

        att_pct = round((present_days / total_days) * 100, 2)

        if att_pct < threshold:
            # Get risk level from latest academic record
            latest = db.query(AcademicRecord).filter(
                AcademicRecord.student_id == s.id
            ).order_by(AcademicRecord.created_at.desc()).first()

            risk_score = None
            risk_level = "Unknown"
            if latest:
                features = [getattr(latest, f, 0.0) or 0.0 for f in _feature_names]
                import numpy as np
                X = np.array(features).reshape(1, -1)
                X_scaled = _scaler.transform(X)
                prob = float(_model.predict_proba(X_scaled)[0][1])
                risk_score = round(prob * 100, 1)
                risk_level = "Green" if prob < 0.4 else ("Yellow" if prob <= 0.7 else "Red")

            # Days required to reach threshold
            days_needed = 0
            if att_pct < threshold and total_days > 0:
                # Solve: (present + x) / (total + x) >= threshold/100
                t = threshold / 100
                if t < 1.0:
                    days_needed = max(0, int((t * total_days - present_days) / (1 - t)) + 1)

            defaulters.append({
                "student_id": s.id,
                "name": s.user.name if s.user else None,
                "roll_number": s.roll_number,
                "year": s.year,
                "section": s.section,
                "attendance_pct": att_pct,
                "present_days": present_days,
                "absent_days": absent_days,
                "total_days": total_days,
                "days_to_recover": days_needed,
                "risk_score": risk_score,
                "risk_level": risk_level,
            })

    # Sort by attendance % ascending (worst first)
    defaulters.sort(key=lambda x: x["attendance_pct"])

    return {
        "threshold": threshold,
        "total_defaulters": len(defaulters),
        "defaulters": defaulters,
    }


# ── GET /attendance/history ───────────────────────────────────────────────────
@router.get("/history")
def attendance_history(
    year: Optional[int] = None,
    section: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    """
    Returns the full attendance history for a class (year + section) as a pivot table.
    Each row = one student. Each column beyond the basics = one date.
    Ideal for CSV export on the frontend.
    """
    query = db.query(StudentProfile)
    if current_user.role in ("hod", "faculty"):
        query = query.filter(StudentProfile.department_id == current_user.department_id)
    if year is not None:
        query = query.filter(StudentProfile.year == year)
    if section is not None:
        query = query.filter(StudentProfile.section == section)

    students = query.order_by(StudentProfile.roll_number).all()
    if not students:
        return {"dates": [], "students": []}

    student_ids = [s.id for s in students]

    # Get all attendance records for these students
    records = db.query(DailyAttendance).filter(
        DailyAttendance.student_id.in_(student_ids)
    ).order_by(DailyAttendance.date).all()

    # Collect sorted unique dates
    all_dates = sorted(set(r.date.isoformat() for r in records))

    # Build a lookup: (student_id, date_str) -> status
    lookup = {(r.student_id, r.date.isoformat()): r.status for r in records}

    result = []
    for s in students:
        att_pct = _calc_attendance_pct(db, s.id)
        total = db.query(sqfunc.count(DailyAttendance.id)).filter(
            DailyAttendance.student_id == s.id
        ).scalar() or 0
        present = db.query(sqfunc.count(DailyAttendance.id)).filter(
            DailyAttendance.student_id == s.id,
            DailyAttendance.status.in_(["Present", "Late"]),
        ).scalar() or 0
        absent = db.query(sqfunc.count(DailyAttendance.id)).filter(
            DailyAttendance.student_id == s.id,
            DailyAttendance.status == "Absent",
        ).scalar() or 0

        daily = {d: lookup.get((s.id, d), "") for d in all_dates}

        result.append({
            "student_id": s.id,
            "roll_number": s.roll_number,
            "name": s.user.name if s.user else "",
            "year": s.year,
            "section": s.section,
            "total_days": total,
            "present_days": present,
            "absent_days": absent,
            "attendance_pct": att_pct,
            "daily": daily,   # { "2025-03-01": "Present", ... }
        })

    return {
        "year": year,
        "section": section,
        "dates": all_dates,
        "students": result,
    }


# ── GET /attendance/recent ────────────────────────────────────────────────────
@router.get("/recent")
def attendance_recent(
    days: int = 14,
    year: Optional[int] = None,
    section: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    """
    Returns attendance stats for the last N days.
    Optionally filtered by year and section.
    Used by the frontend to show an edit history panel.
    """
    from datetime import timedelta

    # Scope to department
    student_query = db.query(StudentProfile)
    if current_user.role in ("hod", "faculty"):
        student_query = student_query.filter(
            StudentProfile.department_id == current_user.department_id
        )
    if year is not None:
        student_query = student_query.filter(StudentProfile.year == year)
    if section is not None:
        student_query = student_query.filter(StudentProfile.section == section)

    student_ids = [s.id for s in student_query.all()]
    total_students = len(student_ids)

    today = datetime.now().date()
    result = []
    for i in range(days):
        d = today - timedelta(days=i)
        records = db.query(DailyAttendance).filter(
            DailyAttendance.date == d,
            DailyAttendance.student_id.in_(student_ids) if student_ids else True,
        ).all()

        marked = len(records)
        present = sum(1 for r in records if r.status in ("Present", "Late"))
        absent  = sum(1 for r in records if r.status == "Absent")
        late    = sum(1 for r in records if r.status == "Late")

        result.append({
            "date": d.isoformat(),
            "marked": marked,
            "present": present,
            "absent": absent,
            "late": late,
            "total_students": total_students,
            "pct": round((present / marked) * 100, 1) if marked else None,
        })

    return {"days": result, "total_students": total_students}
