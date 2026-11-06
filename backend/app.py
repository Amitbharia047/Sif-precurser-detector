import os
import re
import json
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from database import (
    init_db, insert_incident, get_all_incidents,
    get_incident_by_id, update_incident_status, delete_incident,
    get_dashboard_metrics
)
from nlp_model import DistilBERTSifClassifier
from hazard_extractor import extract_hazard_analysis

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIST = os.path.abspath(os.path.join(BASE_DIR, '..', 'frontend', 'dist'))

# Initialize Flask with static folder pointing to the built React frontend
app = Flask(
    __name__,
    static_folder=FRONTEND_DIST if os.path.exists(FRONTEND_DIST) else None,
    static_url_path=""
)

# Enable CORS for local Vite dev server and production deployments (e.g. Netlify)
cors_env = os.environ.get('CORS_ORIGINS', '').strip()
if cors_env == '*' or cors_env.lower() == 'all':
    CORS(app, resources={r"/api/*": {"origins": "*"}})
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        re.compile(r"^https://[\w-]+\.netlify\.app$")
    ]
    if cors_env:
        for origin in cors_env.split(','):
            if origin.strip():
                allowed_origins.append(origin.strip())
    CORS(
        app,
        resources={r"/api/*": {"origins": allowed_origins}},
        methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"]
    )

METRICS_PATH = os.path.join(BASE_DIR, 'model', 'metrics.json')

# Singleton NLP classifier loaded once on startup
nlp_classifier = None

def init_nlp_model():
    global nlp_classifier
    try:
        nlp_classifier = DistilBERTSifClassifier.get_instance()
        status_msg = "DistilBERT Fine-Tuned Model" if nlp_classifier.is_loaded else "Baseline Fallback"
        print(f"[✓] NLP Classifier initialized successfully: {status_msg}")
    except Exception as e:
        print(f"[!] Warning: Failed to initialize NLP Classifier: {e}")
        nlp_classifier = None

def calculate_risk_priority(is_sif_precursor: bool, sif_prob: float, failed_controls: list, hazard_types: list) -> str:
    """
    Computes an operational risk priority tier based on model precursor detection
    and critical physical barrier integrity.
    """
    if is_sif_precursor:
        # High risk if model is confident or multiple high-energy controls failed
        if sif_prob >= 0.70 or len(failed_controls) > 0 or len(hazard_types) >= 2:
            return "High"
        return "Medium"
    else:
        # Non-precursor: Low risk unless failed high-energy controls were explicitly flagged
        if len(failed_controls) > 0 or sif_prob >= 0.40:
            return "Medium"  # Borderline or has control failure mentioned
        return "Low"

