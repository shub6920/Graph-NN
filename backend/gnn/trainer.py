import time
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from typing import Dict, Any, Optional, List, Callable
from gnn.models import GNNModel
from evaluation.metrics import calculate_metrics, EvaluationTracker

def train_and_evaluate_gnn(
    model_name: str,
    in_features: int,
    num_classes: int,
    edge_index: torch.Tensor,
    features: torch.Tensor,
    labels: torch.Tensor,
    train_mask: torch.Tensor,
    val_mask: torch.Tensor,
    test_mask: torch.Tensor,
    hyperparameters: Optional[Dict[str, Any]] = None,
    random_seed: int = 42,
    cancel_check: Optional[Callable[[], bool]] = None
) -> Dict[str, Any]:
    """
    Trains a GNN model (GCN, GraphSAGE, GAT) with reproducible seed, early stopping,
    and returns comprehensive metrics, epoch history, and prediction samples.
    """
    torch.manual_seed(random_seed)
    np.random.seed(random_seed)

    params = hyperparameters or {}
    hidden_dim = int(params.get("hidden_dim", 64))
    num_layers = int(params.get("num_layers", 2))
    lr = float(params.get("learning_rate", 0.01))
    weight_decay = float(params.get("weight_decay", 5e-4))
    dropout = float(params.get("dropout", 0.5))
    epochs = int(params.get("epochs", 100))
    patience = int(params.get("patience", 20))
    heads = int(params.get("heads", 4))

    # Architecture mapping
    name_clean = model_name.strip().lower()
    if "sage" in name_clean:
        arch = "sage"
    elif "gat" in name_clean:
        arch = "gat"
    else:
        arch = "gcn"

    device = torch.device("cpu") # dev laptops usually run CPU; works flawlessly
    model = GNNModel(
        arch=arch,
        in_features=in_features,
        hidden_dim=hidden_dim,
        out_features=num_classes,
        num_layers=num_layers,
        dropout=dropout,
        heads=heads
    ).to(device)

    x = features.to(device)
    edge_index = edge_index.to(device)
    y = labels.to(device)
    train_mask = train_mask.to(device)
    val_mask = val_mask.to(device)
    test_mask = test_mask.to(device)

    optimizer = optim.Adam(model.parameters(), lr=lr, weight_decay=weight_decay)
    criterion = nn.CrossEntropyLoss()

    tracker = EvaluationTracker()
    tracker.start_timing()

    epoch_history = []
    best_val_loss = float("inf")
    patience_counter = 0
    best_model_state = None

    for epoch in range(1, epochs + 1):
        if cancel_check and cancel_check():
            raise InterruptedError("Experiment cancelled by user.")

        model.train()
        optimizer.zero_grad()
        out = model(x, edge_index)
        loss = criterion(out[train_mask], y[train_mask])
        loss.backward()
        optimizer.step()

        # Validation
        model.eval()
        with torch.no_grad():
            out_eval = model(x, edge_index)
            train_acc = (out_eval[train_mask].argmax(dim=1) == y[train_mask]).float().mean().item()
            
            val_loss = criterion(out_eval[val_mask], y[val_mask]).item() if val_mask.sum() > 0 else 0.0
            val_acc = (out_eval[val_mask].argmax(dim=1) == y[val_mask]).float().mean().item() if val_mask.sum() > 0 else 0.0

        epoch_history.append({
            "epoch": epoch,
            "train_loss": round(loss.item(), 4),
            "train_accuracy": round(train_acc, 4),
            "val_loss": round(val_loss, 4),
            "val_accuracy": round(val_acc, 4)
        })

        # Early stopping check
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
            best_model_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
        else:
            patience_counter += 1
            if patience_counter >= patience and epoch >= 30:
                break

    training_time = tracker.stop_timing()
    peak_memory = tracker.peak_memory_mb

    # Restore best checkpoint
    if best_model_state is not None:
        model.load_state_dict(best_model_state)

    # Test Evaluation
    tracker.start_timing()
    model.eval()
    with torch.no_grad():
        test_logits = model(x, edge_index)
        test_probs = F.softmax(test_logits, dim=-1).cpu().numpy()
        test_preds = test_logits.argmax(dim=-1).cpu().numpy()
    inference_time = tracker.stop_timing()

    test_indices = torch.where(test_mask)[0].cpu().numpy()
    y_true_test = y[test_mask].cpu().numpy()
    y_pred_test = test_preds[test_indices]
    y_prob_test = test_probs[test_indices]

    metrics = calculate_metrics(
        y_true=y_true_test,
        y_pred=y_pred_test,
        y_prob=y_prob_test,
        training_time=training_time,
        inference_time=inference_time,
        peak_memory_mb=peak_memory,
        num_classes=num_classes
    )

    # Prediction sample (first 30 test samples)
    sample_size = min(30, len(test_indices))
    predictions_sample = []
    for i in range(sample_size):
        idx = int(test_indices[i])
        predictions_sample.append({
            "index": idx,
            "true_label": int(y_true_test[i]),
            "predicted_label": int(y_pred_test[i]),
            "is_correct": bool(y_true_test[i] == y_pred_test[i]),
            "probabilities": [round(float(p), 4) for p in y_prob_test[i]]
        })

    return {
        "model_name": model_name,
        "algorithm_family": "Graph Neural Network",
        "hyperparameters": {
            "hidden_dim": hidden_dim,
            "num_layers": num_layers,
            "learning_rate": lr,
            "weight_decay": weight_decay,
            "dropout": dropout,
            "epochs": epochs,
            "actual_epochs": len(epoch_history),
            "patience": patience,
            "heads": heads if arch == "gat" else 1
        },
        "metrics": metrics,
        "epoch_history": epoch_history,
        "predictions_sample": predictions_sample,
        "all_preds": test_preds.tolist() # Useful for graph visualization colored by prediction
    }
