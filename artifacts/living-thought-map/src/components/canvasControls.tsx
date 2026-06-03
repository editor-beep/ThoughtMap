import { useEffect, useRef } from 'react';
import { useReactFlow, useViewport, Viewport } from 'reactflow';
import { useThoughtStore } from '../store';

/** Pans/zooms the camera to a node when the store sets a focused node id. */
export function CanvasController() {
  const { setCenter } = useReactFlow();
  const { focusedNodeId, clearFocusedNode, nodes } = useThoughtStore();

  useEffect(() => {
    if (!focusedNodeId) return;
    const node = nodes.find((n) => n.id === focusedNodeId);
    if (node) setCenter(node.x + 100, node.y + 50, { zoom: 1.5, duration: 600 });
    clearFocusedNode();
  }, [focusedNodeId, nodes, setCenter, clearFocusedNode]);

  return null;
}

/** Syncs ReactFlow viewport zoom to the parent via a stable callback ref. */
export function ViewportTracker({ onViewport }: { onViewport: (v: Viewport) => void }) {
  const vp = useViewport();
  const cbRef = useRef(onViewport);
  cbRef.current = onViewport;

  useEffect(() => {
    cbRef.current(vp);
  // Only re-run when the actual viewport values change, not the callback reference.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp.zoom, vp.x, vp.y]);

  return null;
}

export function CanvasZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  // h-11 w-11 = 44px — meets Apple HIG minimum touch target size for iPhone/iPad
  const buttonClassName = 'h-11 w-11 rounded border border-void-700 bg-void-800/90 text-slate-300 hover:bg-void-700 hover:text-slate-100 transition-colors';

  return (
    <div className="flex flex-col gap-1.5 pointer-events-auto">
      <button aria-label="Zoom in" onClick={() => zoomIn({ duration: 180 })} className={buttonClassName}>+</button>
      <button aria-label="Zoom out" onClick={() => zoomOut({ duration: 180 })} className={buttonClassName}>−</button>
      <button aria-label="Fit view" onClick={() => fitView({ duration: 240, padding: 0.25 })} className={buttonClassName}>⤢</button>
    </div>
  );
}

/** Wires ⌘/Ctrl + = / − / 0 keyboard shortcuts to canvas zoom. */
export function CanvasKeyboardControls() {
  const { zoomIn, zoomOut, setViewport, getViewport } = useReactFlow();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName ?? '';
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || (event.target as HTMLElement | null)?.isContentEditable;
      if (isEditable) return;

      const isCmdCtrl = event.metaKey || event.ctrlKey;
      if (!isCmdCtrl) return;

      if (event.key === '=' || event.key === '+') {
        event.preventDefault();
        zoomIn({ duration: 180 });
      } else if (event.key === '-') {
        event.preventDefault();
        zoomOut({ duration: 180 });
      } else if (event.key === '0') {
        event.preventDefault();
        const vp = getViewport();
        setViewport({ ...vp, zoom: 1 }, { duration: 300 });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomIn, zoomOut, setViewport, getViewport]);

  return null;
}
