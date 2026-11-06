/**
 * Central API Client and Failover Service for SIF Precursor Detector.
 *
 * Provides hybrid communication:
 * 1. Live Python Backend (Flask + DistilBERT + PyTorch):
 *    - In local development (`http://127.0.0.1:5001`) or when deployed to Render/Railway/Fly.io
 *      via `VITE_API_BASE_URL` or Netlify proxy.
 * 2. Client-Side Safety Engine (Graceful Fallback):
 *    - Automatically handles requests if the backend is offline, unreachable, or returning 404
 *      on static hosting environments (e.g. Netlify before backend deployment).
 *    - Eliminates "Unexpected token 'N', 'Not Found' is not valid JSON" syntax errors.
 */

import {
  clientAnalyzeIncident,
  clientGetIncidents,
  clientGetDashboard,
  clientGetModelInfo,
  clientUpdateIncidentStatus,
  clientDeleteIncident
} from '../services/clientSafetyEngine';

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  ''
).replace(/\/+$/, '');

export const getApiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

/**
 * Robust JSON request helper that safely handles HTML/Text 404s without JSON parse crashes.
 */
async function safeJsonRequest(endpoint, options = {}) {
  const url = getApiUrl(endpoint);
  const response = await fetch(url, options);

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    let errorDetail = `HTTP Error ${response.status}`;
    if (isJson) {
      try {
        const errorData = await response.json();
        errorDetail = errorData.error || errorData.message || errorDetail;
      } catch {}
    } else {
      const text = await response.text();
      if (response.status === 404) {
        errorDetail = `API route '${endpoint}' not found (404).`;
      } else if (text && text.length < 150) {
        errorDetail = `${errorDetail}: ${text.trim()}`;
      }
    }
    const err = new Error(errorDetail);
    err.status = response.status;
    err.isNotFound = response.status === 404;
    throw err;
  }

  if (isJson) {
    return await response.json();
  }

  const rawText = await response.text();
  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error(`Expected JSON from server but received non-JSON: ${rawText.slice(0, 100)}`);
  }
}

/**
 * Health check: queries live backend, falls back to client engine indicator
 */
export async function fetchHealth() {
  try {
    return await safeJsonRequest('/api/health');
  } catch (err) {
    return {
      status: "healthy",
      deep_learning_active: false,
      model_architecture: "Client Engine Active (Demo)",
      device: "Browser JS",
      is_fallback: true
    };
  }
}

/**
 * Dashboard metrics: queries live backend, falls back to local data store
 */
export async function fetchDashboardMetrics() {
  try {
    return await safeJsonRequest('/api/dashboard');
  } catch (err) {
    console.warn("[SIF App] Backend /api/dashboard unavailable, loading client store:", err.message);
    return clientGetDashboard();
  }
}

/**
 * Incident History list: queries live backend, falls back to local data store
 */
export async function fetchIncidents(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.search?.trim()) params.append('search', filters.search.trim());
    if (filters.risk) params.append('risk', filters.risk);
    if (filters.status) params.append('status', filters.status);
    if (filters.sif !== undefined && filters.sif !== '') params.append('sif', filters.sif);

    return await safeJsonRequest(`/api/incidents?${params.toString()}`);
  } catch (err) {
    console.warn("[SIF App] Backend /api/incidents unavailable, loading client store:", err.message);
    return clientGetIncidents(filters);
  }
}

/**
 * Analyze incident: queries live DistilBERT backend, falls back to domain-specific client engine
 */
export async function analyzeIncident(payload) {
  try {
    return await safeJsonRequest('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn("[SIF App] Backend /api/analyze unavailable, evaluating via client safety engine:", err.message);
    return clientAnalyzeIncident(payload);
  }
}

/**
 * Update corrective action status: patches live backend, falls back to local store
 */
export async function updateIncidentStatus(incidentId, newStatus) {
  try {
    return await safeJsonRequest(`/api/incidents/${incidentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
  } catch (err) {
    console.warn(`[SIF App] Backend update failed, updating incident #${incidentId} in client store:`, err.message);
    return clientUpdateIncidentStatus(incidentId, newStatus);
  }
}

/**
 * Delete incident record: deletes on live backend, falls back to local store
 */
export async function deleteIncident(incidentId) {
  try {
    return await safeJsonRequest(`/api/incidents/${incidentId}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.warn(`[SIF App] Backend delete failed, removing incident #${incidentId} in client store:`, err.message);
    return clientDeleteIncident(incidentId);
  }
}

/**
 * Model info metrics: queries live backend, falls back to bundled evaluation benchmarks
 */
export async function fetchModelInfo() {
  try {
    return await safeJsonRequest('/api/model-info');
  } catch (err) {
    console.warn("[SIF App] Backend /api/model-info unavailable, loading bundled benchmark metrics:", err.message);
    return clientGetModelInfo();
  }
}

export default {
  getApiUrl,
  fetchHealth,
  fetchDashboardMetrics,
  fetchIncidents,
  analyzeIncident,
  updateIncidentStatus,
  deleteIncident,
  fetchModelInfo
};
