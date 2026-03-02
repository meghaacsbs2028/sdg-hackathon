// API service layer — connects to FastAPI backend (v2.0)
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res) {
  if (res.status === 401) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function loginUser(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

// ── Departments ───────────────────────────────────────────────────────────────
export async function fetchDepartments() {
  const res = await fetch(`${BASE_URL}/departments/`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

// ── Users ─────────────────────────────────────────────────────────────────────
export async function fetchUsers() {
  const res = await fetch(`${BASE_URL}/users/`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function createUser(data) {
  const res = await fetch(`${BASE_URL}/users/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteUser(userId) {
  const res = await fetch(`${BASE_URL}/users/${userId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

// ── Students (StudentProfile) ─────────────────────────────────────────────────
export async function fetchStudents() {
  const res = await fetch(`${BASE_URL}/students/`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function fetchStudent(profileId) {
  const res = await fetch(`${BASE_URL}/students/${profileId}`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function fetchMyStudentProfile() {
  const res = await fetch(`${BASE_URL}/students/me`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function createStudent(data) {
  const res = await fetch(`${BASE_URL}/students/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

// ── Academic Records ──────────────────────────────────────────────────────────
export async function fetchStudentRecords(profileId) {
  const res = await fetch(`${BASE_URL}/students/${profileId}/records`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function addAcademicRecord(profileId, data) {
  const res = await fetch(`${BASE_URL}/students/${profileId}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function uploadCSV(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE_URL}/students/upload`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: formData,
  });
  return handleResponse(res);
}

export async function uploadUsersCSV(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE_URL}/users/upload`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: formData,
  });
  return handleResponse(res);
}

// ── Predictions ───────────────────────────────────────────────────────────────
export async function predictRisk(data) {
  const res = await fetch(`${BASE_URL}/predictions/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function predictForStudent(profileId) {
  const res = await fetch(`${BASE_URL}/predictions/student/${profileId}`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}
