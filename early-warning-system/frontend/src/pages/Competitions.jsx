import { useState, useEffect, useMemo } from "react";
import {
  submitCompetition, fetchMyCompetitions, fetchCompetitions,
  reviewCompetition, deleteCompetition,
} from "../services/api";
import {
  Trophy, PlusCircle, Loader2, CheckCircle, XCircle, Clock,
  Trash2, X, Send, MessageSquare, Search, Filter, Star,
  Award, Globe, Building, ChevronDown,
} from "lucide-react";

const TYPES = [
  { value: "hackathon", label: "Hackathon", icon: "💻", score: 10 },
  { value: "paper", label: "Paper Presentation", icon: "📄", score: 9 },
  { value: "sports", label: "Sports", icon: "🏅", score: 8 },
  { value: "cultural", label: "Cultural", icon: "🎭", score: 7 },
  { value: "workshop", label: "Workshop", icon: "🛠️", score: 6 },
  { value: "other", label: "Other", icon: "📌", score: 5 },
];
const LEVELS = [
  { value: "international", label: "International", score: 20 },
  { value: "national", label: "National", score: 15 },
  { value: "state", label: "State", score: 10 },
  { value: "college", label: "College", score: 5 },
];
const RESULTS = [
  { value: "winner", label: "Winner 🏆", score: 20 },
  { value: "runner_up", label: "Runner-up 🥈", score: 15 },
  { value: "finalist", label: "Finalist", score: 12 },
  { value: "merit", label: "Merit Award", score: 10 },
  { value: "participant", label: "Participant", score: 5 },
];

const STATUS_CONFIG = {
  pending: { color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: <Clock size={14} />, label: "Pending Review" },
  approved: { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", icon: <CheckCircle size={14} />, label: "Approved" },
  rejected: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: <XCircle size={14} />, label: "Rejected" },
};

export default function Competitions() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isStudent = user.role === "student";

  return isStudent ? <StudentView /> : <ReviewView />;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   STUDENT VIEW — Submit & Track
   ═══════════════════════════════════════════════════════════════════════════════ */
