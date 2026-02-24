import { useState } from "react";

const fields = [
  { name: "attendance", label: "Attendance (%)", min: 50, max: 100 },
  { name: "internal_marks", label: "Internal Marks", min: 0, max: 100 },
  { name: "assignment_score", label: "Assignment Score", min: 0, max: 100 },
  { name: "lms_activity", label: "LMS Activity", min: 0, max: 100 },
  { name: "stress_score", label: "Stress Score", min: 0, max: 100 },
];

const badgeColor = {
  Green: "#16a34a",
  Yellow: "#ca8a04",
  Red: "#dc2626",
};

export default function Dashboard() {
  const [form, setForm] = useState({
    attendance: "",
    internal_marks: "",
    assignment_score: "",
    lms_activity: "",
    stress_score: "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    const payload = {};
    for (const f of fields) {
      payload[f.name] = parseFloat(form[f.name]);
    }

    try {
      const res = await fetch("http://localhost:8000/predictions/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Prediction failed");
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>🎓 Student Risk Prediction</h2>
      <p style={styles.subtext}>Enter student metrics to predict dropout risk.</p>

      <form onSubmit={handleSubmit} style={styles.form}>
        {fields.map((f) => (
          <div key={f.name} style={styles.fieldGroup}>
            <label style={styles.label}>{f.label}</label>
            <input
              type="number"
              name={f.name}
              value={form[f.name]}
              onChange={handleChange}
              min={f.min}
              max={f.max}
              required
              style={styles.input}
              placeholder={`${f.min} – ${f.max}`}
            />
          </div>
        ))}

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Predicting..." : "🔍 Predict Risk"}
        </button>
      </form>

      {error && <p style={styles.error}>❌ {error}</p>}

      {result && (
        <div style={styles.resultCard}>
          <h3 style={styles.resultTitle}>Prediction Result</h3>
          <p style={styles.score}>
            Risk Score: <strong>{result.risk_score.toFixed(2)}</strong>
          </p>
          <span
            style={{
              ...styles.badge,
              backgroundColor: badgeColor[result.risk_level] || "#888",
            }}
          >
            {result.risk_level}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Inline styles ─────────────────────────────────────────────────────────── */
const styles = {
  container: {
    maxWidth: 500,
    margin: "2rem auto",
    padding: "2rem",
    fontFamily: "'Segoe UI', sans-serif",
  },
  heading: {
    fontSize: "1.6rem",
    marginBottom: "0.25rem",
  },
  subtext: {
    color: "#666",
    marginBottom: "1.5rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  label: {
    fontWeight: 600,
    fontSize: "0.9rem",
  },
  input: {
    padding: "0.5rem 0.75rem",
    fontSize: "1rem",
    border: "1px solid #ccc",
    borderRadius: 6,
    outline: "none",
  },
  button: {
    marginTop: "0.5rem",
    padding: "0.7rem",
    fontSize: "1rem",
    fontWeight: 600,
    color: "#fff",
    backgroundColor: "#1e3a5f",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  error: {
    color: "#dc2626",
    marginTop: "1rem",
  },
  resultCard: {
    marginTop: "1.5rem",
    padding: "1.25rem",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    textAlign: "center",
  },
  resultTitle: {
    marginBottom: "0.5rem",
    fontSize: "1.1rem",
  },
  score: {
    fontSize: "1.2rem",
    marginBottom: "0.75rem",
  },
  badge: {
    display: "inline-block",
    padding: "0.4rem 1.2rem",
    color: "#fff",
    fontWeight: 700,
    fontSize: "1rem",
    borderRadius: 20,
    letterSpacing: "0.5px",
  },
};
