import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  NodeChange,
  Connection,
  useReactFlow,
  useViewport,
  Node,
  Edge,
  NodeMouseHandler,
  Viewport,
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
import { DEBUG, IS_DEV } from '../config/debug';
import MapDensityIndicator from './MapDensityIndicator';
import { useClusters } from '../hooks/useClusters';
import { isFinitePosition } from '../lib/nodeVisualMode';
import { NodeVisualMode } from '../types/nodeVisualMode';
import { normalizePointerEvent } from '../lib/input/normalizePointerEvent';
import { EDGE_TYPES } from '../lib/constants';
import { HUD_LAYERS, HUD_SPACING, HUD_STACK_GAP } from '../constants/hudLayout';

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

function CanvasZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const buttonClassName = 'h-8 w-8 rounded border border-void-700 bg-void-800/90 text-slate-300 hover:bg-void-700 hover:text-slate-100 transition-colors';

  return (
    <div className="flex flex-col gap-1.5 pointer-events-auto">
      <button aria-label="Zoom in" onClick={() => zoomIn({ duration: 180 })} className={buttonClassName}>+</button>
      <button aria-label="Zoom out" onClick={() => zoomOut({ duration: 180 })} className={buttonClassName}>−</button>
      <button aria-label="Fit view" onClick={() => fitView({ duration: 240, padding: 0.2 })} className={buttonClassName}>⤢</button>
    </div>
  );
}

function CanonicalMiniMap({ nodes, edges, viewport, wrapperRef }: {
  nodes: { id: string; x: number; y: number; type: string }[];
  edges: { source: string; target: string }[];
  viewport: Viewport;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { setViewport } = useReactFlow();
  const nodePositions = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const worldBounds = useMemo(() => {
    if (!nodes.length) return { minX: -100, maxX: 100, minY: -100, maxY: 100 };
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  }, [nodes]);
  const worldWidth = Math.max(worldBounds.maxX - worldBounds.minX, 1);
  const worldHeight = Math.max(worldBounds.maxY - worldBounds.minY, 1);
  const scale = Math.min((MINIMAP_SIZE - MINIMAP_PADDING) / worldWidth, (MINIMAP_SIZE - MINIMAP_PADDING) / worldHeight);
  const offsetX = (MINIMAP_SIZE - worldWidth * scale) / 2;
  const offsetY = (MINIMAP_SIZE - worldHeight * scale) / 2;
  const toMini = useCallback((x: number, y: number) => ({ x: offsetX + (x - worldBounds.minX) * scale, y: offsetY + (y - worldBounds.minY) * scale }), [offsetX, offsetY, scale, worldBounds.minX, worldBounds.minY]);
  const viewportWorld = useMemo(() => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 1;
    const height = rect?.height ?? 1;
    return { minX: -viewport.x / viewport.zoom, minY: -viewport.y / viewport.zoom, width: width / viewport.zoom, height: height / viewport.zoom };
  }, [viewport, wrapperRef]);
  const viewportMini = useMemo(() => {
    const topLeft = toMini(viewportWorld.minX, viewportWorld.minY);
    return { x: topLeft.x, y: topLeft.y, width: viewportWorld.width * scale, height: viewportWorld.height * scale };
  }, [toMini, viewportWorld, scale]);
  const onMiniMapInteract = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const miniX = event.clientX - rect.left;
    const miniY = event.clientY - rect.top;
    const worldX = worldBounds.minX + (miniX - offsetX) / scale;
    const worldY = worldBounds.minY + (miniY - offsetY) / scale;
    const wrapper = wrapperRef.current?.getBoundingClientRect();
    const screenWidth = wrapper?.width ?? 1;
    const screenHeight = wrapper?.height ?? 1;
    setViewport({ x: -(worldX - screenWidth / (2 * viewport.zoom)) * viewport.zoom, y: -(worldY - screenHeight / (2 * viewport.zoom)) * viewport.zoom, zoom: viewport.zoom }, { duration: 120 });
  }, [offsetX, offsetY, scale, setViewport, viewport.zoom, worldBounds.minX, worldBounds.minY, wrapperRef]);

  useEffect(() => {
    if (IS_DEV && DEBUG.minimap) console.log('[MINIMAP]', { totalNodes: nodes.length, worldBounds, camera: viewport });
  }, [nodes.length, worldBounds, viewport]);

  return (
    <div className="absolute" style={{ right: HUD_SPACING, bottom: HUD_SPACING, zIndex: HUD_LAYERS.minimap }}>
      <svg width={MINIMAP_SIZE} height={MINIMAP_SIZE} viewBox={`0 0 ${MINIMAP_SIZE} ${MINIMAP_SIZE}`} className="rounded border border-void-700 bg-[#0b0f19] pointer-events-auto" onPointerDown={onMiniMapInteract}>
        {edges.map((edge, i) => {
          const source = nodePositions.get(edge.source);
          const target = nodePositions.get(edge.target);
          if (!source || !target) return null;
          const s = toMini(source.x, source.y);
          const t = toMini(target.x, target.y);
          return <line key={`${edge.source}-${edge.target}-${i}`} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="#334155" strokeWidth={0.7} />;
        })}
        {nodes.map((node) => {
          const p = toMini(node.x, node.y);
          return <circle key={node.id} cx={p.x} cy={p.y} r={1.8} fill={NODE_TYPE_COLORS[node.type] ?? '#1e293b'} />;
        })}
        <rect x={viewportMini.x} y={viewportMini.y} width={viewportMini.width} height={viewportMini.height} fill="rgba(3,7,18,0.4)" stroke="#38bdf8" strokeWidth={1} />
      </svg>
    </div>
  );
}


