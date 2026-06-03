import { useEffect } from 'react';
import { DEBUG, IS_DEV } from '../config/debug';

/**
 * Canvas-level keyboard shortcuts:
 * - Escape / Cmd+Ctrl+ArrowUp -> exit to the parent map
 * - Shift+D (dev only) -> toggle debug overlays
 */
export function useCanvasHotkeys(exitToParent: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const isCmdCtrl = event.metaKey || event.ctrlKey;
      if (event.key === 'Escape' || (isCmdCtrl && event.key === 'ArrowUp')) {
        event.preventDefault();
        exitToParent();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exitToParent]);

  useEffect(() => {
    if (!IS_DEV) return;
    const onDebugHotkey = (event: KeyboardEvent) => {
      if (event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        DEBUG.overlays = !DEBUG.overlays;
      }
    };
    window.addEventListener('keydown', onDebugHotkey);
    return () => window.removeEventListener('keydown', onDebugHotkey);
  }, []);
}
