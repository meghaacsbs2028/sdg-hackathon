import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import { LayoutDashboard, Trophy, BookOpen, ClipboardList, Code2, CalendarOff } from "lucide-react";

const navLinks = [
  { to: "/student/dashboard", label: "My Dashboard", icon: <LayoutDashboard size={18} /> },
  { to: "/student/marks", label: "My Marks", icon: <BookOpen size={18} /> },
  { to: "/student/assignments", label: "Assignments", icon: <ClipboardList size={18} /> },
  { to: "/student/leetcode", label: "LeetCode", icon: <Code2 size={18} /> },
  { to: "/student/competitions", label: "Competitions", icon: <Trophy size={18} /> },
  { to: "/student/leave-requests", label: "Leave / OD", icon: <CalendarOff size={18} /> },
];

export default function StudentLayout() {
  return (
    <Navbar accentColor="#0369a1" navLinks={navLinks}>
      <Outlet />
    </Navbar>
  );
}
