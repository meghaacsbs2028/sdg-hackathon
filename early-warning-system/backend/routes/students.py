"""Student management & AcademicRecord endpoints."""

import io
import os
import pickle
import random

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List

from database.db import get_db
from models.student_profile import StudentProfile
from models.academic_record import AcademicRecord
from models.user import User
from models.department import Department
from auth.dependencies import get_current_user, require_role

# ── Load ML model ─────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "risk_model.pkl")

with open(MODEL_PATH, "rb") as f:
    bundle = pickle.load(f)

model = bundle["model"]
scaler = bundle["scaler"]
feature_names = bundle["features"]

router = APIRouter(prefix="/students", tags=["Students"])


# ── Schemas ───────────────────────────────────────────────────────────────────
class AcademicRecordCreate(BaseModel):
    term: str
    attendance: float
    internal_marks: float
    assignment_score: float
    lms_activity: float
    stress_score: float


class StudentCreateRequest(BaseModel):
    """Create a student profile with an initial academic record."""
    roll_number: str
    name: str
    email: str
    password: str
    department_id: int
    year: Optional[int] = None
    section: Optional[str] = None
    admission_year: Optional[int] = None
    # Initial academic record (optional)
    term: Optional[str] = None
    attendance: Optional[float] = None
    internal_marks: Optional[float] = None
    assignment_score: Optional[float] = None
    lms_activity: Optional[float] = None
    stress_score: Optional[float] = None


# ── ML helpers ────────────────────────────────────────────────────────────────
def _predict_for_record(record: AcademicRecord) -> dict:
    """Run ML prediction on an AcademicRecord and return risk info."""
    features = [getattr(record, f, 0.0) or 0.0 for f in feature_names]
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


def _get_interventions(record: AcademicRecord) -> list:
    """Return intervention suggestions based on the latest academic record."""
    suggestions = []
    if (record.attendance or 0) < 65:
        suggestions.append("Improve attendance above 75%.")
    if (record.internal_marks or 0) < 50:
        suggestions.append("Schedule academic mentoring.")
    if (record.assignment_score or 0) < 50:
        suggestions.append("Complete pending assignments.")
    if (record.lms_activity or 0) < 40:
        suggestions.append("Increase LMS engagement.")
    if (record.stress_score or 0) > 70:
        suggestions.append("Refer to counseling support.")
    return suggestions


def _record_to_dict(record: AcademicRecord) -> dict:
    """Convert an AcademicRecord to API-friendly dict."""
    return {
        "id": record.id,
        "term": record.term,
        "attendance": record.attendance,
        "internal_marks": record.internal_marks,
        "assignment_score": record.assignment_score,
        "lms_activity": record.lms_activity,
        "stress_score": record.stress_score,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }


def _student_to_dict(profile: StudentProfile) -> dict:
    """Convert a StudentProfile to a JSON-friendly dict with latest prediction."""
    latest = profile.academic_records[0] if profile.academic_records else None

    data = {
        "id": profile.id,
        "user_id": profile.user_id,
        "name": profile.user.name if profile.user else None,
        "email": profile.user.email if profile.user else None,
        "roll_number": profile.roll_number,
        "department_id": profile.department_id,
        "department_name": profile.department.name if profile.department else None,
        "department_code": profile.department.code if profile.department else None,
        "year": profile.year,
        "section": profile.section,
        "admission_year": profile.admission_year,
    }

    if latest:
        prediction = _predict_for_record(latest)
        interventions = _get_interventions(latest)
        data.update({
            "latest_record": _record_to_dict(latest),
            "attendance": latest.attendance,
            "internal_marks": latest.internal_marks,
            "assignment_score": latest.assignment_score,
            "lms_activity": latest.lms_activity,
            "stress_score": latest.stress_score,
            "risk_score": prediction["risk_score"],
            "risk_level": prediction["risk_level"],
            "risk_drivers": prediction["risk_drivers"],
            "interventions": interventions,
        })
    else:
        data.update({
            "latest_record": None,
            "attendance": None,
            "internal_marks": None,
            "assignment_score": None,
            "lms_activity": None,
            "stress_score": None,
            "risk_score": None,
            "risk_level": "Unknown",
            "risk_drivers": [],
            "interventions": [],
        })

    return data


# ── GET /students ─────────────────────────────────────────────────────────────
@router.get("/")
def get_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    """Return student profiles. Admin: all. HOD/Faculty: same-department only."""
    query = db.query(StudentProfile).options(
        joinedload(StudentProfile.user),
        joinedload(StudentProfile.department),
        joinedload(StudentProfile.academic_records),
    )

    if current_user.role != "admin":
        query = query.filter(StudentProfile.department_id == current_user.department_id)

    students = query.all()
    return {
        "count": len(students),
        "students": [_student_to_dict(s) for s in students],
    }


