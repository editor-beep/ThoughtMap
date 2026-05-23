import { ThoughtNode } from '../types';

export interface ClusterData {
  nodes: ThoughtNode[];
  x: number;
  y: number;
}

/**
 * Groups nodes into screen-space clusters using a greedy proximity algorithm.
 * Threshold is given in screen pixels; it's converted to canvas units via zoom.
 * Pure function — does not mutate node data.
 */
export function computeClusters(
  nodes: ThoughtNode[],
  zoom: number,
  screenThreshold = 40
): ClusterData[] {
  if (nodes.length === 0) return [];

  const canvasThreshold = screenThreshold / zoom;
  const thresholdSq = canvasThreshold * canvasThreshold;

  const assigned = new Set<string>();
  const clusters: ClusterData[] = [];

  for (const seed of nodes) {
    if (assigned.has(seed.id)) continue;

    const members: ThoughtNode[] = [seed];
    assigned.add(seed.id);

    for (const candidate of nodes) {
      if (assigned.has(candidate.id)) continue;
      const dx = seed.x - candidate.x;
      const dy = seed.y - candidate.y;
      if (dx * dx + dy * dy <= thresholdSq) {
        members.push(candidate);
        assigned.add(candidate.id);
      }
    }

    const cx = members.reduce((sum, n) => sum + n.x, 0) / members.length;
    const cy = members.reduce((sum, n) => sum + n.y, 0) / members.length;
    clusters.push({ nodes: members, x: cx, y: cy });
  }

  return clusters;
}