const FALLBACK_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };
const FALLBACK_POSITION = { x: 0, y: 0 };
const MINIMAP_SIZE = 180;
const MINIMAP_PADDING = 24;

function isValidViewport(vp: Viewport): boolean {
  return Number.isFinite(vp.x) && Number.isFinite(vp.y) && Number.isFinite(vp.zoom) && vp.zoom > 0;
}

function clampZoom(zoom: number, minZoom: number, maxZoom: number): number {
  if (!Number.isFinite(zoom)) return minZoom;
  return Math.max(minZoom, Math.min(maxZoom, zoom));
}

function sanitizeViewport(vp: Viewport, minZoom: number, maxZoom: number, fallback: Viewport): Viewport {
  const safeZoom = clampZoom(vp.zoom, minZoom, maxZoom);
  const safeX = Number.isFinite(vp.x) ? vp.x : fallback.x;
  const safeY = Number.isFinite(vp.y) ? vp.y : fallback.y;
  if (!Number.isFinite(safeZoom)) return fallback;
  return { x: safeX, y: safeY, zoom: safeZoom };
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
  const { nodes, edges, realms, maps, currentMapId, switchMap, renameMap, updateNodePosition, addEdge, deleteNode, deleteEdge, updateEdgeType, selectedEdgeId, setSelectedEdgeId, openCartographerPanel, openSubMap, exitToParent, focusNode } = useThoughtStore();
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [rfViewport, setRfViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [lastGestureSource, setLastGestureSource] = useState<'wheel' | 'touch' | 'unknown'>('unknown');
  const [cardScale, setCardScale] = useState<'compact' | 'standard' | 'large'>('standard');
  const [dotScale, setDotScale] = useState<'tiny' | 'standard' | 'large'>('standard');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const lastTouchPointerAtRef = useRef(0);
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
  const rfWrapperRef = useRef<HTMLDivElement | null>(null);
  const MIN_ZOOM = 0.05;
  const MAX_ZOOM = 2.5;
  // Padding (in screen px) from the viewport edge — a node released closer
  // than this to the edge counts as off-screen and gets pulled back into view.
  const OFFSCREEN_EDGE_PADDING = 48;

  const handleViewport = useCallback((vp: Viewport) => {
    const nextViewport = sanitizeViewport(vp, MIN_ZOOM, MAX_ZOOM, FALLBACK_VIEWPORT);
    if (!isValidViewport(nextViewport)) {
      console.error('[INVALID VIEWPORT]', vp, nextViewport);
      setRfViewport(FALLBACK_VIEWPORT);
      return;
    }
    setRfViewport((current) => {
      if (current.x === nextViewport.x && current.y === nextViewport.y && current.zoom === nextViewport.zoom) {
        return current;
      }
      return nextViewport;
    });
  }, [MAX_ZOOM, MIN_ZOOM]);

  const stableModeRef = useRef<NodeVisualMode>(NodeVisualMode.FULL_CARD);
  const nodeVisualMode = useMemo(() => {
    const zoom = rfViewport.zoom;
    const prev = stableModeRef.current;
    const next =
      prev === NodeVisualMode.FULL_CARD
        ? (zoom < 0.84 ? NodeVisualMode.COMPACT_CARD : NodeVisualMode.FULL_CARD)
        : prev === NodeVisualMode.COMPACT_CARD
          ? (zoom >= 0.95 ? NodeVisualMode.FULL_CARD : zoom < 0.5 ? NodeVisualMode.DOT : NodeVisualMode.COMPACT_CARD)
          : (zoom >= 0.62 ? NodeVisualMode.COMPACT_CARD : NodeVisualMode.DOT);
    stableModeRef.current = next;
    return next;
  }, [rfViewport.zoom]);

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
  const shouldUseClusterMode = nodeVisualMode === NodeVisualMode.DOT && rfViewport.zoom < 0.22 && !isDraggingNode;
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
    if (IS_DEV && DEBUG.selection) {
      console.log('[SELECTED NODE]', selectedNodeId);
    }
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
              const isSelectedEdge = selectedEdgeId === edge.id;
              return {
              id: edge.id,
              source: edge.source,
              target: edge.target,
              animated: Boolean(isFocusedEdge || isSelectedEdge),
              interactionWidth: 28,
              label: isSelectedEdge ? EDGE_LABELS[edge.type] : undefined,
              labelStyle: { fill: isFocusedEdge || isSelectedEdge ? '#bae6fd' : '#475569', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' },
              labelBgStyle: { fill: '#030712', fillOpacity: 0.85 },
              style: {
                stroke: EDGE_COLORS[edge.type],
                strokeWidth: isSelectedEdge ? 3.4 : isFocusedEdge ? 2.8 : isNeighborEdge ? 2.1 : 1.2,
                opacity: isSelectedEdge ? 1 : activeFocusId ? (isNeighborEdge ? 0.9 : 0.2) : 0.75,
              }
            };}),
    [shouldUseClusterMode, edges, visibleNodeIds, activeFocusId, neighborhoodNodeIds, selectedEdgeId]
  );

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
    const viewportZoom = clampZoom(rfViewport.zoom, MIN_ZOOM, MAX_ZOOM);
    if (!Number.isFinite(viewportZoom)) {
      event.preventDefault();
    }
  }, [rfViewport.zoom]);

  useEffect(() => {
    if (!rfWrapperRef.current) return;
    const target = rfWrapperRef.current;
    const onGesture = (event: Event) => {
      setLastGestureSource('touch');
      if (IS_DEV && DEBUG.pointerEvents) {
        console.group('[ZOOM PIPELINE]');
        console.log('gesture', event.type);
        console.log('viewport', rfViewport);
        console.log('mode', nodeVisualMode);
        console.log('rendered', flowNodes.length, 'visible', visibleNodes.length);
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
  }, [flowNodes.length, nodeVisualMode, rfViewport, visibleNodes.length]);

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
          className="absolute flex flex-col items-end pointer-events-none"
          style={{
            right: HUD_SPACING,
            bottom: `calc(${HUD_SPACING}px + clamp(140px, 18vw, 220px) + ${HUD_STACK_GAP}px)`,
            gap: HUD_STACK_GAP,
            zIndex: HUD_LAYERS.overlays,
          }}
        >
          <div className="pointer-events-auto rounded-lg border border-void-700/80 bg-void-900/85 p-2 text-[10px] font-mono text-slate-300">
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

      <NodeDetailPanel nodeId={selectedNodeId} onClose={() => setSelectedNodeId(null)} />
    </div>
  );
}
