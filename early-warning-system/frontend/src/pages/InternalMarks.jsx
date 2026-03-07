import { useState, useEffect, useMemo } from "react";
import {
  fetchStudents, fetchIAMarks, saveIAMarks, uploadIAMarksCSV, fetchIASubjects,
} from "../services/api";
import {
  BookOpen, Save, Upload, Loader2, AlertTriangle, CheckCircle,
  FileSpreadsheet, Search, X, Users, GraduationCap,
} from "lucide-react";

const IA_TYPES = ["IA1", "IA2", "IA3"];

export default function InternalMarks() {
  const [activeTab, setActiveTab] = useState("IA1");
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [subjectInput, setSubjectInput] = useState("");
  const [maxMarks, setMaxMarks] = useState(100);
  const [marksMap, setMarksMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // ── Year/Section filters ────────────────────────────────────────────────────
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  // ── Load students & subjects ────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetchStudents().catch(() => ({ students: [] })),
      fetchIASubjects().catch(() => ({ subjects: [] })),
    ]).then(([studData, subjData]) => {
      setStudents(studData.students || []);
      setSubjects(subjData.subjects || []);
    }).finally(() => setLoading(false));
  }, []);

  // ── Derive available years & sections ───────────────────────────────────────
  const availableYears = useMemo(() => {
    const yrs = [...new Set(students.map((s) => s.year).filter(Boolean))].sort();
    return yrs;
  }, [students]);

  const availableSections = useMemo(() => {
    if (!selectedYear) return [];
    const secs = [
      ...new Set(
        students
          .filter((s) => String(s.year) === String(selectedYear))
          .map((s) => s.section)
          .filter(Boolean)
      ),
    ].sort();
    return secs;
  }, [students, selectedYear]);

  // ── Filtered students (by year + section + search) ──────────────────────────
  const filteredStudents = useMemo(() => {
    let list = students;
    if (selectedYear) list = list.filter((s) => String(s.year) === String(selectedYear));
    if (selectedSection) list = list.filter((s) => s.section === selectedSection);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (s) => s.name?.toLowerCase().includes(q) || s.roll_number?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [students, selectedYear, selectedSection, searchTerm]);

  // ── Load existing marks when tab or subject changes ─────────────────────────
  useEffect(() => {
    if (!subjectInput.trim()) return;
    fetchIAMarks(activeTab, subjectInput.trim())
      .then((data) => {
        const map = {};
        (data.marks || []).forEach((m) => { map[m.student_id] = m.obtained_marks; });
        setMarksMap(map);
      })
      .catch(() => {});
  }, [activeTab, subjectInput]);

  // ── Reset section when year changes ─────────────────────────────────────────
  useEffect(() => { setSelectedSection(""); }, [selectedYear]);

  // ── Handle mark change ──────────────────────────────────────────────────────
  const handleMarkChange = (studentId, value) => {
    const num = value === "" ? "" : Math.min(Math.max(0, parseFloat(value) || 0), maxMarks);
    setMarksMap((prev) => ({ ...prev, [studentId]: num }));
  };

  // ── Save marks ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!subjectInput.trim()) {
      setMsg({ type: "error", text: "Please enter a subject name" }); return;
    }
    if (!selectedYear) {
      setMsg({ type: "error", text: "Please select a year first" }); return;
    }
    const entries = filteredStudents
      .filter((s) => marksMap[s.id] !== "" && marksMap[s.id] !== undefined)
      .map((s) => ({ student_id: s.id, obtained_marks: parseFloat(marksMap[s.id]) }));

    if (entries.length === 0) {
      setMsg({ type: "error", text: "No marks entered" }); return;
    }

    setSaving(true);
    setMsg(null);
    try {
      const result = await saveIAMarks({
        subject_name: subjectInput.trim(),
        ia_type: activeTab,
        max_marks: maxMarks,
        marks: entries,
      });
      setMsg({
        type: "success",
        text: `✅ Saved: ${result.new_records} new, ${result.updated_records} updated. Risk predictions refreshed.`,
      });
      fetchIASubjects().then((d) => setSubjects(d.subjects || [])).catch(() => {});
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ── CSV Upload ──────────────────────────────────────────────────────────────
  const handleCSVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    setMsg(null);
    try {
      const result = await uploadIAMarksCSV(file);
      setMsg({
        type: "success",
        text: `✅ CSV: ${result.new_records} new, ${result.updated_records} updated, ${result.skipped} skipped.`,
      });
      fetchIASubjects().then((d) => setSubjects(d.subjects || [])).catch(() => {});
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  };

  // ── Ready to enter marks? ───────────────────────────────────────────────────
  const classSelected = selectedYear && selectedSection;
  const readyToEnter = classSelected && subjectInput.trim();

  if (loading) {
    return (
      <div style={S.loadingBox}>
        <div style={S.spinner} />
        <p style={S.loadingText}>Loading internal marks...</p>
      </div>
    );
  }

  return (
    <div style={S.container}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={S.pageHeader}>
        <div style={S.headerIcon}>
          <BookOpen size={24} color="var(--primary-700)" />
        </div>
        <div>
          <h2 style={S.heading}>Internal Assessment Marks</h2>
          <p style={S.subtext}>
            Select class → subject → enter marks. Risk predictions auto-update.
          </p>
        </div>
      </div>

      {/* ── IA Tabs ────────────────────────────────────────────────────────── */}
      <div style={S.tabBar}>
        {IA_TYPES.map((ia) => (
          <button
            key={ia}
            style={{ ...S.tab, ...(activeTab === ia ? S.tabActive : {}) }}
            onClick={() => { setActiveTab(ia); setMsg(null); }}
          >
            <span style={S.tabDot(activeTab === ia)} />
            {ia}
          </button>
        ))}
        <label style={S.csvBtn}>
          <Upload size={14} style={{ marginRight: 4 }} />
          Upload CSV
          <input type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: "none" }} />
        </label>
      </div>

      {/* ── Step 1: Year & Section Selection ───────────────────────────────── */}
      <div style={S.stepCard}>
        <div style={S.stepHeader}>
          <span style={S.stepBadge}>1</span>
          <span style={S.stepTitle}>Select Class</span>
        </div>
        <div style={S.filterRow}>
          <div style={S.filterField}>
            <label style={S.filterLabel}>
              <GraduationCap size={14} style={{ marginRight: 4 }} /> Year
            </label>
            <div style={S.chipGroup}>
              {availableYears.map((y) => (
                <button
                  key={y}
                  style={{
                    ...S.filterChip,
                    ...(String(selectedYear) === String(y) ? S.filterChipActive : {}),
                  }}
                  onClick={() => setSelectedYear(String(selectedYear) === String(y) ? "" : y)}
                >
                  Year {y}
                </button>
              ))}
              {availableYears.length === 0 && (
                <span style={S.noData}>No students found</span>
              )}
            </div>
          </div>

          <div style={S.filterField}>
            <label style={S.filterLabel}>
              <Users size={14} style={{ marginRight: 4 }} /> Section
            </label>
            <div style={S.chipGroup}>
              {availableSections.map((sec) => (
                <button
                  key={sec}
                  style={{
                    ...S.filterChip,
                    ...(selectedSection === sec ? S.filterChipActive : {}),
                  }}
                  onClick={() => setSelectedSection(selectedSection === sec ? "" : sec)}
                >
                  Section {sec}
                </button>
              ))}
              {!selectedYear && (
                <span style={S.noData}>Select a year first</span>
              )}
              {selectedYear && availableSections.length === 0 && (
                <span style={S.noData}>No sections found</span>
              )}
            </div>
          </div>
        </div>

        {classSelected && (
          <div style={S.classInfo}>
            <CheckCircle size={14} color="#059669" />
            <span>
              <strong>Year {selectedYear}, Section {selectedSection}</strong> — {filteredStudents.length} students
            </span>
          </div>
        )}
      </div>

      {/* ── Step 2: Subject & Max Marks ────────────────────────────────────── */}
      {classSelected && (
        <div style={{ ...S.stepCard, animation: "fadeInUp 0.3s ease-out" }}>
          <div style={S.stepHeader}>
            <span style={S.stepBadge}>2</span>
            <span style={S.stepTitle}>Subject & Max Marks</span>
          </div>
          <div style={S.configRow}>
            <div style={S.configField}>
              <label style={S.configLabel}>
                <FileSpreadsheet size={14} style={{ marginRight: 4 }} />
                Subject Name
              </label>
              <div style={S.comboWrap}>
                <input
                  type="text"
                  value={subjectInput}
                  onChange={(e) => { setSubjectInput(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="e.g. Mathematics, DBMS"
                  style={S.configInput}
                />
                {subjectInput && (
                  <button style={S.clearBtn} onClick={() => { setSubjectInput(""); setMarksMap({}); }}>
                    <X size={14} />
                  </button>
                )}
                {showDropdown && subjects.length > 0 && (
                  <div style={S.dropdown}>
                    {subjects
                      .filter((s) => s.toLowerCase().includes(subjectInput.toLowerCase()))
                      .map((s) => (
                        <div key={s} style={S.dropdownItem}
                          onClick={() => { setSubjectInput(s); setShowDropdown(false); }}
                        >{s}</div>
                      ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ ...S.configField, maxWidth: 120 }}>
              <label style={S.configLabel}>Max Marks</label>
              <input
                type="number"
                value={maxMarks}
                onChange={(e) => setMaxMarks(Math.max(1, parseInt(e.target.value) || 20))}
                style={S.configInput}
                min={1}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Status Message ─────────────────────────────────────────────────── */}
      {msg && (
        <div style={{ ...S.msgBox, ...(msg.type === "error" ? S.msgError : S.msgSuccess) }}>
          {msg.type === "error" ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* ── Step 3: Marks Entry Grid ───────────────────────────────────────── */}
      {readyToEnter && (
        <div style={{ ...S.gridCard, animation: "fadeInUp 0.3s ease-out" }}>
          <div style={S.gridHeader}>
            <h4 style={S.gridTitle}>
              <span style={S.stepBadge}>3</span>
              {activeTab} — {subjectInput}
              <span style={S.gridCount}>
                {Object.entries(marksMap).filter(([k, v]) => v !== "" && v !== undefined && filteredStudents.some(s => s.id === parseInt(k))).length} / {filteredStudents.length} entered
              </span>
            </h4>
            <div style={S.gridActions}>
              <div style={S.searchWrap}>
                <Search size={14} style={{ color: "var(--gray-400)" }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  style={S.searchInput}
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ ...S.saveBtn, ...(saving ? { opacity: 0.6, cursor: "not-allowed" } : {}) }}
              >
                {saving ? (
                  <><Loader2 size={14} style={{ animation: "spin 0.7s linear infinite", marginRight: 4 }} /> Saving...</>
                ) : (
                  <><Save size={14} style={{ marginRight: 4 }} /> Save Marks</>
                )}
              </button>
            </div>
          </div>

          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>#</th>
                  <th style={{ ...S.th, textAlign: "left" }}>Student</th>
                  <th style={S.th}>Roll No.</th>
                  <th style={S.th}>Marks (/{maxMarks})</th>
                  <th style={S.th}>%</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, idx) => {
                  const val = marksMap[s.id];
                  const pct = val !== "" && val !== undefined ? Math.round((val / maxMarks) * 100) : null;
                  const pctColor = pct === null ? "var(--gray-300)" : pct >= 60 ? "#16a34a" : pct >= 40 ? "#eab308" : "#dc2626";
                  return (
                    <tr key={s.id} style={S.tr}>
                      <td style={S.tdCenter}>{idx + 1}</td>
                      <td style={S.td}>
                        <strong>{s.name}</strong>
                        <div style={S.email}>{s.email}</div>
                      </td>
                      <td style={S.tdCenter}>
                        <span style={S.rollChip}>{s.roll_number}</span>
                      </td>
                      <td style={S.tdCenter}>
                        <input
                          type="number" min={0} max={maxMarks} step={0.5}
                          value={val !== undefined ? val : ""}
                          onChange={(e) => handleMarkChange(s.id, e.target.value)}
                          style={S.markInput} placeholder="—"
                        />
                      </td>
                      <td style={S.tdCenter}>
                        {pct !== null ? (
                          <span style={{ ...S.pctBadge, color: pctColor, borderColor: pctColor }}>{pct}%</span>
                        ) : <span style={{ color: "var(--gray-300)" }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ ...S.tdCenter, padding: "2rem", color: "var(--gray-400)" }}>
                      No students found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Empty states ───────────────────────────────────────────────────── */}
      {!classSelected && students.length > 0 && (
        <div style={S.emptyState}>
          <Users size={48} color="var(--gray-300)" />
          <p style={S.emptyText}>
            Select a <strong>Year</strong> and <strong>Section</strong> above to start entering {activeTab} marks
          </p>
        </div>
      )}

      {classSelected && !subjectInput.trim() && (
        <div style={{ ...S.emptyState, animation: "fadeInUp 0.3s ease-out" }}>
          <FileSpreadsheet size={48} color="var(--gray-300)" />
          <p style={S.emptyText}>
            Enter a <strong>subject name</strong> to start entering marks for Year {selectedYear} Section {selectedSection}
          </p>
          {subjects.length > 0 && (
            <div style={S.subjectChips}>
              <span style={S.chipsLabel}>Existing subjects:</span>
              {subjects.map((s) => (
                <button key={s} style={S.subjectChip} onClick={() => setSubjectInput(s)}>{s}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CSV Help ───────────────────────────────────────────────────────── */}
      <div style={S.helpCard}>
        <h5 style={S.helpTitle}>📋 CSV Upload Format</h5>
        <code style={S.helpCode}>
          roll_number,subject,ia_type,max_marks,obtained_marks{"\n"}
          CS001,Mathematics,IA1,20,18{"\n"}
          CS001,DBMS,IA1,20,15
        </code>
      </div>
    </div>
  );
}

/* ═══════════════════ Styles ═══════════════════════════════════════════════ */
const S = {
  container: { maxWidth: 960, margin: "2rem auto", padding: "0 1.5rem" },
  pageHeader: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" },
  headerIcon: {
    width: 52, height: 52, borderRadius: "var(--radius-lg)", background: "var(--primary-100)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  heading: { fontSize: "1.5rem", fontWeight: 800, color: "var(--gray-900)", letterSpacing: "-0.03em", margin: 0 },
  subtext: { fontSize: "0.9rem", color: "var(--gray-500)", margin: "0.15rem 0 0" },

  loadingBox: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5rem 1rem", gap: "1rem" },
  spinner: { width: 40, height: 40, border: "3px solid var(--gray-200)", borderTop: "3px solid var(--primary-700)", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  loadingText: { color: "var(--gray-500)", fontSize: "0.9rem" },

  /* Tabs */
  tabBar: { display: "flex", gap: "0.5rem", marginBottom: "1rem", alignItems: "center", flexWrap: "wrap" },
  tab: {
    padding: "0.55rem 1.2rem", fontSize: "0.88rem", fontWeight: 700,
    borderRadius: "var(--radius-full)", border: "1.5px solid var(--gray-200)",
    background: "var(--white)", color: "var(--gray-600)", cursor: "pointer",
    transition: "all var(--transition-fast)", display: "flex", alignItems: "center", gap: "0.4rem",
  },
  tabActive: { background: "var(--gradient-primary)", color: "var(--white)", borderColor: "transparent", boxShadow: "var(--shadow-md)" },
  tabDot: (active) => ({
    width: 8, height: 8, borderRadius: "50%",
    background: active ? "#34d399" : "var(--gray-300)", transition: "background var(--transition-fast)",
  }),
  csvBtn: {
    marginLeft: "auto", padding: "0.5rem 1rem", fontSize: "0.82rem", fontWeight: 700,
    color: "var(--accent-700)", background: "var(--accent-50)", border: "1.5px solid var(--accent-400)",
    borderRadius: "var(--radius-md)", cursor: "pointer", display: "flex", alignItems: "center",
  },

  /* Step Cards */
  stepCard: {
    padding: "1.25rem 1.5rem", background: "var(--white)", borderRadius: "var(--radius-lg)",
    border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", marginBottom: "1rem",
  },
  stepHeader: { display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.85rem" },
  stepBadge: {
    width: 26, height: 26, borderRadius: "50%", background: "var(--gradient-primary)",
    color: "var(--white)", fontWeight: 800, fontSize: "0.78rem",
    display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  stepTitle: { fontSize: "0.95rem", fontWeight: 700, color: "var(--gray-800)" },

  /* Year/Section filters */
  filterRow: { display: "flex", gap: "1.5rem", flexWrap: "wrap" },
  filterField: { flex: 1, minWidth: 180 },
  filterLabel: {
    fontWeight: 600, fontSize: "0.78rem", color: "var(--gray-600)",
    display: "flex", alignItems: "center", marginBottom: "0.4rem",
    textTransform: "uppercase", letterSpacing: "0.04em",
  },
  chipGroup: { display: "flex", gap: "0.4rem", flexWrap: "wrap" },
  filterChip: {
    padding: "0.45rem 1rem", fontSize: "0.85rem", fontWeight: 600,
    borderRadius: "var(--radius-full)", border: "1.5px solid var(--gray-200)",
    background: "var(--white)", color: "var(--gray-600)", cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  filterChipActive: {
    background: "var(--primary-700)", color: "var(--white)", borderColor: "var(--primary-700)",
    boxShadow: "0 2px 8px rgba(30, 58, 95, 0.25)",
  },
  noData: { fontSize: "0.82rem", color: "var(--gray-400)", fontStyle: "italic", padding: "0.4rem 0" },
  classInfo: {
    display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.85rem",
    padding: "0.5rem 0.85rem", background: "#ecfdf5", borderRadius: "var(--radius-md)",
    border: "1px solid #a7f3d0", fontSize: "0.85rem", color: "#047857",
  },

  /* Subject config */
  configRow: { display: "flex", gap: "1rem", flexWrap: "wrap" },
  configField: { flex: 1, display: "flex", flexDirection: "column", gap: "0.3rem", minWidth: 200 },
  configLabel: { fontWeight: 600, fontSize: "0.82rem", color: "var(--gray-700)", display: "flex", alignItems: "center" },
  configInput: {
    padding: "0.55rem 0.75rem", fontSize: "0.95rem",
    border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius-md)", background: "var(--gray-50)",
  },
  comboWrap: { position: "relative" },
  clearBtn: {
    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", color: "var(--gray-400)", cursor: "pointer", padding: 2,
  },
  dropdown: {
    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
    background: "var(--white)", border: "1px solid var(--gray-200)",
    borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)",
    maxHeight: 200, overflowY: "auto", marginTop: 4,
  },
  dropdownItem: { padding: "0.55rem 0.85rem", fontSize: "0.88rem", cursor: "pointer" },

  /* Messages */
  msgBox: {
    display: "flex", alignItems: "center", gap: "0.5rem",
    padding: "0.75rem 1rem", borderRadius: "var(--radius-md)",
    fontSize: "0.88rem", fontWeight: 600, marginBottom: "1rem", animation: "fadeInUp 0.3s ease-out",
  },
  msgSuccess: { background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" },
  msgError: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },

  /* Grid Card */
  gridCard: {
    background: "var(--white)", borderRadius: "var(--radius-lg)",
    border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-md)",
    overflow: "hidden", marginBottom: "1rem",
  },
  gridHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "1rem 1.5rem", borderBottom: "1px solid var(--gray-100)",
    flexWrap: "wrap", gap: "0.75rem",
  },
  gridTitle: {
    margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--gray-900)",
    display: "flex", alignItems: "center", gap: "0.5rem",
  },
  gridCount: {
    fontSize: "0.78rem", fontWeight: 600, color: "var(--gray-400)",
    background: "var(--gray-50)", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-full)",
  },
  gridActions: { display: "flex", gap: "0.5rem", alignItems: "center" },
  searchWrap: {
    display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.4rem 0.65rem",
    background: "var(--gray-50)", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-md)",
  },
  searchInput: { border: "none", background: "transparent", fontSize: "0.85rem", outline: "none", width: 120 },
  saveBtn: {
    padding: "0.5rem 1.2rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--white)",
    background: "var(--gradient-primary)", border: "none", borderRadius: "var(--radius-md)",
    cursor: "pointer", display: "flex", alignItems: "center", boxShadow: "var(--shadow-sm)",
  },

  /* Table */
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" },
  th: {
    textAlign: "center", padding: "0.65rem 0.85rem",
    borderBottom: "2px solid var(--primary-700)", background: "var(--gray-50)",
    fontSize: "0.75rem", fontWeight: 700, color: "var(--gray-600)",
    textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap",
  },
  tr: { borderBottom: "1px solid var(--gray-100)" },
  td: { padding: "0.55rem 0.85rem" },
  tdCenter: { padding: "0.55rem 0.85rem", textAlign: "center" },
  email: { fontSize: "0.72rem", color: "var(--gray-400)", marginTop: 1 },
  rollChip: {
    fontSize: "0.8rem", color: "var(--primary-700)", fontWeight: 600,
    background: "var(--primary-50)", padding: "0.15rem 0.5rem",
    borderRadius: "var(--radius-sm)", border: "1px solid var(--primary-100)",
  },
  markInput: {
    width: 70, padding: "0.4rem 0.5rem", textAlign: "center",
    border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius-sm)",
    fontSize: "0.9rem", fontWeight: 700, background: "var(--gray-50)",
  },
  pctBadge: {
    fontSize: "0.78rem", fontWeight: 700, padding: "0.15rem 0.5rem",
    borderRadius: "var(--radius-full)", border: "1.5px solid",
  },

  /* Empty State */
  emptyState: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem",
    padding: "3rem", background: "var(--white)", borderRadius: "var(--radius-lg)",
    border: "1px solid var(--gray-200)", textAlign: "center",
  },
  emptyText: { color: "var(--gray-500)", fontSize: "0.95rem", maxWidth: 400 },
  subjectChips: {
    display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center",
    marginTop: "0.5rem", alignItems: "center",
  },
  chipsLabel: { fontSize: "0.78rem", color: "var(--gray-400)", fontWeight: 600 },
  subjectChip: {
    padding: "0.3rem 0.75rem", fontSize: "0.82rem", fontWeight: 600,
    background: "var(--primary-50)", color: "var(--primary-700)",
    border: "1px solid var(--primary-200)", borderRadius: "var(--radius-full)",
    cursor: "pointer", transition: "all var(--transition-fast)",
  },

  /* Help Card */
  helpCard: {
    padding: "1rem 1.25rem", background: "var(--gray-50)", borderRadius: "var(--radius-md)",
    border: "1px solid var(--gray-200)", marginTop: "0.5rem",
  },
  helpTitle: { margin: "0 0 0.5rem", fontSize: "0.88rem", fontWeight: 700, color: "var(--gray-700)" },
  helpCode: {
    display: "block", fontSize: "0.78rem", lineHeight: 1.7, whiteSpace: "pre",
    color: "var(--gray-600)", background: "var(--white)", padding: "0.75rem 1rem",
    borderRadius: "var(--radius-sm)", border: "1px solid var(--gray-200)", overflowX: "auto",
  },
};
