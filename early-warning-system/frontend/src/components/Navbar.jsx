import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <nav style={styles.nav}>
      <h1 style={styles.title}>🎓 Early Warning Student Monitoring System</h1>
      {user && (
        <div style={styles.right}>
          <span style={styles.userInfo}>
            {user.name} <span style={styles.role}>({user.role})</span>
          </span>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.75rem 1.5rem",
    background: "#1e3a5f",
    color: "white",
  },
  title: {
    margin: 0,
    fontSize: "1.2rem",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  userInfo: {
    fontSize: "0.9rem",
  },
  role: {
    opacity: 0.7,
    fontSize: "0.8rem",
  },
  logoutBtn: {
    padding: "0.35rem 0.9rem",
    background: "transparent",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.5)",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 600,
  },
};
