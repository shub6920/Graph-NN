from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ExperimentCreateRequest(BaseModel):
    name: str = Field(default="Benchmark Comparison")
    dataset_id: str
    track: str = Field(default="Track A") # "Track A" or "Track B"
    algorithms: List[str]
    random_seed: int = Field(default=42)
    hyperparameters: Optional[Dict[str, Dict[str, Any]]] = None
    knn_k: int = Field(default=5)
    knn_mode: str = Field(default="transductive")

class ExperimentStatusResponse(BaseModel):
    id: str
    name: str
    dataset_id: str
    track: str
    status: str
    random_seed: int
    models_config: List[str]
    created_at: str
    completed_at: Optional[str] = None
    error_message: Optional[str] = None

class DatasetUploadResponse(BaseModel):
    success: bool
    dataset_id: str
    name: str
    num_samples: int
    num_features: int
    num_classes: int
    message: str
