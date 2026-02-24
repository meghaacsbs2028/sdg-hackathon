import os
import pickle

import numpy as np
from fastapi import APIRouter
from pydantic import BaseModel

# ── Load saved model, scaler, and feature names ──────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "risk_model.pkl")

with open(MODEL_PATH, "rb") as f:
    bundle = pickle.load(f)

model = bundle["model"]
scaler = bundle["scaler"]
feature_names = bundle["features"]

router = APIRouter(prefix="/predictions", tags=["Predictions"])


# ── Request schema ────────────────────────────────────────────────────────────
class StudentInput(BaseModel):
    attendance: float
    internal_marks: float
    assignment_score: float
    lms_activity: float
    stress_score: float


# ── POST /predictions/predict ─────────────────────────────────────────────────
@router.post("/predict")
def predict_risk(data: StudentInput):
    """Predict dropout risk for a student based on academic metrics."""

    # 1. Convert input to correct feature order
    features = [getattr(data, f) for f in feature_names]
    X = np.array(features).reshape(1, -1)

    # 2. Scale using saved scaler
    X_scaled = scaler.transform(X)

    # 3. Predict probability of class 1 (at_risk)
    prob = float(model.predict_proba(X_scaled)[0][1])

    # 4. Convert probability to risk level
    if prob < 0.4:
        risk_level = "Green"
    elif prob <= 0.7:
        risk_level = "Yellow"
    else:
        risk_level = "Red"

    return {
        "risk_score": round(prob, 4),
        "risk_level": risk_level,
    }
