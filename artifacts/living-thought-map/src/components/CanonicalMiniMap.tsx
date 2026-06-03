import React, { useMemo, useEffect, useCallback } from 'react';
import { useReactFlow, Viewport } from 'reactflow';
import { DEBUG, IS_DEV } from '../config/debug';
import { NODE_TYPE_COLORS } from '../lib/canvasTheme';
import { HUD_LAYERS, HUD_SPACING } from '../constants/hudLayout';

const MINIMAP_SIZE = 180;
const MINIMAP_PADDING = 24;

/**
 * A self-contained minimap overlay. Renders nodes/edges in a fixed-size SVG and
 * lets the user click to recenter the canvas. Operates purely on logical (flow)
 * coordinates so it stays correct across every zoom mode.
 */
export default function CanonicalMiniMap({ nodes, edges, viewport, wrapperRef }: {
  nodes: { id: string; x: number; y: number; type: string }[];
  edges: { source: string; target: string }[];
  viewport: Viewport;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { setViewport } = useReactFlow();
  const nodePositions = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const worldBounds = useMemo(() => {
    if (!nodes.length) return { minX: -100, maxX: 100, minY: -100, maxY: 100 };
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  }, [nodes]);
  const worldWidth = Math.max(worldBounds.maxX - worldBounds.minX, 1);
  const worldHeight = Math.max(worldBounds.maxY - worldBounds.minY, 1);
  const scale = Math.min((MINIMAP_SIZE - MINIMAP_PADDING) / worldWidth, (MINIMAP_SIZE - MINIMAP_PADDING) / worldHeight);
  const offsetX = (MINIMAP_SIZE - worldWidth * scale) / 2;
  const offsetY = (MINIMAP_SIZE - worldHeight * scale) / 2;
  const toMini = useCallback((x: number, y: number) => ({ x: offsetX + (x - worldBounds.minX) * scale, y: offsetY + (y - worldBounds.minY) * scale }), [offsetX, offsetY, scale, worldBounds.minX, worldBounds.minY]);
  const viewportWorld = useMemo(() => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 1;
    const height = rect?.height ?? 1;
    return { minX: -viewport.x / viewport.zoom, minY: -viewport.y / viewport.zoom, width: width / viewport.zoom, height: height / viewport.zoom };
  }, [viewport, wrapperRef]);
  const viewportMini = useMemo(() => {
    const topLeft = toMini(viewportWorld.minX, viewportWorld.minY);
    return { x: topLeft.x, y: topLeft.y, width: viewportWorld.width * scale, height: viewportWorld.height * scale };
  }, [toMini, viewportWorld, scale]);
  const onMiniMapInteract = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const miniX = event.clientX - rect.left;
    const miniY = event.clientY - rect.top;
    const worldX = worldBounds.minX + (miniX - offsetX) / scale;
    const worldY = worldBounds.minY + (miniY - offsetY) / scale;
    const wrapper = wrapperRef.current?.getBoundingClientRect();
    const screenWidth = wrapper?.width ?? 1;
    const screenHeight = wrapper?.height ?? 1;
    setViewport({ x: -(worldX - screenWidth / (2 * viewport.zoom)) * viewport.zoom, y: -(worldY - screenHeight / (2 * viewport.zoom)) * viewport.zoom, zoom: viewport.zoom }, { duration: 120 });
  }, [offsetX, offsetY, scale, setViewport, viewport.zoom, worldBounds.minX, worldBounds.minY, wrapperRef]);

  useEffect(() => {
    if (IS_DEV && DEBUG.minimap) console.log('[MINIMAP]', { totalNodes: nodes.length, worldBounds, camera: viewport });
  }, [nodes.length, worldBounds, viewport]);

  return (
    <div className="absolute" style={{ right: HUD_SPACING, bottom: HUD_SPACING, zIndex: HUD_LAYERS.minimap }}>
      <svg width={MINIMAP_SIZE} height={MINIMAP_SIZE} viewBox={`0 0 ${MINIMAP_SIZE} ${MINIMAP_SIZE}`} className="rounded border border-void-700 bg-[#0b0f19] pointer-events-auto" onPointerDown={onMiniMapInteract}>
        {edges.map((edge, i) => {
          const source = nodePositions.get(edge.source);
          const target = nodePositions.get(edge.target);
          if (!source || !target) return null;
          const s = toMini(source.x, source.y);
          const t = toMini(target.x, target.y);
          return <line key={`${edge.source}-${edge.target}-${i}`} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="#334155" strokeWidth={0.7} />;
        })}
        {nodes.map((node) => {
          const p = toMini(node.x, node.y);
          return <circle key={node.id} cx={p.x} cy={p.y} r={1.8} fill={NODE_TYPE_COLORS[node.type] ?? '#1e293b'} />;
        })}
        <rect x={viewportMini.x} y={viewportMini.y} width={viewportMini.width} height={viewportMini.height} fill="rgba(3,7,18,0.4)" stroke="#38bdf8" strokeWidth={1} />
      </svg>
    </div>
  );
}
