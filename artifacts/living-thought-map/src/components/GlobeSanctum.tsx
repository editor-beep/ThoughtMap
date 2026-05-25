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

// ─── L7: Glyph system (module-level constant — stable across renders) ─────────
type GlyphKind = 'circle' | 'crosshair' | 'diamond' | 'triangle' | 'symbol' | 'annotation';

interface GlyphDef {
  kind:       GlyphKind;
  fx:         number;   // fractional viewport x (0-1)
  fy:         number;   // fractional viewport y (0-1)
  size:       number;   // px
  op:         number;   // opacity 0.1-0.2
  col:        string;
  char?:      string;   // symbol glyphs only
  angle?:     number;   // annotation fragments — degrees
  len?:       number;   // annotation fragments — px
  terminals?: 'start' | 'end' | 'both';
}

const GLYPHS: GlyphDef[] = [
  // ── Geometric marks (10) ──
  // Scattered: some outside sphere (corners/margins), some inside
  { kind: 'circle',     fx: 0.08, fy: 0.20, size: 2.0, op: 0.16, col: '#7FFFD4' },
  { kind: 'circle',     fx: 0.93, fy: 0.37, size: 1.8, op: 0.14, col: '#3D6B5A' },
  { kind: 'circle',     fx: 0.37, fy: 0.91, size: 2.2, op: 0.15, col: '#7FFFD4' },
  { kind: 'crosshair',  fx: 0.16, fy: 0.55, size: 7,   op: 0.13, col: '#3D6B5A' },
  { kind: 'crosshair',  fx: 0.85, fy: 0.72, size: 8,   op: 0.13, col: '#7FFFD4' },
  { kind: 'crosshair',  fx: 0.51, fy: 0.17, size: 6,   op: 0.14, col: '#3D6B5A' },
  { kind: 'diamond',    fx: 0.72, fy: 0.14, size: 5,   op: 0.15, col: '#7FFFD4' },
  { kind: 'diamond',    fx: 0.11, fy: 0.79, size: 6,   op: 0.13, col: '#3D6B5A' },
  { kind: 'triangle',   fx: 0.65, fy: 0.86, size: 7,   op: 0.14, col: '#7FFFD4' },
  { kind: 'triangle',   fx: 0.27, fy: 0.05, size: 5,   op: 0.12, col: '#3D6B5A' },
  // ── Symbolic glyphs (5) — Unicode marks suggesting instrument or notation ──
  { kind: 'symbol', char: '⊕', fx: 0.17, fy: 0.33, size: 10, op: 0.13, col: '#7FFFD4' },
  { kind: 'symbol', char: '⊗', fx: 0.89, fy: 0.57, size:  9, op: 0.15, col: '#3D6B5A' },
  { kind: 'symbol', char: '∇', fx: 0.42, fy: 0.73, size: 11, op: 0.12, col: '#7FFFD4' },
  { kind: 'symbol', char: '⌖', fx: 0.76, fy: 0.41, size: 12, op: 0.12, col: '#3D6B5A' },
  { kind: 'symbol', char: '⊙', fx: 0.06, fy: 0.67, size: 10, op: 0.13, col: '#7FFFD4' },
  // ── Annotation fragments (4) — line + perpendicular terminal marks ──
  { kind: 'annotation', fx: 0.04, fy: 0.44, angle:   0, len: 22, terminals: 'start', op: 0.15, col: '#7FFFD4' },
  { kind: 'annotation', fx: 0.57, fy: 0.04, angle: -35, len: 18, terminals: 'both',  op: 0.15, col: '#3D6B5A' },
  { kind: 'annotation', fx: 0.97, fy: 0.25, angle:  90, len: 15, terminals: 'end',   op: 0.15, col: '#7FFFD4' },
  { kind: 'annotation', fx: 0.45, fy: 0.97, angle: 160, len: 20, terminals: 'start', op: 0.15, col: '#3D6B5A' },
];

