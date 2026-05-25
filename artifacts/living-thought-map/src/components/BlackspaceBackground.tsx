import React from 'react';
import type { Viewport } from 'reactflow';

interface BlackspaceBackgroundProps {
  viewport: Viewport;
}

export default function BlackspaceBackground({ viewport }: BlackspaceBackgroundProps) {
  const driftX = ((viewport.x * 0.015) % 160 + 160) % 160;
  const driftY = ((viewport.y * 0.015) % 160 + 160) % 160;

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#020305]">
      <div
        className="absolute inset-[-18%]"
        style={{
          background:
            'radial-gradient(1200px 900px at 22% 18%, rgba(18, 45, 78, 0.17), transparent 72%), radial-gradient(1000px 760px at 78% 70%, rgba(68, 20, 96, 0.14), transparent 74%), radial-gradient(900px 660px at 50% 50%, rgba(6, 10, 20, 0.92), rgba(2, 3, 5, 0.98) 78%)',
          transform: `translate3d(${driftX * -0.4}px, ${driftY * -0.35}px, 0)`,
          transition: 'transform 180ms linear',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.08,
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(148, 163, 184, 0.32) 0.7px, transparent 1px), radial-gradient(circle at 70% 60%, rgba(125, 211, 252, 0.2) 0.7px, transparent 1px)',
          backgroundSize: '160px 160px, 220px 220px',
          backgroundPosition: `${driftX}px ${driftY}px, ${-driftX * 0.8}px ${-driftY * 0.9}px`,
        }}
      />
    </div>
  );
}
