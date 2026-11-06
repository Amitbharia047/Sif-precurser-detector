import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle2, 
  Trash2, 
  Eye, 
  Calendar,
  Building2,
  Tag,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { getApiUrl } from '../config/api';

export default function IncidentHistory({ 
  onViewIncident, 
  onStatusChange, 
  onDeleteIncident,
  refreshTrigger 
}) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sifFilter, setSifFilter] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (riskFilter) params.append('risk', riskFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (sifFilter !== '') params.append('sif', sifFilter);

      const res = await fetch(getApiUrl(`/api/incidents?${params.toString()}`));
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      setIncidents(data);
    } catch (err) {
      setError(err.message || 'Failed to load incident history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [search, riskFilter, statusFilter, sifFilter, refreshTrigger]);

  const handleStatusUpdate = async (id, newStatus) => {
    setUpdatingId(id);
    await onStatusChange(id, newStatus);
    // update local state
    setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, corrective_action_status: newStatus } : inc));
    setUpdatingId(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete incident record INC-${String(id).padStart(4, '0')}?`)) {
      return;
    }
    const success = await onDeleteIncident(id);
    if (success) {
      setIncidents(prev => prev.filter(inc => inc.id !== id));
    }
  };

  const exportToCsv = () => {
    if (!incidents || incidents.length === 0) {
      alert("No incidents available to export.");
      return;
    }
    const headers = ["ID", "Date", "Workplace", "Hazard Category", "SIF Precursor", "Risk Level", "Confidence", "Status", "Description"];
    const rows = incidents.map(inc => [
      `INC-${String(inc.id).padStart(4, '0')}`,
      `"${inc.incident_date || ''}"`,
      `"${inc.workplace_type || ''}"`,
      `"${inc.hazard_category || ''}"`,
      inc.is_sif_precursor ? "YES" : "NO",
      inc.risk_category || "Low",
      `${(inc.confidence * 100).toFixed(1)}%`,
      inc.corrective_action_status || "Open",
      `"${(inc.description || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sif_incident_audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJson = () => {
    if (!incidents || incidents.length === 0) {
      alert("No incidents available to export.");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(incidents, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `sif_incident_audit_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="content-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.4px', marginBottom: '4px' }}>
            Incident Audit History
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>
            Persistent SQLite audit log of classified workplace safety incidents and corrective action statuses.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="secondary-btn" onClick={exportToCsv} title="Download CSV Audit Sheet">
            <FileSpreadsheet size={14} style={{ color: '#10b981' }} /> Export CSV
          </button>
          <button className="secondary-btn" onClick={exportToJson} title="Download Raw JSON Records">
            <Download size={14} style={{ color: '#0ea5e9' }} /> Export JSON
          </button>
          <button className="secondary-btn" onClick={fetchIncidents}>
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="table-card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search narrative description, workplace..."
              style={{ paddingLeft: '36px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* SIF Filter */}
          <select 
            className="form-select"
            value={sifFilter}
            onChange={(e) => setSifFilter(e.target.value)}
          >
            <option value="">All Precursor Status</option>
            <option value="true">SIF Precursor Only</option>
            <option value="false">Non-SIF Only</option>
          </select>

          {/* Risk Filter */}
          <select 
            className="form-select"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          >
            <option value="">All Risk Levels</option>
            <option value="High">High Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="Low">Low Risk</option>
          </select>

          {/* Corrective Action Status Filter */}
          <select 
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Action Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Under Review">Under Review</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="table-card">
        {loading && incidents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin" style={{ color: '#38bdf8', marginBottom: '12px' }} />
            <p>Querying SQLite records...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--sif-red)' }}>
            <p>{error}</p>
          </div>
        ) : incidents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <p>No safety incidents match current filter criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Incident ID</th>
                  <th>Date</th>
                  <th>Workplace</th>
                  <th>Incident Description</th>
                  <th>Classification</th>
                  <th>Risk Category</th>
                  <th>Corrective Action</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => (
                  <tr key={inc.id}>
                    <td>
                      <span className="incident-id-badge">
                        INC-{String(inc.id).padStart(4, '0')}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                      {inc.incident_date}
                    </td>
                    <td style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {inc.workplace_type}
                    </td>
                    <td style={{ maxWidth: '300px' }}>
                      <div 
                        style={{ 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap', 
                          fontSize: '12.5px',
                          color: '#e2e8f0',
                          cursor: 'pointer'
                        }}
                        onClick={() => onViewIncident(inc)}
                        title="Click to view full report"
                      >
                        {inc.description}
                      </div>
                    </td>
                    <td>
                      {inc.is_sif_precursor ? (
                        <span className="badge badge-sif">
                          <ShieldAlert size={12} /> SIF Precursor
                        </span>
                      ) : (
                        <span className="badge badge-non-sif">
                          <CheckCircle2 size={12} /> Non-SIF
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
                        onChange={(e) => handleStatusUpdate(inc.id, e.target.value)}
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button 
                        className="secondary-btn" 
                        style={{ padding: '4px 8px', fontSize: '12px', marginRight: '6px' }}
                        onClick={() => onViewIncident(inc)}
                        title="View details"
                      >
                        <Eye size={13} />
                      </button>
                      <button 
                        className="danger-btn" 
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => handleDelete(inc.id)}
                        title="Delete record"
                      >
                        <Trash2 size={13} />
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
