import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAttendance, saveAttendance, fetchAttendanceHistory } from "../services/api";
import {
  CalendarDays, CheckCircle2, XCircle, Clock, Save, Loader2,
  Users, ChevronLeft, ChevronRight, AlertTriangle, ShieldCheck,
  ShieldAlert, BookOpen, GraduationCap, LayoutGrid, ArrowRight, TrendingDown, Download, Edit3, Calendar, Sparkles,
} from "lucide-react";

/* ── Status config ──────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  Present: { icon: <CheckCircle2 size={16} />, color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", label: "Present" },
  Absent:  { icon: <XCircle size={16} />,      color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "Absent" },
  Late:    { icon: <Clock size={16} />,         color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "Late" },
};
const riskColors = { Green: "#059669", Yellow: "#d97706", Red: "#dc2626" };

/* ── Date helpers (no UTC drift) ─────────────────────────────────────────── */
function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function shiftDate(iso, delta) {
  const [y,m,d] = iso.split("-").map(Number);
  const nd = new Date(y, m-1, d+delta);
  return `${nd.getFullYear()}-${String(nd.getMonth()+1).padStart(2,"0")}-${String(nd.getDate()).padStart(2,"0")}`;
}
function prettyDate(iso) {
  const [y,m,d] = iso.split("-").map(Number);
  return new Date(y,m-1,d).toLocaleDateString("en-IN",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
}

/* ── Step Indicator ──────────────────────────────────────────────────────── */
function Step({ num, label, done, active }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <div style={{
        width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
        fontWeight:800, fontSize:"0.8rem",
        background: done ? "#059669" : active ? "var(--primary-600)" : "var(--gray-200)",
        color: done||active ? "#fff" : "var(--gray-400)",
        transition:"all 0.2s",
      }}>
        {done ? <CheckCircle2 size={14} /> : num}
      </div>
      <span style={{ fontSize:"0.82rem", fontWeight:600, color: active ? "var(--primary-700)" : done ? "#059669" : "var(--gray-400)" }}>
        {label}
      </span>
    </div>
  );
}

