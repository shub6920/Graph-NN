import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Copy,
  Check,
  BookOpen,
  Info,
  Trophy,
  ExternalLink,
  Code,
} from 'lucide-react';
import { Badge } from '../components/Badge';
import { Experiment, ResearchReport as ResearchReportType } from '../types';
import { fetchExperimentReport } from '../services/api';

interface ResearchReportProps {
  experiments: Experiment[];
  selectedExperimentId?: string;
  onSelectExperiment: (id: string) => void;
  onNavigateToLab: () => void;
}

export const ResearchReport: React.FC<ResearchReportProps> = ({
  experiments,
  selectedExperimentId,
  onSelectExperiment,
  onNavigateToLab,
}) => {
  const completedExperiments = experiments.filter((e) => e.status === 'COMPLETED');
  const currentExpId = selectedExperimentId || completedExperiments[0]?.id;

  const [report, setReport] = useState<ResearchReportType | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'paper' | 'markdown'>('paper');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!currentExpId) return;
    setLoading(true);
    fetchExperimentReport(currentExpId)
      .then((data) => {
        setReport(data);
      })
      .catch((err) => {
        console.error('Failed to generate report:', err);
      })
      .finally(() => setLoading(false));
  }, [currentExpId]);

  const handleDownloadMarkdown = () => {
    if (!report) return;
    const blob = new Blob([report.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Research_Report_${report.dataset_id}_${report.experiment_id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = () => {
    if (!report) return;
    navigator.clipboard.writeText(report.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Automated Academic Research Report Generator
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Peer-review formatted research manuscript populated directly from empirical benchmark logs.
          </p>
        </div>

        {/* Experiment Selector & Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {completedExperiments.length > 0 && (
            <select
              value={currentExpId}
              onChange={(e) => onSelectExperiment(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-cyan-500"
            >
              {completedExperiments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.dataset_id})
                </option>
              ))}
            </select>
          )}

          {/* View toggle */}
          <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('paper')}
              className={`px-3 py-1.5 rounded font-medium transition-all ${
                viewMode === 'paper' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              Academic Manuscript
            </button>
            <button
              onClick={() => setViewMode('markdown')}
              className={`px-3 py-1.5 rounded font-medium transition-all ${
                viewMode === 'markdown' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              Raw Markdown
            </button>
          </div>

          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy MD'}</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .MD</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 text-xs font-medium transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel rounded-2xl p-16 text-center text-slate-400 text-sm animate-pulse">
          Synthesizing empirical findings and formatting scientific citations...
        </div>
      ) : !report ? (
        <div className="glass-panel rounded-2xl p-10 text-center space-y-4">
          <Info className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Completed Experiments</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Please run an experiment in the Experiment Lab to generate an authentic empirical research paper.
          </p>
          <button
            onClick={onNavigateToLab}
            className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
          >
            Go to Experiment Lab
          </button>
        </div>
      ) : viewMode === 'markdown' ? (
        /* Raw Markdown View */
        <div className="glass-panel rounded-2xl p-6 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-800">
          {report.markdown}
        </div>
      ) : (
        /* Academic Paper Preview */
        <article className="glass-panel rounded-2xl p-8 sm:p-12 max-w-5xl mx-auto space-y-8 bg-slate-900/90 text-slate-200 border border-slate-800 shadow-2xl">
          {/* Paper Header */}
          <header className="text-center space-y-3 pb-6 border-b border-slate-800">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Badge variant="cyan">Empirical Research Paper</Badge>
              <Badge variant="violet">{report.track}</Badge>
              <Badge variant="emerald">Seed: {report.models_data[0]?.hyperparameters?.random_seed || 42}</Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
              {report.sections.title}
            </h1>

            <div className="text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">Department of Computer Science & Artificial Intelligence</p>
              <p>Comparative Graph Representation Learning Benchmark Laboratory</p>
              <p className="font-mono text-[11px] text-cyan-400">Experiment ID: {report.experiment_id}</p>
            </div>
          </header>

          {/* Abstract */}
          <section className="bg-slate-950/70 p-5 rounded-xl border border-cyan-500/20 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Abstract</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed text-justify">
              {report.sections.abstract}
            </p>
          </section>

          {/* Section 1: Introduction */}
          <section className="space-y-2.5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">1.</span> Introduction
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed text-justify">
              {report.sections.introduction}
            </p>
          </section>

          {/* Section 2: Research Objectives */}
          <section className="space-y-2.5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">2.</span> Research Objectives & Hypotheses
            </h2>
            <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line pl-2 border-l-2 border-cyan-500/30">
              {report.sections.research_objectives}
            </div>
          </section>

          {/* Section 3: Related Work */}
          <section className="space-y-2.5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">3.</span> Related Work & Theoretical Foundations
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed text-justify">
              {report.sections.related_work}
            </p>
          </section>

          {/* Section 4: Methodology & Experimental Setup */}
          <section className="space-y-2.5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">4.</span> Experimental Methodology & Fairness Protocol
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed text-justify">
              {report.sections.methodology}
            </p>
          </section>

          {/* Section 5: Experimental Results Table */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">5.</span> Quantitative Results & Performance Matrix
            </h2>
            <p className="text-xs text-slate-400">
              Table 1: Test set classification metrics and resource allocation across evaluated models.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-3.5 py-2.5">Algorithm</th>
                    <th className="px-3 py-2.5">Family</th>
                    <th className="px-3 py-2.5 text-right">Accuracy</th>
                    <th className="px-3 py-2.5 text-right">Macro F1</th>
                    <th className="px-3 py-2.5 text-right">Weighted F1</th>
                    <th className="px-3 py-2.5 text-right">Train Time (s)</th>
                    <th className="px-3 py-2.5 text-right">Latency (ms)</th>
                    <th className="px-3 py-2.5 text-right">Peak RAM (MB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/50 font-mono text-[11px]">
                  {report.models_data.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="px-3.5 py-2 font-sans font-bold text-white">{m.model_name}</td>
                      <td className="px-3 py-2 font-sans text-slate-400 text-[10px]">{m.algorithm_family}</td>
                      <td className="px-3 py-2 text-right font-bold text-white">
                        {(m.metrics.accuracy * 100).toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-cyan-300">
                        {(m.metrics.f1_macro * 100).toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 text-right text-slate-300">
                        {(m.metrics.f1_weighted * 100).toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 text-right text-amber-300">
                        {m.metrics.training_time_sec.toFixed(3)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-300">
                        {m.metrics.latency_ms_per_sample.toFixed(3)}
                      </td>
                      <td className="px-3 py-2 text-right text-rose-300">
                        {m.metrics.peak_memory_mb.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 6: Discussion */}
          <section className="space-y-2.5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">6.</span> Discussion & Comparative Analysis
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed text-justify">
              {report.sections.discussion}
            </p>
          </section>

          {/* Section 7: Limitations */}
          <section className="space-y-2.5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">7.</span> Threats to Validity & Limitations
            </h2>
            <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line pl-2 border-l-2 border-amber-500/30">
              {report.sections.limitations}
            </div>
          </section>

          {/* Section 8: Conclusion */}
          <section className="space-y-2.5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">8.</span> Conclusion
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed text-justify">
              {report.sections.conclusion}
            </p>
          </section>

          {/* Section 9: References */}
          <section className="space-y-3 pt-4 border-t border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">9.</span> References
            </h2>
            <div className="space-y-2 text-xs text-slate-400">
              {report.sections.references.map((ref, idx) => (
                <p key={idx} className="pl-6 -indent-6 leading-relaxed">
                  <span className="font-bold text-cyan-300">[{ref.id}]</span> {ref.citation}
                </p>
              ))}
            </div>
          </section>
        </article>
      )}
    </div>
  );
};
