import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  NodeChange,
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
import { NODE_VISUAL_MODE_THRESHOLDS } from '../lib/nodeVisualMode';
import { NodeVisualMode } from '../types/nodeVisualMode';
import { normalizePointerEvent } from '../lib/input/normalizePointerEvent';
import { EDGE_TYPES } from '../lib/constants';
import { EDGE_COLORS, EDGE_LABELS } from '../lib/canvasTheme';
import {
  FALLBACK_VIEWPORT,
  isValidViewport,
  isValidXYPosition,
} from '../lib/viewport';
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
  const [lastGestureSource, setLastGestureSource] = useState<'wheel' | 'touch' | 'unknown'>('unknown');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const lastTouchPointerAtRef = useRef(0);
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
  const rfWrapperRef = useRef<HTMLDivElement | null>(null);
  const MIN_ZOOM = 0.05;
  const MAX_ZOOM = 2.5;

  // Canvas viewport mirror + the NaN/out-of-range zoom drift defense.
  const { rfViewport, handleViewport } = useCanvasViewport(MIN_ZOOM, MAX_ZOOM, rfInstanceRef);
  const nodeVisualMode = useNodeVisualMode(rfViewport.zoom);

  const handleOpenPanel = useCallback((nodeId: string, tab: 'chat' | 'edit') => {
    setSelectedNodeTab(tab);
    setSelectedNodeId(nodeId);
  }, []);

  // Padding (in screen px) from the viewport edge — a node released closer
  // than this to the edge counts as off-screen and gets pulled back into view.
  const OFFSCREEN_EDGE_PADDING = 48;

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
    if (nodes.length > 0 && visibleNodes.length === 0) {
      console.error('[VISIBLE NODE COLLAPSE]', {
        total: nodes.length,
        zoom: rfViewport.zoom,
      });
    }
  }, [nodes.length, visibleNodes.length, rfViewport.zoom]);

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

  const validateFlowNodePosition = useCallback((rfNode: Node) => {
    if (!IS_DEV || !DEBUG.dragValidation) return;
    const px = rfNode.position?.x;
    const py = rfNode.position?.y;
    if (!Number.isFinite(px)) console.warn('[CARD POSITION INVALID X]', rfNode.id, px);
    if (!Number.isFinite(py)) console.warn('[CARD POSITION INVALID Y]', rfNode.id, py);
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
      setLastGestureSource('touch');
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
    setLastGestureSource('wheel');
    if (IS_DEV && DEBUG.pointerEvents) {
      console.log('[WHEEL EVENT]', {
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        ctrlKey: event.ctrlKey,
      });
    }
  }, []);

  // Keep a ref of the values used only for debug logging so the gesture
  // listener can be registered exactly once (on mount) rather than being torn
  // down and re-attached on every viewport tick. Unnecessary re-registration
  // can cause missed gesturestart events during pinch animations on iOS.
  const gestureDebugRef = useRef({ flowNodesLength: 0, nodeVisualMode: NodeVisualMode.FULL_CARD as NodeVisualMode, rfViewport: FALLBACK_VIEWPORT, visibleNodesLength: 0 });
  gestureDebugRef.current = { flowNodesLength: flowNodes.length, nodeVisualMode, rfViewport, visibleNodesLength: visibleNodes.length };

  useEffect(() => {
    const target = rfWrapperRef.current;
    if (!target) return;
    const onGesture = (event: Event) => {
      setLastGestureSource('touch');
      if (IS_DEV && DEBUG.pointerEvents) {
        const { flowNodesLength, nodeVisualMode: mode, rfViewport: vp, visibleNodesLength } = gestureDebugRef.current;
        console.group('[ZOOM PIPELINE]');
        console.log('gesture', event.type);
        console.log('viewport', vp);
        console.log('mode', mode);
        console.log('rendered', flowNodesLength, 'visible', visibleNodesLength);
        console.groupEnd();
      }
    };
    target.addEventListener('gesturestart', onGesture, { passive: true });
    target.addEventListener('gesturechange', onGesture, { passive: true });
    target.addEventListener('gestureend', onGesture, { passive: true });
    return () => {
      target.removeEventListener('gesturestart', onGesture);
      target.removeEventListener('gesturechange', onGesture);
      target.removeEventListener('gestureend', onGesture);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!Number.isFinite(finalX) || !Number.isFinite(finalY)) {
      console.error('[INVALID DRAG POSITION — SKIPPING UPDATE]', {
        nodeId: rfNode.id,
        nextPosition: rfNode.position,
      });
      return;
    }
    updateNodePosition(rfNode.id, finalX, finalY);

    // Safety net: if the user flung the node outside the current viewport,
    // gently pan the camera to keep it discoverable. Works in both card and
    // dot modes since we operate purely on logical (flow) coordinates.
    const instance = rfInstanceRef.current;
    const wrapper = rfWrapperRef.current;
    if (!instance || !wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const vp = instance.getViewport();
    if (!isValidViewport(vp)) return;

    // Approximate node footprint in flow coords so a card that's mostly
    // off-screen still counts as off-screen.
    const nodeWidthFlow = (rfNode.width ?? 0) || 0;
    const nodeHeightFlow = (rfNode.height ?? 0) || 0;

    const screenLeft = finalX * vp.zoom + vp.x;
    const screenTop = finalY * vp.zoom + vp.y;
    const screenRight = screenLeft + nodeWidthFlow * vp.zoom;
    const screenBottom = screenTop + nodeHeightFlow * vp.zoom;

    const pad = OFFSCREEN_EDGE_PADDING;
    const offscreen =
      screenRight < pad ||
      screenBottom < pad ||
      screenLeft > rect.width - pad ||
      screenTop > rect.height - pad;

    if (!offscreen) return;

    const centerFlowX = finalX + nodeWidthFlow / 2;
    const centerFlowY = finalY + nodeHeightFlow / 2;
    instance.setCenter(centerFlowX, centerFlowY, { zoom: vp.zoom, duration: 450 });
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
    <div ref={rfWrapperRef} className="w-full h-full relative isolate">
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
      {selectedEdge && edgeActionPosition && (
        <div
          className="absolute z-40 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-void-700 bg-void-900/95 px-2 py-2 shadow-xl backdrop-blur-sm flex items-center gap-2"
          style={{ left: edgeActionPosition.left, top: edgeActionPosition.top }}
          onClick={(event) => event.stopPropagation()}
        >
          <span className="text-[10px] font-mono text-slate-500">{EDGE_LABELS[selectedEdge.type]}</span>
          <select
            value={selectedEdge.type}
            onChange={(event) => updateEdgeType(selectedEdge.id, event.target.value as EdgeType)}
            className="bg-void-800 border border-void-700 rounded px-1.5 py-1 text-[10px] font-mono text-slate-300"
          >
            {EDGE_TYPES.map((type) => (
              <option key={type} value={type}>{EDGE_LABELS[type]}</option>
            ))}
          </select>
          <button
            onClick={() => {
              console.log('[EDGE DELETE]', selectedEdge.id);
              deleteEdge(selectedEdge.id);
            }}
            className="rounded border border-rose-700/60 bg-rose-900/20 px-2 py-1 text-[10px] font-mono text-rose-300 hover:bg-rose-800/30"
          >
            Delete
          </button>
        </div>
      )}

      <NodeDetailPanel nodeId={selectedNodeId} onClose={() => setSelectedNodeId(null)} initialTab={selectedNodeTab} />
    </div>
  );
}