function renderGlyph(g: GlyphDef, w: number, h: number, i: number): React.ReactNode {
  const x = g.fx * w;
  const y = g.fy * h;

  switch (g.kind) {
    case 'circle':
      return <circle key={i} cx={x} cy={y} r={g.size} fill="none" stroke={g.col} strokeWidth="0.5" opacity={g.op} />;

    case 'crosshair':
      return (
        <g key={i} transform={`translate(${x}, ${y})`} stroke={g.col} strokeWidth="0.5" opacity={g.op}>
          <line x1={-g.size} y1={0} x2={g.size} y2={0} />
          <line x1={0} y1={-g.size} x2={0} y2={g.size} />
          <circle cx={0} cy={0} r={1} fill={g.col} stroke="none" />
        </g>
      );

    case 'diamond':
      return (
        <path key={i}
          d={`M ${x},${y - g.size} L ${x + g.size * 0.55},${y} L ${x},${y + g.size} L ${x - g.size * 0.55},${y} Z`}
          stroke={g.col} strokeWidth="0.5" fill="none" opacity={g.op}
        />
      );

    case 'triangle':
      return (
        <path key={i}
          d={`M ${x},${y - g.size} L ${x + g.size * 0.866},${y + g.size * 0.5} L ${x - g.size * 0.866},${y + g.size * 0.5} Z`}
          stroke={g.col} strokeWidth="0.5" fill="none" opacity={g.op}
        />
      );

    case 'symbol':
      return (
        <text key={i} x={x} y={y} fontSize={g.size} fill={g.col} opacity={g.op}
          fontFamily="monospace" textAnchor="middle" dominantBaseline="central">
          {g.char}
        </text>
      );

    case 'annotation': {
      const len  = g.len ?? 18;
      const term = 3;
      const showStart = g.terminals === 'start' || g.terminals === 'both';
      const showEnd   = g.terminals === 'end'   || g.terminals === 'both';
      return (
        <g key={i} transform={`translate(${x}, ${y}) rotate(${g.angle ?? 0})`}
           stroke={g.col} strokeWidth="0.4" opacity={g.op} strokeLinecap="square">
          <line x1={0} y1={0} x2={len} y2={0} />
          {showStart && <line x1={0}   y1={-term} x2={0}   y2={term} />}
          {showEnd   && <line x1={len} y1={-term} x2={len} y2={term} />}
        </g>
      );
    }

    default:
      return null;
  }
}

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


  const tickData = [
    { a: -154, kind: 'major' }, { a: -146, kind: 'minor' }, { a: -138, kind: 'minor' }, { a: -131, kind: 'major' },
    { a: -124, kind: 'minor' }, { a: -96, kind: 'major' }, { a: -90, kind: 'minor' }, { a: -84, kind: 'minor' },
    { a: -79, kind: 'major' }, { a: -72, kind: 'minor' }, { a: -41, kind: 'major' }, { a: -36, kind: 'minor' },
    { a: -30, kind: 'minor' }, { a: -25, kind: 'major' }, { a: -6, kind: 'minor' }, { a: 2, kind: 'major' },
    { a: 8, kind: 'minor' }, { a: 17, kind: 'minor' }, { a: 23, kind: 'major' }, { a: 47, kind: 'minor' },
    { a: 53, kind: 'major' }, { a: 60, kind: 'minor' }, { a: 67, kind: 'minor' }, { a: 75, kind: 'major' },
    { a: 111, kind: 'major' }, { a: 119, kind: 'minor' }, { a: 126, kind: 'minor' }, { a: 134, kind: 'major' },
    { a: 142, kind: 'minor' },
  ] as const;

  const coordinateLabels = [
    { x: -0.72, y: -0.56, t: '47.2' },
    { x: -0.58, y: -0.34, t: 'C-9' },
    { x: -0.36, y: -0.63, t: '∆04' },
    { x: -0.17, y: -0.29, t: 'REF-7' },
    { x: 0.11, y: -0.49, t: '3A.17' },
    { x: 0.42, y: -0.28, t: 'Z-13' },
    { x: 0.66, y: -0.07, t: 'K2' },
    { x: 0.36, y: 0.17, t: '91.0' },
    { x: 0.06, y: 0.34, t: 'C-77' },
    { x: -0.29, y: 0.52, t: 'REF...' },
    { x: -0.56, y: 0.18, t: '∆19' },
  ] as const;

  const sectorLabels = [
    { x: -0.44, y: -0.12, t: '[SECTOR 7]' },
    { x: 0.24, y: -0.02, t: '[NULL ZONE]' },
    { x: -0.12, y: 0.29, t: '[REG-4]' },
    { x: 0.43, y: 0.37, t: '[DEEP]' },
  ] as const;

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
        <style>{`
          @keyframes gs-halo-breathe {
            from { opacity: 0.7; }
            to { opacity: 1; }
          }

          @keyframes gs-ring-drift-cw {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes gs-ring-drift-ccw {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
          }

          @keyframes gs-sector-drift-a {
            from { transform: translate(0px, 0px); }
            to { transform: translate(4px, -3px); }
          }

          @keyframes gs-sector-drift-b {
            from { transform: translate(0px, 0px); }
            to { transform: translate(-3px, 4px); }
          }

          @keyframes gs-sector-drift-c {
            from { transform: translate(0px, 0px); }
            to { transform: translate(5px, 1px); }
          }

          #gs-halo-pulse {
            animation: gs-halo-breathe 7s ease-in-out infinite alternate;
          }

          #gs-ring-drift-cw {
            transform-origin: ${cx}px ${cy}px;
            animation: gs-ring-drift-cw 150s linear infinite;
          }

          #gs-ring-drift-ccw {
            transform-origin: ${cx}px ${cy}px;
            animation: gs-ring-drift-ccw 132s linear infinite;
          }

          #gs-sector-drift-a { animation: gs-sector-drift-a 24s ease-in-out infinite alternate; }
          #gs-sector-drift-b { animation: gs-sector-drift-b 27s ease-in-out infinite alternate; }
          #gs-sector-drift-c { animation: gs-sector-drift-c 22s ease-in-out infinite alternate; }

          #gs-noise-layer-a { animation: gs-noise-crossfade-a 10s ease-in-out infinite alternate; }
          #gs-noise-layer-b { animation: gs-noise-crossfade-b 10s ease-in-out infinite alternate; }

          @keyframes gs-noise-crossfade-a { from { opacity: 0.042; } to { opacity: 0.028; } }
          @keyframes gs-noise-crossfade-b { from { opacity: 0.026; } to { opacity: 0.042; } }

          @media (prefers-reduced-motion: reduce) {
            #gs-halo-pulse,
            #gs-ring-drift-cw,
            #gs-ring-drift-ccw,
            #gs-sector-drift-a,
            #gs-sector-drift-b,
            #gs-sector-drift-c,
            #gs-noise-layer-a,
            #gs-noise-layer-b {
              animation: none !important;
            }
          }
        `}</style>

        <defs>
          <filter id="gs-phosphor-soften" x="-2%" y="-2%" width="104%" height="104%">
            <feGaussianBlur stdDeviation="0.38" />
          </filter>

          <filter id="gs-noise-overlay-a" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise">
              <animate attributeName="seed" values="13;17;23" keyTimes="0;0.5;1" dur="10s" repeatCount="indefinite" />
            </feTurbulence>
            <feBlend in="SourceGraphic" in2="noise" mode="overlay" />
          </filter>

          <filter id="gs-noise-overlay-b" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise">
              <animate attributeName="seed" values="31;37;41" keyTimes="0;0.5;1" dur="10s" begin="5s" repeatCount="indefinite" />
            </feTurbulence>
            <feBlend in="SourceGraphic" in2="noise" mode="overlay" />
          </filter>

          <radialGradient id="gs-edge-vignette" cx="50%" cy="50%" r="72%">
            <stop offset="0%" stopColor="#050D1A" stopOpacity="0" />
            <stop offset="70%" stopColor="#050D1A" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#050D1A" stopOpacity="1" />
          </radialGradient>

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

          {/* L6 — sphere clipping for instrumentation */}
          <clipPath id="gs-sphere-clip">
            <circle cx={cx} cy={cy} r={r * 0.985} />
          </clipPath>

          {/* L1 — halo blur */}
          <filter id="gs-halo-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <g id="gs-main-composition" filter="url(#gs-phosphor-soften)">
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

        {/* ── L3: Orbital rings behind shell ── */}
        <g id="gs-rings-behind" fill="none" strokeLinecap="round">
          {/* Primary orbital rings */}
          <g id="gs-ring-drift-cw">
            <ellipse cx={cx} cy={cy} rx={r * 1.08} ry={r * 0.44} transform={`rotate(19 ${cx} ${cy})`} stroke="#7FFFD4" strokeWidth="0.7" opacity="0.29" />
          </g>
          <g id="gs-ring-drift-ccw">
            <ellipse cx={cx} cy={cy} rx={r * 0.88} ry={r * 0.36} transform={`rotate(52 ${cx} ${cy})`} stroke="#4A7C8E" strokeWidth="0.76" opacity="0.31" />
          </g>

          {/* Partial arcs */}
          <path d={`M ${cx - r * 0.72} ${cy - r * 0.10} A ${r * 0.94} ${r * 0.40} 33 0 1 ${cx + r * 0.58} ${cy + r * 0.20}`} stroke="#7FFFD4" strokeWidth="0.66" opacity="0.26" />
          <path d={`M ${cx - r * 0.34} ${cy + r * 0.58} A ${r * 0.82} ${r * 0.34} -48 0 1 ${cx + r * 0.40} ${cy - r * 0.47}`} stroke="#4A7C8E" strokeWidth="0.7" opacity="0.22" />

          {/* Broken trajectories */}
          <ellipse cx={cx} cy={cy} rx={r * 1.20} ry={r * 0.30} transform={`rotate(68 ${cx} ${cy})`} stroke="#7FFFD4" strokeWidth="0.64" opacity="0.18" strokeDasharray="4 7 1 5 2 9" />
          <ellipse cx={cx} cy={cy} rx={r * 0.64} ry={r * 0.24} transform={`rotate(34 ${cx} ${cy})`} stroke="#4A7C8E" strokeWidth="0.62" opacity="0.2" strokeDasharray="6 3 2 8 1 6" />
        </g>

        {/* ── L1: Planetary shell ── */}
        <circle cx={cx} cy={cy} r={r} fill="url(#gs-sphere-grad)" />

        {/* ── L3: Orbital rings crossing through shell (impossible geometry) ── */}
        <g id="gs-rings-front" fill="none" strokeLinecap="round">
          {/* Primary near-full crossing ring */}
          <ellipse cx={cx} cy={cy} rx={r * 1.03} ry={r * 0.38} transform={`rotate(73 ${cx} ${cy})`} stroke="#7FFFD4" strokeWidth="0.72" opacity="0.27" />

          {/* Partial arc with abrupt terminal (no fade) */}
          <path d={`M ${cx - r * 0.22} ${cy + r * 0.74} A ${r * 0.90} ${r * 0.26} -63 0 1 ${cx + r * 0.64} ${cy - r * 0.22}`} stroke="#4A7C8E" strokeWidth="0.68" opacity="0.24" />
        </g>

        {/* ── L6: Measurement overlays and coordinate instrumentation ── */}
        <g id="gs-instrumentation" fill="none">
          {/* Circumference tick marks — irregular clusters and gaps */}
          <g stroke="#4A7C8E" strokeWidth="0.5" strokeOpacity="0.38" strokeLinecap="round">
            {tickData.map((tick, i) => {
              const major = tick.kind === 'major';
              const len = major ? r * 0.024 : r * 0.011;
              const a = (tick.a * Math.PI) / 180;
              const x1 = cx + Math.cos(a) * (r * 0.99);
              const y1 = cy + Math.sin(a) * (r * 0.99);
              const x2 = cx + Math.cos(a) * (r * 0.99 + len);
              const y2 = cy + Math.sin(a) * (r * 0.99 + len);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} opacity={major ? 0.42 : 0.3} />;
            })}
          </g>

          {/* Projected axis lines and textual overlays inside the sphere */}
          <g clipPath="url(#gs-sphere-clip)">
            <g stroke="#7FFFD4" strokeWidth="0.4" strokeOpacity="0.16" strokeDasharray="1.8 3.2" strokeLinecap="round">
              <path d={`M ${cx - r * 0.84} ${cy - r * 0.12} Q ${cx - r * 0.16} ${cy - r * 0.31}, ${cx + r * 0.77} ${cy - r * 0.11}`} />
              <path d={`M ${cx - r * 0.71} ${cy + r * 0.33} Q ${cx + r * 0.02} ${cy + r * 0.09}, ${cx + r * 0.78} ${cy + r * 0.26}`} />
              <path d={`M ${cx - r * 0.21} ${cy - r * 0.72} Q ${cx + r * 0.08} ${cy - r * 0.06}, ${cx + r * 0.24} ${cy + r * 0.68}`} opacity="0.11" />
            </g>

            <g fill="#7FFFD4" fontFamily="'IBM Plex Mono', 'Menlo', monospace" textRendering="geometricPrecision" letterSpacing="0.28px">
              {coordinateLabels.map((label, i) => (
                <text
                  key={i}
                  x={cx + label.x * r}
                  y={cy + label.y * r}
                  fontSize={i % 4 === 0 ? 8 : 6.4}
                  opacity={0.27 + (i % 5) * 0.03}
                >
                  {label.t}
                </text>
              ))}

              {sectorLabels.map((label, i) => {
                const driftId = i === 0 ? "gs-sector-drift-a" : i === 1 ? "gs-sector-drift-b" : i === 2 ? "gs-sector-drift-c" : undefined;
                return (
                <g key={`sector-${i}`} id={driftId}>
                <text
                  x={cx + label.x * r}
                  y={cy + label.y * r}
                  fontSize={7}
                  opacity={0.22 + (i % 3) * 0.03}
                >
                  {label.t}
                </text>
                </g>
              );
              })}

              {/* Broken mid-sequence annotation crossing beyond viewport bounds */}
              <text x={cx + r * 0.91} y={cy - r * 0.42} fontSize={6.2} opacity={0.31}>
                ...-17 / C-9 / REF-7 →
              </text>
            </g>
          </g>
        </g>

        {/* ── L1: Outer atmospheric halo ── */}
        <g id="gs-halo-pulse">
          <circle cx={cx} cy={cy} r={haloR} fill="url(#gs-halo-grad)" filter="url(#gs-halo-blur)" />
        </g>

          {/* ── L7: Glyph systems and occult annotation ── */}
          <g id="gs-glyphs">
            {GLYPHS.map((g, i) => renderGlyph(g, w, h, i))}
          </g>
        </g>

        {/* ── L8: Full-screen finishing overlays ── */}
        <g id="gs-screen-fx">
          <rect id="gs-noise-layer-a" width="100%" height="100%" fill="#FFFFFF" filter="url(#gs-noise-overlay-a)" opacity="0.042" />
          <rect id="gs-noise-layer-b" width="100%" height="100%" fill="#FFFFFF" filter="url(#gs-noise-overlay-b)" opacity="0.026" />
          <rect width="100%" height="100%" fill="url(#gs-edge-vignette)" opacity="0.42" />
          {Array.from({ length: Math.ceil(h / 2.5) }).map((_, i) => {
            const y = i * 2.5;
            return (
              <line
                key={`scanline-${i}`}
                x1={0}
                y1={y}
                x2={w}
                y2={y}
                stroke="#050D1A"
                strokeWidth="0.5"
                opacity="0.055"
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
