import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  Connection,
  Node,
  Edge,
  NodeMouseHandler,
  ReactFlowInstance
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
import BlackspaceBackground from './BlackspaceBackground';
import CartographerPanel from './CartographerPanel';
import DebugZoom from './DebugZoom';
import CanonicalMiniMap from './CanonicalMiniMap';
import { CanvasController, ViewportTracker, CanvasZoomControls, CanvasKeyboardControls } from './canvasControls';
import { DEBUG, IS_DEV } from '../config/debug';
import MapDensityIndicator from './MapDensityIndicator';
import { useClusters } from '../hooks/useClusters';
import { useCanvasViewport } from '../hooks/useCanvasViewport';
import { useNodeVisualMode } from '../hooks/useNodeVisualMode';
import { useVisibleNodes } from '../hooks/useVisibleNodes';
import { useFlowGraph } from '../hooks/useFlowGraph';
import { useNodeDragHandlers } from '../hooks/useNodeDragHandlers';
import { useCanvasGestures } from '../hooks/useCanvasGestures';
import { useCanvasHotkeys } from '../hooks/useCanvasHotkeys';
import { EdgeTypePicker, EdgeActionToolbar } from './EdgeControls';
import { NODE_VISUAL_MODE_THRESHOLDS } from '../lib/nodeVisualMode';
import { HUD_LAYERS, HUD_SPACING, HUD_STACK_GAP } from '../constants/hudLayout';

const nodeTypes = {
  thoughtMapNode: CustomThoughtNode,
  clusterMarker: ClusterMarkerNode,
  semanticFieldNode: SemanticFieldNode,
};

type PendingConnection = { source: string; target: string };

interface SpatialCanvasProps {
  immersive: boolean;
  onImmersiveToggle: () => void;
}

