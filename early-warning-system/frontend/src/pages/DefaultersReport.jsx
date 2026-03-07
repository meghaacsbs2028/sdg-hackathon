import { useState, useEffect } from "react";
import { fetchDefaulters } from "../services/api";
import {
  AlertTriangle, ShieldAlert, ShieldCheck, Shield,
  Users, TrendingDown, Calendar, RefreshCw, Loader2,
  ChevronUp, ChevronDown, Download, Search, SlidersHorizontal,
} from "lucide-react";

const RISK_CONFIG = {
  Red:     { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: <ShieldAlert size={14}/>, label: "High Risk" },
  Yellow:  { color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: <Shield size={14}/>, label: "Medium Risk" },
  Green:   { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", icon: <ShieldCheck size={14}/>, label: "Low Risk" },
  Unknown: { color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb", icon: <Shield size={14}/>, label: "No Data" },
};

function AttBar({ pct, threshold }) {
  const safeW = Math.max(0, Math.min(100, pct));
  const color = pct < 50 ? "#dc2626" : pct < 65 ? "#f97316" : "#d97706";
  return (
    <div style={{ position: "relative", width: "100%", minWidth: 130 }}>
      <div style={{ height: 8, background: "#f3f4f6", borderRadius: 99, overflow: "hidden", position: "relative" }}>
        <div style={{ height: "100%", width: `${safeW}%`, background: color, borderRadius: 99, transition: "width 0.5s ease" }} />
        {/* Threshold line */}
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${threshold}%`, width: 2, background: "#6b7280", borderRadius: 1 }} title={`Threshold: ${threshold}%`} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color }}>{pct}%</span>
        <span style={{ fontSize: "0.68rem", color: "#9ca3af" }}>{threshold}% min</span>
      </div>
    </div>
  );
}

export default function DefaultersReport() {
  const [threshold, setThreshold] = useState(75);
  const [inputThreshold, setInputThreshold] = useState("75");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("attendance_pct"); // asc by default
  const [sortDir, setSortDir] = useState("asc");
  const [filterRisk, setFilterRisk] = useState("all");

  const load = (t) => {
    setLoading(true);
    setError(null);
    fetchDefaulters(t)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(threshold); }, []);

  const applyThreshold = () => {
    const t = parseFloat(inputThreshold);
    if (isNaN(t) || t < 1 || t > 100) return;
    setThreshold(t);
    load(t);
  };

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ChevronUp size={13} color="#d1d5db" />;
    return sortDir === "asc" ? <ChevronUp size={13} color="var(--primary-600)" /> : <ChevronDown size={13} color="var(--primary-600)" />;
  };

  const displayed = (data?.defaulters || [])
    .filter(d => {
      if (filterRisk !== "all" && d.risk_level !== filterRisk) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return d.name?.toLowerCase().includes(q) || d.roll_number?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const va = a[sortBy] ?? 0;
      const vb = b[sortBy] ?? 0;
      const cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
      return sortDir === "asc" ? cmp : -cmp;
    });

  const handleExport = () => {
    if (!displayed.length) return;
    const headers = ["Roll No", "Name", "Year", "Section", "Attendance %", "Present Days", "Absent Days", "Total Days", "Days to Recover", "Risk Level", "Risk Score"];
    const rows = displayed.map(d => [
      d.roll_number, d.name, d.year || "", d.section || "",
      d.attendance_pct, d.present_days, d.absent_days, d.total_days,
      d.days_to_recover, d.risk_level, d.risk_score ?? "",
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `defaulters_report_${threshold}pct.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const criticalCount = (data?.defaulters || []).filter(d => d.attendance_pct < 50).length;
  const seriousCount  = (data?.defaulters || []).filter(d => d.attendance_pct >= 50 && d.attendance_pct < 65).length;
  const warningCount  = (data?.defaulters || []).filter(d => d.attendance_pct >= 65).length;

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.heading}><AlertTriangle size={22} color="#dc2626" style={{ marginRight: 8 }} />Defaulters Report</h2>
          <p style={s.subtitle}>Students below the minimum attendance threshold — sorted by worst attendance first</p>
        </div>
        <button onClick={handleExport} disabled={!displayed.length} style={s.exportBtn} title="Export to CSV">
          <Download size={16} style={{ marginRight: 5 }} /> Export CSV
        </button>
      </div>

      {/* Threshold Controls */}
      <div style={s.thresholdBar}>
        <SlidersHorizontal size={16} color="var(--primary-600)" />
        <label style={s.thresholdLabel}>Attendance Threshold:</label>
        <input
          type="number" min={1} max={100} value={inputThreshold}
          onChange={e => setInputThreshold(e.target.value)}
          onKeyDown={e => e.key === "Enter" && applyThreshold()}
          style={s.thresholdInput}
        />
        <span style={{ fontSize: "0.85rem", color: "var(--gray-500)" }}>%</span>
        <button onClick={applyThreshold} style={s.applyBtn}>
          {loading ? <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> : <RefreshCw size={14} />}
          Apply
        </button>
        <span style={s.thresholdInfo}>Students who attended less than <strong>{threshold}%</strong> of classes will appear here.</span>
      </div>

      {/* Summary Cards */}
      {data && (
        <div style={s.summaryRow}>
          <div style={{ ...s.summaryCard, borderLeft: "4px solid #dc2626" }}>
            <ShieldAlert size={22} color="#dc2626" />
            <div>
              <span style={s.summaryCount}>{data.total_defaulters}</span>
              <span style={s.summaryLabel}>Total Defaulters</span>
            </div>
          </div>
          <div style={{ ...s.summaryCard, borderLeft: "4px solid #7f1d1d" }}>
            <TrendingDown size={22} color="#7f1d1d" />
            <div>
              <span style={{ ...s.summaryCount, color: "#7f1d1d" }}>{criticalCount}</span>
              <span style={s.summaryLabel}>Critical (&lt;50%)</span>
            </div>
          </div>
          <div style={{ ...s.summaryCard, borderLeft: "4px solid #f97316" }}>
            <AlertTriangle size={22} color="#f97316" />
            <div>
              <span style={{ ...s.summaryCount, color: "#f97316" }}>{seriousCount}</span>
              <span style={s.summaryLabel}>Serious (50–65%)</span>
            </div>
          </div>
          <div style={{ ...s.summaryCard, borderLeft: "4px solid #d97706" }}>
            <Shield size={22} color="#d97706" />
            <div>
              <span style={{ ...s.summaryCount, color: "#d97706" }}>{warningCount}</span>
              <span style={s.summaryLabel}>Warning (65–{threshold}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters Row */}
      <div style={s.filtersRow}>
        <div style={s.searchBox}>
          <Search size={15} color="var(--gray-400)" style={{ marginRight: 6, flexShrink: 0 }} />
          <input type="text" placeholder="Search by name or roll number..." value={search}
            onChange={e => setSearch(e.target.value)} style={s.searchInput} />
        </div>
        <div style={s.riskFilters}>
          {["all", "Red", "Yellow", "Green"].map(r => (
            <button key={r} onClick={() => setFilterRisk(r)}
              style={{
                ...s.filterChip,
                background: filterRisk === r ? (r === "all" ? "var(--primary-600)" : RISK_CONFIG[r]?.bg || "var(--primary-600)") : "var(--white)",
                color: filterRisk === r ? (r === "all" ? "#fff" : RISK_CONFIG[r]?.color || "#fff") : "var(--gray-500)",
                border: `1.5px solid ${filterRisk === r ? (r === "all" ? "var(--primary-600)" : RISK_CONFIG[r]?.border || "var(--primary-600)") : "var(--gray-200)"}`,
                fontWeight: filterRisk === r ? 700 : 500,
              }}>
              {r === "all" ? "All Risk" : RISK_CONFIG[r]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={s.loadingBox}>
          <Loader2 size={30} color="var(--primary-500)" style={{ animation: "spin 0.8s linear infinite" }} />
          <span style={s.loadingText}>Generating defaulters report...</span>
        </div>
      ) : error ? (
        <div style={s.errorBox}><AlertTriangle size={32} color="#dc2626" /><p style={{ color: "#dc2626" }}>{error}</p></div>
      ) : data?.total_defaulters === 0 ? (
        <div style={s.emptyBox}>
          <ShieldCheck size={48} color="#059669" />
          <p style={{ color: "#059669", fontWeight: 700, fontSize: "1.1rem" }}>No Defaulters!</p>
          <p style={s.emptyText}>All students have attendance above {threshold}%.</p>
        </div>
      ) : displayed.length === 0 ? (
        <div style={s.emptyBox}>
          <Users size={40} color="var(--gray-300)" />
          <p style={s.emptyText}>No students match the current filters.</p>
        </div>
      ) : (
        <div style={s.tableWrapper}>
          <div style={s.tableHeader}>
            <span style={s.tableTitle}>{displayed.length} student{displayed.length !== 1 ? "s" : ""} found</span>
            <span style={s.tableHint}>Click column headers to sort</span>
          </div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={s.th} onClick={() => toggleSort("roll_number")}>
                  <span style={s.thInner}>Roll No. <SortIcon col="roll_number"/></span>
                </th>
                <th style={s.th}>Name</th>
                <th style={s.th} onClick={() => toggleSort("year")}>
                  <span style={s.thInner}>Year / Sec <SortIcon col="year"/></span>
                </th>
                <th style={{ ...s.th, minWidth: 175 }} onClick={() => toggleSort("attendance_pct")}>
                  <span style={s.thInner}>Attendance <SortIcon col="attendance_pct"/></span>
                </th>
                <th style={s.th} onClick={() => toggleSort("absent_days")}>
                  <span style={s.thInner}>Absent Days <SortIcon col="absent_days"/></span>
                </th>
                <th style={{ ...s.th, textAlign: "center" }} onClick={() => toggleSort("days_to_recover")}>
                  <span style={{ ...s.thInner, justifyContent: "center" }}>Days to Recover <SortIcon col="days_to_recover"/></span>
                </th>
                <th style={{ ...s.th, textAlign: "center" }} onClick={() => toggleSort("risk_score")}>
                  <span style={{ ...s.thInner, justifyContent: "center" }}>Risk Level <SortIcon col="risk_score"/></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((d, i) => {
                const rCfg = RISK_CONFIG[d.risk_level] || RISK_CONFIG.Unknown;
                const severity = d.attendance_pct < 50 ? { bg: "#fff1f2", left: "4px solid #dc2626" }
                  : d.attendance_pct < 65 ? { bg: "#fff7ed", left: "4px solid #f97316" }
                  : { bg: "#fffbeb", left: "4px solid #d97706" };
                return (
                  <tr key={d.student_id} style={{ ...s.tr, background: severity.bg, borderLeft: severity.left }}>
                    <td style={s.td}>{i + 1}</td>
                    <td style={{ ...s.td, fontWeight: 700, fontFamily: "monospace", fontSize: "0.85rem" }}>{d.roll_number}</td>
                    <td style={s.td}>
                      <div style={s.nameCell}>
                        <div style={{ ...s.avatar, background: rCfg.color }}>{d.name?.charAt(0)?.toUpperCase() || "?"}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--gray-800)" }}>{d.name}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--gray-400)" }}>{d.total_days} total days recorded</div>
                        </div>
                      </div>
                    </td>
                    <td style={s.td}>
                      <span style={s.yearBadge}>Yr {d.year || "?"}</span>
                      <span style={{ ...s.yearBadge, background: "var(--gray-100)", color: "var(--gray-600)", marginLeft: 4 }}>
                        Sec {d.section || "?"}
                      </span>
                    </td>
                    <td style={s.td}><AttBar pct={d.attendance_pct} threshold={threshold} /></td>
                    <td style={s.td}>
                      <span style={{ fontWeight: 700, color: "#dc2626", fontSize: "0.95rem" }}>{d.absent_days}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--gray-400)", marginLeft: 3 }}>days</span>
                    </td>
                    <td style={{ ...s.td, textAlign: "center" }}>
                      {d.days_to_recover > 0 ? (
                        <span style={{ fontWeight: 700, color: "#7c3aed", fontSize: "0.9rem",
                          background: "#f5f3ff", borderRadius: 8, padding: "0.2rem 0.6rem" }}>
                          {d.days_to_recover} days
                        </span>
                      ) : (
                        <span style={{ color: "var(--gray-400)", fontSize: "0.8rem" }}>0</span>
                      )}
                    </td>
                    <td style={{ ...s.td, textAlign: "center" }}>
                      <div style={{ alignItems: "center", gap: 5, justifyContent: "center",
                        background: rCfg.bg, border: `1px solid ${rCfg.border}`, borderRadius: 10,
                        padding: "0.25rem 0.7rem", display: "inline-flex" }}>
                        <span style={{ color: rCfg.color }}>{rCfg.icon}</span>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: rCfg.color }}>{rCfg.label}</span>
                        {d.risk_score != null && (
                          <span style={{ fontSize: "0.68rem", color: "var(--gray-400)" }}>({d.risk_score}%)</span>
                        )}
                      </div>
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

/* ── Styles ─────────────────────────────────────────────────────────────── */
const s = {
  container: { maxWidth: 1200, margin: "2rem auto", padding: "0 1.5rem" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" },
  heading: { fontSize: "1.6rem", fontWeight: 800, margin: 0, color: "var(--gray-900)", letterSpacing: "-0.03em", display: "flex", alignItems: "center" },
  subtitle: { fontSize: "0.85rem", color: "var(--gray-500)", marginTop: 4 },
  exportBtn: { display: "flex", alignItems: "center", padding: "0.55rem 1rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--white)", background: "linear-gradient(135deg, #059669, #047857)", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", boxShadow: "var(--shadow-sm)", opacity: 1 },

  thresholdBar: { display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1.25rem", background: "var(--white)", padding: "0.85rem 1.1rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" },
  thresholdLabel: { fontSize: "0.88rem", fontWeight: 600, color: "var(--gray-700)" },
  thresholdInput: { width: 60, padding: "0.3rem 0.5rem", border: "1.5px solid var(--primary-300)", borderRadius: 8, fontSize: "0.9rem", fontWeight: 700, color: "var(--primary-700)", textAlign: "center" },
  applyBtn: { display: "flex", alignItems: "center", gap: 5, padding: "0.35rem 0.85rem", background: "var(--primary-600)", color: "#fff", border: "none", borderRadius: 8, fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" },
  thresholdInfo: { fontSize: "0.78rem", color: "var(--gray-400)", marginLeft: "auto" },

  summaryRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" },
  summaryCard: { background: "var(--white)", borderRadius: "var(--radius-md)", padding: "0.9rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" },
  summaryCount: { fontSize: "1.6rem", fontWeight: 800, color: "#dc2626", display: "block", letterSpacing: "-0.02em" },
  summaryLabel: { fontSize: "0.75rem", color: "var(--gray-400)", display: "block", fontWeight: 500 },

  filtersRow: { display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" },
  searchBox: { flex: 1, minWidth: 220, display: "flex", alignItems: "center", background: "var(--white)", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-md)", padding: "0.5rem 0.75rem" },
  searchInput: { border: "none", outline: "none", flex: 1, fontSize: "0.85rem", color: "var(--gray-700)", background: "transparent" },
  riskFilters: { display: "flex", gap: "0.35rem", flexWrap: "wrap" },
  filterChip: { padding: "0.35rem 0.75rem", borderRadius: 20, fontSize: "0.78rem", cursor: "pointer", transition: "all 0.15s" },

  tableWrapper: { background: "var(--white)", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", overflow: "hidden" },
  tableHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.1rem", borderBottom: "1px solid var(--gray-100)", background: "var(--gray-50)" },
  tableTitle: { fontSize: "0.85rem", fontWeight: 700, color: "var(--gray-700)" },
  tableHint: { fontSize: "0.75rem", color: "var(--gray-400)" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "0.65rem 1rem", textAlign: "left", fontSize: "0.72rem", fontWeight: 700, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--gray-50)", borderBottom: "1px solid var(--gray-100)", cursor: "pointer", userSelect: "none" },
  thInner: { display: "flex", alignItems: "center", gap: 4 },
  tr: { borderBottom: "1px solid var(--gray-100)", transition: "filter 0.12s" },
  td: { padding: "0.8rem 1rem", fontSize: "0.87rem", color: "var(--gray-700)", verticalAlign: "middle" },
  nameCell: { display: "flex", alignItems: "center", gap: "0.55rem" },
  avatar: { width: 34, height: 34, borderRadius: "50%", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.82rem", flexShrink: 0 },
  yearBadge: { fontSize: "0.72rem", fontWeight: 700, background: "#eff6ff", color: "var(--primary-600)", borderRadius: 6, padding: "0.15rem 0.4rem" },

  loadingBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.8rem", padding: "4rem 2rem" },
  loadingText: { fontSize: "0.9rem", color: "var(--gray-500)" },
  emptyBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem", padding: "4rem 2rem" },
  emptyText: { fontSize: "0.9rem", color: "var(--gray-500)", textAlign: "center" },
  errorBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem", padding: "3rem 2rem" },
};
