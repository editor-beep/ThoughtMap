import { useMemo } from 'react';
import type { ThoughtNode, Realm } from '../types';

export interface VisibleNodes {
  /** Nodes that pass the active-realm filter for the current map. */
  visibleNodes: ThoughtNode[];
  /** Ids of `visibleNodes`, for O(1) membership checks (e.g. edge filtering). */
  visibleNodeIds: Set<string>;
}

/**
 * Realm-based visibility filtering, kept separate from rendering.
 *
 * A node is visible when it belongs to no realm (always shown) or to at least
 * one currently-active realm. This is purely a function of the nodes and the
 * set of active realms — it knows nothing about zoom, clusters, or ReactFlow.
 */
export function useVisibleNodes(nodes: ThoughtNode[], realms: Realm[]): VisibleNodes {
  const activeRealmIds = useMemo(
    () => new Set(realms.filter((r) => r.isActive).map((r) => r.id)),
    [realms]
  );

  const visibleNodes = useMemo(
    () => nodes.filter((n) => n.realms.length === 0 || n.realms.some((r) => activeRealmIds.has(r))),
    [nodes, activeRealmIds]
  );

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  return { visibleNodes, visibleNodeIds };
}
