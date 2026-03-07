# 🎓 ScholarSafe — Early Warning Student Monitoring System

An **AI-powered academic intelligence platform** that proactively identifies students at academic risk through multi-dimensional data analysis, built for **SDG 4 — Quality Education**.

---

## 🛠 Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Backend  | FastAPI (Python 3.10+)              |
| Frontend | React 18 + Vite                     |
| Database | MySQL 8 + SQLAlchemy                |
| ML       | Scikit-learn (Logistic Regression)  |
| Auth     | JWT Token-based authentication      |

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🤖 **ML Risk Prediction** | Auto-predicts Green/Yellow/Red risk levels after every data entry |
| 📊 **Multi-dimensional Analysis** | Attendance, internal marks, assignments, LMS activity |
| 👥 **Role-Based Access** | Admin → HOD → Faculty → Student hierarchy with department scoping |
| 📅 **Daily Attendance Tracking** | Calendar-based marking with history editing |
| 🔥 **Streak Counter** | Gamified attendance streaks for student engagement |
| 📈 **Progress Bars** | Visual attendance percentage bars in tables |
| ✨ **Animated Marking** | Satisfying pop/shake animations when marking attendance |
| 📋 **Defaulters Report** | Auto-identify students below attendance threshold |
| 📥 **CSV Bulk Upload** | Import academic records and users via CSV |
| 📤 **CSV Export** | Download attendance reports as CSV |
| 🎯 **Personalized Interventions** | Auto-generated suggestions based on risk drivers |
| 📉 **Performance Trends** | Line charts showing student progress over terms |
| 🔍 **Advanced Filters & Sorting** | Search, filter by role/dept/year/section, sortable columns |
| ✏️ **Edit User Profiles** | Modal form with role-based access control |
| 🔐 **Access Control** | Faculty can't edit HODs, HODs can't edit Admins |

---

## 📁 Project Structure

```
early-warning-system/
├── backend/
│   ├── main.py                  ← FastAPI entry point
│   ├── requirements.txt         ← Python dependencies
│   ├── .env                     ← DB credentials (gitignored)
│   ├── database/db.py           ← SQLAlchemy engine & session
│   ├── auth/
│   │   ├── dependencies.py      ← JWT auth + role guards
│   │   └── utils.py             ← Password hashing + token creation
│   ├── models/
│   │   ├── user.py              ← User model (admin/hod/faculty/student)
│   │   ├── student_profile.py   ← Student profile with department
│   │   ├── academic_record.py   ← Per-term academic metrics
│   │   ├── attendance.py        ← Daily attendance records
│   │   └── department.py        ← Department model
│   ├── routes/
│   │   ├── auth.py              ← Login / register
│   │   ├── users.py             ← User CRUD + CSV upload
│   │   ├── students.py          ← Student profiles + academic records
│   │   ├── attendance.py        ← Daily attendance + streak calculation
│   │   ├── departments.py       ← Department management
│   │   └── predictions.py       ← Manual risk prediction
│   └── ml/
│       ├── train_model.py       ← Model training script
│       ├── students_dataset.csv ← Training data
│       └── risk_model.pkl       ← Saved model (gitignored)
│
└── frontend/
    ├── vite.config.js
    └── src/
        ├── App.jsx              ← Routing for all roles
        ├── components/Navbar.jsx
        ├── layouts/
        │   ├── AdminLayout.jsx  ← Admin portal layout
        │   ├── HodLayout.jsx    ← HOD portal layout
        │   ├── FacultyLayout.jsx← Faculty portal layout
        │   └── StudentLayout.jsx← Student portal layout
        ├── pages/
        │   ├── Login.jsx        ← Authentication page
        │   ├── Dashboard.jsx    ← Student dashboard + risk prediction
        │   ├── Attendance.jsx   ← Mark/edit daily attendance
        │   ├── StudentList.jsx  ← Student records + academic history
        │   ├── DefaultersReport.jsx ← Low-attendance report
        │   └── UserManagement.jsx   ← Admin user CRUD with filters
        └── services/api.js      ← All API calls
```

---

