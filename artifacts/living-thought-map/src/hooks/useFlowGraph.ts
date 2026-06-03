import { useMemo } from 'react';
import type { Node, Edge } from 'reactflow';
import type { ThoughtNode, ThoughtEdge } from '../types';
import type { ClusterData } from '../lib/clustering';
import { EDGE_COLORS, EDGE_LABELS } from '../lib/canvasTheme';
import { toSafePosition } from '../lib/viewport';

export interface FlowGraphParams {
  visibleNodes: ThoughtNode[];
  visibleNodeIds: Set<string>;
  edges: ThoughtEdge[];
  clusters: ClusterData[];
  isolatedNodes: ThoughtNode[];
  shouldUseClusterMode: boolean;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  selectedEdgeId: string | null;
  zoom: number;
  onOpenSubMap: (nodeId: string) => void;
  onRequestExpand: (nodeId: string) => void;
  onOpenPanel: (nodeId: string, tab: 'chat' | 'edit') => void;
}

export interface FlowGraph {
  flowNodes: Node[];
  flowEdges: Edge[];
}

type Emphasis = 'focused' | 'neighborhood' | 'background' | 'default';

/**
 * Translates the domain graph (visible nodes/edges, clusters, selection) into
 * the ReactFlow node/edge arrays. This is the canvas's "rendering decision"
 * layer — it decides cluster vs. card vs. dot, focus emphasis, and edge
 * styling — kept out of the component so SpatialCanvas just wires it up.
 */
export function useFlowGraph({
  visibleNodes,
  visibleNodeIds,
  edges,
  clusters,
  isolatedNodes,
  shouldUseClusterMode,
  selectedNodeId,
  hoveredNodeId,
  selectedEdgeId,
  zoom,
  onOpenSubMap,
  onRequestExpand,
  onOpenPanel,
}: FlowGraphParams): FlowGraph {
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

  const flowNodes = useMemo<Node[]>(() => {
    const emphasisFor = (nodeId: string): Emphasis =>
      neighborhoodNodeIds.has(nodeId)
        ? (activeFocusId === nodeId ? 'focused' : 'neighborhood')
        : (activeFocusId ? 'background' : 'default');
    const semanticCompression = Math.max(0, Math.min(1, (zoom - 0.28) / 0.5));

    const toCardNode = (node: ThoughtNode): Node => ({
      id: node.id,
      type: node.isSemanticField ? 'semanticFieldNode' : 'thoughtMapNode',
      position: toSafePosition(node.id, node.x, node.y),
      data: {
        node,
        onOpen: onOpenSubMap,
        isFocused: selectedNodeId === node.id,
        emphasis: emphasisFor(node.id),
        semanticCompression,
        onRequestExpand,
        onOpenPanel,
      },
    });

    if (shouldUseClusterMode) {
      const clusterNodes: Node[] = clusters.map((c, i) => ({
        id: `cluster-${i}`,
        type: 'clusterMarker',
        position: { x: c.x, y: c.y },
        data: { cluster: c },
        draggable: false,
        selectable: false,
      }));
      // Isolated single nodes fall back to their regular dot rendering.
      const singleNodes = isolatedNodes.map(toCardNode);
      return [...clusterNodes, ...singleNodes];
    }

    return visibleNodes.map(toCardNode);
  }, [shouldUseClusterMode, clusters, isolatedNodes, visibleNodes, onOpenSubMap, selectedNodeId, neighborhoodNodeIds, activeFocusId, zoom, onRequestExpand, onOpenPanel]);

  const flowEdges = useMemo<Edge[]>(
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
                },
              };
            }),
    [shouldUseClusterMode, edges, visibleNodeIds, activeFocusId, neighborhoodNodeIds, selectedEdgeId]
  );

  return { flowNodes, flowEdges };
}
