import { useCallback, useRef, useState } from 'react';
import type { Viewport, ReactFlowInstance } from 'reactflow';
import { FALLBACK_VIEWPORT, isValidViewport, sanitizeViewport } from '../lib/viewport';

export interface CanvasViewport {
  /** The last known-good viewport, mirrored from ReactFlow into React state. */
  rfViewport: Viewport;
  /** Pass to <ViewportTracker onViewport={...} /> to keep the mirror in sync. */
  handleViewport: (vp: Viewport) => void;
}

/**
 * Single owner of the canvas viewport mirror and the defense against ReactFlow's
 * internal viewport drifting into NaN / out-of-range zoom.
 *
 * A gesture — especially a trackpad/touch pinch under Safari — can drive RF's
 * transform pane to `scale(NaN)`, hiding every node while React's render count
 * stays "valid" (the exact symptom seen on iPad pinch and Magic Keyboard
 * trackpad pinch). We sanitize every reported viewport; when sanitizing changed
 * anything, we push the corrected viewport back into RF so its transform pane
 * recovers. Corrections are coalesced into a single rAF so a noisy gesture
 * stream can't queue a storm of `setViewport` calls.
 */
export function useCanvasViewport(
  minZoom: number,
  maxZoom: number,
  rfInstanceRef: React.RefObject<ReactFlowInstance | null>,
): CanvasViewport {
  const [rfViewport, setRfViewport] = useState<Viewport>(FALLBACK_VIEWPORT);
  const pendingViewportCorrectionRef = useRef<Viewport | null>(null);

  const handleViewport = useCallback((vp: Viewport) => {
    const nextViewport = sanitizeViewport(vp, minZoom, maxZoom, FALLBACK_VIEWPORT);
    const sanitizedDiffers =
      nextViewport.x !== vp.x || nextViewport.y !== vp.y || nextViewport.zoom !== vp.zoom;
    if (sanitizedDiffers) {
      const instance = rfInstanceRef.current;
      const wasIdle = pendingViewportCorrectionRef.current === null;
      pendingViewportCorrectionRef.current = nextViewport;
      if (instance && wasIdle) {
        requestAnimationFrame(() => {
          const queued = pendingViewportCorrectionRef.current;
          pendingViewportCorrectionRef.current = null;
          if (!queued) return;
          try { instance.setViewport(queued, { duration: 0 }); } catch { /* RF may be unmounting */ }
        });
      }
    }
    if (!isValidViewport(nextViewport)) {
      console.error('[INVALID VIEWPORT]', vp, nextViewport);
      setRfViewport(FALLBACK_VIEWPORT);
      return;
    }
    setRfViewport((current) => {
      if (current.x === nextViewport.x && current.y === nextViewport.y && current.zoom === nextViewport.zoom) {
        return current;
      }
      return nextViewport;
    });
  }, [minZoom, maxZoom, rfInstanceRef]);

  return { rfViewport, handleViewport };
}
