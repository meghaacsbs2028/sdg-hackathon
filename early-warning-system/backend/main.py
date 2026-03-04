from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.students import router as students_router
from routes.predictions import router as predictions_router
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.departments import router as departments_router
from routes.attendance import router as attendance_router
from database.db import engine, Base

# Import all models so SQLAlchemy registers them
from models.department import Department  # noqa: F401
from models.user import User  # noqa: F401
from models.student_profile import StudentProfile  # noqa: F401
from models.academic_record import AcademicRecord  # noqa: F401
from models.attendance import DailyAttendance  # noqa: F401

app = FastAPI(
    title="Early Warning Student Monitoring System API",
    description="AI-based backend for early student dropout/risk detection",
    version="2.0.0",
)

# Allow frontend (React dev server) to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(departments_router)
app.include_router(students_router)
app.include_router(predictions_router)
app.include_router(attendance_router)


# ── Department seed data ──────────────────────────────────────────────────────
_DEPARTMENTS = [
    {"name": "Computer Science & Engineering", "code": "CSE"},
    {"name": "Computer Science", "code": "CS"},
    {"name": "Computer Science & Business Systems", "code": "CSBS"},
    {"name": "Artificial Intelligence & Data Science", "code": "AIDS"},
    {"name": "Artificial Intelligence & Machine Learning", "code": "AIML"},
    {"name": "Electronics & Communication Engineering", "code": "ECE"},
    {"name": "Electrical & Electronics Engineering", "code": "EEE"},
    {"name": "Advanced Communication Technology", "code": "ACT"},
    {"name": "VLSI Design", "code": "VLSI"},
    {"name": "Civil Engineering", "code": "CIVIL"},
    {"name": "Mechanical Engineering", "code": "MECH"},
]


@app.on_event("startup")
def on_startup():
    # ── Create tables if they don't exist (safe — never drops data) ───────────
    Base.metadata.create_all(bind=engine)

    # ── Seed departments ──────────────────────────────────────────────────────
    from sqlalchemy.orm import Session
    db = Session(bind=engine)
    for dept_data in _DEPARTMENTS:
        if not db.query(Department).filter(Department.code == dept_data["code"]).first():
            db.add(Department(name=dept_data["name"], code=dept_data["code"]))
    db.commit()
    db.close()


@app.get("/")
def root():
    return {"message": "Early Warning System API v2.0 is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
