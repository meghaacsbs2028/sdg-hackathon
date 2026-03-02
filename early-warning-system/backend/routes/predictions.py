"""Prediction endpoint — uses latest AcademicRecord for a student."""

import os
import pickle

import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.db import get_db
from models.student_profile import StudentProfile
from models.academic_record import AcademicRecord
from auth.dependencies import get_current_user
from models.user import User

# ── Load saved model, scaler, and feature names ──────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "risk_model.pkl")

with open(MODEL_PATH, "rb") as f:
    bundle = pickle.load(f)

model = bundle["model"]
scaler = bundle["scaler"]
feature_names = bundle["features"]

router = APIRouter(prefix="/predictions", tags=["Predictions"])


# ── Request schema (manual input) ────────────────────────────────────────────
class StudentInput(BaseModel):
    attendance: float
    internal_marks: float
    assignment_score: float
    lms_activity: float
    stress_score: float


def _compute_prediction(features_dict: dict) -> dict:
    """Compute risk prediction from a features dictionary."""
    features = [features_dict.get(f, 0.0) or 0.0 for f in feature_names]
    X = np.array(features).reshape(1, -1)
    X_scaled = scaler.transform(X)
    prob = float(model.predict_proba(X_scaled)[0][1])

    if prob < 0.4:
        risk_level = "Green"
    elif prob <= 0.7:
        risk_level = "Yellow"
    else:
        risk_level = "Red"

    coefficients = model.coef_[0]
    contributions = X_scaled[0] * coefficients
    drivers = sorted(
        [
            {"feature": fname, "impact": round(float(abs(c)), 4)}
            for fname, c in zip(feature_names, contributions)
        ],
        key=lambda d: d["impact"],
        reverse=True,
    )

    return {
        "risk_score": round(prob, 4),
        "risk_level": risk_level,
        "risk_drivers": drivers,
    }


# ── POST /predictions/predict ─────────────────────────────────────────────────
@router.post("/predict")
def predict_risk(data: StudentInput):
    """Predict dropout risk from manually entered metrics."""
    return _compute_prediction(data.model_dump())


# ── GET /predictions/student/{profile_id} ─────────────────────────────────────
@router.get("/student/{profile_id}")
def predict_for_student(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Predict risk for a student using their latest AcademicRecord."""
    profile = db.query(StudentProfile).filter(StudentProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Access control
    if current_user.role == "student" and profile.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view your own prediction")
    if current_user.role in ("hod", "faculty"):
        if profile.department_id != current_user.department_id:
            raise HTTPException(status_code=403, detail="You can only predict for students in your department")

    # Get latest academic record
    latest = db.query(AcademicRecord).filter(
        AcademicRecord.student_id == profile_id
    ).order_by(AcademicRecord.created_at.desc()).first()

    if not latest:
        raise HTTPException(status_code=404, detail="No academic records found for this student")

    features = {
        "attendance": latest.attendance,
        "internal_marks": latest.internal_marks,
        "assignment_score": latest.assignment_score,
        "lms_activity": latest.lms_activity,
        "stress_score": latest.stress_score,
    }

    result = _compute_prediction(features)
    result["student_id"] = profile_id
    result["term"] = latest.term
    result["record_id"] = latest.id

    return result
