import React, { useState, useEffect, useRef } from 'react';
import { useThoughtStore } from '../store';
import type { TerrainId } from '../types';

const TERRAIN_CLASS: Record<TerrainId, string> = {
  'memory-palace':      'terrain-memory-palace',
  'interstellar-plane': 'terrain-interstellar-plane',
  'terrestrial-globe':  'terrain-terrestrial-globe',
  'mythic-landscape':   'terrain-mythic-landscape',
  'the-void':           'terrain-the-void',
};

export default function TerrainBackground() {
  const activeTerrain = useThoughtStore((s) => s.activeTerrain);
  const [displayedTerrain, setDisplayedTerrain] = useState<TerrainId>(activeTerrain);
  const [incomingTerrain, setIncomingTerrain] = useState<TerrainId | null>(null);
  const [incomingVisible, setIncomingVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activeTerrain === displayedTerrain) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    setIncomingTerrain(activeTerrain);
    setIncomingVisible(false);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIncomingVisible(true);
        timerRef.current = setTimeout(() => {
          setDisplayedTerrain(activeTerrain);
          setIncomingTerrain(null);
          setIncomingVisible(false);
        }, 1200);
      });
    });

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [activeTerrain]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: -10 }}>
      <div className={`absolute inset-0 ${TERRAIN_CLASS[displayedTerrain]}`} />
      {incomingTerrain && (
        <div
          className={`absolute inset-0 ${TERRAIN_CLASS[incomingTerrain]}`}
          style={{
            opacity: incomingVisible ? 1 : 0,
            transition: 'opacity 1200ms cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'opacity',
          }}
        />
      )}
    </div>
  );
}
