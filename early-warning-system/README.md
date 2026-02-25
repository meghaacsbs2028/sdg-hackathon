# 🎓 Early Warning Student Monitoring System

An AI-powered system to identify at-risk students early using machine learning, built for the SDG Hackathon.

---

## 🛠 Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Backend  | FastAPI (Python 3.10+)              |
| Frontend | React 18 + Vite                     |
| Database | MySQL 8 + SQLAlchemy                |
| ML       | Scikit-learn (Logistic Regression)  |

---

## 📁 Project Structure

```
early-warning-system/
├── backend/
│   ├── main.py                ← FastAPI entry point (CORS, startup)
│   ├── requirements.txt       ← Python dependencies
│   ├── .env                   ← DB credentials (gitignored)
│   ├── database/db.py         ← SQLAlchemy engine & session
│   ├── models/student.py      ← Student ORM model
│   ├── routes/
│   │   ├── students.py        ← GET/POST /students, POST /students/seed
│   │   └── predictions.py     ← POST /predictions/predict
│   └── ml/
│       ├── model.py           ← RiskPredictor class
│       ├── train_model.py     ← Training script
│       └── risk_model.pkl     ← Saved model (gitignored)
│
└── frontend/
    ├── vite.config.js
    └── src/
        ├── App.jsx            ← Tab navigation (Dashboard / Student List)
        ├── components/Navbar.jsx
        ├── pages/
        │   ├── Dashboard.jsx  ← Risk prediction form
        │   └── StudentList.jsx← Student table + chart + interventions
        └── services/api.js
```

---

## 🚀 Getting Started (New Team Member Setup)

### Prerequisites

Make sure you have installed:

- **Python 3.10+** → [python.org/downloads](https://www.python.org/downloads/)
- **Node.js 18+** → [nodejs.org](https://nodejs.org/)
- **MySQL 8+** → [dev.mysql.com/downloads](https://dev.mysql.com/downloads/)
- **Git** → [git-scm.com](https://git-scm.com/)

---

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/<your-username>/sdg-hackathon.git
cd sdg-hackathon/early-warning-system
```

---

### 2️⃣ Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
.\venv\Scripts\activate        # Windows (PowerShell)
# source venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt
```

---

### 3️⃣ Create `backend/.env`

> ⚠️ This file is **gitignored** — each team member must create it manually.

Create a file at `backend/.env` with:

```env
DATABASE_URL=mysql+pymysql://root:<YOUR_MYSQL_PASSWORD>@localhost:3306/early_warning_db
SECRET_KEY=changeme-in-production
```

Replace `<YOUR_MYSQL_PASSWORD>` with your MySQL root password.

---

### 4️⃣ Create the MySQL Database

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS early_warning_db;"
```

(Enter your MySQL password when prompted.)

---

### 5️⃣ Train the ML Model

The `.pkl` model file is gitignored, so you must generate it locally:

```bash
python ml/train_model.py
```

✅ Should print **"Model Accuracy: ~97%"** and create `backend/ml/risk_model.pkl`.

---

### 6️⃣ Start the Backend Server

```bash
.\venv\Scripts\uvicorn main:app --reload --port 8000
```

✅ Should show **"Application startup complete"**

- API docs: **http://localhost:8000/docs**
- Health check: **http://localhost:8000/health**

---

### 7️⃣ Frontend Setup (open a new terminal)

```bash
cd frontend

# Install npm packages
npm install

# Start dev server
npm run dev
```

✅ App runs at **http://localhost:5174**

---

### 8️⃣ Seed Sample Data

Populate the database with 30 sample students (12 Green, 9 Yellow, 9 Red):

**Option A — Using the Swagger UI:**
1. Go to http://localhost:8000/docs
2. Find **POST /students/seed**
3. Click "Try it out" → Execute

**Option B — Using terminal:**
```bash
curl -X POST http://localhost:8000/students/seed
```

---

## 📋 Quick Start (Copy-Paste)

```bash
# Clone & navigate
git clone https://github.com/<your-username>/sdg-hackathon.git
cd sdg-hackathon/early-warning-system

# ── Backend ──────────────────────────────
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
# ⚠️ Create backend/.env (see README Step 3)
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS early_warning_db;"
python ml/train_model.py
.\venv\Scripts\uvicorn main:app --reload --port 8000

# ── Frontend (new terminal) ─────────────
cd ../frontend
npm install
npm run dev
```

---

## 🧠 ML Model Details

Uses **Logistic Regression** to predict student dropout risk based on 5 features:

| Feature            | Description                     |
|--------------------|---------------------------------|
| `attendance`       | Class attendance %              |
| `internal_marks`   | Internal exam score (0–100)     |
| `assignment_score` | Assignment completion (0–100)   |
| `lms_activity`     | LMS engagement score (0–100)    |
| `stress_score`     | Self-reported stress (0–100)    |

**Risk levels:**

| Probability | Level  | Action        |
|-------------|--------|---------------|
| < 0.4       | 🟢 Green  | Safe          |
| 0.4 – 0.7  | 🟡 Yellow | Monitor       |
| > 0.7       | 🔴 Red    | Intervene     |

---

## 📡 API Endpoints

| Method | Endpoint               | Description                          |
|--------|------------------------|--------------------------------------|
| GET    | `/`                    | Health message                       |
| GET    | `/health`              | Health check                         |
| GET    | `/students`            | All students + ML risk predictions   |
| GET    | `/students/{id}`       | Single student + prediction          |
| POST   | `/students`            | Create a new student                 |
| POST   | `/students/seed`       | Seed 30 sample students              |
| POST   | `/predictions/predict` | Predict risk from manual input       |

---

## 🌍 SDG Alignment

This project targets **SDG 4 — Quality Education** by helping educational institutions proactively support struggling students before they drop out.

---

## 👥 Team

Built for the SDG Hackathon 2026.
