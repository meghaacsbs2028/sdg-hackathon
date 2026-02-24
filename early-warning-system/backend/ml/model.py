"""
ML module: Logistic Regression model for student dropout risk prediction.
This is a placeholder — training logic will be added in the next phase.
"""
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler


class RiskPredictor:
    """Wrapper around a Scikit-learn Logistic Regression classifier."""

    def __init__(self):
        self.model = LogisticRegression(max_iter=1000, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False

    def train(self, X: np.ndarray, y: np.ndarray):
        """Train the model on provided feature matrix and labels."""
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)
        self.is_trained = True

    def predict(self, features: list) -> dict:
        """
        Predict dropout risk for a single student.

        Args:
            features: [cgpa, attendance_percentage, backlogs, ...]

        Returns:
            dict with risk_score (0-1) and risk_label (Low/Medium/High)
        """
        if not self.is_trained:
            return {"risk_score": 0.0, "risk_label": "Unknown", "error": "Model not trained yet"}

        X = np.array(features).reshape(1, -1)
        X_scaled = self.scaler.transform(X)
        prob = self.model.predict_proba(X_scaled)[0][1]

        if prob < 0.33:
            label = "Low"
        elif prob < 0.66:
            label = "Medium"
        else:
            label = "High"

        return {"risk_score": round(float(prob), 4), "risk_label": label}


# Module-level singleton
predictor = RiskPredictor()
