import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import { LayoutDashboard, Users, UserPlus, FileUp } from "lucide-react";

const navLinks = [
  { to: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { to: "/admin/students", label: "Students", icon: <Users size={18} /> },
  { to: "/admin/users", label: "Users", icon: <UserPlus size={18} /> },
  { to: "/admin/upload-records", label: "Upload Records", icon: <FileUp size={18} /> },
];

export default function AdminLayout() {
  return (
    <Navbar accentColor="#2d3a34" navLinks={navLinks}>
      <Outlet />
    </Navbar>
  );
}
