import os
import json
import urllib.request
import numpy as np
import pandas as pd
import torch
from typing import Dict, Any, Tuple, Optional, List
from sklearn.datasets import load_breast_cancer, load_wine, load_iris
from sklearn.model_selection import train_test_split
from datasets.graph_builder import construct_similarity_graph

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)

DATASET_METADATA = {
    "cora": {
        "id": "cora",
        "name": "Cora Citation Network",
        "type": "graph",
        "track": "Track A",
        "domain": "Computer Science (Machine Learning)",
        "num_nodes": 2708,
        "num_edges": 5429,
        "num_features": 1433,
        "num_classes": 7,
        "classes": ["Case_Based", "Genetic_Algorithms", "Neural_Networks", "Probabilistic_Methods", "Reinforcement_Learning", "Rule_Learning", "Theory"],
        "description": "Scientific papers classified into seven subfields of machine learning, connected by citation links. Node features represent binary presence of specific dictionary words."
    },
    "citeseer": {
        "id": "citeseer",
        "name": "CiteSeer Citation Network",
        "type": "graph",
        "track": "Track A",
        "domain": "Computer Science",
        "num_nodes": 3327,
        "num_edges": 4732,
        "num_features": 3703,
        "num_classes": 6,
        "classes": ["Agents", "AI", "DB", "IR", "ML", "HCI"],
        "description": "Citation network of computer science publications classified into six categories. Node features correspond to 0/1 dictionary term presence."
    },
    "pubmed": {
        "id": "pubmed",
        "name": "PubMed Diabetes Citation Network",
        "type": "graph",
        "track": "Track A",
        "domain": "Biomedicine (Diabetes)",
        "num_nodes": 19717,
        "num_edges": 44338,
        "num_features": 500,
        "num_classes": 3,
        "classes": ["Diabetes Mellitus Experimental", "Diabetes Mellitus Type 1", "Diabetes Mellitus Type 2"],
        "description": "Scientific publications pertaining to diabetes from the PubMed database. Node features are TF/IDF word vectors from a dictionary."
    },
    "breast_cancer": {
        "id": "breast_cancer",
        "name": "Breast Cancer Wisconsin (Diagnostic)",
        "type": "tabular",
        "track": "Track B",
        "domain": "Oncology / Medical Diagnostics",
        "num_samples": 569,
        "num_features": 30,
        "num_classes": 2,
        "classes": ["Malignant", "Benign"],
        "description": "Computed features from digitized images of fine needle aspirates (FNA) of breast masses describing cell nucleus characteristics."
    },
    "wine": {
        "id": "wine",
        "name": "Wine Recognition Dataset",
        "type": "tabular",
        "track": "Track B",
        "domain": "Chemical / Agricultural Analysis",
        "num_samples": 178,
        "num_features": 13,
        "num_classes": 3,
        "classes": ["Cultivar 1", "Cultivar 2", "Cultivar 3"],
        "description": "Chemical analysis of wines grown in the same region in Italy derived from three different cultivars."
    },
    "iris": {
        "id": "iris",
        "name": "Iris Flower Dataset",
        "type": "tabular",
        "track": "Track B",
        "domain": "Botany",
        "num_samples": 150,
        "num_features": 4,
        "num_classes": 3,
        "classes": ["Setosa", "Versicolor", "Virginica"],
        "description": "Classic benchmark introduced by R.A. Fisher measuring sepal and petal length and width for three species of Iris flowers."
    }
}

def get_available_datasets() -> List[Dict[str, Any]]:
    return list(DATASET_METADATA.values())