# ── GET /students/me ──────────────────────────────────────────────────────────
@router.get("/me")
def get_my_student_record(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the student profile linked to the current user."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="This endpoint is for students only")

    profile = db.query(StudentProfile).options(
        joinedload(StudentProfile.user),
        joinedload(StudentProfile.department),
        joinedload(StudentProfile.academic_records),
    ).filter(StudentProfile.user_id == current_user.id).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Your student profile has not been created yet. Contact your admin.")

    return _student_to_dict(profile)


# ── GET /students/{id} ────────────────────────────────────────────────────────
@router.get("/{profile_id}")
def get_student(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return a single student profile with academic history."""
    profile = db.query(StudentProfile).options(
        joinedload(StudentProfile.user),
        joinedload(StudentProfile.department),
        joinedload(StudentProfile.academic_records),
    ).filter(StudentProfile.id == profile_id).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Students can only view their own record
    if current_user.role == "student" and profile.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view your own record")

    # HOD/Faculty can only view students in their department
    if current_user.role in ("hod", "faculty"):
        if profile.department_id != current_user.department_id:
            raise HTTPException(status_code=403, detail="You can only view students in your department")

    result = _student_to_dict(profile)
    # Include full academic history
    result["academic_history"] = [_record_to_dict(r) for r in profile.academic_records]

    return result


# ── GET /students/{id}/records ────────────────────────────────────────────────
@router.get("/{profile_id}/records")
def get_student_records(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all academic records for a student (time-series)."""
    profile = db.query(StudentProfile).filter(StudentProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Students can only view their own
    if current_user.role == "student" and profile.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view your own records")

    if current_user.role in ("hod", "faculty"):
        if profile.department_id != current_user.department_id:
            raise HTTPException(status_code=403, detail="You can only view records for students in your department")

    records = db.query(AcademicRecord).filter(
        AcademicRecord.student_id == profile_id
    ).order_by(AcademicRecord.created_at.desc()).all()

    return {
        "student_id": profile_id,
        "roll_number": profile.roll_number,
        "records": [_record_to_dict(r) for r in records],
    }


# ── POST /students/{id}/records ───────────────────────────────────────────────
@router.post("/{profile_id}/records", status_code=status.HTTP_201_CREATED)
def add_academic_record(
    profile_id: int,
    data: AcademicRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    """Add a new AcademicRecord for a student. Faculty can only add for own-department students."""
    profile = db.query(StudentProfile).filter(StudentProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    if current_user.role in ("hod", "faculty"):
        if profile.department_id != current_user.department_id:
            raise HTTPException(status_code=403, detail="You can only add records for students in your department")

    record = AcademicRecord(
        student_id=profile_id,
        term=data.term,
        attendance=data.attendance,
        internal_marks=data.internal_marks,
        assignment_score=data.assignment_score,
        lms_activity=data.lms_activity,
        stress_score=data.stress_score,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    prediction = _predict_for_record(record)
    return {
        "message": "Academic record created",
        "record": _record_to_dict(record),
        **prediction,
    }


# ── POST /students ────────────────────────────────────────────────────────────
@router.post("/", status_code=status.HTTP_201_CREATED)
def create_student(
    data: StudentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    """Create a new student (User + StudentProfile + optional first AcademicRecord)."""
    from auth.utils import hash_password

    # Department validation
    dept = db.query(Department).filter(Department.id == data.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    if current_user.role in ("hod", "faculty"):
        if data.department_id != current_user.department_id:
            raise HTTPException(status_code=403, detail="You can only create students in your own department")

    # Check roll_number uniqueness within department
    existing_roll = db.query(StudentProfile).filter(
        StudentProfile.department_id == data.department_id,
        StudentProfile.roll_number == data.roll_number,
    ).first()
    if existing_roll:
        raise HTTPException(status_code=409, detail=f"Roll number '{data.roll_number}' already exists in department '{dept.code}'")

    # Check email uniqueness
    existing_email = db.query(User).filter(User.email == data.email).first()
    if existing_email:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create User
    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role="student",
        department_id=data.department_id,
    )
    db.add(user)
    db.flush()

    # Create StudentProfile
    profile = StudentProfile(
        user_id=user.id,
        roll_number=data.roll_number,
        department_id=data.department_id,
        year=data.year,
        section=data.section,
        admission_year=data.admission_year,
    )
    db.add(profile)
    db.flush()

    # Optionally create first AcademicRecord
    if data.term and data.attendance is not None:
        record = AcademicRecord(
            student_id=profile.id,
            term=data.term,
            attendance=data.attendance or 0.0,
            internal_marks=data.internal_marks or 0.0,
            assignment_score=data.assignment_score or 0.0,
            lms_activity=data.lms_activity or 0.0,
            stress_score=data.stress_score or 0.0,
        )
        db.add(record)

    db.commit()
    db.refresh(profile)

    return _student_to_dict(profile)


# ── CSV Upload (admin / hod / faculty) ────────────────────────────────────────
@router.post("/upload")
def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    """Upload CSV to bulk-insert AcademicRecords.

    CSV format: roll_number,term,attendance,internal_marks,assignment_score,lms_activity,stress_score
    Identifies students by (department_id + roll_number).
    Faculty/HOD use their own department. Admin must specify or it uses their department.
    Does NOT overwrite old records — always inserts new ones.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")

    contents = file.file.read()
    df = pd.read_csv(io.BytesIO(contents))

    required = {"roll_number", "term", "attendance", "internal_marks", "assignment_score", "lms_activity", "stress_score"}
    missing = required - set(df.columns)
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns: {', '.join(missing)}")

    dept_id = current_user.department_id
    if not dept_id and current_user.role == "admin":
        # Admin must have department context or CSV should include department_code
        if "department_code" in df.columns:
            pass  # We'll resolve per row
        else:
            raise HTTPException(status_code=400, detail="Admin uploads must include 'department_code' column or set a department context")

    records_added = 0
    errors = []

    for idx, row in df.iterrows():
        roll = str(row["roll_number"]).strip()

        # Resolve department
        row_dept_id = dept_id
        if not row_dept_id and "department_code" in df.columns:
            code = str(row["department_code"]).strip()
            dept = db.query(Department).filter(Department.code == code).first()
            if not dept:
                errors.append(f"Row {idx + 1}: Unknown department code '{code}'")
                continue
            row_dept_id = dept.id

        # Find student by department + roll_number
        profile = db.query(StudentProfile).filter(
            StudentProfile.department_id == row_dept_id,
            StudentProfile.roll_number == roll,
        ).first()

        if not profile:
            errors.append(f"Row {idx + 1}: No student with roll_number '{roll}' in department")
            continue

        record = AcademicRecord(
            student_id=profile.id,
            term=str(row["term"]).strip(),
            attendance=float(row["attendance"]),
            internal_marks=float(row["internal_marks"]),
            assignment_score=float(row["assignment_score"]),
            lms_activity=float(row["lms_activity"]),
            stress_score=float(row["stress_score"]),
        )
        db.add(record)
        records_added += 1

    db.commit()

    result = {
        "message": "CSV processed successfully",
        "records_added": records_added,
    }
    if errors:
        result["errors"] = errors

    return result


# ── Seed data (admin only) ────────────────────────────────────────────────────
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
def seed_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Delete all student data and insert 30 seeded records. (admin only)"""
    from auth.utils import hash_password

    # Clean up existing student data
    db.query(AcademicRecord).delete()
    db.query(StudentProfile).delete()
    # Delete users with role=student
    db.query(User).filter(User.role == "student").delete()
    db.commit()

    # Get all departments
    departments = db.query(Department).all()
    if not departments:
        raise HTTPException(status_code=400, detail="No departments exist. Seed departments first.")

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
        dept = departments[idx % len(departments)]
        email = f"{name.lower().replace(' ', '.')}_{idx}@university.edu"
        roll = f"{dept.code}{2024}{idx + 1:03d}"

        # Create user
        user = User(
            name=name,
            email=email,
            password_hash=hash_password("password123"),
            role="student",
            department_id=dept.id,
        )
        db.add(user)
        db.flush()

        # Create profile
        profile = StudentProfile(
            user_id=user.id,
            roll_number=roll,
            department_id=dept.id,
            year=random.choice([1, 2, 3, 4]),
            section=random.choice(["A", "B", "C"]),
            admission_year=random.choice([2021, 2022, 2023, 2024]),
        )
        db.add(profile)
        db.flush()

        # Create academic record based on risk tier
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

        record = AcademicRecord(
            student_id=profile.id,
            term="Sem1",
            attendance=att,
            internal_marks=im,
            assignment_score=asn,
            lms_activity=lms,
            stress_score=ss,
        )
        db.add(record)

    db.commit()

    return {
        "message": "Seed data inserted successfully",
        "total_students": 30,
    }
