# Comparative Analysis of Graph Neural Networks and Traditional Machine Learning Algorithms

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0%2B-ee4c2c.svg)](https://pytorch.org/)
[![React](https://img.shields.io/badge/React-18%2B-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178c6.svg)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A research-grade, full-stack empirical benchmarking platform that systematically evaluates the inductive bias, predictive accuracy, and computational efficiency of **Graph Neural Networks (GNNs)** against **Traditional Machine Learning (ML) Algorithms** across citation networks, tabular benchmarks, and custom uploaded datasets.

Developed for final-year **B.Tech Artificial Intelligence & Machine Learning** capstone research, academic demonstrations, and portfolio presentation.

---

## 🌟 Key Features

1. **Dual Experimental Tracks (Scientific Fairness Protocol)**:
   - **Track A (Topological Graph Learning)**: Benchmarks GNNs (GCN, GraphSAGE, GAT) using node attributes and edge connectivity against traditional ML classifiers trained strictly on node attributes without graph connectivity.
   - **Track B (Tabular Classification via Similarity Graphs)**: Formulates justified $k$-Nearest Neighbor ($k$-NN) sample-similarity graphs (transductive and inductive modes) strictly fitted on training splits, comparing GNN representation learning against raw tabular ensembles.
2. **Real Empirical Calculations Only**:
   - Zero fabricated or mock data. Every metric, loss curve, confusion matrix, and generated research report is computed dynamically from real training and test evaluations.
3. **9 Fully Configurable Algorithms**:
   - **Graph Neural Networks**: Graph Convolutional Network (GCN), GraphSAGE, Graph Attention Network (GAT).
   - **Traditional ML**: Logistic Regression, Random Forest Classifier, Support Vector Machine (SVM), $K$-Nearest Neighbors (KNN), Decision Tree, Gradient Boosting Classifier.
4. **Interactive D3.js Graph Visualizer**:
   - Force-directed physics simulation, node degree scaling, dynamic neighbor highlighting, ground-truth/predicted class coloring, and zoom/pan/reset controls.
5. **Real-Time Experiment Lab**:
   - Background multi-model training queue, cancellation support, reproducible random seed management, live epoch loss/accuracy trajectory monitoring.
6. **Performance Analytics & Diagnostics**:
   - Heatmap confusion matrices (raw counts and normalized percentages), per-class metrics, error diagnostics table with probability vectors.
7. **Automated Academic Research Report Generator**:
   - Produces a complete 14-section research manuscript populated with empirical results, academic citations (Kipf & Welling 2017, Hamilton et al. 2017, Veličković et al. 2018), and exportable to Markdown and PDF.

---

## 🏗️ System Architecture

```
mlpro/
├── frontend/                   # React + Vite + TypeScript Client
│   ├── src/
│   │   ├── components/         # Navbar, MetricCard, Badge
│   │   ├── pages/              # 7 Research Dashboard Views
│   │   │   ├── OverviewDashboard.tsx
│   │   │   ├── DatasetExplorer.tsx
│   │   │   ├── GraphVisualization.tsx
│   │   │   ├── ModelComparison.tsx
│   │   │   ├── ExperimentLab.tsx
│   │   │   ├── PerformanceAnalytics.tsx
│   │   │   └── ResearchReport.tsx
│   │   ├── services/           # REST API client
│   │   ├── types/              # TypeScript schemas
│   │   ├── App.tsx             # Main Application Controller
│   │   └── main.tsx            # React Mount Point
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── backend/                    # FastAPI Server & Python Core
│   ├── main.py                 # REST API & Static Mount
│   ├── seed_experiment.py      # Benchmark Seeder
│   ├── datasets/               # Loaders, Data Cache, Graph Builders
│   │   ├── loader.py           # Cora, CiteSeer, PubMed, Tabular
│   │   └── graph_builder.py    # Leakage-Free k-NN Graph Constructor
│   ├── traditional_ml/         # Scikit-learn Models & Trainer
│   ├── gnn/                    # PyG & PyTorch Message Passing Layers
│   │   ├── models.py           # GCNConv, SAGEConv, GATConv
│   │   └── trainer.py          # Backpropagation & Validation Loop
│   ├── evaluation/             # Metrics, ROC-AUC, Timing, Tracemalloc
│   ├── reports/                # Academic Manuscript Generator
│   ├── database/               # SQLite Persistence (DB & Schemas)
│   └── requirements.txt
├── tests/                      # Automated Unit & Integration Tests
│   └── test_pipeline.py
├── run.bat                     # 1-Click Windows Launcher
├── run.sh                      # 1-Click Linux / macOS Launcher
├── .env.example
├── .gitignore
└── README.md
```

---

## 🔬 Scientific Fairness & Leakage Prevention Protocol

A central objective of this research is ensuring scientific rigor and preventing data snooping:

| Principle | Track A: Citation Graphs | Track B: Tabular Similarity Graphs |
| :--- | :--- | :--- |
| **Input Representation** | Relational Graph $(X, A)$ vs. Feature Vector $(X)$ | Raw Tabular $(X)$ vs. $k$-NN Graph $(X, A_{\text{sim}})$ |
| **Preprocessing** | `StandardScaler` fitted strictly on train mask | `StandardScaler` fitted strictly on train split |
| **Validation Governance** | Model selection & early stopping via validation mask | Early stopping & tuning on validation split |
| **Final Test Isolation** | Evaluated on held-out test mask | Evaluated on held-out test split |
| **Inductive Bias Note** | GNNs exploit neighborhood citation homophily | Graph construction introduces relational proximity assumptions |

---

## 📊 Supported Datasets

### Graph-Structured Citation Networks
- **Cora**: 2,708 scientific papers, 5,429 citation edges, 1,433 vocabulary features, 7 ML sub-fields.
- **CiteSeer**: 3,327 computer science publications, 4,732 citation edges, 3,703 features, 6 classes.
- **PubMed**: 19,717 diabetes-related medical papers, 44,338 edges, 500 TF/IDF features, 3 classes.

### Tabular Benchmarks
- **Breast Cancer Wisconsin (Diagnostic)**: 569 samples, 30 continuous features, 2 classes (Malignant / Benign).
- **Wine Recognition**: 178 samples, 13 chemical constituents, 3 cultivars.
- **Iris Flower**: 150 samples, 4 morphological features, 3 species.

### Custom Uploads
- Direct CSV upload with automated column inference, target mapping, missing-value analysis, and instant benchmark registration.

---

## 🚀 Quick Start & Installation

### Option 1: 1-Click Startup (Recommended)

**On Windows:**
```cmd
run.bat
```

**On Linux / macOS:**
```bash
chmod +x run.sh
./run.sh
```

The unified dashboard will automatically open at:
👉 **`http://127.0.0.1:8090`**

---

### Option 2: Manual Setup

#### 1. Setup Backend Environment
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

#### 2. Seed Baseline Benchmarks
```bash
cd backend
python seed_experiment.py
```

#### 3. Start Backend Server
```bash
python main.py
```
Backend API will be live at `http://127.0.0.1:8090` with Swagger UI at `http://127.0.0.1:8090/docs`.

#### 4. (Optional) Run Frontend in Vite Dev Mode
```bash
cd frontend
npm install
npm run dev
```
Development frontend will run at `http://127.0.0.1:5173` with hot-reloading and proxy to `:8090`.

---

## 🧪 Running Automated Tests

A comprehensive unit test suite validates dataset ingestion, $k$-NN graph construction, GNN message passing, traditional ML convergence, and multiclass metric accuracy:

```bash
# Run test suite
.\venv\Scripts\python tests/test_pipeline.py
```

Expected output:
```text
.......
----------------------------------------------------------------------
Ran 7 tests in 6.273s

OK
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check & service metadata |
| `GET` | `/api/datasets` | List available graph and tabular benchmarks |
| `GET` | `/api/datasets/{id}` | Dataset schema, preview, and statistics |
| `GET` | `/api/datasets/{id}/subgraph` | Extract interactive D3.js subgraph with degree data |
| `POST` | `/api/datasets/upload` | Upload and validate custom CSV dataset |
| `GET` | `/api/experiments` | List all historical and active experiments |
| `POST` | `/api/experiments` | Queue a new comparative benchmark trial |
| `GET` | `/api/experiments/{id}` | Retrieve real-time experiment status |
| `POST` | `/api/experiments/{id}/cancel` | Safely abort an ongoing experiment |
| `GET` | `/api/experiments/{id}/results` | Fetch full metrics, confusion matrix, predictions |
| `GET` | `/api/experiments/{id}/report` | Generate structured academic research report (JSON/MD) |

---

## 📄 Academic References

- **Kipf, T. N., & Welling, M. (2017).** *Semi-supervised classification with graph convolutional networks.* International Conference on Learning Representations (ICLR).
- **Hamilton, W., Ying, Z., & Leskovec, J. (2017).** *Inductive representation learning on large graphs.* Advances in Neural Information Processing Systems (NeurIPS), 30.
- **Veličković, P., et al. (2018).** *Graph attention networks.* International Conference on Learning Representations (ICLR).
- **Sen, P., et al. (2008).** *Collective classification in network data.* AI Magazine, 29(3), 93.
- **Pedregosa, F., et al. (2011).** *Scikit-learn: Machine learning in Python.* Journal of Machine Learning Research, 12, 2825-2830.
- **Breiman, L. (2001).** *Random forests.* Machine Learning, 45(1), 5-32.
- **Cortes, C., & Vapnik, V. (1995).** *Support-vector networks.* Machine Learning, 20(3), 273-297.

---

## 🎓 Academic Integrity & Reproducibility Statement

This project adheres to scientific reproduction guidelines. Results reported in the Research Report section reflect genuine model convergence and holdout split evaluations on the specified machine. No evaluation values are hardcoded or fabricated.
