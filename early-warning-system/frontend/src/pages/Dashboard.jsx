import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { fetchMyStudentProfile, predictRisk, fetchStudentAttendanceHistory } from "../services/api";
import {
  ClipboardList, FileText, FileCheck, Monitor, Brain, Trophy,
  ShieldCheck, AlertTriangle, ShieldAlert, HelpCircle,
  LayoutDashboard, Search, Lightbulb, TrendingUp,
  Crosshair, Calendar, Inbox, Loader2, Flame,
} from "lucide-react";
import AttendanceHeatmap from "../components/AttendanceHeatmap";

const fields = [
  { name: "attendance", label: "Attendance (%)", min: 50, max: 100, icon: <ClipboardList size={14} /> },
  { name: "internal_marks", label: "Internal Marks", min: 0, max: 100, icon: <FileText size={14} /> },
  { name: "assignment_score", label: "Assignment Score", min: 0, max: 100, icon: <FileCheck size={14} /> },
  { name: "lms_activity", label: "LMS Activity", min: 0, max: 100, icon: <Monitor size={14} /> },
  { name: "competition_score", label: "Competition Score", min: 0, max: 100, icon: <Trophy size={14} /> },
];

const riskConfig = {
  Green:  { bg: "linear-gradient(135deg, #059669, #10b981)", color: "#fff", label: "Safe", icon: <ShieldCheck size={22} color="#059669" /> },
  Yellow: { bg: "linear-gradient(135deg, #d97706, #eab308)", color: "#fff", label: "Watch", icon: <AlertTriangle size={22} color="#d97706" /> },
  Red:    { bg: "linear-gradient(135deg, #dc2626, #ef4444)", color: "#fff", label: "At Risk", icon: <ShieldAlert size={22} color="#dc2626" /> },
};

