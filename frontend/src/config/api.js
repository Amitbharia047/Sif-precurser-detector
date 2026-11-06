/**
 * Central API configuration for SIF Precursor Detector.
 *
 * Supports three deployment & execution modes:
 * 1. Production on Netlify (Direct Cross-Origin):
 *    Set VITE_API_BASE_URL (or VITE_API_URL) in Netlify's Environment Variables
 *    to your deployed backend URL (e.g., https://your-backend.onrender.com).
 * 2. Production on Netlify (Reverse Proxy Rewrite):
 *    Leave VITE_API_BASE_URL empty and use Netlify's /api/* proxy rewrite in netlify.toml / _redirects.
 * 3. Local Development:
 *    Empty by default (''), relying on Vite's local proxy (http://127.0.0.1:5001)
 *    or Flask's unified static asset server on port 5001.
 */

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  ''
).replace(/\/+$/, '');

/**
 * Returns a normalized URL for the given API path.
 *
 * @param {string} endpoint - The relative endpoint path (e.g., '/api/health', '/api/incidents')
 * @returns {string} The full or relative API path
 */
export const getApiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

export default getApiUrl;

