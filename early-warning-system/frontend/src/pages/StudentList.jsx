import { useState, useEffect } from "react";
import { fetchStudents, fetchStudent, addAcademicRecord, fetchStudentAttendanceHistory } from "../services/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  ClipboardList, Sprout, BarChart3, BookOpen, Search,
  Lightbulb, History, PlusCircle, X, Save, Loader2,
  AlertTriangle, CheckCircle, AlertCircle,
} from "lucide-react";
import AttendanceHeatmap from "../components/AttendanceHeatmap";

const badgeColors = {
  Green:   { background: "#16a34a", color: "#fff" },
  Yellow:  { background: "#eab308", color: "#000" },
  Red:     { background: "#dc2626", color: "#fff" },
  Unknown: { background: "#9ca3af", color: "#fff" },
};

export default function StudentList({ role }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadStudents = () => {
    setLoading(true);
    setError("");
    fetchStudents()
      .then((data) => setStudents(data.students || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStudents(); }, []);

  /* ── View Records handler ───────────────────────────────────────────────── */
  const handleViewRecords = async (student) => {
    if (selectedStudent?.id === student.id) {
      setSelectedStudent(null);
      return;
    }
    setDetailLoading(true);
    try {
      const detail = await fetchStudent(student.id);
      setSelectedStudent(detail);
    } catch (err) {
      alert("Error loading records: " + err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading)
    return (
      <div style={styles.loadingBox}>
        <div style={styles.spinner} />
        <p style={styles.msg}>Loading students...</p>
      </div>
    );
  if (error)
    return (
      <div style={styles.errorBox}>
        <p style={{ ...styles.msg, color: "#dc2626" }}> {error}</p>
        <button onClick={loadStudents} style={styles.retryBtn}>Retry</button>
      </div>
    );

  // ── Risk Overview counts ───────────────────────────────────────────────────
  const total  = students.length;
  const green  = students.filter((s) => s.risk_level === "Green").length;
  const yellow = students.filter((s) => s.risk_level === "Yellow").length;
  const red    = students.filter((s) => s.risk_level === "Red").length;
  const unknown = students.filter((s) => !s.risk_level || s.risk_level === "Unknown").length;

  const cards = [
    { label: "Total Students", count: total,   border: "#1e3a5f" },
    { label: "Green (Safe)",   count: green,   border: "#16a34a" },
    { label: "Yellow (Watch)", count: yellow,  border: "#eab308" },
    { label: "Red (At Risk)",  count: red,     border: "#dc2626" },
  ];

  const columns = ["Name", "Roll No.", "Dept", "Year", "Section", "Risk", ""];

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h2 style={styles.heading}><ClipboardList size={20} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Student Risk Overview</h2>
        <div style={styles.headerActions}>
        </div>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div style={styles.cardRow}>
        {cards.map((c) => (
          <div key={c.label} style={{ ...styles.card, borderLeft: `4px solid ${c.border}` }}>
            <span style={styles.cardCount}>{c.count}</span>
            <span style={styles.cardLabel}>{c.label}</span>
          </div>
        ))}
      </div>

      {/* ── Risk Distribution Chart ───────────────────────────────────────── */}
      {total > 0 && (() => {
        const data = [
          { name: "Green (Safe)", count: green, color: "#16a34a" },
          { name: "Yellow (Watch)", count: yellow, color: "#eab308" },
          { name: "Red (At Risk)", count: red, color: "#dc2626" },
        ];

        return (
          <div style={styles.chartSection}>
            <h3 style={styles.chartTitle}><BarChart3 size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Risk Distribution</h3>
            <div style={{ height: 260, width: "100%", marginTop: "1rem" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12, fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: "#f3f4f6", opacity: 0.4 }}
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)", padding: "12px 16px", fontWeight: 600 }}
                    itemStyle={{ color: "#111827", fontWeight: 700 }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} animationDuration={1200} animationEasing="ease-out">
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}

      {/* ── Student Table ──────────────────────────────────────────────────── */}
      {total === 0 ? (
        <p style={styles.empty}>
          <BookOpen size={36} color="var(--gray-300)" style={{ marginBottom: "0.5rem" }} />
          No students found. Seed data or create students to see them here.
        </p>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                {columns.map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const riskBadge = badgeColors[s.risk_level] || badgeColors.Unknown;
                const isExpanded = selectedStudent?.id === s.id;

                return (
                  <>
                    <tr key={s.id} style={styles.tr}>
                      <td style={styles.td}>
                        <strong>{s.name}</strong>
                        <div style={styles.email}>{s.email}</div>
                      </td>
                      <td style={styles.tdCenter}>{s.roll_number}</td>
                      <td style={styles.tdCenter}>
                        <span style={styles.deptChip}>{s.department_code || s.department_name}</span>
                      </td>
                      <td style={styles.tdCenter}>{s.year || "—"}</td>
                      <td style={styles.tdCenter}>{s.section || "—"}</td>
                      <td style={styles.tdCenter}>
                        <span style={{ ...styles.badge, ...riskBadge }}>
                          {s.risk_level || "No Data"}
                        </span>
                        {s.risk_score != null && (
                          <div style={styles.riskScore}>{(s.risk_score * 100).toFixed(0)}%</div>
                        )}
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => handleViewRecords(s)}
                          style={styles.viewBtn}
                          disabled={detailLoading}
                        >
                          {isExpanded ? "Hide" : "View Records"}
                        </button>
                      </td>
                    </tr>

                    {/* ── Expanded Records Row ──────────────────────────── */}
                    {isExpanded && selectedStudent && (
                      <tr key={`${s.id}-detail`}>
                        <td colSpan={columns.length} style={{ padding: 0 }}>
                          <StudentDetail student={selectedStudent} onRecordAdded={() => { handleViewRecords(s); handleViewRecords(s); loadStudents(); }} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Student Detail (expandable row) ──────────────────────────────────────── */
function StudentDetail({ student, onRecordAdded }) {
  const latest = student.latest_record;
  const history = student.academic_history || [];

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    term: "", attendance: "", internal_marks: "",
    assignment_score: "", lms_activity: "",
  });
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState("");
  const [attendanceHistory, setAttendanceHistory] = useState([]);

  useEffect(() => {
    fetchStudentAttendanceHistory(90, student.id)
      .then(res => setAttendanceHistory(res.history || []))
      .catch(() => {});
  }, [student.id]);

  const handleAddRecord = async (e) => {
    e.preventDefault();
    setAdding(true);
    setAddMsg("");
    try {
      const payload = {
        term: addForm.term,
        attendance: parseFloat(addForm.attendance),
        internal_marks: parseFloat(addForm.internal_marks),
        assignment_score: parseFloat(addForm.assignment_score),
        lms_activity: parseFloat(addForm.lms_activity),
      };
      const result = await addAcademicRecord(student.id, payload);
      setAddMsg(` Record added — Risk: ${result.risk_level} (${(result.risk_score * 100).toFixed(0)}%)`);
      setAddForm({ term: "", attendance: "", internal_marks: "", assignment_score: "", lms_activity: "" });
      setShowAddForm(false);
      if (onRecordAdded) onRecordAdded();
    } catch (err) {
      setAddMsg(" " + err.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div style={detailStyles.box}>
      {/* Latest Metrics */}
      {latest ? (
        <div style={detailStyles.metricsSection}>
          <h4 style={detailStyles.sectionTitle}><BarChart3 size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Latest Record — {latest.term}</h4>
          <div style={detailStyles.metricsGrid}>
            {[
              { label: "Attendance", value: `${student.attendance}%` },
              { label: "Internal Marks", value: student.internal_marks },
              { label: "Assignment Score", value: student.assignment_score },
              { label: "LMS Activity", value: student.lms_activity },
              { label: "Competition", value: student.competition_score ?? 0 },
            ].map((m) => (
              <div key={m.label} style={detailStyles.metricCard}>
                <span style={detailStyles.metricVal}>{m.value}</span>
                <span style={detailStyles.metricLabel}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p style={detailStyles.noData}>No academic records yet.</p>
      )}

      {/* Risk Drivers */}
      {student.risk_drivers?.length > 0 && (
        <div style={detailStyles.driversSection}>
          <strong style={detailStyles.driverTitle}><Search size={14} style={{ marginRight: 4, verticalAlign: "text-bottom" }} /> Top Risk Drivers</strong>
          <div style={detailStyles.driverList}>
            {student.risk_drivers.slice(0, 3).map((d, i) => (
              <div key={d.feature} style={{
                ...detailStyles.driverChip,
                ...(i === 0 ? detailStyles.driverChipTop : {}),
              }}>
                <span style={detailStyles.driverName}>{d.feature.replace(/_/g, " ")}</span>
                <span style={{
                  ...detailStyles.driverImpact,
                  color: i === 0 ? "#dc2626" : "#1e3a5f",
                }}>{d.impact.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interventions */}
      {student.interventions?.length > 0 && (
        <div style={detailStyles.interventions}>
          <strong style={detailStyles.intTitle}><Lightbulb size={14} style={{ marginRight: 4, verticalAlign: "text-bottom" }} /> Recommended Interventions</strong>
          <ul style={detailStyles.intList}>
            {student.interventions.map((msg, i) => (
              <li key={i} style={detailStyles.intItem}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Add Academic Record ─────────────────────────────────────────── */}
      <div style={detailStyles.addSection}>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setAddMsg(""); }}
          style={detailStyles.addBtn}
        >
          {showAddForm ? <><X size={14} style={{ marginRight: 2 }} /> Cancel</> : <><PlusCircle size={14} style={{ marginRight: 4 }} /> Add Academic Record</>}
        </button>
        {addMsg && <span style={{ marginLeft: "0.75rem", fontSize: "0.85rem" }}>{addMsg}</span>}
      </div>

      {showAddForm && (
        <form onSubmit={handleAddRecord} style={detailStyles.addForm}>
          <div style={detailStyles.addGrid}>
            <div style={detailStyles.addField}>
              <label style={detailStyles.addLabel}>Term *</label>
              <input type="text" required placeholder='e.g. Sem1' value={addForm.term}
                onChange={(e) => setAddForm({ ...addForm, term: e.target.value })} style={detailStyles.addInput} />
            </div>
            <div style={detailStyles.addField}>
              <label style={detailStyles.addLabel}>Attendance</label>
              <input type="number" required min="0" max="100" step="0.1" placeholder="0-100" value={addForm.attendance}
                onChange={(e) => setAddForm({ ...addForm, attendance: e.target.value })} style={detailStyles.addInput} />
            </div>
            <div style={detailStyles.addField}>
              <label style={detailStyles.addLabel}>Internal Marks</label>
              <input type="number" required min="0" max="100" step="0.1" placeholder="0-100" value={addForm.internal_marks}
                onChange={(e) => setAddForm({ ...addForm, internal_marks: e.target.value })} style={detailStyles.addInput} />
            </div>
            <div style={detailStyles.addField}>
              <label style={detailStyles.addLabel}>Assignment Score</label>
              <input type="number" required min="0" max="100" step="0.1" placeholder="0-100" value={addForm.assignment_score}
                onChange={(e) => setAddForm({ ...addForm, assignment_score: e.target.value })} style={detailStyles.addInput} />
            </div>
            <div style={detailStyles.addField}>
              <label style={detailStyles.addLabel}>LMS Activity</label>
              <input type="number" required min="0" max="100" step="0.1" placeholder="0-100" value={addForm.lms_activity}
                onChange={(e) => setAddForm({ ...addForm, lms_activity: e.target.value })} style={detailStyles.addInput} />
            </div>
          </div>
          <button type="submit" disabled={adding} style={{ ...detailStyles.submitBtn, ...(adding ? { opacity: 0.6 } : {}) }}>
            {adding ? <><Loader2 size={14} style={{ marginRight: 4, animation: "spin 0.7s linear infinite" }} /> Saving...</> : <><Save size={14} style={{ marginRight: 4 }} /> Save Record</>}
          </button>
        </form>
      )}

      {/* Attendance Heatmap */}
      <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
        <AttendanceHeatmap history={attendanceHistory} days={90} />
      </div>

      {/* Academic History */}
      {history.length > 0 && (
        <div style={detailStyles.historySection}>
          <strong style={detailStyles.histTitle}><History size={14} style={{ marginRight: 4, verticalAlign: "text-bottom" }} /> Academic History ({history.length} records)</strong>
          <table style={detailStyles.histTable}>
            <thead>
              <tr>
                <th style={detailStyles.histTh}>Term</th>
                <th style={detailStyles.histTh}>Attend.</th>
                <th style={detailStyles.histTh}>Marks</th>
                <th style={detailStyles.histTh}>Assign.</th>
                <th style={detailStyles.histTh}>LMS</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id} style={detailStyles.histTr}>
                  <td style={detailStyles.histTd}>{r.term}</td>
                  <td style={detailStyles.histTd}>{r.attendance}</td>
                  <td style={detailStyles.histTd}>{r.internal_marks}</td>
                  <td style={detailStyles.histTd}>{r.assignment_score}</td>
                  <td style={detailStyles.histTd}>{r.lms_activity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Main Styles ──────────────────────────────────────────────────────────── */
const styles = {
  container: { maxWidth: 1080, margin: "2rem auto", padding: "0 1.5rem" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.25rem" },
  heading: { fontSize: "1.5rem", fontWeight: 800, margin: 0, color: "var(--gray-900)", letterSpacing: "-0.03em" },
  headerActions: { display: "flex", gap: "0.5rem" },
  seedBtn: { padding: "0.5rem 1.1rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--white)", background: "var(--gradient-accent)", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", boxShadow: "var(--shadow-sm)" },
  msg: { textAlign: "center", marginTop: "3rem", fontSize: "1.1rem", color: "var(--gray-500)" },
  empty: { textAlign: "center", color: "var(--gray-500)", marginTop: "2rem", fontSize: "0.95rem" },

  /* Summary Cards */
  cardRow: { display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" },
  card: { flex: "1 1 140px", padding: "1rem 1.25rem", background: "var(--white)", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", gap: "0.2rem", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", transition: "all var(--transition-fast)" },
  cardCount: { fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--gray-900)" },
  cardLabel: { fontSize: "0.82rem", color: "var(--gray-500)", fontWeight: 500 },

  /* Bar Chart */
  chartSection: { marginBottom: "1.25rem", padding: "1.25rem 1.5rem", background: "var(--white)", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" },
  chartTitle: { fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--gray-900)" },
  chartContainer: { display: "flex", justifyContent: "center", gap: "3rem", alignItems: "flex-end", height: 160 },
  barCol: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem", width: 52 },
  barPct: { fontSize: "0.78rem", fontWeight: 800, color: "var(--gray-700)" },
  barTrack: { width: 40, height: 120, background: "var(--gray-100)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "flex-end", overflow: "hidden" },
  barFill: { width: "100%", borderRadius: "var(--radius-sm)", transition: "height 0.6s cubic-bezier(0.4, 0, 0.2, 1)", minHeight: 4 },
  barLabel: { fontSize: "0.78rem", fontWeight: 700, color: "var(--gray-700)" },
  barCount: { fontSize: "0.72rem", color: "var(--gray-400)" },

  /* Table */
  tableWrapper: { overflowX: "auto", background: "var(--white)", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-md)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" },
  th: { textAlign: "left", padding: "0.7rem 0.85rem", borderBottom: "2px solid var(--primary-700)", background: "var(--gray-50)", whiteSpace: "nowrap", fontSize: "0.78rem", fontWeight: 700, color: "var(--gray-600)", textTransform: "uppercase", letterSpacing: "0.04em" },
  tr: { borderBottom: "1px solid var(--gray-100)", transition: "background var(--transition-fast)" },
  td: { padding: "0.6rem 0.85rem" },
  tdCenter: { padding: "0.6rem 0.85rem", textAlign: "center" },
  email: { fontSize: "0.75rem", color: "var(--gray-400)", marginTop: "0.1rem" },
  badge: { display: "inline-block", padding: "0.25rem 0.75rem", borderRadius: "var(--radius-full)", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.3px" },
  riskScore: { fontSize: "0.7rem", color: "var(--gray-400)", marginTop: "0.1rem" },
  deptChip: { fontSize: "0.8rem", color: "var(--primary-700)", fontWeight: 600, background: "var(--primary-50)", padding: "0.2rem 0.55rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--primary-100)" },
  viewBtn: { padding: "0.35rem 0.85rem", fontSize: "0.78rem", fontWeight: 600, color: "var(--primary-700)", background: "var(--primary-50)", border: "1px solid var(--primary-200)", borderRadius: "var(--radius-sm)", cursor: "pointer", whiteSpace: "nowrap", transition: "all var(--transition-fast)" },

  /* Loading / Error */
  loadingBox: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5rem 1rem", gap: "1rem" },
  spinner: { width: 40, height: 40, border: "3px solid var(--gray-200)", borderTop: "3px solid var(--primary-700)", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  errorBox: { display: "flex", flexDirection: "column", alignItems: "center", padding: "3rem 1rem", gap: "0.75rem" },
  retryBtn: { padding: "0.5rem 1.3rem", background: "var(--gradient-primary)", color: "var(--white)", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer", boxShadow: "var(--shadow-sm)" },
};

/* ── Detail Styles ─────────────────────────────────────────────────────────── */
const detailStyles = {
  box: { margin: "0.25rem 0.5rem 0.5rem", padding: "1.25rem 1.5rem", background: "var(--gray-50)", borderRadius: "var(--radius-md)", borderLeft: "4px solid var(--primary-700)", animation: "fadeInUp 0.3s ease-out" },
  metricsSection: { marginBottom: "1rem" },
  sectionTitle: { margin: "0 0 0.6rem", fontSize: "0.95rem", fontWeight: 700, color: "var(--primary-700)" },
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem" },
  metricCard: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", padding: "0.85rem 0.5rem", background: "var(--white)", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-sm)" },
  metricVal: { fontSize: "1.2rem", fontWeight: 800, color: "var(--primary-700)", letterSpacing: "-0.02em" },
  metricLabel: { fontSize: "0.7rem", color: "var(--gray-500)", textAlign: "center", fontWeight: 500 },
  noData: { color: "var(--gray-400)", fontStyle: "italic", fontSize: "0.9rem" },
  driversSection: { marginBottom: "0.75rem" },
  driverTitle: { fontSize: "0.88rem", fontWeight: 700, display: "block", marginBottom: "0.4rem", color: "var(--gray-900)" },
  driverList: { display: "flex", gap: "0.5rem", flexWrap: "wrap" },
  driverChip: { display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.85rem", background: "var(--gray-50)", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-full)" },
  driverChipTop: { background: "#fef2f2", border: "1px solid #fecaca" },
  driverName: { fontSize: "0.82rem", fontWeight: 600, textTransform: "capitalize" },
  driverImpact: { fontSize: "0.82rem", fontWeight: 800 },
  interventions: { padding: "0.85rem 1.1rem", background: "#fffbeb", borderRadius: "var(--radius-md)", border: "1px solid #fde68a", marginBottom: "0.75rem" },
  intTitle: { fontSize: "0.88rem", fontWeight: 700, display: "block", marginBottom: "0.4rem" },
  intList: { margin: 0, paddingLeft: "1.25rem" },
  intItem: { fontSize: "0.85rem", lineHeight: 1.6, color: "var(--gray-700)" },
  historySection: { marginTop: "0.75rem" },
  histTitle: { fontSize: "0.88rem", fontWeight: 700, display: "block", marginBottom: "0.4rem", color: "var(--gray-900)" },
  histTable: { width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" },
  histTh: { textAlign: "center", padding: "0.5rem 0.6rem", borderBottom: "1px solid var(--gray-300)", background: "var(--gray-50)", fontWeight: 700, fontSize: "0.75rem", color: "var(--gray-600)", textTransform: "uppercase", letterSpacing: "0.03em" },
  histTr: { borderBottom: "1px solid var(--gray-100)" },
  histTd: { textAlign: "center", padding: "0.4rem 0.5rem" },

  /* Add Record Form */
  addSection: { display: "flex", alignItems: "center", margin: "0.75rem 0 0.5rem" },
  addBtn: { padding: "0.4rem 0.95rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--primary-700)", background: "var(--primary-50)", border: "1px solid var(--primary-200)", borderRadius: "var(--radius-sm)", cursor: "pointer", transition: "all var(--transition-fast)" },
  addForm: { padding: "1rem 1.25rem", background: "var(--white)", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-md)", marginBottom: "0.75rem", boxShadow: "var(--shadow-sm)", animation: "slideDown 0.3s ease-out" },
  addGrid: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.6rem", marginBottom: "0.6rem" },
  addField: { display: "flex", flexDirection: "column", gap: "0.2rem" },
  addLabel: { fontSize: "0.72rem", fontWeight: 600, color: "var(--gray-600)" },
  addInput: { padding: "0.4rem 0.55rem", border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", background: "var(--gray-50)" },
  submitBtn: { padding: "0.45rem 1.3rem", background: "var(--gradient-primary)", color: "var(--white)", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", boxShadow: "var(--shadow-sm)" },
};

