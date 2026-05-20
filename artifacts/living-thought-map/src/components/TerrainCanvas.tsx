import React, { useEffect, useRef } from 'react';
import type { TerrainId } from '../types';

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

// ─── THE VOID ──────────────────────────────────────────────────────────────
function initVoid(w: number, h: number) {
  const stars = Array.from({ length: 55 }, () => ({
    x: rand(0, w), y: rand(0, h),
    size: rand(0.3, 1.1),
    phase: rand(0, Math.PI * 2),
    speed: rand(0.0002, 0.0007),
  }));

  return (ctx: CanvasRenderingContext2D, t: number) => {
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    // Slow-breathing central glow
    const breathe = 0.022 + 0.016 * Math.sin(t * 0.00035);
    const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.42);
    g.addColorStop(0, `rgba(6,182,212,${breathe})`);
    g.addColorStop(1, 'rgba(6,182,212,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Very faint grid
    ctx.strokeStyle = 'rgba(255,255,255,0.018)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Sparse dim stars
    for (const s of stars) {
      const alpha = 0.12 + 0.18 * Math.sin(t * s.speed + s.phase);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,220,255,${alpha})`;
      ctx.fill();
    }
  };
}

// ─── INTERSTELLAR PLANE ────────────────────────────────────────────────────
interface ShootingStar { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; length: number; }

function initInterstellar(w: number, h: number) {
  const stars = Array.from({ length: 200 }, () => ({
    x: rand(0, w), y: rand(0, h),
    size: rand(0.3, 2.4),
    phase: rand(0, Math.PI * 2),
    speed: rand(0.0003, 0.0028),
    r: Math.floor(rand(200, 255)),
    g: Math.floor(rand(200, 255)),
    b: Math.floor(rand(200, 255)),
  }));

  let shooters: ShootingStar[] = [];
  let nextShootDelay = rand(2000, 5000);
  let elapsed = 0;

  return (ctx: CanvasRenderingContext2D, t: number) => {
    const dt = t - elapsed; elapsed = t;

    // Base
    ctx.fillStyle = '#020408';
    ctx.fillRect(0, 0, w, h);

    const bg = ctx.createRadialGradient(w * 0.5, h * 0.32, 0, w * 0.5, h * 0.32, w * 0.7);
    bg.addColorStop(0, '#0d1b40');
    bg.addColorStop(1, 'rgba(2,4,8,0)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    // Nebulae
    const np = 0.55 + 0.45 * Math.sin(t * 0.00005);
    const neb1 = ctx.createRadialGradient(w * 0.28, h * 0.38, 0, w * 0.28, h * 0.38, w * 0.28);
    neb1.addColorStop(0, `rgba(6,182,212,${0.11 * np})`);
    neb1.addColorStop(1, 'rgba(6,182,212,0)');
    ctx.fillStyle = neb1; ctx.fillRect(0, 0, w, h);

    const neb2 = ctx.createRadialGradient(w * 0.73, h * 0.65, 0, w * 0.73, h * 0.65, w * 0.27);
    neb2.addColorStop(0, `rgba(168,85,247,${0.09 * np})`);
    neb2.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.fillStyle = neb2; ctx.fillRect(0, 0, w, h);

    const neb3 = ctx.createRadialGradient(w * 0.55, h * 0.8, 0, w * 0.55, h * 0.8, w * 0.22);
    neb3.addColorStop(0, `rgba(244,63,94,${0.045 * np})`);
    neb3.addColorStop(1, 'rgba(244,63,94,0)');
    ctx.fillStyle = neb3; ctx.fillRect(0, 0, w, h);

    // Stars
    for (const s of stars) {
      const alpha = s.speed > 0.0018
        ? 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase))
        : 0.55 + 0.35 * Math.sin(t * s.speed + s.phase);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${alpha})`;
      ctx.fill();
    }

    // Shooting stars
    nextShootDelay -= dt;
    if (nextShootDelay <= 0) {
      const angle = rand(-0.28, -0.12) * Math.PI;
      const speed = rand(250, 450);
      shooters.push({ x: rand(0, w * 0.7), y: rand(0, h * 0.5), vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0, maxLife: 500, length: rand(60, 150) });
      nextShootDelay = rand(3000, 9000);
    }

    shooters = shooters.filter((ss) => {
      ss.life += dt;
      if (ss.life > ss.maxLife) return false;
      const prog = ss.life / ss.maxLife;
      const alpha = prog < 0.3 ? prog / 0.3 : 1 - (prog - 0.3) / 0.7;
      const tailFrac = Math.min(1, ss.life / 200);
      const tailX = ss.x - (ss.vx / 400) * ss.length * tailFrac;
      const tailY = ss.y - (ss.vy / 400) * ss.length * tailFrac;
      const grad = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, `rgba(255,255,255,${alpha * 0.9})`);
      ctx.save();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = 'rgba(200,240,255,0.4)';
      ctx.shadowBlur = 4;
      ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(ss.x, ss.y); ctx.stroke();
      ctx.restore();
      ss.x += ss.vx * (dt / 1000);
      ss.y += ss.vy * (dt / 1000);
      return true;
    });
  };
}

