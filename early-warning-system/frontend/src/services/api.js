// API service layer - connects to FastAPI backend
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchStudents() {
  const res = await fetch(`${BASE_URL}/students/`, {
    headers: { ...authHeaders() },
  });
  if (res.status === 401) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!res.ok) throw new Error("Failed to fetch students");
  return res.json();
}

export async function fetchStudent(studentId) {
  const res = await fetch(`${BASE_URL}/students/${studentId}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to fetch student");
  return res.json();
}

export async function predictRisk(data) {
  const res = await fetch(`${BASE_URL}/predictions/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to get prediction");
  return res.json();
}

export async function seedStudents() {
  const res = await fetch(`${BASE_URL}/students/seed`, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to seed students");
  return res.json();
}
