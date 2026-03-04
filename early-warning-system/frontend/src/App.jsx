import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import StudentList from "./pages/StudentList";
import UserManagement from "./pages/UserManagement";
import UploadRecords from "./pages/UploadRecords";
import Attendance from "./pages/Attendance";
import DefaultersReport from "./pages/DefaultersReport";
import AdminLayout from "./layouts/AdminLayout";
import HodLayout from "./layouts/HodLayout";
import FacultyLayout from "./layouts/FacultyLayout";
import StudentLayout from "./layouts/StudentLayout";

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

/** Redirect to login if no token */
function RequireAuth({ children }) {
  const token = localStorage.getItem("access_token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

/** Block access unless user.role is in allowedRoles */
function RequireRole({ allowedRoles, children }) {
  const user = getUser();
  const role = user?.role;
  if (!allowedRoles.includes(role)) {
    return <Navigate to={`/${role}/dashboard`} replace />;
  }
  return children;
}

/** Root "/" redirects to the correct portal */
function RoleRedirect() {
  const user = getUser();
  const role = user?.role || "student";
  return <Navigate to={`/${role}/dashboard`} replace />;
}

/* ── App ──────────────────────────────────────────────────────────────────── */
export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* ── Admin Portal ───────────────────────────────────────────────── */}
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireRole allowedRoles={["admin"]}>
              <AdminLayout />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route path="dashboard" element={<Dashboard role="admin" user={getUser()} />} />
        <Route path="students" element={<StudentList role="admin" />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="upload-records" element={<UploadRecords />} />
        <Route path="defaulters" element={<DefaultersReport />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>

      {/* ── HOD Portal ─────────────────────────────────────────────────── */}
      <Route
        path="/hod"
        element={
          <RequireAuth>
            <RequireRole allowedRoles={["hod"]}>
              <HodLayout />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route path="dashboard" element={<Dashboard role="hod" user={getUser()} />} />
        <Route path="students" element={<StudentList role="hod" />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="upload-records" element={<UploadRecords />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="defaulters" element={<DefaultersReport />} />
        <Route path="*" element={<Navigate to="/hod/dashboard" replace />} />
      </Route>

      {/* ── Faculty Portal ─────────────────────────────────────────────── */}
      <Route
        path="/faculty"
        element={
          <RequireAuth>
            <RequireRole allowedRoles={["faculty"]}>
              <FacultyLayout />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route path="dashboard" element={<Dashboard role="faculty" user={getUser()} />} />
        <Route path="students" element={<StudentList role="faculty" />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="upload-records" element={<UploadRecords />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="defaulters" element={<DefaultersReport />} />
        <Route path="*" element={<Navigate to="/faculty/dashboard" replace />} />
      </Route>

      {/* ── Student Portal ─────────────────────────────────────────────── */}
      <Route
        path="/student"
        element={
          <RequireAuth>
            <RequireRole allowedRoles={["student"]}>
              <StudentLayout />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route path="dashboard" element={<Dashboard role="student" user={getUser()} />} />
        <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
      </Route>

      {/* ── Root / catch-all ──────────────────────────────────────────── */}
      <Route path="/" element={<RequireAuth><RoleRedirect /></RequireAuth>} />
      <Route path="*" element={<RequireAuth><RoleRedirect /></RequireAuth>} />
    </Routes>
  );
}