## 🚀 Getting Started (New Team Member Setup)

### Prerequisites

- **Python 3.10+** → [python.org/downloads](https://www.python.org/downloads/)
- **Node.js 18+** → [nodejs.org](https://nodejs.org/)
- **MySQL 8+** → [dev.mysql.com/downloads](https://dev.mysql.com/downloads/)
- **Git** → [git-scm.com](https://git-scm.com/)

---

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/meghaacsbs2028/sdg-hackathon.git
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

---

### 5️⃣ Train the ML Model

The `.pkl` model file is gitignored, so you must generate it:

```bash
python ml/train_model.py
```

✅ Should print accuracy metrics and create `ml/risk_model.pkl`.

---

### 6️⃣ Start the Backend Server

```bash
.\venv\Scripts\uvicorn main:app --reload --port 8000
```

✅ API docs available at **http://localhost:8000/docs**

---

### 7️⃣ Frontend Setup (open a new terminal)

```bash
cd frontend
npm install
npm run dev
```

✅ App runs at **http://localhost:5173** (or next available port)

---

## 📋 Quick Start (Copy-Paste)

```bash
# Clone & navigate
git clone https://github.com/meghaacsbs2028/sdg-hackathon.git
cd sdg-hackathon/early-warning-system

# ── Backend ──────────────────────────────
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
# ⚠️ Create backend/.env (see Step 3 above)
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS early_warning_db;"
python ml/train_model.py
.\venv\Scripts\uvicorn main:app --reload --port 8000

# ── Frontend (new terminal) ─────────────
cd ../frontend
npm install
npm run dev
```

---

## 🤝 Collaboration Workflow

### Branching Strategy

```bash
# Always create a feature branch
git checkout -b feature/your-feature-name

# Make your changes, then commit
git add .
git commit -m "Add: brief description of change"

# Push your branch
git push origin feature/your-feature-name

# Create a Pull Request on GitHub to merge into main
```

### Rules

1. **Never push directly to `main`** — always use Pull Requests
2. **Create `.env` locally** — never commit secrets
3. **Train model locally** — run `python ml/train_model.py` after cloning
4. **Test before pushing** — run `npm run build` for frontend checks

---

## 🧠 ML Model Details

Uses **Logistic Regression** to predict student dropout risk:

| Feature            | Description                     |
|--------------------|---------------------------------|
| `attendance`       | Class attendance %              |
| `internal_marks`   | Internal exam score (0–100)     |
| `assignment_score` | Assignment completion (0–100)   |
| `lms_activity`     | LMS engagement score (0–100)    |

**Risk Levels:**

| Probability | Level       | Action    |
|-------------|-------------|-----------|
| < 0.4       | 🟢 Green   | Safe      |
| 0.4 – 0.7  | 🟡 Yellow  | Monitor   |
| > 0.7       | 🔴 Red     | Intervene |

---

## 📡 API Endpoints

| Method | Endpoint                     | Description                         |
|--------|------------------------------|-------------------------------------|
| POST   | `/auth/login`                | Login, returns JWT token            |
| GET    | `/users`                     | List all users (role-filtered)      |
| POST   | `/users`                     | Create user                         |
| PUT    | `/users/{id}`                | Update user details                 |
| DELETE | `/users/{id}`                | Delete user                         |
| GET    | `/students`                  | All students + risk predictions     |
| GET    | `/students/me`               | Current student's dashboard data    |
| GET    | `/students/{id}`             | Single student detail               |
| POST   | `/students/{id}/records`     | Add academic record                 |
| GET    | `/attendance?date=YYYY-MM-DD`| Get attendance for a date           |
| POST   | `/attendance`                | Save/update bulk attendance         |
| GET    | `/attendance/history`        | Attendance history for reports      |
| GET    | `/departments`               | List departments                    |
| POST   | `/predictions/predict`       | Manual risk prediction              |

---

## 🌍 SDG Alignment

This project targets **SDG 4 — Quality Education** by helping educational institutions proactively support struggling students before they drop out.

---

## 👥 Team

Built for the **SDG Hackathon 2026**.
