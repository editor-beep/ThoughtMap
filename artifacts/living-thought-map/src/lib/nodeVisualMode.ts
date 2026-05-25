import { NodeVisualMode } from '../types/nodeVisualMode';

export const NODE_VISUAL_MODE_THRESHOLDS = {
  FULL_CARD: 0.9,
  COMPACT_CARD: 0.55,
  CLUSTER: 0.18,
} as const;

export function getNodeVisualMode(zoom: number): NodeVisualMode {
  if (zoom >= NODE_VISUAL_MODE_THRESHOLDS.FULL_CARD) return NodeVisualMode.FULL_CARD;
  return NodeVisualMode.COMPACT_CARD;
}

export function isFinitePosition(x: number, y: number): boolean {
  return Number.isFinite(x) && Number.isFinite(y);
}
