#!/usr/bin/env python3
"""
SIF Precursor Detector — Unified Single-Command Runner
Launches the merged full-stack application (Flask + DistilBERT + React Frontend)
on a single port (default 5001).
"""

import os
import sys
import subprocess
import webbrowser

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
FRONTEND_DIST = os.path.join(FRONTEND_DIR, "dist")
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
VENV_PYTHON = os.path.join(BACKEND_DIR, "venv", "bin", "python3")
APP_PY = os.path.join(BACKEND_DIR, "app.py")

def ensure_frontend_build():
    """Build the React frontend if not already compiled in dist/."""
    index_html = os.path.join(FRONTEND_DIST, "index.html")
    if not os.path.exists(index_html):
        print("[*] Compiling React frontend for production...")
        try:
            subprocess.run(["npm", "run", "build"], cwd=FRONTEND_DIR, check=True)
            print("[✓] Frontend build completed successfully.")
        except Exception as e:
            print(f"[!] Warning: Failed to build frontend automatically: {e}")
            print("[!] Please run 'npm run build' inside frontend/.")

def main():
    print("=" * 65)
    print("  SIF Precursor Detector — Workplace Safety Deep Learning")
    print("  Unified Full-Stack Server (Port 5001)")
    print("=" * 65)
    
    ensure_frontend_build()
    
    python_bin = VENV_PYTHON if os.path.exists(VENV_PYTHON) else sys.executable
    print(f"[*] Python interpreter: {python_bin}")
    print(f"[*] Starting server at: http://127.0.0.1:5001")
    print("=" * 65)
    
    # Launch Flask app
    try:
        subprocess.run([python_bin, APP_PY], cwd=BACKEND_DIR)
    except KeyboardInterrupt:
        print("\n[*] Server stopped.")

if __name__ == "__main__":
    main()
