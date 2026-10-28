# SIF Precursor Detector — Workplace Safety Deep Learning Analytics

An industrial safety machine learning web application that analyzes safety incident narratives and identifies potential precursors to Serious Injury or Fatality (SIF) events using fine-tuned **DistilBERT** deep learning and a domain-specific **Safety Hazard Recognition (NER)** module.

> **Academic & Research Demonstration Notice:** This system is an academic research and engineering demonstration. Predictions are statistical text screenings and must never replace certified industrial safety inspections, OSHA compliance audits, or human Environmental Health & Safety (EHS) officer review.

---

## 1. Architecture Overview

- **Frontend:** React (Vite), solid high-contrast industrial CSS design system (OSHA-standard dark slate `#0f172a`, amber `#f59e0b`, red `#ef4444`, green `#10b981`, and sky blue `#0ea5e9`), custom industrial telemetry background wallpaper, Recharts data visualization, and Lucide icons.
- **Backend:** Python Flask API, CORS enabled for local origins, running on port 5001 to prevent macOS AirPlay port 5000 conflicts.
- **Deep Learning Sequence Classifier:** Fine-tuned `distilbert-base-uncased` implemented with Hugging Face Transformers and PyTorch (accelerated with Apple Silicon MPS / CUDA / CPU fallback). Loaded once at Flask startup as a singleton (`DistilBERTSifClassifier`) for sub-300ms inference.
- **Safety Hazard Recognition (NER Module):** Domain-specific industrial safety entity recognition (`hazard_extractor.py`) extracting character spans and token offsets across four key categories:
  - **Equipment** (e.g., cranes, forklifts, mobile elevated work platforms, scaffolds, high-voltage switchgear)
  - **Unsafe Acts** (e.g., bypassing interlocks, working without tether, entering unventilated vaults)
  - **Failed Controls** (e.g., missing guardrails, bypassed lockouts, expired harnesses, failure to tag out)
  - **Hazard Domains** (e.g., fall from height, electrical arc flash, confined space, suspended loads)
  - **Hierarchy of Controls Generator:** Automatically pairs detected hazards with OSHA/HSE preventive actions (Elimination, Engineering, Administrative, PPE).
- **Comparative Baseline Model:** Scikit-learn TF-IDF Vectorizer (1-2 ngrams) + Logistic Regression (balanced class weights) for baseline benchmarking.
- **Database:** SQLite (`safety_incidents.db`) with automatic schema migration storing incident reports, detected entities, risk levels, and corrective action workflows.

---

## 2. Directory Structure

```
sif-precursor-detector/
  frontend/
    public/
      safety-engineer-bg.jpg  # User-provided industrial safety engineer wallpaper
    src/
      components/
        Sidebar.jsx             # Collapsible desktop/mobile navigation
        IncidentDetailModal.jsx # Detailed report inspector & status modifier
      pages/
        Dashboard.jsx           # KPIs, risk charts, and recent incident table
        AnalyzeIncident.jsx     # Real-time DistilBERT inference, confidence & entity chips
        IncidentHistory.jsx     # Searchable, filterable audit log
        AboutModel.jsx          # Live evaluation metrics, confusion matrix, and docs
      App.jsx                   # Main React application controller
      main.jsx                  # React DOM entry point
      styles.css                # Enterprise industrial safety design system
    package.json
    vite.config.js              # Vite config with backend API proxy (port 5001)
  backend/
    app.py                      # Flask REST API server with model integration
    nlp_model.py                # DistilBERT singleton inference engine & baseline fallback
    hazard_extractor.py         # Domain-tailored safety entity recognition & control hierarchy
    train_model.py              # PyTorch DistilBERT fine-tuning and baseline evaluation script
    data_generator.py           # Curated safety incident dataset generator (130 reports)
    database.py                 # SQLite database layer with schema migrations
    requirements.txt            # Python package dependencies
    data/
      safety_incidents.csv      # Curated workplace incident dataset (130 records)
    model/
      distilbert_sif/           # Fine-tuned PyTorch model weights, tokenizer & config
      pipeline.joblib           # Serialized baseline scikit-learn pipeline
      metrics.json              # Real evaluation metrics and confusion matrices
    instance/
      safety_incidents.db       # SQLite database instance
  .gitignore
  README.md
```

---

## 3. Getting Started (macOS & VS Code)

