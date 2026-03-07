import { useState, useEffect, useRef } from "react";
import {
  fetchLeetCodeLeaderboard, syncAllLeetCode, fetchStudentLeetCode,
  fetchContestDefaulters,
} from "../services/api";
import {
  Code2, Loader2, RefreshCw, Trophy, Hash, TrendingUp, Zap,
  CheckCircle, Search, X, ExternalLink, Users, AlertTriangle,
  Download, Image as ImageIcon,
} from "lucide-react";
import html2canvas from "html2canvas";

export default function LeetCodeReview() {
  const [tab, setTab] = useState("leaderboard"); // "leaderboard" | "defaulters"
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState(null);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState(null);

  // Defaulters state
  const [defData, setDefData] = useState(null);
  const [defLoading, setDefLoading] = useState(false);
  const defaultersRef = useRef(null);

  // Filters
  const [year, setYear] = useState("");
  const [section, setSection] = useState("");

  const load = () => {
    setLoading(true);
    fetchLeetCodeLeaderboard(year || undefined, section || undefined)
      .then(d => setLeaderboard(d.leaderboard || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadDefaulters = () => {
    setDefLoading(true);
    fetchContestDefaulters(year || undefined, section || undefined, 3)
      .then(d => setDefData(d))
      .catch(() => {})
      .finally(() => setDefLoading(false));
  };

  useEffect(() => { load(); }, [year, section]);
  useEffect(() => { if (tab === "defaulters") loadDefaulters(); }, [tab, year, section]);

  const handleSyncAll = async () => {
    setSyncing(true); setMsg(null);
    try {
      const r = await syncAllLeetCode(year || undefined, section || undefined);
      setMsg({ t: "success", m: r.message });
      load();
    } catch (e) { setMsg({ t: "error", m: e.message }); }
    finally { setSyncing(false); }
  };

  const openDetail = async (studentId) => {
    try {
      const d = await fetchStudentLeetCode(studentId);
      setDetail(d?.profile || null);
    } catch (e) { setMsg({ t: "error", m: e.message }); }
  };

  const exportAsImage = async () => {
    if (!defaultersRef.current) return;
    try {
      const canvas = await html2canvas(defaultersRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `LeetCode_Defaulters_${new Date().toISOString().slice(0,10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch { alert("Failed to export image"); }
  };

  const filtered = leaderboard.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.name || "").toLowerCase().includes(q) || (s.roll_number || "").toLowerCase().includes(q) || (s.leetcode_username || "").toLowerCase().includes(q);
  });

  const allDefaulters = defData
    ? [...(defData.defaulters || []), ...(defData.not_linked || [])]
    : [];

  return (
    <div style={S.container}>
      <div style={S.pageHeader}>
        <div style={S.headerIcon}><Code2 size={24} color="#f59e0b" /></div>
        <div>
          <h2 style={S.heading}>LeetCode Leaderboard</h2>
          <p style={S.subtext}>View student coding activity, sync data, and track progress</p>
        </div>
        <button onClick={handleSyncAll} disabled={syncing} style={S.syncAllBtn}>
          <RefreshCw size={15} style={syncing ? { animation: "spin 0.8s linear infinite" } : {}} />
          {syncing ? " Syncing All..." : " Sync All"}
        </button>
      </div>

      {msg && (
        <div style={{ ...S.msgBox, ...(msg.t === "error" ? S.msgError : S.msgSuccess) }}>
          {msg.t === "error" ? <X size={16} /> : <CheckCircle size={16} />}
          <span>{msg.m}</span>
          <button style={S.msgClose} onClick={() => setMsg(null)}><X size={14} /></button>
        </div>
      )}

      {/* Tab Switch */}
      <div style={S.tabRow}>
        <button style={{ ...S.tabBtn, ...(tab === "leaderboard" ? S.tabActive : {}) }}
          onClick={() => setTab("leaderboard")}>
          <Trophy size={15} /> Leaderboard
        </button>
        <button style={{ ...S.tabBtn, ...(tab === "defaulters" ? S.tabActiveRed : {}) }}
          onClick={() => setTab("defaulters")}>
          <AlertTriangle size={15} /> Contest Defaulters
          {defData && (defData.defaulters?.length || 0) + (defData.not_linked?.length || 0) > 0 && (
            <span style={S.tabBadge}>{(defData.defaulters?.length || 0) + (defData.not_linked?.length || 0)}</span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div style={S.filterBar}>
        <div style={S.filterGroup}>
          <select value={year} onChange={e => setYear(e.target.value)} style={S.select}>
            <option value="">All Years</option>
            {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>
          <select value={section} onChange={e => setSection(e.target.value)} style={S.select}>
            <option value="">All Sections</option>
            {["A","B","C","D"].map(s => <option key={s} value={s}>Section {s}</option>)}
          </select>
        </div>
        {tab === "leaderboard" && (
          <div style={S.searchBox}>
            <Search size={15} style={{ color: "var(--gray-400)" }} />
            <input type="text" placeholder="Search name, roll, username..." value={search}
              onChange={e => setSearch(e.target.value)} style={S.searchInput} />
          </div>
        )}
        {tab === "defaulters" && allDefaulters.length > 0 && (
          <button onClick={exportAsImage} style={S.exportBtn}>
            <ImageIcon size={15} /> Export as Image
          </button>
        )}
      </div>

      {/* Detail Modal */}
      {detail && (
        <div style={S.modalOverlay} onClick={() => setDetail(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h3 style={S.modalTitle}>
                <a href={`https://leetcode.com/u/${detail.leetcode_username}`} target="_blank" rel="noreferrer" style={{ color: "#f59e0b", textDecoration: "none" }}>
                  {detail.leetcode_username} <ExternalLink size={14} />
                </a>
              </h3>
              <span style={S.modalScore}>Score: {detail.activity_score}/100</span>
            </div>
            <div style={S.miniGrid}>
              <div style={S.miniStat}><span style={{color:"#16a34a", fontWeight:800}}>{detail.easy_solved}</span> Easy</div>
              <div style={S.miniStat}><span style={{color:"#d97706", fontWeight:800}}>{detail.medium_solved}</span> Medium</div>
              <div style={S.miniStat}><span style={{color:"#dc2626", fontWeight:800}}>{detail.hard_solved}</span> Hard</div>
              <div style={S.miniStat}><span style={{color:"#0369a1", fontWeight:800}}>{Math.round(detail.contest_rating)}</span> Rating</div>
            </div>
            {detail.contests && detail.contests.length > 0 && (
              <div style={S.tableWrap}>
                <table style={S.table}>
                  <thead><tr>
                    <th style={{...S.th, textAlign:"left"}}>Contest</th>
                    <th style={S.th}>Solved</th>
                    <th style={S.th}>Rank</th>
                  </tr></thead>
                  <tbody>
                    {detail.contests.slice(0, 15).map((c, i) => (
                      <tr key={i} style={S.tr}>
                        <td style={S.td}>{c.contest_title}</td>
                        <td style={S.tdCenter}>{c.problems_solved}/{c.total_problems}</td>
                        <td style={S.tdCenter}>#{c.ranking.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button onClick={() => setDetail(null)} style={S.closeBtn}>Close</button>
          </div>
        </div>
      )}

      {/* ═══════════ LEADERBOARD TAB ═══════════ */}
      {tab === "leaderboard" && (
        <>
          {loading ? (
            <div style={S.loadingBox}><div style={S.spinner} /><p style={S.loadingText}>Loading leaderboard...</p></div>
          ) : filtered.length === 0 ? (
            <div style={S.emptyBox}><Users size={40} color="var(--gray-300)" /><p style={S.emptyText}>No students with linked LeetCode accounts found.</p></div>
          ) : (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={{...S.th, textAlign:"left"}}>#</th>
                    <th style={{...S.th, textAlign:"left"}}>Student</th>
                    <th style={S.th}>Username</th>
                    <th style={S.th}>Total</th>
                    <th style={S.th}>Easy</th>
                    <th style={S.th}>Medium</th>
                    <th style={S.th}>Hard</th>
                    <th style={S.th}>Rating</th>
                    <th style={S.th}>Contests</th>
                    <th style={S.th}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.student_id} style={S.tr} onClick={() => openDetail(s.student_id)}>
                      <td style={S.td}>{i + 1}</td>
                      <td style={S.td}>
                        <strong>{s.name}</strong>
                        <div style={S.rollSm}>{s.roll_number} · Y{s.year}{s.section}</div>
                      </td>
                      <td style={S.tdCenter}>
                        <a href={`https://leetcode.com/u/${s.leetcode_username}`} target="_blank" rel="noreferrer" style={S.usernameLink} onClick={e => e.stopPropagation()}>
                          {s.leetcode_username}
                        </a>
                      </td>
                      <td style={{...S.tdCenter, fontWeight:700}}>{s.total_solved}</td>
                      <td style={{...S.tdCenter, color:"#16a34a", fontWeight:600}}>{s.easy_solved}</td>
                      <td style={{...S.tdCenter, color:"#d97706", fontWeight:600}}>{s.medium_solved}</td>
                      <td style={{...S.tdCenter, color:"#dc2626", fontWeight:600}}>{s.hard_solved}</td>
                      <td style={{...S.tdCenter, fontWeight:700}}>{Math.round(s.contest_rating)}</td>
                      <td style={S.tdCenter}>{s.contests_attended}</td>
                      <td style={S.tdCenter}>
                        <span style={{
                          ...S.scoreBadge,
                          color: s.activity_score >= 60 ? "#059669" : s.activity_score >= 30 ? "#d97706" : "#dc2626",
                          background: s.activity_score >= 60 ? "#ecfdf5" : s.activity_score >= 30 ? "#fffbeb" : "#fef2f2",
                        }}>{s.activity_score}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ═══════════ DEFAULTERS TAB ═══════════ */}
      {tab === "defaulters" && (
        <>
          {defLoading ? (
            <div style={S.loadingBox}><div style={S.spinner} /><p style={S.loadingText}>Loading defaulters...</p></div>
          ) : !defData || allDefaulters.length === 0 ? (
            <div style={S.emptyBox}>
              <CheckCircle size={40} color="#16a34a" />
              <p style={S.emptyText}>
                {defData?.contests_checked?.length === 0
                  ? "No contest data found. Sync students first to get contest history."
                  : "All students attended the recent contests!"}
              </p>
            </div>
          ) : (
            <div ref={defaultersRef}>
              {/* Exportable header */}
              <div style={S.defHeader}>
                <div style={S.defHeaderLeft}>
                  <AlertTriangle size={18} color="#dc2626" />
                  <h3 style={S.defTitle}>LeetCode Contest Defaulters Report</h3>
                </div>
                <span style={S.defDate}>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
              </div>

              {/* Contests checked */}
              <div style={S.defContestInfo}>
                <span style={S.defContestLabel}>Contests Checked:</span>
                {defData.contests_checked.map(c => (
                  <span key={c} style={S.contestTag}>{c}</span>
                ))}
              </div>

              {/* Stats row */}
              <div style={S.defStats}>
                <div style={S.defStatCard}>
                  <span style={S.defStatVal}>{defData.total_students || 0}</span>
                  <span style={S.defStatLabel}>Total Students</span>
                </div>
                <div style={S.defStatCard}>
                  <span style={{ ...S.defStatVal, color: "#059669" }}>{(defData.total_linked || 0) - (defData.defaulters?.length || 0)}</span>
                  <span style={S.defStatLabel}>Attended</span>
                </div>
                <div style={S.defStatCard}>
                  <span style={{ ...S.defStatVal, color: "#d97706" }}>{defData.defaulters?.length || 0}</span>
                  <span style={S.defStatLabel}>Missed (Linked)</span>
                </div>
                <div style={S.defStatCard}>
                  <span style={{ ...S.defStatVal, color: "#dc2626" }}>{defData.not_linked?.length || 0}</span>
                  <span style={S.defStatLabel}>Not Linked</span>
                </div>
              </div>

              {/* Defaulters Table */}
              {defData.defaulters?.length > 0 && (
                <>
                  <h4 style={S.sectionHead}><AlertTriangle size={14} color="#d97706" /> Linked but Missed Contests ({defData.defaulters.length})</h4>
                  <div style={S.tableWrap}>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          <th style={{...S.th, textAlign:"left"}}>#</th>
                          <th style={{...S.th, textAlign:"left"}}>Student</th>
                          <th style={S.th}>Username</th>
                          <th style={S.th}>Total Contests</th>
                          <th style={{...S.th, textAlign:"left"}}>Missed Contests</th>
                        </tr>
                      </thead>
                      <tbody>
                        {defData.defaulters.map((d, i) => (
                          <tr key={d.student_id} style={S.tr}>
                            <td style={S.td}>{i + 1}</td>
                            <td style={S.td}>
                              <strong>{d.name}</strong>
                              <div style={S.rollSm}>{d.roll_number} · Y{d.year}{d.section}</div>
                            </td>
                            <td style={S.tdCenter}>
                              <span style={S.usernameLink}>{d.leetcode_username}</span>
                            </td>
                            <td style={S.tdCenter}>{d.contests_attended}</td>
                            <td style={S.td}>
                              {d.missed_contests.map(c => (
                                <span key={c} style={S.missedTag}>{c}</span>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Not Linked Table */}
              {defData.not_linked?.length > 0 && (
                <>
                  <h4 style={{ ...S.sectionHead, marginTop: "1.2rem" }}><X size={14} color="#dc2626" /> LeetCode Not Linked ({defData.not_linked.length})</h4>
                  <div style={S.tableWrap}>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          <th style={{...S.th, textAlign:"left"}}>#</th>
                          <th style={{...S.th, textAlign:"left"}}>Student</th>
                          <th style={S.th}>Year</th>
                          <th style={S.th}>Section</th>
                        </tr>
                      </thead>
                      <tbody>
                        {defData.not_linked.map((d, i) => (
                          <tr key={d.student_id} style={S.tr}>
                            <td style={S.td}>{i + 1}</td>
                            <td style={S.td}>
                              <strong>{d.name}</strong>
                              <div style={S.rollSm}>{d.roll_number}</div>
                            </td>
                            <td style={S.tdCenter}>{d.year}</td>
                            <td style={S.tdCenter}>{d.section}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const S = {
  container: { maxWidth: 1050, margin: "2rem auto", padding: "0 1.5rem" },
  loadingBox: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 1rem", gap: "1rem" },
  spinner: { width: 40, height: 40, border: "3px solid var(--gray-200)", borderTop: "3px solid #f59e0b", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  loadingText: { color: "var(--gray-500)", fontSize: "0.9rem" },

  pageHeader: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" },
  headerIcon: { width: 52, height: 52, borderRadius: "var(--radius-lg)", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" },
  heading: { fontSize: "1.5rem", fontWeight: 800, color: "var(--gray-900)", letterSpacing: "-0.03em", margin: 0 },
  subtext: { fontSize: "0.9rem", color: "var(--gray-500)", margin: "0.15rem 0 0" },
  syncAllBtn: { marginLeft: "auto", padding: "0.55rem 1.1rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--white)", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", boxShadow: "var(--shadow-md)" },

  /* Tabs */
  tabRow: { display: "flex", gap: "0.4rem", marginBottom: "0.8rem" },
  tabBtn: { display: "flex", alignItems: "center", gap: 5, padding: "0.5rem 1.1rem", fontSize: "0.82rem", fontWeight: 700, border: "1px solid var(--gray-200)", borderRadius: 8, background: "var(--white)", color: "var(--gray-500)", cursor: "pointer", position: "relative" },
  tabActive: { background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" },
  tabActiveRed: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
  tabBadge: { fontSize: "0.68rem", fontWeight: 800, background: "#dc2626", color: "#fff", padding: "0.1rem 0.45rem", borderRadius: 999, marginLeft: 3 },

  msgBox: { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", fontSize: "0.88rem", fontWeight: 600, marginBottom: "1rem" },
  msgSuccess: { background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" },
  msgError: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
  msgClose: { marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 2 },

  filterBar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" },
  filterGroup: { display: "flex", gap: "0.5rem" },
  select: { padding: "0.45rem 0.7rem", fontSize: "0.85rem", border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius-md)", background: "var(--white)", color: "var(--gray-700)", fontWeight: 600 },
  searchBox: { display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.75rem", background: "var(--white)", border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius-md)", minWidth: 220 },
  searchInput: { border: "none", outline: "none", fontSize: "0.85rem", color: "var(--gray-700)", background: "transparent", flex: 1 },
  exportBtn: { display: "flex", alignItems: "center", gap: 5, padding: "0.5rem 1rem", fontSize: "0.82rem", fontWeight: 700, background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },

  tableWrap: { overflowX: "auto", borderRadius: "var(--radius-md)", border: "1px solid var(--gray-200)", background: "var(--white)", marginBottom: "0.5rem" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" },
  th: { textAlign: "center", padding: "0.65rem 0.75rem", background: "var(--gray-50)", fontSize: "0.72rem", fontWeight: 700, color: "var(--gray-600)", textTransform: "uppercase", borderBottom: "1px solid var(--gray-200)" },
  tr: { borderBottom: "1px solid var(--gray-100)", cursor: "pointer", transition: "background 0.15s" },
  td: { padding: "0.6rem 0.75rem" },
  tdCenter: { padding: "0.6rem 0.75rem", textAlign: "center" },
  rollSm: { fontSize: "0.72rem", color: "var(--gray-400)" },
  usernameLink: { color: "#f59e0b", fontWeight: 600, fontSize: "0.82rem", textDecoration: "none" },
  scoreBadge: { fontWeight: 800, fontSize: "0.85rem", padding: "0.2rem 0.55rem", borderRadius: "var(--radius-full)" },

  emptyBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", padding: "3rem", background: "var(--white)", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", textAlign: "center" },
  emptyText: { color: "var(--gray-500)", fontSize: "0.95rem" },

  /* Modal */
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" },
  modal: { background: "var(--white)", borderRadius: "var(--radius-lg)", padding: "1.5rem", width: "100%", maxWidth: 560, maxHeight: "80vh", overflowY: "auto", boxShadow: "var(--shadow-xl)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
  modalTitle: { fontSize: "1.1rem", fontWeight: 800, margin: 0 },
  modalScore: { fontSize: "0.88rem", fontWeight: 700, color: "#f59e0b", background: "#fef3c7", padding: "0.25rem 0.7rem", borderRadius: "var(--radius-full)" },
  miniGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", marginBottom: "1rem" },
  miniStat: { background: "var(--gray-50)", borderRadius: "var(--radius-md)", padding: "0.65rem", textAlign: "center", fontSize: "0.82rem", color: "var(--gray-600)" },
  closeBtn: { marginTop: "1rem", width: "100%", padding: "0.5rem", fontSize: "0.85rem", fontWeight: 600, background: "var(--gray-100)", color: "var(--gray-600)", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer" },

  /* Defaulters */
  defHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem", padding: "0.8rem 1rem", background: "#fef2f2", borderRadius: 10, border: "1px solid #fecaca" },
  defHeaderLeft: { display: "flex", alignItems: "center", gap: 6 },
  defTitle: { margin: 0, fontSize: "1rem", fontWeight: 800, color: "#991b1b" },
  defDate: { fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8" },
  defContestInfo: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: "0.8rem" },
  defContestLabel: { fontSize: "0.78rem", fontWeight: 700, color: "#64748b" },
  contestTag: { fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: 6, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" },
  defStats: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.6rem", marginBottom: "1rem" },
  defStatCard: { display: "flex", flexDirection: "column", alignItems: "center", padding: "0.7rem", background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb" },
  defStatVal: { fontSize: "1.3rem", fontWeight: 800, color: "#1e293b" },
  defStatLabel: { fontSize: "0.68rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", marginTop: 2 },
  sectionHead: { display: "flex", alignItems: "center", gap: 5, fontSize: "0.88rem", fontWeight: 800, color: "#1e293b", margin: "0 0 0.5rem" },
  missedTag: { display: "inline-block", fontSize: "0.68rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 5, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", marginRight: 4, marginBottom: 2 },
};
