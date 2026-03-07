"""
train_model.py
--------------
Generates a realistic synthetic student dataset (2000 students),
trains a Random Forest classifier with 5 features to predict at-risk
students, prints accuracy + feature importances, and saves the model.

Features:
  1. attendance        (0-100)
  2. internal_marks    (0-100)
  3. assignment_score  (0-100)
  4. lms_activity      (0-100)  — LeetCode / coding activity
  5. competition_score (0-100)  — normalized competition score

Run:  python ml/train_model.py
"""

import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report

np.random.seed(42)

# ── 1. Generate realistic correlated data ────────────────────────────────────
N = 2000

# Create student "archetypes" with realistic distributions
# Proportions: ~30% strong, ~35% average, ~20% weak, ~15% at-risk
archetype = np.random.choice(
    ["strong", "average", "weak", "at_risk"],
    size=N,
    p=[0.30, 0.35, 0.20, 0.15],
)

# Base stats per archetype (mean, std_dev)
profiles = {
    "strong":   {"att": (92, 4), "marks": (82, 8), "assign": (85, 7), "lms": (70, 12), "comp": (60, 15)},
    "average":  {"att": (78, 6), "marks": (62, 10), "assign": (60, 12), "lms": (45, 15), "comp": (30, 15)},
    "weak":     {"att": (65, 8), "marks": (42, 12), "assign": (40, 14), "lms": (25, 12), "comp": (15, 12)},
    "at_risk":  {"att": (52, 10), "marks": (30, 12), "assign": (25, 14), "lms": (15, 10), "comp": (8, 8)},
}

data = pd.DataFrame()
for feat_key, col_name in [
    ("att", "attendance"),
    ("marks", "internal_marks"),
    ("assign", "assignment_score"),
    ("lms", "lms_activity"),
    ("comp", "competition_score"),
]:
    vals = np.zeros(N)
    for i, arch in enumerate(archetype):
        mean, std = profiles[arch][feat_key]
        vals[i] = np.random.normal(mean, std)
    data[col_name] = np.clip(vals, 0, 100).round(1)

# Add inter-feature correlations (realistic noise)
# Students with low attendance tend to also have low marks
noise = np.random.normal(0, 3, N)
data["internal_marks"] = np.clip(
    data["internal_marks"] + (data["attendance"] - 70) * 0.15 + noise, 0, 100
).round(1)

# ── 2. Create at_risk label ──────────────────────────────────────────────────
# Multi-factor risk: at_risk if weak in 2+ areas
risk_flags = (
    (data["attendance"] < 65).astype(int) +
    (data["internal_marks"] < 45).astype(int) +
    (data["assignment_score"] < 40).astype(int) +
    (data["lms_activity"] < 30).astype(int) +
    (data["competition_score"] < 15).astype(int)
)

# At risk if 2+ flags, OR attendance < 55 (critical single factor)
data["at_risk"] = ((risk_flags >= 2) | (data["attendance"] < 55)).astype(int)

print(f"Dataset shape : {data.shape}")
print(f"At-risk count : {data['at_risk'].sum()} / {N} ({data['at_risk'].mean()*100:.1f}%)")
print(f"Safe count    : {(data['at_risk'] == 0).sum()} / {N}\n")

# ── 3. Train Random Forest ──────────────────────────────────────────────────
FEATURES = [
    "attendance", "internal_marks", "assignment_score",
    "lms_activity", "competition_score",
]

X = data[FEATURES].values
y = data["at_risk"].values

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

model = RandomForestClassifier(
    n_estimators=200,
    max_depth=12,
    min_samples_split=5,
    min_samples_leaf=3,
    random_state=42,
    n_jobs=-1,
)
model.fit(X_train_scaled, y_train)

# ── 4. Print accuracy + feature importances ──────────────────────────────────
y_pred = model.predict(X_test_scaled)
accuracy = accuracy_score(y_test, y_pred)
print(f"Model Accuracy : {accuracy * 100:.2f}%\n")
print("Classification Report:")
print(classification_report(y_test, y_pred, target_names=["Safe", "At-Risk"]))

print("\nFeature Importances:")
for fname, imp in sorted(zip(FEATURES, model.feature_importances_), key=lambda x: x[1], reverse=True):
    bar = "█" * int(imp * 50)
    print(f"  {fname:20s} {imp:.4f}  {bar}")

# ── 5. Compatibility: RandomForest doesn't have coef_, add a workaround ─────
# The prediction route uses model.coef_[0] for risk drivers.
# We'll store feature_importances_ as coef_ so it works seamlessly.
model.coef_ = np.array([model.feature_importances_])

# ── 6. Save model + scaler ──────────────────────────────────────────────────
save_path = os.path.join(os.path.dirname(__file__), "risk_model.pkl")
with open(save_path, "wb") as f:
    pickle.dump({"model": model, "scaler": scaler, "features": FEATURES}, f)

print(f"\n✅ Model saved to: {save_path}")
print(f"   Features: {FEATURES}")
print(f"   Algorithm: RandomForest (200 trees, depth 12)")
