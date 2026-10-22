import numpy as np
import torch
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler
from typing import Dict, Any, Tuple, Optional

def construct_similarity_graph(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: Optional[np.ndarray],
    y_val: Optional[np.ndarray],
    X_test: np.ndarray,
    y_test: np.ndarray,
    k: int = 5,
    metric: str = "cosine",
    mode: str = "transductive"
) -> Dict[str, Any]:
    """
    Constructs a sample-similarity graph from tabular data for GNN evaluation (Track B).
    
    Scientific Fairness & Leakage Prevention:
    - Preprocessing (StandardScaler) is strictly fitted on X_train only and applied to val/test.
    - Graph topology:
      * In 'transductive' mode, all samples are embedded in the graph, but edges can only be
        formed between samples based on normalized feature distance. Train, val, and test masks
        strictly isolate labels during GNN training.
      * In 'inductive' mode, NearestNeighbors is fitted strictly on X_train. Train nodes are
        connected to other train nodes. Val and Test nodes are connected only to their top-k
        neighbors in the training set (preventing test-test connectivity).
    
    Returns:
        dict containing:
        - edge_index (torch.Tensor [2, E])
        - features (torch.Tensor [N, F])
        - labels (torch.Tensor [N])
        - train_mask, val_mask, test_mask (torch.Tensor [N] bool)
        - metadata: graph statistics, construction method explanation, edge count, sparsity
    """
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val) if (X_val is not None and len(X_val) > 0) else np.empty((0, X_train.shape[1]))
    X_test_scaled = scaler.transform(X_test)

    n_train = len(X_train_scaled)
    n_val = len(X_val_scaled)
    n_test = len(X_test_scaled)
    total_nodes = n_train + n_val + n_test

    X_all = np.vstack([X_train_scaled, X_val_scaled, X_test_scaled]) if n_val > 0 else np.vstack([X_train_scaled, X_test_scaled])
    y_all = np.concatenate([y_train, y_val, y_test]) if n_val > 0 else np.concatenate([y_train, y_test])

    train_indices = np.arange(0, n_train)
    val_indices = np.arange(n_train, n_train + n_val)
    test_indices = np.arange(n_train + n_val, total_nodes)

    src_list = []
    dst_list = []

    if mode == "inductive":
        # Fit NN strictly on training data
        nn_train = NearestNeighbors(n_neighbors=min(k + 1, n_train), metric=metric)
        nn_train.fit(X_train_scaled)

        # Train-train edges
        _, indices_train = nn_train.kneighbors(X_train_scaled)
        for i in range(n_train):
            for neighbor in indices_train[i]:
                if i != neighbor:
                    src_list.append(i)
                    dst_list.append(neighbor)

        # Val-train edges (val connects to train only)
        if n_val > 0:
            _, indices_val = nn_train.kneighbors(X_val_scaled, n_neighbors=min(k, n_train))
            for i, val_node in enumerate(val_indices):
                for neighbor in indices_val[i]:
                    src_list.extend([val_node, neighbor])
                    dst_list.extend([neighbor, val_node])

        # Test-train edges (test connects to train only)
        _, indices_test = nn_train.kneighbors(X_test_scaled, n_neighbors=min(k, n_train))
        for i, test_node in enumerate(test_indices):
            for neighbor in indices_test[i]:
                src_list.extend([test_node, neighbor])
                dst_list.extend([neighbor, test_node])

        method_explanation = (
            f"Inductive k-NN graph (k={k}, metric={metric}): The neighbor index was fitted strictly on training samples. "
            f"Validation and test samples are connected only to training prototypes, eliminating test-test message passing."
        )

    else: # Transductive
        nn_all = NearestNeighbors(n_neighbors=min(k + 1, total_nodes), metric=metric)
        nn_all.fit(X_all)
        _, indices = nn_all.kneighbors(X_all)

        for i in range(total_nodes):
            for neighbor in indices[i]:
                if i != neighbor:
                    src_list.extend([i, neighbor])
                    dst_list.extend([neighbor, i])

        method_explanation = (
            f"Transductive k-NN graph (k={k}, metric={metric}): Graph connectivity constructed over all samples using feature distance. "
            f"Labels are masked during training; message passing occurs across structural neighborhood."
        )

    # Dedup edges
    edge_set = set(zip(src_list, dst_list))
    if len(edge_set) > 0:
        edges = np.array(list(edge_set)).T
    else:
        edges = np.empty((2, 0), dtype=np.int64)

    edge_index = torch.tensor(edges, dtype=torch.long)
    features = torch.tensor(X_all, dtype=torch.float32)
    labels = torch.tensor(y_all, dtype=torch.long)

    train_mask = torch.zeros(total_nodes, dtype=torch.bool)
    val_mask = torch.zeros(total_nodes, dtype=torch.bool)
    test_mask = torch.zeros(total_nodes, dtype=torch.bool)

    train_mask[train_indices] = True
    val_mask[val_indices] = True
    test_mask[test_indices] = True

    graph_density = round(edge_index.size(1) / (total_nodes * (total_nodes - 1)), 6) if total_nodes > 1 else 0.0

    return {
        "edge_index": edge_index,
        "features": features,
        "labels": labels,
        "train_mask": train_mask,
        "val_mask": val_mask,
        "test_mask": test_mask,
        "metadata": {
            "num_nodes": total_nodes,
            "num_edges": edge_index.size(1),
            "num_features": X_all.shape[1],
            "num_classes": len(np.unique(y_all)),
            "density": graph_density,
            "k": k,
            "metric": metric,
            "mode": mode,
            "method_explanation": method_explanation
        }
    }