// ─── MEMORY PALACE ─────────────────────────────────────────────────────────
function initMemoryPalace(w: number, h: number) {
  const motes = Array.from({ length: 80 }, () => ({
    x: rand(0, w), y: rand(0, h),
    vy: rand(-0.12, -0.45),
    vx: rand(-0.07, 0.07),
    alpha: rand(0.15, 0.65),
    size: rand(1, 2.4),
    phase: rand(0, Math.PI * 2),
  }));

  const candles = [
    { x: w * 0.22, y: h * 0.72, phase: rand(0, Math.PI * 2), scale: rand(0.8, 1.2) },
    { x: w * 0.76, y: h * 0.62, phase: rand(0, Math.PI * 2), scale: rand(0.8, 1.2) },
    { x: w * 0.50, y: h * 0.55, phase: rand(0, Math.PI * 2), scale: rand(0.8, 1.2) },
    { x: w * 0.38, y: h * 0.85, phase: rand(0, Math.PI * 2), scale: rand(0.7, 1.0) },
    { x: w * 0.62, y: h * 0.80, phase: rand(0, Math.PI * 2), scale: rand(0.7, 1.0) },
  ];

  return (ctx: CanvasRenderingContext2D, t: number) => {
    ctx.fillStyle = '#0d0602';
    ctx.fillRect(0, 0, w, h);

    // Base warm pool
    const base = ctx.createRadialGradient(w * 0.5, h * 0.65, 0, w * 0.5, h * 0.65, w * 0.55);
    base.addColorStop(0, 'rgba(180,100,20,0.16)');
    base.addColorStop(1, 'rgba(180,100,20,0)');
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);

    // Parquet grid
    ctx.strokeStyle = 'rgba(120,80,30,0.042)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(120,80,30,0.022)';
    for (let x = 40; x < w; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 40; y < h; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    // Candle glows
    for (const c of candles) {
      const f1 = Math.sin(t * 0.0025 + c.phase);
      const f2 = Math.sin(t * 0.0097 + c.phase * 2.3);
      const f3 = Math.sin(t * 0.021 + c.phase * 1.7);
      const flicker = 0.65 + 0.2 * f1 + 0.1 * f2 + 0.05 * f3;
      const r = (55 + 40 * flicker) * c.scale * (Math.min(w, h) / 700);

      const outer = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r * 1.8);
      outer.addColorStop(0, `rgba(245,158,11,${0.13 * flicker})`);
      outer.addColorStop(0.45, `rgba(200,80,10,${0.08 * flicker})`);
      outer.addColorStop(1, 'rgba(180,60,5,0)');
      ctx.fillStyle = outer; ctx.fillRect(0, 0, w, h);

      const inner = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r * 0.35);
      inner.addColorStop(0, `rgba(255,230,100,${0.25 * flicker})`);
      inner.addColorStop(1, 'rgba(255,200,50,0)');
      ctx.fillStyle = inner; ctx.fillRect(0, 0, w, h);
    }

    // Amber dust motes
    for (const m of motes) {
      const sway = Math.sin(t * 0.0006 + m.phase) * 0.35;
      m.x += m.vx + sway * 0.15;
      m.y += m.vy;
      if (m.y < -4) { m.y = h + 4; m.x = rand(0, w); }
      if (m.x < -2) m.x = w + 2;
      if (m.x > w + 2) m.x = -2;
      const alpha = m.alpha * (0.55 + 0.45 * Math.sin(t * 0.0012 + m.phase));
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245,158,11,${alpha})`;
      ctx.fill();
    }
  };
}

// ─── MYTHIC LANDSCAPE ──────────────────────────────────────────────────────
function initMythicLandscape(w: number, h: number) {
  const COLORS = ['168,85,247', '6,182,212', '16,185,129', '244,63,94', '168,85,247', '6,182,212'];
  const particles = Array.from({ length: 100 }, () => ({
    x: rand(0, w),
    y: rand(0, h),
    vx: rand(-0.18, 0.18),
    vy: rand(-0.25, -0.65),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: rand(1.2, 3.5),
    alpha: rand(0.25, 0.75),
    phase: rand(0, Math.PI * 2),
  }));

  return (ctx: CanvasRenderingContext2D, t: number) => {
    ctx.fillStyle = '#060410';
    ctx.fillRect(0, 0, w, h);

    // Deep purple radial
    const bg = ctx.createRadialGradient(w * 0.46, h * 0.52, 0, w * 0.46, h * 0.52, w * 0.62);
    bg.addColorStop(0, 'rgba(168,85,247,0.12)');
    bg.addColorStop(0.55, 'rgba(6,182,212,0.04)');
    bg.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    // Secondary blue pool
    const bg2 = ctx.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.7, h * 0.3, w * 0.35);
    bg2.addColorStop(0, 'rgba(6,182,212,0.06)');
    bg2.addColorStop(1, 'rgba(6,182,212,0)');
    ctx.fillStyle = bg2; ctx.fillRect(0, 0, w, h);

    // Horizon glow
    const horizon = 0.5 + 0.5 * Math.sin(t * 0.00025);
    const hg = ctx.createLinearGradient(0, h * 0.72, 0, h);
    hg.addColorStop(0, 'rgba(168,85,247,0)');
    hg.addColorStop(0.6, `rgba(168,85,247,${0.055 * horizon})`);
    hg.addColorStop(1, `rgba(16,185,129,${0.04 * horizon})`);
    ctx.fillStyle = hg; ctx.fillRect(0, 0, w, h);

    // Floating particles with glows
    for (const p of particles) {
      const sway = Math.sin(t * 0.00035 + p.phase) * 0.45;
      p.x += p.vx + sway * 0.18;
      p.y += p.vy;
      if (p.y < -14) { p.y = h + 14; p.x = rand(0, w); }
      if (p.x < -14) p.x = w + 14;
      if (p.x > w + 14) p.x = -14;

      const yFade = p.y < h * 0.25 ? p.y / (h * 0.25) : 1;
      const pulse = 0.7 + 0.3 * Math.sin(t * 0.0018 + p.phase);
      const alpha = p.alpha * yFade * pulse;

      // Outer glow
      const glowR = p.size * 4;
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
      glow.addColorStop(0, `rgba(${p.color},${alpha * 0.5})`);
      glow.addColorStop(1, `rgba(${p.color},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2); ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${Math.min(1, alpha * 1.8)})`;
      ctx.fill();
    }
  };
}

// ─── TERRESTRIAL GLOBE ─────────────────────────────────────────────────────
function initTerrestrialGlobe(w: number, h: number) {
  const GLOWCOLORS = ['6,182,212', '180,140,60', '180,140,60', '6,182,212', '16,185,129'];
  const pulseNodes = Array.from({ length: 28 }, () => ({
    xi: Math.floor(rand(1, Math.floor(w / 60))),
    yi: Math.floor(rand(1, Math.floor(h / 60))),
    phase: rand(0, Math.PI * 2),
    speed: rand(0.0006, 0.0018),
    color: GLOWCOLORS[Math.floor(Math.random() * GLOWCOLORS.length)],
  }));

  return (ctx: CanvasRenderingContext2D, t: number) => {
    ctx.fillStyle = '#0f0c05';
    ctx.fillRect(0, 0, w, h);

    // Parchment base radial
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.55);
    bg.addColorStop(0, 'rgba(180,140,60,0.065)');
    bg.addColorStop(0.6, 'rgba(6,182,212,0.025)');
    bg.addColorStop(1, 'rgba(180,140,60,0)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    // Animated lat/long grid (slowly drifting)
    const drift = (t * 0.004) % 60;
    ctx.strokeStyle = 'rgba(180,140,60,0.052)';
    ctx.lineWidth = 1;
    for (let x = (-60 + drift % 60); x < w + 60; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = (drift % 60) - 60; y < h + 60; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Diagonal survey lines
    ctx.strokeStyle = 'rgba(180,140,60,0.018)';
    for (let x = -h + (drift % 120); x < w + h; x += 120) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + h, 0); ctx.stroke();
    }

    // Pulsing grid nodes
    for (const n of pulseNodes) {
      const nx = n.xi * 60 + ((drift * 0.5) % 60);
      const ny = n.yi * 60;
      const pulse = 0.5 + 0.5 * Math.sin(t * n.speed + n.phase);
      const a = 0.12 + 0.5 * pulse;
      const r = 2.5 + 4 * pulse;
      const dg = ctx.createRadialGradient(nx, ny, 0, nx, ny, r);
      dg.addColorStop(0, `rgba(${n.color},${a})`);
      dg.addColorStop(1, `rgba(${n.color},0)`);
      ctx.fillStyle = dg;
      ctx.beginPath(); ctx.arc(nx, ny, r, 0, Math.PI * 2); ctx.fill();
      // bright center
      ctx.beginPath(); ctx.arc(nx, ny, 1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${n.color},${Math.min(1, a * 2.5)})`; ctx.fill();
    }

    // Compass rose at center
    const scale = Math.min(w, h) / 800;
    const cx = w * 0.5, cy = h * 0.5;
    const cr = 38 * scale;
    const rot = t * 0.00002;
    const ca = 0.055 + 0.025 * Math.sin(t * 0.0003);

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(180,140,60,${ca})`;
    ctx.lineWidth = 1; ctx.stroke();

    // Cardinal lines
    ctx.strokeStyle = `rgba(180,140,60,${ca * 1.5})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + rot;
      const len = i % 2 === 0 ? cr : cr * 0.65;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * cr * 0.15, cy + Math.sin(a) * cr * 0.15);
      ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      ctx.stroke();
    }

    // Centre dot
    ctx.beginPath(); ctx.arc(cx, cy, 3 * scale, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(6,182,212,${ca * 3})`; ctx.fill();
  };
}

// ─── Registry ──────────────────────────────────────────────────────────────
type RenderFn = (ctx: CanvasRenderingContext2D, t: number) => void;
type InitFn = (w: number, h: number) => RenderFn;

const TERRAIN_INIT: Record<TerrainId, InitFn> = {
  'the-void':           initVoid,
  'interstellar-plane': initInterstellar,
  'memory-palace':      initMemoryPalace,
  'mythic-landscape':   initMythicLandscape,
  'terrestrial-globe':  initTerrestrialGlobe,
};

// ─── Component ─────────────────────────────────────────────────────────────
interface Props {
  terrain: TerrainId;
  style?: React.CSSProperties;
}

export default function TerrainCanvas({ terrain, style }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let startTime: number | null = null;
    const container = canvas.parentElement!;

    const setupSize = () => {
      const w = container.offsetWidth || 800;
      const h = container.offsetHeight || 600;
      canvas.width = w;
      canvas.height = h;
      return { w, h };
    };

    let { w, h } = setupSize();
    let renderFn = TERRAIN_INIT[terrain](w, h);

    const ro = new ResizeObserver(() => {
      ({ w, h } = setupSize());
      renderFn = TERRAIN_INIT[terrain](w, h);
    });
    ro.observe(container);

    const loop = (time: number) => {
      if (startTime === null) startTime = time;
      renderFn(ctx, time - startTime);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [terrain]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }}
    />
  );
}
