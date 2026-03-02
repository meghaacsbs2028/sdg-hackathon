"""User management endpoints with department-based access control."""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from typing import Optional
import pandas as pd
import io

from auth.utils import hash_password
from auth.dependencies import get_current_user, require_role
from database.db import get_db
from models.user import User
from models.student_profile import StudentProfile
from models.department import Department

router = APIRouter(prefix="/users", tags=["User Management"])

VALID_ROLES = ("admin", "hod", "faculty", "student")


# ── Request schema ────────────────────────────────────────────────────────────
class CreateUserRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "student"
    department_id: Optional[int] = None
    # Student-specific fields (required when role=student)
    roll_number: Optional[str] = None
    year: Optional[int] = None
    section: Optional[str] = None
    admission_year: Optional[int] = None


def _user_to_dict(user: User) -> dict:
    result = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "department_id": user.department_id,
        "department_name": user.department.name if user.department else None,
        "department_code": user.department.code if user.department else None,
    }
    # Include student profile info if present
    if user.student_profile:
        result["student_profile"] = {
            "id": user.student_profile.id,
            "roll_number": user.student_profile.roll_number,
            "year": user.student_profile.year,
            "section": user.student_profile.section,
            "admission_year": user.student_profile.admission_year,
        }
    return result


# ── GET /users ────────────────────────────────────────────────────────────────
@router.get("/")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    """Return users. Admin: all. HOD/Faculty: same-department only."""
    if current_user.role == "admin":
        users = db.query(User).all()
    else:
        # HOD/Faculty sees only users in their department
        users = db.query(User).filter(
            User.department_id == current_user.department_id
        ).all()

    return {"users": [_user_to_dict(u) for u in users]}


# ── POST /users ───────────────────────────────────────────────────────────────
@router.post("/", status_code=status.HTTP_201_CREATED)
def create_user(
    data: CreateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    """Create a new user. Admin: any role+dept. HOD: faculty/student. Faculty: student only."""
    if data.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(VALID_ROLES)}")

    # Faculty restrictions — can only create students
    if current_user.role == "faculty":
        if data.role != "student":
            raise HTTPException(status_code=403, detail="Faculty can only create student users")
        data.department_id = current_user.department_id

    # HOD restrictions
    if current_user.role == "hod":
        if data.role in ("admin", "hod"):
            raise HTTPException(status_code=403, detail="HOD cannot create admin or HOD users")
        # Force department to HOD's own department
        data.department_id = current_user.department_id

    # Validate department rules
    if data.role in ("hod", "faculty", "student"):
        if not data.department_id:
            raise HTTPException(status_code=400, detail=f"{data.role.upper()} must be assigned to a department")
        dept = db.query(Department).filter(Department.id == data.department_id).first()
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")
    elif data.role == "admin":
        data.department_id = None  # Admin doesn't belong to a department

    # Check for student-specific fields
    if data.role == "student":
        if not data.roll_number:
            raise HTTPException(status_code=400, detail="roll_number is required for student users")
        # Check uniqueness of roll_number within department
        existing_roll = db.query(StudentProfile).filter(
            StudentProfile.department_id == data.department_id,
            StudentProfile.roll_number == data.roll_number,
        ).first()
        if existing_roll:
            raise HTTPException(status_code=409, detail=f"Roll number '{data.roll_number}' already exists in this department")

    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
        department_id=data.department_id,
    )
    db.add(user)
    db.flush()  # Get user.id before creating profile

    # Auto-create StudentProfile for student users
    if data.role == "student":
        profile = StudentProfile(
            user_id=user.id,
            roll_number=data.roll_number,
            department_id=data.department_id,
            year=data.year,
            section=data.section,
            admission_year=data.admission_year,
        )
        db.add(profile)

    db.commit()
    db.refresh(user)

    return {
        "message": "User created successfully",
        "user": _user_to_dict(user),
    }


