// API service layer - connects to FastAPI backend
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchStudents() {
  const res = await fetch(`${BASE_URL}/students/`);
  if (!res.ok) throw new Error("Failed to fetch students");
  return res.json();
}

export async function fetchStudent(studentId) {
  const res = await fetch(`${BASE_URL}/students/${studentId}`);
  if (!res.ok) throw new Error("Failed to fetch student");
  return res.json();
}

export async function predictRisk(studentId) {
  const res = await fetch(`${BASE_URL}/predictions/predict?student_id=${studentId}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to get prediction");
  return res.json();
}
