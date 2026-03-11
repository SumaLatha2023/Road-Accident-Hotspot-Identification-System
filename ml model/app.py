from flask import Flask, request, jsonify
import joblib
import pandas as pd

app = Flask(__name__)

# Load the trained model
model = joblib.load("accident_rf_model.pkl")


def risk_category(prob):
    if prob < 0.30:
        return "Low"
    elif prob < 0.60:
        return "Medium"
    else:
        return "High"


@app.route("/")
def home():
    return "Accident Risk Prediction API Running"


@app.route("/predict", methods=["POST"])
def predict():

    data = request.json

    df = pd.DataFrame([data])

    probability = model.predict_proba(df)[0][1]

    risk = risk_category(probability)

    return jsonify({
        "accident_probability": float(probability),
        "risk_level": risk
    })


if __name__ == "__main__":
    app.run(debug=True)