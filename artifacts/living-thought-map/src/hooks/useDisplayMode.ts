import { useEffect, useRef } from 'react';
import { useViewport } from 'reactflow';
import { getNodeVisualMode, NODE_VISUAL_MODE_THRESHOLDS } from '../lib/nodeVisualMode';
import { NodeVisualMode } from '../types/nodeVisualMode';

export const ZOOM_THRESHOLDS = {
  FULL: NODE_VISUAL_MODE_THRESHOLDS.FULL_CARD,
  DOT: NODE_VISUAL_MODE_THRESHOLDS.COMPACT_CARD,
  CLUSTER: NODE_VISUAL_MODE_THRESHOLDS.CLUSTER,
} as const;

export type DisplayMode = 'full' | 'dot' | 'cluster';

export const useDisplayMode = () => {
  const { zoom } = useViewport();
  const nodeVisualMode = getNodeVisualMode(zoom);

  const mode: DisplayMode =
    zoom >= ZOOM_THRESHOLDS.FULL ? 'full' :
    zoom >= ZOOM_THRESHOLDS.DOT ? 'dot' : 'cluster';

  const prevModeRef = useRef<NodeVisualMode>(nodeVisualMode);
  useEffect(() => {
    if (prevModeRef.current !== nodeVisualMode) {
      console.log('[NODE MODE TRANSITION]', prevModeRef.current, nodeVisualMode);
      prevModeRef.current = nodeVisualMode;
    }
  }, [nodeVisualMode]);

  return {
    mode,
    zoom,
    nodeVisualMode,
    isFull: nodeVisualMode === NodeVisualMode.FULL_CARD,
    isDot: nodeVisualMode === NodeVisualMode.DOT,
    isCluster: mode === 'cluster',
    thresholds: ZOOM_THRESHOLDS,
  };
};
