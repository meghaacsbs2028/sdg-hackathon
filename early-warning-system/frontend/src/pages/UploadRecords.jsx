import { useState } from "react";
import { uploadCSV } from "../services/api";
import {
  FileUp, FileSpreadsheet, Upload, CheckCircle,
  AlertTriangle, FileCode2, Loader2
} from "lucide-react";

export default function UploadRecords() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
    setResult(null);
    setError("");
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setResult(null);
    setError("");

    try {
      const data = await uploadCSV(file);
      setResult(data);
      setFile(null);
      // Reset the file input
      e.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}><FileUp size={22} style={{ marginRight: 8, verticalAlign: "text-bottom" }} /> Upload Academic Records</h2>
      <p style={styles.subtext}>
        Upload a CSV file to bulk-insert academic records for students in your department.
      </p>

      {/* CSV Format Guide */}
      <div style={styles.formatBox}>
        <h4 style={styles.formatTitle}><FileSpreadsheet size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Required CSV Format</h4>
        <code style={styles.formatCode}>
          roll_number,term,attendance,internal_marks,assignment_score,lms_activity,stress_score
        </code>
        <div style={styles.formatNotes}>
          <p><strong>roll_number</strong> — Must match existing student in your department</p>
          <p><strong>term</strong> — e.g. "Sem1", "Midterm1", "Sem2"</p>
          <p>Records are <strong>appended</strong> — old records are never overwritten</p>
        </div>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleUpload} style={styles.form}>
        <div style={styles.fileInputWrapper}>
          <label style={styles.fileLabel}>
            {file ? <><FileSpreadsheet size={14} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> {file.name}</> : "Choose CSV file..."}
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={!file || uploading}
          style={{
            ...styles.uploadBtn,
            ...(!file || uploading ? styles.uploadBtnDisabled : {}),
          }}
        >
          {uploading ? <><Loader2 size={14} style={{ marginRight: 6, animation: "spin 0.7s linear infinite", verticalAlign: "text-bottom" }} /> Uploading...</> : <><Upload size={14} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Upload Records</>}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div style={styles.errorBox}>
          <strong><AlertTriangle size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Upload Failed</strong>
          <p style={{ margin: "0.25rem 0 0" }}>{error}</p>
        </div>
      )}

      {/* Success Result */}
      {result && (
        <div style={styles.successBox}>
          <strong><CheckCircle size={16} color="#16a34a" style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> {result.message}</strong>
          <p style={styles.resultDetail}>
            Records added: <strong>{result.records_added}</strong>
          </p>

          {/* Show any row-level errors */}
          {result.errors?.length > 0 && (
            <div style={styles.warningBox}>
              <strong><AlertTriangle size={14} color="#d97706" style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Some rows had issues:</strong>
              <ul style={styles.errorList}>
                {result.errors.map((err, i) => (
                  <li key={i} style={styles.errorItem}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Example CSV */}
      <div style={styles.exampleSection}>
        <h4 style={styles.exampleTitle}><FileCode2 size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Example CSV</h4>
        <pre style={styles.examplePre}>
{`roll_number,term,attendance,internal_marks,assignment_score,lms_activity,stress_score
CSE2024001,Sem1,85.0,72.0,78.0,65.0,30.0
CSE2024002,Sem1,60.0,45.0,50.0,35.0,75.0
CSE2024003,Sem1,92.0,88.0,90.0,80.0,20.0`}
        </pre>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 640,
    margin: "2rem auto",
    padding: "0 1.5rem",
  },
  heading: { fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.25rem", letterSpacing: "-0.03em", color: "var(--gray-900)" },
  subtext: { color: "var(--gray-500)", marginBottom: "1.5rem", fontSize: "0.9rem" },

  /* Format Guide */
  formatBox: {
    padding: "1.25rem 1.5rem",
    background: "var(--white)",
    borderRadius: "var(--radius-lg)",
    marginBottom: "1.25rem",
    border: "1px solid var(--gray-200)",
    boxShadow: "var(--shadow-md)",
  },
  formatTitle: { margin: "0 0 0.6rem", fontSize: "0.95rem", fontWeight: 700, color: "var(--gray-900)" },
  formatCode: {
    display: "block",
    padding: "0.65rem 0.85rem",
    background: "var(--gray-900)",
    color: "#e2e8f0",
    borderRadius: "var(--radius-md)",
    fontSize: "0.8rem",
    overflowX: "auto",
    whiteSpace: "nowrap",
    fontFamily: "'JetBrains Mono', monospace",
  },
  formatNotes: {
    marginTop: "0.75rem",
    fontSize: "0.82rem",
    color: "var(--gray-600)",
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
  },

  /* Upload Form */
  form: {
    display: "flex",
    gap: "0.75rem",
    alignItems: "center",
    marginBottom: "1.25rem",
  },
  fileInputWrapper: { flex: 1 },
  fileLabel: {
    display: "block",
    padding: "0.75rem 1rem",
    background: "var(--gray-50)",
    border: "2px dashed var(--gray-300)",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    fontSize: "0.9rem",
    color: "var(--gray-500)",
    textAlign: "center",
    transition: "all var(--transition-fast)",
  },
  uploadBtn: {
    padding: "0.75rem 1.5rem",
    background: "var(--gradient-primary)",
    color: "var(--white)",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "0.9rem",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
    boxShadow: "var(--shadow-md)",
  },
  uploadBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },

  /* Results */
  errorBox: {
    padding: "0.85rem 1.1rem",
    background: "#fef2f2",
    color: "#dc2626",
    borderRadius: "var(--radius-md)",
    border: "1px solid #fecaca",
    fontSize: "0.88rem",
    marginBottom: "1rem",
  },
  successBox: {
    padding: "1rem 1.25rem",
    background: "#f0fdf4",
    borderRadius: "var(--radius-md)",
    border: "1px solid #bbf7d0",
    marginBottom: "1rem",
  },
  resultDetail: {
    margin: "0.5rem 0 0",
    fontSize: "0.9rem",
    color: "var(--gray-700)",
  },
  warningBox: {
    marginTop: "0.75rem",
    padding: "0.75rem",
    background: "#fffbeb",
    borderRadius: "var(--radius-md)",
    border: "1px solid #fde68a",
  },
  errorList: {
    margin: "0.25rem 0 0",
    paddingLeft: "1.25rem",
    fontSize: "0.82rem",
  },
  errorItem: { marginBottom: "0.2rem", color: "#92400e" },

  /* Example */
  exampleSection: {
    marginTop: "1.5rem",
  },
  exampleTitle: { fontSize: "0.95rem", fontWeight: 700, margin: "0 0 0.5rem", color: "var(--gray-900)" },
  examplePre: {
    padding: "0.85rem 1rem",
    background: "var(--gray-900)",
    color: "#e2e8f0",
    borderRadius: "var(--radius-md)",
    fontSize: "0.78rem",
    overflowX: "auto",
    lineHeight: 1.6,
    fontFamily: "'JetBrains Mono', monospace",
  },
};
