import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Viewport } from 'reactflow';
import { DEBUG, IS_DEV } from '../config/debug';
import { normalizePointerEvent } from '../lib/input/normalizePointerEvent';
import type { NodeVisualMode } from '../types/nodeVisualMode';

export type GestureSource = 'wheel' | 'touch' | 'unknown';

/** Snapshot of render state surfaced in the gesture debug log only. */
export interface GestureDebugSnapshot {
  flowNodesLength: number;
  nodeVisualMode: NodeVisualMode;
  rfViewport: Viewport;
  visibleNodesLength: number;
}

export interface CanvasGestures {
  lastGestureSource: GestureSource;
  /** Timestamp of the last touch pointer, used to debounce synthetic mouse events. */
  lastTouchPointerAtRef: React.MutableRefObject<number>;
  handlePointerDiagnostics: (event: React.PointerEvent) => void;
  handleWheelDiagnostics: (event: React.WheelEvent) => void;
}

/**
 * Tracks the gesture source (wheel/touch) and attaches Safari `gesture*`
 * listeners for pinch diagnostics. The native listeners are registered exactly
 * once on mount — re-registering on every viewport tick can drop `gesturestart`
 * during pinch animations on iOS — and read live render state from a ref.
 */
export function useCanvasGestures(
  rfWrapperRef: React.RefObject<HTMLDivElement | null>,
  debugSnapshot: GestureDebugSnapshot,
): CanvasGestures {
  const [lastGestureSource, setLastGestureSource] = useState<GestureSource>('unknown');
  const lastTouchPointerAtRef = useRef(0);

  const handlePointerDiagnostics = useCallback((event: React.PointerEvent) => {
    const normalized = normalizePointerEvent(event);
    if (normalized.pointerType === 'touch') {
      lastTouchPointerAtRef.current = Date.now();
      setLastGestureSource('touch');
    }
    if (IS_DEV && DEBUG.pointerEvents) {
      console.log('[POINTER EVENT]', {
        type: event.type,
        pointerType: normalized.pointerType,
        clientX: normalized.clientX,
        clientY: normalized.clientY,
      });
    }
  }, []);

  const handleWheelDiagnostics = useCallback((event: React.WheelEvent) => {
    setLastGestureSource('wheel');
    if (IS_DEV && DEBUG.pointerEvents) {
      console.log('[WHEEL EVENT]', {
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        ctrlKey: event.ctrlKey,
      });
    }
  }, []);

  // Mirror the latest render snapshot into a ref so the once-registered native
  // listener can log current values without being torn down and re-attached.
  const debugRef = useRef(debugSnapshot);
  debugRef.current = debugSnapshot;

  useEffect(() => {
    const target = rfWrapperRef.current;
    if (!target) return;
    const onGesture = (event: Event) => {
      setLastGestureSource('touch');
      if (IS_DEV && DEBUG.pointerEvents) {
        const { flowNodesLength, nodeVisualMode: mode, rfViewport: vp, visibleNodesLength } = debugRef.current;
        console.group('[ZOOM PIPELINE]');
        console.log('gesture', event.type);
        console.log('viewport', vp);
        console.log('mode', mode);
        console.log('rendered', flowNodesLength, 'visible', visibleNodesLength);
        console.groupEnd();
      }
    };
    target.addEventListener('gesturestart', onGesture, { passive: true });
    target.addEventListener('gesturechange', onGesture, { passive: true });
    target.addEventListener('gestureend', onGesture, { passive: true });
    return () => {
      target.removeEventListener('gesturestart', onGesture);
      target.removeEventListener('gesturechange', onGesture);
      target.removeEventListener('gestureend', onGesture);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { lastGestureSource, lastTouchPointerAtRef, handlePointerDiagnostics, handleWheelDiagnostics };
}
