from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import io
import os
import json
import math
import asyncio
import random
from datetime import datetime, timezone
from typing import Optional, List
from model import TransformerRiskModel

app = FastAPI(
    title="GRIDTITAN API",
    description="Backend services for AI-Powered Transformer Risk Intelligence Platform",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instance
model = TransformerRiskModel()

# Load initial data on startup
DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "sample_transformers.csv")
if os.path.exists(DATA_PATH):
    model.train(DATA_PATH)

# Load 200 transformers dataset
CHENNAI_TRANSFORMERS = []
TRANSFORMERS_JSON_PATH = os.path.join(os.path.dirname(__file__), "data", "chennai_200_transformers.json")

if os.path.exists(TRANSFORMERS_JSON_PATH):
    with open(TRANSFORMERS_JSON_PATH, "r") as f:
        CHENNAI_TRANSFORMERS = json.load(f)
else:
    # Fallback to hardcoded list if JSON is missing
    CHENNAI_TRANSFORMERS = [
        {"id": "TR-1021", "name": "Substation Adyar-A", "lat": 13.0063, "lng": 80.2574, "load": 65.2, "temperature": 55.4, "voltage": 230.1, "current": 45.2, "power": 10.1, "zone": "Adyar", "last_updated": "2026-06-22 13:00:00 UTC"},
        {"id": "TR-1022", "name": "T-Nagar Commercial Hub", "lat": 13.0418, "lng": 80.2337, "load": 92.5, "temperature": 95.2, "voltage": 210.5, "current": 120.4, "power": 25.3, "zone": "T-Nagar", "last_updated": "2026-06-22 13:05:00 UTC"},
        {"id": "TR-1023", "name": "Nungambakkam Res-Feed", "lat": 13.0569, "lng": 80.2425, "load": 110.1, "temperature": 105.8, "voltage": 198.2, "current": 145.6, "power": 28.8, "zone": "Nungambakkam", "last_updated": "2026-06-22 13:10:00 UTC"},
        {"id": "TR-1024", "name": "Mylapore Bazar Feed", "lat": 13.0330, "lng": 80.2673, "load": 45.0, "temperature": 42.1, "voltage": 231.2, "current": 30.5, "power": 7.0, "zone": "Mylapore", "last_updated": "2026-06-22 12:45:00 UTC"},
        {"id": "TR-1025", "name": "Velachery Tech Park B", "lat": 12.9815, "lng": 80.2196, "load": 78.5, "temperature": 75.0, "voltage": 222.0, "current": 82.0, "power": 17.5, "zone": "Velachery", "last_updated": "2026-06-22 13:00:00 UTC"},
        {"id": "TR-1026", "name": "Guindy Industrial Est-1", "lat": 13.0067, "lng": 80.2206, "load": 75.4, "temperature": 68.9, "voltage": 224.5, "current": 65.0, "power": 16.5, "zone": "Guindy", "last_updated": "2026-06-22 13:15:00 UTC"},
        {"id": "TR-1027", "name": "OMR IT Corridor Sub-3", "lat": 12.9156, "lng": 80.2301, "load": 88.2, "temperature": 85.4, "voltage": 215.1, "current": 110.2, "power": 23.5, "zone": "Taramani", "last_updated": "2026-06-22 13:20:00 UTC"},
        {"id": "TR-1028", "name": "Tambaram Outer Feeder", "lat": 12.9238, "lng": 80.1401, "load": 30.1, "temperature": 38.5, "voltage": 232.0, "current": 20.4, "power": 4.7, "zone": "Tambaram", "last_updated": "2026-06-22 12:30:00 UTC"},
        {"id": "TR-1029", "name": "Anna Nagar Metro Block", "lat": 13.0850, "lng": 80.2101, "load": 55.6, "temperature": 52.0, "voltage": 229.4, "current": 40.1, "power": 9.2, "zone": "Anna Nagar", "last_updated": "2026-06-22 13:12:00 UTC"},
        {"id": "TR-1030", "name": "Royapettah Substation", "lat": 13.0513, "lng": 80.2612, "load": 98.4, "temperature": 92.1, "voltage": 208.4, "current": 125.8, "power": 24.5, "zone": "Royapettah", "last_updated": "2026-06-22 13:25:00 UTC"}
    ]

class PredictionInput(BaseModel):
    transformer_id: str
    zone: Optional[str] = "Unknown"
    load: Optional[float] = None
    temperature: Optional[float] = None
    voltage: Optional[float] = None
    current: Optional[float] = None
    power: Optional[float] = None