/* ── Personal Dashboard for Student Role ──────────────────────────────────── */
function PersonalDashboard() {
  const [student, setStudent] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetchMyStudentProfile(),
      fetchStudentAttendanceHistory(90).catch(() => ({ history: [] }))
    ])
      .then(([profileData, historyData]) => {
        setStudent(profileData);
        setHistory(historyData.history || []);
      })
      .catch((err) => {
        if (err.message.includes("fetch")) {
          setError("Unable to connect to server. Is the backend running?");
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div style={pStyles.loadingBox}>
        <div style={pStyles.spinner} />
        <p style={pStyles.loadingText}>Loading your dashboard...</p>
      </div>
    );
  if (error)
    return (
      <div style={pStyles.container}>
        <div style={pStyles.pageHeader}>
          <h2 style={pStyles.heading}><LayoutDashboard size={20} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> My Dashboard</h2>
        </div>
        <div style={pStyles.emptyCard}>
          <p style={pStyles.emptyText}>{error}</p>
        </div>
      </div>
    );
  if (!student) return null;

  const risk = riskConfig[student.risk_level] || { bg: "#888", color: "#fff", label: "Unknown", icon: <HelpCircle size={22} color="#888" /> };
  const hasRecords = student.risk_level && student.risk_level !== "Unknown";

  return (
    <div style={pStyles.container}>
      {/* Page header */}
      <div style={pStyles.pageHeader}>
        <div>
          <h2 style={pStyles.heading}>📊 My Dashboard</h2>
          <p style={pStyles.sub}>
            Welcome back, <strong>{student.name}</strong>
          </p>
        </div>
      </div>

      {/* Profile Card */}
      <div style={pStyles.profileCard}>
        <div style={pStyles.profileInner}>
          <div style={pStyles.profileAvatar}>
            {student.name?.charAt(0)?.toUpperCase() || "S"}
          </div>
          <div style={pStyles.profileInfo}>
            <h3 style={pStyles.profileName}>{student.name}</h3>
            <p style={pStyles.profileMeta}>
              {student.department_name} • Year {student.year || "—"} • Section {student.section || "—"}
            </p>
          </div>
          <div style={pStyles.profileBadge}>
            <span style={pStyles.rollLabel}>Roll No.</span>
            <span style={pStyles.rollValue}>{student.roll_number}</span>
          </div>
        </div>
      </div>

      {!hasRecords ? (
        <div style={pStyles.emptyCard}>
          <Inbox size={40} color="var(--gray-300)" />
          <p style={pStyles.emptyText}>
            No academic records found yet. Your faculty will upload your metrics soon.
          </p>
        </div>
      ) : (
        <>
          {/* Risk Level Card */}
          <div style={pStyles.riskCard}>
            <div style={pStyles.riskLeft}>
              <span style={pStyles.riskIcon}>{risk.icon}</span>
              <div>
                <span style={pStyles.riskTitle}>Risk Level</span>
                <div style={pStyles.riskBadge}>
                  <span style={{ ...pStyles.riskPill, background: risk.bg }}>{student.risk_level}</span>
                  <span style={pStyles.riskPercent}>{(student.risk_score * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
            {student.latest_record && (
              <div style={pStyles.termBadge}>
                <Calendar size={14} style={{ marginRight: 4 }} /> {student.latest_record.term}
              </div>
            )}
          </div>

          {/* Metrics Grid */}
          <div style={pStyles.metricsGrid}>
            {[
              { label: "Attendance", value: `${student.attendance}%`, icon: <ClipboardList size={18} />, color: "#059669" },
              { label: "Internal Marks", value: student.internal_marks, icon: <FileText size={18} />, color: "#2563eb" },
              { label: "Assignment", value: student.assignment_score, icon: <FileCheck size={18} />, color: "#7c3aed" },
              { label: "LMS Activity", value: student.lms_activity, icon: <Monitor size={18} />, color: "#0891b2" },
              { label: "Competition", value: student.competition_score ?? 0, icon: <Trophy size={18} />, color: "#f59e0b" },
            ].map((m) => (
              <div key={m.label} style={pStyles.metricCard}>
                <span style={{ ...pStyles.metricIcon, color: m.color }}>{m.icon}</span>
                <span style={{ ...pStyles.metricVal, color: m.color }}>{m.value}</span>
                <span style={pStyles.metricLabel}>{m.label}</span>
              </div>
            ))}
          </div>

          {/* Streak Card */}
          {student.streak >= 1 && (
            <div style={{
              padding: "0.85rem 1.25rem", marginBottom: "1rem",
              background: "linear-gradient(135deg, #fef3c7, #fffbeb)",
              border: "1px solid #fde68a", borderLeft: "4px solid #f59e0b",
              borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-sm)",
              display: "flex", alignItems: "center", gap: "0.85rem",
            }}>
              <Flame size={28} color="#f59e0b" fill="#fbbf24" />
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#92400e" }}>
                  🔥 {student.streak}-day present streak!
                </div>
                <div style={{ fontSize: "0.82rem", color: "#b45309", marginTop: 2 }}>
                  {student.streak >= 10 ? "Incredible! You're on fire — keep it going!" :
                   student.streak >= 5 ? "Great consistency! Keep up the momentum!" :
                   "Nice start! Every day counts toward your goals."}
                </div>
              </div>
            </div>
          )}

          {/* Attendance Heatmap */}
          <div style={{ marginBottom: "1rem" }}>
            <AttendanceHeatmap history={history} days={90} />
          </div>

          {/* Risk Drivers */}
          {student.risk_drivers?.length > 0 && (
            <div style={pStyles.sectionCard}>
              <h4 style={pStyles.sectionTitle}><Search size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Risk Drivers</h4>
              <div style={pStyles.driverList}>
                {student.risk_drivers.slice(0, 3).map((d, i) => (
                  <div key={d.feature} style={{
                    ...pStyles.driverChip,
                    ...(i === 0 ? { background: "#fef2f2", borderColor: "#fecaca" } : {}),
                  }}>
                    <span style={pStyles.driverName}>{d.feature.replace(/_/g, " ")}</span>
                    <span style={{ ...pStyles.driverImpact, color: i === 0 ? "#dc2626" : "var(--primary-700)" }}>
                      {d.impact.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interventions */}
          {student.interventions?.length > 0 && (
            <div style={pStyles.interventionCard}>
              <h4 style={pStyles.sectionTitle}><Lightbulb size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Suggestions for You</h4>
              <ul style={pStyles.intList}>
                {student.interventions.map((s, i) => (
                  <li key={i} style={pStyles.intItem}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Performance Trend */}
          <PerformanceTrend
            riskScore={student.risk_score}
            academicHistory={student.academic_history || []}
          />
        </>
      )}
    </div>
  );
}

/* ── Performance Trend Chart ──────────────────────────────────────────────── */
function PerformanceTrend({ riskScore, academicHistory }) {
  const data = useMemo(() => {
    if (academicHistory.length > 0) {
      return academicHistory.slice().reverse().map((rec) => {
        const avg = (
          (100 - (rec.attendance || 0)) * 0.35 +
          (100 - (rec.internal_marks || 0)) * 0.25 +
          (100 - (rec.assignment_score || 0)) * 0.2 +
          (100 - (rec.lms_activity || 0)) * 0.2
        );
        return { period: rec.term, score: +Math.min(100, Math.max(0, avg)).toFixed(1) };
      });
    }
    return [{ period: "Current", score: +(riskScore * 100).toFixed(1) }];
  }, [riskScore, academicHistory]);

  if (data.length < 1) return null;

  return (
    <div style={pStyles.trendCard}>
      <h4 style={pStyles.sectionTitle}><TrendingUp size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Performance Trend</h4>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
          <XAxis dataKey="period" tick={{ fontSize: 12, fill: "var(--gray-500)" }} axisLine={{ stroke: "var(--gray-300)" }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--gray-500)" }} axisLine={{ stroke: "var(--gray-300)" }}
            label={{ value: "Risk %", angle: -90, position: "insideLeft", fontSize: 12, fill: "var(--gray-400)" }} />
          <Tooltip formatter={(val) => [`${val}%`, "Risk Score"]}
            contentStyle={{ borderRadius: 10, fontSize: "0.85rem", boxShadow: "var(--shadow-lg)", border: "1px solid var(--gray-200)" }} />
          <ReferenceLine y={40} stroke="#16a34a" strokeDasharray="4 4" label={{ value: "Safe", fill: "#16a34a", fontSize: 11, position: "right" }} />
          <ReferenceLine y={70} stroke="#dc2626" strokeDasharray="4 4" label={{ value: "At Risk", fill: "#dc2626", fontSize: 11, position: "right" }} />
          <Line type="monotone" dataKey="score" stroke="var(--primary-700)" strokeWidth={3}
            dot={{ r: 5, fill: "var(--primary-700)", stroke: "var(--white)", strokeWidth: 2 }}
            activeDot={{ r: 7, fill: "var(--primary-500)" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Admin / Faculty Prediction Dashboard ─────────────────────────────────── */
export default function Dashboard({ role, user }) {
  if (role === "student") return <PersonalDashboard />;

  const [form, setForm] = useState({
    attendance: "", internal_marks: "", assignment_score: "", lms_activity: "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    const payload = {};
    for (const f of fields) payload[f.name] = parseFloat(form[f.name]);
    try {
      const data = await predictRisk(payload);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resultRisk = result ? (riskConfig[result.risk_level] || { bg: "#888", icon: <HelpCircle size={22} /> }) : null;

  return (
    <div style={styles.container}>
      <div style={styles.pageHeader}>
        <div style={styles.headerIcon}><Crosshair size={24} color="var(--primary-700)" /></div>
        <div>
          <h2 style={styles.heading}>Risk Prediction Engine</h2>
          <p style={styles.subtext}>Enter student metrics to predict dropout risk using ML</p>
        </div>
      </div>

      <div style={styles.formCard}>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGrid}>
            {fields.map((f) => (
              <div key={f.name} style={styles.fieldGroup}>
                <label style={styles.label}>
                  <span style={styles.fieldIcon}>{f.icon}</span> {f.label}
                </label>
                <input
                  type="number"
                  name={f.name}
                  value={form[f.name]}
                  onChange={handleChange}
                  min={f.min}
                  max={f.max}
                  required
                  style={styles.input}
                  placeholder={`${f.min} – ${f.max}`}
                />
              </div>
            ))}
          </div>

          <button type="submit" disabled={loading}
            style={{ ...styles.submitBtn, ...(loading ? { opacity: 0.6, cursor: "not-allowed" } : {}) }}>
            {loading ? (
              <span style={styles.loadingText}><span style={styles.spinnerSmall} /> Analyzing...</span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}><Search size={16} /> Predict Risk</span>
            )}
          </button>
        </form>
      </div>

      {error && (
        <div style={styles.errorBox}><AlertTriangle size={16} style={{ marginRight: 6, flexShrink: 0 }} /> {error}</div>
      )}

      {result && (
        <div style={styles.resultCard}>
          <div style={styles.resultHeader}>
            <span style={styles.resultIcon}>{resultRisk.icon}</span>
            <div>
              <h3 style={styles.resultTitle}>Prediction Result</h3>
              <p style={styles.resultScore}>
                Risk Score: <strong>{(result.risk_score * 100).toFixed(1)}%</strong>
              </p>
            </div>
            <span style={{ ...styles.resultBadge, background: resultRisk.bg }}>
              {result.risk_level}
            </span>
          </div>

          {result.risk_drivers?.length > 0 && (
            <div style={styles.resultDrivers}>
              <strong style={styles.driverLabel}><Search size={14} style={{ marginRight: 4, verticalAlign: "text-bottom" }} /> Top Risk Drivers</strong>
              <div style={styles.driverList}>
                {result.risk_drivers.slice(0, 3).map((d, i) => (
                  <span key={d.feature} style={{
                    ...styles.driverChip,
                    ...(i === 0 ? { background: "#fef2f2", borderColor: "#fecaca" } : {}),
                  }}>
                    {d.feature.replace(/_/g, " ")}{" "}
                    <span style={{ fontWeight: 800, color: i === 0 ? "#dc2626" : "var(--primary-700)" }}>
                      {d.impact.toFixed(2)}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Prediction Dashboard Styles ──────────────────────────────────────────── */
const styles = {
  container: { maxWidth: 600, margin: "2rem auto", padding: "0 1.5rem" },
  pageHeader: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" },
  headerIcon: { fontSize: "2rem", width: 52, height: 52, borderRadius: "var(--radius-lg)", background: "var(--primary-100)", display: "flex", alignItems: "center", justifyContent: "center" },
  heading: { fontSize: "1.5rem", fontWeight: 800, color: "var(--gray-900)", letterSpacing: "-0.03em", margin: 0 },
  subtext: { fontSize: "0.9rem", color: "var(--gray-500)", margin: "0.15rem 0 0" },
  formCard: { padding: "1.5rem", background: "var(--white)", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-md)", marginBottom: "1rem" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "0.3rem" },
  label: { fontWeight: 600, fontSize: "0.82rem", color: "var(--gray-700)", display: "flex", alignItems: "center", gap: "0.3rem" },
  fieldIcon: { fontSize: "0.9rem" },
  input: { padding: "0.6rem 0.75rem", fontSize: "0.95rem", border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius-md)", background: "var(--gray-50)" },
  submitBtn: { width: "100%", padding: "0.75rem", fontSize: "0.95rem", fontWeight: 700, color: "var(--white)", background: "var(--gradient-primary)", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", letterSpacing: "0.01em", boxShadow: "var(--shadow-md)" },
  loadingText: { display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" },
  spinnerSmall: { display: "inline-block", width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid var(--white)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  errorBox: { padding: "0.75rem 1rem", background: "#fef2f2", color: "#dc2626", borderRadius: "var(--radius-md)", border: "1px solid #fecaca", fontSize: "0.88rem", marginBottom: "1rem" },
  resultCard: { padding: "1.5rem", background: "var(--white)", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-lg)", animation: "fadeInUp 0.4s ease-out" },
  resultHeader: { display: "flex", alignItems: "center", gap: "1rem" },
  resultIcon: { fontSize: "2rem" },
  resultTitle: { fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--gray-900)" },
  resultScore: { fontSize: "0.9rem", color: "var(--gray-600)", margin: "0.15rem 0 0" },
  resultBadge: { marginLeft: "auto", padding: "0.4rem 1.2rem", color: "var(--white)", fontWeight: 700, fontSize: "0.9rem", borderRadius: "var(--radius-full)", letterSpacing: "0.3px" },
  resultDrivers: { marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--gray-200)" },
  driverLabel: { fontSize: "0.88rem", display: "block", marginBottom: "0.5rem" },
  driverList: { display: "flex", gap: "0.5rem", flexWrap: "wrap" },
  driverChip: { padding: "0.35rem 0.75rem", background: "var(--gray-100)", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-full)", fontSize: "0.82rem", fontWeight: 600, textTransform: "capitalize" },
};

/* ── Personal Dashboard Styles ────────────────────────────────────────────── */
const pStyles = {
  container: { maxWidth: 720, margin: "2rem auto", padding: "0 1.5rem" },
  pageHeader: { marginBottom: "1.5rem" },
  heading: { fontSize: "1.5rem", fontWeight: 800, color: "var(--gray-900)", letterSpacing: "-0.03em", margin: 0 },
  sub: { fontSize: "0.9rem", color: "var(--gray-500)", margin: "0.25rem 0 0" },
  loadingBox: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5rem 1rem", gap: "1rem" },
  spinner: { width: 40, height: 40, border: "3px solid var(--gray-200)", borderTop: "3px solid var(--primary-700)", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  loadingText: { color: "var(--gray-500)", fontSize: "0.9rem" },
  emptyCard: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", padding: "3rem", background: "var(--white)", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", textAlign: "center" },
  emptyIcon: { fontSize: "2.5rem" },
  emptyText: { color: "var(--gray-500)", fontSize: "0.9rem", maxWidth: 360 },

  /* Profile */
  profileCard: { background: "var(--white)", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", padding: "1.25rem 1.5rem", marginBottom: "1rem", boxShadow: "var(--shadow-sm)" },
  profileInner: { display: "flex", alignItems: "center", gap: "1rem" },
  profileAvatar: { width: 48, height: 48, borderRadius: "50%", background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: 800, color: "var(--white)", flexShrink: 0 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--gray-900)" },
  profileMeta: { fontSize: "0.82rem", color: "var(--gray-500)", margin: "0.15rem 0 0" },
  profileBadge: { display: "flex", flexDirection: "column", alignItems: "center", padding: "0.5rem 1rem", background: "var(--primary-50)", borderRadius: "var(--radius-md)", border: "1px solid var(--primary-100)" },
  rollLabel: { fontSize: "0.68rem", color: "var(--gray-500)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" },
  rollValue: { fontSize: "0.95rem", fontWeight: 700, color: "var(--primary-700)" },

  /* Risk */
  riskCard: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem", background: "var(--white)", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", marginBottom: "1rem", boxShadow: "var(--shadow-sm)" },
  riskLeft: { display: "flex", alignItems: "center", gap: "0.75rem" },
  riskIcon: { fontSize: "1.5rem" },
  riskTitle: { fontSize: "0.78rem", color: "var(--gray-500)", display: "block", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" },
  riskBadge: { display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem" },
  riskPill: { padding: "0.25rem 0.85rem", color: "var(--white)", fontWeight: 700, fontSize: "0.88rem", borderRadius: "var(--radius-full)" },
  riskPercent: { fontSize: "1.1rem", fontWeight: 800, color: "var(--gray-900)" },
  termBadge: { padding: "0.35rem 0.75rem", background: "var(--gray-50)", borderRadius: "var(--radius-full)", fontSize: "0.82rem", color: "var(--gray-600)", fontWeight: 500, border: "1px solid var(--gray-200)" },

  /* Metrics */
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem", marginBottom: "1rem" },
  metricCard: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem", padding: "1rem 0.5rem", background: "var(--white)", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-sm)", transition: "all var(--transition-fast)" },
  metricIcon: { fontSize: "1.1rem" },
  metricVal: { fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em" },
  metricLabel: { fontSize: "0.72rem", color: "var(--gray-500)", textAlign: "center", fontWeight: 500 },

  /* Sections */
  sectionCard: { padding: "1rem 1.25rem", background: "var(--white)", borderRadius: "var(--radius-md)", border: "1px solid var(--gray-200)", marginBottom: "1rem", boxShadow: "var(--shadow-sm)" },
  sectionTitle: { margin: "0 0 0.6rem", fontSize: "0.95rem", fontWeight: 700, color: "var(--gray-900)" },
  driverList: { display: "flex", gap: "0.5rem", flexWrap: "wrap" },
  driverChip: { display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.85rem", background: "var(--gray-50)", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-full)", transition: "all var(--transition-fast)" },
  driverName: { fontSize: "0.82rem", fontWeight: 600, textTransform: "capitalize" },
  driverImpact: { fontSize: "0.82rem", fontWeight: 800 },

  interventionCard: { padding: "1rem 1.25rem", background: "#fffbeb", borderRadius: "var(--radius-md)", border: "1px solid #fde68a", marginBottom: "1rem" },
  intList: { margin: 0, paddingLeft: "1.2rem" },
  intItem: { marginBottom: "0.35rem", fontSize: "0.88rem", color: "var(--gray-700)", lineHeight: 1.6 },

  trendCard: { padding: "1.25rem 1.5rem", background: "var(--white)", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)", marginTop: "0.5rem" },
};
