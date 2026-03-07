import { useState, useEffect } from "react";
import { fetchAnalyticsSummary } from "../services/api";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area,
} from "recharts";
import {
  Users, AlertTriangle, ShieldCheck, TrendingUp,
  Trophy, Code2, Activity, GraduationCap,
  Loader2, ArrowUpRight, Zap, Eye,
  ChevronRight, Sparkles,
} from "lucide-react";

/* ━━━━━━━━━━━━━━━━━━━━━━━ COLOR SYSTEM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const C = {
  bg: "#f7f8fa",
  surface: "#eef0f4",
  card: "#ffffff",
  cardHover: "#f9fafb",
  border: "#e5e7eb",
  borderLight: "#d1d5db",
  text: "#1e293b",
  textMuted: "#64748b",
  textDim: "#94a3b8",
  // Vibrant accents
  cyan: "#0891b2",
  cyanDim: "rgba(8,145,178,0.08)",
  violet: "#7c3aed",
  violetDim: "rgba(124,58,237,0.08)",
  rose: "#e11d48",
  roseDim: "rgba(225,29,72,0.06)",
  amber: "#d97706",
  amberDim: "rgba(217,119,6,0.07)",
  emerald: "#059669",
  emeraldDim: "rgba(5,150,105,0.07)",
  blue: "#2563eb",
  blueDim: "rgba(37,99,235,0.07)",
};

const RISK = { Green: C.emerald, Yellow: C.amber, Red: C.rose };

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━ COMPONENT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsSummary()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!data) return <p style={{ padding: "3rem", color: C.textMuted }}>Failed to load analytics.</p>;

  const rd = data.risk_distribution || {};
  const fa = data.feature_averages || {};
  const atRisk = data.at_risk_students || [];
  const deptRisk = data.department_risk || [];
  const total = data.total_students || 0;
  const totalAtRisk = (rd.Red || 0) + (rd.Yellow || 0);
  const safePercent = total > 0 ? Math.round((rd.Green || 0) / total * 100) : 0;

  const riskPie = [
    { name: "Safe", value: rd.Green || 0, color: C.emerald },
    { name: "Warning", value: rd.Yellow || 0, color: C.amber },
    { name: "Critical", value: rd.Red || 0, color: C.rose },
  ].filter(d => d.value > 0);

  const featureBars = [
    { name: "Attendance", val: fa.attendance || 0, color: C.emerald },
    { name: "Marks", val: fa.internal_marks || 0, color: C.blue },
    { name: "Assignments", val: fa.assignment_score || 0, color: C.violet },
    { name: "LMS Activity", val: fa.lms_activity || 0, color: C.cyan },
    { name: "Competitions", val: fa.competition_score || 0, color: C.amber },
  ];

  return (
    <div style={S.page}>
      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <div style={S.hero}>
        <div style={S.heroGlow} />
        <div style={S.heroContent}>
          <div style={S.heroText}>
            <div style={S.heroBadge}>
              <Sparkles size={13} />
              <span>AI-Powered Analytics</span>
            </div>
            <h1 style={S.heroTitle}>Admin Command Center</h1>
            <p style={S.heroSub}>Monitor student risk, track performance metrics, and take action.</p>
          </div>
          <div style={S.heroStats}>
            <HeroStat value={total} label="Students" icon={<Users size={18} />} color={C.cyan} />
            <div style={S.heroDivider} />
            <HeroStat value={safePercent + "%"} label="Safe Rate" icon={<ShieldCheck size={18} />} color={C.emerald} />
            <div style={S.heroDivider} />
            <HeroStat value={totalAtRisk} label="Need Help" icon={<AlertTriangle size={18} />} color={C.rose} />
          </div>
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────────────────── */}
      <div style={S.statsRow}>
        <StatCard icon={<ShieldCheck size={20} />} label="Safe" value={rd.Green || 0} color={C.emerald} bg={C.emeraldDim} />
        <StatCard icon={<AlertTriangle size={20} />} label="Warning" value={rd.Yellow || 0} color={C.amber} bg={C.amberDim} />
        <StatCard icon={<Zap size={20} />} label="Critical" value={rd.Red || 0} color={C.rose} bg={C.roseDim} />
        <StatCard icon={<Trophy size={20} />} label="Competitions" value={data.approved_competitions || 0} color={C.violet} bg={C.violetDim} sub={`${data.total_competitions || 0} total`} />
        <StatCard icon={<Code2 size={20} />} label="LeetCode" value={data.linked_leetcode || 0} color={C.cyan} bg={C.cyanDim} sub="linked" />
      </div>

      {/* ── Charts Grid ─────────────────────────────────────────────── */}
      <div style={S.chartsGrid}>
        {/* Risk Donut */}
        <div style={S.chartCard}>
          <ChartHead title="Risk Distribution" icon={<Activity size={16} />} />
          <div style={S.chartInner}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={riskPie}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {riskPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={S.tooltip}
                  itemStyle={{ color: C.text, fontWeight: 700, fontSize: "0.82rem" }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div style={S.donutCenter}>
              <span style={S.donutVal}>{total}</span>
              <span style={S.donutLabel}>Total</span>
            </div>
            {/* Legend */}
            <div style={S.legend}>
              {riskPie.map(d => (
                <div key={d.name} style={S.legendItem}>
                  <span style={{ ...S.legendDot, background: d.color }} />
                  <span style={S.legendText}>{d.name}</span>
                  <span style={S.legendVal}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Averages */}
        <div style={S.chartCard}>
          <ChartHead title="Performance Metrics" icon={<TrendingUp size={16} />} />
          <div style={S.chartInner}>
            <div style={S.metricBars}>
              {featureBars.map(f => (
                <div key={f.name} style={S.metricRow}>
                  <div style={S.metricInfo}>
                    <span style={S.metricName}>{f.name}</span>
                    <span style={{ ...S.metricVal, color: f.color }}>{f.val}</span>
                  </div>
                  <div style={S.barTrack}>
                    <div style={{ ...S.barFill, width: `${f.val}%`, background: `linear-gradient(90deg, ${f.color}88, ${f.color})` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Section ──────────────────────────────────────────── */}
      <div style={S.bottomGrid}>
        {/* Department Chart */}
        {deptRisk.length > 0 && (
          <div style={S.chartCard}>
            <ChartHead title="Department Overview" icon={<GraduationCap size={16} />} />
            <div style={{ ...S.chartInner, padding: "0.5rem 0.8rem 0.8rem" }}>
              <ResponsiveContainer width="100%" height={Math.max(180, deptRisk.length * 52)}>
                <BarChart data={deptRisk} layout="vertical" barSize={14} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: C.textDim }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category" dataKey="department" width={55}
                    tick={{ fontSize: 12, fill: C.textMuted, fontWeight: 700 }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip contentStyle={S.tooltip} />
                  <Legend iconType="circle" iconSize={8}
                    wrapperStyle={{ fontSize: "0.72rem", fontWeight: 600, color: C.textMuted, paddingTop: 8 }}
                  />
                  <Bar dataKey="green" stackId="s" fill={C.emerald} name="Safe" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="yellow" stackId="s" fill={C.amber} name="Warning" />
                  <Bar dataKey="red" stackId="s" fill={C.rose} name="Critical" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* At-Risk Students */}
        <div style={S.chartCard}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.1rem 0" }}>
            <ChartHead title="Students At Risk" icon={<AlertTriangle size={16} color={C.rose} />} />
            <span style={S.countBadge}>{atRisk.length}</span>
          </div>
          <div style={S.riskList}>
            {atRisk.length === 0 ? (
              <div style={S.emptyState}>
                <ShieldCheck size={36} color={C.emerald} style={{ opacity: 0.7 }} />
                <p style={{ color: C.textMuted, fontSize: "0.85rem" }}>All clear — no students at risk</p>
              </div>
            ) : (
              atRisk.slice(0, 8).map((s, i) => (
                <div key={s.id} style={S.riskItem}>
                  <div style={{ ...S.rankCircle, borderColor: s.risk_level === "Red" ? C.rose : C.amber }}>
                    {i + 1}
                  </div>
                  <div style={S.riskName}>
                    <span style={S.riskNameText}>{s.name}</span>
                    <span style={S.riskSub}>{s.roll_number} · {s.department} · Y{s.year}</span>
                  </div>
                  <div style={S.riskRight}>
                    <div style={{
                      ...S.riskPercent,
                      color: s.risk_level === "Red" ? C.rose : C.amber,
                      background: s.risk_level === "Red" ? C.roseDim : C.amberDim,
                    }}>
                      <ArrowUpRight size={11} />
                      {Math.round(s.risk_score * 100)}%
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity: 0.35 } 50% { opacity: 0.7 } }
        @keyframes shimmer { to { background-position: -200% 0 } }
      `}</style>
    </div>
  );
}

/* ── Sub-Components ─────────────────────────────────────────────────────── */
function Loader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh", background: "transparent" }}>
      <Loader2 size={32} color={C.cyan} style={{ animation: "spin 1s linear infinite" }} />
    </div>
  );
}

function HeroStat({ value, label, icon, color }) {
  return (
    <div style={S.heroStat}>
      <span style={{ color, opacity: 0.8 }}>{icon}</span>
      <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff" }}>{value}</span>
      <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
    </div>
  );
}

function StatCard({ icon, label, value, color, bg, sub }) {
  return (
    <div style={S.statCard}>
      <div style={{ ...S.statIcon, background: bg, color }}>{icon}</div>
      <div style={S.statInfo}>
        <span style={S.statVal}>{value}</span>
        <span style={S.statLabel}>{label}</span>
        {sub && <span style={{ fontSize: "0.65rem", color: C.textDim, fontWeight: 500 }}>{sub}</span>}
      </div>
    </div>
  );
}

function ChartHead({ title, icon }) {
  return (
    <div style={S.chartHead}>
      <span style={{ color: C.blue, opacity: 0.9 }}>{icon}</span>
      <h3 style={S.chartTitle}>{title}</h3>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━ STYLES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const S = {
  page: {
    background: C.bg,
    minHeight: "100vh",
    padding: "0 1.5rem 2rem",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    color: C.text,
  },

  /* Hero */
  hero: {
    position: "relative",
    background: "linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #4338ca 100%)",
    borderRadius: 20,
    padding: "2rem 2.2rem",
    marginBottom: "1.2rem",
    overflow: "hidden",
    border: `1px solid ${C.border}`,
  },
  heroGlow: {
    position: "absolute",
    top: -60, right: -60,
    width: 200, height: 200,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)",
    animation: "pulse 4s ease-in-out infinite",
    pointerEvents: "none",
  },
  heroContent: { position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.5rem" },
  heroText: { flex: 1, minWidth: 250 },
  heroBadge: {
    display: "inline-flex", alignItems: "center", gap: 5,
    background: "rgba(255,255,255,0.15)", color: "#fff",
    fontSize: "0.7rem", fontWeight: 700, padding: "0.3rem 0.7rem",
    borderRadius: 999, border: "1px solid rgba(255,255,255,0.25)",
    marginBottom: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em",
  },
  heroTitle: { fontSize: "1.7rem", fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.03em" },
  heroSub: { fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", marginTop: "0.35rem", fontWeight: 400, lineHeight: 1.5 },
  heroStats: { display: "flex", alignItems: "center", gap: "1.5rem" },
  heroStat: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem" },
  heroDivider: { width: 1, height: 40, background: "rgba(255,255,255,0.2)" },

  /* Stats */
  statsRow: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.7rem", marginBottom: "1rem" },
  statCard: {
    display: "flex", alignItems: "center", gap: "0.65rem",
    background: C.card, borderRadius: 14, padding: "0.85rem 1rem",
    border: `1px solid ${C.border}`,
    transition: "all 0.2s ease",
  },
  statIcon: { width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  statInfo: { display: "flex", flexDirection: "column" },
  statVal: { fontSize: "1.3rem", fontWeight: 800, color: C.text, lineHeight: 1 },
  statLabel: { fontSize: "0.7rem", fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 },

  /* Charts */
  chartsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem", marginBottom: "0.8rem" },
  bottomGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" },
  chartCard: {
    background: C.card, borderRadius: 16,
    border: `1px solid ${C.border}`,
    overflow: "hidden",
  },
  chartHead: { display: "flex", alignItems: "center", gap: "0.45rem", padding: "1rem 1.1rem 0" },
  chartTitle: { fontSize: "0.88rem", fontWeight: 700, color: C.text, margin: 0 },
  chartInner: { padding: "0.6rem 0.8rem 1rem", position: "relative" },

  /* Donut */
  donutCenter: {
    position: "absolute", top: "calc(50% - 38px)", left: "50%", transform: "translate(-50%, -50%)",
    display: "flex", flexDirection: "column", alignItems: "center",
  },
  donutVal: { fontSize: "1.6rem", fontWeight: 800, color: C.text },
  donutLabel: { fontSize: "0.68rem", fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" },
  legend: { display: "flex", justifyContent: "center", gap: "1.2rem", marginTop: "0.2rem" },
  legendItem: { display: "flex", alignItems: "center", gap: "0.3rem" },
  legendDot: { width: 8, height: 8, borderRadius: "50%" },
  legendText: { fontSize: "0.75rem", fontWeight: 600, color: C.textMuted },
  legendVal: { fontSize: "0.75rem", fontWeight: 800, color: C.text },

  /* Metric Bars */
  metricBars: { display: "flex", flexDirection: "column", gap: "0.9rem", padding: "0.5rem 0.3rem 0" },
  metricRow: { display: "flex", flexDirection: "column", gap: "0.3rem" },
  metricInfo: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  metricName: { fontSize: "0.78rem", fontWeight: 600, color: C.textMuted },
  metricVal: { fontSize: "0.82rem", fontWeight: 800 },
  barTrack: { height: 8, borderRadius: 4, background: C.surface, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4, transition: "width 0.8s ease" },

  /* Tooltip */
  tooltip: {
    background: "#fff", borderRadius: 10,
    border: `1px solid ${C.border}`,
    fontSize: "0.8rem", fontWeight: 600,
    color: C.text, boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  },

  /* Risk List */
  countBadge: {
    fontSize: "0.7rem", fontWeight: 800, color: C.rose,
    background: C.roseDim, padding: "0.2rem 0.6rem",
    borderRadius: 999, border: `1px solid rgba(251,113,133,0.2)`,
  },
  riskList: { padding: "0.6rem 0.8rem 0.8rem", maxHeight: 340, overflowY: "auto" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem", padding: "3rem 1rem" },
  riskItem: {
    display: "flex", alignItems: "center", gap: "0.6rem",
    padding: "0.55rem 0.5rem", borderRadius: 10,
    transition: "background 0.15s",
    borderBottom: `1px solid ${C.border}`,
  },
  rankCircle: {
    width: 26, height: 26, borderRadius: "50%",
    border: "2px solid", display: "flex",
    alignItems: "center", justifyContent: "center",
    fontSize: "0.7rem", fontWeight: 800, color: C.text,
    flexShrink: 0,
  },
  riskName: { display: "flex", flexDirection: "column", flex: 1, minWidth: 0 },
  riskNameText: { fontSize: "0.82rem", fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  riskSub: { fontSize: "0.68rem", color: C.textDim, fontWeight: 500 },
  riskRight: { flexShrink: 0 },
  riskPercent: {
    display: "flex", alignItems: "center", gap: 2,
    fontSize: "0.75rem", fontWeight: 800,
    padding: "0.2rem 0.5rem", borderRadius: 999,
  },
};
