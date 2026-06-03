import { useEffect, useState } from 'react';
import { NodeVisualMode } from '../types/nodeVisualMode';

/**
 * Hysteresis-based card mode selection driven by zoom.
 *
 * Owns the mode in real state so effects drive transitions deterministically.
 * (An earlier version computed this inside a `useMemo` that mutated a ref —
 * impure, double-invoked under React 18 StrictMode, and prone to skipping
 * states under fast pinch input.)
 *
 * The hysteresis bands — cards engage above the upper threshold and drop to the
 * next mode below the lower threshold — leave a gap that prevents flicker loops
 * when zoom hovers near a boundary.
 */
export function useNodeVisualMode(zoom: number): NodeVisualMode {
  const [nodeVisualMode, setNodeVisualMode] = useState<NodeVisualMode>(NodeVisualMode.FULL_CARD);

  useEffect(() => {
    if (!Number.isFinite(zoom)) return;
    setNodeVisualMode((prev) => {
      if (prev === NodeVisualMode.FULL_CARD) {
        return zoom < 0.84 ? NodeVisualMode.COMPACT_CARD : NodeVisualMode.FULL_CARD;
      }
      // prev === COMPACT_CARD
      return zoom >= 0.95 ? NodeVisualMode.FULL_CARD : NodeVisualMode.COMPACT_CARD;
    });
  }, [zoom]);

  return nodeVisualMode;
}
