import os
import pickle
import random
import uuid

import numpy as np
from fastapi import APIRouter, Depends
from pydantic import BaseModel
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


# ── Request schema ────────────────────────────────────────────────────────────
class StudentCreate(BaseModel):
    name: str
    attendance: float
    internal_marks: float
    assignment_score: float
    lms_activity: float
    stress_score: float


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

def _get_interventions(student: Student) -> list:
    """Return a list of intervention suggestions based on student metrics."""
    suggestions = []
    if (student.attendance or 0) < 65:
        suggestions.append("Improve attendance above 75%.")
    if (student.internal_marks or 0) < 50:
        suggestions.append("Schedule academic mentoring.")
    if (student.assignment_score or 0) < 50:
        suggestions.append("Complete pending assignments.")
    if (student.lms_activity or 0) < 40:
        suggestions.append("Increase LMS engagement.")
    if (student.stress_score or 0) > 70:
        suggestions.append("Refer to counseling support.")
    return suggestions


def _student_to_dict(student: Student) -> dict:
    """Convert a Student ORM instance to a JSON-friendly dict with prediction."""
    prediction = _predict_for_student(student)
    interventions = _get_interventions(student)
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
        "interventions": interventions,
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


@router.post("/")
def create_student(data: StudentCreate, db: Session = Depends(get_db)):
    """Create a new student record in the database."""
    sid = f"STU-{uuid.uuid4().hex[:8].upper()}"
    email = f"{data.name.lower().replace(' ', '.')}_{sid[-4:]}@university.edu"

    student = Student(
        student_id=sid,
        name=data.name,
        email=email,
        attendance=data.attendance,
        internal_marks=data.internal_marks,
        assignment_score=data.assignment_score,
        lms_activity=data.lms_activity,
        stress_score=data.stress_score,
    )

    db.add(student)
    db.commit()
    db.refresh(student)

    return _student_to_dict(student)


# ── Realistic names for seeding ───────────────────────────────────────────────
_SEED_NAMES = [
    "Aarav Mehta", "Priya Sharma", "Rohan Gupta", "Ananya Iyer",
    "Vikram Singh", "Sneha Patel", "Arjun Reddy", "Kavya Nair",
    "Rahul Joshi", "Diya Kapoor", "Aditya Rao", "Meera Desai",
    "Karan Malhotra", "Pooja Verma", "Siddharth Das", "Neha Kulkarni",
    "Ishaan Bose", "Riya Chatterjee", "Harsh Pandey", "Tanvi Saxena",
    "Varun Pillai", "Shruti Menon", "Nikhil Agarwal", "Swati Tiwari",
    "Manav Sinha", "Kritika Bajaj", "Dev Choudhury", "Anjali Mishra",
    "Pranav Thakur", "Simran Kaur",
]


def _rand(lo: float, hi: float) -> float:
    return round(random.uniform(lo, hi), 1)


@router.post("/seed")
def seed_students(db: Session = Depends(get_db)):
    """Delete all students and insert 30 smart-seeded records."""
    db.query(Student).delete()
    db.commit()

    profiles = (
        # 12 Green
        [("green", i) for i in range(12)] +
        # 9 Yellow
        [("yellow", i) for i in range(9)] +
        # 9 Red
        [("red", i) for i in range(9)]
    )

    names = _SEED_NAMES[:]
    random.shuffle(names)

    for idx, (tier, _) in enumerate(profiles):
        name = names[idx]
        sid = f"STU-{uuid.uuid4().hex[:8].upper()}"
        email = f"{name.lower().replace(' ', '.')}_{sid[-4:]}@university.edu"

        if tier == "green":
            att, im, asn, lms, ss = (
                _rand(80, 100), _rand(70, 100), _rand(70, 100),
                _rand(60, 100), _rand(0, 40),
            )
        elif tier == "yellow":
            att, im, asn, lms, ss = (
                _rand(65, 75), _rand(50, 65), _rand(50, 65),
                _rand(40, 55), _rand(40, 70),
            )
        else:  # red
            att, im, asn, lms, ss = (
                _rand(40, 60), _rand(30, 50), _rand(30, 50),
                _rand(20, 40), _rand(60, 100),
            )

        db.add(Student(
            student_id=sid, name=name, email=email,
            attendance=att, internal_marks=im,
            assignment_score=asn, lms_activity=lms,
            stress_score=ss,
        ))

    db.commit()

    return {
        "message": "Smart seed data inserted successfully",
        "total_students": 30,
    }
