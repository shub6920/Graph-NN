import { Dataset, Experiment, ModelResult, SubgraphData, ResearchReport } from '../types';

const API_BASE = '/api';

export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to connect to backend.');
  return res.json();
}

export async function fetchDatasets(): Promise<Dataset[]> {
  const res = await fetch(`${API_BASE}/datasets`);
  if (!res.ok) throw new Error('Failed to fetch datasets list.');
  return res.json();
}

export async function fetchDatasetDetails(datasetId: string): Promise<Dataset> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}`);
  if (!res.ok) throw new Error(`Failed to load dataset details for ${datasetId}.`);
  return res.json();
}

export async function fetchDatasetSubgraph(
  datasetId: string,
  maxNodes: number = 100,
  centerNode?: number
): Promise<SubgraphData> {
  let url = `${API_BASE}/datasets/${datasetId}/subgraph?max_nodes=${maxNodes}`;
  if (centerNode !== undefined) {
    url += `&center_node=${centerNode}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load graph subgraph.');
  return res.json();
}

export async function fetchExperiments(): Promise<Experiment[]> {
  const res = await fetch(`${API_BASE}/experiments`);
  if (!res.ok) throw new Error('Failed to fetch experiments list.');
  return res.json();
}

export async function fetchExperimentStatus(experimentId: string): Promise<Experiment> {
  const res = await fetch(`${API_BASE}/experiments/${experimentId}`);
  if (!res.ok) throw new Error('Failed to fetch experiment status.');
  return res.json();
}

export async function fetchExperimentResults(experimentId: string): Promise<{
  experiment_id: string;
  dataset_id: string;
  track: string;
  status: string;
  random_seed: number;
  results: ModelResult[];
}> {
  const res = await fetch(`${API_BASE}/experiments/${experimentId}/results`);
  if (!res.ok) throw new Error('Failed to fetch experiment results.');
  return res.json();
}

export async function createExperiment(payload: {
  name: string;
  dataset_id: string;
  track: string;
  algorithms: string[];
  random_seed?: number;
  hyperparameters?: Record<string, any>;
  knn_k?: number;
  knn_mode?: string;
}): Promise<{ experiment_id: string; status: string; message: string }> {
  const res = await fetch(`${API_BASE}/experiments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to trigger experiment pipeline.');
  }
  return res.json();
}

export async function cancelExperiment(experimentId: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/experiments/${experimentId}/cancel`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to cancel experiment.');
  return res.json();
}

export async function fetchExperimentReport(experimentId: string): Promise<ResearchReport> {
  const res = await fetch(`${API_BASE}/experiments/${experimentId}/report`);
  if (!res.ok) throw new Error('Failed to generate research report.');
  return res.json();
}

export async function uploadCustomDataset(formData: FormData): Promise<any> {
  const res = await fetch(`${API_BASE}/datasets/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Upload failed.');
  }
  return res.json();
}
