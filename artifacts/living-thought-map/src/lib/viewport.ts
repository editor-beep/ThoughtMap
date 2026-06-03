import type { Viewport } from 'reactflow';
import { isFinitePosition } from './nodeVisualMode';

export const FALLBACK_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };
export const FALLBACK_POSITION = { x: 0, y: 0 };

export function isValidViewport(vp: Viewport): boolean {
  return Number.isFinite(vp.x) && Number.isFinite(vp.y) && Number.isFinite(vp.zoom) && vp.zoom > 0;
}

export function clampZoom(zoom: number, minZoom: number, maxZoom: number): number {
  if (!Number.isFinite(zoom)) return minZoom;
  return Math.max(minZoom, Math.min(maxZoom, zoom));
}

export function sanitizeViewport(vp: Viewport, minZoom: number, maxZoom: number, fallback: Viewport): Viewport {
  const safeZoom = clampZoom(vp.zoom, minZoom, maxZoom);
  const safeX = Number.isFinite(vp.x) ? vp.x : fallback.x;
  const safeY = Number.isFinite(vp.y) ? vp.y : fallback.y;
  if (!Number.isFinite(safeZoom)) return fallback;
  return { x: safeX, y: safeY, zoom: safeZoom };
}

export function toSafePosition(nodeId: string, x: number, y: number) {
  if (isFinitePosition(x, y)) return { x, y };
  console.error('[INVALID NODE POSITION]', nodeId, { x, y, fallback: FALLBACK_POSITION });
  return FALLBACK_POSITION;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isValidXYPosition(pos: unknown): pos is { x: number; y: number } {
  return (
    !!pos &&
    typeof pos === 'object' &&
    isFiniteNumber((pos as { x?: unknown }).x) &&
    isFiniteNumber((pos as { y?: unknown }).y)
  );
}
