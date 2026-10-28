"""
Model Training Script — DistilBERT Deep Learning & Baseline Comparison

This script:
1. Loads the labeled workplace safety incidents dataset with documented SIF criteria.
2. Performs a stratified split into Train (70%), Validation (15%), and Test (15%) sets.
3. Fine-tunes DistilBERT (distilbert-base-uncased) for sequence classification using PyTorch.
4. Evaluates DistilBERT on the held-out test set (Accuracy, Precision, Recall, F1, Confusion Matrix).
5. Trains a baseline TF-IDF + Logistic Regression model on the same train/test splits for transparent comparison.
6. Saves the fine-tuned DistilBERT model and tokenizer to model/distilbert_sif/.
7. Saves the baseline pipeline to model/pipeline.joblib.
8. Writes comprehensive, un-fabricated evaluation metrics to model/metrics.json.
"""

import os
import csv
import json
import time
from datetime import datetime
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    get_linear_schedule_with_warmup
)
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report
)
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'safety_incidents.csv')
MODEL_DIR = os.path.join(BASE_DIR, 'model')
DISTILBERT_DIR = os.path.join(MODEL_DIR, 'distilbert_sif')
BASELINE_PATH = os.path.join(MODEL_DIR, 'pipeline.joblib')
METRICS_PATH = os.path.join(MODEL_DIR, 'metrics.json')

class SafetyDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_len=128):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_len = max_len

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]
        encoding = self.tokenizer(
            text,
            truncation=True,
            max_length=self.max_len,
            padding="max_length",
            return_tensors="pt"
        )
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': torch.tensor(label, dtype=torch.long)
        }

def load_data(file_path):
    texts, labels, workplaces, hazards = [], [], [], []
    with open(file_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            texts.append(row['description'].strip())
            labels.append(int(row['is_sif_precursor']))
            workplaces.append(row.get('workplace_type', 'General'))
            hazards.append(row.get('hazard_category', 'General'))
    return texts, labels, workplaces, hazards

def evaluate_torch_model(model, dataloader, device):
    model.eval()
    all_preds, all_labels, all_probs = [], [], []
    with torch.no_grad():
        for batch in dataloader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['labels'].to(device)

            outputs = model(input_ids=input_ids, attention_mask=attention_mask)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1)
            preds = torch.argmax(logits, dim=-1)

            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            all_probs.extend(probs[:, 1].cpu().numpy())

    acc = accuracy_score(all_labels, all_preds)
    prec = precision_score(all_labels, all_preds, zero_division=0)
    rec = recall_score(all_labels, all_preds, zero_division=0)
    f1 = f1_score(all_labels, all_preds, zero_division=0)
    cm = confusion_matrix(all_labels, all_preds).tolist()
    return acc, prec, rec, f1, cm, all_preds, all_labels, all_probs

