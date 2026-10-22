import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { OverviewDashboard } from './pages/OverviewDashboard';
import { DatasetExplorer } from './pages/DatasetExplorer';
import { GraphVisualization } from './pages/GraphVisualization';
import { ModelComparison } from './pages/ModelComparison';
import { ExperimentLab } from './pages/ExperimentLab';
import { PerformanceAnalytics } from './pages/PerformanceAnalytics';
import { ResearchReport } from './pages/ResearchReport';
import { Dataset, Experiment } from './types';
import {
  fetchHealth,
  fetchDatasets,
  fetchExperiments,
  createExperiment,
} from './services/api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [backendHealthy, setBackendHealthy] = useState<boolean>(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('cora');
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>('');
  const [isRunningQuickBenchmark, setIsRunningQuickBenchmark] = useState<boolean>(false);

  // 1. Health check
  const checkHealth = useCallback(async () => {
    try {
      await fetchHealth();
      setBackendHealthy(true);
    } catch {
      setBackendHealthy(false);
    }
  }, []);

  // 2. Fetch datasets
  const loadDatasets = useCallback(async () => {
    try {
      const data = await fetchDatasets();
      setDatasets(data);
      if (data.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching datasets:', err);
    }
  }, [selectedDatasetId]);

  // 3. Fetch experiments
  const loadExperiments = useCallback(async () => {
    try {
      const data = await fetchExperiments();
      setExperiments(data);
      if (data.length > 0 && !selectedExperimentId) {
        setSelectedExperimentId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching experiments:', err);
    }
  }, [selectedExperimentId]);

  useEffect(() => {
    checkHealth();
    loadDatasets();
    loadExperiments();

    const healthInterval = setInterval(checkHealth, 8000);
    return () => clearInterval(healthInterval);
  }, [checkHealth, loadDatasets, loadExperiments]);

  // 4. Polling for running experiments
  const runningExperiments = experiments.filter(
    (e) => e.status === 'RUNNING' || e.status === 'PENDING'
  );

  useEffect(() => {
    if (runningExperiments.length === 0) return;
    const interval = setInterval(() => {
      loadExperiments();
    }, 2000);
    return () => clearInterval(interval);
  }, [runningExperiments.length, loadExperiments]);

  // 5. Quick benchmark handler
  const handleRunQuickBenchmark = async () => {
    setIsRunningQuickBenchmark(true);
    try {
      await createExperiment({
        name: 'Starter Comparative Benchmark',
        dataset_id: 'cora',
        track: 'Track A',
        algorithms: ['GCN', 'GraphSAGE', 'Random Forest', 'SVM', 'Logistic Regression'],
        random_seed: 42,
        hyperparameters: {
          GCN: { epochs: 60, hidden_dim: 64, learning_rate: 0.01 },
          GraphSAGE: { epochs: 60, hidden_dim: 64, learning_rate: 0.01 },
          'Random Forest': { n_estimators: 80 },
          SVM: { C: 1.0 },
          'Logistic Regression': { C: 1.0 },
        },
      });
      await loadExperiments();
      setCurrentTab('lab');
    } catch (err) {
      console.error('Failed to trigger quick benchmark:', err);
    } finally {
      setIsRunningQuickBenchmark(false);
    }
  };

  const latestCompletedExperiment =
    experiments.find((e) => e.status === 'COMPLETED') || experiments[0];

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        backendHealthy={backendHealthy}
        activeExperimentCount={runningExperiments.length}
      />

      {/* Main Page Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'overview' && (
          <OverviewDashboard
            experiments={experiments}
            latestExperiment={latestCompletedExperiment}
            onNavigateToLab={() => setCurrentTab('lab')}
            onNavigateToReport={(id) => {
              setSelectedExperimentId(id);
              setCurrentTab('report');
            }}
            onRunQuickBenchmark={handleRunQuickBenchmark}
            isRunningBenchmark={isRunningQuickBenchmark}
          />
        )}

        {currentTab === 'datasets' && (
          <DatasetExplorer
            datasets={datasets}
            selectedDatasetId={selectedDatasetId}
            onSelectDataset={setSelectedDatasetId}
            onRefreshDatasets={loadDatasets}
          />
        )}

        {currentTab === 'graph' && (
          <GraphVisualization
            datasets={datasets}
            selectedDatasetId={selectedDatasetId}
            onSelectDataset={setSelectedDatasetId}
          />
        )}

        {currentTab === 'comparison' && (
          <ModelComparison
            experiments={experiments}
            selectedExperimentId={selectedExperimentId}
            onSelectExperiment={setSelectedExperimentId}
            onNavigateToLab={() => setCurrentTab('lab')}
          />
        )}

        {currentTab === 'lab' && (
          <ExperimentLab
            datasets={datasets}
            selectedDatasetId={selectedDatasetId}
            onSelectDataset={setSelectedDatasetId}
            activeExperiment={experiments.find((e) => e.id === selectedExperimentId) || experiments[0]}
            onRefreshExperiments={loadExperiments}
          />
        )}

        {currentTab === 'analytics' && (
          <PerformanceAnalytics
            experiments={experiments}
            selectedExperimentId={selectedExperimentId}
            onSelectExperiment={setSelectedExperimentId}
            onNavigateToLab={() => setCurrentTab('lab')}
          />
        )}

        {currentTab === 'report' && (
          <ResearchReport
            experiments={experiments}
            selectedExperimentId={selectedExperimentId}
            onSelectExperiment={setSelectedExperimentId}
            onNavigateToLab={() => setCurrentTab('lab')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        Comparative Analysis of Graph Neural Networks and Traditional ML • Final Year B.Tech Research Project
      </footer>
    </div>
  );
};

export default App;