# ── PREDICTION CACHE ────────────────────────────────────────────────────────
# Pre-computed predictions for all 200 transformers.
# Updated by live_data_simulator every 3 seconds so API endpoints are instant.
PREDICTIONS_CACHE: dict = {}   # key: transformer "id"  value: full pred dict

async def live_data_simulator():
    """Mutates transformer telemetry every 3 s and refreshes the prediction cache."""
    while True:
        for t in CHENNAI_TRANSFORMERS:
            # Perturb telemetry
            t["load"]        = round(max(10.0,  min(120.0, t["load"]        + random.uniform(-1.5, 1.5))), 1)
            t["temperature"] = round(max(20.0,  min(120.0, t["temperature"] + random.uniform(-1.0, 1.0))), 1)
            t["voltage"]     = round(max(190.0, min(250.0, t["voltage"]     + random.uniform(-1.5, 1.5))), 1)
            t["current"]     = round(max(10.0,  min(150.0, t["current"]     + random.uniform(-1.5, 1.5))), 1)
            t["power"]       = round((t["voltage"] * t["current"] * 0.9) / 1000.0, 1)
            t["last_updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        # Refresh predictions in cache in batch
        try:
            preds = model.predict_batch(CHENNAI_TRANSFORMERS)
            for t, pred in zip(CHENNAI_TRANSFORMERS, preds):
                PREDICTIONS_CACHE[t["id"]] = pred
        except Exception:
            pass  # keep stale cache entry on error

        await asyncio.sleep(3)

@app.on_event("startup")
async def startup_event():
    # Pre-populate cache once before any request arrives
    try:
        preds = model.predict_batch(CHENNAI_TRANSFORMERS)
        for t, pred in zip(CHENNAI_TRANSFORMERS, preds):
            PREDICTIONS_CACHE[t["id"]] = pred
    except Exception:
        # Fallback to sequential
        for t in CHENNAI_TRANSFORMERS:
            try:
                PREDICTIONS_CACHE[t["id"]] = model.predict(t)
            except Exception:
                pass
    asyncio.create_task(live_data_simulator())

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "model_trained": model.is_trained}

@app.get("/api/metrics")
def get_metrics():
    preds = list(PREDICTIONS_CACHE.values())
    high_risk_count = sum(1 for p in preds if p["risk_level"] == "High")
    med_risk_count  = sum(1 for p in preds if p["risk_level"] == "Medium")
    low_risk_count  = sum(1 for p in preds if p["risk_level"] == "Low")
    return {
        "accuracy":  model.metrics["accuracy"],
        "precision": model.metrics["precision"],
        "recall":    model.metrics["recall"],
        "total_monitored": len(CHENNAI_TRANSFORMERS),
        "risk_distribution": {
            "High":   high_risk_count,
            "Medium": med_risk_count,
            "Low":    low_risk_count
        }
    }

@app.get("/api/transformers")
def get_transformers():
    result = []
    for t in CHENNAI_TRANSFORMERS:
        pred = PREDICTIONS_CACHE.get(t["id"], {})
        result.append({
            "transformer_id": t["id"],
            "name":        t["name"],
            "zone":        t.get("zone", "Unknown"),
            "last_updated": t.get("last_updated", ""),
            "lat":  t["lat"],
            "lng":  t["lng"],
            "load":        t["load"],
            "temperature": t["temperature"],
            "voltage":     t["voltage"],
            "current":     t["current"],
            "power":       t["power"],
            "risk_score":     pred.get("risk_score",  0),
            "risk_level":     pred.get("risk_level",  "Low"),
            "explainability": pred.get("explainability", {}),
            "recommendation": pred.get("recommendation", "Monitoring normally.")
        })
    return result

