import React, { useEffect, useRef, useState } from 'react';

interface Dims { w: number; h: number }

export default function GlobeSanctum({ style }: { style?: React.CSSProperties }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<Dims>({ w: 800, h: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setDims({ w: el.offsetWidth || 800, h: el.offsetHeight || 600 });
    });
    ro.observe(el);
    setDims({ w: el.offsetWidth || 800, h: el.offsetHeight || 600 });
    return () => ro.disconnect();
  }, []);

  const { w, h } = dims;
  const cx = w * 0.57;
  const cy = h * 0.48;
  const r  = Math.min(w, h) * 0.48;
  const haloR = r * 1.14;

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...style }}
    >
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', inset: 0, display: 'block' }}
      >
        <defs>
          {/* Sphere gradient: dark core → bright limb */}
          <radialGradient
            id="gs-sphere-grad"
            gradientUnits="userSpaceOnUse"
            cx={cx}
            cy={cy}
            r={r}
          >
            <stop offset="0%"   stopColor="#050D1A" stopOpacity="1" />
            <stop offset="55%"  stopColor="#0D1F2D" stopOpacity="1" />
            <stop offset="78%"  stopColor="#2E8B8B" stopOpacity="1" />
            <stop offset="92%"  stopColor="#5ABABA" stopOpacity="1" />
            <stop offset="100%" stopColor="#7FFFD4" stopOpacity="0.9" />
          </radialGradient>

          {/* Outer halo gradient: transparent inside, peaks just outside sphere edge */}
          <radialGradient
            id="gs-halo-grad"
            gradientUnits="userSpaceOnUse"
            cx={cx}
            cy={cy}
            r={haloR}
          >
            <stop offset="0%"   stopColor="#7FFFD4" stopOpacity="0" />
            <stop offset="80%"  stopColor="#7FFFD4" stopOpacity="0" />
            <stop offset="88%"  stopColor="#7FFFD4" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#7FFFD4" stopOpacity="0" />
          </radialGradient>

          {/* Blur filter for the outer halo softness */}
          <filter id="gs-halo-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* Background */}
        <rect width="100%" height="100%" fill="#050D1A" />

        {/* Outer atmospheric halo — rendered behind sphere */}
        <circle
          cx={cx}
          cy={cy}
          r={haloR}
          fill="url(#gs-halo-grad)"
          filter="url(#gs-halo-blur)"
        />

        {/* Planetary shell with limb-brightening atmospheric gradient */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="url(#gs-sphere-grad)"
        />
      </svg>
    </div>
  );
}
