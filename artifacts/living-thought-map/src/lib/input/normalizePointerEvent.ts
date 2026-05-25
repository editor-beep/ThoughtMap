type PointerLikeEvent = {
  clientX?: unknown;
  clientY?: unknown;
  pointerType?: unknown;
};

export function normalizePointerEvent(event: PointerLikeEvent) {
  const rawClientX = typeof event.clientX === 'number' ? event.clientX : Number.NaN;
  const rawClientY = typeof event.clientY === 'number' ? event.clientY : Number.NaN;

  return {
    clientX: Number.isFinite(rawClientX) ? rawClientX : 0,
    clientY: Number.isFinite(rawClientY) ? rawClientY : 0,
    pointerType: typeof event.pointerType === 'string' ? event.pointerType : 'unknown',
  };
}
