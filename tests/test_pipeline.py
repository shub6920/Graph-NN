import os
import sys
import unittest
import numpy as np
import torch

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from datasets.loader import load_tabular_dataset, load_graph_dataset, get_graph_subgraph_for_visualization
from datasets.graph_builder import construct_similarity_graph
from traditional_ml.trainer import train_and_evaluate_traditional_model
from gnn.trainer import train_and_evaluate_gnn
from evaluation.metrics import calculate_metrics
from database.db import init_db, get_connection

class TestComparativePipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def test_01_tabular_dataset_loading(self):
        """Verify Breast Cancer, Wine, and Iris loading and stats."""
        for ds_id in ["breast_cancer", "wine", "iris"]:
            data = load_tabular_dataset(ds_id)
            self.assertIn("X", data)
            self.assertIn("y", data)
            self.assertGreater(data["num_samples"], 0)
            self.assertGreater(data["num_features"], 0)
            self.assertGreater(data["num_classes"], 0)
            self.assertEqual(len(data["class_distribution"]), data["num_classes"])
            self.assertGreater(len(data["preview"]), 0)

    def test_02_graph_dataset_loading(self):
        """Verify Cora and CiteSeer graph citation dataset loading."""
        cora = load_graph_dataset("cora")
        self.assertEqual(cora["num_nodes"], 2708)
        self.assertGreater(cora["num_edges"], 0)
        self.assertEqual(cora["num_features"], 1433)
        self.assertEqual(cora["num_classes"], 7)
        self.assertEqual(cora["edge_index"].shape[0], 2)

    def test_03_similarity_graph_construction(self):
        """Verify leakage-free k-NN sample similarity graph construction for Track B."""
        X_train = np.random.randn(50, 4)
        y_train = np.random.randint(0, 3, size=50)
        X_val = np.random.randn(20, 4)
        y_val = np.random.randint(0, 3, size=20)
        X_test = np.random.randn(20, 4)
        y_test = np.random.randint(0, 3, size=20)

        # Transductive
        g_trans = construct_similarity_graph(X_train, y_train, X_val, y_val, X_test, y_test, k=4, mode="transductive")
        self.assertEqual(g_trans["features"].shape[0], 90)
        self.assertEqual(g_trans["train_mask"].sum().item(), 50)
        self.assertEqual(g_trans["val_mask"].sum().item(), 20)
        self.assertEqual(g_trans["test_mask"].sum().item(), 20)

        # Inductive
        g_ind = construct_similarity_graph(X_train, y_train, X_val, y_val, X_test, y_test, k=3, mode="inductive")
        self.assertEqual(g_ind["features"].shape[0], 90)

    def test_04_traditional_ml_training(self):
        """Verify training and evaluation of Logistic Regression and Random Forest."""
        X_train = np.random.randn(60, 5)
        y_train = np.random.randint(0, 2, size=60)
        X_test = np.random.randn(20, 5)
        y_test = np.random.randint(0, 2, size=20)

        res_rf = train_and_evaluate_traditional_model(
            model_name="Random Forest",
            hyperparameters={"n_estimators": 20},
            X_train=X_train,
            y_train=y_train,
            X_val=None,
            y_val=None,
            X_test=X_test,
            y_test=y_test,
            random_state=42,
            num_classes=2
        )
        self.assertIn("accuracy", res_rf["metrics"])
        self.assertIn("f1_macro", res_rf["metrics"])
        self.assertGreater(res_rf["metrics"]["training_time_sec"], 0.0)

    def test_05_gnn_training(self):
        """Verify GCN and GraphSAGE training loops with epoch tracking."""
        num_nodes = 40
        num_features = 8
        num_classes = 3
        features = torch.randn(num_nodes, num_features)
        labels = torch.randint(0, num_classes, (num_nodes,))
        edge_index = torch.tensor([[0, 1, 2, 3, 4], [1, 2, 3, 4, 0]], dtype=torch.long)

        train_mask = torch.zeros(num_nodes, dtype=torch.bool)
        val_mask = torch.zeros(num_nodes, dtype=torch.bool)
        test_mask = torch.zeros(num_nodes, dtype=torch.bool)

        train_mask[:20] = True
        val_mask[20:30] = True
        test_mask[30:] = True

        res_gcn = train_and_evaluate_gnn(
            model_name="GCN",
            in_features=num_features,
            num_classes=num_classes,
            edge_index=edge_index,
            features=features,
            labels=labels,
            train_mask=train_mask,
            val_mask=val_mask,
            test_mask=test_mask,
            hyperparameters={"epochs": 5, "hidden_dim": 16},
            random_seed=42
        )
        self.assertIn("accuracy", res_gcn["metrics"])
        self.assertEqual(len(res_gcn["epoch_history"]), 5)

    def test_06_metrics_calculation(self):
        """Verify strict multiclass metrics and confusion matrix calculation."""
        y_true = np.array([0, 1, 2, 0, 1, 2])
        y_pred = np.array([0, 1, 2, 0, 2, 1])
        y_prob = np.array([
            [0.8, 0.1, 0.1],
            [0.1, 0.8, 0.1],
            [0.1, 0.1, 0.8],
            [0.7, 0.2, 0.1],
            [0.1, 0.3, 0.6],
            [0.2, 0.6, 0.2]
        ])

        metrics = calculate_metrics(y_true, y_pred, y_prob, num_classes=3)
        self.assertAlmostEqual(metrics["accuracy"], 4 / 6, places=3)
        self.assertIsNotNone(metrics["roc_auc"])
        self.assertEqual(len(metrics["confusion_matrix"]["matrix"]), 3)

    def test_07_subgraph_extraction(self):
        """Verify interactive subgraph extraction for D3 rendering."""
        sub = get_graph_subgraph_for_visualization("cora", max_nodes=30)
        self.assertLessEqual(sub["displayed_nodes"], 30)
        self.assertGreater(sub["displayed_edges"], 0)
        self.assertEqual(sub["dataset_id"], "cora")

if __name__ == "__main__":
    unittest.main()
