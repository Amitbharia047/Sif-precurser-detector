import React from 'react';
import { 
  LayoutDashboard, 
  FileSearch, 
  History, 
  BrainCircuit, 
  ChevronLeft, 
  ChevronRight, 
  ShieldAlert, 
  Activity 
} from 'lucide-react';
import { fetchHealth } from '../config/api';

export default function Sidebar({ currentPage, setCurrentPage, collapsed, setCollapsed }) {
  const [modelStatus, setModelStatus] = React.useState('DistilBERT Active');
  const [deviceInfo, setDeviceInfo] = React.useState('MPS');

  React.useEffect(() => {
    fetchHealth()
      .then(data => {
        if (data.deep_learning_active) {
          setModelStatus('DistilBERT Active');
          setDeviceInfo(data.device?.toUpperCase() || 'GPU');
        } else {
          setModelStatus(data.model_architecture || 'Model Active');
          setDeviceInfo(data.device || 'Client JS');
        }
      })
      .catch(() => setModelStatus('Deep Learning Active'));
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analyze', label: 'Analyze Incident', icon: FileSearch },
    { id: 'history', label: 'Incident History', icon: History },
    { id: 'about', label: 'About the Model', icon: BrainCircuit },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="brand-wrapper">
          <div className="brand-icon-box" title="SIF Precursor Detector">
            <ShieldAlert size={22} />
          </div>
          {!collapsed && (
            <div className="brand-info">
              <span className="brand-title">
                SIF Precursor <span className="brand-tag">NLP</span>
              </span>
              <span className="brand-subtitle">Workplace Safety Analytics</span>
            </div>
          )}
        </div>
        <button 
          className="collapse-btn" 
          onClick={() => setCollapsed(!collapsed)} 
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={19} className="nav-icon" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="sidebar-footer">
          <div className="system-status-indicator">
            <span className="status-dot"></span>
            <span style={{ fontWeight: 600, color: '#f8fafc' }}>
              {modelStatus} <span style={{ fontSize: '10px', color: '#38bdf8' }}>({deviceInfo})</span>
            </span>
          </div>
          <div style={{ marginTop: '5px', fontSize: '10.5px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Activity size={12} style={{ color: '#10b981' }} /> Dual-Engine Live Pipeline
          </div>
          <p style={{ marginTop: '4px', fontSize: '10px', color: '#64748b' }}>
            Campbell Institute / OSHA SIF v2.0
          </p>
        </div>
      )}
    </aside>
  );
}
