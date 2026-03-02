import { useNavigate, NavLink } from "react-router-dom";
import { Shield, LogOut } from "lucide-react";

export default function Navbar({ accentColor = "#1e3a5f", navLinks = [] }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <nav style={{ ...styles.nav, background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}ee 100%)` }}>
      <div style={styles.inner}>
        <div style={styles.left}>
          <div style={styles.brand}>
            <div style={styles.logoMark}>
              <Shield size={17} color="#fff" strokeWidth={2.5} />
            </div>
            <span style={styles.brandName}>ScholarSafe</span>
          </div>

          <div style={styles.navDivider} />

          <div style={styles.links}>
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                style={({ isActive }) => ({
                  ...styles.link,
                  ...(isActive ? styles.activeLink : {}),
                })}
              >
                {link.icon && <span style={styles.linkIcon}>{link.icon}</span>}
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>

        {user && (
          <div style={styles.right}>
            <div style={styles.userChip}>
              <div style={styles.avatar}>
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div style={styles.userMeta}>
                <span style={styles.userName}>{user.name}</span>
                <span style={styles.userRole}>{user.role}</span>
              </div>
            </div>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06)",
  },
  inner: {
    maxWidth: 1280,
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 1.5rem",
    height: 56,
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: "var(--radius-md)",
    background: "rgba(255,255,255,0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  brandName: {
    fontSize: "1.05rem",
    fontWeight: 800,
    color: "var(--white)",
    letterSpacing: "-0.02em",
  },
  navDivider: {
    width: 1,
    height: 24,
    background: "rgba(255,255,255,0.15)",
  },
  links: {
    display: "flex",
    gap: "0.2rem",
  },
  link: {
    padding: "0.4rem 0.85rem",
    borderRadius: "var(--radius-sm)",
    color: "rgba(255,255,255,0.65)",
    textDecoration: "none",
    fontSize: "0.82rem",
    fontWeight: 500,
    transition: "all 0.2s ease",
    letterSpacing: "0.005em",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
  },
  activeLink: {
    background: "rgba(255,255,255,0.15)",
    color: "#fff",
    fontWeight: 700,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  linkIcon: {
    display: "flex",
    alignItems: "center",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  userChip: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.25rem 0.75rem 0.25rem 0.25rem",
    borderRadius: "var(--radius-full)",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "linear-gradient(135deg, var(--accent-500), var(--primary-400))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.82rem",
    fontWeight: 700,
    color: "var(--white)",
  },
  userMeta: {
    display: "flex",
    flexDirection: "column",
    lineHeight: 1.2,
  },
  userName: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--white)",
  },
  userRole: {
    fontSize: "0.68rem",
    color: "rgba(255,255,255,0.5)",
    textTransform: "capitalize",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.4rem 0.85rem",
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.8)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: 600,
    transition: "all 0.2s ease",
    letterSpacing: "0.01em",
  },
};
