"""
Deep Learning NLP Model Interface — DistilBERT Sequence Classifier

Implements fine-tuned DistilBERT inference for SIF precursor detection.
Loaded ONCE at server startup (singleton pattern) with torch.no_grad() in eval mode.
CPU-compatible with Apple Silicon MPS acceleration fallback.
"""

import os
import time
import logging
from typing import Dict, Any, Optional
import warnings
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification

warnings.filterwarnings("ignore", category=UserWarning)

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'model', 'distilbert_sif')
BASELINE_PATH = os.path.join(BASE_DIR, 'model', 'pipeline.joblib')

class DistilBERTSifClassifier:
    _instance: Optional['DistilBERTSifClassifier'] = None
    
    def __init__(self, model_dir: str = MODEL_DIR):
        self.model_dir = model_dir
        self.tokenizer = None
        self.model = None
        self.device = torch.device("cpu")  # Default to CPU for predictable server inference
        self.is_loaded = False
        self.baseline_pipeline = None
        self._load_model()

    @classmethod
    def get_instance(cls) -> 'DistilBERTSifClassifier':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load_model(self):
        """Loads fine-tuned DistilBERT from local directory (quantized <100MB or safetensors), else prepares baseline fallback."""
        config_path = os.path.join(self.model_dir, "config.json")
        quant_path = os.path.join(self.model_dir, "quantized_distilbert.pt")
        safetensors_path = os.path.join(self.model_dir, "model.safetensors")

        if os.path.exists(self.model_dir) and os.path.exists(config_path):
            try:
                self.tokenizer = AutoTokenizer.from_pretrained(self.model_dir)

                # Prioritize lightweight Quantized Model (<100MB) if present
                if os.path.exists(quant_path):
                    logger.info(f"Loading Quantized DistilBERT model (<100MB) from {quant_path}...")
                    from transformers import AutoConfig
                    config = AutoConfig.from_pretrained(self.model_dir)
                    base_model = AutoModelForSequenceClassification.from_config(config)
                    # Recreate dynamic INT8 quantized linear layers
                    self.model = torch.quantization.quantize_dynamic(
                        base_model, {torch.nn.Linear}, dtype=torch.qint8
                    )
                    loaded_state = torch.load(quant_path, map_location='cpu')
                    # Decompress any FP16 embeddings back to float32 for CPU inference
                    for k, v in loaded_state.items():
                        if isinstance(v, torch.Tensor) and v.dtype == torch.float16:
                            loaded_state[k] = v.to(torch.float32)
                    self.model.load_state_dict(loaded_state)
                    self.device = torch.device("cpu")
                    self.model.eval()
                    self.is_loaded = True
                    self.is_quantized = True
                    logger.info("[✓] Quantized DistilBERT (86.8 MB, INT8) loaded successfully.")
                elif os.path.exists(safetensors_path):
                    if torch.backends.mps.is_available():
                        self.device = torch.device("mps")
                    else:
                        self.device = torch.device("cpu")
                    self.model = AutoModelForSequenceClassification.from_pretrained(self.model_dir)
                    self.model.to(self.device)
                    self.model.eval()
                    self.is_loaded = True
                    self.is_quantized = False
                    logger.info("[✓] DistilBERT full-precision model loaded successfully.")
            except Exception as e:
                logger.warning(f"Failed to load DistilBERT model: {e}. Falling back to baseline if available.")
                self.is_loaded = False

        # Always load baseline pipeline for comparative benchmark
        if os.path.exists(BASELINE_PATH):
            try:
                import joblib
                self.baseline_pipeline = joblib.load(BASELINE_PATH)
                logger.info("[✓] Loaded baseline TF-IDF pipeline for real-time comparison.")
            except Exception as e:
                logger.error(f"Failed to load baseline fallback: {e}")

    def predict(self, text: str) -> Dict[str, Any]:
        """
        Runs dual-engine model inference on incident description.
        Returns DistilBERT deep learning predictions, Baseline TF-IDF predictions,
        and consensus agreement telemetry.
        """
        if not text or not isinstance(text, str):
            raise ValueError("Input text must be a non-empty string.")

        distilbert_result = None
        baseline_result = None

        # 1. DistilBERT Deep Learning Inference
        if self.is_loaded and self.model is not None and self.tokenizer is not None:
            t0 = time.perf_counter()
            inputs = self.tokenizer(
                text,
                truncation=True,
                max_length=128,
                padding=True,
                return_tensors="pt"
            )
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits
                probs = F.softmax(logits, dim=-1).cpu().squeeze().tolist()

            elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
            prob_non_sif = float(probs[0])
            prob_sif = float(probs[1])
            predicted_class = 1 if prob_sif >= 0.50 else 0
            is_sif = bool(predicted_class == 1)
            conf = round(prob_sif if is_sif else prob_non_sif, 4)

            distilbert_result = {
                "is_sif_precursor": is_sif,
                "label": "Potential SIF Precursor Detected" if is_sif else "No SIF Precursor Detected",
                "predicted_class": predicted_class,
                "confidence": conf,
                "sif_probability": round(prob_sif, 4),
                "non_sif_probability": round(prob_non_sif, 4),
                "model_name": "DistilBERT Sequence Classifier (Fine-Tuned)",
                "framework": "Hugging Face Transformers / PyTorch",
                "device": str(self.device),
                "inference_time_ms": elapsed_ms
            }

        # 2. Baseline TF-IDF + Logistic Regression Inference
        if self.baseline_pipeline is not None:
            t0 = time.perf_counter()
            base_pred = int(self.baseline_pipeline.predict([text])[0])
            base_probs = self.baseline_pipeline.predict_proba([text])[0]
            base_prob_sif = float(base_probs[1])
            base_is_sif = bool(base_pred == 1)
            base_conf = round(base_prob_sif if base_is_sif else (1.0 - base_prob_sif), 4)
            base_elapsed = round((time.perf_counter() - t0) * 1000, 2)

            baseline_result = {
                "is_sif_precursor": base_is_sif,
                "label": "Potential SIF Precursor Detected" if base_is_sif else "No SIF Precursor Detected",
                "predicted_class": base_pred,
                "confidence": base_conf,
                "sif_probability": round(base_prob_sif, 4),
                "non_sif_probability": round(1.0 - base_prob_sif, 4),
                "model_name": "TF-IDF + Logistic Regression (Baseline)",
                "framework": "scikit-learn",
                "device": "cpu",
                "inference_time_ms": base_elapsed
            }

        primary = distilbert_result if distilbert_result is not None else baseline_result
        if primary is None:
            raise RuntimeError(
                "No trained model found. Please run train_model.py to fine-tune DistilBERT."
            )

        both_available = distilbert_result is not None and baseline_result is not None
        models_agree = bool(both_available and (distilbert_result["is_sif_precursor"] == baseline_result["is_sif_precursor"]))

        if both_available:
            if models_agree and primary["is_sif_precursor"]:
                consensus_text = "Unanimous SIF Precursor Consensus (100% Agreement)"
            elif models_agree and not primary["is_sif_precursor"]:
                consensus_text = "Unanimous Non-Precursor Consensus (100% Agreement)"
            else:
                consensus_text = "Model Divergence: DistilBERT High-Energy Context Prioritized"
        else:
            consensus_text = "Single Model Active"

        return {
            **primary,
            "is_deep_learning": distilbert_result is not None,
            "distilbert": distilbert_result,
            "baseline": baseline_result,
            "both_models_evaluated": both_available,
            "models_agree": models_agree,
            "consensus_label": consensus_text
        }
