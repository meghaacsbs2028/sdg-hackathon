# 🎓 Early Warning Student Monitoring System

An AI-powered system to identify at-risk students early using machine learning, built for the SDG Hackathon.

---

## 📁 Project Structure

```
early-warning-system/
├── backend/              # FastAPI Python backend
│   ├── app/              # App package
│   ├── routes/           # API route handlers
│   │   ├── students.py   # Student CRUD endpoints
│   │   └── predictions.py# ML prediction endpoints
│   ├── models/           # SQLAlchemy ORM models
│   │   └── student.py
│   ├── ml/               # Machine Learning module
│   │   └── model.py      # Logistic Regression risk predictor
│   ├── database/         # DB connection & session
│   │   └── db.py
│   ├── .env              # Environment variables (not committed)
│   ├── main.py           # FastAPI application entry point
│   └── requirements.txt  # Python dependencies
│
└── frontend/             # React + Vite frontend
    └── src/
        ├── components/   # Reusable UI components
        │   └── Navbar.jsx
        ├── pages/        # Page-level components
        │   ├── Dashboard.jsx
        │   └── StudentList.jsx
        └── services/     # API service layer
            └── api.js
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL 8.0+

---

### 🖥 Backend Setup

```bash
cd early-warning-system/backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment (edit DATABASE_URL)
cp .env .env.local

# Start the server
uvicorn main:app --reload --port 8000
```

API docs available at: **http://localhost:8000/docs**

---

### 🌐 Frontend Setup

```bash
cd early-warning-system/frontend

npm install
npm run dev
```

Frontend available at: **http://localhost:5173**

---

### 🗄 Database Setup (MySQL)

```sql
CREATE DATABASE early_warning_db;
```

Update `DATABASE_URL` in `backend/.env` with your MySQL credentials.

---

## 🧠 ML Model

Uses **Logistic Regression** (Scikit-learn) to predict student dropout risk based on:
- CGPA
- Attendance percentage
- Number of backlogs
- (more features to be added)

Risk is classified as: `Low` / `Medium` / `High`

---

## 🛠 Tech Stack

| Layer       | Technology              |
|-------------|-------------------------|
| Backend     | FastAPI (Python)        |
| Frontend    | React + Vite            |
| Database    | MySQL + SQLAlchemy      |
| ML          | Scikit-learn            |

---

## 🌍 SDG Alignment

This project targets **SDG 4 — Quality Education** by helping educational institutions proactively support struggling students before they drop out.
