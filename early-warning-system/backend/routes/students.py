import os
import pickle

import numpy as np
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.db import get_db
from models.student import Student

# ── Load ML model (same bundle used by predictions.py) ───────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "risk_model.pkl")

with open(MODEL_PATH, "rb") as f:
    bundle = pickle.load(f)

model = bundle["model"]
scaler = bundle["scaler"]
feature_names = bundle["features"]

router = APIRouter(prefix="/students", tags=["Students"])


def _predict_for_student(student: Student) -> dict:
    """Run ML prediction and return risk_score + risk_level."""
    features = [getattr(student, f, 0.0) or 0.0 for f in feature_names]
    X = np.array(features).reshape(1, -1)
    X_scaled = scaler.transform(X)
    prob = float(model.predict_proba(X_scaled)[0][1])

    if prob < 0.4:
        risk_level = "Green"
    elif prob <= 0.7:
        risk_level = "Yellow"
    else:
        risk_level = "Red"

    return {"risk_score": round(prob, 4), "risk_level": risk_level}


def _student_to_dict(student: Student) -> dict:
    """Convert a Student ORM instance to a JSON-friendly dict with prediction."""
    prediction = _predict_for_student(student)
    return {
        "id": student.id,
        "student_id": student.student_id,
        "name": student.name,
        "email": student.email,
        "department": student.department,
        "year": student.year,
        "attendance": student.attendance,
        "internal_marks": student.internal_marks,
        "assignment_score": student.assignment_score,
        "lms_activity": student.lms_activity,
        "stress_score": student.stress_score,
        "risk_score": prediction["risk_score"],
        "risk_level": prediction["risk_level"],
    }


@router.get("/")
def get_students(db: Session = Depends(get_db)):
    """Return all students with live ML risk predictions."""
    students = db.query(Student).all()
    return {
        "count": len(students),
        "students": [_student_to_dict(s) for s in students],
    }


@router.get("/{student_id}")
def get_student(student_id: str, db: Session = Depends(get_db)):
    """Return a single student by student_id with ML prediction."""
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        return {"error": f"Student '{student_id}' not found"}
    return _student_to_dict(student)
