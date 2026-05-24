import { ThoughtNode } from '../types';

export interface ClusterData {
  nodes: ThoughtNode[];
  x: number;
  y: number;
  id?: string;
  dominantType?: string;
}

function getDominantNodeType(nodes: ThoughtNode[]): string {
  const counts = nodes.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Groups nodes into clusters using an adaptive grid algorithm.
 * Grid cell size stays ~220 screen pixels regardless of zoom level, so
 * clusters grow naturally as the user zooms out further.
 * Pure function — does not mutate node data.
 */
export function computeClusters(nodes: ThoughtNode[], zoom: number): ClusterData[] {
  if (nodes.length === 0) return [];

  const gridSize = 220 / Math.max(zoom, 0.05);
  const grid = new Map<string, ThoughtNode[]>();

  for (const node of nodes) {
    const gx = Math.floor(node.x / gridSize);
    const gy = Math.floor(node.y / gridSize);
    const key = `${gx},${gy}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(node);
  }

  const clusters: ClusterData[] = [];

  grid.forEach((group, key) => {
    const avgX = group.reduce((sum, n) => sum + n.x, 0) / group.length;
    const avgY = group.reduce((sum, n) => sum + n.y, 0) / group.length;
    clusters.push({
      id: `cluster-${key}`,
      x: avgX,
      y: avgY,
      nodes: group,
      dominantType: getDominantNodeType(group),
    });
  });

  return clusters;
}
