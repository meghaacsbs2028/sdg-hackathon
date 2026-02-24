from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.students import router as students_router
from routes.predictions import router as predictions_router
from database.db import engine, Base
from models.student import Student  # noqa: F401  — ensures model is registered

app = FastAPI(
    title="Early Warning Student Monitoring System API",
    description="AI-based backend for early student dropout/risk detection",
    version="1.0.0",
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
app.include_router(students_router)
app.include_router(predictions_router)


# Auto-create tables on startup
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)



@app.get("/")
def root():
    return {"message": "Early Warning System API is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}

