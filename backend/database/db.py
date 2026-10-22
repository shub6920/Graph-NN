import sqlite3
import json
import os
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "experiments.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Experiments table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS experiments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        dataset_id TEXT NOT NULL,
        track TEXT NOT NULL,
        status TEXT NOT NULL,
        random_seed INTEGER NOT NULL,
        models_config TEXT NOT NULL,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        error_message TEXT
    );
    """)
    
    # Results table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS experiment_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        experiment_id TEXT NOT NULL,
        model_name TEXT NOT NULL,
        algorithm_family TEXT NOT NULL,
        metrics TEXT NOT NULL,
        confusion_matrix TEXT,
        epoch_history TEXT,
        predictions_sample TEXT,
        FOREIGN KEY (experiment_id) REFERENCES experiments (id) ON DELETE CASCADE
    );
    """)

    # Custom Datasets table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS custom_datasets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        dataset_type TEXT NOT NULL,
        description TEXT,
        num_samples INTEGER,
        num_features INTEGER,
        num_classes INTEGER,
        file_path TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)
    
    conn.commit()
    conn.close()
