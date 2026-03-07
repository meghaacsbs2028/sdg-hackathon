import { useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";

const W_OPEN = 240;
const W_CLOSED = 72;

export default function Sidebar({ accentColor = "#1e3a5f", navLinks = [], children }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [collapsed, setCollapsed] = useState(false);

  const w = collapsed ? W_CLOSED : W_OPEN;

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside style={{ ...S.sidebar, width: w, background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}dd 100%)` }}>
        {/* Brand */}
        <div style={S.brandArea}>
          <div style={S.brand}>
            <div style={S.logoMark}>
              <img src="/favicon.png" alt="Logo" width="32" height="32" style={{ borderRadius: 6 }} />
            </div>
            {!collapsed && <span style={S.brandName}>ScholarSafe</span>}
          </div>
          <button style={S.collapseBtn} onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Expand" : "Collapse"}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav style={S.nav}>
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              title={collapsed ? link.label : undefined}
              style={({ isActive }) => ({
                ...S.link,
                justifyContent: collapsed ? "center" : "flex-start",
                ...(isActive ? S.linkActive : {}),
              })}
            >
              <span style={S.linkIcon}>{link.icon}</span>
              {!collapsed && <span style={S.linkLabel}>{link.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        {/* User + Logout */}
        {user && (
          <div style={S.bottomArea}>
            <div style={S.divider} />
            <div style={{ ...S.userChip, justifyContent: collapsed ? "center" : "flex-start" }}>
              <div style={S.avatar}>{user.name?.charAt(0)?.toUpperCase() || "U"}</div>
              {!collapsed && (
                <div style={S.userMeta}>
                  <span style={S.userName}>{user.name}</span>
                  <span style={S.userRole}>{user.role}</span>
                </div>
              )}
            </div>
            <button onClick={handleLogout} style={{ ...S.logoutBtn, justifyContent: collapsed ? "center" : "flex-start" }} title="Sign Out">
              <LogOut size={16} />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </div>
        )}
      </aside>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <main style={{ ...S.content, marginLeft: w }}>
        {children}
      </main>
    </div>
  );
}

const S = {
  sidebar: {
    position: "fixed",
    top: 0,
    left: 0,
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    zIndex: 100,
    transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    borderRight: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "2px 0 16px rgba(0,0,0,0.12)",
    overflowX: "hidden",
    overflowY: "auto",
  },
  content: {
    flex: 1,
    minHeight: "100vh",
    background: "var(--gray-50)",
    transition: "margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
  },

  /* Brand */
  brandArea: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "1.1rem 0.85rem 0.85rem", minHeight: 56,
  },
  brand: { display: "flex", alignItems: "center", gap: "0.6rem", overflow: "hidden", whiteSpace: "nowrap" },
  logoMark: { width: 34, height: 34, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  brandName: { fontSize: "1.08rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" },
  collapseBtn: {
    width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", flexShrink: 0, transition: "all 0.2s ease",
  },

  /* Nav */
  nav: { display: "flex", flexDirection: "column", gap: "2px", padding: "0.5rem 0.6rem" },
  link: {
    display: "flex", alignItems: "center", gap: "0.65rem",
    padding: "0.55rem 0.75rem", borderRadius: "var(--radius-md)",
    color: "rgba(255,255,255,0.6)", textDecoration: "none",
    fontSize: "0.88rem", fontWeight: 500, transition: "all 0.2s ease",
    whiteSpace: "nowrap", overflow: "hidden",
  },
  linkActive: {
    background: "rgba(255,255,255,0.15)", color: "#fff",
    fontWeight: 700, boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
  },
  linkIcon: { display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, flexShrink: 0 },
  linkLabel: { overflow: "hidden", textOverflow: "ellipsis" },

  /* Bottom */
  bottomArea: { padding: "0 0.6rem 0.85rem" },
  divider: { height: 1, background: "rgba(255,255,255,0.1)", margin: "0 0.15rem 0.65rem" },
  userChip: {
    display: "flex", alignItems: "center", gap: "0.55rem",
    padding: "0.45rem 0.65rem", borderRadius: "var(--radius-md)",
    background: "rgba(255,255,255,0.06)", marginBottom: "0.4rem", overflow: "hidden",
  },
  avatar: {
    width: 32, height: 32, borderRadius: "50%",
    background: "linear-gradient(135deg, var(--accent-500), var(--primary-400))",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "0.85rem", fontWeight: 700, color: "#fff", flexShrink: 0,
  },
  userMeta: { display: "flex", flexDirection: "column", lineHeight: 1.2, overflow: "hidden" },
  userName: { fontSize: "0.82rem", fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  userRole: { fontSize: "0.68rem", color: "rgba(255,255,255,0.45)", textTransform: "capitalize" },
  logoutBtn: {
    display: "flex", alignItems: "center", gap: "0.5rem", width: "100%",
    padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "0.82rem",
    fontWeight: 600, transition: "all 0.2s ease", whiteSpace: "nowrap",
  },
};
