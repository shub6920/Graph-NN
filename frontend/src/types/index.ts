export type DatasetType = 'graph' | 'tabular';
export type ExperimentTrack = 'Track A' | 'Track B';
export type ExperimentStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface ClassDistItem {
  class_id: number;
  class_name: string;
  count: number;
  percentage: number;
}

export interface FeatureStat {
  mean: number;
  std: number;
  min: number;
  max: number;
  missing: number;
}

export interface Dataset {
  id: string;
  name: string;
  type: DatasetType;
  track: ExperimentTrack;
  domain: string;
  num_samples?: number;
  num_nodes?: number;
  num_edges?: number;
  num_features: number;
  num_classes: number;
  classes?: string[];
  description: string;
  class_distribution?: ClassDistItem[];
  feature_statistics?: Record<string, FeatureStat>;
  preview?: Record<string, any>[];
  graph_statistics?: {
    avg_degree: number;
    max_degree: number;
    min_degree: number;
    density: number;
    homophily: number;
  };
}

export interface ConfusionMatrixData {
  matrix: number[][];
  normalized: number[][];
  labels: string[];
}

export interface EpochMetric {
  epoch: number;
  train_loss: number;
  train_accuracy: number;
  val_loss: number;
  val_accuracy: number;
}

export interface PredictionItem {
  index: number;
  true_label: number;
  predicted_label: number;
  is_correct: boolean;
  probabilities?: number[];
}

export interface ModelMetrics {
  accuracy: number;
  precision_macro: number;
  precision_weighted: number;
  recall_macro: number;
  recall_weighted: number;
  f1_macro: number;
  f1_weighted: number;
  roc_auc?: number | null;
  training_time_sec: number;
  inference_time_sec: number;
  latency_ms_per_sample: number;
  peak_memory_mb: number;
  confusion_matrix: ConfusionMatrixData;
}

export interface ModelResult {
  model_name: string;
  algorithm_family: 'Graph Neural Network' | 'Traditional ML';
  hyperparameters?: Record<string, any>;
  metrics: ModelMetrics;
  validation_metrics?: any;
  epoch_history?: EpochMetric[];
  predictions_sample?: PredictionItem[];
  all_preds?: number[];
  graph_construction_meta?: any;
}

export interface Experiment {
  id: string;
  name: string;
  dataset_id: string;
  track: ExperimentTrack;
  status: ExperimentStatus;
  random_seed: number;
  models_config: string[];
  created_at: string;
  completed_at?: string | null;
  error_message?: string | null;
  results?: ModelResult[];
}

export interface SubgraphNode {
  id: number;
  original_id: number;
  label: number;
  class_name: string;
  degree: number;
  pred_label?: number;
  is_correct?: boolean;
}

export interface SubgraphLink {
  source: number | SubgraphNode;
  target: number | SubgraphNode;
}

export interface SubgraphData {
  dataset_id: string;
  nodes: SubgraphNode[];
  links: SubgraphLink[];
  total_graph_nodes: number;
  displayed_nodes: number;
  displayed_edges: number;
  center_node: number;
}

export interface AcademicReference {
  id: string;
  citation: string;
}

export interface ResearchReport {
  experiment_id: string;
  dataset_id: string;
  track: string;
  best_model: string;
  best_macro_f1: number;
  best_accuracy: number;
  models_data: ModelResult[];
  sections: {
    title: string;
    abstract: string;
    introduction: string;
    research_objectives: string;
    related_work: string;
    methodology: string;
    results_table_md: string;
    discussion: string;
    limitations: string;
    conclusion: string;
    references: AcademicReference[];
  };
  markdown: string;
}
