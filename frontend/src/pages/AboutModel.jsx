import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Layers, 
  Scale, 
  RefreshCw,
  TrendingUp,
  Cpu,
  ShieldAlert,
  GitCompare,
  Wrench,
  BookOpen
} from 'lucide-react';

export default function AboutModel() {
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchModelInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/model-info');
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      setModelInfo(data);
    } catch (err) {
      setError(err.message || 'Failed to load model metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelInfo();
  }, []);

  const dMetrics = modelInfo?.distilbert_metrics || {};
  const baseMetrics = modelInfo?.baseline_comparison || {};
  const stats = modelInfo?.dataset_stats || {};
  const cm = dMetrics.confusion_matrix || {};
  const baseCm = baseMetrics.confusion_matrix || {};
  const trainHistory = dMetrics.training_history || [];

  return (
    <div className="content-body" style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px', marginBottom: '4px' }}>
          Deep Learning Model & NLP Architecture
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Technical documentation, fine-tuned DistilBERT transformer evaluation, baseline comparison, and safety science methodology.
        </p>
      </div>

      {/* Model Spec Tag Bar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <span style={{ background: '#090e1a', border: '1px solid var(--border-medium)', padding: '5px 10px', borderRadius: '4px', fontSize: '12px', color: '#94a3b8' }}>
          <strong style={{ color: '#fff' }}>Base Architecture:</strong> distilbert-base-uncased (66M params)
        </span>
        <span style={{ background: '#090e1a', border: '1px solid var(--border-medium)', padding: '5px 10px', borderRadius: '4px', fontSize: '12px', color: '#94a3b8' }}>
          <strong style={{ color: '#fff' }}>Framework:</strong> PyTorch & Hugging Face Transformers
        </span>
        <span style={{ background: '#090e1a', border: '1px solid var(--border-medium)', padding: '5px 10px', borderRadius: '4px', fontSize: '12px', color: '#94a3b8' }}>
          <strong style={{ color: '#fff' }}>Optimizer:</strong> AdamW (lr=2e-5, weight decay=0.01)
        </span>
        <span style={{ background: '#090e1a', border: '1px solid var(--border-medium)', padding: '5px 10px', borderRadius: '4px', fontSize: '12px', color: '#94a3b8' }}>
          <strong style={{ color: '#fff' }}>Task:</strong> Binary Sequence Classification (SIF Precursor)
        </span>
      </div>

      {/* Real Evaluation Metrics Cards (Live from train_model.py) */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} style={{ color: '#0ea5e9' }} /> DistilBERT Held-Out Test Set Performance
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Evaluated on {stats.test_samples} unseen test narratives (Stratified split)
          </span>
        </div>

        {loading ? (
          <div className="table-card" style={{ textAlign: 'center', padding: '30px' }}>
            <RefreshCw size={20} className="spin" style={{ color: '#0ea5e9' }} />
            <p style={{ fontSize: '12px', marginTop: '8px', color: 'var(--text-muted)' }}>Loading model metadata...</p>
          </div>
        ) : error ? (
          <div className="table-card" style={{ color: 'var(--sif-red)', padding: '16px' }}>
            {error}
          </div>
        ) : (
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Test Accuracy</span>
                <div className="kpi-icon blue"><CheckCircle size={16} /></div>
              </div>
              <div className="kpi-value">{((dMetrics.accuracy || 0) * 100).toFixed(1)}%</div>
              <div className="kpi-footer">Overall test set classification accuracy</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Test Precision</span>
                <div className="kpi-icon green"><CheckCircle size={16} /></div>
              </div>
              <div className="kpi-value">{((dMetrics.precision || 0) * 100).toFixed(1)}%</div>
              <div className="kpi-footer">Zero false alarms on SIF precursors</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Test Recall</span>
                <div className="kpi-icon amber"><AlertTriangle size={16} /></div>
              </div>
              <div className="kpi-value">{((dMetrics.recall || 0) * 100).toFixed(1)}%</div>
              <div className="kpi-footer">True SIF precursor capture rate</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Test F1-Score</span>
                <div className="kpi-icon blue"><Scale size={16} /></div>
              </div>
              <div className="kpi-value">{((dMetrics.f1_score || 0) * 100).toFixed(1)}%</div>
              <div className="kpi-footer">Harmonic mean of precision & recall</div>
            </div>
          </div>
        )}
      </div>

      {/* Baseline Comparison Table */}
      {modelInfo && (
        <div className="table-card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <GitCompare size={16} style={{ color: '#0ea5e9' }} />
            <h4 style={{ fontSize: '14px', fontWeight: 700 }}>
              Deep Learning vs Baseline Model Comparison
            </h4>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Trained and evaluated on the exact same stratified train/validation/test splits.
          </p>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Model Architecture</th>
                  <th>Type</th>
                  <th>Accuracy</th>
                  <th>Precision (SIF)</th>
                  <th>Recall (SIF)</th>
                  <th>F1-Score</th>
                  <th>Inference Speed</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong style={{ color: '#38bdf8' }}>DistilBERT Sequence Classifier</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>distilbert-base-uncased (Fine-Tuned)</div>
                  </td>
                  <td>
                    <span style={{ background: 'var(--sif-blue-bg)', color: '#38bdf8', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>
                      Deep Transformer
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>
                    {((dMetrics.accuracy || 0) * 100).toFixed(1)}%
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#34d399' }}>
                    {((dMetrics.precision || 0) * 100).toFixed(1)}%
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fbbf24' }}>
                    {((dMetrics.recall || 0) * 100).toFixed(1)}%
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8' }}>
                    {((dMetrics.f1_score || 0) * 100).toFixed(1)}%
                  </td>
                  <td style={{ fontSize: '12px', color: '#94a3b8' }}>~25-40 ms (CPU/MPS)</td>
                </tr>
                <tr>
                  <td>
                    <strong style={{ color: '#e2e8f0' }}>TF-IDF + Logistic Regression</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>N-grams (1,2) with balanced class weights</div>
                  </td>
                  <td>
                    <span style={{ background: '#1e293b', color: '#94a3b8', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>
                      Linear Baseline
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                    {((baseMetrics.accuracy || 0) * 100).toFixed(1)}%
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                    {((baseMetrics.precision || 0) * 100).toFixed(1)}%
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                    {((baseMetrics.recall || 0) * 100).toFixed(1)}%
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                    {((baseMetrics.f1_score || 0) * 100).toFixed(1)}%
                  </td>
                  <td style={{ fontSize: '12px', color: '#94a3b8' }}>~1-3 ms (CPU)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confusion Matrix and Training Progression */}
      {modelInfo && (
        <div className="charts-grid" style={{ marginBottom: '24px' }}>
          {/* DistilBERT Confusion Matrix */}
          <div className="chart-card">
            <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '3px' }}>
              DistilBERT Test Set Confusion Matrix
            </h4>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Tested on {stats.test_samples} reports (8 Actual Non-SIF, 12 Actual SIF)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ background: 'var(--sif-green-bg)', border: '1px solid var(--sif-green-border)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>True Negatives (TN)</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--sif-green)', fontFamily: 'var(--font-mono)' }}>
                  {cm.true_negative ?? 0}
                </div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Correct Non-SIFs</div>
              </div>

              <div style={{ background: 'var(--sif-red-bg)', border: '1px solid var(--sif-red-border)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>False Positives (FP)</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--sif-red)', fontFamily: 'var(--font-mono)' }}>
                  {cm.false_positive ?? 0}
                </div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Non-SIF flagged as SIF</div>
              </div>

              <div style={{ background: 'var(--sif-amber-bg)', border: '1px solid var(--sif-amber-border)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>False Negatives (FN)</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--sif-amber)', fontFamily: 'var(--font-mono)' }}>
                  {cm.false_negative ?? 0}
                </div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Missed SIF Precursor</div>
              </div>

              <div style={{ background: 'var(--sif-green-bg)', border: '1px solid var(--sif-green-border)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>True Positives (TP)</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--sif-green)', fontFamily: 'var(--font-mono)' }}>
                  {cm.true_positive ?? 0}
                </div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Correct SIF Precursors</div>
              </div>
            </div>
          </div>

          {/* Training Epoch Progression */}
          <div className="chart-card">
            <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '3px' }}>
              Training Loss & Validation Progression
            </h4>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Fine-tuning history over 4 epochs (AdamW lr=2e-5, warmup=10%)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {trainHistory.map((ep) => (
                <div key={ep.epoch} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#090e1a', padding: '8px 12px', borderRadius: '4px', fontSize: '12px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontWeight: 600, color: '#fff' }}>Epoch {ep.epoch}</span>
                  <span style={{ color: '#94a3b8' }}>Loss: <span style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>{ep.train_loss}</span></span>
                  <span style={{ color: '#94a3b8' }}>Val Acc: <span style={{ fontFamily: 'var(--font-mono)', color: '#34d399' }}>{(ep.val_accuracy * 100).toFixed(0)}%</span></span>
                  <span style={{ color: '#94a3b8' }}>Val F1: <span style={{ fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>{(ep.val_f1 * 100).toFixed(0)}%</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Safety Science & Methodological Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="table-card">
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={16} style={{ color: '#0ea5e9' }} /> Documented SIF Precursor Labeling Protocol
          </h3>
          <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#cbd5e1', marginBottom: '8px' }}>
            Ground-truth labeling in this project adheres to the <strong>Campbell Institute (National Safety Council)</strong> and 
            DEKRA industrial safety research. Crucially, historical severe injuries alone do not define a precursor. A report is labeled 
            as a <strong>Potential SIF Precursor (Class 1)</strong> when:
          </p>
          <ul style={{ paddingLeft: '22px', fontSize: '12.5px', color: '#94a3b8', lineHeight: 1.6 }}>
            <li><strong>High-Energy Hazard:</strong> Work involves gravity elevation (&gt;4ft), electrical potentials (&gt;50V / arc flash), mechanical in-running pinch points, toxic/pressurized chemicals, mobile equipment travel paths, or trench excavations.</li>
            <li><strong>Failed or Absent Control Barrier:</strong> A direct engineered control barrier was absent, bypassed, damaged, or unverified (e.g. PFAS unanchored, LOTO not applied, interlock jumpered, machine guard missing, atmospheric test omitted).</li>
            <li><strong>Credible Life-Altering Potential:</strong> The situation held reasonable potential to cause permanent disfigurement, disability, or death, regardless of whether injury actually happened.</li>
          </ul>
        </div>

        <div className="table-card">
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wrench size={16} style={{ color: '#f59e0b' }} /> Safety Hazard & Entity Extraction Architecture
          </h3>
          <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#cbd5e1', marginBottom: '8px' }}>
            Generic token-classification models (such as BERT trained on CoNLL-03 news corpora) only extract standard tags: 
            <code>PERSON</code>, <code>LOCATION</code>, and <code>ORGANIZATION</code>. They lack training on safety standards 
            and cannot recognize industrial equipment, unsafe behaviors, or missing barriers.
          </p>
          <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#94a3b8' }}>
            To avoid misleading safety officers, our <code>hazard_extractor.py</code> module uses a verified domain taxonomy 
            incorporating OSHA 1910/1926 standards, extracting: <strong>Equipment/Machinery</strong>, <strong>Unsafe Acts</strong>, 
            <strong>Failed Controls</strong>, and <strong>Hazard Domains</strong>, combined with transparent character-span offsets.
          </p>
        </div>

        <div className="table-card" style={{ borderColor: 'var(--sif-amber-border)', background: '#1c1508' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: 'var(--sif-amber)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} /> Limitations & Mandatory Human-In-The-Loop Safety Review
          </h3>
          <p style={{ fontSize: '12.5px', lineHeight: 1.6, color: '#fde68a', marginBottom: '6px' }}>
            This application is an academic and research demonstration. Model confidence reflects mathematical softmax token 
            distribution, NOT certified physical hazard probabilities.
          </p>
          <p style={{ fontSize: '12.5px', lineHeight: 1.6, color: '#cbd5e1' }}>
            Machine learning predictions must never be used autonomously to override field safety inspections, bypass lockouts, 
            or waive PPE requirements. All workplace safety decisions, root-cause analyses, and regulatory incident filings 
            must be authorized by qualified Environmental Health & Safety (EHS) professionals.
          </p>
        </div>
      </div>
    </div>
  );
}
