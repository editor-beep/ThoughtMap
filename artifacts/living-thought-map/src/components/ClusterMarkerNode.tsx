import React, { useState, useMemo } from 'react';
import { useReactFlow } from 'reactflow';
import { ClusterData } from '../lib/clustering';
import { ThoughtNode } from '../types';

const DOT_COLORS: Record<ThoughtNode['type'], string> = {
  thought:       '#c4b5fd',
  joke:          '#f59e0b',
  character:     '#a855f7',
  myth:          '#e879f9',
  research:      '#3b82f6',
  canon:         '#10b981',
  contradiction: '#f43f5e',
  artifact:      '#06b6d4',
  fragment:      '#64748b',
};

const DOT_SHAPES: Record<ThoughtNode['type'], 'circle' | 'diamond'> = {
  thought:       'circle',
  joke:          'circle',
  character:     'circle',
  myth:          'circle',
  research:      'circle',
  canon:         'circle',
  contradiction: 'diamond',
  artifact:      'diamond',
  fragment:      'circle',
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeSlice(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  const sweep = endAngle - startAngle;
  // Clamp to avoid degenerate full-circle paths in SVG
  const clampedEnd = sweep >= 360 ? startAngle + 359.99 : endAngle;
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd   = polarToCartesian(cx, cy, outerR, clampedEnd);
  const innerStart = polarToCartesian(cx, cy, innerR, clampedEnd);
  const innerEnd   = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArc   = sweep > 180 ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}

function SingleDot({ node, onClick }: { node: ThoughtNode; onClick: () => void }) {
  const dotColor = DOT_COLORS[node.type] ?? '#64748b';
  const isDiamond = DOT_SHAPES[node.type] === 'diamond';
  const size = 20;
  const dotSize = 16;
  const offset = (size - dotSize) / 2;

  return (
    <div
      className="relative cursor-pointer"
      style={{ width: size, height: size }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={node.title}
    >
      <div
        style={{
          position: 'absolute',
          top: offset,
          left: offset,
          width: dotSize,
          height: dotSize,
          backgroundColor: dotColor,
          borderRadius: isDiamond ? 0 : '50%',
          transform: isDiamond ? 'rotate(45deg)' : undefined,
          boxShadow: `0 0 10px ${dotColor}99`,
        }}
      />
    </div>
  );
}

export default function ClusterMarkerNode({ data }: { data: { cluster: ClusterData } }) {
  const { cluster } = data;
  const { fitBounds, setCenter } = useReactFlow();
  const [hovered, setHovered] = useState(false);

  const nodeCount = cluster.nodes.length;

  // Single-node clusters revert to a dot marker
  if (nodeCount === 1) {
    const node = cluster.nodes[0];
    const handleClick = () =>
      setCenter(node.x + 10, node.y + 10, { zoom: 0.6, duration: 600 });
    return <SingleDot node={node} onClick={handleClick} />;
  }

  const size = Math.max(32, Math.round(32 + 20 * Math.log(nodeCount)));
  const center = size / 2;
  const outerRadius = center - 3;
  const ringWidth = Math.max(6, Math.round(outerRadius * 0.28));
  const innerRadius = outerRadius - ringWidth;

  const typeCounts: Record<string, number> = useMemo(
    () =>
      cluster.nodes.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    [cluster.nodes]
  );

  const segments = useMemo(() => {
    let startAngle = 0;
    return Object.entries(typeCounts).map(([type, count]) => {
      const fraction = count / nodeCount;
      const sweep = fraction * 360;
      const path = describeSlice(center, center, outerRadius, innerRadius, startAngle, startAngle + sweep);
      const result = { type, path };
      startAngle += sweep;
      return result;
    });
  }, [typeCounts, nodeCount, center, outerRadius, innerRadius]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const xs = cluster.nodes.map((n) => n.x);
    const ys = cluster.nodes.map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const padding = 200;
    fitBounds(
      {
        x: minX - padding,
        y: minY - padding,
        width: Math.max(maxX - minX, 1) + 2 * padding,
        height: Math.max(maxY - minY, 1) + 2 * padding,
      },
      { duration: 600 }
    );
  };

  const tooltipTitles = cluster.nodes.slice(0, 5).map((n) => n.title);
  const overflow = nodeCount - 5;
  const fontSize = Math.max(10, Math.min(16, Math.round(size * 0.28)));

  return (
    <div
      className="relative cursor-pointer"
      style={{ width: size, height: size, overflow: 'visible' }}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg width={size} height={size} style={{ display: 'block', overflow: 'visible' }}>
        {/* Dark background disc */}
        <circle
          cx={center}
          cy={center}
          r={outerRadius}
          fill="#0b0f19"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />
        {/* Segmented type ring */}
        {segments.map(({ type, path }) => (
          <path
            key={type}
            d={path}
            fill={DOT_COLORS[type as ThoughtNode['type']] ?? '#64748b'}
            fillOpacity={hovered ? 0.95 : 0.75}
            style={{ transition: 'fill-opacity 150ms ease' }}
          />
        ))}
        {/* Inner fill to create donut appearance */}
        <circle cx={center} cy={center} r={innerRadius - 1} fill="#0b0f19" />
        {/* Node count */}
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fill={hovered ? '#f1f5f9' : '#cbd5e1'}
          fontSize={fontSize}
          fontFamily="JetBrains Mono, monospace"
          fontWeight="bold"
          style={{ transition: 'fill 150ms ease', userSelect: 'none' }}
        >
          {nodeCount}
        </text>
        {/* Hover glow ring */}
        {hovered && (
          <circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={2}
          />
        )}
      </svg>

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="absolute z-50 bg-void-800 border border-void-700 rounded-md px-3 py-2 text-xs font-mono text-slate-300 shadow-xl pointer-events-none"
          style={{
            bottom: `calc(100% + 8px)`,
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            minWidth: 120,
          }}
        >
          {tooltipTitles.map((title, i) => (
            <div key={i} className="py-0.5 truncate max-w-[200px]">
              {title}
            </div>
          ))}
          {overflow > 0 && (
            <div className="py-0.5 text-slate-500">+{overflow} more</div>
          )}
        </div>
      )}
    </div>
  );
}