function StudentView() {
  const [entries, setEntries] = useState([]);
  const [totalScore, setTotalScore] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    name: "", comp_type: "hackathon", level: "college", date: "", result: "participant",
    proof_url: "", description: "",
  });

  const loadEntries = () => {
    setLoading(true);
    fetchMyCompetitions()
      .then(d => { setEntries(d.entries || []); setTotalScore(d.total_approved_score || 0); setApprovedCount(d.approved_count || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadEntries(); }, []);

  const previewScore = useMemo(() => {
    const t = TYPES.find(x => x.value === form.comp_type)?.score || 5;
    const l = LEVELS.find(x => x.value === form.level)?.score || 5;
    const r = RESULTS.find(x => x.value === form.result)?.score || 5;
    return t + l + r;
  }, [form.comp_type, form.level, form.result]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setMsg("");
    try {
      await submitCompetition(form);
      setMsg("✅ Submitted for review!");
      setForm({ name: "", comp_type: "hackathon", level: "college", date: "", result: "participant", proof_url: "", description: "" });
      setShowForm(false);
      loadEntries();
    } catch (err) { setMsg("❌ " + err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this pending entry?")) return;
    try { await deleteCompetition(id); loadEntries(); } catch (err) { alert(err.message); }
  };

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.heading}><Trophy size={22} color="#d97706" style={{ marginRight: 8 }} />My Competitions</h2>
          <p style={s.subtitle}>Submit your competition participation for faculty review</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setMsg(""); }} style={s.addBtn}>
          {showForm ? <><X size={14} style={{ marginRight: 4 }} /> Cancel</> : <><PlusCircle size={14} style={{ marginRight: 4 }} /> Add Competition</>}
        </button>
      </div>

      {/* Score Summary */}
      <div style={s.summaryRow}>
        <div style={{ ...s.summaryCard, borderLeft: "4px solid #d97706" }}>
          <Trophy size={24} color="#d97706" />
          <div><span style={s.summaryCount}>{entries.length}</span><span style={s.summaryLabel}>Total Entries</span></div>
        </div>
        <div style={{ ...s.summaryCard, borderLeft: "4px solid #059669" }}>
          <CheckCircle size={24} color="#059669" />
          <div><span style={{ ...s.summaryCount, color: "#059669" }}>{approvedCount}</span><span style={s.summaryLabel}>Approved</span></div>
        </div>
        <div style={{ ...s.summaryCard, borderLeft: "4px solid #7c3aed" }}>
          <Star size={24} color="#7c3aed" />
          <div><span style={{ ...s.summaryCount, color: "#7c3aed" }}>{totalScore}</span><span style={s.summaryLabel}>Total Score</span></div>
        </div>
        <div style={{ ...s.summaryCard, borderLeft: "4px solid #2563eb" }}>
          <Clock size={24} color="#2563eb" />
          <div><span style={{ ...s.summaryCount, color: "#2563eb" }}>{entries.filter(e => e.status === "pending").length}</span><span style={s.summaryLabel}>Pending</span></div>
        </div>
      </div>

      {msg && <div style={{ ...s.msgBanner, ...(msg.startsWith("✅") ? { background: "#ecfdf5", borderColor: "#a7f3d0", color: "#059669" } : { background: "#fef2f2", borderColor: "#fecaca", color: "#dc2626" }) }}>{msg}</div>}

      {/* Submit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={s.formCard}>
          <h4 style={s.formTitle}><PlusCircle size={16} style={{ marginRight: 6 }} /> New Competition Entry</h4>
          <div style={s.formGrid}>
            <div style={s.field}>
              <label style={s.label}>Competition Name *</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={s.input} placeholder="e.g. Smart India Hackathon" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Type * <span style={s.scoreHint}>+{TYPES.find(x => x.value === form.comp_type)?.score} pts</span></label>
              <select value={form.comp_type} onChange={e => setForm({ ...form, comp_type: e.target.value })} style={s.input}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Level * <span style={s.scoreHint}>+{LEVELS.find(x => x.value === form.level)?.score} pts</span></label>
              <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} style={s.input}>
                {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Date *</label>
              <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={s.input} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Result * <span style={s.scoreHint}>+{RESULTS.find(x => x.value === form.result)?.score} pts</span></label>
              <select value={form.result} onChange={e => setForm({ ...form, result: e.target.value })} style={s.input}>
                {RESULTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Proof / Certificate URL</label>
              <input value={form.proof_url} onChange={e => setForm({ ...form, proof_url: e.target.value })} style={s.input} placeholder="https://..." />
            </div>
            <div style={{ ...s.field, gridColumn: "1 / -1" }}>
              <label style={s.label}>Description (optional)</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...s.input, minHeight: 50, resize: "vertical" }} placeholder="Brief description..." />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "0.75rem" }}>
            <button type="submit" disabled={submitting} style={s.submitBtn}>
              {submitting ? <><Loader2 size={14} style={{ marginRight: 4, animation: "spin 0.7s linear infinite" }} /> Submitting...</> : <><Send size={14} style={{ marginRight: 4 }} /> Submit for Review</>}
            </button>
            <div style={s.previewScore}>
              <Star size={14} color="#7c3aed" /> Estimated Score: <strong>{previewScore}</strong>
            </div>
          </div>
        </form>
      )}

      {/* Entries List */}
      {loading ? (
        <div style={s.loadingBox}><Loader2 size={28} style={{ animation: "spin 0.8s linear infinite" }} color="var(--primary-500)" /></div>
      ) : entries.length === 0 ? (
        <div style={s.emptyBox}>
          <Trophy size={48} color="var(--gray-300)" />
          <p style={{ color: "var(--gray-500)", marginTop: "0.5rem" }}>No competition entries yet. Add your first one!</p>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={s.th}>Competition</th>
                <th style={s.th}>Type</th>
                <th style={s.th}>Level</th>
                <th style={s.th}>Date</th>
                <th style={s.th}>Result</th>
                <th style={{ ...s.th, textAlign: "center" }}>Score</th>
                <th style={{ ...s.th, textAlign: "center" }}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const sc = STATUS_CONFIG[e.status] || STATUS_CONFIG.pending;
                const typeInfo = TYPES.find(t => t.value === e.comp_type);
                return (
                  <tr key={e.id} style={s.tr}>
                    <td style={s.td}>{i + 1}</td>
                    <td style={s.td}>
                      <div style={{ fontWeight: 600 }}>{e.name}</div>
                      {e.description && <div style={{ fontSize: "0.72rem", color: "var(--gray-400)", marginTop: 2 }}>{e.description}</div>}
                    </td>
                    <td style={s.td}><span style={s.typeBadge}>{typeInfo?.icon} {typeInfo?.label || e.comp_type}</span></td>
                    <td style={s.td}><span style={s.levelBadge}>{e.level}</span></td>
                    <td style={s.td}>{e.date}</td>
                    <td style={s.td}><span style={s.resultBadge}>{RESULTS.find(r => r.value === e.result)?.label || e.result}</span></td>
                    <td style={{ ...s.td, textAlign: "center" }}>
                      <span style={s.scoreBadge}><Star size={12} style={{ marginRight: 2 }} />{e.total_score}</span>
                    </td>
                    <td style={{ ...s.td, textAlign: "center" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.2rem 0.6rem", borderRadius: 10, fontSize: "0.78rem", fontWeight: 700, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}>
                        {sc.icon} {sc.label}
                      </span>
                      {e.review_comment && <div style={{ fontSize: "0.7rem", color: "var(--gray-500)", marginTop: 3 }}>💬 {e.review_comment}</div>}
                    </td>
                    <td style={s.td}>
                      {e.status === "pending" && (
                        <button onClick={() => handleDelete(e.id)} style={s.deleteBtn}><Trash2 size={12} /></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   REVIEW VIEW — Faculty / HOD / Admin
   ═══════════════════════════════════════════════════════════════════════════════ */
function ReviewView() {
  const [entries, setEntries] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewComment, setReviewComment] = useState("");
  const [processing, setProcessing] = useState(false);

  const loadEntries = (sf) => {
    setLoading(true);
    fetchCompetitions(sf || undefined)
      .then(d => { setEntries(d.entries || []); setPendingCount(d.pending_count || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadEntries(statusFilter); }, [statusFilter]);

  const displayed = useMemo(() => {
    if (!search) return entries;
    const q = search.toLowerCase();
    return entries.filter(e =>
      e.student_name?.toLowerCase().includes(q) ||
      e.roll_number?.toLowerCase().includes(q) ||
      e.name?.toLowerCase().includes(q)
    );
  }, [entries, search]);

  const handleReview = async (id, action) => {
    setProcessing(true);
    try {
      await reviewCompetition(id, action, reviewComment);
      setReviewingId(null);
      setReviewComment("");
      loadEntries(statusFilter);
    } catch (err) { alert(err.message); }
    finally { setProcessing(false); }
  };

  return (
    <div style={s.container}>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.heading}><Trophy size={22} color="#d97706" style={{ marginRight: 8 }} />Competition Review</h2>
          <p style={s.subtitle}>Review and approve student competition submissions</p>
        </div>
        {pendingCount > 0 && (
          <div style={s.pendingBadge}><Clock size={16} /> {pendingCount} pending review{pendingCount > 1 ? "s" : ""}</div>
        )}
      </div>

      {/* Filters */}
      <div style={s.filterBar}>
        <div style={s.searchWrap}>
          <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)" }} />
          <input type="text" placeholder="Search student, roll number, or competition..." value={search}
            onChange={e => setSearch(e.target.value)} style={s.searchInput} />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["", "pending", "approved", "rejected"].map(sf => (
            <button key={sf} onClick={() => setStatusFilter(sf)}
              style={{ ...s.filterChip, ...(statusFilter === sf ? { background: "var(--primary-600)", color: "#fff", border: "1.5px solid var(--primary-600)" } : {}) }}>
              {sf === "" ? "All" : sf.charAt(0).toUpperCase() + sf.slice(1)}
            </button>
          ))}
        </div>
        <span style={s.filterMeta}>
          <Filter size={13} style={{ marginRight: 3 }} /> {displayed.length} entries
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div style={s.loadingBox}><Loader2 size={28} style={{ animation: "spin 0.8s linear infinite" }} color="var(--primary-500)" /></div>
      ) : displayed.length === 0 ? (
        <div style={s.emptyBox}>
          <Trophy size={48} color="var(--gray-300)" />
          <p style={{ color: "var(--gray-500)", marginTop: "0.5rem" }}>No competition entries to review.</p>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={s.th}>Student</th>
                <th style={s.th}>Competition</th>
                <th style={s.th}>Type / Level</th>
                <th style={s.th}>Date</th>
                <th style={s.th}>Result</th>
                <th style={{ ...s.th, textAlign: "center" }}>Score</th>
                <th style={{ ...s.th, textAlign: "center" }}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((e, i) => {
                const sc = STATUS_CONFIG[e.status] || STATUS_CONFIG.pending;
                const typeInfo = TYPES.find(t => t.value === e.comp_type);
                const isReviewing = reviewingId === e.id;
                return (
                  <tr key={e.id} style={{ ...s.tr, ...(e.status === "pending" ? { background: "#fffbeb", borderLeft: "3px solid #d97706" } : {}) }}>
                    <td style={s.td}>{i + 1}</td>
                    <td style={s.td}>
                      <div style={{ fontWeight: 600 }}>{e.student_name || "—"}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--gray-400)", fontFamily: "monospace" }}>{e.roll_number}</div>
                    </td>
                    <td style={s.td}>
                      <div style={{ fontWeight: 600 }}>{e.name}</div>
                      {e.proof_url && <a href={e.proof_url} target="_blank" rel="noreferrer" style={{ fontSize: "0.72rem", color: "var(--primary-600)" }}>View Proof →</a>}
                    </td>
                    <td style={s.td}>
                      <span style={s.typeBadge}>{typeInfo?.icon} {typeInfo?.label}</span>
                      <span style={{ ...s.levelBadge, marginLeft: 4 }}>{e.level}</span>
                    </td>
                    <td style={s.td}>{e.date}</td>
                    <td style={s.td}><span style={s.resultBadge}>{RESULTS.find(r => r.value === e.result)?.label || e.result}</span></td>
                    <td style={{ ...s.td, textAlign: "center" }}>
                      <span style={s.scoreBadge}><Star size={12} style={{ marginRight: 2 }} />{e.total_score}</span>
                    </td>
                    <td style={{ ...s.td, textAlign: "center" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.2rem 0.6rem", borderRadius: 10, fontSize: "0.78rem", fontWeight: 700, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}>
                        {sc.icon} {sc.label}
                      </span>
                    </td>
                    <td style={s.td}>
                      {e.status === "pending" ? (
                        isReviewing ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
                            <input placeholder="Comment (optional)" value={reviewComment}
                              onChange={ev => setReviewComment(ev.target.value)} style={{ ...s.input, fontSize: "0.78rem", padding: "0.3rem 0.4rem" }} />
                            <div style={{ display: "flex", gap: 4 }}>
                              <button disabled={processing} onClick={() => handleReview(e.id, "approved")}
                                style={{ ...s.approveBtn, flex: 1 }}><CheckCircle size={12} /> Approve</button>
                              <button disabled={processing} onClick={() => handleReview(e.id, "rejected")}
                                style={{ ...s.rejectBtn, flex: 1 }}><XCircle size={12} /> Reject</button>
                            </div>
                            <button onClick={() => { setReviewingId(null); setReviewComment(""); }}
                              style={{ fontSize: "0.72rem", color: "var(--gray-500)", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setReviewingId(e.id)} style={s.reviewBtn}>
                            <MessageSquare size={12} style={{ marginRight: 3 }} /> Review
                          </button>
                        )
                      ) : (
                        <span style={{ fontSize: "0.72rem", color: "var(--gray-400)" }}>
                          {e.review_comment ? `💬 ${e.review_comment}` : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────────── */
const s = {
  container: { maxWidth: 1200, margin: "2rem auto", padding: "0 1.5rem" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" },
  heading: { fontSize: "1.5rem", fontWeight: 800, margin: 0, color: "var(--gray-900)", letterSpacing: "-0.03em", display: "flex", alignItems: "center" },
  subtitle: { fontSize: "0.85rem", color: "var(--gray-500)", marginTop: 4 },

  addBtn: { display: "flex", alignItems: "center", padding: "0.55rem 1.1rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--white)", background: "linear-gradient(135deg, #d97706, #b45309)", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", boxShadow: "var(--shadow-sm)" },
  pendingBadge: { display: "flex", alignItems: "center", gap: 6, padding: "0.5rem 1rem", background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: "var(--radius-md)", color: "#92400e", fontWeight: 700, fontSize: "0.88rem" },

  summaryRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" },
  summaryCard: { background: "var(--white)", borderRadius: "var(--radius-md)", padding: "0.9rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" },
  summaryCount: { fontSize: "1.6rem", fontWeight: 800, color: "#d97706", display: "block", letterSpacing: "-0.02em" },
  summaryLabel: { fontSize: "0.75rem", color: "var(--gray-400)", display: "block", fontWeight: 500 },

  msgBanner: { padding: "0.65rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid", fontSize: "0.88rem", fontWeight: 600, marginBottom: "1rem" },

  formCard: { padding: "1.25rem 1.5rem", marginBottom: "1.25rem", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-lg)", background: "var(--white)", boxShadow: "var(--shadow-md)", animation: "slideDown 0.3s ease-out" },
  formTitle: { margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, color: "var(--gray-900)", display: "flex", alignItems: "center" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" },
  field: { display: "flex", flexDirection: "column", gap: "0.25rem" },
  label: { fontSize: "0.78rem", fontWeight: 600, color: "var(--gray-600)", display: "flex", alignItems: "center", gap: 6 },
  scoreHint: { fontSize: "0.7rem", color: "#7c3aed", fontWeight: 700 },
  input: { padding: "0.45rem 0.6rem", border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius-md)", fontSize: "0.85rem", background: "var(--gray-50)" },
  submitBtn: { display: "flex", alignItems: "center", padding: "0.55rem 1.3rem", background: "linear-gradient(135deg, #d97706, #b45309)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", boxShadow: "var(--shadow-sm)" },
  previewScore: { display: "flex", alignItems: "center", gap: 4, fontSize: "0.85rem", color: "#7c3aed", fontWeight: 600, background: "#f5f3ff", padding: "0.4rem 0.8rem", borderRadius: "var(--radius-md)", border: "1px solid #e9d5ff" },

  filterBar: { display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.75rem", padding: "0.75rem 1rem", background: "var(--white)", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)" },
  searchWrap: { position: "relative", flex: "1 1 220px", minWidth: 180 },
  searchInput: { width: "100%", padding: "0.45rem 0.65rem 0.45rem 32px", border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius-md)", fontSize: "0.85rem", background: "var(--gray-50)" },
  filterChip: { padding: "0.35rem 0.75rem", borderRadius: 20, fontSize: "0.78rem", cursor: "pointer", border: "1.5px solid var(--gray-200)", background: "var(--white)", color: "var(--gray-500)", fontWeight: 600 },
  filterMeta: { fontSize: "0.78rem", color: "var(--gray-400)", marginLeft: "auto", display: "flex", alignItems: "center" },

  tableWrap: { background: "var(--white)", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-md)", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" },
  th: { textAlign: "left", padding: "0.65rem 0.85rem", borderBottom: "2px solid var(--primary-700)", background: "var(--gray-50)", whiteSpace: "nowrap", fontSize: "0.72rem", fontWeight: 700, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.04em" },
  tr: { borderBottom: "1px solid var(--gray-100)", transition: "background 0.12s" },
  td: { padding: "0.6rem 0.85rem", verticalAlign: "middle" },

  typeBadge: { fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 3 },
  levelBadge: { fontSize: "0.72rem", fontWeight: 700, background: "#eff6ff", color: "var(--primary-600)", borderRadius: 6, padding: "0.15rem 0.45rem", textTransform: "capitalize" },
  resultBadge: { fontSize: "0.78rem", fontWeight: 600 },
  scoreBadge: { display: "inline-flex", alignItems: "center", gap: 2, fontWeight: 700, fontSize: "0.85rem", color: "#7c3aed", background: "#f5f3ff", padding: "0.15rem 0.5rem", borderRadius: 8 },

  deleteBtn: { padding: "0.3rem", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center" },
  reviewBtn: { display: "flex", alignItems: "center", padding: "0.35rem 0.7rem", fontSize: "0.78rem", fontWeight: 700, color: "var(--primary-700)", background: "var(--primary-50)", border: "1px solid var(--primary-200)", borderRadius: "var(--radius-sm)", cursor: "pointer" },
  approveBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 3, padding: "0.3rem 0.5rem", fontSize: "0.72rem", fontWeight: 700, color: "#059669", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 6, cursor: "pointer" },
  rejectBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 3, padding: "0.3rem 0.5rem", fontSize: "0.72rem", fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer" },

  loadingBox: { display: "flex", justifyContent: "center", padding: "4rem" },
  emptyBox: { display: "flex", flexDirection: "column", alignItems: "center", padding: "4rem", gap: "0.5rem" },
};
