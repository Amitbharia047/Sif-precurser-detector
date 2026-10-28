import React from 'react';
import { X, ShieldAlert, CheckCircle, AlertTriangle, Calendar, Building2, Tag, Trash2, Cpu } from 'lucide-react';

export default function IncidentDetailModal({ incident, onClose, onStatusChange, onDelete }) {
  if (!incident) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="incident-id-badge">INC-{String(incident.id).padStart(4, '0')}</span>
            <h3 className="modal-title">Incident Report Details</h3>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Status and Risk Strip */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
          {incident.is_sif_precursor ? (
            <span className="badge badge-sif">
              <ShieldAlert size={14} /> Potential SIF Precursor
            </span>
          ) : (
            <span className="badge badge-non-sif">
              <CheckCircle size={14} /> Non-SIF Precursor
            </span>
          )}

          <span className={`badge badge-risk-${incident.risk_category?.toLowerCase() || 'medium'}`}>
            Risk: {incident.risk_category}
          </span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status:</label>
            <select
              className="status-select"
              value={incident.corrective_action_status}
              onChange={(e) => onStatusChange(incident.id, e.target.value)}
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Under Review">Under Review</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Metadata row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '12px', 
          background: '#090e1a', 
          padding: '12px 14px', 
          borderRadius: 'var(--radius-sm)', 
          marginBottom: '20px',
          border: '1px solid var(--border-subtle)',
          fontSize: '12.5px'
        }}>
          <div>
            <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Calendar size={13} /> Date
            </div>
            <div style={{ fontWeight: 600, marginTop: '2px' }}>{incident.incident_date || 'N/A'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Building2 size={13} /> Workplace
            </div>
            <div style={{ fontWeight: 600, marginTop: '2px' }}>{incident.workplace_type || 'Industrial'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Tag size={13} /> Hazard Category
            </div>
            <div style={{ fontWeight: 600, marginTop: '2px' }}>{incident.hazard_category || 'General'}</div>
          </div>
        </div>

        {/* Full incident narrative */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Reported Incident Narrative
          </h4>
          <div style={{ 
            background: 'var(--bg-input)', 
            padding: '16px', 
            borderRadius: 'var(--radius-sm)', 
            border: '1px solid var(--border-subtle)', 
            fontSize: '13.5px', 
            lineHeight: 1.6,
            color: '#f1f5f9'
          }}>
            {incident.description}
          </div>
        </div>

        {/* Confidence & Model details */}
        <div style={{ 
          background: '#090e1a', 
          padding: '14px', 
          borderRadius: 'var(--radius-sm)', 
          marginBottom: '20px',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12.5px' }}>
            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={14} style={{ color: '#0ea5e9' }} /> Model Classification Confidence
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {(incident.confidence * 100).toFixed(1)}%
            </span>
          </div>
          <div className="meter-track">
            <div 
              className="meter-bar" 
              style={{ 
                width: `${Math.min(Math.max(incident.confidence * 100, 10), 100)}%`,
                background: incident.is_sif_precursor 
                  ? 'linear-gradient(90deg, #f59e0b, #ef4444)' 
                  : 'linear-gradient(90deg, #0ea5e9, #10b981)'
              }}
            />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Model: {incident.model_name || 'DistilBERT Sequence Classifier'}
          </div>
        </div>

        {/* Hazard indicators & Recognized Entities */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Detected Hazard Indicators & Recognized Entities
          </h4>
          {incident.hazard_indicators && incident.hazard_indicators.length > 0 ? (
            <div className="indicators-tag-list" style={{ marginBottom: '10px' }}>
              {incident.hazard_indicators.map((tag, i) => (
                <span key={i} className="indicator-tag">
                  <AlertTriangle size={13} /> {tag}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '10px' }}>
              No critical high-energy hazard indicators flagged in narrative text.
            </p>
          )}

          {/* Equipment and controls tags if available */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '11.5px' }}>
            {incident.equipment && incident.equipment.length > 0 && (
              <div style={{ background: '#090e1a', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>EQUIPMENT</span>
                <span style={{ color: '#7dd3fc' }}>{incident.equipment.join(', ')}</span>
              </div>
            )}
            {incident.unsafe_acts && incident.unsafe_acts.length > 0 && (
              <div style={{ background: '#090e1a', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>UNSAFE ACTS</span>
                <span style={{ color: '#fca5a5' }}>{incident.unsafe_acts.join(', ')}</span>
              </div>
            )}
            {incident.failed_controls && incident.failed_controls.length > 0 && (
              <div style={{ background: '#090e1a', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>FAILED CONTROLS</span>
                <span style={{ color: '#fde68a' }}>{incident.failed_controls.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Recommended actions */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Recommended Hierarchy of Controls Actions
          </h4>
          <div className="recommendations-list">
            {(incident.recommended_actions || []).map((action, i) => (
              <div key={i} className="recommendation-item">
                <span style={{ color: '#0ea5e9', fontWeight: 700 }}>{i + 1}.</span>
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <button 
            className="danger-btn" 
            onClick={() => {
              if (window.confirm(`Delete incident record INC-${String(incident.id).padStart(4, '0')} permanently?`)) {
                onDelete(incident.id);
                onClose();
              }
            }}
          >
            <Trash2 size={15} /> Delete Record
          </button>
          <button className="secondary-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
