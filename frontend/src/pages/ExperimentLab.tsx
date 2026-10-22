import React, { useState } from 'react';
import {
  FlaskConical,
  Play,
  Square,
  Download,
  Sliders,
  Settings,
  Sparkles,
  Layers,
  Database,
  CheckSquare,
  Square as EmptySquare,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Badge } from '../components/Badge';
import { Dataset, Experiment, ModelResult } from '../types';
import { createExperiment, cancelExperiment } from '../services/api';

const ALL_ALGORITHMS = [
  { id: 'GCN', name: 'Graph Convolutional Network (GCN)', family: 'GNN' },
  { id: 'GraphSAGE', name: 'GraphSAGE', family: 'GNN' },
  { id: 'GAT', name: 'Graph Attention Network (GAT)', family: 'GNN' },
  { id: 'Logistic Regression', name: 'Logistic Regression', family: 'Traditional ML' },
  { id: 'Random Forest', name: 'Random Forest Classifier', family: 'Traditional ML' },
  { id: 'SVM', name: 'Support Vector Machine (SVM)', family: 'Traditional ML' },
  { id: 'KNN', name: 'K-Nearest Neighbors (KNN)', family: 'Traditional ML' },
  { id: 'Decision Tree', name: 'Decision Tree Classifier', family: 'Traditional ML' },
  { id: 'Gradient Boosting', name: 'Gradient Boosting Classifier', family: 'Traditional ML' },
];

interface ExperimentLabProps {
  datasets: Dataset[];
  selectedDatasetId: string;
  onSelectDataset: (id: string) => void;
  activeExperiment?: Experiment | null;
  onRefreshExperiments: () => void;
}