export default function SpatialCanvas({ immersive, onImmersiveToggle }: SpatialCanvasProps) {
  const { nodes, edges, realms, maps, currentMapId, switchMap, renameMap, updateNodePosition, addEdge, deleteNode, deleteEdge, updateEdgeType, selectedEdgeId, setSelectedEdgeId, openCartographerPanel, openSubMap, exitToParent, focusNode } = useThoughtStore();
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeTab, setSelectedNodeTab] = useState<'chat' | 'edit'>('chat');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
  const rfWrapperRef = useRef<HTMLDivElement | null>(null);
  const MIN_ZOOM = 0.05;
  const MAX_ZOOM = 2.5;

  // Canvas viewport mirror + the NaN/out-of-range zoom drift defense.
  const { rfViewport, handleViewport } = useCanvasViewport(MIN_ZOOM, MAX_ZOOM, rfInstanceRef);
  const nodeVisualMode = useNodeVisualMode(rfViewport.zoom);
  const { isDraggingNode, onNodesChange, onNodeDragStart, onNodeDragStop } =
    useNodeDragHandlers(updateNodePosition, nodes, rfInstanceRef, rfWrapperRef);

  const handleOpenPanel = useCallback((nodeId: string, tab: 'chat' | 'edit') => {
    setSelectedNodeTab(tab);
    setSelectedNodeId(nodeId);
  }, []);

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

  const { visibleNodes, visibleNodeIds } = useVisibleNodes(nodes, realms);

  useEffect(() => {
    if (!IS_DEV) return;
    if (DEBUG.nodeVisibility) {
      console.log('[GRAPH NODE COUNT]', nodes.length);
      console.log('[VISIBLE NODE IDS]', visibleNodes.map((n) => n.id));
      console.log('[VISIBLE COUNT]', visibleNodes.length);
    }
    if (DEBUG.cameraTracking) {
      console.log('[CAMERA]', { viewport: rfViewport });
    }
  }, [nodes.length, visibleNodes, rfViewport]);

  useEffect(() => {
    // Fires only when the collapse condition toggles (not on every zoom tick),
    // and only in development, so it never floods the production console.
    if (IS_DEV && nodes.length > 0 && visibleNodes.length === 0) {
      console.warn('[VISIBLE NODE COLLAPSE]', { total: nodes.length });
    }
  }, [nodes.length, visibleNodes.length]);

  const { clusters, isolatedNodes } = useClusters(visibleNodes, rfViewport.zoom);
  // Drive cluster mode directly from zoom rather than from the hysteresis-based
  // nodeVisualMode state. nodeVisualMode lags one render behind rfViewport.zoom
  // (it updates in a useEffect), which produced a brief empty canvas whenever
  // the zoom crossed the cluster threshold while nodeVisualMode was still
  // FULL_CARD. At zoom < 0.18 we are always in compact territory anyway.
  const shouldUseClusterMode =
    rfViewport.zoom < NODE_VISUAL_MODE_THRESHOLDS.CLUSTER &&
    !isDraggingNode;
  const { flowNodes, flowEdges } = useFlowGraph({
    visibleNodes,
    visibleNodeIds,
    edges,
    clusters,
    isolatedNodes,
    shouldUseClusterMode,
    selectedNodeId,
    hoveredNodeId,
    selectedEdgeId,
    zoom: rfViewport.zoom,
    onOpenSubMap: openSubMap,
    onRequestExpand: setSelectedNodeId,
    onOpenPanel: handleOpenPanel,
  });

  useEffect(() => {
    if (IS_DEV && DEBUG.selection) {
      console.log('[SELECTED NODE]', selectedNodeId);
    }
  }, [selectedNodeId]);

  const { lastGestureSource, lastTouchPointerAtRef, handlePointerDiagnostics, handleWheelDiagnostics } =
    useCanvasGestures(rfWrapperRef, {
      flowNodesLength: flowNodes.length,
      nodeVisualMode,
      rfViewport,
      visibleNodesLength: visibleNodes.length,
    });

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
  const selectedEdge = useMemo(() => edges.find((e) => e.id === selectedEdgeId) ?? null, [edges, selectedEdgeId]);

  const edgeActionPosition = useMemo(() => {
    if (!selectedEdge) return null;
    const sourceNode = nodes.find((n) => n.id === selectedEdge.source);
    const targetNode = nodes.find((n) => n.id === selectedEdge.target);
    if (!sourceNode || !targetNode) return null;
    const flowX = (sourceNode.x + targetNode.x) / 2;
    const flowY = (sourceNode.y + targetNode.y) / 2;
    return {
      left: flowX * rfViewport.zoom + rfViewport.x,
      top: flowY * rfViewport.zoom + rfViewport.y,
    };
  }, [selectedEdge, nodes, rfViewport.zoom, rfViewport.x, rfViewport.y]);

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

  useCanvasHotkeys(exitToParent);

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
    <div ref={rfWrapperRef} className="w-full h-full relative isolate" style={{ touchAction: 'none' }}>
      <BlackspaceBackground viewport={rfViewport} />
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
        onInit={(instance) => { rfInstanceRef.current = instance; }}
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
        onPaneClick={() => {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }}
        onEdgeClick={(_, edge) => {
          setSelectedNodeId(null);
          setSelectedEdgeId(edge.id);
        }}
        onSelectionChange={({ edges: selectionEdges }) => {
          if (!selectionEdges.length) return;
          setSelectedEdgeId(selectionEdges[0].id);
        }}
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
        <CanonicalMiniMap nodes={nodes} edges={edges} viewport={rfViewport} wrapperRef={rfWrapperRef} />
        <CanvasController />
        <CanvasKeyboardControls />
        <ViewportTracker onViewport={handleViewport} />
        <div
          className="absolute flex flex-col pointer-events-none"
          style={{ left: HUD_SPACING, bottom: HUD_SPACING, gap: HUD_STACK_GAP, zIndex: HUD_LAYERS.overlays }}
        >
          {IS_DEV && DEBUG.overlays && <DebugZoom />}
          {IS_DEV && DEBUG.overlays && (
            <div className="pointer-events-none rounded border border-void-700/90 bg-void-900/90 px-2 py-1 text-[10px] font-mono text-slate-300">
              <div>zoom {rfViewport.zoom.toFixed(3)} · {lastGestureSource}</div>
              <div>mode {nodeVisualMode}</div>
              <div>viewport {Math.round(rfViewport.x)}, {Math.round(rfViewport.y)}</div>
              <div>rendered {flowNodes.length} · hidden {Math.max(nodes.length - flowNodes.length, 0)}</div>
            </div>
          )}
          <CanvasZoomControls />
        </div>
        <div
          className="absolute pointer-events-none"
          style={{
            right: HUD_SPACING,
            bottom: `calc(${HUD_SPACING}px + clamp(140px, 18vw, 220px) + ${HUD_STACK_GAP}px)`,
            zIndex: HUD_LAYERS.overlays,
          }}
        >
          <div className="pointer-events-auto">
            <MapDensityIndicator totalNodes={nodes.length} renderedNodes={flowNodes.length} />
          </div>
        </div>
      </ReactFlow>

      {/* Edge type chooser */}
      {pendingConnection && (
        <EdgeTypePicker onSelect={handleEdgeTypeSelect} onCancel={() => setPendingConnection(null)} />
      )}
      {selectedEdge && edgeActionPosition && (
        <EdgeActionToolbar
          edge={selectedEdge}
          position={edgeActionPosition}
          onChangeType={updateEdgeType}
          onDelete={deleteEdge}
        />
      )}

      <NodeDetailPanel nodeId={selectedNodeId} onClose={() => setSelectedNodeId(null)} initialTab={selectedNodeTab} />
    </div>
  );
}
