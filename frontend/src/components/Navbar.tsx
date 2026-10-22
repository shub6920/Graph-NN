import React from 'react';
import {
  LayoutDashboard,
  Database,
  Share2,
  GitCompare,
  FlaskConical,
  LineChart,
  FileText,
  Activity,
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'datasets'
  | 'graph'
  | 'comparison'
  | 'lab'
  | 'analytics'
  | 'report';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  backendHealthy: boolean;
  activeExperimentCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  backendHealthy,
  activeExperimentCount,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'datasets', label: 'Dataset Explorer', icon: Database },
    { id: 'graph', label: 'Graph Visualization', icon: Share2 },
    { id: 'comparison', label: 'Model Comparison', icon: GitCompare },
    { id: 'lab', label: 'Experiment Lab', icon: FlaskConical },
    { id: 'analytics', label: 'Performance Analytics', icon: LineChart },
    { id: 'report', label: 'Research Report', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-cyan-500/10 bg-slate-950/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Project Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wide text-base">GNN vs. ML</span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Research Lab
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Comparative Empirical Benchmark</p>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id as NavTab)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Backend Status indicator & Active tasks badge */}
          <div className="flex items-center gap-3">
            {activeExperimentCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs animate-pulse">
                <Activity className="w-3.5 h-3.5" />
                <span>Running ({activeExperimentCount})</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendHealthy ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500'
                }`}
              />
              <span className="text-slate-400 text-[11px]">
                {backendHealthy ? 'API Active' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile / Tablet Horizontal Scroll Menu */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-800/60 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as NavTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
