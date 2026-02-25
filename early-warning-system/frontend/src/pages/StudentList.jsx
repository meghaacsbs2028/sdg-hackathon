import { useState, useEffect } from "react";

const badgeColors = {
  Green:  { background: "#16a34a", color: "#fff", fontWeight: 400 },
  Yellow: { background: "#eab308", color: "#000", fontWeight: 400 },
  Red:    { background: "#dc2626", color: "#fff", fontWeight: 700 },
};

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch("http://localhost:8000/students", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          window.location.href = "/login";
          throw new Error("Session expired");
        }
        if (!res.ok) throw new Error("Failed to fetch students");
        return res.json();
      })
      .then((data) => setStudents(data.students || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading) return <p style={styles.msg}>Loading students...</p>;
  if (error)   return <p style={{ ...styles.msg, color: "#dc2626" }}>❌ {error}</p>;

  // ── Risk Overview counts ───────────────────────────────────────────────────
  const total  = students.length;
  const green  = students.filter((s) => s.risk_level === "Green").length;
  const yellow = students.filter((s) => s.risk_level === "Yellow").length;
  const red    = students.filter((s) => s.risk_level === "Red").length;

  const cards = [
    { label: "Total Students", count: total,  border: "#1e3a5f" },
    { label: "Green (Safe)",   count: green,  border: "#16a34a" },
    { label: "Yellow (Watch)", count: yellow, border: "#eab308" },
    { label: "Red (At Risk)",  count: red,    border: "#dc2626" },
  ];

  const columns = [
    "Name", "Attendance", "Internal Marks", "Assignment Score",
    "LMS Activity", "Stress Score", "Risk Score", "Risk Level", "",
  ];

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>📋 Student Risk Overview</h2>

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
        const bars = [
          { label: "Green",  count: green,  color: "#16a34a" },
          { label: "Yellow", count: yellow, color: "#eab308" },
          { label: "Red",    count: red,    color: "#dc2626" },
        ];
        const maxCount = Math.max(green, yellow, red, 1);

        return (
          <div style={styles.chartSection}>
            <h3 style={styles.chartTitle}>📊 Risk Distribution</h3>
            <div style={styles.chartContainer}>
              {bars.map((b) => {
                const pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
                const heightPct = (b.count / maxCount) * 100;
                return (
                  <div key={b.label} style={styles.barCol}>
                    <span style={styles.barPct}>{pct}%</span>
                    <div style={styles.barTrack}>
                      <div style={{
                        ...styles.barFill,
                        height: `${heightPct}%`,
                        background: b.color,
                      }} />
                    </div>
                    <span style={styles.barLabel}>{b.label}</span>
                    <span style={styles.barCount}>{b.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Student Table ──────────────────────────────────────────────────── */}
      {total === 0 ? (
        <p style={styles.empty}>
          No students found. Add students to the database to see risk evaluations here.
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
                const hasInterventions = s.interventions && s.interventions.length > 0;
                const isExpanded = !!expanded[s.student_id];
                const isRed = s.risk_level === "Red";

                return (
                  <>
                    <tr key={s.student_id} style={styles.tr}>
                      <td style={styles.td}>{s.name}</td>
                      <td style={styles.tdNum}>{s.attendance}</td>
                      <td style={styles.tdNum}>{s.internal_marks}</td>
                      <td style={styles.tdNum}>{s.assignment_score}</td>
                      <td style={styles.tdNum}>{s.lms_activity}</td>
                      <td style={styles.tdNum}>{s.stress_score}</td>
                      <td style={styles.tdNum}>{s.risk_score.toFixed(2)}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          ...(badgeColors[s.risk_level] || {}),
                        }}>
                          {s.risk_level}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {hasInterventions && (
                          <button
                            onClick={() => toggle(s.student_id)}
                            style={styles.recBtn}
                          >
                            {isExpanded ? "Hide" : "View"} Recommendations
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* ── Expanded intervention row ──────────────────────── */}
                    {isExpanded && (
                      <tr key={`${s.student_id}-int`}>
                        <td colSpan={columns.length} style={{ padding: 0 }}>
                          <div style={{
                            ...styles.interventionBox,
                            borderLeft: isRed
                              ? "4px solid #dc2626"
                              : "4px solid #e5e7eb",
                          }}>
                            <strong style={styles.intTitle}>
                              💡 Recommended Interventions for {s.name}
                            </strong>
                            <ul style={styles.intList}>
                              {s.interventions.map((msg, i) => (
                                <li key={i} style={styles.intItem}>{msg}</li>
                              ))}
                            </ul>
                          </div>
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

/* ── Inline styles ─────────────────────────────────────────────────────────── */
const styles = {
  container: {
    maxWidth: 1020,
    margin: "2rem auto",
    padding: "0 1rem",
    fontFamily: "'Segoe UI', sans-serif",
  },
  heading: {
    fontSize: "1.5rem",
    marginBottom: "1rem",
  },
  msg: {
    textAlign: "center",
    marginTop: "3rem",
    fontSize: "1.1rem",
  },
  empty: {
    textAlign: "center",
    color: "#666",
    marginTop: "2rem",
    fontSize: "1rem",
  },

  /* ── Summary Cards ──────────────────────── */
  cardRow: {
    display: "flex",
    gap: "1rem",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
  },
  card: {
    flex: "1 1 140px",
    padding: "1rem 1.25rem",
    background: "#f9fafb",
    borderRadius: 8,
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  cardCount: {
    fontSize: "1.8rem",
    fontWeight: 700,
  },
  cardLabel: {
    fontSize: "0.85rem",
    color: "#555",
  },

  /* ── Bar Chart ──────────────────────────── */
  chartSection: {
    marginBottom: "1.5rem",
    padding: "1rem 1.5rem",
    background: "#f9fafb",
    borderRadius: 8,
  },
  chartTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    marginBottom: "0.75rem",
  },
  chartContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "3rem",
    alignItems: "flex-end",
    height: 160,
  },
  barCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.3rem",
    width: 52,
  },
  barPct: {
    fontSize: "0.8rem",
    fontWeight: 700,
  },
  barTrack: {
    width: 40,
    height: 120,
    background: "#e5e7eb",
    borderRadius: 4,
    display: "flex",
    alignItems: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 4,
    transition: "height 0.4s ease",
    minHeight: 4,
  },
  barLabel: {
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "#333",
  },
  barCount: {
    fontSize: "0.75rem",
    color: "#888",
  },

  /* ── Table ──────────────────────────────── */
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.9rem",
  },
  th: {
    textAlign: "left",
    padding: "0.6rem 0.75rem",
    borderBottom: "2px solid #1e3a5f",
    background: "#f1f5f9",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #e5e7eb",
  },
  td: {
    padding: "0.5rem 0.75rem",
  },
  tdNum: {
    padding: "0.5rem 0.75rem",
    textAlign: "center",
  },
  badge: {
    display: "inline-block",
    padding: "0.25rem 0.75rem",
    borderRadius: 12,
    fontSize: "0.8rem",
    letterSpacing: "0.3px",
  },

  /* ── Recommendations button ─────────────── */
  recBtn: {
    padding: "0.3rem 0.75rem",
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "#1e3a5f",
    background: "#e8f0fe",
    border: "1px solid #1e3a5f",
    borderRadius: 6,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  /* ── Intervention expanded row ─────────── */
  interventionBox: {
    margin: "0.25rem 0.75rem 0.75rem 0.75rem",
    padding: "0.75rem 1rem",
    background: "#fefce8",
    borderRadius: 6,
  },
  intTitle: {
    fontSize: "0.85rem",
    display: "block",
    marginBottom: "0.4rem",
  },
  intList: {
    margin: 0,
    paddingLeft: "1.25rem",
  },
  intItem: {
    fontSize: "0.85rem",
    lineHeight: 1.6,
    color: "#333",
  },
};
