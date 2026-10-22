import React, { useState } from 'react';
import {
  BarChart3,
  Database,
  Cpu,
  Trophy,
  Zap,
  Clock,
  Play,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { MetricCard } from '../components/MetricCard';
import { Badge } from '../components/Badge';
import { Experiment, ModelResult } from '../types';

interface OverviewDashboardProps {
  experiments: Experiment[];
  latestExperiment?: Experiment | null;
  onNavigateToLab: () => void;
  onNavigateToReport: (id: string) => void;
  onRunQuickBenchmark: () => void;
  isRunningBenchmark: boolean;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  experiments,
  latestExperiment,
  onNavigateToLab,
  onNavigateToReport,
  onRunQuickBenchmark,
  isRunningBenchmark,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'accuracy' | 'f1_macro' | 'f1_weighted'>('f1_macro');

  const completedExperiments = experiments.filter((e) => e.status === 'COMPLETED');
  const allResults: ModelResult[] = latestExperiment?.results || [];

  // Determine best model based on selected metric
  let bestModel: ModelResult | null = null;
  if (allResults.length > 0) {
    bestModel = [...allResults].sort((a, b) => b.metrics[selectedMetric] - a.metrics[selectedMetric])[0];
  }

  // Bar chart data for models
  const performanceChartData = allResults.map((r) => ({
    name: r.model_name,
    family: r.algorithm_family,
    accuracy: Number((r.metrics.accuracy * 100).toFixed(1)),
    precision: Number((r.metrics.precision_macro * 100).toFixed(1)),
    recall: Number((r.metrics.recall_macro * 100).toFixed(1)),
    f1: Number((r.metrics.f1_macro * 100).toFixed(1)),
  }));

  const timeChartData = allResults.map((r) => ({
    name: r.model_name,
    family: r.algorithm_family,
    trainTime: Number(r.metrics.training_time_sec.toFixed(3)),
    latency: Number(r.metrics.latency_ms_per_sample.toFixed(3)),
  }));

  const memoryChartData = allResults.map((r) => ({
    name: r.model_name,
    family: r.algorithm_family,
    memory: Number(r.metrics.peak_memory_mb.toFixed(2)),
  }));

  return (
    <div className="space-y-6">
      {/* Hero / Research Objective Banner */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 relative overflow-hidden bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950/90 border-cyan-500/20">
        <div className="relative z-10 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="cyan" size="sm">Empirical AI Research</Badge>
            <Badge variant="violet" size="sm">B.Tech Honors AI/ML Project</Badge>
            <Badge variant="emerald" size="sm">Leakage-Free Protocol</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Comparative Analysis: Graph Neural Networks vs. Traditional Machine Learning
          </h1>
          <p className="text-slate-300 text-sm sm:text-base mt-2.5 leading-relaxed">
            Investigating the inductive bias, classification efficacy, and computational overhead of relational
            message passing (GCN, GraphSAGE, GAT) versus feature-centric algorithms (Random Forest, SVM, Logistic Regression,
            Gradient Boosting) across topological citation graphs and tabular similarity graphs.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={onNavigateToLab}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>Launch Experiment Lab</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            {completedExperiments.length === 0 && (
              <button
                onClick={onRunQuickBenchmark}
                disabled={isRunningBenchmark}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-cyan-500/30 text-cyan-300 font-medium text-xs sm:text-sm transition-all disabled:opacity-50"
              >
                <Play className="w-4 h-4 text-cyan-400" />
                <span>{isRunningBenchmark ? 'Running Benchmark...' : 'Run 1-Click Starter Benchmark'}</span>
              </button>
            )}

            {latestExperiment && (
              <button
                onClick={() => onNavigateToReport(latestExperiment.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs sm:text-sm transition-all"
              >
                <span>View Latest Report</span>
              </button>
            )}
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-20 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Top 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Available Datasets"
          value="6 Benchmarks"
          subtitle="3 Citation Graphs • 3 Tabular"
          icon={Database}
          accentColor="cyan"
        />
        <MetricCard
          title="Implemented Models"
          value="9 Algorithms"
          subtitle="3 GNNs • 6 Traditional Classifiers"
          icon={Cpu}
          accentColor="violet"
        />
        <MetricCard
          title="Completed Experiments"
          value={completedExperiments.length}
          subtitle={`Latest Status: ${latestExperiment ? latestExperiment.status : 'None'}`}
          icon={Trophy}
          accentColor="emerald"
        />
        <MetricCard
          title={`Top Model (${selectedMetric === 'accuracy' ? 'Accuracy' : 'Macro F1'})`}
          value={bestModel ? bestModel.model_name : 'No Runs Yet'}
          subtitle={
            bestModel
              ? `${(bestModel.metrics[selectedMetric] * 100).toFixed(2)}% on ${latestExperiment?.dataset_id}`
              : 'Execute an experiment'
          }
          icon={TrendingUp}
          accentColor="blue"
        />
      </div>

      {/* If No Experiment Results Yet: Empty State Guide */}
      {allResults.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center space-y-4 border border-dashed border-slate-700">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">No Experiment Results Recorded Yet</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            All charts and comparisons on this dashboard strictly display empirical results from actual model training.
            Click below to run a quick starter benchmark on the Cora citation network or Wine tabular dataset.
          </p>
          <div className="pt-2">
            <button
              onClick={onRunQuickBenchmark}
              disabled={isRunningBenchmark}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>{isRunningBenchmark ? 'Executing Real Benchmark...' : 'Run Quick Benchmark Now'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Real Experiment Charts */
        <div className="space-y-6">
          {/* Active Dataset & Metric Selector Bar */}
          <div className="glass-panel rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Experiment:</span>
              <span className="text-sm font-bold text-white">{latestExperiment?.name}</span>
              <Badge variant="cyan" size="sm">{latestExperiment?.dataset_id.toUpperCase()}</Badge>
              <Badge variant="violet" size="sm">{latestExperiment?.track}</Badge>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Rank Metric:</span>
              <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-800">
                {(['f1_macro', 'accuracy', 'f1_weighted'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMetric(m)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      selectedMetric === m
                        ? 'bg-cyan-500 text-slate-950 font-semibold shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m === 'f1_macro' ? 'Macro F1' : m === 'accuracy' ? 'Accuracy' : 'Weighted F1'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Primary Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Accuracy & F1 Comparison */}
            <div className="glass-panel rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    Accuracy & Macro F1 Comparison
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Empirical test set scores (%) across evaluated models</p>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                    <YAxis stroke="#94a3b8" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      formatter={(val: any) => [`${val}%`]}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                    <Bar dataKey="accuracy" name="Accuracy (%)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="f1" name="Macro F1 (%)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Precision & Recall Comparison */}
            <div className="glass-panel rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-violet-400" />
                    Precision vs. Recall Trade-Off
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Macro-averaged precision and recall</p>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                    <YAxis stroke="#94a3b8" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      formatter={(val: any) => [`${val}%`]}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                    <Bar dataKey="precision" name="Precision (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="recall" name="Recall (%)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Secondary Charts: Computational Overhead */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Training Time */}
            <div className="glass-panel rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Computational Cost: Training Time (Seconds)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">CPU execution time for model training</p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      formatter={(val: any) => [`${val}s`, 'Training Time']}
                    />
                    <Bar dataKey="trainTime" name="Training Time (s)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Peak Memory Usage */}
            <div className="glass-panel rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-rose-400" />
                  Peak Traced Memory Allocation (MB)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Peak runtime memory traced during training</p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={memoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      formatter={(val: any) => [`${val} MB`, 'Peak Memory']}
                    />
                    <Bar dataKey="memory" name="Peak Memory (MB)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
