export const DEFAULT_SPAWN_RADIUS = 220;
export const MAX_WORLD_COORD = 20000;

type Coords = { x: number; y: number };

export function isFiniteCoordinate(value: number): boolean {
  return Number.isFinite(value) && !Number.isNaN(value);
}

export function cleanForExtraction(content: string): string {
  const cutIdx = content.search(/\*\*MAP EXTRACT\*\*|```json/);
  return (cutIdx === -1 ? content : content.slice(0, cutIdx)).trim();
}

export function clampWorld(value: number): number {
  return Math.max(-MAX_WORLD_COORD, Math.min(MAX_WORLD_COORD, value));
}

export function generateSpawnPosition(existingNodes: Coords[]): Coords {
  if (existingNodes.length === 0) return { x: 0, y: 0 };
  const index = existingNodes.length;
  const angle = index * 0.92;
  const radius = DEFAULT_SPAWN_RADIUS + (index % 5) * 28;
  const cx = existingNodes.reduce((sum, n) => sum + n.x, 0) / existingNodes.length;
  const cy = existingNodes.reduce((sum, n) => sum + n.y, 0) / existingNodes.length;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

export function normalizeNodePosition(nodeData: Coords, existingNodes: Coords[]): Coords {
  const fallback = generateSpawnPosition(existingNodes);
  let x = isFiniteCoordinate(nodeData.x) ? nodeData.x : fallback.x;
  let y = isFiniteCoordinate(nodeData.y) ? nodeData.y : fallback.y;

  const overlapCount = existingNodes.filter((n) => Math.abs(n.x - x) < 12 && Math.abs(n.y - y) < 12).length;
  if (overlapCount > 0) {
    const jitterAngle = Math.random() * Math.PI * 2;
    const jitterRadius = 90 + overlapCount * 26;
    x += Math.cos(jitterAngle) * jitterRadius;
    y += Math.sin(jitterAngle) * jitterRadius;
  }

  return { x: clampWorld(x), y: clampWorld(y) };
}
