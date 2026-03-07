import { useState, useEffect } from "react";
import { fetchMyIAMarks } from "../services/api";
import {
  BookOpen, Loader2, Inbox, TrendingUp,
} from "lucide-react";

export default function MyMarks() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyIAMarks()
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={S.loadingBox}>
        <div style={S.spinner} />
        <p style={S.loadingText}>Loading your marks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={S.container}>
        <div style={S.pageHeader}>
          <h2 style={S.heading}>📝 My Marks</h2>
        </div>
        <div style={S.emptyCard}>
          <p style={S.emptyText}>{error}</p>
        </div>
      </div>
    );
  }

  const subjects = data?.subjects || [];
  const overall = data?.overall_percentage || 0;

  return (
    <div style={S.container}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={S.pageHeader}>
        <div style={S.headerIcon}>
          <BookOpen size={24} color="var(--primary-700)" />
        </div>
        <div>
          <h2 style={S.heading}>My Internal Assessment Marks</h2>
          <p style={S.subtext}>
            Subject-wise IA1, IA2, IA3 breakdown
          </p>
        </div>
      </div>

      {/* ── Overall Score Card ──────────────────────────────────────────────── */}
      {subjects.length > 0 && (
        <div style={S.overallCard}>
          <div style={S.overallLeft}>
            <TrendingUp size={20} color="var(--primary-700)" />
            <div>
              <span style={S.overallLabel}>Overall Internal Marks</span>
              <div style={S.overallRow}>
                <span style={{
                  ...S.overallValue,
                  color: overall >= 60 ? "#16a34a" : overall >= 40 ? "#d97706" : "#dc2626",
                }}>
                  {overall}%
                </span>
                <div style={S.overallBarTrack}>
                  <div
                    style={{
                      ...S.overallBarFill,
                      width: `${Math.min(100, overall)}%`,
                      background: overall >= 60 ? "#16a34a" : overall >= 40 ? "#eab308" : "#dc2626",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <span style={S.overallSubjects}>
            {subjects.length} subject{subjects.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* ── Marks Table ────────────────────────────────────────────────────── */}
      {subjects.length === 0 ? (
        <div style={S.emptyCard}>
          <Inbox size={48} color="var(--gray-300)" />
          <p style={S.emptyText}>
            No marks have been entered yet. Your faculty will upload your IA marks soon.
          </p>
        </div>
      ) : (
        <div style={S.tableCard}>
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, textAlign: "left" }}>Subject</th>
                  <th style={S.th}>IA1</th>
                  <th style={S.th}>IA2</th>
                  <th style={S.th}>IA3</th>
                  <th style={S.th}>Average</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subj) => (
                  <tr key={subj.subject} style={S.tr}>
                    <td style={S.tdSubject}>
                      <BookOpen size={14} style={{ marginRight: 6, color: "var(--primary-500)", flexShrink: 0 }} />
                      {subj.subject}
                    </td>
                    {["IA1", "IA2", "IA3"].map((ia) => {
                      const m = subj.marks[ia];
                      if (!m) return <td key={ia} style={S.tdCenter}><span style={S.notEntered}>—</span></td>;
                      const color = m.percentage >= 60 ? "#16a34a" : m.percentage >= 40 ? "#d97706" : "#dc2626";
                      return (
                        <td key={ia} style={S.tdCenter}>
                          <div style={S.markCell}>
                            <span style={S.markScore}>{m.obtained}/{m.max}</span>
                            <span style={{ ...S.markPct, color }}>{m.percentage}%</span>
                          </div>
                        </td>
                      );
                    })}
                    <td style={S.tdCenter}>
                      <span style={{
                        ...S.avgBadge,
                        background: subj.average_pct >= 60 ? "#ecfdf5" :
                          subj.average_pct >= 40 ? "#fffbeb" : "#fef2f2",
                        color: subj.average_pct >= 60 ? "#059669" :
                          subj.average_pct >= 40 ? "#d97706" : "#dc2626",
                        borderColor: subj.average_pct >= 60 ? "#a7f3d0" :
                          subj.average_pct >= 40 ? "#fde68a" : "#fecaca",
                      }}>
                        {subj.average_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      {subjects.length > 0 && (
        <div style={S.legendRow}>
          <span style={S.legendItem}><span style={{ ...S.legendDot, background: "#16a34a" }} /> ≥60% Good</span>
          <span style={S.legendItem}><span style={{ ...S.legendDot, background: "#eab308" }} /> 40-59% Average</span>
          <span style={S.legendItem}><span style={{ ...S.legendDot, background: "#dc2626" }} /> &lt;40% Needs Improvement</span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ Styles ═══════════════════════════════════════════════ */
const S = {
  container: { maxWidth: 780, margin: "2rem auto", padding: "0 1.5rem" },
  pageHeader: {
    display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem",
  },
  headerIcon: {
    width: 52, height: 52, borderRadius: "var(--radius-lg)",
    background: "var(--primary-100)", display: "flex", alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    fontSize: "1.5rem", fontWeight: 800, color: "var(--gray-900)",
    letterSpacing: "-0.03em", margin: 0,
  },
  subtext: { fontSize: "0.9rem", color: "var(--gray-500)", margin: "0.15rem 0 0" },

  /* Loading */
  loadingBox: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "5rem 1rem", gap: "1rem",
  },
  spinner: {
    width: 40, height: 40, border: "3px solid var(--gray-200)",
    borderTop: "3px solid var(--primary-700)", borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: { color: "var(--gray-500)", fontSize: "0.9rem" },

  /* Overall Card */
  overallCard: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "1.25rem 1.5rem", background: "var(--white)",
    borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)",
    boxShadow: "var(--shadow-md)", marginBottom: "1rem",
    animation: "fadeInUp 0.3s ease-out",
  },
  overallLeft: { display: "flex", alignItems: "center", gap: "0.85rem" },
  overallLabel: {
    fontSize: "0.78rem", color: "var(--gray-500)", textTransform: "uppercase",
    fontWeight: 600, letterSpacing: "0.04em", display: "block",
  },
  overallRow: { display: "flex", alignItems: "center", gap: "0.85rem", marginTop: "0.25rem" },
  overallValue: { fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em" },
  overallBarTrack: {
    width: 120, height: 8, background: "var(--gray-100)",
    borderRadius: 4, overflow: "hidden",
  },
  overallBarFill: {
    height: "100%", borderRadius: 4,
    transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  overallSubjects: {
    fontSize: "0.82rem", color: "var(--gray-500)", fontWeight: 600,
    background: "var(--gray-50)", padding: "0.3rem 0.75rem",
    borderRadius: "var(--radius-full)", border: "1px solid var(--gray-200)",
  },

  /* Empty */
  emptyCard: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem",
    padding: "3rem", background: "var(--white)", borderRadius: "var(--radius-lg)",
    border: "1px solid var(--gray-200)", textAlign: "center",
  },
  emptyText: { color: "var(--gray-500)", fontSize: "0.9rem", maxWidth: 360 },

  /* Table */
  tableCard: {
    background: "var(--white)", borderRadius: "var(--radius-lg)",
    border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-md)",
    overflow: "hidden", animation: "fadeInUp 0.3s ease-out",
  },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" },
  th: {
    textAlign: "center", padding: "0.7rem 1rem",
    borderBottom: "2px solid var(--primary-700)", background: "var(--gray-50)",
    fontSize: "0.78rem", fontWeight: 700, color: "var(--gray-600)",
    textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap",
  },
  tr: { borderBottom: "1px solid var(--gray-100)" },
  tdSubject: {
    padding: "0.75rem 1rem", fontWeight: 700, color: "var(--gray-800)",
    display: "flex", alignItems: "center", whiteSpace: "nowrap",
  },
  tdCenter: { padding: "0.75rem 1rem", textAlign: "center" },
  notEntered: { color: "var(--gray-300)", fontSize: "0.88rem" },

  /* Mark Cell */
  markCell: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  markScore: { fontSize: "0.85rem", fontWeight: 700, color: "var(--gray-700)" },
  markPct: { fontSize: "0.72rem", fontWeight: 800 },

  /* Average Badge */
  avgBadge: {
    display: "inline-block", padding: "0.3rem 0.85rem",
    borderRadius: "var(--radius-full)", fontSize: "0.85rem", fontWeight: 800,
    border: "1.5px solid",
  },

  /* Legend */
  legendRow: {
    display: "flex", gap: "1.25rem", justifyContent: "center",
    marginTop: "1rem", flexWrap: "wrap",
  },
  legendItem: {
    display: "flex", alignItems: "center", gap: "0.3rem",
    fontSize: "0.78rem", color: "var(--gray-500)", fontWeight: 600,
  },
  legendDot: { width: 10, height: 10, borderRadius: 3, display: "inline-block" },
};
