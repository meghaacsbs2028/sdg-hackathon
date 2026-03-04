"""
train_model.py
--------------
Generates a synthetic student dataset, trains a Logistic Regression
classifier to predict at-risk students, prints accuracy, and saves
the trained model as risk_model.pkl in the same directory.

Run from the backend/ directory (with venv activated):
    python ml/train_model.py
"""

import os
import pickle
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report

# ── 1. Generate synthetic dataset ────────────────────────────────────────────
np.random.seed(42)
N = 500

data = pd.DataFrame({
    "attendance":       np.random.randint(50, 101, N),
    "internal_marks":   np.random.randint(0,  101, N),
    "assignment_score": np.random.randint(0,  101, N),
    "lms_activity":     np.random.randint(0,  101, N),
})

# ── 2. Create at_risk label ───────────────────────────────────────────────────
data["at_risk"] = (
    (data["attendance"]       < 65) |
    (data["internal_marks"]   < 50) |
    (data["assignment_score"] < 50) |
    (data["lms_activity"]     < 40)
).astype(int)

print(f"Dataset shape : {data.shape}")
print(f"At-risk count : {data['at_risk'].sum()} / {N}")
print(f"Safe count    : {(data['at_risk'] == 0).sum()} / {N}\n")

# ── 3. Train Logistic Regression ──────────────────────────────────────────────
FEATURES = ["attendance", "internal_marks", "assignment_score",
            "lms_activity"]

X = data[FEATURES].values
y = data["at_risk"].values

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)

model = LogisticRegression(max_iter=1000, random_state=42)
model.fit(X_train_scaled, y_train)

# ── 4. Print accuracy ─────────────────────────────────────────────────────────
y_pred = model.predict(X_test_scaled)
accuracy = accuracy_score(y_test, y_pred)
print(f"Model Accuracy : {accuracy * 100:.2f}%\n")
print("Classification Report:")
print(classification_report(y_test, y_pred, target_names=["Safe", "At-Risk"]))

# ── 5. Save model + scaler as risk_model.pkl ─────────────────────────────────
save_path = os.path.join(os.path.dirname(__file__), "risk_model.pkl")
with open(save_path, "wb") as f:
    pickle.dump({"model": model, "scaler": scaler, "features": FEATURES}, f)

print(f"✅ Model saved to: {save_path}")
