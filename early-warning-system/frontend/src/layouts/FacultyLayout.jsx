import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Crosshair, Users, UserPlus, FileUp } from "lucide-react";

const navLinks = [
  { to: "/faculty/dashboard", label: "Predict Risk", icon: <Crosshair size={15} /> },
  { to: "/faculty/students", label: "Students", icon: <Users size={15} /> },
  { to: "/faculty/users", label: "Add Students", icon: <UserPlus size={15} /> },
  { to: "/faculty/upload-records", label: "Upload Records", icon: <FileUp size={15} /> },
];

export default function FacultyLayout() {
  return (
    <>
      <Navbar accentColor="#0f766e" navLinks={navLinks} />
      <Outlet />
    </>
  );
}
