import { useMemo, useState, useRef, useCallback } from "react";
import { format, subDays, getMonth } from "date-fns";

/* ═══════════════════════════════════════════════════════════════════════════════
   ATTENDANCE HEATMAP — Premium Level
   GitHub-style contribution grid with custom tooltips, month labels,
   summary stats, and polished micro-animations.
   ═══════════════════════════════════════════════════════════════════════════════ */

const STATUS_CONFIG = {
  Present: {
    color: "#10b981",
    glow: "rgba(16, 185, 129, 0.45)",
    label: "Present",
    icon: "✓",
  },
  Absent: {
    color: "#ef4444",
    glow: "rgba(239, 68, 68, 0.45)",
    label: "Absent",
    icon: "✕",
  },
  Late: {
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.45)",
    label: "Late",
    icon: "⏱",
  },
};

const EMPTY_COLOR = "rgba(148, 163, 184, 0.10)";
const DAY_LABELS = ["Sun", "", "Tue", "", "Thu", "", "Sat"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function AttendanceHeatmap({ history = [], days = 90 }) {
  const [tooltip, setTooltip] = useState(null);
  const gridRef = useRef(null);

  /* ── Date Grid ─────────────────────────────────────────────────────────── */
  const dateGrid = useMemo(() => {
    const today = new Date();
    return Array.from({ length: days }, (_, i) => subDays(today, days - 1 - i));
  }, [days]);

  /* ── Record Map (date → status) ────────────────────────────────────────── */
  const recordMap = useMemo(() => {
    const map = {};
    history.forEach((item) => {
      map[item.date] = item.status;
    });
    return map;
  }, [history]);

  /* ── Columns (weeks, Sun–Sat) ──────────────────────────────────────────── */
  const columns = useMemo(() => {
    if (!dateGrid.length) return [];
    const cols = [];
    let col = [];

    // Pad first column so Sunday = index 0
    const firstDow = dateGrid[0].getDay();
    for (let i = 0; i < firstDow; i++) col.push(null);

    dateGrid.forEach((d) => {
      col.push(d);
      if (col.length === 7) {
        cols.push(col);
        col = [];
      }
    });

    if (col.length) {
      while (col.length < 7) col.push(null);
      cols.push(col);
    }
    return cols;
  }, [dateGrid]);

  /* ── Month Labels ──────────────────────────────────────────────────────── */
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    columns.forEach((col, idx) => {
      const firstDate = col.find((d) => d !== null);
      if (firstDate) {
        const m = getMonth(firstDate);
        if (m !== lastMonth) {
          labels.push({ month: MONTH_NAMES[m], colIdx: idx });
          lastMonth = m;
        }
      }
    });
    return labels;
  }, [columns]);

  /* ── Summary Stats ─────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    let present = 0, absent = 0, late = 0, total = 0;
    dateGrid.forEach((d) => {
      const s = recordMap[format(d, "yyyy-MM-dd")];
      if (s) {
        total++;
        if (s === "Present") present++;
        else if (s === "Absent") absent++;
        else if (s === "Late") late++;
      }
    });
    const rate = total ? Math.round((present / total) * 100) : 0;
    return { present, absent, late, total, rate };
  }, [dateGrid, recordMap]);

  /* ── Tooltip Handlers ──────────────────────────────────────────────────── */
  const handleCellEnter = useCallback(
    (e, date) => {
      if (!date) return;
      const rect = gridRef.current.getBoundingClientRect();
      const cellRect = e.currentTarget.getBoundingClientRect();
      setTooltip({
        x: cellRect.left - rect.left + cellRect.width / 2,
        y: cellRect.top - rect.top - 6,
        date,
        status: recordMap[format(date, "yyyy-MM-dd")] || null,
      });
    },
    [recordMap]
  );
  const handleCellLeave = useCallback(() => setTooltip(null), []);

  /* ── Cell Color ────────────────────────────────────────────────────────── */
  const getCellColor = (status) =>
    STATUS_CONFIG[status]?.color || EMPTY_COLOR;

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div style={S.card}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={S.header}>
        <div>
          <h4 style={S.title}>
            <span style={S.titleIcon}>📊</span>
            Attendance Heatmap
          </h4>
          <p style={S.subtitle}>
            Last {days} days · {stats.total} records
          </p>
        </div>

        {/* Legend */}
        <div style={S.legend}>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} style={S.legendItem}>
              <span style={{ ...S.legendDot, background: cfg.color }} />
              {cfg.label}
            </div>
          ))}
          <div style={S.legendItem}>
            <span style={{ ...S.legendDot, background: EMPTY_COLOR, border: "1px solid var(--gray-300)" }} />
            No Record
          </div>
        </div>
      </div>

      {/* ── Stats Bar ──────────────────────────────────────────────────────── */}
      <div style={S.statsBar}>
        <StatPill label="Rate" value={`${stats.rate}%`} color="#10b981" />
        <StatPill label="Present" value={stats.present} color="#10b981" />
        <StatPill label="Late" value={stats.late} color="#f59e0b" />
        <StatPill label="Absent" value={stats.absent} color="#ef4444" />
      </div>

      {/* ── Heatmap Grid ───────────────────────────────────────────────────── */}
      <div style={S.gridWrapper} ref={gridRef}>
        {/* Month labels */}
        <div style={S.monthRow}>
          <div style={S.dayLabelCol} /> {/* spacer for day labels */}
          {columns.map((_, idx) => {
            const label = monthLabels.find((l) => l.colIdx === idx);
            return (
              <div key={idx} style={S.monthCell}>
                {label ? <span style={S.monthText}>{label.month}</span> : null}
              </div>
            );
          })}
        </div>

        <div style={S.heatmapScroll}>
          <div style={S.heatmapBody}>
            {/* Day labels */}
            <div style={S.dayLabelCol}>
              {DAY_LABELS.map((l, i) => (
                <span key={i} style={S.dayLabel}>
                  {l}
                </span>
              ))}
            </div>

            {/* Cells */}
            {columns.map((col, colIdx) => (
              <div key={colIdx} style={S.column}>
                {col.map((date, rowIdx) => {
                  if (!date)
                    return <div key={rowIdx} style={S.emptyCell} />;
                  const dateStr = format(date, "yyyy-MM-dd");
                  const status = recordMap[dateStr];
                  const bg = getCellColor(status);
                  const animDelay = `${colIdx * 12 + rowIdx * 18}ms`;

                  return (
                    <div
                      key={dateStr}
                      style={{
                        ...S.cell,
                        background: bg,
                        animationDelay: animDelay,
                      }}
                      onMouseEnter={(e) => handleCellEnter(e, date)}
                      onMouseLeave={handleCellLeave}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Custom Tooltip */}
        {tooltip && (
          <div
            style={{
              ...S.tooltip,
              left: tooltip.x,
              top: tooltip.y,
            }}
          >
            <div style={S.tooltipDate}>
              {format(tooltip.date, "EEE, MMM d, yyyy")}
            </div>
            <div
              style={{
                ...S.tooltipStatus,
                color: STATUS_CONFIG[tooltip.status]?.color || "var(--gray-400)",
              }}
            >
              {STATUS_CONFIG[tooltip.status]?.icon || "—"}{" "}
              {STATUS_CONFIG[tooltip.status]?.label || "No Record"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════ Stat Pill Sub-component ═══════════════════════════════ */
function StatPill({ label, value, color }) {
  return (
    <div style={S.statPill}>
      <span style={{ ...S.statValue, color }}>{value}</span>
      <span style={S.statLabel}>{label}</span>
    </div>
  );
}

/* ═══════════════════ Styles ═══════════════════════════════════════════════ */
const S = {
  /* ── Card ──────────────────────────────────────────────────────────────── */
  card: {
    padding: "1.5rem",
    background: "var(--white)",
    borderRadius: "var(--radius-xl)",
    boxShadow: "var(--shadow-lg)",
    border: "1px solid var(--gray-200)",
    position: "relative",
    overflow: "hidden",
  },

  /* ── Header ────────────────────────────────────────────────────────────── */
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "0.75rem",
    marginBottom: "1rem",
  },
  title: {
    margin: 0,
    fontSize: "1.1rem",
    fontWeight: 800,
    color: "var(--gray-900)",
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    letterSpacing: "-0.02em",
  },
  titleIcon: {
    fontSize: "1.15rem",
  },
  subtitle: {
    margin: "0.2rem 0 0",
    fontSize: "0.78rem",
    color: "var(--gray-400)",
    fontWeight: 500,
  },

  /* ── Legend ─────────────────────────────────────────────────────────────── */
  legend: {
    display: "flex",
    gap: "0.85rem",
    fontSize: "0.72rem",
    color: "var(--gray-500)",
    fontWeight: 600,
    flexWrap: "wrap",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.3rem",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    display: "inline-block",
    flexShrink: 0,
  },

  /* ── Stats Bar ─────────────────────────────────────────────────────────── */
  statsBar: {
    display: "flex",
    gap: "0.6rem",
    marginBottom: "1.15rem",
    flexWrap: "wrap",
  },
  statPill: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0.45rem 0.9rem",
    borderRadius: "var(--radius-md)",
    background: "var(--gray-50)",
    border: "1px solid var(--gray-100)",
    minWidth: 60,
  },
  statValue: {
    fontSize: "1.05rem",
    fontWeight: 800,
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: "0.65rem",
    fontWeight: 600,
    color: "var(--gray-400)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },

  /* ── Grid Wrapper ──────────────────────────────────────────────────────── */
  gridWrapper: {
    position: "relative",
  },

  /* ── Month Row ─────────────────────────────────────────────────────────── */
  monthRow: {
    display: "flex",
    gap: "3px",
    marginBottom: "2px",
    paddingLeft: 0,
  },
  monthCell: {
    width: 14,
    flexShrink: 0,
    textAlign: "left",
  },
  monthText: {
    fontSize: "0.62rem",
    fontWeight: 700,
    color: "var(--gray-400)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
  },

  /* ── Heatmap Body ──────────────────────────────────────────────────────── */
  heatmapScroll: {
    overflowX: "auto",
    paddingBottom: "0.35rem",
  },
  heatmapBody: {
    display: "flex",
    gap: "3px",
  },

  /* ── Day Labels ────────────────────────────────────────────────────────── */
  dayLabelCol: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    marginRight: "0.35rem",
    flexShrink: 0,
    width: 28,
  },
  dayLabel: {
    fontSize: "0.62rem",
    fontWeight: 600,
    color: "var(--gray-400)",
    height: 14,
    lineHeight: "14px",
    userSelect: "none",
  },

  /* ── Columns & Cells ───────────────────────────────────────────────────── */
  column: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  cell: {
    width: 14,
    height: 14,
    borderRadius: 3,
    cursor: "pointer",
    transition: "transform 0.15s cubic-bezier(.4,0,.2,1), box-shadow 0.15s cubic-bezier(.4,0,.2,1), filter 0.15s",
    animation: "heatCellPop 0.35s cubic-bezier(.34,1.56,.64,1) both",
    /* hover is managed inline via onMouseEnter glow */
  },
  emptyCell: {
    width: 14,
    height: 14,
    background: "transparent",
  },

  /* ── Tooltip ───────────────────────────────────────────────────────────── */
  tooltip: {
    position: "absolute",
    transform: "translate(-50%, -100%)",
    background: "var(--gray-900)",
    color: "#fff",
    padding: "0.5rem 0.7rem",
    borderRadius: "var(--radius-md)",
    pointerEvents: "none",
    zIndex: 50,
    whiteSpace: "nowrap",
    boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
    animation: "fadeInUp 0.18s ease-out",
    backdropFilter: "blur(6px)",
  },
  tooltipDate: {
    fontSize: "0.72rem",
    fontWeight: 700,
    marginBottom: "0.15rem",
    opacity: 0.92,
  },
  tooltipStatus: {
    fontSize: "0.78rem",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    gap: "0.3rem",
  },
};
