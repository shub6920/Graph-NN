import os
import json
import uuid
import datetime
import numpy as np
import torch
from typing import Dict, Any, List, Optional
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from database.db import get_connection
from datasets.loader import load_tabular_dataset, load_graph_dataset, DATASET_METADATA
from datasets.graph_builder import construct_similarity_graph
from traditional_ml.trainer import train_and_evaluate_traditional_model
from gnn.trainer import train_and_evaluate_gnn

# In-memory cancel registry
CANCEL_FLAGS: Dict[str, bool] = {}

def set_cancel_flag(experiment_id: str):
    CANCEL_FLAGS[experiment_id] = True

def is_cancelled(experiment_id: str) -> bool:
    return CANCEL_FLAGS.get(experiment_id, False)

def clear_cancel_flag(experiment_id: str):
    CANCEL_FLAGS.pop(experiment_id, None)

def run_experiment_pipeline(
    experiment_id: str,
    dataset_id: str,
    track: str,
    algorithms: List[str],
    hyperparameters: Optional[Dict[str, Dict[str, Any]]] = None,
    random_seed: int = 42,
    knn_k: int = 5,
    knn_mode: str = "transductive"
) -> Dict[str, Any]:
    """
    Executes a complete comparative experiment comparing GNNs and Traditional ML.
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Mark as running
        cursor.execute("UPDATE experiments SET status = 'RUNNING' WHERE id = ?", (experiment_id,))
        conn.commit()

        np.random.seed(random_seed)
        torch.manual_seed(random_seed)
        hp_dict = hyperparameters or {}

        results = []

        if track == "Track A":
            # Graph-based node classification (Cora, CiteSeer, PubMed)
            graph_data = load_graph_dataset(dataset_id)
            features = graph_data["features"]
            edge_index = graph_data["edge_index"]
            labels = graph_data["labels"]
            num_nodes = graph_data["num_nodes"]
            num_features = graph_data["num_features"]
            num_classes = graph_data["num_classes"]

            # Stratified train/val/test split
            labels_np = labels.numpy()
            indices = np.arange(num_nodes)
            train_idx, temp_idx = train_test_split(indices, test_size=0.4, random_state=random_seed, stratify=labels_np)
            val_idx, test_idx = train_test_split(temp_idx, test_size=0.5, random_state=random_seed, stratify=labels_np[temp_idx])

            train_mask = torch.zeros(num_nodes, dtype=torch.bool)
            val_mask = torch.zeros(num_nodes, dtype=torch.bool)
            test_mask = torch.zeros(num_nodes, dtype=torch.bool)

            train_mask[train_idx] = True
            val_mask[val_idx] = True
            test_mask[test_idx] = True

            X_np = features.numpy()
            y_np = labels_np

            # Strict scaling without leakage
            scaler = StandardScaler()
            X_train = scaler.fit_transform(X_np[train_idx])
            X_val = scaler.transform(X_np[val_idx])
            X_test = scaler.transform(X_np[test_idx])
            y_train = y_np[train_idx]
            y_val = y_np[val_idx]
            y_test = y_np[test_idx]

            # Scaled features tensor for GNN
            X_scaled_all = np.zeros_like(X_np)
            X_scaled_all[train_idx] = X_train
            X_scaled_all[val_idx] = X_val
            X_scaled_all[test_idx] = X_test
            scaled_features_tensor = torch.tensor(X_scaled_all, dtype=torch.float32)

            # Run selected algorithms
            for algo in algorithms:
                if is_cancelled(experiment_id):
                    raise InterruptedError("Experiment cancelled by user.")

                algo_lower = algo.lower()
                algo_hp = hp_dict.get(algo, {})

                if algo_lower in ["gcn", "graphsage", "sage", "gat"]:
                    res = train_and_evaluate_gnn(
                        model_name=algo,
                        in_features=num_features,
                        num_classes=num_classes,
                        edge_index=edge_index,
                        features=scaled_features_tensor,
                        labels=labels,
                        train_mask=train_mask,
                        val_mask=val_mask,
                        test_mask=test_mask,
                        hyperparameters=algo_hp,
                        random_seed=random_seed,
                        cancel_check=lambda: is_cancelled(experiment_id)
                    )
                else:
                    # Traditional ML algorithms evaluated on node features WITHOUT graph connectivity
                    res = train_and_evaluate_traditional_model(
                        model_name=algo,
                        hyperparameters=algo_hp,
                        X_train=X_train,
                        y_train=y_train,
                        X_val=X_val,
                        y_val=y_val,
                        X_test=X_test,
                        y_test=y_test,
                        random_state=random_seed,
                        num_classes=num_classes
                    )

                results.append(res)
                # Save each model result immediately to DB
                cursor.execute("""
                INSERT INTO experiment_results (experiment_id, model_name, algorithm_family, metrics, confusion_matrix, epoch_history, predictions_sample)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    experiment_id,
                    res["model_name"],
                    res["algorithm_family"],
                    json.dumps(res["metrics"]),
                    json.dumps(res["metrics"]["confusion_matrix"]),
                    json.dumps(res.get("epoch_history", [])),
                    json.dumps(res.get("predictions_sample", []))
                ))
                conn.commit()

        else:
            # Track B: Tabular Classification (Breast Cancer, Wine, Iris)
            tab_data = load_tabular_dataset(dataset_id)
            X = tab_data["X"]
            y = tab_data["y"]
            num_classes = tab_data["num_classes"]

            indices = np.arange(len(y))
            train_idx, temp_idx = train_test_split(indices, test_size=0.4, random_state=random_seed, stratify=y)
            val_idx, test_idx = train_test_split(temp_idx, test_size=0.5, random_state=random_seed, stratify=y[temp_idx])

            scaler = StandardScaler()
            X_train = scaler.fit_transform(X[train_idx])
            X_val = scaler.transform(X[val_idx])
            X_test = scaler.transform(X[test_idx])
            y_train = y[train_idx]
            y_val = y[val_idx]
            y_test = y[test_idx]

            # Construct justified sample similarity graph for GNN evaluation
            sim_graph = construct_similarity_graph(
                X_train=X[train_idx],
                y_train=y_train,
                X_val=X[val_idx],
                y_val=y_val,
                X_test=X[test_idx],
                y_test=y_test,
                k=knn_k,
                metric="cosine",
                mode=knn_mode
            )

            for algo in algorithms:
                if is_cancelled(experiment_id):
                    raise InterruptedError("Experiment cancelled by user.")

                algo_lower = algo.lower()
                algo_hp = hp_dict.get(algo, {})

                if algo_lower in ["gcn", "graphsage", "sage", "gat"]:
                    res = train_and_evaluate_gnn(
                        model_name=algo,
                        in_features=X.shape[1],
                        num_classes=num_classes,
                        edge_index=sim_graph["edge_index"],
                        features=sim_graph["features"],
                        labels=sim_graph["labels"],
                        train_mask=sim_graph["train_mask"],
                        val_mask=sim_graph["val_mask"],
                        test_mask=sim_graph["test_mask"],
                        hyperparameters=algo_hp,
                        random_seed=random_seed,
                        cancel_check=lambda: is_cancelled(experiment_id)
                    )
                    res["graph_construction_meta"] = sim_graph["metadata"]
                else:
                    res = train_and_evaluate_traditional_model(
                        model_name=algo,
                        hyperparameters=algo_hp,
                        X_train=X_train,
                        y_train=y_train,
                        X_val=X_val,
                        y_val=y_val,
                        X_test=X_test,
                        y_test=y_test,
                        random_state=random_seed,
                        num_classes=num_classes
                    )

                results.append(res)
                cursor.execute("""
                INSERT INTO experiment_results (experiment_id, model_name, algorithm_family, metrics, confusion_matrix, epoch_history, predictions_sample)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    experiment_id,
                    res["model_name"],
                    res["algorithm_family"],
                    json.dumps(res["metrics"]),
                    json.dumps(res["metrics"]["confusion_matrix"]),
                    json.dumps(res.get("epoch_history", [])),
                    json.dumps(res.get("predictions_sample", []))
                ))
                conn.commit()

        # Mark completed
        completed_at = datetime.datetime.now().isoformat()
        cursor.execute("UPDATE experiments SET status = 'COMPLETED', completed_at = ? WHERE id = ?", (completed_at, experiment_id))
        conn.commit()
        clear_cancel_flag(experiment_id)

        return {
            "experiment_id": experiment_id,
            "status": "COMPLETED",
            "results": results
        }

    except InterruptedError:
        cursor.execute("UPDATE experiments SET status = 'CANCELLED', error_message = 'Experiment was cancelled by user' WHERE id = ?", (experiment_id,))
        conn.commit()
        clear_cancel_flag(experiment_id)
        return {"experiment_id": experiment_id, "status": "CANCELLED"}

    except Exception as e:
        cursor.execute("UPDATE experiments SET status = 'FAILED', error_message = ? WHERE id = ?", (str(e), experiment_id))
        conn.commit()
        clear_cancel_flag(experiment_id)
        raise e

    finally:
        conn.close()
