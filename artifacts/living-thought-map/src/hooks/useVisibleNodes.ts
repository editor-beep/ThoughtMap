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
 * A node is visible when it belongs to no realm (always shown), when none of
 * its realms match a realm that actually exists in the store, or when at least
 * one of its *known* realms is currently active. This is purely a function of
 * the nodes and the realm set — it knows nothing about zoom, clusters, or
 * ReactFlow.
 */
export function useVisibleNodes(nodes: ThoughtNode[], realms: Realm[]): VisibleNodes {
  const activeRealmIds = useMemo(
    () => new Set(realms.filter((r) => r.isActive).map((r) => r.id)),
    [realms]
  );

  const knownRealmIds = useMemo(
    () => new Set(realms.map((r) => r.id)),
    [realms]
  );

  const visibleNodes = useMemo(
    () =>
      nodes.filter((n) => {
        if (n.realms.length === 0) return true;
        // Only realms that actually exist in the store can hide a node. Realm
        // ids that don't match any known realm (e.g. ids invented by the
        // Cartographer AI) must NOT hide the node — otherwise valid nodes
        // vanish and the whole canvas goes blank.
        const knownRealms = n.realms.filter((r) => knownRealmIds.has(r));
        if (knownRealms.length === 0) return true;
        return knownRealms.some((r) => activeRealmIds.has(r));
      }),
    [nodes, activeRealmIds, knownRealmIds]
  );

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  return { visibleNodes, visibleNodeIds };
}
