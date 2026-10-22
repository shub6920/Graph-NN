import os
import uuid
import json
import datetime
from typing import List, Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from database.db import init_db, get_connection
from datasets.loader import (
    get_available_datasets,
    load_tabular_dataset,
    load_graph_dataset,
    get_graph_subgraph_for_visualization,
    DATASET_METADATA
)
from experiments.runner import (
    run_experiment_pipeline,
    set_cancel_flag,
    is_cancelled
)
from reports.generator import generate_academic_report
from api.schemas import ExperimentCreateRequest, ExperimentStatusResponse

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="Comparative Analysis: GNN vs. Traditional ML API",
    description="Research-grade REST API comparing Graph Neural Networks and Traditional ML algorithms.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.datetime.now().isoformat(),
        "service": "gnn-vs-ml-backend"
    }

@app.get("/api/datasets")
def list_datasets():
    datasets = get_available_datasets()
    # Also fetch custom datasets from DB
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM custom_datasets")
    customs = cursor.fetchall()
    conn.close()

    result = list(datasets)
    for c in customs:
        result.append({
            "id": c["id"],
            "name": c["name"],
            "type": c["dataset_type"],
            "track": "Track B" if c["dataset_type"] == "tabular" else "Track A",
            "domain": "Custom Uploaded",
            "num_samples": c["num_samples"],
            "num_features": c["num_features"],
            "num_classes": c["num_classes"],
            "description": c["description"]
        })
    return result

@app.get("/api/datasets/{dataset_id}")
def get_dataset_details(dataset_id: str):
    if dataset_id in ["breast_cancer", "wine", "iris"]:
        return load_tabular_dataset(dataset_id)
    elif dataset_id in ["cora", "citeseer", "pubmed"]:
        data = load_graph_dataset(dataset_id)
        # Return summary without raw huge tensors
        return {
            "id": data["id"],
            "metadata": data["metadata"],
            "num_nodes": data["num_nodes"],
            "num_edges": data["num_edges"],
            "num_features": data["num_features"],
            "num_classes": data["num_classes"],
            "class_distribution": data["class_distribution"],
            "graph_statistics": data["graph_statistics"],
            "classes": data["classes"]
        }
    else:
        # Check custom dataset
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM custom_datasets WHERE id = ?", (dataset_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found.")
        return dict(row)

@app.get("/api/datasets/{dataset_id}/subgraph")
def get_dataset_subgraph(dataset_id: str, max_nodes: int = 120, center_node: Optional[int] = None):
    try:
        return get_graph_subgraph_for_visualization(dataset_id, max_nodes=max_nodes, center_node=center_node)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/experiments")
def list_experiments():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM experiments ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()

    output = []
    for r in rows:
        output.append({
            "id": r["id"],
            "name": r["name"],
            "dataset_id": r["dataset_id"],
            "track": r["track"],
            "status": r["status"],
            "random_seed": r["random_seed"],
            "models_config": json.loads(r["models_config"]),
            "created_at": r["created_at"],
            "completed_at": r["completed_at"],
            "error_message": r["error_message"]
        })
    return output

@app.get("/api/experiments/{experiment_id}")
def get_experiment_status(experiment_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM experiments WHERE id = ?", (experiment_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Experiment not found.")

    return {
        "id": row["id"],
        "name": row["name"],
        "dataset_id": row["dataset_id"],
        "track": row["track"],
        "status": row["status"],
        "random_seed": row["random_seed"],
        "models_config": json.loads(row["models_config"]),
        "created_at": row["created_at"],
        "completed_at": row["completed_at"],
        "error_message": row["error_message"]
    }

@app.post("/api/experiments")
def create_experiment(req: ExperimentCreateRequest, background_tasks: BackgroundTasks):
    experiment_id = str(uuid.uuid4())[:8]
    created_at = datetime.datetime.now().isoformat()

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO experiments (id, name, dataset_id, track, status, random_seed, models_config, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        experiment_id,
        req.name,
        req.dataset_id,
        req.track,
        "PENDING",
        req.random_seed,
        json.dumps(req.algorithms),
        created_at
    ))
    conn.commit()
    conn.close()

    # Launch background task
    background_tasks.add_task(
        run_experiment_pipeline,
        experiment_id=experiment_id,
        dataset_id=req.dataset_id,
        track=req.track,
        algorithms=req.algorithms,
        hyperparameters=req.hyperparameters,
        random_seed=req.random_seed,
        knn_k=req.knn_k,
        knn_mode=req.knn_mode
    )

    return {
        "experiment_id": experiment_id,
        "status": "PENDING",
        "message": f"Experiment {experiment_id} queued successfully."
    }

@app.post("/api/experiments/{experiment_id}/cancel")
def cancel_experiment(experiment_id: str):
    set_cancel_flag(experiment_id)
    return {"message": f"Cancellation requested for experiment {experiment_id}."}

@app.get("/api/experiments/{experiment_id}/results")
def get_experiment_results(experiment_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM experiments WHERE id = ?", (experiment_id,))
    exp = cursor.fetchone()
    if not exp:
        conn.close()
        raise HTTPException(status_code=404, detail="Experiment not found.")

    cursor.execute("SELECT * FROM experiment_results WHERE experiment_id = ?", (experiment_id,))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append({
            "model_name": r["model_name"],
            "algorithm_family": r["algorithm_family"],
            "metrics": json.loads(r["metrics"]),
            "confusion_matrix": json.loads(r["confusion_matrix"]),
            "epoch_history": json.loads(r["epoch_history"]) if r["epoch_history"] else [],
            "predictions_sample": json.loads(r["predictions_sample"]) if r["predictions_sample"] else []
        })

    return {
        "experiment_id": experiment_id,
        "dataset_id": exp["dataset_id"],
        "track": exp["track"],
        "status": exp["status"],
        "random_seed": exp["random_seed"],
        "created_at": exp["created_at"],
        "completed_at": exp["completed_at"],
        "results": results
    }

@app.get("/api/experiments/{experiment_id}/report")
def get_experiment_report(experiment_id: str, format: str = "json"):
    try:
        report = generate_academic_report(experiment_id)
        if format.lower() == "markdown":
            return PlainTextResponse(report["markdown"], media_type="text/markdown")
        return report
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/datasets/upload")
async def upload_custom_dataset(
    file: UploadFile = File(...),
    name: str = Form(...),
    target_column: Optional[str] = Form(None),
    description: Optional[str] = Form("Custom user dataset")
):
    """
    Safely validates and uploads custom tabular CSV datasets.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "datasets", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    custom_id = f"custom_{str(uuid.uuid4())[:8]}"
    file_path = os.path.join(upload_dir, f"{custom_id}.csv")

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    import pandas as pd
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Invalid CSV structure: {str(e)}")

    if df.shape[0] < 10:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=400, detail="Dataset must contain at least 10 rows.")

    target_col = target_column if (target_column and target_column in df.columns) else df.columns[-1]
    num_classes = int(df[target_col].nunique())
    num_features = df.shape[1] - 1
    num_samples = df.shape[0]

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO custom_datasets (id, name, dataset_type, description, num_samples, num_features, num_classes, file_path, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        custom_id,
        name,
        "tabular",
        description,
        num_samples,
        num_features,
        num_classes,
        file_path,
        datetime.datetime.now().isoformat()
    ))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "dataset_id": custom_id,
        "name": name,
        "num_samples": num_samples,
        "num_features": num_features,
        "num_classes": num_classes,
        "message": "Dataset uploaded and registered successfully."
    }

# Mount bundled frontend static assets for unified deployment
dist_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.exists(dist_dir):
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8090))
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
