import time
import tracemalloc
import numpy as np
from typing import Dict, Any, Optional, Tuple, List
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix
)

class EvaluationTracker:
    def __init__(self):
        self.start_time = 0.0
        self.end_time = 0.0
        self.peak_memory_mb = 0.0

    def start_timing(self):
        tracemalloc.start()
        self.start_time = time.perf_counter()

    def stop_timing(self) -> float:
        self.end_time = time.perf_counter()
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        self.peak_memory_mb = round(peak / (1024 * 1024), 3)
        return round(self.end_time - self.start_time, 4)

def calculate_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_prob: Optional[np.ndarray] = None,
    training_time: float = 0.0,
    inference_time: float = 0.0,
    peak_memory_mb: float = 0.0,
    num_classes: Optional[int] = None
) -> Dict[str, Any]:
    """
    Computes rigorous evaluation metrics from true and predicted values.
    Supports multiclass tasks with macro and weighted averaging, and OvR ROC-AUC when applicable.
    """
    y_true = np.asarray(y_true).astype(int)
    y_pred = np.asarray(y_pred).astype(int)
    
    unique_classes = np.unique(y_true)
    if num_classes is None:
        num_classes = len(unique_classes)
        
    acc = float(accuracy_score(y_true, y_pred))
    
    # Calculate precision, recall, f1
    prec_macro = float(precision_score(y_true, y_pred, average='macro', zero_division=0))
    prec_weighted = float(precision_score(y_true, y_pred, average='weighted', zero_division=0))
    
    rec_macro = float(recall_score(y_true, y_pred, average='macro', zero_division=0))
    rec_weighted = float(recall_score(y_true, y_pred, average='weighted', zero_division=0))
    
    f1_macro = float(f1_score(y_true, y_pred, average='macro', zero_division=0))
    f1_weighted = float(f1_score(y_true, y_pred, average='weighted', zero_division=0))
    
    # ROC-AUC calculation
    roc_auc_val: Optional[float] = None
    if y_prob is not None:
        try:
            y_prob = np.asarray(y_prob)
            if num_classes == 2:
                # Binary classification
                if y_prob.ndim == 2 and y_prob.shape[1] == 2:
                    roc_auc_val = float(roc_auc_score(y_true, y_prob[:, 1]))
                elif y_prob.ndim == 1:
                    roc_auc_val = float(roc_auc_score(y_true, y_prob))
            elif num_classes > 2:
                # Multiclass OvR ROC-AUC
                if y_prob.ndim == 2 and y_prob.shape[1] == num_classes:
                    roc_auc_val = float(roc_auc_score(
                        y_true,
                        y_prob,
                        multi_class='ovr',
                        average='macro'
                    ))
        except Exception:
            roc_auc_val = None

    # Confusion matrix
    labels = list(range(num_classes)) if num_classes > len(unique_classes) else sorted(list(unique_classes))
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    cm_norm = confusion_matrix(y_true, y_pred, labels=labels, normalize='true')
    
    num_samples = len(y_true)
    latency_ms_per_sample = round((inference_time / max(num_samples, 1)) * 1000.0, 4)

    return {
        "accuracy": round(acc, 4),
        "precision_macro": round(prec_macro, 4),
        "precision_weighted": round(prec_weighted, 4),
        "recall_macro": round(rec_macro, 4),
        "recall_weighted": round(rec_weighted, 4),
        "f1_macro": round(f1_macro, 4),
        "f1_weighted": round(f1_weighted, 4),
        "roc_auc": round(roc_auc_val, 4) if roc_auc_val is not None else None,
        "training_time_sec": round(training_time, 4),
        "inference_time_sec": round(inference_time, 4),
        "latency_ms_per_sample": latency_ms_per_sample,
        "peak_memory_mb": round(peak_memory_mb, 2),
        "confusion_matrix": {
            "matrix": cm.tolist(),
            "normalized": np.nan_to_num(cm_norm, nan=0.0).round(4).tolist(),
            "labels": [str(c) for c in labels]
        }
    }