def seed_sample_data():
    """Seed initial incidents if the table is empty"""
    existing = get_all_incidents(limit=1)
    if existing:
        return
    print("[*] Seeding database with initial illustrative safety incident records...")
    samples = [
        {
            "description": "Scaffold plank shifted on 4th level platform when worker stepped on unbolted end. Worker slipped but caught cross-brace at 30 feet elevation without tied-off harness.",
            "workplace_type": "Construction",
            "hazard_category": "Working at Height",
            "is_sif_precursor": True,
            "risk_category": "High",
            "confidence": 0.962,
            "hazard_indicators": ["Working at Height / Fall Hazard"],
            "equipment": ["Scaffolding / Staging Platform"],
            "unsafe_acts": ["Working at Height Without Anchor / Tie-Off"],
            "failed_controls": ["Absence / Failure of Fall Protection Barrier"],
            "model_name": "DistilBERT Sequence Classifier",
            "recommended_actions": [
                "Enforce 100% tie-off protocol with engineered anchor points rated for 5,000 lbs per worker.",
                "Institute mandatory pre-shift green-tag scaffolding and ladder structural safety inspections."
            ],
            "corrective_action_status": "Open",
            "incident_date": "2026-10-18"
        },
        {
            "description": "Mechanic reached into jammed robotic palletizer cell to free stuck cardboard box while optical interlock was overridden with reflector tape.",
            "workplace_type": "Manufacturing",
            "hazard_category": "Lockout/Tagout",
            "is_sif_precursor": True,
            "risk_category": "High",
            "confidence": 0.945,
            "hazard_indicators": ["Lockout/Tagout & Hazardous Energy", "Machine Guarding & Pinch Points"],
            "equipment": ["Rotating Machinery / Machine Tools"],
            "unsafe_acts": ["Operating Machinery with Bypassed Safeguards", "Servicing Energized Equipment (No LOTO)"],
            "failed_controls": ["Failure of Zero-Energy Isolation (LOTO)"],
            "model_name": "DistilBERT Sequence Classifier",
            "recommended_actions": [
                "Enforce strict Zero Energy State verification using calibrated multimeter/gauge before line break or maintenance.",
                "Audit interlock tamper-resistance and ensure individual worker safety padlocks with danger tags are placed."
            ],
            "corrective_action_status": "In Progress",
            "incident_date": "2026-10-17"
        },
        {
            "description": "Pedestrian order picker stepped into main forklift travel aisle around blind corner without sounding horn; forklift swerved into pallet racking.",
            "workplace_type": "Warehouse",
            "hazard_category": "Mobile Equipment",
            "is_sif_precursor": True,
            "risk_category": "High",
            "confidence": 0.887,
            "hazard_indicators": ["Mobile Equipment & Vehicle Interactions"],
            "equipment": ["Powered Industrial Truck (Forklift)"],
            "unsafe_acts": ["Pedestrian in Mobile Equipment Exclusion Zone"],
            "failed_controls": ["Vehicle Safety Warning System Inoperative"],
            "model_name": "DistilBERT Sequence Classifier",
            "recommended_actions": [
                "Establish physical pedestrian separation guardrails and audible floor warning zones in high-traffic corridors.",
                "Inspect and verify functionality of vehicle backup alarms, headlights, horns, and restricted speed limiters."
            ],
            "corrective_action_status": "Under Review",
            "incident_date": "2026-10-15"
        },
        {
            "description": "Employee received superficial paper cut to index finger while unboxing office stationery shipment; washed and applied adhesive bandage.",
            "workplace_type": "Office/Admin",
            "hazard_category": "Minor First Aid",
            "is_sif_precursor": False,
            "risk_category": "Low",
            "confidence": 0.985,
            "hazard_indicators": [],
            "equipment": [],
            "unsafe_acts": [],
            "failed_controls": [],
            "model_name": "DistilBERT Sequence Classifier",
            "recommended_actions": [
                "Document incident in standard safety log and review task-level housekeeping procedures.",
                "Provide refresher training on reporting minor hazards before they escalate."
            ],
            "corrective_action_status": "Resolved",
            "incident_date": "2026-10-14"
        }
    ]
    for s in samples:
        insert_incident(s)
    print(f"[✓] Seeded {len(samples)} initial incident records.")

# ----------------- FLASK API ROUTES -----------------

