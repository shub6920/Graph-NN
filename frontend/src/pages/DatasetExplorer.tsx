import React, { useState, useEffect } from 'react';
import {
  Database,
  Share2,
  Table,
  Upload,
  AlertCircle,
  BarChart2,
  FileSpreadsheet,
  CheckCircle2,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Badge } from '../components/Badge';
import { Dataset } from '../types';
import { fetchDatasetDetails, uploadCustomDataset } from '../services/api';

interface DatasetExplorerProps {
  datasets: Dataset[];
  selectedDatasetId: string;
  onSelectDataset: (id: string) => void;
  onRefreshDatasets: () => void;
}

export const DatasetExplorer: React.FC<DatasetExplorerProps> = ({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onRefreshDatasets,
}) => {
  const [datasetDetails, setDatasetDetails] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState<string>('');
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [uploadDescription, setUploadDescription] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDatasetId) return;
    setLoading(true);
    fetchDatasetDetails(selectedDatasetId)
      .then((data) => {
        setDatasetDetails(data);
      })
      .catch((err) => {
        console.error('Failed to load dataset details:', err);
      })
      .finally(() => setLoading(false));
  }, [selectedDatasetId]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadName) {
      setUploadError('Please choose a CSV file and enter a dataset name.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('name', uploadName);
    if (targetColumn) formData.append('target_column', targetColumn);
    if (uploadDescription) formData.append('description', uploadDescription);

    try {
      const res = await uploadCustomDataset(formData);
      setUploadSuccess(`Dataset "${res.name}" registered successfully!`);
      onRefreshDatasets();
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadName('');
        setTargetColumn('');
        setUploadDescription('');
        setUploadSuccess(null);
        onSelectDataset(res.dataset_id);
      }, 1200);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const selectedMeta = datasets.find((d) => d.id === selectedDatasetId);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            Dataset Explorer & Schema Inspector
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Explore topological citation graphs, tabular benchmarks, and custom uploaded CSV datasets.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-cyan-500/30 text-cyan-300 font-medium text-xs transition-all"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Custom Dataset</span>
        </button>
      </div>

      {/* Dataset Selection Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {datasets.map((d) => {
          const isSelected = d.id === selectedDatasetId;
          const isGraph = d.type === 'graph';
          return (
            <button
              key={d.id}
              onClick={() => onSelectDataset(d.id)}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/50 text-white shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {isGraph ? <Share2 className="w-3.5 h-3.5 text-cyan-400" /> : <Table className="w-3.5 h-3.5 text-violet-400" />}
              <span>{d.name}</span>
              <Badge variant={isGraph ? 'cyan' : 'violet'} size="sm">
                {d.track}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-slate-400 animate-pulse">
          Loading dataset structure and metadata...
        </div>
      ) : selectedMeta ? (
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl font-bold text-white">{selectedMeta.name}</h3>
                  <Badge variant={selectedMeta.type === 'graph' ? 'cyan' : 'violet'}>
                    {selectedMeta.type.toUpperCase()}
                  </Badge>
                  <Badge variant="emerald">{selectedMeta.track}</Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-medium">Domain: {selectedMeta.domain}</p>
                <p className="text-sm text-slate-300 mt-3 max-w-3xl leading-relaxed">
                  {selectedMeta.description}
                </p>
              </div>

              {/* Quick Spec Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-center">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500">
                    {selectedMeta.type === 'graph' ? 'Nodes' : 'Samples'}
                  </span>
                  <p className="text-base font-bold text-white mt-0.5">
                    {selectedMeta.type === 'graph' ? selectedMeta.num_nodes?.toLocaleString() : selectedMeta.num_samples?.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500">Features</span>
                  <p className="text-base font-bold text-white mt-0.5">{selectedMeta.num_features}</p>
                </div>
                {selectedMeta.type === 'graph' && (
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500">Edges</span>
                    <p className="text-base font-bold text-cyan-400 mt-0.5">
                      {selectedMeta.num_edges?.toLocaleString()}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500">Classes</span>
                  <p className="text-base font-bold text-violet-400 mt-0.5">{selectedMeta.num_classes}</p>
                </div>
              </div>
            </div>

            {/* Graph Specific Topological Insights */}
            {selectedMeta.type === 'graph' && datasetDetails?.graph_statistics && (
              <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Average Node Degree:</span>
                  <span className="ml-2 font-bold text-white">{datasetDetails.graph_statistics.avg_degree}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Maximum Degree:</span>
                  <span className="ml-2 font-bold text-white">{datasetDetails.graph_statistics.max_degree}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Graph Homophily:</span>
                  <span className="ml-2 font-bold text-cyan-300">
                    {(datasetDetails.graph_statistics.homophily * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Network Density:</span>
                  <span className="ml-2 font-bold text-slate-300">{datasetDetails.graph_statistics.density}</span>
                </div>
              </div>
            )}
          </div>

          {/* Class Distribution & Feature Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Class Distribution Chart */}
            <div className="glass-panel rounded-xl p-5 space-y-4">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                Class Distribution & Frequency
              </h4>
              <p className="text-xs text-slate-400">Class prevalence across the dataset</p>

              {datasetDetails?.class_distribution && (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={datasetDetails.class_distribution}
                      margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="class_name"
                        stroke="#94a3b8"
                        tick={{ fontSize: 10 }}
                        angle={-20}
                        textAnchor="end"
                      />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                        formatter={(val: any, name: any, item: any) => [
                          `${val} samples (${item.payload.percentage}%)`,
                          'Count',
                        ]}
                      />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Methodology & Track Explanation Card */}
            <div className="glass-panel rounded-xl p-5 space-y-4">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Scientific Fairness Protocol ({selectedMeta.track})
              </h4>
              <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
                {selectedMeta.track === 'Track A' ? (
                  <>
                    <p>
                      <strong>Topology-Aware vs. Feature-Only:</strong> Graph Neural Networks (GCN, GraphSAGE, GAT)
                      exploit both the adjacency connectivity and high-dimensional node features.
                    </p>
                    <p>
                      <strong>Strict Baseline Fairness:</strong> Traditional ML algorithms (Random Forest, SVM,
                      Gradient Boosting) are evaluated strictly on the exact same labeled nodes and feature vectors
                      without edge connectivity access, testing whether structural topology provides a measurable
                      advantage.
                    </p>
                    <p>
                      <strong>Zero Leakage:</strong> Normalization parameters and feature transformers are fitted
                      strictly on training nodes. Validation sets govern early stopping and model selection.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      <strong>Tabular Similarity Graph:</strong> To enable GNN evaluation on tabular datasets, a sample
                      similarity graph is constructed using k-Nearest Neighbors (cosine distance on standardized features).
                    </p>
                    <p>
                      <strong>Leakage Warning & Documentation:</strong> Graph construction alters problem representation
                      by introducing topological relational bias. Preprocessing is strictly fitted on training splits,
                      and validation/test nodes are evaluated with explicit scientific documentation.
                    </p>
                    <p>
                      <strong>Baseline Benchmark:</strong> Traditional ML algorithms operate directly on raw continuous
                      tabular features as the gold standard baseline.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Dataset Preview Table */}
          {datasetDetails?.preview && datasetDetails.preview.length > 0 && (
            <div className="glass-panel rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                    Dataset Preview (First 15 Rows)
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Sample observations and numerical feature values</p>
                </div>
                <Badge variant="slate">{datasetDetails.preview.length} rows previewed</Badge>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      {Object.keys(datasetDetails.preview[0]).map((col) => (
                        <th key={col} className="px-3 py-2.5 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {datasetDetails.preview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        {Object.values(row).map((val: any, cidx) => (
                          <td key={cidx} className="px-3 py-2 whitespace-nowrap font-mono text-[11px]">
                            {typeof val === 'number' ? val.toFixed(4) : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Upload Custom Dataset Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel rounded-2xl p-6 max-w-lg w-full space-y-4 border border-cyan-500/30">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" />
                Upload Custom Tabular CSV Dataset
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Upload a tabular CSV file. The last column will default to the target class label unless specified below.
              Categorical labels will be automatically mapped to integer targets.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Dataset Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Customer Churn Benchmark"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Column Name (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave empty to use the last column"
                  value={targetColumn}
                  onChange={(e) => setTargetColumn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Brief description of the domain and features..."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Choose CSV File *</label>
                <input
                  type="file"
                  required
                  accept=".csv"
                  onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30"
                />
              </div>

              {uploadError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold disabled:opacity-50"
                >
                  {uploading ? 'Validating & Uploading...' : 'Upload Dataset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
