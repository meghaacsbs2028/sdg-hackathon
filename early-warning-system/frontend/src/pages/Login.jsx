import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, Loader2, AlertTriangle, GraduationCap } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Invalid email or password. Please try again.");
        }
        throw new Error(data.detail || "Login failed. Please try again later.");
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      const role = data.user?.role || "student";
      navigate(`/${role}/dashboard`);
    } catch (err) {
      if (err.name === "TypeError" && err.message.includes("fetch")) {
        setError("Unable to connect to server. Please check if the backend is running.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Animated background orbs */}
      <div style={styles.bgOrb1} />
      <div style={styles.bgOrb2} />
      <div style={styles.bgOrb3} />

      <div style={styles.card}>
        {/* Logo & Branding */}
        <div style={styles.brandSection}>
          <div style={styles.logoCircle}>
            <img src="/favicon.png" alt="ScholarSafe Logo" style={{ width: 40, height: 40, objectFit: "contain", borderRadius: "50%" }} />
          </div>
          <h1 style={styles.brandName}>ScholarSafe</h1>
          <p style={styles.brandTag}>AI-Powered Student Risk Intelligence</p>
        </div>

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email Address</label>
            <div style={styles.inputWrapper}>
              <Mail size={16} style={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@institution.edu"
                required
                disabled={loading}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={16} style={styles.inputIcon} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                style={styles.input}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.submitBtn, ...(loading ? styles.submitBtnLoading : {}) }}
          >
            {loading ? (
              <span style={styles.loadingContent}>
                <Loader2 size={18} style={{ animation: "spin 0.7s linear infinite" }} />
                Signing in...
              </span>
            ) : (
              <span style={styles.btnContent}>
                Sign In <ArrowRight size={18} />
              </span>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.sdgBadge}>
            <GraduationCap size={14} />
            <span>SDG 4 — Quality Education</span>
          </div>
          <p style={styles.footerText}>
            Secure access for Admin, HOD, Faculty & Students
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Styles ────────────────────────────────────────────────────────────────── */
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--gradient-primary)",
    position: "relative",
    overflow: "hidden",
    padding: "2rem",
  },

  bgOrb1: {
    position: "absolute", width: 550, height: 550, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
    top: "-18%", right: "-12%", animation: "pulse 8s ease-in-out infinite",
  },
  bgOrb2: {
    position: "absolute", width: 420, height: 420, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(37,99,168,0.15) 0%, transparent 70%)",
    bottom: "-12%", left: "-8%", animation: "pulse 6s ease-in-out infinite 2s",
  },
  bgOrb3: {
    position: "absolute", width: 220, height: 220, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)",
    top: "45%", left: "35%", animation: "pulse 10s ease-in-out infinite 4s",
  },

  card: {
    width: "100%",
    maxWidth: 420,
    background: "var(--white)",
    borderRadius: "var(--radius-2xl)",
    padding: "2.5rem 2.25rem 2rem",
    boxShadow: "0 32px 64px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05)",
    position: "relative",
    zIndex: 1,
    animation: "scaleIn 0.45s ease-out",
  },

  /* Brand */
  brandSection: {
    textAlign: "center",
    marginBottom: "2rem",
    animation: "fadeInUp 0.5s ease-out",
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: "var(--radius-xl)",
    background: "var(--gradient-primary)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "0.75rem",
    boxShadow: "0 4px 14px rgba(12, 29, 54, 0.3)",
  },
  brandName: {
    fontSize: "1.65rem",
    fontWeight: 800,
    color: "var(--gray-900)",
    letterSpacing: "-0.04em",
    margin: 0,
    lineHeight: 1.2,
  },
  brandTag: {
    fontSize: "0.85rem",
    color: "var(--gray-400)",
    fontWeight: 400,
    margin: "0.3rem 0 0",
  },

  /* Error */
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.7rem 0.9rem",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "var(--radius-md)",
    color: "#dc2626",
    fontSize: "0.82rem",
    marginBottom: "1.25rem",
    animation: "slideDown 0.3s ease-out",
  },

  /* Fields */
  fieldGroup: { marginBottom: "1.15rem" },
  label: {
    display: "block",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--gray-600)",
    marginBottom: "0.35rem",
    letterSpacing: "0.01em",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "0.85rem",
    color: "var(--gray-400)",
    zIndex: 1,
    pointerEvents: "none",
  },
  input: {
    width: "100%",
    padding: "0.7rem 0.85rem 0.7rem 2.6rem",
    border: "1.5px solid var(--gray-200)",
    borderRadius: "var(--radius-md)",
    fontSize: "0.9rem",
    background: "var(--gray-50)",
    color: "var(--gray-800)",
    transition: "all var(--transition-fast)",
    boxSizing: "border-box",
  },

  /* Submit */
  submitBtn: {
    width: "100%",
    marginTop: "0.5rem",
    padding: "0.75rem",
    background: "var(--gradient-primary)",
    color: "var(--white)",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "0.9rem",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.01em",
    transition: "all var(--transition-base)",
    boxShadow: "0 4px 14px rgba(12, 29, 54, 0.25)",
  },
  submitBtnLoading: { opacity: 0.7, cursor: "not-allowed" },
  loadingContent: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
  },
  btnContent: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
  },

  /* Footer */
  footer: {
    textAlign: "center",
    marginTop: "1.75rem",
    paddingTop: "1.25rem",
    borderTop: "1px solid var(--gray-100)",
  },
  sdgBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.3rem 0.8rem",
    background: "var(--accent-50)",
    border: "1px solid var(--accent-200)",
    borderRadius: "var(--radius-full)",
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "var(--accent-700)",
    marginBottom: "0.5rem",
  },
  footerText: {
    fontSize: "0.72rem",
    color: "var(--gray-400)",
    fontWeight: 400,
    margin: 0,
  },
};
