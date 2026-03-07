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

export async function updateUser(userId, data) {
  const res = await fetch(`${BASE_URL}/users/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
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

// ── Attendance ────────────────────────────────────────────────────────────────
export async function fetchAttendance(date) {
  const params = date ? `?date=${date}` : "";
  const res = await fetch(`${BASE_URL}/attendance/${params}`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function saveAttendance(date, records) {
  const res = await fetch(`${BASE_URL}/attendance/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ date, records }),
  });
  return handleResponse(res);
}

export async function fetchAttendanceSummary() {
  const res = await fetch(`${BASE_URL}/attendance/summary`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function fetchDefaulters(threshold = 75) {
  const res = await fetch(`${BASE_URL}/attendance/defaulters?threshold=${threshold}`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function fetchAttendanceHistory({ year, section } = {}) {
  const params = new URLSearchParams();
  if (year != null) params.set("year", year);
  if (section != null) params.set("section", section);
  const res = await fetch(`${BASE_URL}/attendance/class-history?${params}`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function fetchRecentAttendance({ days = 14, year, section } = {}) {
  const params = new URLSearchParams({ days });
  if (year != null) params.set("year", year);
  if (section != null) params.set("section", section);
  const res = await fetch(`${BASE_URL}/attendance/recent?${params}`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function fetchStudentAttendanceHistory(days = 90, studentId = null) {
  const params = new URLSearchParams({ days });
  if (studentId) params.set("student_id", studentId);
  const res = await fetch(`${BASE_URL}/attendance/history?${params}`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

// ── Competitions ──────────────────────────────────────────────────────────────
export async function submitCompetition(data) {
  const res = await fetch(`${BASE_URL}/competitions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function fetchMyCompetitions() {
  const res = await fetch(`${BASE_URL}/competitions/my`, { headers: { ...authHeaders() } });
  return handleResponse(res);
}

export async function fetchCompetitions(statusFilter) {
  const params = statusFilter ? `?status_filter=${statusFilter}` : "";
  const res = await fetch(`${BASE_URL}/competitions${params}`, { headers: { ...authHeaders() } });
  return handleResponse(res);
}

export async function reviewCompetition(entryId, action, comment) {
  const res = await fetch(`${BASE_URL}/competitions/${entryId}/review`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ action, comment }),
  });
  return handleResponse(res);
}

export async function deleteCompetition(entryId) {
  const res = await fetch(`${BASE_URL}/competitions/${entryId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function fetchScoringInfo() {
  const res = await fetch(`${BASE_URL}/competitions/scoring`, { headers: { ...authHeaders() } });
  return handleResponse(res);
}

// ── Internal Assessment (IA) Marks ────────────────────────────────────────────
export async function fetchIAMarks(iaType, subjectName) {
  const params = new URLSearchParams();
  if (iaType) params.set("ia_type", iaType);
  if (subjectName) params.set("subject_name", subjectName);
  const res = await fetch(`${BASE_URL}/ia-marks/?${params}`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function saveIAMarks(data) {
  const res = await fetch(`${BASE_URL}/ia-marks/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function uploadIAMarksCSV(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE_URL}/ia-marks/upload`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: formData,
  });
  return handleResponse(res);
}

export async function fetchIASubjects() {
  const res = await fetch(`${BASE_URL}/ia-marks/subjects`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function fetchMyIAMarks() {
  const res = await fetch(`${BASE_URL}/ia-marks/my`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function fetchStudentIAMarks(studentId) {
  const res = await fetch(`${BASE_URL}/ia-marks/student/${studentId}`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

// ── Assignments ───────────────────────────────────────────────────────────────
export async function createAssignment(data) {
  const res = await fetch(`${BASE_URL}/assignments/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function fetchAssignments(year, section, subjectName) {
  const params = new URLSearchParams();
  if (year) params.set("year", year);
  if (section) params.set("section", section);
  if (subjectName) params.set("subject_name", subjectName);
  const res = await fetch(`${BASE_URL}/assignments/?${params}`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function fetchAssignmentDetail(id) {
  const res = await fetch(`${BASE_URL}/assignments/${id}`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function deleteAssignment(id) {
  const res = await fetch(`${BASE_URL}/assignments/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function fetchMyAssignments() {
  const res = await fetch(`${BASE_URL}/assignments/my/list`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function submitAssignment(assignmentId, file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE_URL}/assignments/${assignmentId}/submit`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: formData,
  });
  return handleResponse(res);
}

export async function gradeSubmission(assignmentId, studentId, score, feedback) {
  const res = await fetch(`${BASE_URL}/assignments/${assignmentId}/grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ student_id: studentId, score, feedback }),
  });
  return handleResponse(res);
}

// ── LeetCode ──────────────────────────────────────────────────────────────
export async function linkLeetCode(leetcode_username) {
  const res = await fetch(`${BASE_URL}/leetcode/link`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ leetcode_username }),
  });
  return handleResponse(res);
}

export async function syncLeetCode(studentId) {
  const res = await fetch(`${BASE_URL}/leetcode/sync/${studentId}`, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function fetchMyLeetCode() {
  const res = await fetch(`${BASE_URL}/leetcode/my`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function fetchStudentLeetCode(studentId) {
  const res = await fetch(`${BASE_URL}/leetcode/student/${studentId}`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function fetchLeetCodeLeaderboard(year, section) {
  const params = new URLSearchParams();
  if (year) params.set("year", year);
  if (section) params.set("section", section);
  const res = await fetch(`${BASE_URL}/leetcode/class-stats?${params}`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function syncAllLeetCode(year, section) {
  const params = new URLSearchParams();
  if (year) params.set("year", year);
  if (section) params.set("section", section);
  const res = await fetch(`${BASE_URL}/leetcode/sync-all?${params}`, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function fetchContestDefaulters(year, section, lastN = 3) {
  const params = new URLSearchParams();
  if (year) params.set("year", year);
  if (section) params.set("section", section);
  params.set("last_n", lastN);
  const res = await fetch(`${BASE_URL}/leetcode/contest-defaulters?${params}`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

// ── Analytics ─────────────────────────────────────────────────────────────
export async function fetchAnalyticsSummary() {
  const res = await fetch(`${BASE_URL}/analytics/summary`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

// ── Leave & OD Requests ───────────────────────────────────────────────────
export async function submitLeaveRequest(data, proofFile) {
  const formData = new FormData();
  formData.append("request_type", data.request_type);
  formData.append("start_date", data.start_date);
  formData.append("end_date", data.end_date);
  formData.append("reason", data.reason);
  if (data.event_name) formData.append("event_name", data.event_name);
  if (proofFile) formData.append("proof", proofFile);

  const res = await fetch(`${BASE_URL}/leave-requests`, {
    method: "POST",
    headers: { ...authHeaders() },  // no Content-Type — browser sets multipart boundary
    body: formData,
  });
  return handleResponse(res);
}

export async function fetchMyLeaveRequests() {
  const res = await fetch(`${BASE_URL}/leave-requests/my`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function fetchAllLeaveRequests(statusFilter) {
  const url = statusFilter
    ? `${BASE_URL}/leave-requests?status_filter=${statusFilter}`
    : `${BASE_URL}/leave-requests`;
  const res = await fetch(url, { headers: { ...authHeaders() } });
  return handleResponse(res);
}

export async function reviewLeaveRequest(id, data) {
  const res = await fetch(`${BASE_URL}/leave-requests/${id}/review`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function downloadODLetter(id) {
  const res = await fetch(`${BASE_URL}/leave-requests/${id}/letter`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to download letter");
  return res.blob();
}