@app.post("/api/predict")
def predict_transformer(data: PredictionInput):
    # Construct input matching the expected features
    raw_dict = {
        "load": data.load,
        "temperature": data.temperature,
        "voltage": data.voltage,
        "current": data.current,
        "power": data.power
    }
    
    # Run pipeline prediction
    try:
        res = model.predict(raw_dict)
        return {
            "transformer_id": data.transformer_id,
            "zone": data.zone,
            "risk_score": res["risk_score"],
            "risk_level": res["risk_level"],
            "explainability": res["explainability"],
            "recommendation": res["recommendation"],
            "imputed_values": res["imputed_values"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/maintenance-queue")
def get_maintenance_queue():
    queue = []
    for t in CHENNAI_TRANSFORMERS:
        pred = PREDICTIONS_CACHE.get(t["id"])
        if not pred:
            continue
        
        # Determine priority badge
        if pred["risk_level"] == "High":
            priority = "Critical" if pred["risk_score"] >= 85.0 else "High"
            inspection_window = "Immediate (0-24 Hrs)" if pred["risk_score"] >= 85.0 else "Within 3 Days"
        elif pred["risk_level"] == "Medium":
            priority = "Medium"
            inspection_window = "Within 14 Days"
        else:
            priority = "Low"
            inspection_window = "Next Scheduled Cycle (180 Days)"
            
        # Extract probable root cause safely
        max_cause = max(pred["explainability"], key=pred["explainability"].get) if (pred.get("explainability") and len(pred["explainability"]) > 0) else "Normal Operations"
        
        queue.append({
            "transformer_id": t["id"],
            "name": t["name"],
            "zone": t.get("zone", "Unknown"),
            "risk_score": pred["risk_score"],
            "risk_level": pred["risk_level"],
            "probable_root_cause": max_cause,
            "priority": pred["recommendation"].get("priority", priority),
            "recommended_action": pred["recommendation"].get("text", str(pred["recommendation"])),
            "inspection_window": pred["recommendation"].get("failure_window", inspection_window),
            "planner_metrics": pred["recommendation"]
        })
        
    # Sort queue: Critical -> High -> Medium -> Low
    priority_order = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}
    queue.sort(key=lambda x: (priority_order[x["priority"]], x["risk_score"]), reverse=True)
    
    # Add ranks
    for idx, item in enumerate(queue):
        item["rank"] = idx + 1
        
    return queue

@app.get("/api/alerts")
def get_alerts():
    alerts = []
    alert_id = 1
    
    # Generate dynamic alerts based on live transformer states
    for t in CHENNAI_TRANSFORMERS:
        # Check Critical conditions
        if t["temperature"] > 90.0 or t["load"] > 100.0:
            alerts.append({
                "id": alert_id,
                "transformer_id": t["id"],
                "type": "Critical",
                "message": f"{t['id']} exceeded critical threshold!",
                "details": f"Temperature: {t['temperature']}°C, Load: {t['load']}%. Immediate inspection required.",
                "timestamp": "Just now"
            })
            alert_id += 1
            continue
            
        # Check Warning conditions
        if t["temperature"] > 75.0 or t["load"] > 80.0 or t["voltage"] < 215.0 or t["current"] > 100.0:
            alerts.append({
                "id": alert_id,
                "transformer_id": t["id"],
                "type": "Warning",
                "message": f"Anomaly detected in {t['zone']} ({t['id']})",
                "details": f"Temp: {t['temperature']}°C, Volts: {t['voltage']}V. Monitor closely.",
                "timestamp": f"{random.randint(2, 59)} mins ago"
            })
            alert_id += 1
            
        # Limit to top 20 alerts to avoid overwhelming UI
        if len(alerts) >= 20:
            break
            
    # Add a normal baseline alert if system is very stable
    if len(alerts) == 0:
        alerts.append({
            "id": 999,
            "transformer_id": "System",
            "type": "Normal",
            "message": "All transformers operating normally",
            "details": "Grid is stable. No anomalies detected.",
            "timestamp": "Just now"
        })
        
    return alerts

@app.get("/api/timeline/{transformer_id}")
def get_timeline(transformer_id: str):
    # Simulate a 7-day failure probability timeline trend for a given transformer.
    # High-risk transformers will end up above 70% threshold, low-risk will stay flat.
    
    # Find transformer to see its risk profile
    t_found = None
    for t in CHENNAI_TRANSFORMERS:
        if t["id"] == transformer_id:
            t_found = t
            break
            
    if t_found:
        pred = PREDICTIONS_CACHE.get(transformer_id)
        if pred:
            score = pred["risk_score"]
        else:
            score = (hash(transformer_id) % 60) + 20
    else:
        # Generate some default score based on the ID hash
        score = (hash(transformer_id) % 60) + 20
        
    # Generate weekly trend leading to current score
    trend = []
    for day in range(1, 8):
        # Scale risk up to current value (Day 7 = current score)
        # Adding a bit of variation
        factor = (day / 7.0) ** 1.5
        day_score = score * factor
        # If it's day 7, match exact score
        if day == 7:
            day_score = score
        # Cap at 99.9%
        day_score = min(99.9, max(5.0, round(day_score, 1)))
        trend.append({"day": f"Day {day}", "probability": day_score})
        
    return {
        "transformer_id": transformer_id,
        "current_score": score,
        "high_risk_threshold": 70.0,
        "timeline": trend
    }

@app.post("/api/upload-dataset")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")
        
    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")
        
    required_cols = ["transformer_id", "load", "temperature", "voltage", "current", "power", "failure"]
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        raise HTTPException(
            status_code=400, 
            detail=f"CSV missing required columns: {', '.join(missing_cols)}"
        )
        
    # Analyze Dataset before clean
    total_records = len(df)
    
    # Missing value audit
    missing_summary = {}
    for col in ["load", "temperature", "voltage", "current", "power"]:
        missing_count = int(df[col].isna().sum())
        missing_summary[col] = {
            "count": missing_count,
            "pct": float(round((missing_count / total_records) * 100, 1))
        }
        
    # Class distribution (failure: 0 vs 1)
    failure_counts = df["failure"].value_counts().to_dict()
    class_distribution = {
        "Normal (0)": int(failure_counts.get(0, 0)),
        "Failure (1)": int(failure_counts.get(1, 0))
    }
    
    # Retrain pipeline
    try:
        metrics = model.train(df)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to train model on uploaded data: {str(e)}")
        
    # Generate risk ranking report for all uploaded transformers
    report = []
    # Fill NaN values to show in report preview
    df_clean = df.copy()
    num_cols = ["load", "temperature", "voltage", "current", "power"]
    df_clean[num_cols] = model.imputer.transform(df_clean[num_cols])
    
    for _, row in df_clean.iterrows():
        raw_dict = {
            "load": row["load"],
            "temperature": row["temperature"],
            "voltage": row["voltage"],
            "current": row["current"],
            "power": row["power"]
        }
        pred = model.predict(raw_dict)
        report.append({
            "transformer_id": str(row["transformer_id"]),
            "load": float(round(row["load"], 1)),
            "temperature": float(round(row["temperature"], 1)),
            "voltage": float(round(row["voltage"], 1)),
            "current": float(round(row["current"], 1)),
            "power": float(round(row["power"], 1)),
            "risk_score": pred["risk_score"],
            "risk_level": pred["risk_level"]
        })
        
    # --- HOT-RELOAD TRANSFORMERS FOR LIVE SIMULATION ---
    global CHENNAI_TRANSFORMERS
    global PREDICTIONS_CACHE
    
    new_transformers = []
    for _, row in df_clean.iterrows():
        t_id = str(row["transformer_id"])
        # distribute coordinates around Chennai center (13.02, 80.22) to avoid overlapping
        # deterministic based on the transformer ID to keep positions consistent on updates
        coord_hash = hash(t_id)
        lat_offset = ((coord_hash % 200) - 100) / 1000.0  # -0.100 to +0.100 degrees
        lng_offset = (((coord_hash // 200) % 200) - 100) / 1000.0  # -0.100 to +0.100 degrees
        
        new_transformers.append({
            "id": t_id,
            "name": f"Node {t_id}",
            "lat": 13.02 + lat_offset, 
            "lng": 80.22 + lng_offset,
            "load": float(row["load"]),
            "temperature": float(row["temperature"]),
            "voltage": float(row["voltage"]),
            "current": float(row["current"]),
            "power": float(row["power"]),
            "zone": "Custom Upload",
            "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        })
    
    CHENNAI_TRANSFORMERS = new_transformers
    PREDICTIONS_CACHE.clear()
    for t in CHENNAI_TRANSFORMERS:
        try:
            PREDICTIONS_CACHE[t["id"]] = model.predict(t)
        except Exception:
            pass
            
    # Sort report by risk score descending
    report.sort(key=lambda x: x["risk_score"], reverse=True)
    
    # Keep preview of first 5 rows of original file (converting NaNs to None for JSON)
    preview_rows = df.head(5).to_dict(orient="records")
    for row in preview_rows:
        for k, v in row.items():
            if isinstance(v, float) and math.isnan(v):
                row[k] = None
                
    return {
        "message": "Dataset uploaded, validated and model retrained successfully.",
        "metrics": metrics,
        "total_records": total_records,
        "missing_value_summary": missing_summary,
        "class_distribution": class_distribution,
        "preview_data": preview_rows,
        "risk_ranked_report": report
    }
