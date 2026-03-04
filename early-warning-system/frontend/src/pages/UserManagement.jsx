import { useState, useEffect, useMemo } from "react";
import { fetchUsers, createUser, deleteUser, updateUser, fetchDepartments, uploadUsersCSV } from "../services/api";
import {
  Users, UserPlus, FileUp, Upload, CheckCircle,
  AlertTriangle, User, Loader2, Save, Hash, Tag,
  Building, Calendar, Shield, Trash2, X, PlusCircle, AlertCircle, Pencil, Check, Search, Filter, RotateCcw, ArrowUpDown, ChevronUp, ChevronDown
} from "lucide-react";

const ROLES = ["admin", "hod", "faculty", "student"];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "", email: "", password: "", role: "student",
    department_id: "", roll_number: "", year: "", section: "", admission_year: "",
  });
  const [formMsg, setFormMsg] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [accessDeniedMsg, setAccessDeniedMsg] = useState("");

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState("asc"); // "asc" | "desc"

  // CSV upload state
  const [csvFile, setCsvFile] = useState(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [csvError, setCsvError] = useState("");
  const [showCsvUpload, setShowCsvUpload] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = currentUser.role === "admin";

  // Filtered users
  const filteredUsers = useMemo(() => {
    let list = users;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.student_profile?.roll_number?.toLowerCase().includes(q)
      );
    }
    if (filterRole) list = list.filter(u => u.role === filterRole);
    if (filterDept) list = list.filter(u => String(u.department_id) === filterDept);
    if (filterYear) list = list.filter(u => u.student_profile?.year === parseInt(filterYear));
    if (filterSection) list = list.filter(u => u.student_profile?.section?.toLowerCase() === filterSection.toLowerCase());

    // Sort
    if (sortKey) {
      list = [...list].sort((a, b) => {
        let va, vb;
        switch (sortKey) {
          case "id": va = a.id; vb = b.id; break;
          case "name": va = (a.name || "").toLowerCase(); vb = (b.name || "").toLowerCase(); break;
          case "email": va = (a.email || "").toLowerCase(); vb = (b.email || "").toLowerCase(); break;
          case "role": va = a.role; vb = b.role; break;
          case "department": va = (a.department_code || a.department_name || "").toLowerCase(); vb = (b.department_code || b.department_name || "").toLowerCase(); break;
          case "roll": va = (a.student_profile?.roll_number || "").toLowerCase(); vb = (b.student_profile?.roll_number || "").toLowerCase(); break;
          case "year": va = a.student_profile?.year || 0; vb = b.student_profile?.year || 0; break;
          case "section": va = (a.student_profile?.section || "").toLowerCase(); vb = (b.student_profile?.section || "").toLowerCase(); break;
          case "admission": va = a.student_profile?.admission_year || 0; vb = b.student_profile?.admission_year || 0; break;
          default: return 0;
        }
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [users, searchQuery, filterRole, filterDept, filterYear, filterSection, sortKey, sortDir]);

  const hasActiveFilters = searchQuery || filterRole || filterDept || filterYear || filterSection;
  const clearFilters = () => { setSearchQuery(""); setFilterRole(""); setFilterDept(""); setFilterYear(""); setFilterSection(""); setSortKey(""); setSortDir("asc"); };

  const toggleSort = (key) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortKey(""); setSortDir("asc"); }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };
  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ArrowUpDown size={11} style={{ marginLeft: 3, opacity: 0.3, verticalAlign: "text-bottom" }} />;
    return sortDir === "asc"
      ? <ChevronUp size={12} style={{ marginLeft: 2, verticalAlign: "text-bottom", color: "var(--primary-700)" }} />
      : <ChevronDown size={12} style={{ marginLeft: 2, verticalAlign: "text-bottom", color: "var(--primary-700)" }} />;
  };

  // Unique sections from current users
  const availableSections = useMemo(() => {
    const secs = new Set();
    users.forEach(u => { if (u.student_profile?.section) secs.add(u.student_profile.section); });
    return [...secs].sort();
  }, [users]);

  const loadUsers = () => {
    setLoading(true);
    setError("");
    fetchUsers()
      .then((data) => setUsers(data.users || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const loadDepartments = () => {
    if (!isAdmin && currentUser.role !== "hod") return;
    fetchDepartments()
      .then((data) => setDepartments(data.departments || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadUsers();
    loadDepartments();
  }, []);

  const isFaculty = currentUser.role === "faculty";
  const creatableRoles = isAdmin ? ROLES : isFaculty ? ["student"] : ["faculty", "student"];

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormMsg("");
    setCreating(true);
    try {
      const body = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        department_id: formData.department_id ? parseInt(formData.department_id) : null,
      };
      // Student-specific fields
      if (formData.role === "student") {
        body.roll_number = formData.roll_number;
        if (formData.year) body.year = parseInt(formData.year);
        if (formData.section) body.section = formData.section;
        if (formData.admission_year) body.admission_year = parseInt(formData.admission_year);
      }

      const data = await createUser(body);
      setFormMsg(` ${data.user.name} created as ${data.user.role}`);
      setFormData({ name: "", email: "", password: "", role: "student", department_id: "", roll_number: "", year: "", section: "", admission_year: "" });
      loadUsers();
    } catch (err) {
      setFormMsg(" " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete user "${user.name}" (${user.email})?`)) return;
    setDeletingId(user.id);
    try {
      await deleteUser(user.id);
      loadUsers();
    } catch (err) {
      alert(" " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const startEditing = (u) => {
    // Access control — show in-page banner if not allowed
    if (currentUser.role === "faculty" && u.role !== "student") {
      setAccessDeniedMsg("Access Denied: Faculty can only edit student records.");
      setTimeout(() => setAccessDeniedMsg(""), 4000);
      return;
    }
    if (currentUser.role === "hod" && (u.role === "admin" || u.role === "hod")) {
      setAccessDeniedMsg("Access Denied: HOD cannot edit Admin or HOD records.");
      setTimeout(() => setAccessDeniedMsg(""), 4000);
      return;
    }
    setAccessDeniedMsg("");
    setEditingId(u.id);
    setShowForm(false);
    setShowCsvUpload(false);
    setEditForm({
      name: u.name || "",
      email: u.email || "",
      role: u.role || "",
      department_id: u.department_id || "",
      roll_number: u.student_profile?.roll_number || "",
      year: u.student_profile?.year || "",
      section: u.student_profile?.section || "",
      admission_year: u.student_profile?.admission_year || "",
    });
  };

  const handleUpdate = async () => {
    setEditSaving(true);
    try {
      const body = { name: editForm.name, email: editForm.email };
      if (editForm.department_id) body.department_id = parseInt(editForm.department_id);
      if (editForm.roll_number) body.roll_number = editForm.roll_number;
      if (editForm.year) body.year = parseInt(editForm.year);
      if (editForm.section) body.section = editForm.section;
      if (editForm.admission_year) body.admission_year = parseInt(editForm.admission_year);
      await updateUser(editingId, body);
      setEditingId(null);
      loadUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  if (loading)
    return (
      <div style={styles.loadingBox}>
        <div style={styles.spinner} />
        <p style={styles.msg}><Loader2 size={16} style={{ animation: "spin 0.7s linear infinite", marginRight: 6, verticalAlign: "middle" }} /> Loading users...</p>
      </div>
    );
  if (error)
    return (
      <div style={styles.errorBox}>
        <p style={{ ...styles.msg, color: "#dc2626" }}><AlertCircle size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> {error}</p>
        <button onClick={loadUsers} style={styles.retryBtn}>Retry</button>
      </div>
    );

  const roleBadge = (role) => ({
    ...styles.badge,
    background: role === "admin" ? "#1e3a5f" : role === "hod" ? "#c2410c" : role === "faculty" ? "#0f766e" : "#15803d",
  });

  const handleCsvUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) return;
    setCsvUploading(true);
    setCsvResult(null);
    setCsvError("");
    try {
      const data = await uploadUsersCSV(csvFile);
      setCsvResult(data);
      setCsvFile(null);
      e.target.reset();
      loadUsers();
    } catch (err) {
      setCsvError(err.message);
    } finally {
      setCsvUploading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h2 style={styles.heading}><Users size={22} style={{ marginRight: 8, verticalAlign: "text-bottom" }} /> User Management</h2>
        <div style={styles.headerActions}>
          <button onClick={() => { setShowCsvUpload(!showCsvUpload); setShowForm(false); }} style={styles.csvToggleBtn}>
            {showCsvUpload ? <><X size={14} style={{ marginRight: 4, verticalAlign: "text-bottom" }} /> Close</> : <><FileUp size={14} style={{ marginRight: 4, verticalAlign: "text-bottom" }} /> Upload CSV</>}
          </button>
          <button onClick={() => { setShowForm(!showForm); setShowCsvUpload(false); }} style={styles.addBtn}>
            {showForm ? <><X size={14} style={{ marginRight: 4, verticalAlign: "text-bottom" }} /> Close</> : <><UserPlus size={14} style={{ marginRight: 4, verticalAlign: "text-bottom" }} /> Create User</>}
          </button>
        </div>
      </div>

      {/* Access Denied Banner */}
      {accessDeniedMsg && (
        <div style={styles.accessDeniedBanner}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontWeight: 600 }}>{accessDeniedMsg}</span>
          <button onClick={() => setAccessDeniedMsg("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontWeight: 700, fontSize: "1.1rem" }}>&times;</button>
        </div>
      )}

      {/* ── CSV Upload Section ─────────────────────────────────────────── */}
      {showCsvUpload && (
        <div style={styles.csvSection}>
          <h3 style={styles.csvTitle}><Upload size={18} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Bulk Create Users via CSV</h3>
          <div style={styles.csvFormatBox}>
            <strong style={{ fontSize: "0.85rem" }}>Required columns:</strong>
            <code style={styles.csvCode}>name, email, password, role</code>
            <strong style={{ fontSize: "0.85rem", marginTop: "0.5rem", display: "block" }}>Optional columns:</strong>
            <code style={styles.csvCode}>department_code, roll_number, year, section, admission_year</code>
            <div style={styles.csvNotes}>
              <p> <strong>Admin</strong>: Can create any role. Must include <code>department_code</code> for non-admin roles.</p>
              <p> <strong>HOD</strong>: Can create only <code>faculty</code> and <code>student</code>. Department is auto-assigned.</p>
              <p> Students require <code>roll_number</code>. Duplicate emails/roll numbers are skipped.</p>
            </div>
          </div>
          <form onSubmit={handleCsvUpload} style={styles.csvForm}>
            <label style={styles.csvFileLabel}>
              {csvFile ? ` ${csvFile.name}` : "Choose CSV file..."}
              <input type="file" accept=".csv" onChange={(e) => { setCsvFile(e.target.files[0] || null); setCsvResult(null); setCsvError(""); }} style={{ display: "none" }} />
            </label>
            <button type="submit" disabled={!csvFile || csvUploading} style={{ ...styles.csvSubmitBtn, ...(!csvFile || csvUploading ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}>
              {csvUploading ? <><Loader2 size={14} style={{ marginRight: 6, animation: "spin 0.7s linear infinite", verticalAlign: "text-bottom" }} /> Uploading...</> : <><Upload size={14} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Upload</>}
            </button>
          </form>
          {csvError && <div style={styles.csvErrorBox}><AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> {csvError}</div>}
          {csvResult && (
            <div style={styles.csvSuccessBox}>
              <strong><CheckCircle size={16} color="#16a34a" style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> {csvResult.message}</strong>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem" }}>Users created: <strong>{csvResult.users_created}</strong></p>
              {csvResult.errors?.length > 0 && (
                <div style={styles.csvWarningBox}>
                  <strong><AlertTriangle size={14} color="#d97706" style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Some rows had issues:</strong>
                  <ul style={styles.csvErrorList}>
                    {csvResult.errors.map((err, i) => <li key={i} style={styles.csvErrorItem}>{err}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div style={{ marginTop: "0.75rem" }}>
            <strong style={{ fontSize: "0.85rem" }}> Example CSV (students):</strong>
            <pre style={styles.csvExample}>{`name,email,password,role,department_code,roll_number,year,section,admission_year
Rahul Joshi,rahul@test.com,pass123,student,CSE,CSE2024001,1,A,2024
Priya Sharma,priya@test.com,pass123,student,ECE,ECE2024001,2,B,2023`}</pre>
            <strong style={{ fontSize: "0.85rem" }}> Example CSV (mixed roles):</strong>
            <pre style={styles.csvExample}>{`name,email,password,role,department_code,roll_number,year,section
Dr. Kumar,kumar@test.com,pass123,faculty,CSE,,,
Ankita Rao,ankita@test.com,pass123,student,CSE,CSE2024010,1,A`}</pre>
          </div>
        </div>
      )}

      {/* Create User Form */}
      {showForm && (
        <form onSubmit={handleCreate} style={styles.form}>
          <h3 style={styles.formTitle}>Create New User</h3>
          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={styles.input} placeholder="Full name" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required style={styles.input} placeholder="user@example.com" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required style={styles.input} placeholder="••••••••" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Role</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} style={styles.input}>
                {creatableRoles.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
            {/* Department dropdown — shown for non-admin roles */}
            {formData.role !== "admin" && (
              <div style={styles.field}>
                <label style={styles.label}>Department</label>
                {isAdmin ? (
                  <select value={formData.department_id} onChange={(e) => setFormData({ ...formData, department_id: e.target.value })} required style={styles.input}>
                    <option value="">Select department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" value="Your department (auto-assigned)" disabled style={{ ...styles.input, opacity: 0.6 }} />
                )}
              </div>
            )}
            {/* Student-specific fields */}
            {formData.role === "student" && (
              <>
                <div style={styles.field}>
                  <label style={styles.label}>Roll Number *</label>
                  <input type="text" value={formData.roll_number} onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })} required style={styles.input} placeholder="e.g. CSE2024001" />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Year</label>
                  <select value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} style={styles.input}>
                    <option value="">Select year</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Section</label>
                  <input type="text" value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })} style={styles.input} placeholder="e.g. A" />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Admission Year</label>
                  <input type="number" value={formData.admission_year} onChange={(e) => setFormData({ ...formData, admission_year: e.target.value })} style={styles.input} placeholder="e.g. 2024" />
                </div>
              </>
            )}
          </div>
          <button type="submit" disabled={creating} style={{ ...styles.submitBtn, ...(creating ? { opacity: 0.6, cursor: "not-allowed" } : {}) }}>
            {creating ? <><Loader2 size={14} style={{ marginRight: 6, animation: "spin 0.7s linear infinite", verticalAlign: "text-bottom" }} /> Creating...</> : <><Save size={14} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Create User</>}
          </button>
          {formMsg && <p style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>{formMsg}</p>}
        </form>
      )}

      {/* ── Edit User Form Panel ──────────────────────────────────────── */}
      {editingId && (
        <div style={{ ...styles.form, borderLeft: "4px solid #d97706", animation: "slideDown 0.3s ease-out" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ ...styles.formTitle, margin: 0, color: "#92400e" }}><Pencil size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Edit User — {editForm.name || ""}</h3>
            <button onClick={() => setEditingId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray-400)" }}><X size={18} /></button>
          </div>
          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Name</label>
              <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={styles.input} placeholder="Full name" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} style={styles.input} placeholder="user@example.com" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Role</label>
              <input type="text" value={editForm.role} disabled style={{ ...styles.input, opacity: 0.6, textTransform: "capitalize" }} />
            </div>
            {/* Department dropdown — admin only */}
            {editForm.role !== "admin" && (
              <div style={styles.field}>
                <label style={styles.label}>Department</label>
                {isAdmin ? (
                  <select value={editForm.department_id} onChange={e => setEditForm({ ...editForm, department_id: e.target.value })} style={styles.input}>
                    <option value="">Select department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
                  </select>
                ) : (
                  <input type="text" value="Your department (auto-assigned)" disabled style={{ ...styles.input, opacity: 0.6 }} />
                )}
              </div>
            )}
            {/* Student-specific fields */}
            {editForm.role === "student" && (
              <>
                <div style={styles.field}>
                  <label style={styles.label}>Roll Number</label>
                  <input type="text" value={editForm.roll_number} onChange={e => setEditForm({ ...editForm, roll_number: e.target.value })} style={styles.input} placeholder="e.g. CSE2024001" />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Year</label>
                  <select value={editForm.year} onChange={e => setEditForm({ ...editForm, year: e.target.value })} style={styles.input}>
                    <option value="">Select year</option>
                    <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option>
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Section</label>
                  <input type="text" value={editForm.section} onChange={e => setEditForm({ ...editForm, section: e.target.value })} style={styles.input} placeholder="e.g. A" />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Admission Year</label>
                  <input type="number" value={editForm.admission_year} onChange={e => setEditForm({ ...editForm, admission_year: e.target.value })} style={styles.input} placeholder="e.g. 2024" />
                </div>
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <button onClick={handleUpdate} disabled={editSaving} style={{ ...styles.submitBtn, background: "linear-gradient(135deg, #d97706, #b45309)" }}>
              {editSaving ? <><Loader2 size={14} style={{ marginRight: 6, animation: "spin 0.7s linear infinite", verticalAlign: "text-bottom" }} /> Updating...</> : <><Save size={14} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Update User</>}
            </button>
            <button onClick={() => setEditingId(null)} style={{ ...styles.addBtn, color: "var(--gray-600)", background: "var(--gray-100)", border: "1px solid var(--gray-300)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <div style={styles.filterRow}>
          <div style={styles.searchWrap}>
            <Search size={15} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"var(--gray-400)" }} />
            <input
              type="text" placeholder="Search name, email, or roll number..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={styles.filterSelect}>
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={styles.filterSelect}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={styles.filterSelect}>
            <option value="">All Years</option>
            <option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option>
          </select>
          <select value={filterSection} onChange={e => setFilterSection(e.target.value)} style={styles.filterSelect}>
            <option value="">All Sections</option>
            {availableSections.map(s => <option key={s} value={s}>Section {s}</option>)}
          </select>

          {/* Sort Controls */}
          <div style={{ display:"flex", alignItems:"center", gap:4, borderLeft:"1.5px solid var(--gray-200)", paddingLeft:8, marginLeft:4 }}>
            <ArrowUpDown size={14} style={{ color:"var(--primary-600)", flexShrink:0 }} />
            <select value={sortKey} onChange={e => { setSortKey(e.target.value); if (!sortKey) setSortDir("asc"); }} style={styles.sortSelect}>
              <option value="">Sort by...</option>
              <option value="id">ID</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="role">Role</option>
              <option value="department">Department</option>
              <option value="roll">Roll Number</option>
              <option value="year">Year</option>
              <option value="section">Section</option>
              <option value="admission">Admission Year</option>
            </select>
            {sortKey && (
              <button onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")} style={styles.sortDirBtn} title={sortDir === "asc" ? "Ascending" : "Descending"}>
                {sortDir === "asc" ? <><ChevronUp size={13} /> Asc</> : <><ChevronDown size={13} /> Desc</>}
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button onClick={clearFilters} style={styles.clearFilterBtn} title="Clear all filters">
              <RotateCcw size={13} style={{ marginRight: 4 }} /> Clear
            </button>
          )}
        </div>
        <div style={styles.filterMeta}>
          <Filter size={13} style={{ marginRight: 4, verticalAlign:"text-bottom" }} />
          Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> users
          {hasActiveFilters && <span style={{ color:"var(--primary-700)", fontWeight:700 }}> (filtered)</span>}
        </div>
      </div>

      {/* Users Table */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.thSort} onClick={() => toggleSort("id")}>ID<SortIcon col="id" /></th>
              <th style={styles.thSort} onClick={() => toggleSort("name")}>Name<SortIcon col="name" /></th>
              <th style={styles.thSort} onClick={() => toggleSort("email")}>Email<SortIcon col="email" /></th>
              <th style={styles.thSort} onClick={() => toggleSort("role")}>Role<SortIcon col="role" /></th>
              <th style={styles.thSort} onClick={() => toggleSort("department")}>Department<SortIcon col="department" /></th>
              <th style={styles.thSort} onClick={() => toggleSort("roll")}>Roll No.<SortIcon col="roll" /></th>
              <th style={styles.thSort} onClick={() => toggleSort("year")}>Year<SortIcon col="year" /></th>
              <th style={styles.thSort} onClick={() => toggleSort("section")}>Section<SortIcon col="section" /></th>
              <th style={styles.thSort} onClick={() => toggleSort("admission")}>Admission<SortIcon col="admission" /></th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => {
              const sp = u.student_profile;
              return (
              <tr key={u.id} style={{ ...styles.tr, ...(editingId === u.id ? { background: "#fffbeb", borderLeft: "3px solid #d97706" } : {}) }}>
                <td style={styles.td}>{u.id}</td>
                <td style={styles.td}>{u.name}</td>
                <td style={styles.td}>{u.email}</td>
                <td style={styles.td}>
                  <span style={roleBadge(u.role)}>{u.role}</span>
                </td>
                <td style={styles.td}>
                  <span style={styles.deptChip}>
                    {u.department_code ? `${u.department_code}` : u.department_name || "—"}
                  </span>
                </td>
                <td style={{...styles.td, fontFamily:"monospace", fontWeight:600}}>{sp?.roll_number || "—"}</td>
                <td style={{...styles.td, textAlign:"center"}}>{sp?.year || "—"}</td>
                <td style={{...styles.td, textAlign:"center"}}>{sp?.section || "—"}</td>
                <td style={{...styles.td, textAlign:"center"}}>{sp?.admission_year || "—"}</td>
                <td style={styles.td}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => startEditing(u)} style={styles.editBtn}>
                      <Pencil size={12} style={{ marginRight: 4, verticalAlign: "text-bottom" }} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      disabled={deletingId === u.id}
                      style={{ ...styles.deleteBtn, ...(deletingId === u.id ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}
                    >
                      {deletingId === u.id ? <Loader2 size={12} style={{ animation: "spin 0.7s linear infinite" }} /> : <><Trash2 size={12} style={{ marginRight: 4, verticalAlign: "text-bottom" }} /> Delete</>}
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={10} style={styles.empty}>
                  {hasActiveFilters ? (
                    <>
                      <Search size={36} color="var(--gray-300)" style={{ marginBottom: "0.5rem" }} />
                      <p style={{ margin: "0.5rem 0 0" }}>No users match your filters. <button onClick={clearFilters} style={{ color:"var(--primary-700)", background:"none", border:"none", cursor:"pointer", fontWeight:700, textDecoration:"underline" }}>Clear filters</button></p>
                    </>
                  ) : (
                    <>
                  <Users size={36} color="var(--gray-300)" style={{ marginBottom: "0.5rem" }} />
                  <p style={{ margin: "0.5rem 0 0" }}>No users yet. Click "Create User" to add one.</p>
                    </>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: 1300, margin: "2rem auto", padding: "0 1.5rem" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" },
  heading: { fontSize: "1.5rem", fontWeight: 800, margin: 0, color: "var(--gray-900)", letterSpacing: "-0.03em" },
  addBtn: { padding: "0.5rem 1.1rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--primary-700)", background: "var(--primary-50)", border: "1px solid var(--primary-200)", borderRadius: "var(--radius-md)", cursor: "pointer", transition: "all var(--transition-fast)" },
  msg: { textAlign: "center", marginTop: "3rem", fontSize: "1.1rem", color: "var(--gray-500)" },
  accessDeniedBanner: { display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.85rem 1rem", marginBottom: "1rem", background: "#fef2f2", border: "1px solid #fecaca", borderLeft: "4px solid #dc2626", borderRadius: "0 var(--radius-md) var(--radius-md) 0", color: "#dc2626", fontSize: "0.9rem", boxShadow: "var(--shadow-md)", animation: "slideDown 0.3s ease-out" },

  /* Filters */
  filterBar: { padding: "0.85rem 1rem", marginBottom: "0.75rem", background: "var(--white)", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)" },
  filterRow: { display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" },
  searchWrap: { position: "relative", flex: "1 1 220px", minWidth: 180 },
  searchInput: { width: "100%", padding: "0.45rem 0.65rem 0.45rem 32px", border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius-md)", fontSize: "0.85rem", background: "var(--gray-50)" },
  filterSelect: { padding: "0.45rem 0.5rem", border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius-md)", fontSize: "0.82rem", background: "var(--gray-50)", color: "var(--gray-700)", cursor: "pointer", minWidth: 110 },
  clearFilterBtn: { padding: "0.4rem 0.75rem", fontSize: "0.78rem", fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--radius-md)", cursor: "pointer", display: "flex", alignItems: "center", whiteSpace: "nowrap" },
  filterMeta: { marginTop: "0.45rem", fontSize: "0.78rem", color: "var(--gray-500)" },
  sortSelect: { padding: "0.45rem 0.5rem", border: "1.5px solid var(--primary-200)", borderRadius: "var(--radius-md)", fontSize: "0.82rem", background: "var(--primary-50)", color: "var(--primary-800)", cursor: "pointer", fontWeight: 600, minWidth: 105 },
  sortDirBtn: { padding: "0.35rem 0.6rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--primary-700)", background: "var(--primary-50)", border: "1.5px solid var(--primary-200)", borderRadius: "var(--radius-md)", cursor: "pointer", display: "flex", alignItems: "center", gap: 2, whiteSpace: "nowrap" },

  /* Form */
  form: { padding: "1.25rem 1.5rem", marginBottom: "1.25rem", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-lg)", background: "var(--white)", boxShadow: "var(--shadow-md)", animation: "slideDown 0.3s ease-out" },
  formTitle: { margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, color: "var(--gray-900)" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" },
  field: { display: "flex", flexDirection: "column", gap: "0.25rem" },
  label: { fontSize: "0.78rem", fontWeight: 600, color: "var(--gray-600)", letterSpacing: "0.01em" },
  input: { padding: "0.5rem 0.65rem", border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius-md)", fontSize: "0.9rem", background: "var(--gray-50)" },
  submitBtn: { marginTop: "0.75rem", padding: "0.55rem 1.5rem", background: "var(--gradient-primary)", color: "var(--white)", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer", boxShadow: "var(--shadow-sm)" },

  /* Table */
  tableWrap: { overflowX: "auto", background: "var(--white)", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-md)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" },
  th: { textAlign: "left", padding: "0.65rem 0.85rem", borderBottom: "2px solid var(--primary-700)", background: "var(--gray-50)", whiteSpace: "nowrap", fontSize: "0.75rem", fontWeight: 700, color: "var(--gray-600)", textTransform: "uppercase", letterSpacing: "0.04em" },
  thSort: { textAlign: "left", padding: "0.65rem 0.85rem", borderBottom: "2px solid var(--primary-700)", background: "var(--gray-50)", whiteSpace: "nowrap", fontSize: "0.75rem", fontWeight: 700, color: "var(--gray-600)", textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", userSelect: "none", transition: "color 0.15s" },
  tr: { borderBottom: "1px solid var(--gray-100)", transition: "background var(--transition-fast)" },
  td: { padding: "0.55rem 0.85rem" },
  badge: { display: "inline-block", padding: "0.22rem 0.7rem", borderRadius: "var(--radius-full)", color: "var(--white)", fontSize: "0.78rem", fontWeight: 700, textTransform: "capitalize" },
  deptChip: { fontSize: "0.82rem", color: "var(--primary-700)", fontWeight: 600, background: "var(--primary-50)", padding: "0.2rem 0.55rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--primary-100)" },
  deleteBtn: { padding: "0.3rem 0.7rem", fontSize: "0.78rem", fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--radius-sm)", cursor: "pointer", transition: "all var(--transition-fast)" },
  editBtn: { padding: "0.3rem 0.7rem", fontSize: "0.78rem", fontWeight: 700, color: "var(--primary-700)", background: "var(--primary-50)", border: "1px solid var(--primary-200)", borderRadius: "var(--radius-sm)", cursor: "pointer", transition: "all var(--transition-fast)" },
  editInput: { padding: "0.35rem 0.5rem", border: "1.5px solid var(--primary-300)", borderRadius: 6, fontSize: "0.85rem", width: "100%", background: "var(--white)" },
  editInputSm: { padding: "0.3rem 0.45rem", border: "1.5px solid var(--primary-300)", borderRadius: 6, fontSize: "0.82rem", width: 100, background: "var(--white)" },
  saveEditBtn: { padding: "0.3rem 0.7rem", fontSize: "0.78rem", fontWeight: 700, color: "#fff", background: "#059669", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", display: "flex", alignItems: "center" },
  cancelEditBtn: { padding: "0.3rem 0.7rem", fontSize: "0.78rem", fontWeight: 700, color: "var(--gray-600)", background: "var(--gray-100)", border: "1px solid var(--gray-300)", borderRadius: "var(--radius-sm)", cursor: "pointer", display: "flex", alignItems: "center" },
  empty: { textAlign: "center", padding: "2rem", color: "var(--gray-400)" },
  loadingBox: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5rem 1rem", gap: "1rem" },
  spinner: { width: 40, height: 40, border: "3px solid var(--gray-200)", borderTop: "3px solid var(--primary-700)", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  errorBox: { display: "flex", flexDirection: "column", alignItems: "center", padding: "3rem 1rem", gap: "0.75rem" },
  retryBtn: { padding: "0.5rem 1.3rem", background: "var(--gradient-primary)", color: "var(--white)", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer", boxShadow: "var(--shadow-sm)" },

  /* Header actions */
  headerActions: { display: "flex", gap: "0.5rem" },
  csvToggleBtn: { padding: "0.5rem 1.1rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--accent-700)", background: "var(--accent-50)", border: "1px solid var(--accent-700)", borderRadius: "var(--radius-md)", cursor: "pointer", transition: "all var(--transition-fast)" },

  /* CSV Upload */
  csvSection: { padding: "1.25rem 1.5rem", marginBottom: "1.25rem", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-lg)", background: "var(--white)", boxShadow: "var(--shadow-md)", animation: "slideDown 0.3s ease-out" },
  csvTitle: { margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, color: "var(--gray-900)" },
  csvFormatBox: { padding: "0.85rem 1rem", background: "var(--gray-50)", borderRadius: "var(--radius-md)", marginBottom: "0.75rem", border: "1px solid var(--gray-200)" },
  csvCode: { display: "block", padding: "0.45rem 0.7rem", background: "var(--gray-900)", color: "#e2e8f0", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", marginTop: "0.25rem", fontFamily: "'JetBrains Mono', monospace" },
  csvNotes: { marginTop: "0.5rem", fontSize: "0.82rem", color: "var(--gray-600)", display: "flex", flexDirection: "column", gap: "0.25rem" },
  csvForm: { display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.75rem" },
  csvFileLabel: { flex: 1, display: "block", padding: "0.7rem 1rem", background: "var(--gray-50)", border: "2px dashed var(--gray-300)", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "0.9rem", color: "var(--gray-500)", textAlign: "center", transition: "all var(--transition-fast)" },
  csvSubmitBtn: { padding: "0.65rem 1.3rem", background: "var(--gradient-accent)", color: "var(--white)", border: "none", borderRadius: "var(--radius-md)", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "var(--shadow-sm)" },
  csvErrorBox: { padding: "0.65rem 0.85rem", background: "#fef2f2", color: "#dc2626", borderRadius: "var(--radius-md)", border: "1px solid #fecaca", fontSize: "0.85rem", marginBottom: "0.5rem" },
  csvSuccessBox: { padding: "0.85rem 1rem", background: "#f0fdf4", borderRadius: "var(--radius-md)", border: "1px solid #bbf7d0", marginBottom: "0.5rem" },
  csvWarningBox: { marginTop: "0.5rem", padding: "0.55rem 0.85rem", background: "#fffbeb", borderRadius: "var(--radius-md)", border: "1px solid #fde68a" },
  csvErrorList: { margin: "0.25rem 0 0", paddingLeft: "1.25rem", fontSize: "0.82rem" },
  csvErrorItem: { marginBottom: "0.2rem", color: "#92400e" },
  csvExample: { padding: "0.55rem 0.85rem", background: "var(--gray-900)", color: "#e2e8f0", borderRadius: "var(--radius-md)", fontSize: "0.75rem", overflowX: "auto", lineHeight: 1.5, marginTop: "0.25rem", marginBottom: "0.5rem", fontFamily: "'JetBrains Mono', monospace" },
};