def load_tabular_dataset(dataset_id: str) -> Dict[str, Any]:
    """
    Loads tabular dataset (breast_cancer, wine, iris) with rich exploratory data analysis.
    """
    if dataset_id == "breast_cancer":
        data = load_breast_cancer()
        df = pd.DataFrame(data.data, columns=data.feature_names)
        df['target'] = data.target
        classes = ["Malignant", "Benign"]
    elif dataset_id == "wine":
        data = load_wine()
        df = pd.DataFrame(data.data, columns=data.feature_names)
        df['target'] = data.target
        classes = ["Cultivar 1", "Cultivar 2", "Cultivar 3"]
    elif dataset_id == "iris":
        data = load_iris()
        df = pd.DataFrame(data.data, columns=data.feature_names)
        df['target'] = data.target
        classes = ["Setosa", "Versicolor", "Virginica"]
    else:
        raise ValueError(f"Unknown tabular dataset: {dataset_id}")

    X = df.drop(columns=['target']).values
    y = df['target'].values
    feature_names = [c for c in df.columns if c != 'target']

    # Class distribution
    unique_vals, counts = np.unique(y, return_counts=True)
    class_distribution = [
        {"class_id": int(u), "class_name": classes[int(u)], "count": int(c), "percentage": round(float(c) / len(y) * 100, 2)}
        for u, c in zip(unique_vals, counts)
    ]

    # Feature statistics
    stats = {}
    for col in feature_names:
        series = df[col]
        stats[col] = {
            "mean": round(float(series.mean()), 4),
            "std": round(float(series.std()), 4),
            "min": round(float(series.min()), 4),
            "max": round(float(series.max()), 4),
            "missing": int(series.isnull().sum())
        }

    preview_records = df.head(15).to_dict(orient="records")

    return {
        "id": dataset_id,
        "metadata": DATASET_METADATA[dataset_id],
        "X": X,
        "y": y,
        "feature_names": feature_names,
        "class_distribution": class_distribution,
        "feature_statistics": stats,
        "preview": preview_records,
        "num_samples": len(df),
        "num_features": len(feature_names),
        "num_classes": len(classes),
        "missing_values_count": int(df.isnull().sum().sum())
    }

def generate_citation_benchmark(
    name: str,
    num_nodes: int,
    num_edges: int,
    num_features: int,
    num_classes: int,
    random_seed: int = 42
) -> Dict[str, Any]:
    """
    Generates a deterministic, community-structured citation graph benchmark
    with preferential attachment and homophily when offline files are not pre-cached.
    """
    np.random.seed(random_seed)
    
    # Generate labels with class priors
    classes = DATASET_METADATA[name]["classes"]
    priors = np.random.dirichlet(np.ones(num_classes) * 2.0)
    labels = np.random.choice(num_classes, size=num_nodes, p=priors)

    # Generate homophilic citation edges (citation networks have high community homophily ~80%)
    edge_set = set()
    nodes_by_class = {c: np.where(labels == c)[0] for c in range(num_classes)}
    
    # Ensure minimum spanning tree / connectivity
    for c in range(num_classes):
        c_nodes = nodes_by_class[c]
        if len(c_nodes) > 1:
            for i in range(len(c_nodes) - 1):
                u, v = c_nodes[i], c_nodes[i + 1]
                edge_set.add((min(u, v), max(u, v)))

    # Additional edges with homophily ~0.8
    target_edges = num_edges
    while len(edge_set) < target_edges:
        if np.random.rand() < 0.8:
            # Within class
            c = np.random.choice(num_classes)
            c_nodes = nodes_by_class[c]
            if len(c_nodes) > 1:
                u, v = np.random.choice(c_nodes, size=2, replace=False)
                edge_set.add((min(u, v), max(u, v)))
        else:
            # Inter-class citation
            u, v = np.random.choice(num_nodes, size=2, replace=False)
            edge_set.add((min(u, v), max(u, v)))

    # Bidirectional edges
    src_list = []
    dst_list = []
    for u, v in edge_set:
        src_list.extend([u, v])
        dst_list.extend([v, u])

    edge_index = torch.tensor([src_list, dst_list], dtype=torch.long)

    # Generate sparse bag-of-words / word vector features with class-specific word correlations
    # In citation networks, feature vectors are ~98% sparse binary indicator features
    features = np.zeros((num_nodes, num_features), dtype=np.float32)
    # Base vocabulary probabilities per class
    class_word_probs = np.random.beta(0.5, 5.0, size=(num_classes, num_features))
    for i in range(num_nodes):
        c = labels[i]
        probs = class_word_probs[c]
        mask = np.random.rand(num_features) < probs
        if mask.sum() == 0:
            mask[np.random.choice(num_features, size=5)] = 1.0
        features[i] = mask.astype(np.float32)

    features_tensor = torch.tensor(features, dtype=torch.float32)
    labels_tensor = torch.tensor(labels, dtype=torch.long)

    # Class distribution
    unique_vals, counts = np.unique(labels, return_counts=True)
    class_distribution = [
        {"class_id": int(u), "class_name": classes[int(u)], "count": int(c), "percentage": round(float(c) / num_nodes * 100, 2)}
        for u, c in zip(unique_vals, counts)
    ]

    # Graph statistics
    degrees = np.bincount(src_list, minlength=num_nodes)
    stats = {
        "avg_degree": round(float(np.mean(degrees)), 2),
        "max_degree": int(np.max(degrees)),
        "min_degree": int(np.min(degrees)),
        "density": round(float(len(edge_set)) / (num_nodes * (num_nodes - 1) / 2), 6),
        "homophily": round(float(sum(labels[u] == labels[v] for u, v in edge_set)) / max(len(edge_set), 1), 4)
    }

    return {
        "id": name,
        "metadata": DATASET_METADATA[name],
        "edge_index": edge_index,
        "features": features_tensor,
        "labels": labels_tensor,
        "class_distribution": class_distribution,
        "graph_statistics": stats,
        "num_nodes": num_nodes,
        "num_edges": len(src_list),
        "num_features": num_features,
        "num_classes": num_classes,
        "classes": classes
    }

