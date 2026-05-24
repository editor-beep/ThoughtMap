import React from 'react';
import { useDisplayMode, ZOOM_THRESHOLDS } from '../hooks/useDisplayMode';

/** Temporary debug overlay — remove from SpatialCanvas once threshold tuning is done. */
export default function DebugZoom() {
  const { mode, zoom } = useDisplayMode();

  const modeColors: Record<string, string> = {
    full:    '#10b981',
    dot:     '#f59e0b',
    cluster: '#a855f7',
  };

  return (
    <div
      style={{
        background: 'rgba(3,7,18,0.85)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 6,
        padding: '6px 10px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
        color: '#94a3b8',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div>
        <span style={{ color: '#475569' }}>zoom </span>
        <span style={{ color: '#f1f5f9' }}>{zoom.toFixed(3)}</span>
      </div>
      <div>
        <span style={{ color: '#475569' }}>mode </span>
        <span style={{ color: modeColors[mode], fontWeight: 'bold' }}>{mode.toUpperCase()}</span>
      </div>
      <div style={{ color: '#334155', fontSize: 9 }}>
        full&gt;{ZOOM_THRESHOLDS.FULL} · dot&gt;{ZOOM_THRESHOLDS.DOT} · cluster&lt;{ZOOM_THRESHOLDS.CLUSTER}
      </div>
    </div>
  );
}
