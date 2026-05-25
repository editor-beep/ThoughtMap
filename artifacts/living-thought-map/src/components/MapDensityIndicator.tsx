import React from 'react';
import { useViewport } from 'reactflow';
import { useDisplayMode } from '../hooks/useDisplayMode';

const MODE_LABELS: Record<string, string> = {
  full:    'Detailed View',
  compact: 'Overview',
  cluster: 'Dense Terrain',
};

const MODE_COLORS: Record<string, string> = {
  full:    '#10b981',
  compact: '#f59e0b',
  cluster: '#a855f7',
};

export default function MapDensityIndicator({ totalNodes, renderedNodes }: { totalNodes: number; renderedNodes: number }) {
  const { zoom } = useViewport();
  const { mode } = useDisplayMode();
  const isDense = totalNodes > 30;

  return (
    <div
      style={{
        background: 'rgba(3,7,18,0.8)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 6,
        padding: '5px 10px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
        color: '#64748b',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: MODE_COLORS[mode] ?? '#64748b',
          flexShrink: 0,
          boxShadow: `0 0 6px ${MODE_COLORS[mode] ?? '#64748b'}`,
        }}
      />
      <span style={{ color: '#94a3b8' }}>{MODE_LABELS[mode]}</span>
      <span style={{ color: '#334155' }}>·</span>
      <span>{totalNodes} total · {renderedNodes} rendered · {zoom.toFixed(2)}x</span>
      {isDense && (
        <>
          <span style={{ color: '#334155' }}>·</span>
          <span style={{ color: '#f59e0b', fontSize: 9 }}>Dense</span>
        </>
      )}
    </div>
  );
}