@app.route('/api/health', methods=['GET'])
def health_check():
    distilbert_active = nlp_classifier is not None and nlp_classifier.is_loaded
    device_info = str(nlp_classifier.device) if nlp_classifier else "none"
    model_name = nlp_classifier.predict("test sample")['model_name'] if nlp_classifier else "Not Initialized"
    
    return jsonify({
        "status": "healthy",
        "service": "SIF Precursor Detector API",
        "deep_learning_active": distilbert_active,
        "model_architecture": model_name,
        "device": device_info,
        "database": "sqlite3",
        "timestamp": datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
    }), 200

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    try:
        metrics = get_dashboard_metrics()
        return jsonify(metrics), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve dashboard metrics: {str(e)}"}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_incident():
    global nlp_classifier
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid request body. JSON object expected."}), 400

    description = (data.get('description') or data.get('narrative') or '').strip()
    if not description:
        return jsonify({"error": "Incident narrative description is required."}), 422
    if len(description) < 10:
        return jsonify({"error": "Incident description must be at least 10 characters long for valid NLP evaluation."}), 422

    workplace_type = (data.get('workplace_type') or 'General Industrial').strip()
    hazard_category = (data.get('hazard_category') or 'General Hazard').strip()
    incident_date = data.get('incident_date') or datetime.utcnow().strftime('%Y-%m-%d')

    if nlp_classifier is None:
        init_nlp_model()
    if nlp_classifier is None:
        return jsonify({"error": "NLP model service is unavailable."}), 503

    try:
        # 1. Run DistilBERT sequence classification inference
        dl_result = nlp_classifier.predict(description)
        is_sif_precursor = dl_result['is_sif_precursor']
        confidence = dl_result['confidence']
        sif_prob = dl_result['sif_probability']

        # 2. Run domain-specific hazard & control entity extraction
        hazard_result = extract_hazard_analysis(description)
        equipment = hazard_result['equipment']
        unsafe_acts = hazard_result['unsafe_acts']
        failed_controls = hazard_result['failed_controls']
        hazard_types = hazard_result['hazard_types']
        entities = hazard_result['entities']
        recommended_actions = hazard_result['recommendations']

        # 3. Determine operational risk priority
        risk_category = calculate_risk_priority(is_sif_precursor, sif_prob, failed_controls, hazard_types)

        # 4. Save report and complete extracted attributes to SQLite
        incident_record = insert_incident({
            "description": description,
            "workplace_type": workplace_type,
            "hazard_category": hazard_category,
            "incident_date": incident_date,
            "is_sif_precursor": is_sif_precursor,
            "risk_category": risk_category,
            "confidence": confidence,
            "hazard_indicators": hazard_types,
            "equipment": equipment,
            "unsafe_acts": unsafe_acts,
            "failed_controls": failed_controls,
            "model_name": dl_result['model_name'],
            "recommended_actions": recommended_actions,
            "corrective_action_status": "Open"
        })

        return jsonify({
            "success": True,
            "incident": incident_record,
            "prediction": {
                "is_sif_precursor": is_sif_precursor,
                "label": dl_result['label'],
                "predicted_class": dl_result['predicted_class'],
                "confidence": confidence,
                "sif_probability": sif_prob,
                "non_sif_probability": dl_result.get('non_sif_probability', round(1.0 - sif_prob, 4)),
                "model_name": dl_result['model_name'],
                "device": dl_result.get('device', 'cpu'),
                "inference_time_ms": dl_result.get('inference_time_ms', 0),
                "risk_category": risk_category,
                "hazard_indicators": hazard_types,
                "equipment": equipment,
                "unsafe_acts": unsafe_acts,
                "failed_controls": failed_controls,
                "entities": entities,
                "recommended_actions": recommended_actions,
                "distilbert": dl_result.get('distilbert'),
                "baseline": dl_result.get('baseline'),
                "models_agree": dl_result.get('models_agree', True),
                "consensus_label": dl_result.get('consensus_label', '')
            },
            "disclaimer": (
                "Academic demonstration project. DistilBERT model confidence is a statistical text classification "
                "probability and must not be used as an unvalidated guarantee of real-world injury severity. "
                "Mandatory human safety officer review is required for all industrial and regulatory safety decisions."
            )
        }), 201

    except Exception as e:
        return jsonify({"error": f"Incident analysis failed: {str(e)}"}), 500

