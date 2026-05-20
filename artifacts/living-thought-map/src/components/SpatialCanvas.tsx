import React, { useMemo, useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Controls,
  MiniMap,
  NodeChange,
  Connection,
  useReactFlow,
  Node,
  Edge,
  NodeMouseHandler
} from 'reactflow';
import { useThoughtStore } from '../store';
import { EdgeType } from '../types';
import CustomThoughtNode from './CustomThoughtNode';
import NodeDetailPanel from './NodeDetailPanel';
import TerrainBackground from './TerrainBackground';

const nodeTypes = { thoughtMapNode: CustomThoughtNode };

const EDGE_COLORS: Record<EdgeType, string> = {
  evolves_from: '#06b6d4',
  contradicts:  '#f43f5e',
  references:   '#3b82f6',
  remixes:      '#a855f7',
  supports:     '#10b981'
};

const EDGE_LABELS: Record<EdgeType, string> = {
  evolves_from: 'evolves from',
  contradicts:  'contradicts',
  references:   'references',
  remixes:      'remixes',
  supports:     'supports'
};

const NODE_TYPE_COLORS: Record<string, string> = {
  thought:      '#06b6d4',
  joke:         '#f59e0b',
  character:    '#a855f7',
  myth:         '#a855f7',
  research:     '#3b82f6',
  canon:        '#10b981',
  contradiction:'#f43f5e',
  artifact:     '#64748b',
  fragment:     '#475569'
};

type PendingConnection = { source: string; target: string };

function CanvasController() {
  const { setCenter } = useReactFlow();
  const { focusedNodeId, clearFocusedNode, nodes } = useThoughtStore();

  useEffect(() => {
    if (!focusedNodeId) return;
    const node = nodes.find((n) => n.id === focusedNodeId);
    if (node) setCenter(node.x + 100, node.y + 50, { zoom: 1.5, duration: 600 });
    clearFocusedNode();
  }, [focusedNodeId, nodes, setCenter, clearFocusedNode]);

  return null;
}

export default function SpatialCanvas() {
  const { nodes, edges, realms, updateNodePosition, addEdge, deleteNode, deleteEdge } = useThoughtStore();
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const activeRealmIds = useMemo(
    () => new Set(realms.filter((r) => r.isActive).map((r) => r.id)),
    [realms]
  );

  const visibleNodes = useMemo(
    () => nodes.filter((n) => n.realms.length === 0 || n.realms.some((r) => activeRealmIds.has(r))),
    [nodes, activeRealmIds]
  );

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const flowNodes = useMemo(
    () => visibleNodes.map((node) => ({
      id: node.id,
      type: 'thoughtMapNode',
      position: { x: node.x, y: node.y },
      data: { node }
    })),
    [visibleNodes]
  );

  const flowEdges = useMemo(
    () =>
      edges
        .filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
        .map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          animated: true,
          label: EDGE_LABELS[edge.type],
          labelStyle: { fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' },
          labelBgStyle: { fill: '#030712', fillOpacity: 0.85 },
          style: { stroke: EDGE_COLORS[edge.type], strokeWidth: 1.5, opacity: 0.75 }
        })),
    [edges, visibleNodeIds]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && change.id) {
          updateNodePosition(change.id, change.position.x, change.position.y);
        }
      });
    },
    [updateNodePosition]
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => deleted.forEach((n) => deleteNode(n.id)),
    [deleteNode]
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => deleted.forEach((e) => deleteEdge(e.id)),
    [deleteEdge]
  );

  const onConnect = useCallback((params: Connection) => {
    if (params.source && params.target) {
      setPendingConnection({ source: params.source, target: params.target });
    }
  }, []);

  const handleEdgeTypeSelect = (type: EdgeType) => {
    if (!pendingConnection) return;
    addEdge(pendingConnection.source, pendingConnection.target, type);
    setPendingConnection(null);
  };

  const onNodeClick: NodeMouseHandler = useCallback((_event, rfNode) => {
    setSelectedNodeId(rfNode.id);
  }, []);

  return (
    <div className="w-full h-full relative">
      <TerrainBackground />
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 select-none">
          <p className="font-mono text-xs tracking-widest text-slate-500 uppercase animate-pulse">Begin thinking.</p>
          <p className="font-mono text-[10px] text-slate-600 mt-1">Every message can become a node.</p>
        </div>
      )}

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        deleteKeyCode="Delete"
        proOptions={{ hideAttribution: true }}
        fitView
        fitViewOptions={{ padding: 0.25 }}
      >
        <Controls className="!bg-void-800 !border-void-700 !text-slate-400 !fill-slate-400" />
        <MiniMap
          nodeColor={(n) => NODE_TYPE_COLORS[(nodes.find((x) => x.id === n.id)?.type ?? '')] ?? '#1e293b'}
          style={{ background: '#0b0f19', border: '1px solid #111827' }}
          maskColor="rgba(3,7,18,0.7)"
        />
        <CanvasController />
      </ReactFlow>

      {/* Edge type chooser */}
      {pendingConnection && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-void-900/50 backdrop-blur-sm"
          onClick={() => setPendingConnection(null)}
        >
          <div
            className="bg-void-800 border border-void-700 rounded-lg p-4 w-60 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 mb-3">Define Connection</div>
            <div className="space-y-1">
              {(Object.entries(EDGE_LABELS) as [EdgeType, string][]).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => handleEdgeTypeSelect(type)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded font-mono text-xs hover:bg-void-700 transition-colors text-left"
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: EDGE_COLORS[type] }} />
                  <span className="text-slate-300">{label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setPendingConnection(null)}
              className="mt-3 w-full text-center font-mono text-[10px] text-slate-600 hover:text-slate-400 py-1 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <NodeDetailPanel nodeId={selectedNodeId} onClose={() => setSelectedNodeId(null)} />
    </div>
  );
}
