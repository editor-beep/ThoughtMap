import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  Controls,
  MiniMap,
  NodeChange,
  Connection,
  Panel,
  useReactFlow,
  useViewport,
  Node,
  Edge,
  NodeMouseHandler,
  Viewport
} from 'reactflow';
import { useThoughtStore, MASTER_MAP_ID } from '../store';
import { EdgeType } from '../types';
import { Compass, Maximize2, Minimize2 } from 'lucide-react';
import CustomThoughtNode from './CustomThoughtNode';
import ClusterMarkerNode from './ClusterMarkerNode';
import SemanticFieldNode from './SemanticFieldNode';
import MapHeader from './MapHeader';
import MasterMapView from './MasterMapView';
import NodeDetailPanel from './NodeDetailPanel';
import TerrainBackground from './TerrainBackground';
import CartographerPanel from './CartographerPanel';
import DebugZoom from './DebugZoom';
import { DEBUG, IS_DEV } from '../config/debug';
import MapDensityIndicator from './MapDensityIndicator';
import { useClusters } from '../hooks/useClusters';
import { getNodeVisualMode, isFinitePosition } from '../lib/nodeVisualMode';
import { NodeVisualMode } from '../types/nodeVisualMode';
import { normalizePointerEvent } from '../lib/input/normalizePointerEvent';

const nodeTypes = {
  thoughtMapNode: CustomThoughtNode,
  clusterMarker: ClusterMarkerNode,
  semanticFieldNode: SemanticFieldNode,
};

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