export default function Attendance() {
  const [date, setDate] = useState(todayString());

  // All students from API
  const [allStudents, setAllStudents] = useState(null);
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });

  // Step selections
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  // Reload when date changes
  useEffect(() => {
    setLoading(true);
    setSaveResult(null);
    setSelectedYear(null);
    setSelectedSection(null);
    fetchAttendance(date)
      .then(res => {
        setAllStudents(res);
        const map = {};
        res.students.forEach(s => { map[s.student_id] = s.status || null; });
        setStatuses(map);
      })
      .catch(() => setAllStudents(null))
      .finally(() => setLoading(false));
  }, [date]);

  // Derive available years from all students
  const availableYears = useMemo(() => {
    if (!allStudents) return [];
    const years = [...new Set(allStudents.students.map(s => s.year).filter(Boolean))].sort((a,b)=>a-b);
    return years;
  }, [allStudents]);

  // Derive available sections for selected year
  const availableSections = useMemo(() => {
    if (!allStudents || !selectedYear) return [];
    const secs = [...new Set(
      allStudents.students
        .filter(s => s.year === selectedYear)
        .map(s => s.section)
        .filter(Boolean)
    )].sort();
    return secs;
  }, [allStudents, selectedYear]);

  // Students to display
  const displayStudents = useMemo(() => {
    if (!allStudents || !selectedYear || !selectedSection) return [];
    return allStudents.students.filter(s => s.year === selectedYear && s.section === selectedSection)
      .sort((a,b) => (a.roll_number||"").localeCompare(b.roll_number||""));
  }, [allStudents, selectedYear, selectedSection]);

  const step = !selectedYear ? 1 : !selectedSection ? 2 : 3;

  // Animation state
  const [animatingId, setAnimatingId] = useState(null);
  const animTimer = useRef(null);

  const toggleStatus = (id, st) => {
    setStatuses(p => ({ ...p, [id]: p[id]===st ? null : st }));
    // Trigger animation
    if (animTimer.current) clearTimeout(animTimer.current);
    setAnimatingId(`${id}-${st}`);
    animTimer.current = setTimeout(() => setAnimatingId(null), 600);
  };
  const markAll = (st) => { const m={...statuses}; displayStudents.forEach(s=>{ m[s.student_id]=st; }); setStatuses(m); };

  const markedInView = displayStudents.filter(s => statuses[s.student_id]).length;
  const presentInView = displayStudents.filter(s => statuses[s.student_id]==="Present"||statuses[s.student_id]==="Late").length;
  const absentInView = displayStudents.filter(s => statuses[s.student_id]==="Absent").length;

  // Detect editing mode: records already exist for this date
  const isEditing = markedInView > 0 && !saveResult;

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    const records = displayStudents
      .filter(s => statuses[s.student_id])
      .map(s => ({ student_id: s.student_id, status: statuses[s.student_id] }));
    try {
      const result = await saveAttendance(date, records);
      setSaveResult(result);
      const res = await fetchAttendance(date);
      setAllStudents(res);
      const map = {};
      res.students.forEach(s => { map[s.student_id] = s.status || null; });
      setStatuses(map);
    } catch(err) {
      setSaveResult({ error: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!selectedYear || !selectedSection) return;
    setExporting(true);
    try {
      const hist = await fetchAttendanceHistory({ year: selectedYear, section: selectedSection });
      const { dates, students } = hist;
      if (!students.length) { setExporting(false); return; }

      // Build CSV: header row = Roll No, Name, Year, Sec, date1, date2..., Present, Absent, Total, %
      const header = ["Roll No", "Name", "Year", "Section", ...dates, "Present Days", "Absent Days", "Total Days", "Attendance %"];
      const rows = students.map(st => [
        st.roll_number, st.name, st.year, st.section,
        ...dates.map(d => st.daily[d] || "—"),
        st.present_days, st.absent_days, st.total_days, st.attendance_pct + "%",
      ]);

      const csvContent = [header, ...rows]
        .map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_Y${selectedYear}_Sec${selectedSection}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const navigate = useNavigate();

  // derive role-based defaulters path from current URL
  const role = window.location.pathname.split("/")[1]; // "admin" | "hod" | "faculty"

  return (
    <div style={s.container}>
      {/* Page Header */}
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.heading}><CalendarDays size={22} style={{marginRight:8}} />Daily Attendance</h2>
          <p style={s.subtitle}>Select a year and section to mark attendance — risk predictions update automatically</p>
        </div>
        <button
          onClick={() => navigate(`/${role}/defaulters`)}
          style={s.defaultersBtn}
          title="View Defaulters Report"
        >
          <TrendingDown size={16} style={{ marginRight: 6 }} />
          Defaulters Report
        </button>
      </div>

      {/* Date Bar */}
      <div style={s.dateBar}>
        <button onClick={() => setDate(d => shiftDate(d,-1))} style={s.dateBtn}><ChevronLeft size={20}/></button>
        <div style={s.dateCenter}>
          <span style={s.prettyDate}>{prettyDate(date)}</span>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={s.dateInput}/>
        </div>
        <button onClick={() => setDate(d => shiftDate(d,1))} style={s.dateBtn}><ChevronRight size={20}/></button>
      </div>

      {/* Step Progress */}
      <div style={s.stepBar}>
        <Step num={1} label="Select Year" done={step>1} active={step===1}/>
        <ArrowRight size={14} color="var(--gray-300)" />
        <Step num={2} label="Select Section" done={step>2} active={step===2}/>
        <ArrowRight size={14} color="var(--gray-300)" />
        <Step num={3} label="Mark Attendance" done={false} active={step===3}/>
      </div>

      {loading ? (
        <div style={s.loadingBox}>
          <Loader2 size={28} color="var(--primary-500)" style={{animation:"spin 0.8s linear infinite"}}/>
          <span style={s.loadingText}>Loading students for {prettyDate(date)}...</span>
        </div>
      ) : !allStudents ? (
        <div style={s.emptyBox}><AlertTriangle size={36} color="#fbbf24"/><p style={s.emptyText}>Failed to load. Is the backend running?</p></div>
      ) : (
        <>
          {/* ── STEP 1: Year Selection ──────────────────────────────────── */}
          {step === 1 && (
            <div style={s.selectionPanel}>
              <div style={s.selectionHeader}>
                <GraduationCap size={18} color="var(--primary-600)"/>
                <span style={s.selectionTitle}>Select Year</span>
                <span style={s.selectionSub}>{availableYears.length} years available</span>
              </div>
              {availableYears.length === 0 ? (
                <p style={s.emptyText}>No year data found. Make sure students have year assigned.</p>
              ) : (
                <div style={s.optionGrid}>
                  {availableYears.map(yr => {
                    const count = allStudents.students.filter(st => st.year === yr).length;
                    return (
                      <button key={yr} onClick={() => { setSelectedYear(yr); setSelectedSection(null); }} style={s.optionCard}>
                        <span style={s.optionNum}>Year {yr}</span>
                        <span style={s.optionCount}>{count} students</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Section Selection ───────────────────────────────── */}
          {step === 2 && (
            <div style={s.selectionPanel}>
              <div style={s.selectionHeader}>
                <LayoutGrid size={18} color="var(--primary-600)"/>
                <span style={s.selectionTitle}>Year {selectedYear} — Select Section</span>
                <span style={s.selectionSub}>{availableSections.length} sections available</span>
                <button onClick={() => { setSelectedYear(null); setSelectedSection(null); }} style={s.backBtn}>← Change Year</button>
              </div>
              {availableSections.length === 0 ? (
                <p style={s.emptyText}>No section data found for Year {selectedYear}.</p>
              ) : (
                <div style={s.optionGrid}>
                  {availableSections.map(sec => {
                    const count = allStudents.students.filter(st => st.year===selectedYear && st.section===sec).length;
                    return (
                      <button key={sec} onClick={() => setSelectedSection(sec)} style={s.optionCard}>
                        <span style={s.optionNum}>Section {sec}</span>
                        <span style={s.optionCount}>{count} students</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Mark Attendance ─────────────────────────────────── */}
          {step === 3 && (
            <>
              {/* Class Info + Breadcrumb */}
              <div style={s.classInfoBar}>
                <div style={s.classInfo}>
                  <BookOpen size={16} color="var(--primary-600)"/>
                  <span style={s.classLabel}>Year {selectedYear} · Section {selectedSection}</span>
                  <span style={s.classSub}>{displayStudents.length} students</span>
                </div>
                <div style={s.classBtns}>
                  <button onClick={handleExport} disabled={exporting} style={s.exportBtn} title="Download full attendance history as CSV">
                    {exporting
                      ? <Loader2 size={14} style={{ marginRight: 5, animation: "spin 0.8s linear infinite" }} />
                      : <Download size={14} style={{ marginRight: 5 }} />}
                    {exporting ? "Exporting..." : "Export CSV"}
                  </button>
                  <button onClick={() => setSelectedSection(null)} style={s.backBtn}>← Change Section</button>
                  <button onClick={() => { setSelectedYear(null); setSelectedSection(null); }} style={s.backBtn}>← Change Year</button>
                </div>
              </div>

              {/* Calendar Picker — Edit Any Past Date */}
              <div style={s.calRow}>
                <button onClick={() => setShowCalendar(v => !v)} style={s.calToggleBtn}>
                  <Calendar size={14} style={{ marginRight: 5 }} />
                  {showCalendar ? "Hide Calendar" : "Edit Past Records"}
                </button>
                {isEditing && <span style={s.editingTag}><Edit3 size={12} style={{marginRight:4}}/> Editing existing record</span>}
              </div>
              {showCalendar && (() => {
                const { year: cy, month: cm } = calMonth;
                const firstDay = new Date(cy, cm, 1).getDay();
                const daysInMonth = new Date(cy, cm + 1, 0).getDate();
                const monthLabel = new Date(cy, cm).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
                const cells = [];
                for (let i = 0; i < firstDay; i++) cells.push(null);
                for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                const todayStr = todayString();
                return (
                  <div style={s.calPanel}>
                    <div style={s.calNav}>
                      <button onClick={() => setCalMonth(p => { let m=p.month-1, y=p.year; if(m<0){m=11;y--;} return {year:y,month:m}; })} style={s.calNavBtn}><ChevronLeft size={16}/></button>
                      <span style={s.calMonthLabel}>{monthLabel}</span>
                      <button onClick={() => setCalMonth(p => { let m=p.month+1, y=p.year; if(m>11){m=0;y++;} return {year:y,month:m}; })} style={s.calNavBtn}><ChevronRight size={16}/></button>
                    </div>
                    <div style={s.calGrid}>
                      {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d} style={s.calDayHead}>{d}</div>)}
                      {cells.map((day, i) => {
                        if (!day) return <div key={`e${i}`} style={s.calCell} />;
                        const iso = `${cy}-${String(cm+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                        const isSel = iso === date;
                        const isToday = iso === todayStr;
                        const isFuture = iso > todayStr;
                        return (
                          <button key={iso} disabled={isFuture} onClick={() => { setDate(iso); setShowCalendar(false); }}
                            style={{
                              ...s.calCell,
                              cursor: isFuture ? "default" : "pointer",
                              background: isSel ? "var(--primary-600)" : isToday ? "var(--primary-50)" : "transparent",
                              color: isSel ? "#fff" : isFuture ? "var(--gray-300)" : isToday ? "var(--primary-700)" : "var(--gray-700)",
                              fontWeight: isSel || isToday ? 800 : 500,
                              border: isToday && !isSel ? "1.5px solid var(--primary-400)" : "1px solid transparent",
                              borderRadius: 8,
                            }}>
                            {day}
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => { setDate(todayStr); setShowCalendar(false); }} style={s.calTodayBtn}>↩ Back to Today</button>
                  </div>
                );
              })()}

              {/* Editing Banner */}
              {isEditing && (
                <div style={s.editingBanner}>
                  <Edit3 size={15} color="#d97706" />
                  <span>You are <strong>editing</strong> an older attendance record. Make changes below and click <strong>Update Records</strong>.</span>
                </div>
              )}

              {/* Mini Summary */}
              <div style={s.miniSummary}>
                {[
                  { label:"Total", val: displayStudents.length, color:"var(--primary-500)", icon:<Users size={16}/> },
                  { label:"Present", val: presentInView, color:"#059669", icon:<CheckCircle2 size={16}/> },
                  { label:"Absent", val: absentInView, color:"#dc2626", icon:<XCircle size={16}/> },
                  { label:"Marked", val:`${markedInView}/${displayStudents.length}`, color:"#d97706", icon:<Clock size={16}/> },
                ].map(c => (
                  <div key={c.label} style={{...s.miniCard, borderLeft:`3px solid ${c.color}`}}>
                    <span style={{color:c.color}}>{c.icon}</span>
                    <div><span style={s.miniVal}>{c.val}</span><span style={s.miniLabel}>{c.label}</span></div>
                  </div>
                ))}

                {/* Bulk actions */}
                <div style={s.bulkGroup}>
                  <button onClick={()=>markAll("Present")} style={{...s.bulkBtn, background:"#ecfdf5", color:"#059669", border:"1px solid #a7f3d0"}}>
                    <CheckCircle2 size={13}/> All Present
                  </button>
                  <button onClick={()=>markAll("Absent")} style={{...s.bulkBtn, background:"#fef2f2", color:"#dc2626", border:"1px solid #fecaca"}}>
                    <XCircle size={13}/> All Absent
                  </button>
                </div>
              </div>

              {/* Student Table */}
              <div style={s.tableWrapper}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>#</th>
                      <th style={s.th}>Roll No.</th>
                      <th style={s.th}>Student Name</th>
                      <th style={{...s.th, textAlign:"center"}}>Attendance %</th>
                      <th style={{...s.th, textAlign:"center"}}>Mark Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayStudents.map((st, i) => {
                      const current = statuses[st.student_id];
                      const cfg = current ? STATUS_CONFIG[current] : null;
                      const pct = st.attendance_pct;
                      const pctColor = pct==null ? "var(--gray-400)" : pct<65 ? "#dc2626" : pct<75 ? "#d97706" : "#059669";
                      return (
                        <tr key={st.student_id} style={{...s.tr, background: cfg ? cfg.bg+"44" : "transparent"}}>
                          <td style={s.td}>{i+1}</td>
                          <td style={{...s.td, fontWeight:700, fontFamily:"monospace", color:"var(--gray-800)"}}>{st.roll_number}</td>
                          <td style={s.td}>
                            <div style={s.nameCell}>
                              <div style={{...s.avatar, background: cfg ? cfg.color : "var(--primary-600)"}}>
                                {st.name?.charAt(0)?.toUpperCase()||"?"}
                              </div>
                              <div>
                                <div style={{fontWeight:600, color:"var(--gray-800)"}}>{st.name}</div>
                                <div style={{display:"flex", alignItems:"center", gap:6}}>
                                  {cfg && <span style={{fontSize:"0.72rem", color:cfg.color, fontWeight:600}}>{cfg.label}</span>}
                                  {st.streak >= 2 && (
                                    <span style={{
                                      fontSize:"0.68rem", fontWeight:700, color:"#b45309",
                                      background:"#fef3c7", padding:"0.1rem 0.45rem", borderRadius:10,
                                      border:"1px solid #fde68a", whiteSpace:"nowrap",
                                    }}>
                                      🔥 {st.streak}-day streak
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{...s.td, textAlign:"center", minWidth:90}}>
                            {pct!=null ? (
                              <div style={{display:"flex", alignItems:"center", gap:6}}>
                                <div style={{flex:1, height:7, borderRadius:4, background:"var(--gray-100)", overflow:"hidden", minWidth:50}}>
                                  <div style={{
                                    width:`${Math.min(pct,100)}%`, height:"100%", borderRadius:4,
                                    background: pctColor, transition:"width 0.5s ease",
                                  }} />
                                </div>
                                <span style={{fontSize:"0.78rem", fontWeight:700, color:pctColor, minWidth:36, textAlign:"right"}}>{pct}%</span>
                              </div>
                            ) : <span style={{color:"var(--gray-400)", fontSize:"0.8rem"}}>—</span>}
                          </td>
                          <td style={{...s.td, textAlign:"center"}}>
                            <div style={{display:"flex", gap:6, justifyContent:"center"}}>
                              {["Present","Absent","Late"].map(status => {
                                const c = STATUS_CONFIG[status];
                                const active = current===status;
                                return (
                                  <button key={status} onClick={()=>toggleStatus(st.student_id,status)} title={status}
                                    style={{
                                      width:36, height:36, borderRadius:"50%",
                                      display:"flex", alignItems:"center", justifyContent:"center",
                                      cursor:"pointer", transition:"all 0.18s ease",
                                      background: active ? c.bg : "transparent",
                                      color: active ? c.color : "var(--gray-300)",
                                      border:`1.5px solid ${active ? c.border : "var(--gray-200)"}`,
                                      transform: active ? "scale(1.15)" : "scale(1)",
                                      boxShadow: active ? `0 2px 8px ${c.color}30` : "none",
                                      position: "relative",
                                      overflow: "visible",
                                      animation: animatingId===`${st.student_id}-${status}` && active
                                        ? (status==="Absent" ? "shakeBtn 0.4s ease" : "popBtn 0.4s ease")
                                        : "none",
                                    }}>
                                    {c.icon}
                                    {/* Sparkle burst for Present/Late */}
                                    {animatingId===`${st.student_id}-${status}` && active && status !== "Absent" && (
                                      <span style={{
                                        position:"absolute", top:"-12px", left:"50%", transform:"translateX(-50%)",
                                        fontSize:"14px", animation:"floatUp 0.6s ease-out forwards", pointerEvents:"none",
                                      }}>
                                        {status==="Present" ? "✓" : "⏰"}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Save Button */}
              <div style={s.saveSection}>
                <button onClick={handleSave} disabled={saving || markedInView===0}
                  style={{...s.saveBtn, opacity: saving||markedInView===0 ? 0.5 : 1}}>
                  {saving
                    ? <><Loader2 size={17} style={{marginRight:6, animation:"spin 0.8s linear infinite"}}/>{isEditing ? "Updating & Running ML..." : "Saving & Running ML..."}</>
                    : <><Save size={17} style={{marginRight:6}}/>{isEditing ? `Update Records (${markedInView})` : `Save Attendance (${markedInView})`}</>}
                </button>
              </div>

              {/* Save Result */}
              {saveResult && !saveResult.error && (
                <div style={s.resultCard}>
                  <div style={s.resultHeader}>
                    <ShieldCheck size={20} color="#059669"/>
                    <strong style={{color:"#059669"}}>{saveResult.message}</strong>
                  </div>
                  <p style={s.resultMeta}>{saveResult.new_records} new + {saveResult.updated_records} updated · ML risk predictions refreshed ✓</p>
                  {saveResult.predictions?.length > 0 && (
                    <div style={s.predGrid}>
                      {saveResult.predictions.map(p => (
                        <div key={p.student_id} style={s.predChip}>
                          {p.risk_level==="Green"?<ShieldCheck size={13} color="#059669"/>:p.risk_level==="Yellow"?<AlertTriangle size={13} color="#d97706"/>:<ShieldAlert size={13} color="#dc2626"/>}
                          <span style={{fontWeight:700, color:riskColors[p.risk_level]}}>{p.attendance_pct}%</span>
                          <span style={{fontSize:"0.7rem", color:"var(--gray-500)"}}>→ {p.risk_level}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {saveResult?.error && (
                <div style={s.errorCard}>
                  <AlertTriangle size={18} color="#dc2626"/><span>{saveResult.error}</span>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────────── */
const s = {
  container: { maxWidth:1100, margin:"2rem auto", padding:"0 1.5rem" },
  pageHeader: { marginBottom:"1.5rem", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"1rem", flexWrap:"wrap" },
  heading: { fontSize:"1.6rem", fontWeight:800, margin:0, color:"var(--gray-900)", letterSpacing:"-0.03em", display:"flex", alignItems:"center" },
  subtitle: { fontSize:"0.85rem", color:"var(--gray-500)", marginTop:4 },
  defaultersBtn: { display:"flex", alignItems:"center", padding:"0.55rem 1rem", fontSize:"0.82rem", fontWeight:700, color:"var(--white)", background:"linear-gradient(135deg, #dc2626, #991b1b)", border:"none", borderRadius:"var(--radius-md)", cursor:"pointer", boxShadow:"var(--shadow-sm)", whiteSpace:"nowrap", flexShrink:0 },

  dateBar: { display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"1.25rem", background:"var(--white)", padding:"0.85rem 1.1rem", borderRadius:"var(--radius-lg)", border:"1px solid var(--gray-200)", boxShadow:"var(--shadow-sm)" },
  dateBtn: { background:"var(--gray-100)", border:"1px solid var(--gray-200)", borderRadius:"var(--radius-md)", padding:"0.5rem 0.65rem", cursor:"pointer", display:"flex", alignItems:"center", color:"var(--gray-600)", lineHeight:1 },
  dateCenter: { flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"1rem" },
  prettyDate: { fontSize:"1rem", fontWeight:700, color:"var(--gray-800)" },
  dateInput: { border:"1px solid var(--gray-200)", borderRadius:"var(--radius-md)", padding:"0.35rem 0.5rem", fontSize:"0.82rem", color:"var(--gray-600)", background:"var(--gray-50)" },

  stepBar: { display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"1.5rem", padding:"0.85rem 1.25rem", background:"var(--white)", borderRadius:"var(--radius-lg)", border:"1px solid var(--gray-200)", boxShadow:"var(--shadow-sm)" },

  selectionPanel: { background:"var(--white)", borderRadius:"var(--radius-lg)", border:"1px solid var(--gray-200)", boxShadow:"var(--shadow-sm)", overflow:"hidden" },
  selectionHeader: { display:"flex", alignItems:"center", gap:"0.6rem", padding:"1rem 1.25rem", background:"linear-gradient(135deg,#f8faff,#eef4ff)", borderBottom:"1px solid var(--gray-100)" },
  selectionTitle: { fontSize:"0.95rem", fontWeight:800, color:"var(--gray-900)", flex:1 },
  selectionSub: { fontSize:"0.78rem", color:"var(--gray-400)", fontWeight:500 },
  backBtn: { fontSize:"0.78rem", fontWeight:600, color:"var(--primary-600)", background:"transparent", border:"1px solid var(--primary-200)", borderRadius:8, padding:"0.3rem 0.65rem", cursor:"pointer" },
  optionGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px,1fr))", gap:"0.75rem", padding:"1.25rem" },
  optionCard: { display:"flex", flexDirection:"column", gap:4, padding:"1.25rem", background:"var(--gray-50)", border:"1.5px solid var(--gray-200)", borderRadius:"var(--radius-md)", cursor:"pointer", transition:"all 0.18s", textAlign:"center", alignItems:"center" },
  optionNum: { fontSize:"1.15rem", fontWeight:800, color:"var(--primary-700)" },
  optionCount: { fontSize:"0.75rem", color:"var(--gray-400)", fontWeight:500 },

  classInfoBar: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.9rem", padding:"0.85rem 1rem", background:"var(--white)", border:"1px solid var(--gray-200)", borderRadius:"var(--radius-md)", boxShadow:"var(--shadow-sm)" },
  classInfo: { display:"flex", alignItems:"center", gap:"0.6rem" },
  classLabel: { fontSize:"1rem", fontWeight:800, color:"var(--gray-900)" },
  classSub: { fontSize:"0.75rem", color:"var(--gray-400)", fontWeight:500, background:"var(--gray-100)", borderRadius:10, padding:"0.1rem 0.45rem" },
  classBtns: { display:"flex", gap:"0.4rem", alignItems:"center" },
  exportBtn: { display:"flex", alignItems:"center", padding:"0.3rem 0.75rem", fontSize:"0.78rem", fontWeight:700, color:"var(--white)", background:"linear-gradient(135deg,#059669,#047857)", border:"none", borderRadius:8, cursor:"pointer", boxShadow:"var(--shadow-sm)", whiteSpace:"nowrap" },

  calRow: { display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"1rem" },
  calToggleBtn: { display:"flex", alignItems:"center", padding:"0.4rem 0.85rem", fontSize:"0.8rem", fontWeight:700, color:"var(--primary-700)", background:"var(--primary-50)", border:"1.5px solid var(--primary-200)", borderRadius:8, cursor:"pointer", transition:"all 0.15s" },
  editingTag: { display:"flex", alignItems:"center", fontSize:"0.78rem", fontWeight:700, color:"#d97706", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8, padding:"0.3rem 0.7rem" },
  calPanel: { background:"var(--white)", border:"1px solid var(--gray-200)", borderRadius:"var(--radius-lg)", padding:"1rem", marginBottom:"1.2rem", boxShadow:"var(--shadow-md)", maxWidth:340 },
  calNav: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.75rem" },
  calNavBtn: { background:"var(--gray-100)", border:"1px solid var(--gray-200)", borderRadius:8, padding:"0.3rem 0.5rem", cursor:"pointer", display:"flex", alignItems:"center", color:"var(--gray-600)" },
  calMonthLabel: { fontSize:"0.92rem", fontWeight:800, color:"var(--gray-800)" },
  calGrid: { display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 },
  calDayHead: { fontSize:"0.7rem", fontWeight:700, color:"var(--gray-400)", textAlign:"center", padding:"0.3rem 0" },
  calCell: { width:"100%", aspectRatio:"1", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.82rem", transition:"all 0.12s" },
  calTodayBtn: { marginTop:"0.65rem", width:"100%", padding:"0.4rem", fontSize:"0.78rem", fontWeight:700, color:"var(--primary-600)", background:"var(--primary-50)", border:"1px solid var(--primary-200)", borderRadius:8, cursor:"pointer", textAlign:"center" },
  editingBanner: { display:"flex", alignItems:"center", gap:"0.6rem", padding:"0.8rem 1rem", background:"#fffbeb", border:"1px solid #fde68a", borderLeft:"4px solid #d97706", borderRadius:"0 var(--radius-md) var(--radius-md) 0", marginBottom:"1.1rem", color:"#b45309", fontSize:"0.85rem", boxShadow:"var(--shadow-sm)" },

  miniSummary: { display:"flex", flexWrap:"wrap", gap:"0.6rem", marginBottom:"1rem", alignItems:"center" },
  miniCard: { display:"flex", alignItems:"center", gap:"0.55rem", background:"var(--white)", borderRadius:"var(--radius-md)", border:"1px solid var(--gray-200)", padding:"0.6rem 0.85rem", boxShadow:"var(--shadow-sm)" },
  miniVal: { fontSize:"1.1rem", fontWeight:800, color:"var(--gray-900)", display:"block", lineHeight:1.2 },
  miniLabel: { fontSize:"0.7rem", color:"var(--gray-400)", display:"block", fontWeight:500 },
  bulkGroup: { display:"flex", gap:"0.4rem", marginLeft:"auto" },
  bulkBtn: { display:"flex", alignItems:"center", gap:4, padding:"0.4rem 0.8rem", borderRadius:"var(--radius-md)", fontSize:"0.78rem", fontWeight:600, cursor:"pointer" },

  tableWrapper: { background:"var(--white)", borderRadius:"var(--radius-lg)", border:"1px solid var(--gray-200)", boxShadow:"var(--shadow-sm)", overflow:"hidden", marginBottom:"1rem" },
  table: { width:"100%", borderCollapse:"collapse" },
  th: { padding:"0.7rem 1rem", textAlign:"left", fontSize:"0.72rem", fontWeight:700, color:"var(--gray-400)", textTransform:"uppercase", letterSpacing:"0.06em", background:"var(--gray-50)", borderBottom:"2px solid var(--gray-100)" },
  tr: { borderBottom:"1px solid var(--gray-100)", transition:"background 0.12s" },
  td: { padding:"0.7rem 1rem", fontSize:"0.87rem", color:"var(--gray-700)", verticalAlign:"middle" },
  nameCell: { display:"flex", alignItems:"center", gap:"0.55rem" },
  avatar: { width:32, height:32, borderRadius:"50%", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.8rem", flexShrink:0, transition:"background 0.2s" },

  saveSection: { display:"flex", justifyContent:"flex-end", marginTop:"0.5rem" },
  saveBtn: { display:"flex", alignItems:"center", padding:"0.72rem 1.5rem", fontSize:"0.92rem", fontWeight:700, color:"var(--white)", background:"linear-gradient(135deg, var(--primary-600), var(--primary-800))", border:"none", borderRadius:"var(--radius-md)", cursor:"pointer", boxShadow:"var(--shadow-md)" },

  resultCard: { marginTop:"1rem", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:"var(--radius-lg)", padding:"1rem 1.25rem" },
  resultHeader: { display:"flex", alignItems:"center", gap:8, marginBottom:4 },
  resultMeta: { fontSize:"0.82rem", color:"var(--gray-600)", margin:"0 0 0.5rem 0" },
  predGrid: { display:"flex", flexWrap:"wrap", gap:6 },
  predChip: { display:"flex", alignItems:"center", gap:5, background:"var(--white)", border:"1px solid var(--gray-200)", borderRadius:8, padding:"0.25rem 0.6rem", fontSize:"0.78rem" },
  errorCard: { marginTop:"1rem", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"var(--radius-md)", padding:"0.8rem 1rem", display:"flex", alignItems:"center", gap:8, color:"#dc2626", fontSize:"0.88rem" },
  loadingBox: { display:"flex", flexDirection:"column", alignItems:"center", gap:"0.8rem", padding:"4rem 2rem" },
  loadingText: { fontSize:"0.9rem", color:"var(--gray-500)" },
  emptyBox: { display:"flex", flexDirection:"column", alignItems:"center", gap:"0.75rem", padding:"3.5rem 2rem" },
  emptyText: { fontSize:"0.92rem", color:"var(--gray-500)", textAlign:"center" },
};
