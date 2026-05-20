import React, { useState, useEffect, useRef } from 'react';
import { useThoughtStore } from '../store';
import type { TerrainId } from '../types';
import TerrainCanvas from './TerrainCanvas';

export default function TerrainBackground() {
  const activeTerrain = useThoughtStore((s) => s.activeTerrain);
  const [displayedTerrain, setDisplayedTerrain] = useState<TerrainId>(activeTerrain);
  const [incomingTerrain, setIncomingTerrain] = useState<TerrainId | null>(null);
  const [incomingOpacity, setIncomingOpacity] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activeTerrain === displayedTerrain) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    setIncomingTerrain(activeTerrain);
    setIncomingOpacity(0);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIncomingOpacity(1);
        timerRef.current = setTimeout(() => {
          setDisplayedTerrain(activeTerrain);
          setIncomingTerrain(null);
          setIncomingOpacity(0);
        }, 1500);
      });
    });

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [activeTerrain]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: -10 }}>
      <TerrainCanvas terrain={displayedTerrain} />
      {incomingTerrain && (
        <TerrainCanvas
          terrain={incomingTerrain}
          style={{
            opacity: incomingOpacity,
            transition: 'opacity 1500ms cubic-bezier(0.4,0,0.2,1)',
            willChange: 'opacity',
          }}
        />
      )}
    </div>
  );
}
