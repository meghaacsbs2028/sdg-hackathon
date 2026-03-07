import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Crosshair, Users, UserPlus, FileUp, CalendarDays, Trophy, BookOpen, ClipboardList, Code2, CalendarOff } from "lucide-react";

const navLinks = [
  { to: "/faculty/dashboard", label: "Predict Risk", icon: <Crosshair size={18} /> },
  { to: "/faculty/students", label: "Students", icon: <Users size={18} /> },
  { to: "/faculty/users", label: "Add Students", icon: <UserPlus size={18} /> },
  { to: "/faculty/upload-records", label: "Upload Records", icon: <FileUp size={18} /> },
  { to: "/faculty/attendance", label: "Attendance", icon: <CalendarDays size={18} /> },
  { to: "/faculty/ia-marks", label: "IA Marks", icon: <BookOpen size={18} /> },
  { to: "/faculty/assignments", label: "Assignments", icon: <ClipboardList size={18} /> },
  { to: "/faculty/leetcode", label: "LeetCode", icon: <Code2 size={18} /> },
  { to: "/faculty/competitions", label: "Competitions", icon: <Trophy size={18} /> },
  { to: "/faculty/leave-requests", label: "Leave / OD", icon: <CalendarOff size={18} /> },
];

export default function FacultyLayout() {
  return (
    <Navbar accentColor="#0f766e" navLinks={navLinks}>
      <Outlet />
    </Navbar>
  );
}
