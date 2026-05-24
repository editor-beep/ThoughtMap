import { useViewport } from 'reactflow';

export const ZOOM_THRESHOLDS = {
  FULL: 0.65,
  DOT: 0.35,
  CLUSTER: 0.18,
} as const;

export type DisplayMode = 'full' | 'dot' | 'cluster';

/**
 * Returns the current display mode based on ReactFlow viewport zoom.
 * Must be called from within a ReactFlow provider context (node components, Panel children).
 */
export const useDisplayMode = () => {
  const { zoom } = useViewport();

  const mode: DisplayMode =
    zoom >= ZOOM_THRESHOLDS.FULL ? 'full' :
    zoom >= ZOOM_THRESHOLDS.DOT  ? 'dot'  : 'cluster';

  return {
    mode,
    zoom,
    isFull:    mode === 'full',
    isDot:     mode === 'dot',
    isCluster: mode === 'cluster',
    thresholds: ZOOM_THRESHOLDS,
  };
};
