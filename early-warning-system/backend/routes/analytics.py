"""Analytics endpoints — aggregate stats for admin dashboard."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from database.db import get_db
from auth.dependencies import require_role
from models.student_profile import StudentProfile
from models.academic_record import AcademicRecord
from models.user import User
from models.department import Department

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod")),
):
    """Aggregate analytics for the admin/HOD dashboard."""
    from models.competition import CompetitionEntry
    from models.leetcode_activity import LeetCodeProfile

    # ── 1. Student counts ────────────────────────────────────────────────
    total_students = db.query(func.count(StudentProfile.id)).scalar() or 0

    # ── 2. Department breakdown ──────────────────────────────────────────
    dept_stats = []
    departments = db.query(Department).all()
    for dept in departments:
        count = db.query(func.count(StudentProfile.id)).filter(
            StudentProfile.department_id == dept.id
        ).scalar() or 0
        if count == 0:
            continue
        dept_stats.append({
            "name": dept.name,
            "code": dept.code,
            "student_count": count,
        })

    # ── 3. Risk distribution (from latest records) ───────────────────────
    # Get latest record per student using a subquery
    from sqlalchemy import and_
    from sqlalchemy.orm import aliased
    import pickle, os, numpy as np

    MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "risk_model.pkl")
    with open(MODEL_PATH, "rb") as f:
        bundle = pickle.load(f)
    ml_model = bundle["model"]
    ml_scaler = bundle["scaler"]
    feature_names = bundle["features"]

    # Get all students with their latest academic record
    students = db.query(StudentProfile).all()
    risk_counts = {"Green": 0, "Yellow": 0, "Red": 0, "Unknown": 0}
    at_risk_students = []

    total_attendance = 0
    total_marks = 0
    total_assignment = 0
    total_lms = 0
    total_competition = 0
    students_with_records = 0

    for student in students:
        latest = (
            db.query(AcademicRecord)
            .filter(AcademicRecord.student_id == student.id)
            .order_by(AcademicRecord.created_at.desc())
            .first()
        )
        if not latest:
            risk_counts["Unknown"] += 1
            continue

        students_with_records += 1
        total_attendance += (latest.attendance or 0)
        total_marks += (latest.internal_marks or 0)
        total_assignment += (latest.assignment_score or 0)
        total_lms += (latest.lms_activity or 0)
        total_competition += (latest.competition_score or 0)

        # Run ML prediction
        features = [getattr(latest, f, 0.0) or 0.0 for f in feature_names]
        X = np.array(features).reshape(1, -1)
        X_scaled = ml_scaler.transform(X)
        prob = float(ml_model.predict_proba(X_scaled)[0][1])

        if prob < 0.4:
            risk_level = "Green"
        elif prob <= 0.7:
            risk_level = "Yellow"
        else:
            risk_level = "Red"

        risk_counts[risk_level] += 1

        if risk_level in ("Red", "Yellow"):
            user = db.query(User).filter(User.id == student.user_id).first()
            dept = db.query(Department).filter(Department.id == student.department_id).first()
            at_risk_students.append({
                "id": student.id,
                "name": user.name if user else "Unknown",
                "roll_number": student.roll_number,
                "department": dept.code if dept else "N/A",
                "year": student.year,
                "section": student.section,
                "risk_level": risk_level,
                "risk_score": round(prob, 4),
                "attendance": latest.attendance,
                "internal_marks": latest.internal_marks,
                "assignment_score": latest.assignment_score,
                "lms_activity": latest.lms_activity,
                "competition_score": latest.competition_score,
            })

    # Sort at-risk by score (highest risk first)
    at_risk_students.sort(key=lambda x: x["risk_score"], reverse=True)

    # ── 4. Feature averages ──────────────────────────────────────────────
    n = max(1, students_with_records)
    feature_averages = {
        "attendance": round(total_attendance / n, 1),
        "internal_marks": round(total_marks / n, 1),
        "assignment_score": round(total_assignment / n, 1),
        "lms_activity": round(total_lms / n, 1),
        "competition_score": round(total_competition / n, 1),
    }

    # ── 5. Competition + LeetCode stats ──────────────────────────────────
    total_competitions = db.query(func.count(CompetitionEntry.id)).scalar() or 0
    approved_competitions = db.query(func.count(CompetitionEntry.id)).filter(
        CompetitionEntry.status == "approved"
    ).scalar() or 0
    linked_leetcode = db.query(func.count(LeetCodeProfile.id)).scalar() or 0

    # ── 6. Department-wise risk breakdown ────────────────────────────────
    dept_risk = []
    for dept in departments:
        dept_students = db.query(StudentProfile).filter(
            StudentProfile.department_id == dept.id
        ).all()
        if not dept_students:
            continue

        d_green, d_yellow, d_red = 0, 0, 0
        for s in dept_students:
            rec = (
                db.query(AcademicRecord)
                .filter(AcademicRecord.student_id == s.id)
                .order_by(AcademicRecord.created_at.desc())
                .first()
            )
            if not rec:
                continue

            feats = [getattr(rec, f, 0.0) or 0.0 for f in feature_names]
            X = np.array(feats).reshape(1, -1)
            X_sc = ml_scaler.transform(X)
            p = float(ml_model.predict_proba(X_sc)[0][1])
            if p < 0.4:
                d_green += 1
            elif p <= 0.7:
                d_yellow += 1
            else:
                d_red += 1

        dept_risk.append({
            "department": dept.code,
            "green": d_green,
            "yellow": d_yellow,
            "red": d_red,
            "total": len(dept_students),
        })

    return {
        "total_students": total_students,
        "risk_distribution": risk_counts,
        "at_risk_students": at_risk_students[:20],  # Top 20
        "feature_averages": feature_averages,
        "department_stats": dept_stats,
        "department_risk": dept_risk,
        "total_competitions": total_competitions,
        "approved_competitions": approved_competitions,
        "linked_leetcode": linked_leetcode,
    }