@app.route('/api/incidents', methods=['GET'])
def list_incidents():
    try:
        risk_filter = request.args.get('risk')
        status_filter = request.args.get('status')
        sif_param = request.args.get('sif')
        sif_filter = None
        if sif_param is not None and sif_param != '':
            sif_filter = sif_param.lower() in ('1', 'true')
        search = request.args.get('search')
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))

        incidents = get_all_incidents(
            limit=limit, offset=offset,
            risk_filter=risk_filter,
            status_filter=status_filter,
            sif_filter=sif_filter,
            search=search
        )
        return jsonify(incidents), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve incidents: {str(e)}"}), 500

@app.route('/api/incidents/<int:incident_id>', methods=['GET'])
def get_incident(incident_id):
    try:
        incident = get_incident_by_id(incident_id)
        if not incident:
            return jsonify({"error": f"Incident with ID #{incident_id} not found."}), 404
        return jsonify(incident), 200
    except Exception as e:
        return jsonify({"error": f"Error retrieving incident #{incident_id}: {str(e)}"}), 500

@app.route('/api/incidents/<int:incident_id>/status', methods=['PATCH'])
def update_status(incident_id):
    data = request.get_json(silent=True)
    if not data or 'status' not in data:
        return jsonify({"error": "Request body must contain 'status' field."}), 400

    new_status = data['status']
    try:
        updated = update_incident_status(incident_id, new_status)
        if not updated:
            return jsonify({"error": f"Incident with ID #{incident_id} not found."}), 404
        return jsonify({"success": True, "incident": updated}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed to update status: {str(e)}"}), 500

@app.route('/api/incidents/<int:incident_id>', methods=['DELETE'])
def delete_incident_endpoint(incident_id):
    try:
        success = delete_incident(incident_id)
        if not success:
            return jsonify({"error": f"Incident with ID #{incident_id} not found."}), 404
        return jsonify({"success": True, "message": f"Incident #{incident_id} deleted successfully."}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to delete incident #{incident_id}: {str(e)}"}), 500

@app.route('/api/model-info', methods=['GET'])
def get_model_info():
    if not os.path.exists(METRICS_PATH):
        return jsonify({
            "trained": False,
            "message": "Model metrics file not found. Please execute train_model.py first."
        }), 200
    try:
        with open(METRICS_PATH, 'r', encoding='utf-8') as f:
            metrics_data = json.load(f)
        metrics_data["trained"] = True
        return jsonify(metrics_data), 200
    except Exception as e:
        return jsonify({"error": f"Failed to read model metrics: {str(e)}"}), 500

# ----------------- UNIFIED FRONTEND SERVING -----------------

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend_spa(path):
    """
    Serves the production React application build from frontend/dist.
    Supports client-side routing fallback for non-API routes.
    """
    # Guard API routes from catch-all fallback
    if path.startswith("api/") or path == "api":
        return jsonify({"error": "API endpoint not found"}), 404

    if FRONTEND_DIST and os.path.exists(FRONTEND_DIST):
        target_file = os.path.join(FRONTEND_DIST, path)
        if path and os.path.exists(target_file) and not os.path.isdir(target_file):
            return send_from_directory(FRONTEND_DIST, path)
        return send_from_directory(FRONTEND_DIST, 'index.html')

    return jsonify({
        "service": "SIF Precursor Detector Full-Stack Server",
        "status": "healthy",
        "message": "Frontend build not detected. Run 'npm run build' inside frontend/ to compile the React interface."
    }), 200

@app.errorhandler(404)
def handle_404_spa_fallback(e):
    """
    Catch-all 404 handler that serves index.html for client-side React routes
    while preserving JSON 404 responses for invalid /api/ calls.
    """
    if request.path.startswith("/api/"):
        return jsonify({"error": f"API endpoint '{request.path}' not found."}), 404
    if FRONTEND_DIST and os.path.exists(os.path.join(FRONTEND_DIST, 'index.html')):
        return send_from_directory(FRONTEND_DIST, 'index.html'), 200
    return e

# Initialize DB and Deep Learning Classifier on startup
init_db()
seed_sample_data()
init_nlp_model()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"[*] Starting SIF Precursor Detector backend server on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
