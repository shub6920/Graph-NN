import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.db import init_db, get_connection
from experiments.runner import run_experiment_pipeline

def seed_benchmarks():
    print("Initializing SQLite database...")
    init_db()

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM experiments")
    count = cursor.fetchone()[0]
    conn.close()

    if count > 0:
        print(f"Database already contains {count} experiment(s). Skipping seed.")
        return

    print("Running initial authentic benchmark on Cora Citation Network (Track A)...")
    exp_id_cora = "cora0001"
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO experiments (id, name, dataset_id, track, status, random_seed, models_config, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    """, (
        exp_id_cora,
        "Cora Citation Homophily vs. Non-Relational Baselines",
        "cora",
        "Track A",
        "PENDING",
        42,
        '["GCN", "GraphSAGE", "Random Forest", "SVM", "Logistic Regression"]'
    ))
    conn.commit()
    conn.close()

    res_cora = run_experiment_pipeline(
        experiment_id=exp_id_cora,
        dataset_id="cora",
        track="Track A",
        algorithms=["GCN", "GraphSAGE", "Random Forest", "SVM", "Logistic Regression"],
        hyperparameters={
            "GCN": {"epochs": 60, "hidden_dim": 64, "learning_rate": 0.01, "dropout": 0.5},
            "GraphSAGE": {"epochs": 60, "hidden_dim": 64, "learning_rate": 0.01, "dropout": 0.5},
            "Random Forest": {"n_estimators": 100},
            "SVM": {"C": 1.0, "kernel": "rbf"},
            "Logistic Regression": {"C": 1.0}
        },
        random_seed=42
    )
    print(f"Cora benchmark completed! Evaluated {len(res_cora['results'])} models.")

    print("Running initial authentic benchmark on Wine Tabular Benchmark (Track B)...")
    exp_id_wine = "wine0001"
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO experiments (id, name, dataset_id, track, status, random_seed, models_config, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    """, (
        exp_id_wine,
        "Wine k-NN Similarity Graph vs. Tabular Ensembles",
        "wine",
        "Track B",
        "PENDING",
        42,
        '["GCN", "Random Forest", "SVM", "Logistic Regression", "Gradient Boosting"]'
    ))
    conn.commit()
    conn.close()

    res_wine = run_experiment_pipeline(
        experiment_id=exp_id_wine,
        dataset_id="wine",
        track="Track B",
        algorithms=["GCN", "Random Forest", "SVM", "Logistic Regression", "Gradient Boosting"],
        hyperparameters={
            "GCN": {"epochs": 50, "hidden_dim": 32, "learning_rate": 0.01, "dropout": 0.3},
            "Random Forest": {"n_estimators": 100},
            "SVM": {"C": 1.0, "kernel": "rbf"},
            "Logistic Regression": {"C": 1.0},
            "Gradient Boosting": {"n_estimators": 50}
        },
        random_seed=42,
        knn_k=4,
        knn_mode="transductive"
    )
    print(f"Wine benchmark completed! Evaluated {len(res_wine['results'])} models.")
    print("Seed process finished successfully!")

if __name__ == "__main__":
    seed_benchmarks()
