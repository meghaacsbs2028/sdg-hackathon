import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Crosshair, Users, UserCog, FileUp, CalendarDays, Trophy, BookOpen, ClipboardList, Code2, CalendarOff } from "lucide-react";

const navLinks = [
  { to: "/hod/dashboard", label: "Predict Risk", icon: <Crosshair size={18} /> },
  { to: "/hod/students", label: "Students", icon: <Users size={18} /> },
  { to: "/hod/users", label: "Dept Users", icon: <UserCog size={18} /> },
  { to: "/hod/upload-records", label: "Upload Records", icon: <FileUp size={18} /> },
  { to: "/hod/attendance", label: "Attendance", icon: <CalendarDays size={18} /> },
  { to: "/hod/ia-marks", label: "IA Marks", icon: <BookOpen size={18} /> },
  { to: "/hod/assignments", label: "Assignments", icon: <ClipboardList size={18} /> },
  { to: "/hod/leetcode", label: "LeetCode", icon: <Code2 size={18} /> },
  { to: "/hod/competitions", label: "Competitions", icon: <Trophy size={18} /> },
  { to: "/hod/leave-requests", label: "Leave / OD", icon: <CalendarOff size={18} /> },
];

export default function HodLayout() {
  return (
    <Navbar accentColor="#7c3aed" navLinks={navLinks}>
      <Outlet />
    </Navbar>
  );
}
