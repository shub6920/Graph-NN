import time
import numpy as np
from typing import Dict, Any, Optional, Tuple
from traditional_ml.models import create_traditional_model
from evaluation.metrics import calculate_metrics, EvaluationTracker

def train_and_evaluate_traditional_model(
    model_name: str,
    hyperparameters: Optional[Dict[str, Any]],
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: Optional[np.ndarray],
    y_val: Optional[np.ndarray],
    X_test: np.ndarray,
    y_test: np.ndarray,
    random_state: int = 42,
    num_classes: Optional[int] = None
) -> Dict[str, Any]:
    """
    Trains a traditional ML model and evaluates it strictly on the test set.
    Also evaluates on validation set if provided.
    """
    tracker = EvaluationTracker()
    model = create_traditional_model(model_name, hyperparameters, random_state=random_state)
    
    # 1. Training
    tracker.start_timing()
    model.fit(X_train, y_train)
    training_time = tracker.stop_timing()
    train_peak_memory = tracker.peak_memory_mb

    # 2. Validation evaluation (if provided)
    val_metrics = None
    if X_val is not None and y_val is not None and len(X_val) > 0:
        val_preds = model.predict(X_val)
        val_probs = None
        if hasattr(model, "predict_proba"):
            try:
                val_probs = model.predict_proba(X_val)
            except Exception:
                val_probs = None
        val_metrics = calculate_metrics(
            y_true=y_val,
            y_pred=val_preds,
            y_prob=val_probs,
            num_classes=num_classes
        )

    # 3. Test Inference
    tracker.start_timing()
    test_preds = model.predict(X_test)
    inference_time = tracker.stop_timing()
    
    test_probs = None
    if hasattr(model, "predict_proba"):
        try:
            test_probs = model.predict_proba(X_test)
        except Exception:
            test_probs = None

    test_metrics = calculate_metrics(
        y_true=y_test,
        y_pred=test_preds,
        y_prob=test_probs,
        training_time=training_time,
        inference_time=inference_time,
        peak_memory_mb=train_peak_memory,
        num_classes=num_classes
    )

    # Prediction sample for UI inspection (first 30 samples)
    sample_size = min(30, len(y_test))
    predictions_sample = []
    for i in range(sample_size):
        item = {
            "index": int(i),
            "true_label": int(y_test[i]),
            "predicted_label": int(test_preds[i]),
            "is_correct": bool(y_test[i] == test_preds[i])
        }
        if test_probs is not None:
            item["probabilities"] = [round(float(p), 4) for p in test_probs[i]]
        predictions_sample.append(item)

    return {
        "model_name": model_name,
        "algorithm_family": "Traditional ML",
        "hyperparameters": hyperparameters or {},
        "metrics": test_metrics,
        "validation_metrics": val_metrics,
        "predictions_sample": predictions_sample,
        "epoch_history": [] # No epochs for standard non-iterative ML models
    }