export const ExperimentLab: React.FC<ExperimentLabProps> = ({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  activeExperiment,
  onRefreshExperiments,
}) => {
  const [expName, setExpName] = useState<string>('GNN vs. ML Benchmark');
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>([
    'GCN',
    'GraphSAGE',
    'Random Forest',
    'SVM',
    'Logistic Regression',
  ]);
  const [randomSeed, setRandomSeed] = useState<number>(42);
  const [knnK, setKnnK] = useState<number>(5);
  const [knnMode, setKnnMode] = useState<'transductive' | 'inductive'>('transductive');

  // GNN Hyperparameters
  const [gnnEpochs, setGnnEpochs] = useState<number>(80);
  const [gnnHiddenDim, setGnnHiddenDim] = useState<number>(64);
  const [gnnNumLayers, setGnnNumLayers] = useState<number>(2);
  const [gnnLr, setGnnLr] = useState<number>(0.01);
  const [gnnDropout, setGnnDropout] = useState<number>(0.5);
  const [gnnPatience, setGnnPatience] = useState<number>(20);

  // Traditional ML Hyperparameters
  const [rfEstimators, setRfEstimators] = useState<number>(100);
  const [svmC, setSvmC] = useState<number>(1.0);
  const [lrC, setLrC] = useState<number>(1.0);

  const [expandedSection, setExpandedSection] = useState<'gnn' | 'tml' | 'graph' | null>('gnn');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedMeta = datasets.find((d) => d.id === selectedDatasetId);
  const isGraph = selectedMeta?.type === 'graph';
  const track = isGraph ? 'Track A' : 'Track B';

  const toggleAlgorithm = (algoId: string) => {
    if (selectedAlgorithms.includes(algoId)) {
      if (selectedAlgorithms.length === 1) return; // Must keep at least one
      setSelectedAlgorithms(selectedAlgorithms.filter((a) => a !== algoId));
    } else {
      setSelectedAlgorithms([...selectedAlgorithms, algoId]);
    }
  };

  const selectAllFamily = (family: 'GNN' | 'Traditional ML') => {
    const familyAlgos = ALL_ALGORITHMS.filter((a) => a.family === family).map((a) => a.id);
    const otherAlgos = selectedAlgorithms.filter(
      (a) => ALL_ALGORITHMS.find((item) => item.id === a)?.family !== family
    );
    setSelectedAlgorithms([...otherAlgos, ...familyAlgos]);
  };

  const handleLaunchExperiment = async () => {
    if (selectedAlgorithms.length === 0) {
      setActionError('Please select at least one algorithm to run.');
      return;
    }

    setSubmitting(true);
    setActionError(null);

    const hyperparameters: Record<string, any> = {
      GCN: {
        epochs: gnnEpochs,
        hidden_dim: gnnHiddenDim,
        num_layers: gnnNumLayers,
        learning_rate: gnnLr,
        dropout: gnnDropout,
        patience: gnnPatience,
      },
      GraphSAGE: {
        epochs: gnnEpochs,
        hidden_dim: gnnHiddenDim,
        num_layers: gnnNumLayers,
        learning_rate: gnnLr,
        dropout: gnnDropout,
        patience: gnnPatience,
      },
      GAT: {
        epochs: gnnEpochs,
        hidden_dim: gnnHiddenDim,
        num_layers: gnnNumLayers,
        learning_rate: gnnLr,
        dropout: gnnDropout,
        patience: gnnPatience,
        heads: 4,
      },
      'Random Forest': {
        n_estimators: rfEstimators,
      },
      SVM: {
        C: svmC,
        kernel: 'rbf',
      },
      'Logistic Regression': {
        C: lrC,
        max_iter: 1000,
      },
    };

    try {
      await createExperiment({
        name: expName,
        dataset_id: selectedDatasetId,
        track,
        algorithms: selectedAlgorithms,
        random_seed: randomSeed,
        hyperparameters,
        knn_k: knnK,
        knn_mode: knnMode,
      });
      onRefreshExperiments();
    } catch (err: any) {
      setActionError(err.message || 'Failed to start experiment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelExperiment = async (expId: string) => {
    try {
      await cancelExperiment(expId);
      onRefreshExperiments();
    } catch (err: any) {
      setActionError(err.message || 'Failed to cancel.');
    }
  };

  const handleDownloadJSON = (data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `experiment_${activeExperiment?.id || 'results'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Find GNN epoch curves to display in real-time monitor
  const gnnResultWithHistory = activeExperiment?.results?.find(
    (r) => r.epoch_history && r.epoch_history.length > 0
  );

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-cyan-400" />
            Interactive Experiment Lab
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure architectures, seed values, hyperparameters, and launch reproducible comparative trials.
          </p>
        </div>
      </div>

      {/* Real-time Active Experiment Status Banner (if running or completed) */}
      {activeExperiment && (
        <div
          className={`glass-panel rounded-2xl p-5 border-l-4 ${
            activeExperiment.status === 'RUNNING' || activeExperiment.status === 'PENDING'
              ? 'border-l-amber-500 bg-amber-500/5'
              : activeExperiment.status === 'COMPLETED'
              ? 'border-l-emerald-500 bg-emerald-500/5'
              : 'border-l-rose-500 bg-rose-500/5'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-white">{activeExperiment.name}</span>
                <Badge
                  variant={
                    activeExperiment.status === 'RUNNING'
                      ? 'amber'
                      : activeExperiment.status === 'COMPLETED'
                      ? 'emerald'
                      : 'rose'
                  }
                >
                  {activeExperiment.status}
                </Badge>
                <Badge variant="cyan">{activeExperiment.dataset_id.toUpperCase()}</Badge>
                <Badge variant="violet">{activeExperiment.track}</Badge>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                ID: {activeExperiment.id} • Seed: {activeExperiment.random_seed} • Models:{' '}
                {activeExperiment.models_config?.join(', ')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {activeExperiment.status === 'RUNNING' && (
                <button
                  onClick={() => handleCancelExperiment(activeExperiment.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Abort Run</span>
                </button>
              )}

              {activeExperiment.results && activeExperiment.results.length > 0 && (
                <button
                  onClick={() => handleDownloadJSON(activeExperiment)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download JSON</span>
                </button>
              )}
            </div>
          </div>

          {/* Real-time Loss / Accuracy Curve if GNN epoch history is present */}
          {gnnResultWithHistory && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Epoch Loss & Validation Progress ({gnnResultWithHistory.model_name})
                </span>
                <span className="text-slate-400 font-mono">
                  {gnnResultWithHistory.epoch_history?.length} Epochs Completed
                </span>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={gnnResultWithHistory.epoch_history}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="epoch" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line
                      type="monotone"
                      dataKey="train_loss"
                      name="Train Loss"
                      stroke="#f59e0b"
                      dot={false}
                      strokeWidth={1.8}
                    />
                    <Line
                      type="monotone"
                      dataKey="val_loss"
                      name="Val Loss"
                      stroke="#06b6d4"
                      dot={false}
                      strokeWidth={1.8}
                    />
                    <Line
                      type="monotone"
                      dataKey="val_accuracy"
                      name="Val Acc"
                      stroke="#10b981"
                      dot={false}
                      strokeWidth={1.8}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Experiment Setup Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Dataset & Algorithm Selection (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dataset Selector Card */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                1. Select Benchmark Dataset
              </h3>
              <Badge variant={isGraph ? 'cyan' : 'violet'}>{track}</Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {datasets.map((d) => {
                const isSelected = d.id === selectedDatasetId;
                return (
                  <button
                    key={d.id}
                    onClick={() => onSelectDataset(d.id)}
                    className={`p-3 rounded-xl text-left transition-all border ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">{d.name.split(' ')[0]}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400">{d.type}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      {d.num_nodes ? `${d.num_nodes} nodes` : `${d.num_samples} samples`} • {d.num_features} feats
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Algorithm Selection Card */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-400" />
                2. Select Algorithms to Compare ({selectedAlgorithms.length} chosen)
              </h3>

              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => selectAllFamily('GNN')}
                  className="text-cyan-400 hover:underline font-medium text-[11px]"
                >
                  + All GNNs
                </button>
                <span className="text-slate-600">•</span>
                <button
                  onClick={() => selectAllFamily('Traditional ML')}
                  className="text-violet-400 hover:underline font-medium text-[11px]"
                >
                  + All Trad ML
                </button>
              </div>
            </div>

            {/* GNN Models */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase text-cyan-400 tracking-wider">
                Graph Neural Networks (PyTorch Geometric)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {ALL_ALGORITHMS.filter((a) => a.family === 'GNN').map((algo) => {
                  const isChecked = selectedAlgorithms.includes(algo.id);
                  return (
                    <button
                      key={algo.id}
                      onClick={() => toggleAlgorithm(algo.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                        isChecked
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                      ) : (
                        <EmptySquare className="w-4 h-4 text-slate-600 shrink-0" />
                      )}
                      <span>{algo.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Traditional ML Models */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-semibold uppercase text-violet-400 tracking-wider">
                Traditional Machine Learning Baselines (Scikit-Learn)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {ALL_ALGORITHMS.filter((a) => a.family === 'Traditional ML').map((algo) => {
                  const isChecked = selectedAlgorithms.includes(algo.id);
                  return (
                    <button
                      key={algo.id}
                      onClick={() => toggleAlgorithm(algo.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                        isChecked
                          ? 'bg-violet-500/15 border-violet-500/40 text-violet-200'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-violet-400 shrink-0" />
                      ) : (
                        <EmptySquare className="w-4 h-4 text-slate-600 shrink-0" />
                      )}
                      <span>{algo.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Hyperparameter & Execution Configuration (1 col) */}
        <div className="space-y-5">
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              3. Trial Parameters
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Experiment Name</label>
                <input
                  type="text"
                  value={expName}
                  onChange={(e) => setExpName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Reproducible Random Seed</label>
                <input
                  type="number"
                  value={randomSeed}
                  onChange={(e) => setRandomSeed(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Tabular Similarity Graph Accordion (Track B Only) */}
              {!isGraph && (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <span className="font-semibold text-cyan-300">k-NN Similarity Graph (Track B)</span>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Number of Neighbors (k): {knnK}</label>
                    <input
                      type="range"
                      min="2"
                      max="15"
                      value={knnK}
                      onChange={(e) => setKnnK(Number(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Construction Mode</label>
                    <select
                      value={knnMode}
                      onChange={(e: any) => setKnnMode(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                    >
                      <option value="transductive">Transductive (Masked All-Sample Graph)</option>
                      <option value="inductive">Inductive (Fitted strictly on Train)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* GNN Hyperparameters Accordion */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <span className="font-semibold text-violet-300">GNN Training Settings</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 text-[10px]">Epochs</label>
                    <input
                      type="number"
                      value={gnnEpochs}
                      onChange={(e) => setGnnEpochs(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px]">Hidden Dim</label>
                    <input
                      type="number"
                      value={gnnHiddenDim}
                      onChange={(e) => setGnnHiddenDim(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px]">Learning Rate</label>
                    <input
                      type="number"
                      step="0.005"
                      value={gnnLr}
                      onChange={(e) => setGnnLr(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px]">Dropout</label>
                    <input
                      type="number"
                      step="0.1"
                      value={gnnDropout}
                      onChange={(e) => setGnnDropout(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {actionError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Launch Button */}
            <button
              onClick={handleLaunchExperiment}
              disabled={submitting || activeExperiment?.status === 'RUNNING'}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>
                {activeExperiment?.status === 'RUNNING'
                  ? 'Experiment Currently Executing...'
                  : submitting
                  ? 'Queueing Trial...'
                  : 'Execute Comparative Experiment'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
