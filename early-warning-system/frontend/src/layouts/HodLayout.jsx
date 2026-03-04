import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Crosshair, Users, UserCog, FileUp, CalendarDays } from "lucide-react";

const navLinks = [
  { to: "/hod/dashboard", label: "Predict Risk", icon: <Crosshair size={15} /> },
  { to: "/hod/students", label: "Students", icon: <Users size={15} /> },
  { to: "/hod/users", label: "Dept Users", icon: <UserCog size={15} /> },
  { to: "/hod/upload-records", label: "Upload Records", icon: <FileUp size={15} /> },
  { to: "/hod/attendance", label: "Attendance", icon: <CalendarDays size={15} /> },
];

export default function HodLayout() {
  return (
    <>
      <Navbar accentColor="#c2410c" navLinks={navLinks} />
      <Outlet />
    </>
  );
}
