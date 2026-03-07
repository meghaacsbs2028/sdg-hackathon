import { useState, useEffect } from "react";
import { fetchMyLeetCode, linkLeetCode, syncLeetCode } from "../services/api";
import {
  Code2, Loader2, RefreshCw, CheckCircle, AlertTriangle,
  Trophy, Hash, TrendingUp, Zap, X, ExternalLink,
} from "lucide-react";

export default function LeetCodeActivity() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState(null);
  const [username, setUsername] = useState("");
  const [linking, setLinking] = useState(false);

  const load = () => {
    setLoading(true);
    fetchMyLeetCode()
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleLink = async () => {
    if (!username.trim()) { setMsg({ t: "error", m: "Enter your LeetCode username" }); return; }
    setLinking(true); setMsg(null);
    try {
      const r = await linkLeetCode(username.trim());
      setMsg({ t: "success", m: r.message });
      load();
    } catch (e) { setMsg({ t: "error", m: e.message }); }
    finally { setLinking(false); }
  };

  const handleSync = async () => {
    if (!data?.profile) return;
    setSyncing(true); setMsg(null);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const sp = data.profile.student_id;
      const r = await syncLeetCode(sp);
      setMsg({ t: "success", m: "✅ Synced from LeetCode!" });
      load();
    } catch (e) { setMsg({ t: "error", m: e.message }); }
    finally { setSyncing(false); }
  };

  if (loading) {
    return (
      <div style={S.loadingBox}><div style={S.spinner} /><p style={S.loadingText}>Loading...</p></div>
    );
  }

  const linked = data?.linked;
  const p = data?.profile;

  return (
    <div style={S.container}>
      <div style={S.pageHeader}>
        <div style={S.headerIcon}><Code2 size={24} color="#f59e0b" /></div>
        <div>
          <h2 style={S.heading}>LeetCode Activity</h2>
          <p style={S.subtext}>Link your LeetCode account — stats are fetched automatically</p>
        </div>
      </div>

      {msg && (
        <div style={{ ...S.msgBox, ...(msg.t === "error" ? S.msgError : S.msgSuccess) }}>
          {msg.t === "error" ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          <span>{msg.m}</span>
          <button style={S.msgClose} onClick={() => setMsg(null)}><X size={14} /></button>
        </div>
      )}

      {/* ── Not Linked ─────────────────────────────────────────────────── */}
      {!linked && (
        <div style={S.linkCard}>
          <Code2 size={40} color="#f59e0b" />
          <h3 style={S.linkTitle}>Link Your LeetCode Account</h3>
          <p style={S.linkDesc}>Enter your LeetCode username to auto-fetch your problem-solving stats, contest history, and generate your activity score.</p>
          <div style={S.linkForm}>
            <input
              type="text" placeholder="e.g. johndoe_123" value={username}
              onChange={e => setUsername(e.target.value)} style={S.linkInput}
            />
            <button onClick={handleLink} disabled={linking} style={S.linkBtn}>
              {linking ? <Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} /> : <Zap size={16} />}
              {linking ? " Linking..." : " Link & Sync"}
            </button>
          </div>
        </div>
      )}

      {/* ── Profile Card ───────────────────────────────────────────────── */}
      {linked && p && (
        <>
          <div style={S.profileCard}>
            <div style={S.profileTop}>
              <div style={S.profileLeft}>
                <div style={S.avatarCircle}>{p.leetcode_username.charAt(0).toUpperCase()}</div>
                <div>
                  <a href={`https://leetcode.com/u/${p.leetcode_username}`} target="_blank" rel="noreferrer" style={S.usernameLink}>
                    {p.leetcode_username} <ExternalLink size={12} />
                  </a>
                  <div style={S.lastSync}>
                    Last synced: {p.last_synced_at ? new Date(p.last_synced_at).toLocaleString("en-IN") : "Never"}
                  </div>
                </div>
              </div>
              <button onClick={handleSync} disabled={syncing} style={S.syncBtn}>
                <RefreshCw size={15} style={syncing ? { animation: "spin 0.8s linear infinite" } : {}} />
                {syncing ? " Syncing..." : " Sync Now"}
              </button>
            </div>

            {/* Score */}
            <div style={S.scoreBanner}>
              <div>
                <span style={S.scoreLabel}>Activity Score</span>
                <span style={{
                  ...S.scoreVal,
                  color: p.activity_score >= 60 ? "#16a34a" : p.activity_score >= 30 ? "#d97706" : "#dc2626",
                }}>{p.activity_score}/100</span>
              </div>
              <div style={S.barTrack}>
                <div style={{
                  ...S.barFill, width: `${Math.min(100, p.activity_score)}%`,
                  background: p.activity_score >= 60 ? "#16a34a" : p.activity_score >= 30 ? "#eab308" : "#dc2626",
                }} />
              </div>
            </div>
          </div>

          {/* ── Stats Grid ─────────────────────────────────────────────── */}
          <div style={S.statsGrid}>
            {[
              { label: "Total Solved", val: p.total_solved, color: "#7c3aed", icon: <Hash size={18} /> },
              { label: "Easy", val: p.easy_solved, color: "#16a34a", icon: <CheckCircle size={18} /> },
              { label: "Medium", val: p.medium_solved, color: "#d97706", icon: <TrendingUp size={18} /> },
              { label: "Hard", val: p.hard_solved, color: "#dc2626", icon: <Zap size={18} /> },
              { label: "Contest Rating", val: Math.round(p.contest_rating), color: "#0369a1", icon: <Trophy size={18} /> },
              { label: "Contests", val: p.contests_attended, color: "#059669", icon: <Code2 size={18} /> },
            ].map(c => (
              <div key={c.label} style={{ ...S.statCard, borderTop: `3px solid ${c.color}` }}>
                <span style={{ color: c.color }}>{c.icon}</span>
                <span style={S.statVal}>{c.val}</span>
                <span style={S.statLabel}>{c.label}</span>
              </div>
            ))}
          </div>

          {/* ── Contest History ─────────────────────────────────────────── */}
          {p.contests && p.contests.length > 0 && (
            <div style={S.section}>
              <h3 style={S.sectionTitle}><Trophy size={18} color="#f59e0b" /> Contest History ({p.contests.length})</h3>
              <div style={S.tableWrap}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={{ ...S.th, textAlign: "left" }}>Contest</th>
                      <th style={S.th}>Solved</th>
                      <th style={S.th}>Ranking</th>
                      <th style={S.th}>Rating</th>
                      <th style={S.th}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.contests.map((c, i) => (
                      <tr key={i} style={S.tr}>
                        <td style={S.td}><strong>{c.contest_title}</strong></td>
                        <td style={S.tdCenter}>
                          <span style={{
                            ...S.solvedBadge,
                            color: c.problems_solved >= 3 ? "#059669" : c.problems_solved >= 2 ? "#d97706" : "#dc2626",
                            background: c.problems_solved >= 3 ? "#ecfdf5" : c.problems_solved >= 2 ? "#fffbeb" : "#fef2f2",
                          }}>{c.problems_solved}/{c.total_problems}</span>
                        </td>
                        <td style={S.tdCenter}>#{c.ranking.toLocaleString()}</td>
                        <td style={S.tdCenter}>{Math.round(c.rating_after)}</td>
                        <td style={S.tdCenter}>
                          {c.contest_date ? new Date(c.contest_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const S = {
  container: { maxWidth: 820, margin: "2rem auto", padding: "0 1.5rem" },
  loadingBox: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5rem 1rem", gap: "1rem" },
  spinner: { width: 40, height: 40, border: "3px solid var(--gray-200)", borderTop: "3px solid #f59e0b", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  loadingText: { color: "var(--gray-500)", fontSize: "0.9rem" },

  pageHeader: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" },
  headerIcon: { width: 52, height: 52, borderRadius: "var(--radius-lg)", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" },
  heading: { fontSize: "1.5rem", fontWeight: 800, color: "var(--gray-900)", letterSpacing: "-0.03em", margin: 0 },
  subtext: { fontSize: "0.9rem", color: "var(--gray-500)", margin: "0.15rem 0 0" },

  msgBox: { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", fontSize: "0.88rem", fontWeight: 600, marginBottom: "1rem" },
  msgSuccess: { background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" },
  msgError: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
  msgClose: { marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 2 },

  /* Link card */
  linkCard: { display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "3rem 2rem", background: "var(--white)", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", textAlign: "center", boxShadow: "var(--shadow-md)" },
  linkTitle: { fontSize: "1.25rem", fontWeight: 800, color: "var(--gray-900)", margin: 0 },
  linkDesc: { fontSize: "0.9rem", color: "var(--gray-500)", maxWidth: 400, lineHeight: 1.5 },
  linkForm: { display: "flex", gap: "0.5rem", width: "100%", maxWidth: 380 },
  linkInput: { flex: 1, padding: "0.6rem 0.85rem", fontSize: "0.9rem", border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius-md)", background: "var(--gray-50)" },
  linkBtn: { padding: "0.6rem 1.2rem", fontSize: "0.88rem", fontWeight: 700, color: "var(--white)", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", whiteSpace: "nowrap" },

  /* Profile */
  profileCard: { background: "var(--white)", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", padding: "1.5rem", marginBottom: "1rem", boxShadow: "var(--shadow-md)" },
  profileTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" },
  profileLeft: { display: "flex", alignItems: "center", gap: "0.75rem" },
  avatarCircle: { width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #f59e0b, #ea580c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", fontWeight: 800, color: "#fff" },
  usernameLink: { fontSize: "1.05rem", fontWeight: 700, color: "#f59e0b", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" },
  lastSync: { fontSize: "0.75rem", color: "var(--gray-400)", marginTop: 2 },
  syncBtn: { padding: "0.5rem 1rem", fontSize: "0.82rem", fontWeight: 700, color: "#f59e0b", background: "#fef3c7", border: "1.5px solid #fde68a", borderRadius: "var(--radius-md)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" },

  scoreBanner: { padding: "1rem", background: "var(--gray-50)", borderRadius: "var(--radius-md)", border: "1px solid var(--gray-100)" },
  scoreLabel: { fontSize: "0.78rem", fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block" },
  scoreVal: { fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" },
  barTrack: { width: "100%", height: 10, background: "var(--gray-100)", borderRadius: 5, overflow: "hidden", marginTop: "0.5rem" },
  barFill: { height: "100%", borderRadius: 5, transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)" },

  /* Stats */
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" },
  statCard: { background: "var(--white)", borderRadius: "var(--radius-md)", border: "1px solid var(--gray-200)", padding: "1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", textAlign: "center", boxShadow: "var(--shadow-sm)" },
  statVal: { fontSize: "1.4rem", fontWeight: 800, color: "var(--gray-900)" },
  statLabel: { fontSize: "0.72rem", fontWeight: 600, color: "var(--gray-400)", textTransform: "uppercase" },

  /* Contest table */
  section: { marginBottom: "1.5rem" },
  sectionTitle: { fontSize: "1rem", fontWeight: 800, color: "var(--gray-800)", margin: "0 0 0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" },
  tableWrap: { overflowX: "auto", borderRadius: "var(--radius-md)", border: "1px solid var(--gray-200)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" },
  th: { textAlign: "center", padding: "0.6rem 0.75rem", background: "var(--gray-50)", fontSize: "0.72rem", fontWeight: 700, color: "var(--gray-600)", textTransform: "uppercase", borderBottom: "1px solid var(--gray-200)" },
  tr: { borderBottom: "1px solid var(--gray-100)" },
  td: { padding: "0.55rem 0.75rem" },
  tdCenter: { padding: "0.55rem 0.75rem", textAlign: "center" },
  solvedBadge: { fontWeight: 700, fontSize: "0.82rem", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-full)", border: "1px solid transparent" },
};