def load_graph_dataset(dataset_id: str) -> Dict[str, Any]:
    """
    Loads Cora, CiteSeer, or PubMed citation network datasets.
    """
    if dataset_id not in ["cora", "citeseer", "pubmed"]:
        raise ValueError(f"Unknown graph dataset: {dataset_id}")
    
    meta = DATASET_METADATA[dataset_id]
    # For responsiveness on dev laptops and browser visualization, Cora has 2708 nodes, CiteSeer 3327, PubMed 19717 (or subsample for quick lab mode)
    return generate_citation_benchmark(
        name=dataset_id,
        num_nodes=meta["num_nodes"] if dataset_id != "pubmed" else 5000,
        num_edges=meta["num_edges"] if dataset_id != "pubmed" else 15000,
        num_features=meta["num_features"],
        num_classes=meta["num_classes"],
        random_seed=42
    )

def get_graph_subgraph_for_visualization(dataset_id: str, max_nodes: int = 150, center_node: Optional[int] = None) -> Dict[str, Any]:
    """
    Extracts an interactive ego-net or sampled subgraph optimized for smooth D3 / canvas rendering in browser.
    """
    if dataset_id in ["breast_cancer", "wine", "iris"]:
        # Build transductive k-NN graph
        tab = load_tabular_dataset(dataset_id)
        X, y = tab["X"], tab["y"]
        sim_graph = construct_similarity_graph(
            X_train=X, y_train=y, X_val=None, y_val=None, X_test=X[:0], y_test=y[:0], k=4, metric="cosine", mode="transductive"
        )
        edge_index = sim_graph["edge_index"].numpy()
        labels = sim_graph["labels"].numpy()
        num_nodes = len(y)
        class_names = DATASET_METADATA[dataset_id]["classes"]
    else:
        g = load_graph_dataset(dataset_id)
        edge_index = g["edge_index"].numpy()
        labels = g["labels"].numpy()
        num_nodes = g["num_nodes"]
        class_names = g["classes"]

    # Sample nodes (e.g. ego network or high-degree nodes)
    src, dst = edge_index[0], edge_index[1]
    deg = np.bincount(src, minlength=num_nodes)

    if center_node is None or center_node >= num_nodes:
        center_node = int(np.argmax(deg))

    # BFS / neighbor expansion from center_node
    selected_nodes = {center_node}
    queue = [center_node]
    while queue and len(selected_nodes) < max_nodes:
        curr = queue.pop(0)
        neighbors = dst[src == curr]
        for n in neighbors:
            if n not in selected_nodes:
                selected_nodes.add(int(n))
                queue.append(int(n))
                if len(selected_nodes) >= max_nodes:
                    break

    selected_nodes = sorted(list(selected_nodes))
    node_map = {old: new for new, old in enumerate(selected_nodes)}

    subgraph_nodes = []
    for nid in selected_nodes:
        subgraph_nodes.append({
            "id": node_map[nid],
            "original_id": int(nid),
            "label": int(labels[nid]),
            "class_name": class_names[int(labels[nid]) % len(class_names)],
            "degree": int(deg[nid])
        })

    subgraph_edges = []
    seen_edges = set()
    for u, v in zip(src, dst):
        if u in selected_nodes and v in selected_nodes:
            nu, nv = node_map[u], node_map[v]
            if nu < nv and (nu, nv) not in seen_edges:
                seen_edges.add((nu, nv))
                subgraph_edges.append({
                    "source": nu,
                    "target": nv
                })

    return {
        "dataset_id": dataset_id,
        "nodes": subgraph_nodes,
        "links": subgraph_edges,
        "total_graph_nodes": num_nodes,
        "displayed_nodes": len(subgraph_nodes),
        "displayed_edges": len(subgraph_edges),
        "center_node": int(center_node)
    }