/** Syncs ReactFlow viewport zoom to the parent via a stable callback ref. */
function ViewportTracker({ onViewport }: { onViewport: (v: Viewport) => void }) {
  const vp = useViewport();
  const cbRef = useRef(onViewport);
  cbRef.current = onViewport;

  useEffect(() => {
    cbRef.current(vp);
  // Only re-run when the actual viewport values change, not the callback reference.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp.zoom, vp.x, vp.y]);

  return null;
}


const FALLBACK_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };
const FALLBACK_POSITION = { x: 0, y: 0 };

function isValidViewport(vp: Viewport): boolean {
  return Number.isFinite(vp.x) && Number.isFinite(vp.y) && Number.isFinite(vp.zoom) && vp.zoom > 0;
}

function clampZoom(zoom: number, minZoom: number, maxZoom: number): number {
  if (!Number.isFinite(zoom)) return minZoom;
  return Math.max(minZoom, Math.min(maxZoom, zoom));
}

function toSafePosition(nodeId: string, x: number, y: number) {
  if (isFinitePosition(x, y)) return { x, y };
  console.error('[INVALID NODE POSITION]', nodeId, { x, y, fallback: FALLBACK_POSITION });
  return FALLBACK_POSITION;
}


function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidXYPosition(pos: unknown): pos is { x: number; y: number } {
  return (
    !!pos &&
    typeof pos === 'object' &&
    isFiniteNumber((pos as { x?: unknown }).x) &&
    isFiniteNumber((pos as { y?: unknown }).y)
  );
}

interface SpatialCanvasProps {
  immersive: boolean;
  onImmersiveToggle: () => void;
}

export default function SpatialCanvas({ immersive, onImmersiveToggle }: SpatialCanvasProps) {
  const { nodes, edges, realms, maps, currentMapId, switchMap, renameMap, updateNodePosition, addEdge, deleteNode, deleteEdge, openCartographerPanel, openSubMap, exitToParent, focusNode } = useThoughtStore();
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [rfViewport, setRfViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [cardScale, setCardScale] = useState<'compact' | 'standard' | 'large'>('standard');
  const [dotScale, setDotScale] = useState<'tiny' | 'standard' | 'large'>('standard');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const lastTouchPointerAtRef = useRef(0);
  const MIN_ZOOM = 0.05;
  const MAX_ZOOM = 2.5;

  const handleViewport = useCallback((vp: Viewport) => {
    if (!isValidViewport(vp)) {
      console.error('[INVALID VIEWPORT]', vp);
      setRfViewport(FALLBACK_VIEWPORT);
      return;
    }
    setRfViewport(vp);
  }, []);

  const activeRealmIds = useMemo(
    () => new Set(realms.filter((r) => r.isActive).map((r) => r.id)),
    [realms]
  );

  const currentMap = maps[currentMapId] ?? null;
  const isDetail = currentMap?.level === 'detail';

  const breadcrumbs = useMemo(() => {
    if (!currentMap) return [];
    const chain: typeof currentMap[] = [];
    let cursor: typeof currentMap | null = currentMap;
    while (cursor) {
      chain.unshift(cursor);
      cursor = cursor.parentMapId ? (maps[cursor.parentMapId] ?? null) : null;
    }
    return chain.map((m, idx) => {
      const isLast = idx === chain.length - 1;
      return { label: m.title, onClick: isLast ? undefined : () => switchMap(m.id) };
    });
  }, [currentMap, maps, switchMap]);

  const visibleNodes = useMemo(
    () => nodes.filter((n) => n.realms.length === 0 || n.realms.some((r) => activeRealmIds.has(r))),
    [nodes, activeRealmIds]
  );

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  useEffect(() => {
    if (!IS_DEV) return;
    console.log('[GRAPH NODE COUNT]', nodes.length);
    console.log('[VISIBLE NODE IDS]', visibleNodes.map((n) => n.id));
    console.log('[VISIBLE COUNT]', visibleNodes.length);
    console.log('[CAMERA]', { viewport: rfViewport });
  }, [nodes.length, visibleNodes, rfViewport]);

  useEffect(() => {
    if (nodes.length > 0 && visibleNodes.length === 0) {
      console.error('[VISIBLE NODE COLLAPSE]', {
        total: nodes.length,
        zoom: rfViewport.zoom,
      });
    }
  }, [nodes.length, visibleNodes.length, rfViewport.zoom]);

  const { clusters, isolatedNodes, isClusterMode } = useClusters(visibleNodes, rfViewport.zoom);
  const shouldUseClusterMode = isClusterMode && !isDraggingNode;
  const nodeVisualMode = getNodeVisualMode(rfViewport.zoom);
  const edgePairs = useMemo(() => edges.map((e) => [e.source, e.target] as const), [edges]);
  const activeFocusId = selectedNodeId ?? hoveredNodeId;
  const neighborhoodNodeIds = useMemo(() => {
    if (!activeFocusId) return new Set<string>();
    const result = new Set<string>([activeFocusId]);
    edgePairs.forEach(([s, t]) => {
      if (s === activeFocusId) result.add(t);
      if (t === activeFocusId) result.add(s);
    });
    return result;
  }, [activeFocusId, edgePairs]);

  const flowNodes = useMemo(() => {
    if (shouldUseClusterMode) {
      const clusterNodes = clusters.map((c, i) => ({
        id: `cluster-${i}`,
        type: 'clusterMarker',
        position: { x: c.x, y: c.y },
        data: { cluster: c },
        draggable: false,
        selectable: false,
      }));

      // Isolated single nodes fall back to their regular dot rendering.
      const singleNodes = isolatedNodes.map((node) => {
        const safePosition = toSafePosition(node.id, node.x, node.y);
        return {
        id: node.id,
        type: node.isSemanticField ? 'semanticFieldNode' : 'thoughtMapNode',
        position: safePosition,
        data: {
          node,
          onOpen: openSubMap,
          isFocused: selectedNodeId === node.id,
          emphasis: neighborhoodNodeIds.has(node.id) ? (activeFocusId === node.id ? 'focused' : 'neighborhood') : (activeFocusId ? 'background' : 'default'),
          cardScale,
          dotScale,
          semanticCompression: Math.max(0, Math.min(1, (rfViewport.zoom - 0.28) / 0.5)),
          onRequestExpand: setSelectedNodeId,
        },
      };
      });

      return [...clusterNodes, ...singleNodes];
    }

    return visibleNodes.map((node) => {
      const safePosition = toSafePosition(node.id, node.x, node.y);
      return {
      id: node.id,
      type: node.isSemanticField ? 'semanticFieldNode' : 'thoughtMapNode',
      position: safePosition,
      data: {
        node,
        onOpen: openSubMap,
        isFocused: selectedNodeId === node.id,
        emphasis: neighborhoodNodeIds.has(node.id) ? (activeFocusId === node.id ? 'focused' : 'neighborhood') : (activeFocusId ? 'background' : 'default'),
        cardScale,
        dotScale,
        semanticCompression: Math.max(0, Math.min(1, (rfViewport.zoom - 0.28) / 0.5)),
        onRequestExpand: setSelectedNodeId,
      }
    };
    });
  }, [shouldUseClusterMode, clusters, isolatedNodes, visibleNodes, openSubMap, selectedNodeId, neighborhoodNodeIds, activeFocusId, cardScale, dotScale, rfViewport.zoom]);

  useEffect(() => {
    console.log('[SELECTED NODE]', selectedNodeId);
  }, [selectedNodeId]);



  const flowEdges = useMemo(
    () =>
      shouldUseClusterMode
        ? []
        : edges
            .filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
            .map((edge) => {
              const isFocusedEdge = activeFocusId && (edge.source === activeFocusId || edge.target === activeFocusId);
              const isNeighborEdge = activeFocusId && (neighborhoodNodeIds.has(edge.source) || neighborhoodNodeIds.has(edge.target));
              return {
              id: edge.id,
              source: edge.source,
              target: edge.target,
              animated: Boolean(isFocusedEdge),
              label: EDGE_LABELS[edge.type],
              labelStyle: { fill: isFocusedEdge ? '#bae6fd' : '#475569', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' },
              labelBgStyle: { fill: '#030712', fillOpacity: 0.85 },
              style: {
                stroke: EDGE_COLORS[edge.type],
                strokeWidth: isFocusedEdge ? 2.8 : isNeighborEdge ? 2.1 : 1.2,
                opacity: activeFocusId ? (isNeighborEdge ? 0.9 : 0.2) : 0.75,
              }
            };}),
    [shouldUseClusterMode, edges, visibleNodeIds, activeFocusId, neighborhoodNodeIds]
  );

  const validateFlowNodePosition = useCallback((rfNode: Node) => {
    const px = rfNode.position?.x;
    const py = rfNode.position?.y;
    console.assert(Number.isFinite(px), '[CARD POSITION INVALID X]', rfNode.id, px);
    console.assert(Number.isFinite(py), '[CARD POSITION INVALID Y]', rfNode.id, py);
  }, []);


  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((change) => {
        if (change.type !== 'position' || !change.id) return;

        // While the user is actively dragging, let React Flow own the node
        // position. Writing the store back into the `nodes` prop on every
        // drag tick creates a coordinate-feedback loop where React Flow
        // applies its pointer delta on top of an already-moved position,
        // producing wild jumps. We commit the final position once in
        // onNodeDragStop.
        if (change.dragging) return;

        const nextPosition = change.position;
        if (!isValidXYPosition(nextPosition)) {
          console.error('[INVALID DRAG POSITION — SKIPPING UPDATE]', {
            nodeId: change.id,
            nextPosition,
          });
          return;
        }

        const nextX = nextPosition.x;
        const nextY = nextPosition.y;
        if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) {
          console.error('[INVALID POINTER POSITION]', nextX, nextY);
          return;
        }
        updateNodePosition(change.id, nextX, nextY);
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

  const handlePointerDiagnostics = useCallback((event: React.PointerEvent) => {
    const normalized = normalizePointerEvent(event);
    if (normalized.pointerType === 'touch') {
      lastTouchPointerAtRef.current = Date.now();
    }
    if (IS_DEV && DEBUG.pointerEvents) {
      console.log('[POINTER EVENT]', {
        type: event.type,
        pointerType: normalized.pointerType,
        clientX: normalized.clientX,
        clientY: normalized.clientY,
      });
    }
  }, []);

  const handleWheelDiagnostics = useCallback((event: React.WheelEvent) => {
    if (IS_DEV && DEBUG.pointerEvents) {
      console.log('[WHEEL EVENT]', {
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        ctrlKey: event.ctrlKey,
      });
    }
    const viewportZoom = clampZoom(rfViewport.zoom, MIN_ZOOM, MAX_ZOOM);
    if (!Number.isFinite(viewportZoom)) {
      event.preventDefault();
    }
  }, [rfViewport.zoom]);

  const handleEdgeTypeSelect = (type: EdgeType) => {
    if (!pendingConnection) return;
    addEdge(pendingConnection.source, pendingConnection.target, type);
    setPendingConnection(null);
  };

  const onNodeClick: NodeMouseHandler = useCallback((_event, rfNode) => {
    // Cluster marker clicks are handled internally by the component.
    if (rfNode.id.startsWith('cluster-')) return;
    const selected = nodes.find((n) => n.id === rfNode.id);
    if (selected?.isSemanticField && selected.subMapId) {
      openSubMap(selected.id);
      return;
    }
    focusNode(rfNode.id);
    setSelectedNodeId(rfNode.id);
  }, [nodes, openSubMap, focusNode]);

  const onNodeDragStart: NodeMouseHandler = useCallback(() => {
    setIsDraggingNode(true);
  }, []);

  const onNodeDragStop: NodeMouseHandler = useCallback((_event, rfNode) => {
    setIsDraggingNode(false);
    validateFlowNodePosition(rfNode);

    // Commit the final drag position to the store exactly once. React Flow
    // owned the position internally during the drag (see onNodesChange); now
    // that the gesture is over we persist where the node was released.
    const finalX = rfNode.position?.x;
    const finalY = rfNode.position?.y;
    if (Number.isFinite(finalX) && Number.isFinite(finalY)) {
      updateNodePosition(rfNode.id, finalX, finalY);
    } else {
      console.error('[INVALID DRAG POSITION — SKIPPING UPDATE]', {
        nodeId: rfNode.id,
        nextPosition: rfNode.position,
      });
    }
  }, [validateFlowNodePosition, updateNodePosition]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const isCmdCtrl = event.metaKey || event.ctrlKey;
      if (event.key === 'Escape' || (isCmdCtrl && event.key === 'ArrowUp')) {
        event.preventDefault();
        exitToParent();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exitToParent]);

  useEffect(() => {
    if (!IS_DEV) return;
    const onDebugHotkey = (event: KeyboardEvent) => {
      if (event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        DEBUG.overlays = !DEBUG.overlays;
      }
    };
    window.addEventListener('keydown', onDebugHotkey);
    return () => window.removeEventListener('keydown', onDebugHotkey);
  }, []);

  if (currentMapId === MASTER_MAP_ID) {
    return (
      <div className="w-full h-full relative isolate">
        {currentMap && (
          <MapHeader
            crumbs={breadcrumbs}
            title={currentMap.title}
            onExit={exitToParent}
            isDetail={false}
            onRename={(title) => renameMap(currentMapId, title)}
          />
        )}
        <MasterMapView />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative isolate">
      <TerrainBackground viewport={rfViewport} />
      {currentMap && (
        <MapHeader
          crumbs={breadcrumbs}
          title={currentMap.title}
          onExit={exitToParent}
          isDetail={isDetail}
          onRename={(title) => renameMap(currentMapId, title)}
        />
      )}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 select-none">
          <p className="font-mono text-xs tracking-widest text-slate-500 uppercase animate-pulse">Begin thinking.</p>
          <p className="font-mono text-[10px] text-slate-600 mt-1">Every message can become a node.</p>
        </div>
      )}

      {/* Immersive toggle — z-20 so NodeDetailPanel (z-30) covers it when open */}
      <button
        onClick={onImmersiveToggle}
        title={immersive ? 'Exit immersive mode' : 'Enter immersive mode'}
        className="hidden md:flex absolute top-3 right-3 z-20 w-7 h-7 items-center justify-center rounded text-slate-600 hover:text-slate-300 hover:bg-void-800/60 transition-colors"
      >
        {immersive ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
      </button>

      {/* Floating Cartographer Button */}
      <button
        onClick={openCartographerPanel}
        className="absolute bottom-20 right-4 z-30 p-3 rounded-full bg-void-800/90 border border-void-700 text-cosmic-cyan hover:bg-void-700 hover:border-cosmic-cyan/50 transition-all group shadow-lg"
        title="Call the Cartographer"
      >
        <Compass size={18} className="group-hover:rotate-45 transition-transform duration-300" />
      </button>

      {/* Cartographer Panel Modal */}
      <CartographerPanel />

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onNodeMouseEnter={(_, node) => !node.id.startsWith('cluster-') && setHoveredNodeId(node.id)}
        onNodeMouseLeave={() => setHoveredNodeId(null)}
        onPaneClick={() => setSelectedNodeId(null)}
        nodeTypes={nodeTypes}
        deleteKeyCode="Delete"
        proOptions={{ hideAttribution: true }}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        onPaneMouseMove={(event) => {
          if (Date.now() - lastTouchPointerAtRef.current < 40) return;
          handlePointerDiagnostics(event as unknown as React.PointerEvent);
        }}
        onPaneScroll={handleWheelDiagnostics}
      >
        <Controls className="!bg-void-800 !border-void-700 !text-slate-400 !fill-slate-400" />
        <MiniMap
          nodeColor={(n) => NODE_TYPE_COLORS[(nodes.find((x) => x.id === n.id)?.type ?? '')] ?? '#1e293b'}
          style={{ background: '#0b0f19', border: '1px solid #111827' }}
          maskColor="rgba(3,7,18,0.7)"
        />
        <CanvasController />
        <ViewportTracker onViewport={handleViewport} />
        {IS_DEV && DEBUG.overlays && (<Panel position="top-left"><DebugZoom /></Panel>)}
        <Panel position="bottom-left"><MapDensityIndicator totalNodes={nodes.length} renderedNodes={flowNodes.length} /></Panel>
        <Panel position="bottom-right">
          <div className="rounded-lg border border-void-700/80 bg-void-900/85 p-2 text-[10px] font-mono text-slate-300">
            <div className="mb-2 text-slate-500 uppercase tracking-wider">Graph Density</div>
            <div className="mb-1 text-slate-400">Card size ({nodeVisualMode === NodeVisualMode.FULL_CARD ? 'full' : nodeVisualMode === NodeVisualMode.COMPACT_CARD ? 'compact' : 'dot'})</div>
            <div className="mb-2 flex gap-1">
              {(['compact', 'standard', 'large'] as const).map((size) => (
                <button key={size} onClick={() => setCardScale(size)} className={`rounded px-2 py-1 ${cardScale === size ? 'bg-cosmic-cyan/20 text-cyan-200 border border-cosmic-cyan/40' : 'bg-void-800 text-slate-400 border border-void-700'}`}>{size}</button>
              ))}
            </div>
            <div className="mb-1 text-slate-400">Dot size</div>
            <div className="flex gap-1">
              {(['tiny', 'standard', 'large'] as const).map((size) => (
                <button key={size} onClick={() => setDotScale(size)} className={`rounded px-2 py-1 ${dotScale === size ? 'bg-cosmic-cyan/20 text-cyan-200 border border-cosmic-cyan/40' : 'bg-void-800 text-slate-400 border border-void-700'}`}>{size}</button>
              ))}
            </div>
          </div>
        </Panel>
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
