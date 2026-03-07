import { useState, useEffect } from "react";
import { fetchAllLeaveRequests, reviewLeaveRequest, downloadODLetter } from "../services/api";
import {
  CalendarOff, Clock, CheckCircle2, XCircle, Download,
  Filter, Loader2, MessageSquare, User, Briefcase, Eye,
} from "lucide-react";

const TABS = [
  { key: null, label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default function LeaveReview() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [reviewModal, setReviewModal] = useState(null); // { id, action }
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = (f) => {
    setLoading(true);
    fetchAllLeaveRequests(f)
      .then(d => { setRequests(d.requests || []); setPendingCount(d.pending_count || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(filter); }, [filter]);

  const handleReview = async () => {
    if (!reviewModal) return;
    setSubmitting(true);
    try {
      await reviewLeaveRequest(reviewModal.id, { action: reviewModal.action, comment: comment || null });
      setReviewModal(null);
      setComment("");
      load(filter);
    } catch (err) { alert(err.message); }
    setSubmitting(false);
  };

  const handleDownload = async (id) => {
    try {
      const blob = await downloadODLetter(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `letter_${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Failed to download"); }
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}><CalendarOff size={22} style={{ verticalAlign: "text-bottom", marginRight: 6 }} /> Leave & OD Review</h1>
          <p style={S.subtitle}>Review and manage student leave and On-Duty requests</p>
        </div>
        {pendingCount > 0 && (
          <div style={S.pendingBadge}>
            <Clock size={14} /> {pendingCount} Pending
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t.key || "all"} onClick={() => setFilter(t.key)}
            style={{ ...S.tab, ...(filter === t.key ? S.tabActive : {}) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={S.loadingBox}><Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} color="#64748b" /></div>
      ) : requests.length === 0 ? (
        <div style={S.empty}>
          <CheckCircle2 size={40} color="#d1d5db" />
          <p>No requests found</p>
        </div>
      ) : (
        <div style={S.table}>
          <div style={S.tableHead}>
            <span style={{ flex: 0.4 }}>#</span>
            <span style={{ flex: 1.2 }}>Student</span>
            <span style={{ flex: 0.6 }}>Type</span>
            <span style={{ flex: 1.3 }}>Event / Reason</span>
            <span style={{ flex: 0.8 }}>From</span>
            <span style={{ flex: 0.8 }}>To</span>
            <span style={{ flex: 0.7 }}>Status</span>
            <span style={{ flex: 1.2 }}>Actions</span>
          </div>
          {requests.map((r, i) => (
            <div key={r.id} style={S.tableRow}>
              <span style={{ flex: 0.4, fontWeight: 700, color: "#94a3b8" }}>{i + 1}</span>
              <span style={{ flex: 1.2 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>{r.student_name}</div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{r.roll_number} · Y{r.year}{r.section}</div>
              </span>
              <span style={{ flex: 0.6 }}>
                <span style={{
                  fontSize: "0.72rem", fontWeight: 800, padding: "0.2rem 0.55rem", borderRadius: 6,
                  background: r.request_type === "od" ? "#eff6ff" : "#fef3c7",
                  color: r.request_type === "od" ? "#1e40af" : "#92400e",
                }}>
                  {r.request_type === "od" ? "OD" : "Leave"}
                </span>
              </span>
              <span style={{ flex: 1.3, fontSize: "0.82rem", color: "#475569" }}>
                {r.event_name || r.reason?.substring(0, 35)}
              </span>
              <span style={{ flex: 0.8, fontSize: "0.8rem", color: "#64748b" }}>{r.start_date}</span>
              <span style={{ flex: 0.8, fontSize: "0.8rem", color: "#64748b" }}>{r.end_date}</span>
              <span style={{ flex: 0.7 }}>
                <StatusBadge status={r.status} />
              </span>
              <span style={{ flex: 1.2, display: "flex", gap: 4, flexWrap: "wrap" }}>
                {r.status === "pending" && (
                  <>
                    <button style={S.approveBtn} onClick={() => setReviewModal({ id: r.id, action: "approved" })}>
                      <CheckCircle2 size={13} /> Approve
                    </button>
                    <button style={S.rejectBtn} onClick={() => setReviewModal({ id: r.id, action: "rejected" })}>
                      <XCircle size={13} /> Reject
                    </button>
                  </>
                )}
                {r.status === "approved" && (
                  <button style={S.dlBtn} onClick={() => handleDownload(r.id)}>
                    <Download size={13} /> Letter
                  </button>
                )}
                {r.proof_url && (
                  <a href={`http://localhost:8000${r.proof_url}`} target="_blank" rel="noreferrer" style={S.proofBtn}>
                    <Eye size={13} /> Proof
                  </a>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div style={S.overlay} onClick={() => setReviewModal(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 0.8rem", fontSize: "1.05rem", fontWeight: 800, color: "#1e293b" }}>
              {reviewModal.action === "approved" ? "✅ Approve" : "❌ Reject"} Request
            </h3>
            <div style={S.field}>
              <label style={S.label}>Comment (optional)</label>
              <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Add a note..." style={{ ...S.input, resize: "vertical" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "0.8rem" }}>
              <button onClick={() => setReviewModal(null)} style={S.cancelBtn}>Cancel</button>
              <button onClick={handleReview} disabled={submitting}
                style={{ ...S.confirmBtn, background: reviewModal.action === "approved" ? "#059669" : "#dc2626" }}
              >
                {submitting ? "..." : reviewModal.action === "approved" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: { bg: "#fef3c7", color: "#92400e" },
    approved: { bg: "#dcfce7", color: "#166534" },
    rejected: { bg: "#fee2e2", color: "#991b1b" },
  };
  const s = map[status] || map.pending;
  return <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: 999, background: s.bg, color: s.color }}>{status}</span>;
}

const S = {
  page: { maxWidth: 1050, margin: "0 auto", padding: "1.5rem" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" },
  title: { fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 },
  subtitle: { fontSize: "0.82rem", color: "#94a3b8", marginTop: "0.15rem" },
  pendingBadge: { display: "flex", alignItems: "center", gap: 5, padding: "0.4rem 0.9rem", background: "#fef3c7", color: "#92400e", borderRadius: 999, fontSize: "0.78rem", fontWeight: 700, border: "1px solid #fde68a" },

  tabs: { display: "flex", gap: "0.4rem", marginBottom: "1rem" },
  tab: { padding: "0.4rem 1rem", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: "0.8rem", fontWeight: 600, color: "#64748b", cursor: "pointer" },
  tabActive: { background: "#1e293b", color: "#fff", border: "1px solid #1e293b" },

  table: { background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", border: "1px solid #e5e7eb" },
  tableHead: { display: "flex", padding: "0.7rem 1rem", background: "#f8fafc", borderBottom: "1px solid #e5e7eb", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" },
  tableRow: { display: "flex", alignItems: "center", padding: "0.65rem 1rem", borderBottom: "1px solid #f1f5f9" },

  approveBtn: { display: "flex", alignItems: "center", gap: 3, padding: "0.25rem 0.6rem", background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 7, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" },
  rejectBtn: { display: "flex", alignItems: "center", gap: 3, padding: "0.25rem 0.6rem", background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 7, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" },
  dlBtn: { display: "flex", alignItems: "center", gap: 3, padding: "0.25rem 0.6rem", background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", borderRadius: 7, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" },
  proofBtn: { display: "flex", alignItems: "center", gap: 3, padding: "0.25rem 0.6rem", background: "#faf5ff", color: "#7c3aed", border: "1px solid #e9d5ff", borderRadius: 7, fontSize: "0.72rem", fontWeight: 700, textDecoration: "none", cursor: "pointer" },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#fff", borderRadius: 16, padding: "1.5rem", width: 380, maxWidth: "90vw", boxShadow: "0 20px 50px rgba(0,0,0,0.15)" },
  field: { marginBottom: "0.6rem" },
  label: { display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem", textTransform: "uppercase" },
  input: { width: "100%", padding: "0.5rem 0.7rem", borderRadius: 8, border: "1px solid #d1d5db", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" },
  cancelBtn: { padding: "0.45rem 1rem", background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" },
  confirmBtn: { padding: "0.45rem 1.2rem", color: "#fff", border: "none", borderRadius: 8, fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" },

  loadingBox: { display: "flex", justifyContent: "center", padding: "3rem" },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", padding: "3rem", color: "#94a3b8" },
};
