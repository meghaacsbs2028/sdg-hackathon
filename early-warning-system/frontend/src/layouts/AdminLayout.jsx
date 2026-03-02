import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Crosshair, Users, UserPlus, FileUp } from "lucide-react";

const navLinks = [
  { to: "/admin/dashboard", label: "Predict Risk", icon: <Crosshair size={15} /> },
  { to: "/admin/students", label: "Students", icon: <Users size={15} /> },
  { to: "/admin/users", label: "Users", icon: <UserPlus size={15} /> },
  { to: "/admin/upload-records", label: "Upload Records", icon: <FileUp size={15} /> },
];

export default function AdminLayout() {
  return (
    <>
      <Navbar accentColor="#1e3a5f" navLinks={navLinks} />
      <Outlet />
    </>
  );
}
