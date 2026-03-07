import { useState, useEffect } from "react";
import { submitLeaveRequest, fetchMyLeaveRequests, downloadODLetter } from "../services/api";
import {
  CalendarOff, Clock, CheckCircle2, XCircle, Send,
  Download, FileText, Briefcase, Loader2, Plus, X, Upload, Eye,
} from "lucide-react";

const STATUS_STYLES = {
  pending: { bg: "#fef3c7", color: "#92400e", label: "Pending" },
  approved: { bg: "#dcfce7", color: "#166534", label: "Approved" },
  rejected: { bg: "#fee2e2", color: "#991b1b", label: "Rejected" },
};

export default function LeaveRequests() {
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [form, setForm] = useState({
    request_type: "od", start_date: "", end_date: "",
    reason: "", event_name: "",
  });

  const load = () => {
    fetchMyLeaveRequests()
      .then(d => setRequests(d.requests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitLeaveRequest(form, proofFile);
      setShowForm(false);
      setProofFile(null);
      setForm({ request_type: "od", start_date: "", end_date: "", reason: "", event_name: "" });
      load();
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

  const stats = {
    total: requests.length,
    approved: requests.filter(r => r.status === "approved").length,
    pending: requests.filter(r => r.status === "pending").length,
    rejected: requests.filter(r => r.status === "rejected").length,
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}><CalendarOff size={22} style={{ verticalAlign: "text-bottom", marginRight: 6 }} /> Leave & OD Requests</h1>
          <p style={S.subtitle}>Submit On-Duty or leave requests and download approval letters</p>
        </div>
        <button style={S.addBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> New Request</>}
        </button>
      </div>

      {/* Stats */}
      <div style={S.statsRow}>
        {[
          { label: "Total", value: stats.total, icon: <FileText size={16} />, color: "#2563eb" },
          { label: "Approved", value: stats.approved, icon: <CheckCircle2 size={16} />, color: "#059669" },
          { label: "Pending", value: stats.pending, icon: <Clock size={16} />, color: "#d97706" },
          { label: "Rejected", value: stats.rejected, icon: <XCircle size={16} />, color: "#dc2626" },
        ].map(s => (
          <div key={s.label} style={{ ...S.statCard, borderLeft: `3px solid ${s.color}` }}>
            <span style={{ color: s.color }}>{s.icon}</span>
            <span style={S.statVal}>{s.value}</span>
            <span style={S.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={S.form}>
          <h3 style={S.formTitle}>
            {form.request_type === "od" ? <Briefcase size={16} /> : <CalendarOff size={16} />}
            {form.request_type === "od" ? " On Duty Request" : " Leave Request"}
          </h3>

          {/* Type Toggle */}
          <div style={S.toggleRow}>
            {["od", "leave"].map(t => (
              <button key={t} type="button"
                style={{ ...S.toggle, ...(form.request_type === t ? S.toggleActive : {}) }}
                onClick={() => setForm({ ...form, request_type: t })}
              >
                {t === "od" ? "On Duty (OD)" : "Leave"}
              </button>
            ))}
          </div>

          <div style={S.formGrid}>
            <div style={S.field}>
              <label style={S.label}>Start Date</label>
              <input type="date" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} style={S.input} />
            </div>
            <div style={S.field}>
              <label style={S.label}>End Date</label>
              <input type="date" required value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} style={S.input} />
            </div>
          </div>

          {form.request_type === "od" && (
            <div style={S.field}>
              <label style={S.label}>Event / Activity Name</label>
              <input type="text" placeholder="e.g. SIH Hackathon, Sports Meet" value={form.event_name} onChange={e => setForm({ ...form, event_name: e.target.value })} style={S.input} />
            </div>
          )}

          <div style={S.field}>
            <label style={S.label}>Reason</label>
            <textarea rows={3} required placeholder="Explain why..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} style={{ ...S.input, resize: "vertical" }} />
          </div>

          <div style={S.field}>
            <label style={S.label}>Upload Proof (PDF, Image)</label>
            <div style={S.fileBox}>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                id="proof-upload"
                style={{ display: "none" }}
                onChange={e => setProofFile(e.target.files[0] || null)}
              />
              <label htmlFor="proof-upload" style={S.fileLabel}>
                <Upload size={16} />
                {proofFile ? proofFile.name : "Choose file..."}
              </label>
              {proofFile && (
                <button type="button" style={S.fileClear} onClick={() => { setProofFile(null); document.getElementById('proof-upload').value = ''; }}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <button type="submit" disabled={submitting} style={S.submitBtn}>
            {submitting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={16} />}
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      )}

      {/* Requests List */}
      {loading ? (
        <div style={S.loadingBox}><Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} color="#64748b" /></div>
      ) : requests.length === 0 ? (
        <div style={S.empty}>
          <CalendarOff size={40} color="#d1d5db" />
          <p>No requests yet. Submit your first one!</p>
        </div>
      ) : (
        <div style={S.table}>
          <div style={S.tableHead}>
            <span style={{ flex: 0.5 }}>#</span>
            <span style={{ flex: 1 }}>Type</span>
            <span style={{ flex: 1.5 }}>Event / Reason</span>
            <span style={{ flex: 1 }}>From</span>
            <span style={{ flex: 1 }}>To</span>
            <span style={{ flex: 1 }}>Status</span>
            <span style={{ flex: 1 }}>Actions</span>
          </div>
          {requests.map((r, i) => {
            const st = STATUS_STYLES[r.status] || STATUS_STYLES.pending;
            return (
              <div key={r.id} style={S.tableRow}>
                <span style={{ flex: 0.5, fontWeight: 700, color: "#94a3b8" }}>{i + 1}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ ...S.typeBadge, background: r.request_type === "od" ? "#eff6ff" : "#fef3c7", color: r.request_type === "od" ? "#1e40af" : "#92400e" }}>
                    {r.request_type === "od" ? "OD" : "Leave"}
                  </span>
                </span>
                <span style={{ flex: 1.5, fontSize: "0.82rem", color: "#334155" }}>
                  {r.event_name || r.reason.substring(0, 40)}
                </span>
                <span style={{ flex: 1, fontSize: "0.82rem", color: "#64748b" }}>{r.start_date}</span>
                <span style={{ flex: 1, fontSize: "0.82rem", color: "#64748b" }}>{r.end_date}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ ...S.statusBadge, background: st.bg, color: st.color }}>{st.label}</span>
                </span>
                <span style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>
                  {r.status === "approved" && (
                    <button style={S.downloadBtn} onClick={() => handleDownload(r.id)}>
                      <Download size={14} /> Letter
                    </button>
                  )}
                  {r.proof_url && (
                    <a href={`http://localhost:8000${r.proof_url}`} target="_blank" rel="noreferrer" style={S.proofLink}>
                      <Eye size={13} /> Proof
                    </a>
                  )}
                  {r.review_comment && (
                    <span style={S.commentTooltip} title={r.review_comment}>💬</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

const S = {
  page: { maxWidth: 950, margin: "0 auto", padding: "1.5rem" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.2rem" },
  title: { fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 },
  subtitle: { fontSize: "0.82rem", color: "#94a3b8", marginTop: "0.2rem" },
  addBtn: { display: "flex", alignItems: "center", gap: 6, padding: "0.55rem 1.1rem", background: "#1e40af", color: "#fff", border: "none", borderRadius: 10, fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" },

  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.7rem", marginBottom: "1.2rem" },
  statCard: { display: "flex", alignItems: "center", gap: "0.5rem", background: "#fff", borderRadius: 10, padding: "0.7rem 0.9rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  statVal: { fontSize: "1.25rem", fontWeight: 800, color: "#1e293b" },
  statLabel: { fontSize: "0.72rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" },

  form: { background: "#fff", borderRadius: 14, padding: "1.5rem", marginBottom: "1.2rem", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #e5e7eb" },
  formTitle: { display: "flex", alignItems: "center", gap: 6, fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: "0 0 1rem" },
  toggleRow: { display: "flex", gap: "0.5rem", marginBottom: "1rem" },
  toggle: { padding: "0.45rem 1.2rem", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f8fafc", fontSize: "0.82rem", fontWeight: 600, color: "#64748b", cursor: "pointer" },
  toggleActive: { background: "#1e40af", color: "#fff", border: "1px solid #1e40af" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" },
  field: { marginBottom: "0.8rem" },
  label: { display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.03em" },
  input: { width: "100%", padding: "0.55rem 0.8rem", borderRadius: 8, border: "1px solid #d1d5db", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" },
  submitBtn: { display: "flex", alignItems: "center", gap: 6, padding: "0.6rem 1.5rem", background: "#059669", color: "#fff", border: "none", borderRadius: 10, fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", marginTop: "0.5rem" },

  table: { background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", border: "1px solid #e5e7eb" },
  tableHead: { display: "flex", padding: "0.7rem 1rem", background: "#f8fafc", borderBottom: "1px solid #e5e7eb", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" },
  tableRow: { display: "flex", alignItems: "center", padding: "0.7rem 1rem", borderBottom: "1px solid #f1f5f9" },
  typeBadge: { fontSize: "0.72rem", fontWeight: 800, padding: "0.2rem 0.6rem", borderRadius: 6 },
  statusBadge: { fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: 999 },
  downloadBtn: { display: "flex", alignItems: "center", gap: 4, padding: "0.3rem 0.7rem", background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" },
  proofLink: { display: "flex", alignItems: "center", gap: 3, padding: "0.3rem 0.6rem", background: "#faf5ff", color: "#7c3aed", border: "1px solid #e9d5ff", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700, textDecoration: "none" },
  commentTooltip: { cursor: "pointer", marginLeft: 2, fontSize: "0.85rem" },
  fileBox: { display: "flex", alignItems: "center", gap: 6 },
  fileLabel: { display: "flex", alignItems: "center", gap: 6, padding: "0.5rem 1rem", borderRadius: 8, border: "1px dashed #93c5fd", background: "#eff6ff", color: "#1e40af", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" },
  fileClear: { background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  loadingBox: { display: "flex", justifyContent: "center", padding: "3rem" },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", padding: "3rem", color: "#94a3b8", fontSize: "0.88rem" },
};
