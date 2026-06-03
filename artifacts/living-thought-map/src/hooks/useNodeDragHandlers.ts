import { useCallback, useRef, useState } from 'react';
import type { Node, NodeChange, NodeMouseHandler, ReactFlowInstance } from 'reactflow';
import type { ThoughtNode } from '../types';
import { DEBUG, IS_DEV } from '../config/debug';
import { isValidViewport, isValidXYPosition } from '../lib/viewport';

// Padding (in screen px) from the viewport edge — a node released closer than
// this to the edge counts as off-screen and gets pulled back into view.
const OFFSCREEN_EDGE_PADDING = 48;

export interface NodeDragHandlers {
  /** True while the user is actively dragging a node. */
  isDraggingNode: boolean;
  onNodesChange: (changes: NodeChange[]) => void;
  onNodeDragStart: NodeMouseHandler;
  onNodeDragStop: NodeMouseHandler;
}

function validateFlowNodePosition(rfNode: Node) {
  if (!IS_DEV || !DEBUG.dragValidation) return;
  const px = rfNode.position?.x;
  const py = rfNode.position?.y;
  if (!Number.isFinite(px)) console.warn('[CARD POSITION INVALID X]', rfNode.id, px);
  if (!Number.isFinite(py)) console.warn('[CARD POSITION INVALID Y]', rfNode.id, py);
}

/**
 * Owns node-drag state and the store-commit lifecycle.
 *
 * React Flow owns the node position internally for the duration of a drag;
 * writing the store back on every drag tick creates a coordinate-feedback loop
 * (RF applies its pointer delta on top of an already-moved position, producing
 * wild jumps — the original NaN/teleport bug). We therefore commit exactly once
 * on drag stop, guarding against non-finite coordinates throughout.
 */
export function useNodeDragHandlers(
  updateNodePosition: (id: string, x: number, y: number) => void,
  nodes: ThoughtNode[],
  rfInstanceRef: React.RefObject<ReactFlowInstance | null>,
  rfWrapperRef: React.RefObject<HTMLDivElement | null>,
): NodeDragHandlers {
  const [isDraggingNode, setIsDraggingNode] = useState(false);

  // Stable ref to the current nodes list so drag-recovery callbacks can look up
  // a node's correct store position without adding `nodes` to their dep array.
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((change) => {
        if (change.type !== 'position' || !change.id) return;

        // While the user is actively dragging, let React Flow own the node
        // position. We commit the final position once in onNodeDragStop.
        if (change.dragging) return;

        const nextPosition = change.position;
        if (!isValidXYPosition(nextPosition)) {
          // Spurious drag-end with invalid coordinates (common when trackpad
          // scroll is misread as a node drag). Restore the node to its current
          // store position so React Flow doesn't keep it stuck at NaN.
          const storeNode = nodesRef.current.find((n) => n.id === change.id);
          if (storeNode && Number.isFinite(storeNode.x) && Number.isFinite(storeNode.y)) {
            updateNodePosition(change.id, storeNode.x, storeNode.y);
          }
          return;
        }

        const nextX = nextPosition.x;
        const nextY = nextPosition.y;
        if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) {
          console.error('[INVALID POINTER POSITION]', nextX, nextY);
          return;
        }
        updateNodePosition(change.id, nextX, nextY);
      });
    },
    [updateNodePosition]
  );

  const onNodeDragStart: NodeMouseHandler = useCallback(() => {
    setIsDraggingNode(true);
  }, []);

  const onNodeDragStop: NodeMouseHandler = useCallback((_event, rfNode) => {
    setIsDraggingNode(false);
    validateFlowNodePosition(rfNode);

    // Commit the final drag position to the store exactly once. React Flow
    // owned the position internally during the drag (see onNodesChange); now
    // that the gesture is over we persist where the node was released.
    const finalX = rfNode.position?.x;
    const finalY = rfNode.position?.y;
    if (!Number.isFinite(finalX) || !Number.isFinite(finalY)) {
      // Spurious drag-stop with NaN coordinates. Write the node's correct store
      // position back so React Flow exits its NaN internal state and re-renders
      // the node at the right place (without a store write, RF keeps showing it
      // at NaN and the node appears to vanish).
      const storeNode = nodesRef.current.find((n) => n.id === rfNode.id);
      if (storeNode && Number.isFinite(storeNode.x) && Number.isFinite(storeNode.y)) {
        updateNodePosition(rfNode.id, storeNode.x, storeNode.y);
      }
      return;
    }
    updateNodePosition(rfNode.id, finalX, finalY);

    // Safety net: if the user flung the node outside the current viewport,
    // gently pan the camera to keep it discoverable. Works in both card and
    // dot modes since we operate purely on logical (flow) coordinates.
    const instance = rfInstanceRef.current;
    const wrapper = rfWrapperRef.current;
    if (!instance || !wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const vp = instance.getViewport();
    if (!isValidViewport(vp)) return;

    // Approximate node footprint in flow coords so a card that's mostly
    // off-screen still counts as off-screen.
    const nodeWidthFlow = (rfNode.width ?? 0) || 0;
    const nodeHeightFlow = (rfNode.height ?? 0) || 0;

    const screenLeft = finalX * vp.zoom + vp.x;
    const screenTop = finalY * vp.zoom + vp.y;
    const screenRight = screenLeft + nodeWidthFlow * vp.zoom;
    const screenBottom = screenTop + nodeHeightFlow * vp.zoom;

    const pad = OFFSCREEN_EDGE_PADDING;
    const offscreen =
      screenRight < pad ||
      screenBottom < pad ||
      screenLeft > rect.width - pad ||
      screenTop > rect.height - pad;

    if (!offscreen) return;

    const centerFlowX = finalX + nodeWidthFlow / 2;
    const centerFlowY = finalY + nodeHeightFlow / 2;
    instance.setCenter(centerFlowX, centerFlowY, { zoom: vp.zoom, duration: 450 });
  }, [updateNodePosition, rfInstanceRef, rfWrapperRef]);

  return { isDraggingNode, onNodesChange, onNodeDragStart, onNodeDragStop };
}
