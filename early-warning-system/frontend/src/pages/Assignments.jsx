import { useState, useEffect } from "react";
import {
  fetchAssignments, createAssignment, fetchAssignmentDetail,
  deleteAssignment, gradeSubmission,
} from "../services/api";
import {
  ClipboardList, Plus, Trash2, Eye, CheckCircle, Loader2,
  AlertTriangle, Calendar, X, FileText, Award, Users, Search,
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState(null);
  const [saving, setSaving] = useState(false);

  // Create form
  const [form, setForm] = useState({
    title: "", description: "", subject_name: "",
    year: 1, section: "A", due_date: "", max_score: 100,
  });

  // Grading
  const [grading, setGrading] = useState(null); // { studentId, score, feedback }

  const load = () => {
    setLoading(true);
    fetchAssignments()
      .then((d) => setAssignments(d.assignments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.subject_name || !form.due_date) {
      setMsg({ type: "error", text: "Title, subject, and due date are required" }); return;
    }
    setSaving(true);
    try {
      await createAssignment(form);
      setMsg({ type: "success", text: "✅ Assignment created!" });
      setShowCreate(false);
      setForm({ title: "", description: "", subject_name: "", year: 1, section: "A", due_date: "", max_score: 100 });
      load();
    } catch (e) { setMsg({ type: "error", text: e.message }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this assignment and all submissions?")) return;
    try {
      await deleteAssignment(id);
      setMsg({ type: "success", text: "Deleted" });
      setDetail(null);
      load();
    } catch (e) { setMsg({ type: "error", text: e.message }); }
  };

  const openDetail = async (id) => {
    try {
      const d = await fetchAssignmentDetail(id);
      setDetail(d.assignment);
    } catch (e) { setMsg({ type: "error", text: e.message }); }
  };

  const handleGrade = async () => {
    if (!grading || !detail) return;
    setSaving(true);
    try {
      await gradeSubmission(detail.id, grading.studentId, grading.score, grading.feedback);
      setMsg({ type: "success", text: "✅ Graded! Risk prediction updated." });
      setGrading(null);
      openDetail(detail.id);
    } catch (e) { setMsg({ type: "error", text: e.message }); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div style={S.loadingBox}>
        <div style={S.spinner} /><p style={S.loadingText}>Loading assignments...</p>
      </div>
    );
  }

  return (
    <div style={S.container}>
      <div style={S.pageHeader}>
        <div style={S.headerIcon}><ClipboardList size={24} color="var(--primary-700)" /></div>
        <div>
          <h2 style={S.heading}>Assignments</h2>
          <p style={S.subtext}>Create assignments, review submissions, grade students</p>
        </div>
        <button style={S.createBtn} onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Assignment
        </button>
      </div>

      {msg && (
        <div style={{ ...S.msgBox, ...(msg.type === "error" ? S.msgError : S.msgSuccess) }}>
          {msg.type === "error" ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          <span>{msg.text}</span>
          <button style={S.msgClose} onClick={() => setMsg(null)}><X size={14} /></button>
        </div>
      )}

      {/* ── Create Modal ───────────────────────────────────────────────────── */}
      {showCreate && (
        <div style={S.modalOverlay} onClick={() => setShowCreate(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={S.modalTitle}>📝 New Assignment</h3>
            <div style={S.formGrid}>
              <div style={S.field}>
                <label style={S.label}>Title *</label>
                <input style={S.input} value={form.title}
                  onChange={(e) => setForm({...form, title: e.target.value})}
                  placeholder="e.g. DBMS ER Diagram" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Subject *</label>
                <input style={S.input} value={form.subject_name}
                  onChange={(e) => setForm({...form, subject_name: e.target.value})}
                  placeholder="e.g. DBMS" />
              </div>
              <div style={S.fieldRow}>
                <div style={{...S.field, flex: 1}}>
                  <label style={S.label}>Year</label>
                  <select style={S.input} value={form.year}
                    onChange={(e) => setForm({...form, year: parseInt(e.target.value)})}>
                    {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div style={{...S.field, flex: 1}}>
                  <label style={S.label}>Section</label>
                  <select style={S.input} value={form.section}
                    onChange={(e) => setForm({...form, section: e.target.value})}>
                    {["A","B","C","D"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={S.fieldRow}>
                <div style={{...S.field, flex: 1}}>
                  <label style={S.label}>Due Date *</label>
                  <input type="datetime-local" style={S.input} value={form.due_date}
                    onChange={(e) => setForm({...form, due_date: e.target.value})} />
                </div>
                <div style={{...S.field, flex: 1}}>
                  <label style={S.label}>Max Score</label>
                  <input type="number" style={S.input} value={form.max_score}
                    onChange={(e) => setForm({...form, max_score: parseInt(e.target.value)||100})} />
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Description</label>
                <textarea style={{...S.input, minHeight: 80, resize: "vertical"}}
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  placeholder="Assignment instructions..." />
              </div>
            </div>
            <div style={S.modalActions}>
              <button style={S.cancelBtn} onClick={() => setShowCreate(false)}>Cancel</button>
              <button style={S.submitBtn} onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 size={14} style={{animation: "spin 0.7s linear infinite"}} /> : <Plus size={14} />}
                {saving ? " Creating..." : " Create Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ───────────────────────────────────────────────────── */}
      {detail && (
        <div style={S.modalOverlay} onClick={() => { setDetail(null); setGrading(null); }}>
          <div style={{...S.modal, maxWidth: 720}} onClick={(e) => e.stopPropagation()}>
            <div style={S.detailHeader}>
              <div>
                <h3 style={S.modalTitle}>{detail.title}</h3>
                <div style={S.detailMeta}>
                  <span style={S.metaChip}>{detail.subject_name}</span>
                  <span style={S.metaChip}>Year {detail.year} · Sec {detail.section}</span>
                  <span style={S.metaChip}><Calendar size={12} /> Due: {new Date(detail.due_date).toLocaleDateString()}</span>
                </div>
              </div>
              <button style={S.deleteBtn} onClick={() => handleDelete(detail.id)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
            {detail.description && <p style={S.detailDesc}>{detail.description}</p>}

            <h4 style={S.subHeading}>
              <Users size={16} /> Submissions ({detail.submissions?.length || 0})
              <span style={S.gradedCount}>
                {detail.graded_count} graded
              </span>
            </h4>

            {(!detail.submissions || detail.submissions.length === 0) ? (
              <p style={S.noSubs}>No submissions yet</p>
            ) : (
              <div style={S.tableWrap}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={{...S.th, textAlign: "left"}}>Student</th>
                      <th style={S.th}>File</th>
                      <th style={S.th}>Status</th>
                      <th style={S.th}>Score</th>
                      <th style={S.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.submissions.map((sub) => (
                      <tr key={sub.id} style={S.tr}>
                        <td style={S.td}>
                          <strong>{sub.student_name}</strong>
                          <div style={S.rollSmall}>{sub.roll_number}</div>
                        </td>
                        <td style={S.tdCenter}>
                          <a href={`${BASE_URL}${sub.file_url}`} target="_blank" rel="noreferrer" style={S.fileLink}>
                            <FileText size={14} /> {sub.file_name}
                          </a>
                        </td>
                        <td style={S.tdCenter}>
                          <span style={{...S.statusBadge,
                            ...(sub.status === "graded" ? S.statusGraded :
                                sub.status === "late" ? S.statusLate : S.statusSubmitted),
                          }}>{sub.status}</span>
                        </td>
                        <td style={S.tdCenter}>
                          {sub.score !== null ? (
                            <span style={S.scoreBadge}>{sub.score}/{sub.max_score}</span>
                          ) : "—"}
                        </td>
                        <td style={S.tdCenter}>
                          {grading?.studentId === sub.student_id ? (
                            <div style={S.gradeForm}>
                              <input type="number" style={S.gradeInput} placeholder="Score"
                                min={0} max={detail.max_score}
                                value={grading.score} onChange={(e) => setGrading({...grading, score: parseFloat(e.target.value)||0})} />
                              <input type="text" style={S.gradeInput} placeholder="Feedback"
                                value={grading.feedback} onChange={(e) => setGrading({...grading, feedback: e.target.value})} />
                              <button style={S.gradeBtn} onClick={handleGrade} disabled={saving}>
                                <CheckCircle size={14} />
                              </button>
                              <button style={S.gradeCancelBtn} onClick={() => setGrading(null)}>
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button style={S.inlineBtn}
                              onClick={() => setGrading({studentId: sub.student_id, score: sub.score||0, feedback: sub.feedback||""})}>
                              <Award size={14} /> Grade
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={S.modalActions}>
              <button style={S.cancelBtn} onClick={() => { setDetail(null); setGrading(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assignment Cards ───────────────────────────────────────────────── */}
      {assignments.length === 0 ? (
        <div style={S.emptyState}>
          <ClipboardList size={48} color="var(--gray-300)" />
          <p style={S.emptyText}>No assignments yet. Create your first assignment!</p>
        </div>
      ) : (
        <div style={S.cardGrid}>
          {assignments.map((a) => {
            const due = new Date(a.due_date);
            const overdue = due < new Date();
            return (
              <div key={a.id} style={S.card} onClick={() => openDetail(a.id)}>
                <div style={S.cardTop}>
                  <span style={S.subjectTag}>{a.subject_name}</span>
                  <span style={S.classTag}>Y{a.year} · {a.section}</span>
                </div>
                <h4 style={S.cardTitle}>{a.title}</h4>
                <div style={S.cardMeta}>
                  <span style={{...S.dueTag, color: overdue ? "#dc2626" : "var(--gray-500)"}}>
                    <Calendar size={12} /> {due.toLocaleDateString()} {overdue ? "(Overdue)" : ""}
                  </span>
                </div>
                <div style={S.cardFooter}>
                  <span style={S.subCount}>
                    <FileText size={13} /> {a.total_submissions} submissions
                  </span>
                  <span style={S.gradedTag}>
                    <CheckCircle size={13} /> {a.graded_count} graded
                  </span>
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
  container: { maxWidth: 960, margin: "2rem auto", padding: "0 1.5rem" },
  loadingBox: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5rem 1rem", gap: "1rem" },
  spinner: { width: 40, height: 40, border: "3px solid var(--gray-200)", borderTop: "3px solid var(--primary-700)", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  loadingText: { color: "var(--gray-500)", fontSize: "0.9rem" },

  pageHeader: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" },
  headerIcon: { width: 52, height: 52, borderRadius: "var(--radius-lg)", background: "var(--primary-100)", display: "flex", alignItems: "center", justifyContent: "center" },
  heading: { fontSize: "1.5rem", fontWeight: 800, color: "var(--gray-900)", letterSpacing: "-0.03em", margin: 0 },
  subtext: { fontSize: "0.9rem", color: "var(--gray-500)", margin: "0.15rem 0 0" },
  createBtn: {
    marginLeft: "auto", padding: "0.6rem 1.2rem", fontSize: "0.88rem", fontWeight: 700,
    color: "var(--white)", background: "var(--gradient-primary)", border: "none",
    borderRadius: "var(--radius-md)", cursor: "pointer", display: "flex", alignItems: "center",
    gap: "0.3rem", boxShadow: "var(--shadow-md)",
  },

  msgBox: { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", fontSize: "0.88rem", fontWeight: 600, marginBottom: "1rem" },
  msgSuccess: { background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" },
  msgError: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
  msgClose: { marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 2 },

  /* Cards */
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" },
  card: {
    background: "var(--white)", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)",
    padding: "1.25rem", cursor: "pointer", transition: "all var(--transition-fast)",
    boxShadow: "var(--shadow-sm)",
  },
  cardTop: { display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" },
  subjectTag: { fontSize: "0.75rem", fontWeight: 700, color: "var(--primary-700)", background: "var(--primary-50)", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-full)", border: "1px solid var(--primary-100)" },
  classTag: { fontSize: "0.75rem", fontWeight: 600, color: "var(--gray-500)", background: "var(--gray-50)", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-full)" },
  cardTitle: { fontSize: "1rem", fontWeight: 700, color: "var(--gray-900)", margin: "0.25rem 0 0.5rem" },
  cardMeta: { display: "flex", gap: "0.5rem", marginBottom: "0.75rem" },
  dueTag: { fontSize: "0.78rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" },
  cardFooter: { display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--gray-100)", paddingTop: "0.6rem" },
  subCount: { fontSize: "0.78rem", color: "var(--gray-500)", display: "flex", alignItems: "center", gap: "0.25rem" },
  gradedTag: { fontSize: "0.78rem", color: "#059669", display: "flex", alignItems: "center", gap: "0.25rem", fontWeight: 600 },

  /* Modal */
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" },
  modal: { background: "var(--white)", borderRadius: "var(--radius-lg)", padding: "1.75rem", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--shadow-xl)", animation: "fadeInUp 0.3s ease-out" },
  modalTitle: { fontSize: "1.15rem", fontWeight: 800, color: "var(--gray-900)", margin: "0 0 1rem" },
  modalActions: { display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1.25rem" },
  cancelBtn: { padding: "0.5rem 1rem", fontSize: "0.85rem", fontWeight: 600, background: "var(--gray-100)", color: "var(--gray-600)", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer" },
  submitBtn: { padding: "0.5rem 1.2rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--white)", background: "var(--gradient-primary)", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", display: "flex", alignItems: "center" },

  /* Form */
  formGrid: { display: "flex", flexDirection: "column", gap: "0.85rem" },
  field: { display: "flex", flexDirection: "column", gap: "0.25rem" },
  fieldRow: { display: "flex", gap: "0.75rem" },
  label: { fontSize: "0.82rem", fontWeight: 600, color: "var(--gray-700)" },
  input: { padding: "0.5rem 0.75rem", fontSize: "0.9rem", border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius-md)", background: "var(--gray-50)" },

  /* Detail */
  detailHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "0.75rem" },
  detailMeta: { display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.4rem" },
  metaChip: { fontSize: "0.75rem", fontWeight: 600, color: "var(--gray-600)", background: "var(--gray-50)", padding: "0.2rem 0.5rem", borderRadius: "var(--radius-full)", display: "flex", alignItems: "center", gap: "0.2rem" },
  detailDesc: { fontSize: "0.9rem", color: "var(--gray-600)", lineHeight: 1.6, margin: "0 0 1rem", padding: "0.75rem", background: "var(--gray-50)", borderRadius: "var(--radius-md)" },
  deleteBtn: { padding: "0.4rem 0.75rem", fontSize: "0.78rem", fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--radius-md)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem", whiteSpace: "nowrap" },
  subHeading: { fontSize: "0.95rem", fontWeight: 700, color: "var(--gray-800)", margin: "0 0 0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" },
  gradedCount: { fontSize: "0.75rem", fontWeight: 600, color: "#059669", background: "#ecfdf5", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-full)", marginLeft: "auto" },
  noSubs: { color: "var(--gray-400)", fontSize: "0.88rem", textAlign: "center", padding: "1.5rem" },

  /* Table */
  tableWrap: { overflowX: "auto", borderRadius: "var(--radius-md)", border: "1px solid var(--gray-200)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" },
  th: { textAlign: "center", padding: "0.6rem 0.75rem", background: "var(--gray-50)", fontSize: "0.72rem", fontWeight: 700, color: "var(--gray-600)", textTransform: "uppercase", borderBottom: "1px solid var(--gray-200)" },
  tr: { borderBottom: "1px solid var(--gray-100)" },
  td: { padding: "0.55rem 0.75rem" },
  tdCenter: { padding: "0.55rem 0.75rem", textAlign: "center" },
  rollSmall: { fontSize: "0.72rem", color: "var(--gray-400)" },
  fileLink: { color: "var(--primary-700)", fontWeight: 600, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.25rem", textDecoration: "none" },
  statusBadge: { fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "var(--radius-full)", textTransform: "uppercase" },
  statusSubmitted: { color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe" },
  statusGraded: { color: "#059669", background: "#ecfdf5", border: "1px solid #a7f3d0" },
  statusLate: { color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca" },
  scoreBadge: { fontWeight: 700, color: "var(--gray-700)" },
  inlineBtn: { padding: "0.3rem 0.6rem", fontSize: "0.78rem", fontWeight: 700, color: "var(--primary-700)", background: "var(--primary-50)", border: "1px solid var(--primary-200)", borderRadius: "var(--radius-md)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.2rem" },

  /* Grade form */
  gradeForm: { display: "flex", gap: "0.3rem", alignItems: "center" },
  gradeInput: { width: 65, padding: "0.3rem 0.4rem", fontSize: "0.8rem", border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius-sm)" },
  gradeBtn: { padding: "0.3rem", background: "#059669", color: "var(--white)", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer" },
  gradeCancelBtn: { padding: "0.3rem", background: "var(--gray-200)", color: "var(--gray-600)", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer" },

  /* Empty */
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", padding: "3rem", background: "var(--white)", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", textAlign: "center" },
  emptyText: { color: "var(--gray-500)", fontSize: "0.95rem" },
};
