import React, { useEffect, useRef, useState } from 'react';

// ─── Seeded PRNG (Park-Miller LCG) ────────────────────────────────────────────
function makeRand(seed: number) {
  let s = seed | 0;
  return () => {
    s = Math.imul(48271, s) | 0;
    return (s >>> 0) / 0x100000000;
  };
}

// ─── Star data (fractional 0-1 coords, computed once at module load) ──────────
const STAR_COLORS = ['#D8EEF0', '#C4DDE0', '#E8F4F6', '#B8D4D8'] as const;

interface Star { fx: number; fy: number; r: number; op: number; color: string }

function generateStars(): Star[] {
  const rand = makeRand(0xA3F7);
  const pick = () => STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)];
  const stars: Star[] = [];

  // Distant ~140: 14×10 grid with jitter
  const cols = 14, rows = 10;
  for (let i = 0; i < cols * rows; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    stars.push({
      fx:    (col + 0.08 + rand() * 0.84) / cols,
      fy:    (row + 0.08 + rand() * 0.84) / rows,
      r:     0.4 + rand() * 0.2,
      op:    0.2 + rand() * 0.15,
      color: pick(),
    });
  }

  // Mid ~55: scattered
  for (let i = 0; i < 55; i++) {
    stars.push({
      fx:    0.02 + rand() * 0.96,
      fy:    0.02 + rand() * 0.96,
      r:     0.8 + rand() * 0.2,
      op:    0.4 + rand() * 0.15,
      color: pick(),
    });
  }

  // Near ~15: scattered
  for (let i = 0; i < 15; i++) {
    stars.push({
      fx:    0.02 + rand() * 0.96,
      fy:    0.02 + rand() * 0.96,
      r:     1.2 + rand() * 0.4,
      op:    0.6 + rand() * 0.15,
      color: pick(),
    });
  }

  // Anchor: 4 large stars, hand-placed to avoid clustering
  const anchors: [number, number][] = [
    [0.10, 0.14], [0.84, 0.21], [0.22, 0.81], [0.73, 0.68],
  ];
  for (const [fx, fy] of anchors) {
    stars.push({ fx, fy, r: 2.0 + rand() * 0.5, op: 0.70 + rand() * 0.15, color: '#E8F4F6' });
  }

  return stars;
}

// Computed once at module load — never re-randomises
const STARS = generateStars();

// ─── Component ────────────────────────────────────────────────────────────────
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
  const cx    = w * 0.57;
  const cy    = h * 0.48;
  const r     = Math.min(w, h) * 0.48;
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
          {/* L1 — sphere gradient: dark core → bright limb */}
          <radialGradient id="gs-sphere-grad" gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={r}>
            <stop offset="0%"   stopColor="#050D1A" stopOpacity="1" />
            <stop offset="55%"  stopColor="#0D1F2D" stopOpacity="1" />
            <stop offset="78%"  stopColor="#2E8B8B" stopOpacity="1" />
            <stop offset="92%"  stopColor="#5ABABA" stopOpacity="1" />
            <stop offset="100%" stopColor="#7FFFD4" stopOpacity="0.9" />
          </radialGradient>

          {/* L1 — outer halo gradient */}
          <radialGradient id="gs-halo-grad" gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={haloR}>
            <stop offset="0%"   stopColor="#7FFFD4" stopOpacity="0" />
            <stop offset="80%"  stopColor="#7FFFD4" stopOpacity="0" />
            <stop offset="88%"  stopColor="#7FFFD4" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#7FFFD4" stopOpacity="0" />
          </radialGradient>

          {/* L1 — halo blur */}
          <filter id="gs-halo-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>

          {/* L4 — volumetric haze gradients */}
          <radialGradient id="gs-fog-cyan-a" gradientUnits="userSpaceOnUse" cx={cx + r * 0.30} cy={cy - r * 0.36} r={r * 0.72}>
            <stop offset="0%" stopColor="#7FFFD4" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#7FFFD4" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="gs-fog-green-b" gradientUnits="userSpaceOnUse" cx={cx - r * 0.18} cy={cy + r * 0.14} r={r * 0.62}>
            <stop offset="0%" stopColor="#3D6B5A" stopOpacity="0.11" />
            <stop offset="100%" stopColor="#3D6B5A" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="gs-fog-navy-c" gradientUnits="userSpaceOnUse" cx={cx - r * 0.12} cy={cy + r * 0.20} r={r * 0.74}>
            <stop offset="0%" stopColor="#050D1A" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#050D1A" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="gs-fog-cyan-d" gradientUnits="userSpaceOnUse" x1={cx - r * 0.72} y1={cy - r * 0.12} x2={cx + r * 0.58} y2={cy + r * 0.44}>
            <stop offset="0%" stopColor="#7FFFD4" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#7FFFD4" stopOpacity="0" />
          </linearGradient>

          {/* L4 — clip to sphere boundary */}
          <clipPath id="gs-planet-clip">
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
        </defs>

        {/* ── Background ── */}
        <rect width="100%" height="100%" fill="#050D1A" />

        {/* ── L2: Starfield (behind planetary shell) ── */}
        <g id="gs-starfield">
          {STARS.map((s, i) => (
            <circle
              key={i}
              cx={s.fx * w}
              cy={s.fy * h}
              r={s.r}
              fill={s.color}
              opacity={s.op}
            />
          ))}
        </g>

        {/* ── L1: Outer atmospheric halo ── */}
        <circle cx={cx} cy={cy} r={haloR} fill="url(#gs-halo-grad)" filter="url(#gs-halo-blur)" />

        {/* ── L1: Planetary shell ── */}
        <circle cx={cx} cy={cy} r={r} fill="url(#gs-sphere-grad)" />

        {/* ── L4: Volumetric fog & internal atmospheric haze ── */}
        <g id="gs-volumetric-fog" clipPath="url(#gs-planet-clip)">
          <ellipse
            cx={cx + r * 0.28}
            cy={cy - r * 0.33}
            rx={r * 0.62}
            ry={r * 0.38}
            fill="url(#gs-fog-cyan-a)"
          />
          <ellipse
            cx={cx - r * 0.22}
            cy={cy + r * 0.09}
            rx={r * 0.54}
            ry={r * 0.31}
            fill="url(#gs-fog-green-b)"
          />
          <ellipse
            cx={cx - r * 0.11}
            cy={cy + r * 0.21}
            rx={r * 0.67}
            ry={r * 0.47}
            fill="url(#gs-fog-navy-c)"
          />
          <ellipse
            cx={cx + r * 0.06}
            cy={cy - r * 0.05}
            rx={r * 0.77}
            ry={r * 0.42}
            fill="url(#gs-fog-cyan-d)"
            opacity={0.9}
          />
        </g>
      </svg>
    </div>
  );
}