# ── DELETE /users/{id} ────────────────────────────────────────────────────────
@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    """Delete a user. Admin: any. HOD: own-dept non-admin/non-hod. Faculty: students in own dept.
    Cascade deletes StudentProfile and AcademicRecords automatically."""
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user.role == "faculty":
        if user.role != "student":
            raise HTTPException(status_code=403, detail="Faculty can only delete student users")
        if user.department_id != current_user.department_id:
            raise HTTPException(status_code=403, detail="Faculty can only delete students in their own department")

    if current_user.role == "hod":
        if user.role in ("admin", "hod"):
            raise HTTPException(status_code=403, detail="HOD cannot delete admin or HOD users")
        if user.department_id != current_user.department_id:
            raise HTTPException(status_code=403, detail="HOD can only delete users in their own department")

    db.delete(user)
    db.commit()

    return {"message": f"User '{user.name}' deleted successfully"}


# ── POST /users/upload (CSV bulk-create) ──────────────────────────────────────
@router.post("/upload")
def upload_users_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hod", "faculty")),
):
    """Bulk-create users via CSV upload.

    Required columns: name, email, password, role
    Optional columns: department_code, roll_number, year, section, admission_year

    Admin: can create any role. Must include 'department_code' for non-admin roles.
    HOD: can create faculty/student only. Department is auto-assigned.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")

    contents = file.file.read()
    df = pd.read_csv(io.BytesIO(contents))

    required = {"name", "email", "password", "role"}
    missing = required - set(df.columns)
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns: {', '.join(missing)}")

    users_created = 0
    errors = []

    for idx, row in df.iterrows():
        row_num = idx + 2  # header is row 1, data starts row 2
        name = str(row["name"]).strip()
        email = str(row["email"]).strip()
        password = str(row["password"]).strip()
        role = str(row["role"]).strip().lower()

        # ── Validate role ─────────────────────────────────────────────────
        if role not in VALID_ROLES:
            errors.append(f"Row {row_num}: Invalid role '{role}'")
            continue

        # ── Faculty restrictions ───────────────────────────────────────────
        if current_user.role == "faculty":
            if role != "student":
                errors.append(f"Row {row_num}: Faculty can only create student users")
                continue

        # ── HOD restrictions ──────────────────────────────────────────────
        if current_user.role == "hod":
            if role in ("admin", "hod"):
                errors.append(f"Row {row_num}: HOD cannot create {role} users")
                continue

        # ── Resolve department ────────────────────────────────────────────
        dept_id = None
        if role == "admin":
            dept_id = None  # admin has no department
        elif current_user.role in ("hod", "faculty"):
            dept_id = current_user.department_id  # auto-assign own dept
        elif "department_code" in df.columns and pd.notna(row.get("department_code")):
            code = str(row["department_code"]).strip()
            dept = db.query(Department).filter(Department.code == code).first()
            if not dept:
                errors.append(f"Row {row_num}: Unknown department code '{code}'")
                continue
            dept_id = dept.id
        else:
            errors.append(f"Row {row_num}: department_code required for role '{role}'")
            continue

        # ── Check duplicate email ─────────────────────────────────────────
        if db.query(User).filter(User.email == email).first():
            errors.append(f"Row {row_num}: Email '{email}' already registered")
            continue

        # ── Student-specific validation ───────────────────────────────────
        roll_number = None
        if role == "student":
            roll_number = str(row.get("roll_number", "")).strip() if pd.notna(row.get("roll_number")) else ""
            if not roll_number:
                errors.append(f"Row {row_num}: roll_number is required for student")
                continue
            existing_roll = db.query(StudentProfile).filter(
                StudentProfile.department_id == dept_id,
                StudentProfile.roll_number == roll_number,
            ).first()
            if existing_roll:
                errors.append(f"Row {row_num}: Roll number '{roll_number}' already exists in department")
                continue

        # ── Create user ───────────────────────────────────────────────────
        user = User(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role=role,
            department_id=dept_id,
        )
        db.add(user)
        db.flush()  # get user.id

        # Auto-create StudentProfile
        if role == "student":
            year_val = int(row["year"]) if pd.notna(row.get("year")) else None
            section_val = str(row["section"]).strip() if pd.notna(row.get("section")) else None
            admission_val = int(row["admission_year"]) if pd.notna(row.get("admission_year")) else None
            profile = StudentProfile(
                user_id=user.id,
                roll_number=roll_number,
                department_id=dept_id,
                year=year_val,
                section=section_val,
                admission_year=admission_val,
            )
            db.add(profile)

        users_created += 1

    db.commit()

    result = {
        "message": "CSV processed successfully",
        "users_created": users_created,
    }
    if errors:
        result["errors"] = errors

    return result
