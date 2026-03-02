"""Department management endpoints (admin only)."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.dependencies import require_role
from database.db import get_db
from models.department import Department
from models.user import User

router = APIRouter(prefix="/departments", tags=["Departments"])


class CreateDepartmentRequest(BaseModel):
    name: str
    code: str


@router.get("/")
def list_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Return all departments (admin only)."""
    departments = db.query(Department).order_by(Department.name).all()
    return {
        "departments": [
            {"id": d.id, "name": d.name, "code": d.code}
            for d in departments
        ]
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_department(
    data: CreateDepartmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Create a new department (admin only)."""
    existing = db.query(Department).filter(
        (Department.name == data.name) | (Department.code == data.code)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Department with name '{data.name}' or code '{data.code}' already exists")

    dept = Department(name=data.name, code=data.code)
    db.add(dept)
    db.commit()
    db.refresh(dept)

    return {"message": "Department created", "department": {"id": dept.id, "name": dept.name, "code": dept.code}}
