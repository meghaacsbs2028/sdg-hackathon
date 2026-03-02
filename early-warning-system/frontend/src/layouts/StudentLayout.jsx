import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import { LayoutDashboard } from "lucide-react";

const navLinks = [
  { to: "/student/dashboard", label: "My Dashboard", icon: <LayoutDashboard size={15} /> },
];

export default function StudentLayout() {
  return (
    <>
      <Navbar accentColor="#15803d" navLinks={navLinks} />
      <Outlet />
    </>
  );
}