### Prerequisites
- Python 3.9+ installed
- Node.js v18+ and npm installed

---

### Option A: Run Unified Full-Stack Application (Single Command — Recommended)

The frontend and backend are merged into a single cohesive server. Run the entire full-stack app on a single port (**5001**):

```bash
cd sif-precursor-detector

# Run the unified runner (automatically verifies frontend build and starts Flask server)
./backend/venv/bin/python3 run.py
# Or:
# python3 run.py
```

Open your browser at: **`http://127.0.0.1:5001/`**
- The React UI, dashboard, incident history, real-time analyzer, and DistilBERT API all run seamlessly from port **5001**.

---

### Option B: Developer Mode (Hot-Reloading with Vite)

If you are modifying React UI components and prefer instant Vite Hot Module Replacement (HMR):

**Terminal 1 — Backend API Server:**
```bash
cd "sif-precursor-detector/backend"
source venv/bin/activate
pip install -r requirements.txt
python app.py
```
*(Backend runs on `http://127.0.0.1:5001`)*

**Terminal 2 — Frontend Dev Server:**
```bash
cd "sif-precursor-detector/frontend"
npm install
npm run dev
```
*(Frontend runs on `http://localhost:5173/` and proxies `/api` to `http://127.0.0.1:5001`)*

---

## 4. Model Evaluation & Benchmark Results

The models were evaluated on an independent, held-out test set consisting of 20 workplace incident reports (8 Non-SIF, 12 SIF Precursor). **No metrics or predictions are fabricated.**

### Held-Out Test Set Performance Comparison

| Metric | Baseline (TF-IDF + Logistic Regression) | Fine-Tuned DistilBERT (`distilbert-base-uncased`) | Improvement |
|---|---|---|---|
| **Accuracy** | 85.0% | **95.0%** | **+10.0%** |
| **Precision (SIF)** | 90.9% | **100.0%** | **+9.1%** |
| **Recall (SIF)** | 83.3% | **91.7%** | **+8.4%** |
| **F1-Score (SIF)** | 87.0% | **95.7%** | **+8.7%** |

### Confusion Matrix Breakdown (Test Set: N=20)

- **Fine-Tuned DistilBERT:**
  - True Negatives (Correct Non-SIF): **8 / 8 (100%)**
  - False Positives (False Alarms): **0 / 8 (0.0%)**
  - False Negatives (Missed Precursors): **1 / 12 (8.3%)**
  - True Positives (Detected Precursors): **11 / 12 (91.7%)**
- **Baseline (TF-IDF + Logistic Regression):**
  - True Negatives: **7** | False Positives: **1** | False Negatives: **2** | True Positives: **10**

### SIF Labeling Protocol
Reports are categorized following the **Campbell Institute / DEKRA SIF Model**:
- **SIF Precursor (`1`):** High-energy hazard exposure occurred in the absence or breakdown of a primary direct control barrier, with realistic potential for fatal or life-altering injury.
- **Non-Precursor (`0`):** Low-energy events or minor near-misses with zero fatality potential (e.g., minor paper cuts, clean office trips, standard first-aid abrasions).

---

## 5. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check, active model identification, and deep learning status |
| `GET` | `/api/dashboard` | Aggregated KPIs, SIF distribution, risk levels, and recent incidents |
| `POST` | `/api/analyze` | Run DistilBERT classification, extract safety entities, and persist incident in SQLite |
| `GET` | `/api/incidents` | List incidents with search query, risk tier, SIF flag, and status filters |
| `GET` | `/api/incidents/:id` | Retrieve single incident by ID with extracted entities |
| `PATCH`| `/api/incidents/:id/status` | Update corrective action status (`Open`, `In Progress`, `Under Review`, `Resolved`) |
| `DELETE`| `/api/incidents/:id` | Remove incident record |
| `GET` | `/api/model-info` | Live evaluation metrics, confusion matrix, training history, and labeling protocol |

---

## 6. Safety & Ethical Disclaimers

1. **Statistical Nature:** Predictions produced by DistilBERT represent statistical language pattern classifications and confidence scores. They are not legal certifications of site safety.
2. **Human-in-the-Loop:** A licensed safety officer or qualified EHS specialist must independently review all flagged incidents, especially those categorized as SIF Precursors or High/Critical risk.
3. **No Safety Guarantees:** Absence of a precursor flag does not guarantee the absence of workplace hazards.
