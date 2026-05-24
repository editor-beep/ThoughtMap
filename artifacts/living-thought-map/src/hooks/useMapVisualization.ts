import { useViewport } from 'reactflow';
import { useThoughtStore } from '../store';
import { useDisplayMode } from './useDisplayMode';
import { useClusters } from './useClusters';

/**
 * Combined hook for zoom-aware map visualization state.
 * Must be called from within a ReactFlow provider context.
 */
export const useMapVisualization = () => {
  const { zoom } = useViewport();
  const nodes = useThoughtStore((s) => s.nodes);
  const display = useDisplayMode();
  const clustersData = useClusters(nodes, zoom);

  return {
    mode:      display.mode,
    zoom:      display.zoom,
    isFull:    display.isFull,
    isDot:     display.isDot,
    isCluster: display.isCluster,

    clusters:      clustersData.clusters,
    isolatedNodes: clustersData.isolatedNodes,
    hasClusters:   clustersData.hasClusters,
    isClusterMode: clustersData.isClusterMode,

    shouldShowFullNodes: display.isFull,
    shouldShowDots:      display.isDot || (display.isCluster && clustersData.isolatedNodes.length > 0),
    shouldShowClusters:  display.isCluster,
  };
};
