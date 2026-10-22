import React, { useState } from 'react';
import {
  GitCompare,
  Trophy,
  Zap,
  Clock,
  Cpu,
  TrendingUp,
  Filter,
  CheckCircle2,
  Sparkles,
  Info,
  Scale,
} from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { Badge } from '../components/Badge';
import { Experiment, ModelResult } from '../types';

interface ModelComparisonProps {
  experiments: Experiment[];
  selectedExperimentId?: string;
  onSelectExperiment: (id: string) => void;
  onNavigateToLab: () => void;
}

export const ModelComparison: React.FC<ModelComparisonProps> = ({
  experiments,
  selectedExperimentId,
  onSelectExperiment,
  onNavigateToLab,
}) => {
  const [familyFilter, setFamilyFilter] = useState<'ALL' | 'GNN' | 'Traditional ML'>('ALL');
  const [metricSort, setMetricSort] = useState<'f1_macro' | 'accuracy' | 'training_time_sec'>('f1_macro');

  const completedExperiments = experiments.filter((e) => e.status === 'COMPLETED');
  const currentExp =
    completedExperiments.find((e) => e.id === selectedExperimentId) || completedExperiments[0];

  const results: ModelResult[] = currentExp?.results || [];

  const filteredResults = results
    .filter((r) => {
      if (familyFilter === 'GNN') return r.algorithm_family === 'Graph Neural Network';
      if (familyFilter === 'Traditional ML') return r.algorithm_family === 'Traditional ML';
      return true;
    })
    .sort((a, b) => {
      if (metricSort === 'training_time_sec') {
        return a.metrics.training_time_sec - b.metrics.training_time_sec;
      }
      return b.metrics[metricSort] - a.metrics[metricSort];
    });

  // Top model
  const topModel = results.length > 0 ? [...results].sort((a, b) => b.metrics.f1_macro - a.metrics.f1_macro)[0] : null;

  // Scatter plot data: Training Time (x) vs Macro F1 (y)
  const scatterGNN = results
    .filter((r) => r.algorithm_family === 'Graph Neural Network')
    .map((r) => ({
      name: r.model_name,
      x: Number(r.metrics.training_time_sec.toFixed(3)),
      y: Number((r.metrics.f1_macro * 100).toFixed(1)),
      acc: Number((r.metrics.accuracy * 100).toFixed(1)),
      latency: Number(r.metrics.latency_ms_per_sample.toFixed(3)),
    }));

  const scatterML = results
    .filter((r) => r.algorithm_family === 'Traditional ML')
    .map((r) => ({
      name: r.model_name,
      x: Number(r.metrics.training_time_sec.toFixed(3)),
      y: Number((r.metrics.f1_macro * 100).toFixed(1)),
      acc: Number((r.metrics.accuracy * 100).toFixed(1)),
      latency: Number(r.metrics.latency_ms_per_sample.toFixed(3)),
    }));

  // GNN vs ML Average comparison for insights
  const gnnList = results.filter((r) => r.algorithm_family === 'Graph Neural Network');
  const mlList = results.filter((r) => r.algorithm_family === 'Traditional ML');

  const avgGnnF1 = gnnList.length ? gnnList.reduce((acc, r) => acc + r.metrics.f1_macro, 0) / gnnList.length : 0;
  const avgMlF1 = mlList.length ? mlList.reduce((acc, r) => acc + r.metrics.f1_macro, 0) / mlList.length : 0;
  const f1Delta = ((avgGnnF1 - avgMlF1) * 100).toFixed(2);

  const avgGnnTime = gnnList.length ? gnnList.reduce((acc, r) => acc + r.metrics.training_time_sec, 0) / gnnList.length : 0;
  const avgMlTime = mlList.length ? mlList.reduce((acc, r) => acc + r.metrics.training_time_sec, 0) / mlList.length : 0;
  const timeRatio = avgMlTime > 0 ? (avgGnnTime / avgMlTime).toFixed(1) : 'N/A';

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-cyan-400" />
            Model Benchmark & Trade-Off Comparison
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Statistical comparison across predictive accuracy, latency, and resource constraints.
          </p>
        </div>

        {/* Experiment Selector Dropdown */}
        {completedExperiments.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Experiment:</span>
            <select
              value={currentExp?.id}
              onChange={(e) => onSelectExperiment(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-cyan-500"
            >
              {completedExperiments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.dataset_id} - {e.track})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {results.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center space-y-4">
          <Info className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Experiments to Compare</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Run an experiment comparing GNNs and traditional ML models in the Experiment Lab to inspect comparative metrics here.
          </p>
          <button
            onClick={onNavigateToLab}
            className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
          >
            Go to Experiment Lab
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Scientific Trade-Off Insights Panel */}
          <div className="glass-panel rounded-2xl p-6 border-l-4 border-l-cyan-500 bg-gradient-to-r from-slate-900/90 to-slate-950/90 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Automated Empirical Research Findings
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-500">Peak Classifier</span>
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{topModel?.model_name}</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Achieved highest Macro F1 of {(topModel?.metrics.f1_macro! * 100).toFixed(2)}% (Accuracy:{' '}
                  {(topModel?.metrics.accuracy! * 100).toFixed(2)}%)
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-500">Relational Gain</span>
                <p className="text-sm font-bold text-cyan-300">
                  {Number(f1Delta) >= 0 ? `+${f1Delta}% F1 Delta` : `${f1Delta}% F1 Delta`}
                </p>
                <p className="text-[11px] text-slate-400">
                  {Number(f1Delta) > 0
                    ? `Graph message passing outperformed non-relational features on ${currentExp?.dataset_id}.`
                    : `Traditional ML remained highly competitive against graph convolution layers.`}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-500">Computational Ratio</span>
                <p className="text-sm font-bold text-violet-300">{timeRatio}x Training Ratio</p>
                <p className="text-[11px] text-slate-400">
                  Average GNN training time ({avgGnnTime.toFixed(3)}s) vs. Traditional ML ({avgMlTime.toFixed(3)}s).
                </p>
              </div>
            </div>
          </div>

          {/* Pareto Frontier: Training Time vs Macro F1 Score */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-cyan-400" />
                  Accuracy vs. Efficiency Pareto Frontier
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  X-axis: Training Time (seconds) • Y-axis: Macro F1 (%) (Top-left models represent optimal trade-offs)
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Training Time"
                    unit="s"
                    stroke="#94a3b8"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Macro F1"
                    unit="%"
                    domain={['auto', 'auto']}
                    stroke="#94a3b8"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    formatter={(val: any, name: any) => [name === 'Macro F1' ? `${val}%` : `${val}s`, name]}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                  <Scatter name="Graph Neural Networks" data={scatterGNN} fill="#06b6d4" shape="circle" />
                  <Scatter name="Traditional ML Classifiers" data={scatterML} fill="#8b5cf6" shape="diamond" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comprehensive Comparison Table */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">Full Empirical Evaluation Matrix</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rigorous test split metrics computed directly from actual predictions
                </p>
              </div>

              {/* Filter controls */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Filter Family:</span>
                <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
                  {(['ALL', 'GNN', 'Traditional ML'] as const).map((fam) => (
                    <button
                      key={fam}
                      onClick={() => setFamilyFilter(fam)}
                      className={`px-2.5 py-1 rounded font-medium transition-all ${
                        familyFilter === fam ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {fam}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-3.5 py-3">Algorithm</th>
                    <th className="px-3 py-3">Family</th>
                    <th className="px-3 py-3 text-right">Accuracy</th>
                    <th className="px-3 py-3 text-right">Macro F1</th>
                    <th className="px-3 py-3 text-right">Weighted F1</th>
                    <th className="px-3 py-3 text-right">ROC-AUC</th>
                    <th className="px-3 py-3 text-right">Train Time</th>
                    <th className="px-3 py-3 text-right">Latency / Sample</th>
                    <th className="px-3 py-3 text-right">Peak Memory</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 font-mono text-[11px]">
                  {filteredResults.map((r, idx) => {
                    const isTop = topModel?.model_name === r.model_name;
                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isTop ? 'bg-cyan-500/5 border-l-2 border-l-cyan-400' : ''
                        }`}
                      >
                        <td className="px-3.5 py-2.5 font-sans font-bold text-white flex items-center gap-2">
                          {isTop && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          <span>{r.model_name}</span>
                        </td>
                        <td className="px-3 py-2.5 font-sans">
                          <Badge variant={r.algorithm_family === 'Graph Neural Network' ? 'cyan' : 'violet'}>
                            {r.algorithm_family === 'Graph Neural Network' ? 'GNN' : 'Trad ML'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-white">
                          {(r.metrics.accuracy * 100).toFixed(2)}%
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-cyan-300">
                          {(r.metrics.f1_macro * 100).toFixed(2)}%
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-300">
                          {(r.metrics.f1_weighted * 100).toFixed(2)}%
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-400">
                          {r.metrics.roc_auc !== null ? `${(r.metrics.roc_auc * 100).toFixed(2)}%` : 'N/A'}
                        </td>
                        <td className="px-3 py-2.5 text-right text-amber-300">
                          {r.metrics.training_time_sec.toFixed(3)}s
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-300">
                          {r.metrics.latency_ms_per_sample.toFixed(3)}ms
                        </td>
                        <td className="px-3 py-2.5 text-right text-rose-300">
                          {r.metrics.peak_memory_mb.toFixed(2)} MB
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
