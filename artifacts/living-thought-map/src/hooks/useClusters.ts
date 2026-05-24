import { useMemo } from 'react';
import { ThoughtNode } from '../types';
import { computeClusters, ClusterData } from '../lib/clustering';
import { ZOOM_THRESHOLDS } from './useDisplayMode';

/**
 * Computes cluster groups and isolated nodes for the given nodes and zoom level.
 * Takes explicit params — no ReactFlow context dependency, safe to call from SpatialCanvas.
 */
export const useClusters = (nodes: ThoughtNode[], zoom: number) => {
  const isClusterMode = zoom < ZOOM_THRESHOLDS.CLUSTER;

  const allClusters = useMemo<ClusterData[]>(() => {
    if (!isClusterMode) return [];
    return computeClusters(nodes, zoom);
  }, [nodes, zoom, isClusterMode]);

  const clusters = useMemo(
    () => allClusters.filter((c) => c.nodes.length > 1),
    [allClusters]
  );

  const isolatedNodes = useMemo<ThoughtNode[]>(() => {
    if (!isClusterMode) return [];
    const clusteredIds = new Set(clusters.flatMap((c) => c.nodes.map((n) => n.id)));
    return nodes.filter((n) => !clusteredIds.has(n.id));
  }, [nodes, clusters, isClusterMode]);

  return {
    clusters,
    isolatedNodes,
    isClusterMode,
    hasClusters: clusters.length > 0,
  };
};