def main():
    print("=" * 70)
    print("  SIF Precursor Detector — DistilBERT Deep Learning & Baseline Training")
    print("=" * 70)

    os.makedirs(DISTILBERT_DIR, exist_ok=True)

    # 1. Load Dataset
    texts, labels, workplaces, hazards = load_data(DATA_PATH)
    total_samples = len(labels)
    sif_total = sum(labels)
    non_sif_total = total_samples - sif_total

    print(f"[*] Dataset summary ({total_samples} total safety incident reports):")
    print(f"    - SIF Precursors (Class 1): {sif_total} ({sif_total/total_samples*100:.1f}%)")
    print(f"    - Non-Precursors (Class 0): {non_sif_total} ({non_sif_total/total_samples*100:.1f}%)")

    # 2. Stratified 70% Train, 15% Validation, 15% Test Split
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        texts, labels, test_size=0.15, random_state=42, stratify=labels
    )
    # Remaining 85% split into Train (approx 70% total) and Val (approx 15% total)
    val_rel_size = 0.15 / 0.85
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val, y_train_val, test_size=val_rel_size, random_state=42, stratify=y_train_val
    )

    print(f"[*] Stratified Dataset Splits:")
    print(f"    - Training Set:   {len(X_train)} samples (SIF: {sum(y_train)}, Non-SIF: {len(y_train)-sum(y_train)})")
    print(f"    - Validation Set: {len(X_val)} samples (SIF: {sum(y_val)}, Non-SIF: {len(y_val)-sum(y_val)})")
    print(f"    - Test Set:       {len(X_test)} samples (SIF: {sum(y_test)}, Non-SIF: {len(y_test)-sum(y_test)})")

    # 3. Train Baseline Model (TF-IDF + Logistic Regression)
    print("\n" + "-" * 70)
    print("  [1/2] Training Baseline: TF-IDF Vectorizer + Logistic Regression")
    print("-" * 70)
    baseline_pipe = Pipeline([
        ('tfidf', TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=1200,
            sublinear_tf=True,
            stop_words='english'
        )),
        ('clf', LogisticRegression(
            C=1.2,
            random_state=42,
            max_iter=300,
            class_weight='balanced'
        ))
    ])
    baseline_pipe.fit(X_train, y_train)
    base_preds = baseline_pipe.predict(X_test)
    base_acc = accuracy_score(y_test, base_preds)
    base_prec = precision_score(y_test, base_preds, zero_division=0)
    base_rec = recall_score(y_test, base_preds, zero_division=0)
    base_f1 = f1_score(y_test, base_preds, zero_division=0)
    base_cm = confusion_matrix(y_test, base_preds).tolist()

    joblib.dump(baseline_pipe, BASELINE_PATH)
    print(f"[✓] Baseline trained & saved to: {BASELINE_PATH}")
    print(f"    Baseline Test Accuracy:  {base_acc:.4f} ({base_acc*100:.1f}%)")
    print(f"    Baseline Test Precision: {base_prec:.4f} ({base_prec*100:.1f}%)")
    print(f"    Baseline Test Recall:    {base_rec:.4f} ({base_rec*100:.1f}%)")
    print(f"    Baseline Test F1-Score:  {base_f1:.4f} ({base_f1*100:.1f}%)")

    # 4. Fine-Tune DistilBERT Sequence Classifier
    print("\n" + "-" * 70)
    print("  [2/2] Fine-Tuning Deep Learning Model: distilbert-base-uncased")
    print("-" * 70)

    # Device selection: Apple MPS if available else CPU
    if torch.backends.mps.is_available():
        device = torch.device("mps")
    elif torch.cuda.is_available():
        device = torch.device("cuda")
    else:
        device = torch.device("cpu")
    print(f"[*] Training on device: {device}")

    model_name = "distilbert-base-uncased"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=2)
    model.to(device)

    train_dataset = SafetyDataset(X_train, y_train, tokenizer)
    val_dataset = SafetyDataset(X_val, y_val, tokenizer)
    test_dataset = SafetyDataset(X_test, y_test, tokenizer)

    batch_size = 8
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)

    epochs = 4
    total_steps = len(train_loader) * epochs
    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-5, weight_decay=0.01)
    scheduler = get_linear_schedule_with_warmup(optimizer, num_warmup_steps=int(total_steps * 0.1), num_training_steps=total_steps)

    training_history = []
    print(f"[*] Starting fine-tuning for {epochs} epochs...")

    start_train_time = time.time()
    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0

        for batch in train_loader:
            optimizer.zero_grad()
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['labels'].to(device)

            outputs = model(input_ids=input_ids, attention_mask=attention_mask, labels=labels)
            loss = outputs.loss
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            scheduler.step()
            total_loss += loss.item()

        avg_loss = total_loss / len(train_loader)
        val_acc, val_prec, val_rec, val_f1, _, _, _, _ = evaluate_torch_model(model, val_loader, device)

        print(f"    Epoch {epoch}/{epochs} - Train Loss: {avg_loss:.4f} | Val Acc: {val_acc:.4f} | Val F1: {val_f1:.4f}")
        training_history.append({
            "epoch": epoch,
            "train_loss": round(avg_loss, 4),
            "val_accuracy": round(val_acc, 4),
            "val_f1": round(val_f1, 4)
        })

    train_duration = round(time.time() - start_train_time, 2)
    print(f"[✓] Fine-tuning completed in {train_duration}s.")

    # 5. Final Evaluation on Held-Out Test Set
    test_acc, test_prec, test_rec, test_f1, test_cm, test_preds, test_true, test_probs = evaluate_torch_model(
        model, test_loader, device
    )

    print("\n" + "=" * 70)
    print("  DISTILBERT TEST SET EVALUATION RESULTS")
    print("=" * 70)
    print(f"  Accuracy:        {test_acc:.4f} ({test_acc*100:.1f}%)")
    print(f"  Precision (SIF): {test_prec:.4f} ({test_prec*100:.1f}%)")
    print(f"  Recall (SIF):    {test_rec:.4f} ({test_rec*100:.1f}%)")
    print(f"  F1-Score:        {test_f1:.4f} ({test_f1*100:.1f}%)")
    print(f"  Confusion Matrix (Rows=Actual, Cols=Predicted):")
    print(f"    True Negatives (TN): {test_cm[0][0]}  |  False Positives (FP): {test_cm[0][1]}")
    print(f"    False Negatives (FN): {test_cm[1][0]}  |  True Positives (TP):  {test_cm[1][1]}")
    print("-" * 70)
    print(classification_report(test_true, test_preds, target_names=["Non-SIF (0)", "Potential SIF (1)"]))

    # 6. Save Fine-Tuned DistilBERT Model & Tokenizer
    model.save_pretrained(DISTILBERT_DIR)
    tokenizer.save_pretrained(DISTILBERT_DIR)
    print(f"[✓] DistilBERT fine-tuned weights & tokenizer saved to: {DISTILBERT_DIR}")

    # 7. Persist Structured Metrics & Comparison Payload
    metrics_payload = {
        "model_architecture": "DistilBERT Sequence Classifier (distilbert-base-uncased)",
        "framework": f"Hugging Face Transformers / PyTorch {torch.__version__}",
        "device_used": str(device),
        "training_timestamp": datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC'),
        "training_duration_seconds": train_duration,
        "dataset_type": "Curated Workplace Incident SIF Precursor Benchmark",
        "labeling_methodology": (
            "Campbell Institute / DEKRA SIF Criteria: A report is labeled as a SIF precursor (1) "
            "if high-energy hazard exposure occurred in the absence or failure of a primary direct control barrier, "
            "with realistic potential for fatality or permanent life-altering injury. "
            "Non-precursor reports (0) describe low-energy minor events with zero fatality potential."
        ),
        "dataset_stats": {
            "total_samples": total_samples,
            "train_samples": len(X_train),
            "val_samples": len(X_val),
            "test_samples": len(X_test),
            "sif_precursor_count": sif_total,
            "non_sif_count": non_sif_total,
            "sif_percentage": round(sif_total / total_samples * 100, 1)
        },
        "distilbert_metrics": {
            "accuracy": round(float(test_acc), 4),
            "precision": round(float(test_prec), 4),
            "recall": round(float(test_rec), 4),
            "f1_score": round(float(test_f1), 4),
            "confusion_matrix": {
                "true_negative": test_cm[0][0],
                "false_positive": test_cm[0][1],
                "false_negative": test_cm[1][0],
                "true_positive": test_cm[1][1]
            },
            "training_history": training_history
        },
        "baseline_comparison": {
            "baseline_model": "TF-IDF (1,2 ngrams) + Logistic Regression (C=1.2, balanced)",
            "accuracy": round(float(base_acc), 4),
            "precision": round(float(base_prec), 4),
            "recall": round(float(base_rec), 4),
            "f1_score": round(float(base_f1), 4),
            "confusion_matrix": {
                "true_negative": base_cm[0][0],
                "false_positive": base_cm[0][1],
                "false_negative": base_cm[1][0],
                "true_positive": base_cm[1][1]
            }
        },
        "disclaimer": (
            "Academic & research demonstration project. Statistical predictions from DistilBERT "
            "indicate text semantic classification likelihoods, NOT certified industrial safety guarantees. "
            "Human Environmental Health & Safety (EHS) officer review is mandatory for all workplace decisions."
        )
    }

    with open(METRICS_PATH, 'w', encoding='utf-8') as f:
        json.dump(metrics_payload, f, indent=2)

    print(f"[✓] Complete model metrics saved to: {METRICS_PATH}")
    print("=" * 70)

if __name__ == '__main__':
    main()
