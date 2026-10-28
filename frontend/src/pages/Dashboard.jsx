import React, { useState } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileSearch, 
  ArrowRight, 
  Eye, 
  RefreshCw,
  PieChart as PieChartIcon,
  BarChart3
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';

export default function Dashboard({ 
  dashboardData, 
  loading, 
  onRefresh, 
  onNavigateToAnalyze, 
  onViewIncident,
  onStatusChange 
}) {
  const [updatingId, setUpdatingId] = useState(null);

  if (loading && !dashboardData) {
    return (
      <div className="content-body" style={{ textAlign: 'center', padding: '100px 0' }}>
        <RefreshCw size={32} className="spin" style={{ color: '#38bdf8', marginBottom: '16px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Loading Safety Analytics Telemetry...</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Connecting to SQLite & SIF Classifier</p>
      </div>
    );
  }

  const {
    total_incidents = 0,
    sif_precursors = 0,
    high_risk_count = 0,
    open_corrective_actions = 0,
    risk_distribution = [],
    hazard_breakdown = [],
    recent_incidents = []
  } = dashboardData || {};

  const sifPercentage = total_incidents > 0 
    ? ((sif_precursors / total_incidents) * 100).toFixed(1) 
    : 0;

  const handleStatusSelect = async (id, newStatus) => {
    setUpdatingId(id);
    await onStatusChange(id, newStatus);
    setUpdatingId(null);
  };

  return (
    <div className="content-body">
      {/* Industrial Hero Banner with Safety Blueprint Artwork */}
      <div className="dashboard-hero-banner">
        <div className="dashboard-hero-bg" />
        <div className="dashboard-hero-overlay" />
        <div className="dashboard-hero-content">
          <div className="hero-badge">
            <ShieldAlert size={14} /> SIF Precursor Detection System
          </div>
          <h2 className="hero-heading">Industrial Safety Risk Intelligence</h2>
          <p className="hero-desc">
            Early detection of fatal and serious injury potential within workplace incident reports 
            using Natural Language Processing and High-Energy Hazard classification.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="primary-btn" onClick={onNavigateToAnalyze}>
              <FileSearch size={16} /> Analyze New Incident
            </button>
            <button className="secondary-btn" onClick={onRefresh} title="Sync database metrics">
              <RefreshCw size={15} /> Refresh Metrics
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Reports</span>
            <div className="kpi-icon blue">
              <FileSearch size={18} />
            </div>
          </div>
          <div className="kpi-value">{total_incidents}</div>
          <div className="kpi-footer">
            <span>Verified incident narratives in SQLite</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">SIF Precursors</span>
            <div className="kpi-icon red">
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="kpi-value">{sif_precursors}</div>
          <div className="kpi-footer">
            <span style={{ color: '#fca5a5', fontWeight: 600 }}>{sifPercentage}%</span>
            <span>of total incident volume</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">High-Risk Reports</span>
            <div className="kpi-icon amber">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="kpi-value">{high_risk_count}</div>
          <div className="kpi-footer">
            <span>Critical energy / multiple hazards</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Open Corrective Actions</span>
            <div className="kpi-icon green">
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-value">{open_corrective_actions}</div>
          <div className="kpi-footer">
            <span>Pending or in-progress mitigation</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="charts-grid">
        {/* Risk Distribution Pie Chart */}
        <div className="chart-card">
          <div className="chart-title">
            <PieChartIcon size={18} style={{ color: '#38bdf8' }} /> Risk Level Distribution
          </div>
          <div className="chart-subtitle">
            Categorization based on SIF probability and high-energy barriers
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={risk_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={88}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {risk_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#38bdf8'} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: 'rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px'
                  }} 
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hazard Category Breakdown Bar Chart */}
        <div className="chart-card">
          <div className="chart-title">
            <BarChart3 size={18} style={{ color: '#f59e0b' }} /> Hazard Category Breakdown
          </div>
          <div className="chart-subtitle">
            Most frequent workplace hazards identified across reports
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hazard_breakdown} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis 
                  dataKey="category" 
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: 'rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px'
                  }} 
                />
                <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Reports" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Incidents Table */}
      <div className="table-card">
        <div className="table-header-row">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Recent Incident Reports</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Real-time records logged and categorized in SQLite database
            </p>
          </div>
          <button className="secondary-btn" onClick={onNavigateToAnalyze}>
            Analyze Report <ArrowRight size={14} />
          </button>
        </div>

        {recent_incidents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <p>No incidents recorded yet.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Workplace</th>
                  <th>Description</th>
                  <th>SIF Precursor</th>
                  <th>Risk Category</th>
                  <th>Corrective Action</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recent_incidents.map((inc) => (
                  <tr key={inc.id}>
                    <td>
                      <span className="incident-id-badge">INC-{String(inc.id).padStart(4, '0')}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>{inc.incident_date}</td>
                    <td style={{ fontSize: '12px', color: '#94a3b8' }}>{inc.workplace_type}</td>
                    <td style={{ maxWidth: '320px' }}>
                      <div style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap', 
                        fontSize: '12.5px' 
                      }} title={inc.description}>
                        {inc.description}
                      </div>
                    </td>
                    <td>
                      {inc.is_sif_precursor ? (
                        <span className="badge badge-sif">
                          <ShieldAlert size={12} /> Detected
                        </span>
                      ) : (
                        <span className="badge badge-non-sif">
                          <CheckCircle2 size={12} /> Not Detected
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-risk-${inc.risk_category?.toLowerCase() || 'medium'}`}>
                        {inc.risk_category}
                      </span>
                    </td>
                    <td>
                      <select
                        className="status-select"
                        value={inc.corrective_action_status}
                        disabled={updatingId === inc.id}
                        onChange={(e) => handleStatusSelect(inc.id, e.target.value)}
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="secondary-btn" 
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => onViewIncident(inc)}
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
