import React, { useState } from 'react';
import { 
  FileSearch, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Building2, 
  Tag, 
  Sparkles, 
  Send, 
  Info, 
  Cpu,
  Wrench,
  AlertOctagon,
  ShieldX,
  ExternalLink,
  Layers,
  Eye
} from 'lucide-react';

function renderAnnotatedText(text, entities) {
  if (!text) return null;
  if (!entities || entities.length === 0) return <span>{text}</span>;

  // Filter valid entities with valid start/end
  const validEntities = entities.filter(
    e => typeof e.start === 'number' && typeof e.end === 'number' && e.start < e.end && e.end <= text.length
  );
  
  // Sort by start position
  const sorted = [...validEntities].sort((a, b) => a.start - b.start);
  
  // Resolve overlapping spans
  const nonOverlapping = [];
  let lastEnd = 0;
  for (const ent of sorted) {
    if (ent.start >= lastEnd) {
      nonOverlapping.push(ent);
      lastEnd = ent.end;
    }
  }

  const elements = [];
  let currentIndex = 0;

  nonOverlapping.forEach((ent, i) => {
    if (ent.start > currentIndex) {
      elements.push(
        <span key={`text-${i}`}>{text.substring(currentIndex, ent.start)}</span>
      );
    }

    const labelClass = ent.label === 'EQUIPMENT' ? 'equipment'
      : ent.label === 'UNSAFE_ACT' ? 'unsafe'
      : ent.label === 'FAILED_CONTROL' ? 'control'
      : 'hazard';

    const shortLabel = ent.label === 'EQUIPMENT' ? 'EQUIPMENT'
      : ent.label === 'UNSAFE_ACT' ? 'UNSAFE ACT'
      : ent.label === 'FAILED_CONTROL' ? 'FAILED BARRIER'
      : 'HAZARD';

    elements.push(
      <mark
        key={`ent-${i}`}
        className={`entity-highlight entity-highlight-${labelClass}`}
        title={`${ent.category} (${ent.label})`}
      >
        {text.substring(ent.start, ent.end)}
        <span className={`entity-tag-pill entity-tag-pill-${labelClass}`}>
          {shortLabel}
        </span>
      </mark>
    );

    currentIndex = ent.end;
  });

  if (currentIndex < text.length) {
    elements.push(
      <span key="text-end">{text.substring(currentIndex)}</span>
    );
  }

  return elements;
}

const SAMPLE_TEMPLATES = [
  {
    name: "Scaffold Height Hazard (SIF)",
    description: "Worker climbed to 24 feet on an uninspected scaffold tower without a personal fall arrest lanyard tied off. A plank slipped when worker leaned outward to hoist steel pipe.",
    workplace_type: "Construction",
    hazard_category: "Working at Height"
  },
  {
    name: "LOTO Interlock Bypass (SIF)",
    description: "Mechanic reached through open guard gate into operating robotic palletizer to clear box jam while safety interlock was bypassed with a bypass key.",
    workplace_type: "Manufacturing",
    hazard_category: "Lockout/Tagout"
  },
  {
    name: "Forklift Near-Miss (SIF)",
    description: "Forklift carrying oversized bin drove into pedestrian lane around blind corner without horn sounding; pedestrian jumped aside into pallet racking.",
    workplace_type: "Warehouse",
    hazard_category: "Mobile Equipment"
  },
  {
    name: "High-Voltage Arc Flash (SIF)",
    description: "Electrician worked inside energized 480V motor control center cubicle to torque lugs without verifying zero energy state or arc-flash PPE.",
    workplace_type: "Utilities",
    hazard_category: "Electrical"
  },
  {
    name: "Office Paper Cut (Non-SIF)",
    description: "Employee received superficial paper cut to right index finger while opening carton of stationery supplies; washed with soap and applied band-aid.",
    workplace_type: "Office/Admin",
    hazard_category: "Minor First Aid"
  },
  {
    name: "Ergonomic Discomfort (Non-SIF)",
    description: "Data entry specialist reported mild neck stiffness after 6 hours of spreadsheet verification; requested adjustable ergonomic monitor mount.",
    workplace_type: "Office/Admin",
    hazard_category: "Ergonomics"
  }
];

