import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import AnalyzeIncident from './pages/AnalyzeIncident';
import IncidentHistory from './pages/IncidentHistory';
import AboutModel from './pages/AboutModel';
import IncidentDetailModal from './components/IncidentDetailModal';
import { ShieldCheck, Plus, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const fetchDashboardMetrics = async () => {
    try {
      setLoadingDashboard(true);
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      console.error("Failed to load dashboard metrics:", err);
      showToast("Could not sync dashboard with server.", "error");
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const handleStatusChange = async (incidentId, newStatus) => {
    try {
      const res = await fetch(`/api/incidents/${incidentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Failed to update status on server");
      const data = await res.json();

      // Refresh dashboard metrics
      fetchDashboardMetrics();
      setHistoryRefreshKey((prev) => prev + 1);

      // If modal is currently open with this incident, update it
      if (selectedIncident && selectedIncident.id === incidentId) {
        setSelectedIncident(data.incident);
      }

      showToast(`Incident #${incidentId} status updated to ${newStatus}`, 'success');
      return true;
    } catch (err) {
      showToast(err.message || "Failed to update corrective action status", 'error');
      return false;
    }
  };

  const handleDeleteIncident = async (incidentId) => {
    try {
      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error("Failed to delete incident on server");

      fetchDashboardMetrics();
      setHistoryRefreshKey((prev) => prev + 1);
      showToast(`Incident #${incidentId} deleted from database`, 'success');
      return true;
    } catch (err) {
      showToast(err.message || "Failed to delete incident", 'error');
      return false;
    }
  };

  const handleIncidentAnalyzed = (newIncident) => {
    fetchDashboardMetrics();
    setHistoryRefreshKey((prev) => prev + 1);
    showToast(`Incident INC-${String(newIncident.id).padStart(4, '0')} analyzed and recorded!`, 'success');
  };

  const pageHeaders = {
    dashboard: { title: 'Industrial Safety Dashboard', subtitle: 'Real-time SIF Precursor Risk Telemetry' },
    analyze: { title: 'Incident Precursor Analysis', subtitle: 'Machine Learning Text Classification Engine' },
    history: { title: 'Incident Audit Records', subtitle: 'Persistent SQLite Safety Incident Repository' },
    about: { title: 'Model Architecture & Safety Science', subtitle: 'TF-IDF & Logistic Regression Methodology' },
  };

  return (
    <div className="app-container">
      {/* Collapsible Sidebar */}
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Content Wrapper */}
      <div className="main-wrapper">
        {/* Sticky Top Bar */}
        <header className="top-bar">
          <div className="page-title-box">
            <h1 className="page-title">{pageHeaders[currentPage]?.title}</h1>
            <span className="page-subtitle">{pageHeaders[currentPage]?.subtitle}</span>
          </div>

          <div className="top-actions">
            {currentPage !== 'analyze' && (
              <button
                className="primary-btn"
                onClick={() => setCurrentPage('analyze')}
              >
                <Plus size={16} /> Analyze Incident
              </button>
            )}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontWeight: 600
            }}>
              <ShieldCheck size={14} /> System Online
            </div>
          </div>
        </header>

        {/* Page Routing */}
        <main>
          {currentPage === 'dashboard' && (
            <Dashboard
              dashboardData={dashboardData}
              loading={loadingDashboard}
              onRefresh={fetchDashboardMetrics}
              onNavigateToAnalyze={() => setCurrentPage('analyze')}
              onViewIncident={(inc) => setSelectedIncident(inc)}
              onStatusChange={handleStatusChange}
            />
          )}

          {currentPage === 'analyze' && (
            <AnalyzeIncident
              onIncidentAnalyzed={handleIncidentAnalyzed}
              onNavigateToHistory={() => setCurrentPage('history')}
            />
          )}

          {currentPage === 'history' && (
            <IncidentHistory
              onViewIncident={(inc) => setSelectedIncident(inc)}
              onStatusChange={handleStatusChange}
              onDeleteIncident={handleDeleteIncident}
              refreshTrigger={historyRefreshKey}
            />
          )}

          {currentPage === 'about' && <AboutModel />}
        </main>
      </div>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteIncident}
        />
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.type === 'error' ? (
              <AlertCircle size={16} style={{ color: 'var(--sif-red)' }} />
            ) : (
              <CheckCircle size={16} style={{ color: 'var(--sif-green)' }} />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
