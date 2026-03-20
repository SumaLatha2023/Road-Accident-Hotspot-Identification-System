from flask import Flask, request, jsonify
import joblib
import pandas as pd
import numpy as np

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB

model = joblib.load("accident_rf_model.pkl")

EXPECTED_FEATURES = [
    "longitude", "latitude", "Number_of_Vehicles", "Number_of_Casualties",
    "Day_of_Week", "1st_Road_Class", "Road_Type", "Speed_limit",
    "Junction_Detail", "Junction_Control", "2nd_Road_Class",
    "Pedestrian_Crossing-Human_Control", "Pedestrian_Crossing-Physical_Facilities",
    "Light_Conditions", "Weather_Conditions", "Road_Surface_Conditions",
    "Special_Conditions_at_Site", "Carriageway_Hazards", "Urban_or_Rural_Area",
    "Time_numeric", "Month", "Is_Weekend",
]

def risk_category(prob):
    """
    Adjusted thresholds — Random Forest on accident data naturally
    predicts low probabilities across the board due to class imbalance.
    Thresholds tuned so roughly: 60% Low, 30% Medium, 10% High.
    """
    if prob < 0.16:
        return "Low"
    elif prob < 0.24:
        return "Medium"
    else:
        return "High"

@app.route("/")
def home():
    return "Accident Risk Prediction API Running"

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No input data provided"}), 400
        missing = [f for f in EXPECTED_FEATURES if f not in data]
        if missing:
            return jsonify({"error": f"Missing features: {missing}"}), 400
        df = pd.DataFrame([{f: data[f] for f in EXPECTED_FEATURES}])
        probability = model.predict_proba(df)[0][1]
        return jsonify({
            "accident_probability": round(float(probability), 4),
            "risk_level": risk_category(probability)
        })
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

@app.route("/predict-batch", methods=["POST"])
def predict_batch():
    try:
        data = request.json
        if not data or "records" not in data:
            return jsonify({"error": "Expected { records: [...] }"}), 400

        records = data["records"]
        if len(records) == 0:
            return jsonify({"results": []}), 200

        df = pd.DataFrame(records)[EXPECTED_FEATURES]
        df.replace(-1, np.nan, inplace=True)
        df.fillna(df.median(numeric_only=True), inplace=True)

        probabilities = model.predict_proba(df)[:, 1]

        # Print distribution so we can verify thresholds are working
        print(f"Prob stats — min: {probabilities.min():.3f}, "
              f"max: {probabilities.max():.3f}, "
              f"mean: {probabilities.mean():.3f}, "
              f"median: {np.median(probabilities):.3f}")

        results = [
            {
                "lat":  float(records[i]["latitude"]),
                "lng":  float(records[i]["longitude"]),
                "risk": risk_category(float(probabilities[i])),
                "prob": round(float(probabilities[i]), 4)
            }
            for i in range(len(records))
        ]

        # Print risk distribution
        from collections import Counter
        dist = Counter(r["risk"] for r in results)
        print(f"Risk distribution: {dict(dist)}")

        return jsonify({"results": results})

    except Exception as e:
        return jsonify({"error": f"Batch prediction failed: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5001)