export default function AnalyzeIncident({ onIncidentAnalyzed, onNavigateToHistory }) {
  const [description, setDescription] = useState('');
  const [workplaceType, setWorkplaceType] = useState('Manufacturing');
  const [hazardCategory, setHazardCategory] = useState('General Hazard');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [viewAnnotated, setViewAnnotated] = useState(true);

  const applyTemplate = (tpl) => {
    setDescription(tpl.description);
    setWorkplaceType(tpl.workplace_type);
    setHazardCategory(tpl.hazard_category);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Incident narrative description is required.");
      return;
    }
    if (description.trim().length < 10) {
      setError("Please provide at least 10 characters to perform accurate text classification.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          workplace_type: workplaceType,
          hazard_category: hazardCategory,
          incident_date: incidentDate
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Server responded with status ${response.status}`);
      }

      setAnalysisResult(data);
      if (onIncidentAnalyzed) {
        onIncidentAnalyzed(data.incident);
      }
    } catch (err) {
      setError(err.message || "Failed to analyze incident report.");
    } finally {
      setLoading(false);
    }
  };

  const pred = analysisResult?.prediction;

  return (
    <div className="content-body" style={{ maxWidth: '1050px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px', marginBottom: '4px' }}>
          Workplace Safety Incident Precursor Analysis
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Evaluates safety incident narratives for Serious Injury or Fatality (SIF) precursors using fine-tuned DistilBERT and domain hazard recognition.
        </p>
      </div>

      {/* Quick Test Sample Templates */}
      <div className="templates-bar">
        <span className="template-label">
          <Sparkles size={13} style={{ color: '#0ea5e9', marginRight: '4px' }} />
          Sample Reports:
        </span>
        {SAMPLE_TEMPLATES.map((tpl, i) => (
          <button
            key={i}
            type="button"
            className="template-btn"
            onClick={() => applyTemplate(tpl)}
          >
            {tpl.name}
          </button>
        ))}
      </div>

      {/* Analysis Form */}
      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <span>Incident Narrative Description <span className="required-mark">*</span></span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {description.length} characters
              </span>
            </label>
            <textarea
              className="form-textarea"
              placeholder="Describe the safety incident, equipment involved, elevation or energy sources, worker decisions, and status of direct control barriers..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                <span><Building2 size={13} style={{ marginRight: '4px' }} /> Workplace Type</span>
              </label>
              <select
                className="form-select"
                value={workplaceType}
                onChange={(e) => setWorkplaceType(e.target.value)}
              >
                <option value="Manufacturing">Manufacturing</option>
                <option value="Construction">Construction</option>
                <option value="Warehouse / Logistics">Warehouse / Logistics</option>
                <option value="Chemical / Refinery">Chemical / Refinery</option>
                <option value="Utilities & Energy">Utilities & Energy</option>
                <option value="Mining & Quarry">Mining & Quarry</option>
                <option value="Healthcare & Lab">Healthcare & Lab</option>
                <option value="Office / Admin">Office / Admin</option>
                <option value="General Industrial">General Industrial</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span><Tag size={13} style={{ marginRight: '4px' }} /> Hazard Category</span>
              </label>
              <select
                className="form-select"
                value={hazardCategory}
                onChange={(e) => setHazardCategory(e.target.value)}
              >
                <option value="Working at Height">Working at Height</option>
                <option value="Lockout/Tagout">Lockout/Tagout (LOTO)</option>
                <option value="Machine Guarding">Machine Guarding</option>
                <option value="Mobile Equipment">Mobile Equipment & Vehicles</option>
                <option value="Confined Space">Confined Space</option>
                <option value="Electrical">Electrical & Arc Flash</option>
                <option value="Chemical / Toxic">Chemical / Toxic Release</option>
                <option value="Excavation / Trenching">Excavation / Trenching</option>
                <option value="Ergonomics">Ergonomics</option>
                <option value="Slips/Trips/Falls">Slips / Trips / Falls</option>
                <option value="Minor First Aid">Minor First Aid</option>
                <option value="General Hazard">General Hazard</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span><Calendar size={13} style={{ marginRight: '4px' }} /> Incident Date</span>
              </label>
              <input
                type="date"
                className="form-input"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div style={{
              background: 'var(--sif-red-bg)',
              border: '1px solid var(--sif-red-border)',
              color: '#fca5a5',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertTriangle size={15} />
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setDescription('');
                setAnalysisResult(null);
                setError(null);
              }}
              disabled={loading}
            >
              Clear Form
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={loading}
            >
              {loading ? (
                <>Evaluating with DistilBERT...</>
              ) : (
                <>
                  <Send size={14} /> Analyze Incident
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Analysis Result Output Display */}
      {analysisResult && pred && (
        <div className={`result-card ${pred.is_sif_precursor ? 'sif-detected' : 'sif-clear'}`}>
          <div className="result-header">
            <div className="result-title-group">
              <span className="incident-id-badge">
                INC-{String(analysisResult.incident.id).padStart(4, '0')}
              </span>
              <div className="result-banner">
                {pred.is_sif_precursor ? (
                  <span style={{ color: 'var(--sif-red)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={20} /> Potential SIF Precursor Detected
                  </span>
                ) : (
                  <span style={{ color: 'var(--sif-green)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={20} /> Non-SIF Precursor (Low Potential)
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className={`badge badge-risk-${pred.risk_category?.toLowerCase() || 'medium'}`} style={{ fontSize: '12px', padding: '4px 10px' }}>
                Priority: {pred.risk_category}
              </span>
              <button 
                className="secondary-btn"
                style={{ padding: '4px 10px', fontSize: '12px' }}
                onClick={onNavigateToHistory}
              >
                View in History <ExternalLink size={12} />
              </button>
            </div>
          </div>

          {/* Model Confidence & Telemetry Strip */}
          <div className="confidence-meter-box">
            <div className="meter-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={14} style={{ color: '#0ea5e9' }} />
                <span style={{ color: 'var(--text-secondary)' }}>
                  Model Classification Confidence (Softmax Output)
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>
                {(pred.confidence * 100).toFixed(1)}% 
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px', fontWeight: 400 }}>
                  (SIF Class Prob: {pred.sif_probability})
                </span>
              </span>
            </div>
            <div className="meter-track" style={{ marginBottom: '8px' }}>
              <div
                className="meter-bar"
                style={{
                  width: `${Math.min(Math.max(pred.confidence * 100, 10), 100)}%`,
                  background: pred.is_sif_precursor
                    ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                    : 'linear-gradient(90deg, #0ea5e9, #10b981)'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span>Architecture: {pred.model_name}</span>
              <span>Inference: {pred.inference_time_ms} ms ({pred.device?.toUpperCase() || 'CPU'})</span>
            </div>
          </div>

          {/* Dual-Model Benchmark Comparison Grid */}
          <div style={{ marginBottom: '18px' }}>
            {pred.consensus_label && (
              <div className={`consensus-ribbon ${pred.models_agree ? 'agree' : 'divergence'}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {pred.models_agree ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                  <span>{pred.consensus_label}</span>
                </div>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  Dual-Engine Inference Active
                </span>
              </div>
            )}

            <div className="dual-model-grid">
              {/* Card 1: DistilBERT Deep Learning */}
              <div className="dual-model-card active-primary">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Cpu size={14} style={{ color: '#38bdf8' }} />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                      DistilBERT Sequence Classifier
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', background: '#0369a1', color: '#e0f2fe', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                    DEEP LEARNING
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Hugging Face Transformers / PyTorch ({pred.distilbert?.device?.toUpperCase() || pred.device?.toUpperCase() || 'CPU'})
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: pred.distilbert?.is_sif_precursor ? '#fca5a5' : '#6ee7b7', fontWeight: 600 }}>
                    {pred.distilbert?.is_sif_precursor ? 'SIF Precursor' : 'Non-Precursor'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>
                    {((pred.distilbert?.confidence || pred.confidence) * 100).toFixed(1)}% Conf
                  </span>
                </div>
                <div className="meter-track" style={{ height: '6px', marginBottom: '6px' }}>
                  <div
                    className="meter-bar"
                    style={{
                      width: `${Math.min(Math.max((pred.distilbert?.confidence || pred.confidence) * 100, 10), 100)}%`,
                      background: pred.distilbert?.is_sif_precursor
                        ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                        : 'linear-gradient(90deg, #0ea5e9, #10b981)'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  <span>SIF Prob: {pred.distilbert?.sif_probability ?? pred.sif_probability}</span>
                  <span>{pred.distilbert?.inference_time_ms ?? pred.inference_time_ms} ms</span>
                </div>
              </div>

              {/* Card 2: Baseline Model (TF-IDF + Logistic Regression) */}
              <div className="dual-model-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} style={{ color: '#94a3b8' }} />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>
                      Baseline TF-IDF + Logistic Regression
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', background: '#334155', color: '#cbd5e1', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                    BENCHMARK
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Scikit-Learn (1-2 N-grams, C=1.2 Balanced)
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: pred.baseline?.is_sif_precursor ? '#fca5a5' : '#6ee7b7', fontWeight: 600 }}>
                    {pred.baseline?.is_sif_precursor ? 'SIF Precursor' : 'Non-Precursor'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>
                    {pred.baseline ? `${(pred.baseline.confidence * 100).toFixed(1)}% Conf` : 'N/A'}
                  </span>
                </div>
                <div className="meter-track" style={{ height: '6px', marginBottom: '6px' }}>
                  <div
                    className="meter-bar"
                    style={{
                      width: pred.baseline ? `${Math.min(Math.max(pred.baseline.confidence * 100, 10), 100)}%` : '0%',
                      background: pred.baseline?.is_sif_precursor
                        ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                        : 'linear-gradient(90deg, #0ea5e9, #10b981)'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  <span>SIF Prob: {pred.baseline?.sif_probability ?? 'N/A'}</span>
                  <span>{pred.baseline?.inference_time_ms ?? '0'} ms</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive In-Text Entity Highlighter */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={13} style={{ color: '#0ea5e9' }} /> NLP Named Entity & Span Recognition
              </h4>
              <button
                type="button"
                className="template-btn"
                onClick={() => setViewAnnotated(!viewAnnotated)}
                style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                {viewAnnotated ? "Switch to Plain Text" : "Show Highlighted Spans"}
              </button>
            </div>

            <div className="annotated-text-container">
              {viewAnnotated 
                ? renderAnnotatedText(analysisResult.incident.description, pred.entities)
                : analysisResult.incident.description
              }
            </div>
          </div>

          {/* Recognized Safety Hazard Signals Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
            {/* Critical Hazard Types */}
            <div style={{ background: '#090e1a', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={13} style={{ color: '#f59e0b' }} /> Hazard Domains
              </div>
              {pred.hazard_indicators && pred.hazard_indicators.length > 0 ? (
                <div className="indicators-tag-list">
                  {pred.hazard_indicators.map((ind, i) => (
                    <span key={i} className="indicator-tag">
                      {ind}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>None flagged in narrative.</p>
              )}
            </div>

            {/* Equipment Involved */}
            <div style={{ background: '#090e1a', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wrench size={13} style={{ color: '#0ea5e9' }} /> Equipment / Machinery
              </div>
              {pred.equipment && pred.equipment.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {pred.equipment.map((eq, i) => (
                    <span key={i} style={{ background: 'var(--sif-blue-bg)', color: '#7dd3fc', border: '1px solid var(--sif-blue-border)', padding: '2px 7px', borderRadius: '3px', fontSize: '11.5px' }}>
                      {eq}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>No heavy equipment entities identified.</p>
              )}
            </div>

            {/* Unsafe Acts / Decisions */}
            <div style={{ background: '#090e1a', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertOctagon size={13} style={{ color: '#ef4444' }} /> Unsafe Acts & Decisions
              </div>
              {pred.unsafe_acts && pred.unsafe_acts.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {pred.unsafe_acts.map((act, i) => (
                    <span key={i} style={{ background: 'var(--sif-red-bg)', color: '#fca5a5', border: '1px solid var(--sif-red-border)', padding: '2px 7px', borderRadius: '3px', fontSize: '11.5px' }}>
                      {act}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>No behavioral control bypass detected.</p>
              )}
            </div>

            {/* Failed or Missing Barriers */}
            <div style={{ background: '#090e1a', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldX size={13} style={{ color: '#f59e0b' }} /> Failed / Missing Controls
              </div>
              {pred.failed_controls && pred.failed_controls.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {pred.failed_controls.map((fc, i) => (
                    <span key={i} style={{ background: 'var(--sif-amber-bg)', color: '#fde68a', border: '1px solid var(--sif-amber-border)', padding: '2px 7px', borderRadius: '3px', fontSize: '11.5px' }}>
                      {fc}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>No barrier failure patterns recognized.</p>
              )}
            </div>
          </div>

          {/* Recommended Preventive Actions */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Recommended Hierarchy of Controls Interventions
            </h4>
            <div className="recommendations-list">
              {pred.recommended_actions.map((act, i) => (
                <div key={i} className="recommendation-item">
                  <span style={{ color: '#0ea5e9', fontWeight: 700 }}>{i + 1}.</span>
                  <span>{act}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mandatory Human Review Warning */}
          <div className="disclaimer-banner" style={{ background: '#1c1508', borderColor: 'var(--sif-amber-border)' }}>
            <Info size={16} style={{ flexShrink: 0, color: 'var(--sif-amber)' }} />
            <div style={{ color: '#fde68a' }}>
              <strong>Mandatory Safety Professional Review Required:</strong> {analysisResult.disclaimer}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
