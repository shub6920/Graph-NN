import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Info,
  Sliders,
} from 'lucide-react';
import { Badge } from '../components/Badge';
import { SubgraphData, SubgraphNode, SubgraphLink, Dataset } from '../types';
import { fetchDatasetSubgraph } from '../services/api';

const CLASS_COLORS = [
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#14b8a6', // Teal
];

interface GraphVisualizationProps {
  datasets: Dataset[];
  selectedDatasetId: string;
  onSelectDataset: (id: string) => void;
}

export const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  datasets,
  selectedDatasetId,
  onSelectDataset,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [subgraph, setSubgraph] = useState<SubgraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<SubgraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<number | 'ALL'>('ALL');
  const [maxNodes, setMaxNodes] = useState<number>(80);
  const [colorMode, setColorMode] = useState<'class' | 'degree'>('class');

  // Load subgraph when dataset or maxNodes changes
  useEffect(() => {
    if (!selectedDatasetId) return;
    setLoading(true);
    fetchDatasetSubgraph(selectedDatasetId, maxNodes)
      .then((data) => {
        setSubgraph(data);
        if (data.nodes.length > 0) {
          setSelectedNode(data.nodes[0]);
        }
      })
      .catch((err) => {
        console.error('Failed to load subgraph:', err);
      })
      .finally(() => setLoading(false));
  }, [selectedDatasetId, maxNodes]);

  // Render D3 Force Directed Graph
  useEffect(() => {
    if (!subgraph || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 800;
    const height = 540;

    // Filter nodes if class filter is active
    let displayNodes = [...subgraph.nodes];
    if (selectedClassFilter !== 'ALL') {
      displayNodes = displayNodes.filter((n) => n.label === selectedClassFilter);
    }
    const nodeIds = new Set(displayNodes.map((n) => n.id));
    const displayLinks = subgraph.links.filter((l: any) => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return nodeIds.has(s) && nodeIds.has(t);
    });

    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Force simulation
    const simulation = d3.forceSimulation(displayNodes as any)
      .force(
        'link',
        d3.forceLink(displayLinks as any)
          .id((d: any) => d.id)
          .distance(55)
      )
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(18));

    // Render edges
    const link = g
      .append('g')
      .attr('stroke', '#334155')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(displayLinks)
      .join('line')
      .attr('stroke-width', 1.5);

    // Degree color scale
    const maxDeg = d3.max(displayNodes, (d) => d.degree) || 10;
    const degreeColor = d3.scaleSequential(d3.interpolateCool).domain([1, maxDeg]);

    // Render nodes
    const node = g
      .append('g')
      .selectAll('g')
      .data(displayNodes)
      .join('g')
      .call(
        d3.drag<any, any>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node circles
    node
      .append('circle')
      .attr('r', (d) => 6 + Math.min(d.degree * 1.2, 10))
      .attr('fill', (d) => {
        if (colorMode === 'degree') return degreeColor(d.degree);
        return CLASS_COLORS[d.label % CLASS_COLORS.length];
      })
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .on('click', (_, d) => {
        setSelectedNode(d);
        highlightNeighbors(d);
      })
      .on('mouseover', function (_, d) {
        d3.select(this).transition().duration(150).attr('stroke', '#ffffff').attr('stroke-width', 3);
      })
      .on('mouseout', function () {
        d3.select(this).transition().duration(150).attr('stroke', '#0f172a').attr('stroke-width', 2);
      });

    // Node text labels
    node
      .append('text')
      .text((d) => `#${d.original_id}`)
      .attr('x', 9)
      .attr('y', 3)
      .attr('font-size', '9px')
      .attr('fill', '#94a3b8')
      .attr('pointer-events', 'none');

    // Neighbor highlighting logic
    function highlightNeighbors(targetNode: SubgraphNode) {
      const neighborIds = new Set<number>();
      neighborIds.add(targetNode.id);

      displayLinks.forEach((l: any) => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        if (s === targetNode.id) neighborIds.add(t);
        if (t === targetNode.id) neighborIds.add(s);
      });

      node.style('opacity', (d: any) => (neighborIds.has(d.id) ? 1 : 0.2));
      link
        .attr('stroke', (l: any) => {
          const s = typeof l.source === 'object' ? l.source.id : l.source;
          const t = typeof l.target === 'object' ? l.target.id : l.target;
          return s === targetNode.id || t === targetNode.id ? '#06b6d4' : '#334155';
        })
        .attr('stroke-width', (l: any) => {
          const s = typeof l.source === 'object' ? l.source.id : l.source;
          const t = typeof l.target === 'object' ? l.target.id : l.target;
          return s === targetNode.id || t === targetNode.id ? 2.5 : 1;
        });
    }

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [subgraph, selectedClassFilter, colorMode]);

  const handleResetZoom = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(500).call(d3.zoom<SVGSVGElement, unknown>().transform as any, d3.zoomIdentity);
  };

  const selectedMeta = datasets.find((d) => d.id === selectedDatasetId);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-cyan-400" />
            Interactive Graph Topology Visualizer
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            D3.js force-directed graph rendering with node inspection, neighbor highlighting, and degree scaling.
          </p>
        </div>

        {/* Dataset selection pills */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {datasets.map((d) => (
            <button
              key={d.id}
              onClick={() => onSelectDataset(d.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedDatasetId === d.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {d.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Main visualization & inspection grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Graph Canvas Panel (3 cols) */}
        <div className="lg:col-span-3 glass-panel rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between min-h-[560px]">
          {/* Controls Bar Overlay */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 z-10">
            {/* Color mode toggles */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Color by:</span>
              <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                <button
                  onClick={() => setColorMode('class')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    colorMode === 'class' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  Class Label
                </button>
                <button
                  onClick={() => setColorMode('degree')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    colorMode === 'degree' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  Degree Centrality
                </button>
              </div>
            </div>

            {/* Subgraph size slider */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Sample Size:</span>
              <input
                type="range"
                min="30"
                max="150"
                step="10"
                value={maxNodes}
                onChange={(e) => setMaxNodes(Number(e.target.value))}
                className="w-24 accent-cyan-500 cursor-pointer"
              />
              <span className="text-xs text-cyan-300 font-mono">{maxNodes}</span>
            </div>

            {/* Zoom / Reset Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleResetZoom}
                title="Reset View"
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Canvas SVG Container */}
          <div className="relative w-full flex-1 flex items-center justify-center">
            {loading ? (
              <div className="text-center text-slate-400 text-sm animate-pulse">
                Simulating graph physics and force equilibrium...
              </div>
            ) : (
              <svg ref={svgRef} className="w-full h-[500px] cursor-grab active:cursor-grabbing" />
            )}
          </div>

          {/* Bottom Bar: Quick Summary */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <span>
              Showing {subgraph?.displayed_nodes || 0} nodes and {subgraph?.displayed_edges || 0} edges
              (Total Graph: {subgraph?.total_graph_nodes?.toLocaleString()} nodes)
            </span>
            <span className="text-slate-500">Drag nodes to explore forces • Click node to highlight neighbors</span>
          </div>
        </div>

        {/* Node Inspector & Legend Panel (1 col) */}
        <div className="space-y-4">
          {/* Selected Node Details */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              Node Inspector
            </h3>

            {selectedNode ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Node Identifier:</span>
                    <span className="font-mono font-bold text-white text-sm">#{selectedNode.original_id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Class Label:</span>
                    <span
                      className="font-bold px-2 py-0.5 rounded text-[11px]"
                      style={{
                        backgroundColor: `${CLASS_COLORS[selectedNode.label % CLASS_COLORS.length]}20`,
                        color: CLASS_COLORS[selectedNode.label % CLASS_COLORS.length],
                      }}
                    >
                      {selectedNode.class_name} ({selectedNode.label})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Node Degree:</span>
                    <span className="font-mono font-bold text-cyan-300">{selectedNode.degree} links</span>
                  </div>
                </div>

                <div className="text-slate-400 leading-relaxed text-[11px]">
                  {selectedMeta?.type === 'graph' ? (
                    <p>
                      In citation networks, nodes represent academic papers and edges represent citations. High-degree
                      nodes act as influential citation hubs.
                    </p>
                  ) : (
                    <p>
                      Constructed k-NN sample similarity graph. Edges connect samples with close cosine proximity in the
                      standardized feature manifold.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Click on any node in the canvas to inspect attributes.</p>
            )}
          </div>

          {/* Class Color Legend */}
          <div className="glass-panel rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-violet-400" />
              Class Legend & Filter
            </h4>

            <div className="space-y-1.5">
              <button
                onClick={() => setSelectedClassFilter('ALL')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                  selectedClassFilter === 'ALL'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:bg-slate-900'
                }`}
              >
                <span>All Classes</span>
                <span className="text-slate-500 text-[10px]">Show All</span>
              </button>

              {selectedMeta?.classes?.map((cname, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedClassFilter(idx)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                    selectedClassFilter === idx
                      ? 'bg-slate-800 text-white font-semibold ring-1 ring-cyan-500/50'
                      : 'text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: CLASS_COLORS[idx % CLASS_COLORS.length] }}
                    />
                    <span className="truncate max-w-[140px] text-left">{cname}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Class {idx}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
