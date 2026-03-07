import { useState, useEffect } from "react";
import { fetchMyAssignments, submitAssignment } from "../services/api";
import {
  ClipboardList, Upload, Loader2, CheckCircle, AlertTriangle,
  Calendar, Clock, FileText, Inbox, TrendingUp, X,
} from "lucide-react";

export default function StudentAssignments() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null); // assignment id
  const [msg, setMsg] = useState(null);

  const load = () => {
    setLoading(true);
    fetchMyAssignments()
      .then((d) => setData(d))
      .catch((e) => setMsg({ type: "error", text: e.message }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (assignmentId, file) => {
    if (!file) return;
    setUploading(assignmentId);
    setMsg(null);
    try {
      const result = await submitAssignment(assignmentId, file);
      setMsg({
        type: "success",
        text: `✅ Submitted! ${result.late ? "(Late submission)" : ""}`,
      });
      load();
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <div style={S.loadingBox}>
        <div style={S.spinner} /><p style={S.loadingText}>Loading assignments...</p>
      </div>
    );
  }

  const assignments = data?.assignments || [];
  const overallPct = data?.overall_assignment_pct || 0;

  return (
    <div style={S.container}>
      <div style={S.pageHeader}>
        <div style={S.headerIcon}><ClipboardList size={24} color="var(--primary-700)" /></div>
        <div>
          <h2 style={S.heading}>My Assignments</h2>
          <p style={S.subtext}>View assignments, upload your work, track grades</p>
        </div>
      </div>

      {/* ── Overall Score Card ──────────────────────────────────────────────── */}
      {assignments.length > 0 && (
        <div style={S.overallCard}>
          <div style={S.overallLeft}>
            <TrendingUp size={20} color="var(--primary-700)" />
            <div>
              <span style={S.overallLabel}>Overall Assignment Score</span>
              <div style={S.overallRow}>
                <span style={{
                  ...S.overallValue,
                  color: overallPct >= 60 ? "#16a34a" : overallPct >= 40 ? "#d97706" : "#dc2626",
                }}>{overallPct}%</span>
                <div style={S.barTrack}>
                  <div style={{
                    ...S.barFill, width: `${Math.min(100, overallPct)}%`,
                    background: overallPct >= 60 ? "#16a34a" : overallPct >= 40 ? "#eab308" : "#dc2626",
                  }} />
                </div>
              </div>
            </div>
          </div>
          <span style={S.assignCount}>{assignments.length} assignment{assignments.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {msg && (
        <div style={{ ...S.msgBox, ...(msg.type === "error" ? S.msgError : S.msgSuccess) }}>
          {msg.type === "error" ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          <span>{msg.text}</span>
          <button style={S.msgClose} onClick={() => setMsg(null)}><X size={14} /></button>
        </div>
      )}

      {/* ── Assignment Cards ───────────────────────────────────────────────── */}
      {assignments.length === 0 ? (
        <div style={S.emptyState}>
          <Inbox size={48} color="var(--gray-300)" />
          <p style={S.emptyText}>No assignments for your class yet.</p>
        </div>
      ) : (
        <div style={S.cardList}>
          {assignments.map((a) => {
            const sub = a.my_submission;
            const due = new Date(a.due_date);
            const overdue = a.is_overdue && !sub;
            const isGraded = sub?.status === "graded";
            const isSubmitted = !!sub;

            let statusColor = "var(--gray-500)";
            let statusText = "Pending";
            let statusBg = "var(--gray-50)";
            let statusBorder = "var(--gray-200)";

            if (isGraded) {
              statusColor = "#059669"; statusText = "Graded"; statusBg = "#ecfdf5"; statusBorder = "#a7f3d0";
            } else if (isSubmitted) {
              statusColor = "#2563eb"; statusText = sub.status === "late" ? "Late" : "Submitted";
              statusBg = sub.status === "late" ? "#fef2f2" : "#eff6ff";
              statusBorder = sub.status === "late" ? "#fecaca" : "#bfdbfe";
              if (sub.status === "late") statusColor = "#dc2626";
            } else if (overdue) {
              statusColor = "#dc2626"; statusText = "Overdue"; statusBg = "#fef2f2"; statusBorder = "#fecaca";
            }

            return (
              <div key={a.id} style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardLeft}>
                    <span style={S.subjectTag}>{a.subject_name}</span>
                    <h4 style={S.cardTitle}>{a.title}</h4>
                    <div style={S.cardMeta}>
                      <span style={S.metaItem}><Calendar size={12} /> Due: {due.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span style={S.metaItem}><Clock size={12} /> {due.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span style={S.metaItem}>Max: {a.max_score}</span>
                    </div>
                    {a.description && <p style={S.descText}>{a.description}</p>}
                  </div>
                  <div style={S.cardRight}>
                    <span style={{ ...S.statusBadge, color: statusColor, background: statusBg, borderColor: statusBorder }}>{statusText}</span>
                  </div>
                </div>

                {/* Submission section */}
                <div style={S.cardBody}>
                  {isGraded && (
                    <div style={S.gradeDisplay}>
                      <div style={S.gradeScore}>
                        <span style={S.gradeLabel}>Your Score</span>
                        <span style={{
                          ...S.gradeValue,
                          color: sub.percentage >= 60 ? "#059669" : sub.percentage >= 40 ? "#d97706" : "#dc2626",
                        }}>{sub.score}/{sub.max_score} ({sub.percentage}%)</span>
                      </div>
                      {sub.feedback && (
                        <div style={S.feedback}>
                          <strong>Feedback:</strong> {sub.feedback}
                        </div>
                      )}
                    </div>
                  )}

                  {isSubmitted && !isGraded && (
                    <div style={S.submittedInfo}>
                      <FileText size={14} /> <strong>{sub.file_name}</strong>
                      <span style={S.submitTime}> — Submitted {new Date(sub.submitted_at).toLocaleDateString("en-IN")}</span>
                    </div>
                  )}

                  {/* Upload area */}
                  <div style={S.uploadRow}>
                    {isSubmitted && !isGraded && (
                      <span style={S.resubmitText}>Re-upload to replace:</span>
                    )}
                    <label style={{
                      ...S.uploadBtn,
                      ...(uploading === a.id ? { opacity: 0.6, cursor: "not-allowed" } : {}),
                    }}>
                      {uploading === a.id ? (
                        <><Loader2 size={14} style={{ animation: "spin 0.7s linear infinite" }} /> Uploading...</>
                      ) : (
                        <><Upload size={14} /> {isSubmitted ? "Re-upload" : "Upload Submission"}</>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc,.pptx,.txt,.zip"
                        style={{ display: "none" }}
                        onChange={(e) => handleUpload(a.id, e.target.files?.[0])}
                        disabled={uploading === a.id}
                      />
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const S = {
  container: { maxWidth: 780, margin: "2rem auto", padding: "0 1.5rem" },
  loadingBox: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5rem 1rem", gap: "1rem" },
  spinner: { width: 40, height: 40, border: "3px solid var(--gray-200)", borderTop: "3px solid var(--primary-700)", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  loadingText: { color: "var(--gray-500)", fontSize: "0.9rem" },

  pageHeader: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" },
  headerIcon: { width: 52, height: 52, borderRadius: "var(--radius-lg)", background: "var(--primary-100)", display: "flex", alignItems: "center", justifyContent: "center" },
  heading: { fontSize: "1.5rem", fontWeight: 800, color: "var(--gray-900)", letterSpacing: "-0.03em", margin: 0 },
  subtext: { fontSize: "0.9rem", color: "var(--gray-500)", margin: "0.15rem 0 0" },

  overallCard: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem", background: "var(--white)", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-md)", marginBottom: "1rem", animation: "fadeInUp 0.3s ease-out" },
  overallLeft: { display: "flex", alignItems: "center", gap: "0.85rem" },
  overallLabel: { fontSize: "0.78rem", color: "var(--gray-500)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em", display: "block" },
  overallRow: { display: "flex", alignItems: "center", gap: "0.85rem", marginTop: "0.25rem" },
  overallValue: { fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em" },
  barTrack: { width: 120, height: 8, background: "var(--gray-100)", borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4, transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)" },
  assignCount: { fontSize: "0.82rem", color: "var(--gray-500)", fontWeight: 600, background: "var(--gray-50)", padding: "0.3rem 0.75rem", borderRadius: "var(--radius-full)", border: "1px solid var(--gray-200)" },

  msgBox: { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", fontSize: "0.88rem", fontWeight: 600, marginBottom: "1rem" },
  msgSuccess: { background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" },
  msgError: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
  msgClose: { marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 2 },

  cardList: { display: "flex", flexDirection: "column", gap: "1rem" },
  card: { background: "var(--white)", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", overflow: "hidden", animation: "fadeInUp 0.3s ease-out" },
  cardHeader: { display: "flex", justifyContent: "space-between", padding: "1.25rem 1.5rem", gap: "1rem" },
  cardLeft: { flex: 1 },
  cardRight: { display: "flex", alignItems: "flex-start" },
  subjectTag: { fontSize: "0.72rem", fontWeight: 700, color: "var(--primary-700)", background: "var(--primary-50)", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-full)", border: "1px solid var(--primary-100)", marginBottom: "0.3rem", display: "inline-block" },
  cardTitle: { fontSize: "1.05rem", fontWeight: 700, color: "var(--gray-900)", margin: "0.25rem 0 0.4rem" },
  cardMeta: { display: "flex", gap: "0.75rem", flexWrap: "wrap" },
  metaItem: { fontSize: "0.78rem", color: "var(--gray-500)", display: "flex", alignItems: "center", gap: "0.2rem", fontWeight: 600 },
  descText: { fontSize: "0.85rem", color: "var(--gray-600)", margin: "0.5rem 0 0", lineHeight: 1.5 },
  statusBadge: { fontSize: "0.75rem", fontWeight: 800, padding: "0.3rem 0.75rem", borderRadius: "var(--radius-full)", border: "1.5px solid", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" },

  cardBody: { padding: "0 1.5rem 1.25rem", borderTop: "1px solid var(--gray-100)" },

  gradeDisplay: { padding: "0.85rem 0", display: "flex", flexDirection: "column", gap: "0.4rem" },
  gradeScore: { display: "flex", alignItems: "center", gap: "0.5rem" },
  gradeLabel: { fontSize: "0.78rem", fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase" },
  gradeValue: { fontSize: "1.1rem", fontWeight: 800 },
  feedback: { fontSize: "0.85rem", color: "var(--gray-600)", background: "var(--gray-50)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-md)", lineHeight: 1.5 },

  submittedInfo: { display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem", color: "var(--gray-600)", padding: "0.75rem 0 0.25rem" },
  submitTime: { fontWeight: 400, color: "var(--gray-400)" },

  uploadRow: { display: "flex", alignItems: "center", gap: "0.5rem", paddingTop: "0.5rem" },
  resubmitText: { fontSize: "0.78rem", color: "var(--gray-400)" },
  uploadBtn: {
    padding: "0.45rem 1rem", fontSize: "0.82rem", fontWeight: 700,
    color: "var(--primary-700)", background: "var(--primary-50)",
    border: "1.5px solid var(--primary-200)", borderRadius: "var(--radius-md)",
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem",
  },

  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", padding: "3rem", background: "var(--white)", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", textAlign: "center" },
  emptyText: { color: "var(--gray-500)", fontSize: "0.95rem" },
};
