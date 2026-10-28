import sqlite3
import json
import os
from datetime import datetime

DATABASE_DIR = os.path.join(os.path.dirname(__file__), 'instance')
DATABASE_PATH = os.path.join(DATABASE_DIR, 'safety_incidents.db')

def get_db_connection():
    os.makedirs(DATABASE_DIR, exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS incidents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            incident_date TEXT,
            description TEXT NOT NULL,
            workplace_type TEXT,
            hazard_category TEXT,
            is_sif_precursor INTEGER NOT NULL,
            risk_category TEXT NOT NULL,
            confidence REAL NOT NULL,
            hazard_indicators TEXT,
            recommended_actions TEXT,
            corrective_action_status TEXT NOT NULL DEFAULT 'Open',
            equipment TEXT,
            unsafe_acts TEXT,
            failed_controls TEXT,
            model_name TEXT,
            created_at TEXT NOT NULL
        )
    ''')
    
    # Non-destructive migrations for existing DBs
    new_cols = [
        ("equipment", "TEXT"),
        ("unsafe_acts", "TEXT"),
        ("failed_controls", "TEXT"),
        ("model_name", "TEXT")
    ]
    for col_name, col_type in new_cols:
        try:
            cursor.execute(f"ALTER TABLE incidents ADD COLUMN {col_name} {col_type}")
        except sqlite3.OperationalError:
            pass  # Column already exists
            
    conn.commit()
    conn.close()

def parse_incident_row(row):
    if row is None:
        return None
    d = dict(row)
    
    # Helper to parse json list fields safely
    def safe_json_list(val):
        if not val:
            return []
        if isinstance(val, list):
            return val
        try:
            parsed = json.loads(val)
            return parsed if isinstance(parsed, list) else [parsed]
        except Exception:
            return []

    d['hazard_indicators'] = safe_json_list(d.get('hazard_indicators'))
    d['recommended_actions'] = safe_json_list(d.get('recommended_actions'))
    d['equipment'] = safe_json_list(d.get('equipment'))
    d['unsafe_acts'] = safe_json_list(d.get('unsafe_acts'))
    d['failed_controls'] = safe_json_list(d.get('failed_controls'))
    d['is_sif_precursor'] = bool(d.get('is_sif_precursor'))
    return d

def insert_incident(data):
    conn = get_db_connection()
    cursor = conn.cursor()
    created_at = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    
    indicators_json = json.dumps(data.get('hazard_indicators', []))
    actions_json = json.dumps(data.get('recommended_actions', []))
    equipment_json = json.dumps(data.get('equipment', []))
    unsafe_json = json.dumps(data.get('unsafe_acts', []))
    failed_json = json.dumps(data.get('failed_controls', []))
    
    cursor.execute('''
        INSERT INTO incidents (
            incident_date, description, workplace_type, hazard_category,
            is_sif_precursor, risk_category, confidence, hazard_indicators,
            recommended_actions, corrective_action_status,
            equipment, unsafe_acts, failed_controls, model_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('incident_date') or datetime.utcnow().strftime('%Y-%m-%d'),
        data['description'],
        data.get('workplace_type', 'General Industrial'),
        data.get('hazard_category', 'General Hazard'),
        1 if data.get('is_sif_precursor') else 0,
        data.get('risk_category', 'Medium'),
        float(data.get('confidence', 0.5)),
        indicators_json,
        actions_json,
        data.get('corrective_action_status', 'Open'),
        equipment_json,
        unsafe_json,
        failed_json,
        data.get('model_name', 'DistilBERT Sequence Classifier'),
        created_at
    ))
    conn.commit()
    inserted_id = cursor.lastrowid
    conn.close()
    return get_incident_by_id(inserted_id)

def get_all_incidents(limit=100, offset=0, risk_filter=None, status_filter=None, sif_filter=None, search=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM incidents WHERE 1=1"
    params = []
    
    if risk_filter:
        query += " AND risk_category = ?"
        params.append(risk_filter)
    if status_filter:
        query += " AND corrective_action_status = ?"
        params.append(status_filter)
    if sif_filter is not None:
        query += " AND is_sif_precursor = ?"
        params.append(1 if sif_filter else 0)
    if search:
        query += " AND (description LIKE ? OR workplace_type LIKE ? OR hazard_category LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])
        
    query += " ORDER BY id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [parse_incident_row(r) for r in rows]

def get_incident_by_id(incident_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,))
    row = cursor.fetchone()
    conn.close()
    return parse_incident_row(row)

def update_incident_status(incident_id, new_status):
    valid_statuses = ['Open', 'In Progress', 'Resolved', 'Under Review']
    if new_status not in valid_statuses:
        raise ValueError(f"Invalid status '{new_status}'. Must be one of {valid_statuses}")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE incidents SET corrective_action_status = ? WHERE id = ?", (new_status, incident_id))
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    if rows_affected == 0:
        return None
    return get_incident_by_id(incident_id)

def delete_incident(incident_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM incidents WHERE id = ?", (incident_id,))
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    return rows_affected > 0

def get_dashboard_metrics():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM incidents")
    total_incidents = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM incidents WHERE is_sif_precursor = 1")
    sif_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM incidents WHERE risk_category = 'High'")
    high_risk_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM incidents WHERE corrective_action_status IN ('Open', 'In Progress', 'Under Review')")
    open_actions_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT risk_category, COUNT(*) as count FROM incidents GROUP BY risk_category")
    risk_distribution_raw = cursor.fetchall()
    risk_distribution = { 'High': 0, 'Medium': 0, 'Low': 0 }
    for r in risk_distribution_raw:
        risk_distribution[r['risk_category']] = r['count']
        
    cursor.execute("SELECT hazard_category, COUNT(*) as count FROM incidents GROUP BY hazard_category ORDER BY count DESC LIMIT 6")
    hazard_breakdown = [{'category': r['hazard_category'] or 'Uncategorized', 'count': r['count']} for r in cursor.fetchall()]
    
    cursor.execute("SELECT corrective_action_status, COUNT(*) as count FROM incidents GROUP BY corrective_action_status")
    status_distribution = [{'status': r['corrective_action_status'], 'count': r['count']} for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM incidents ORDER BY id DESC LIMIT 7")
    recent_rows = cursor.fetchall()
    recent_incidents = [parse_incident_row(r) for r in recent_rows]
    
    conn.close()
    
    return {
        'total_incidents': total_incidents,
        'sif_precursors': sif_count,
        'high_risk_count': high_risk_count,
        'open_corrective_actions': open_actions_count,
        'risk_distribution': [
            { 'name': 'High Risk', 'value': risk_distribution.get('High', 0), 'color': '#ef4444' },
            { 'name': 'Medium Risk', 'value': risk_distribution.get('Medium', 0), 'color': '#f59e0b' },
            { 'name': 'Low Risk', 'value': risk_distribution.get('Low', 0), 'color': '#10b981' }
        ],
        'hazard_breakdown': hazard_breakdown,
        'status_distribution': status_distribution,
        'recent_incidents': recent_incidents
    }
