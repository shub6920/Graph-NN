import React, { useState } from 'react';
import {
  LineChart as LucideLineChart,
  Grid,
  CheckCircle2,
  XCircle,
  Filter,
  Info,
  Layers,
  Sparkles,
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
import { Experiment, ModelResult } from '../types';

interface PerformanceAnalyticsProps {
  experiments: Experiment[];
  selectedExperimentId?: string;
  onSelectExperiment: (id: string) => void;
  onNavigateToLab: () => void;
}

export const PerformanceAnalytics: React.FC<PerformanceAnalyticsProps> = ({
  experiments,
  selectedExperimentId,
  onSelectExperiment,
  onNavigateToLab,
}) => {
  const completedExperiments = experiments.filter((e) => e.status === 'COMPLETED');
  const currentExp =
    completedExperiments.find((e) => e.id === selectedExperimentId) || completedExperiments[0];

  const results: ModelResult[] = currentExp?.results || [];
  const [selectedModelName, setSelectedModelName] = useState<string>('');
  const [cmMode, setCmMode] = useState<'counts' | 'normalized'>('normalized');
  const [predictionFilter, setPredictionFilter] = useState<'ALL' | 'CORRECT' | 'ERRORS'>('ALL');

  // Active selected model
  const activeModel =
    results.find((r) => r.model_name === selectedModelName) || results[0];

  const cmData = activeModel?.metrics?.confusion_matrix;
  const epochHistory = activeModel?.epoch_history || [];
  const predictionsSample = activeModel?.predictions_sample || [];

  const filteredPredictions = predictionsSample.filter((p) => {
    if (predictionFilter === 'CORRECT') return p.is_correct;
    if (predictionFilter === 'ERRORS') return !p.is_correct;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <LucideLineChart className="w-5 h-5 text-cyan-400" />
            Performance Analytics & Diagnostic Visualizer
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Confusion matrix heatmaps, epoch loss convergence, and sample-level misclassification diagnostics.
          </p>
        </div>

        {/* Experiment and Model Selectors */}
        {completedExperiments.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Trial:</span>
              <select
                value={currentExp?.id}
                onChange={(e) => onSelectExperiment(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-cyan-500"
              >
                {completedExperiments.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.dataset_id})
                  </option>
                ))}
              </select>
            </div>

            {results.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Model:</span>
                <select
                  value={activeModel?.model_name}
                  onChange={(e) => setSelectedModelName(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 text-xs font-bold focus:outline-none"
                >
                  {results.map((r) => (
                    <option key={r.model_name} value={r.model_name}>
                      {r.model_name} ({r.algorithm_family})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {results.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center space-y-4">
          <Info className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Evaluation Results Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Please run an experiment in the Experiment Lab first to inspect confusion matrices and convergence curves.
          </p>
          <button
            onClick={onNavigateToLab}
            className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
          >
            Go to Experiment Lab
          </button>
        </div>
      ) : activeModel ? (
        <div className="space-y-6">
          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="glass-panel rounded-xl p-3 text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Accuracy</span>
              <p className="text-lg font-bold text-white mt-0.5">
                {(activeModel.metrics.accuracy * 100).toFixed(2)}%
              </p>
            </div>
            <div className="glass-panel rounded-xl p-3 text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Macro F1</span>
              <p className="text-lg font-bold text-cyan-400 mt-0.5">
                {(activeModel.metrics.f1_macro * 100).toFixed(2)}%
              </p>
            </div>
            <div className="glass-panel rounded-xl p-3 text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Weighted F1</span>
              <p className="text-lg font-bold text-violet-400 mt-0.5">
                {(activeModel.metrics.f1_weighted * 100).toFixed(2)}%
              </p>
            </div>
            <div className="glass-panel rounded-xl p-3 text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400">ROC-AUC</span>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">
                {activeModel.metrics.roc_auc !== null
                  ? `${(activeModel.metrics.roc_auc * 100).toFixed(2)}%`
                  : 'N/A'}
              </p>
            </div>
            <div className="glass-panel rounded-xl p-3 text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Training Time</span>
              <p className="text-lg font-bold text-amber-400 mt-0.5">
                {activeModel.metrics.training_time_sec.toFixed(3)}s
              </p>
            </div>
            <div className="glass-panel rounded-xl p-3 text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Latency / Sample</span>
              <p className="text-lg font-bold text-slate-200 mt-0.5">
                {activeModel.metrics.latency_ms_per_sample.toFixed(3)}ms
              </p>
            </div>
          </div>

          {/* Confusion Matrix & Epoch Curves Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Confusion Matrix Heatmap */}
            <div className="glass-panel rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Grid className="w-4 h-4 text-cyan-400" />
                    Confusion Matrix Heatmap ({activeModel.model_name})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Rows: True Class Labels • Columns: Predicted Class Labels
                  </p>
                </div>

                {/* Mode toggle */}
                <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
                  <button
                    onClick={() => setCmMode('normalized')}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      cmMode === 'normalized' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                    }`}
                  >
                    Normalized
                  </button>
                  <button
                    onClick={() => setCmMode('counts')}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      cmMode === 'counts' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                    }`}
                  >
                    Raw Counts
                  </button>
                </div>
              </div>

              {cmData ? (
                <div className="overflow-x-auto py-2">
                  <div className="inline-block min-w-full">
                    <div className="flex">
                      <div className="w-12" />
                      <div className="flex-1 flex justify-center text-[11px] font-bold text-slate-400 pb-1 uppercase tracking-wider">
                        Predicted Class
                      </div>
                    </div>

                    <div className="flex">
                      {/* True Class Vertical Label */}
                      <div className="w-8 flex items-center justify-center">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider -rotate-90 whitespace-nowrap">
                          True Class
                        </span>
                      </div>

                      <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-center border-collapse">
                          <thead>
                            <tr>
                              <th className="p-1 text-[10px] text-slate-500"></th>
                              {cmData.labels.map((lbl, idx) => (
                                <th key={idx} className="p-1 text-[10px] font-mono font-bold text-slate-400">
                                  C{lbl}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(cmMode === 'normalized' ? cmData.normalized : cmData.matrix).map(
                              (row, rIdx) => (
                                <tr key={rIdx}>
                                  <td className="p-1 text-[10px] font-mono font-bold text-slate-400 text-right pr-2">
                                    C{cmData.labels[rIdx]}
                                  </td>
                                  {row.map((val, cIdx) => {
                                    const intensity =
                                      cmMode === 'normalized'
                                        ? val
                                        : val / Math.max(...row, 1);
                                    const isDiagonal = rIdx === cIdx;
                                    return (
                                      <td
                                        key={cIdx}
                                        className="p-2 border border-slate-900 font-mono text-xs transition-colors"
                                        style={{
                                          backgroundColor: isDiagonal
                                            ? `rgba(6, 182, 212, ${Math.max(intensity, 0.15)})`
                                            : `rgba(239, 68, 68, ${Math.max(intensity * 0.8, 0.05)})`,
                                          color: intensity > 0.5 ? '#ffffff' : '#94a3b8',
                                        }}
                                      >
                                        {cmMode === 'normalized' ? (val * 100).toFixed(1) + '%' : val}
                                      </td>
                                    );
                                  })}
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No confusion matrix recorded.</p>
              )}
            </div>

            {/* Epoch Loss & Accuracy Curves (for GNNs) */}
            <div className="glass-panel rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <LucideLineChart className="w-4 h-4 text-violet-400" />
                  Epoch Loss & Validation Trajectory
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cross-entropy training loss vs. validation accuracy progression
                </p>
              </div>

              {epochHistory.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={epochHistory} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
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
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="val_loss"
                        name="Val Loss"
                        stroke="#06b6d4"
                        dot={false}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="val_accuracy"
                        name="Val Accuracy"
                        stroke="#10b981"
                        dot={false}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs p-6 text-center border border-dashed border-slate-800 rounded-xl">
                  <span>Non-iterative or traditional machine learning algorithm.</span>
                  <span className="text-slate-600 mt-1">
                    Select a GNN model (GCN, GraphSAGE, GAT) to visualize epoch-by-epoch backpropagation curves.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Predictions Sample Diagnostics Table */}
          {predictionsSample.length > 0 && (
            <div className="glass-panel rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-white">Prediction Inspection & Error Diagnostics</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Individual test samples with true targets, model predictions, and class probabilities
                  </p>
                </div>

                {/* Filter */}
                <div className="flex items-center gap-1.5 bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
                  {(['ALL', 'CORRECT', 'ERRORS'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setPredictionFilter(mode)}
                      className={`px-2.5 py-1 rounded font-medium transition-all ${
                        predictionFilter === mode ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {mode === 'ALL' ? 'All Samples' : mode === 'CORRECT' ? 'Correct Only' : 'Errors Only'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-72">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="sticky top-0 bg-slate-900 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800 z-10">
                    <tr>
                      <th className="px-3.5 py-2.5">Sample ID</th>
                      <th className="px-3 py-2.5">True Label</th>
                      <th className="px-3 py-2.5">Predicted Label</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Class Probabilities</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 font-mono text-[11px]">
                    {filteredPredictions.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-3.5 py-2 font-bold text-white">#{p.index}</td>
                        <td className="px-3 py-2">Class {p.true_label}</td>
                        <td className="px-3 py-2">Class {p.predicted_label}</td>
                        <td className="px-3 py-2">
                          {p.is_correct ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Correct
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                              <XCircle className="w-3.5 h-3.5" />
                              Misclassified
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-400 text-[10px]">
                          {p.probabilities ? p.probabilities.join(', ') : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
