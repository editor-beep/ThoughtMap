import React, { useEffect, useRef } from 'react';
import type { TerrainId } from '../types';

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

// ─── THE VOID ──────────────────────────────────────────────────────────────
function initVoid(w: number, h: number) {
  const farStars = Array.from({ length: 110 }, () => ({
    x: rand(0, w), y: rand(0, h), size: rand(0.2, 0.55),
    phase: rand(0, Math.PI * 2), speed: rand(0.0001, 0.0004),
  }));
  const midStars = Array.from({ length: 65 }, () => ({
    x: rand(0, w), y: rand(0, h), size: rand(0.55, 1.3),
    phase: rand(0, Math.PI * 2), speed: rand(0.0003, 0.0009),
  }));
  const nearStars = Array.from({ length: 20 }, () => ({
    x: rand(0, w), y: rand(0, h), size: rand(1.2, 2.6),
    phase: rand(0, Math.PI * 2), speed: rand(0.0007, 0.0018),
  }));

  // Constellation nodes + connecting lines
  const cStars = [
    ...midStars.slice(0, 9).map(s => ({ ...s, size: Math.max(s.size, 1.1) })),
    ...nearStars.slice(0, 5),
  ];
  const cLines: [number, number][] = [
    [0,1],[1,2],[2,3],[3,4],[4,0],[2,5],[5,6],[6,7],[3,8],[8,9],[9,10],[0,11],[11,12],[12,13],
  ];

  // Bright stars that get 4-pointed cross glow
  const glowStars = nearStars.slice(0, 8);

  return (ctx: CanvasRenderingContext2D, t: number) => {
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    // Breathing cyan central aura
    const breathe = 0.017 + 0.013 * Math.sin(t * 0.00030);
    const aura = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.44);
    aura.addColorStop(0, `rgba(6,182,212,${breathe})`);
    aura.addColorStop(0.5, `rgba(6,182,212,${breathe * 0.35})`);
    aura.addColorStop(1, 'rgba(6,182,212,0)');
    ctx.fillStyle = aura; ctx.fillRect(0, 0, w, h);

    // Offset purple nebula
    const purpA = 0.010 + 0.008 * Math.sin(t * 0.00022 + 1.5);
    const purp = ctx.createRadialGradient(w * 0.27, h * 0.68, 0, w * 0.27, h * 0.68, w * 0.40);
    purp.addColorStop(0, `rgba(168,85,247,${purpA})`);
    purp.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.fillStyle = purp; ctx.fillRect(0, 0, w, h);

    // Fine grid
    ctx.strokeStyle = 'rgba(255,255,255,0.013)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    // Constellation lines
    const consAlpha = 0.036 + 0.018 * Math.sin(t * 0.00015);
    ctx.strokeStyle = `rgba(100,200,255,${consAlpha})`;
    ctx.lineWidth = 0.75;
    for (const [a, b] of cLines) {
      if (a < cStars.length && b < cStars.length) {
        ctx.beginPath();
        ctx.moveTo(cStars[a].x, cStars[a].y);
        ctx.lineTo(cStars[b].x, cStars[b].y);
        ctx.stroke();
      }
    }

    // Far stars
    for (const s of farStars) {
      const alpha = 0.06 + 0.10 * Math.sin(t * s.speed + s.phase);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,215,255,${alpha})`; ctx.fill();
    }
    // Mid stars
    for (const s of midStars) {
      const alpha = 0.11 + 0.18 * Math.sin(t * s.speed + s.phase);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,232,255,${alpha})`; ctx.fill();
    }
    // Near stars
    for (const s of nearStars) {
      const alpha = 0.22 + 0.38 * Math.sin(t * s.speed + s.phase);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,245,255,${alpha})`; ctx.fill();
    }

    // 4-pointed cross glow on bright stars
    for (const gs of glowStars) {
      const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.0009 + gs.phase));
      const alpha = 0.12 + 0.28 * pulse;
      const crossLen = gs.size * 7.5 * (0.7 + 0.3 * pulse);
      ctx.save();
      ctx.translate(gs.x, gs.y);
      ctx.strokeStyle = `rgba(180,240,255,${alpha * 0.7})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(-crossLen, 0); ctx.lineTo(crossLen, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -crossLen); ctx.lineTo(0, crossLen); ctx.stroke();
      const diagLen = crossLen * 0.55;
      ctx.strokeStyle = `rgba(180,240,255,${alpha * 0.32})`;
      ctx.beginPath(); ctx.moveTo(-diagLen, -diagLen); ctx.lineTo(diagLen, diagLen); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(diagLen, -diagLen); ctx.lineTo(-diagLen, diagLen); ctx.stroke();
      const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, gs.size * 4.5);
      cg.addColorStop(0, `rgba(200,245,255,${alpha * 1.1})`);
      cg.addColorStop(1, 'rgba(200,245,255,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, gs.size * 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Edge vignette for depth
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.38, w * 0.5, h * 0.5, Math.max(w, h) * 0.82);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.62)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
  };
}

// ─── INTERSTELLAR PLANE ────────────────────────────────────────────────────
interface ShootingStar { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; length: number; }

function initInterstellar(w: number, h: number) {
  const stars = Array.from({ length: 220 }, () => ({
    x: rand(0, w), y: rand(0, h),
    size: rand(0.3, 2.4),
    phase: rand(0, Math.PI * 2),
    speed: rand(0.0003, 0.0028),
    r: Math.floor(rand(200, 255)),
    g: Math.floor(rand(200, 255)),
    b: Math.floor(rand(200, 255)),
  }));

  // Milky Way band — concentrated tiny stars along a diagonal strip
  const mwAngle = 0.32; // radians
  const mwStars = Array.from({ length: 280 }, () => {
    const along = rand(0, Math.sqrt(w * w + h * h));
    const perp = rand(-h * 0.12, h * 0.12) * (0.5 + 0.5 * Math.abs(rand(-1, 1)));
    return {
      x: Math.cos(mwAngle) * along - Math.sin(mwAngle) * perp + w * 0.1,
      y: Math.sin(mwAngle) * along + Math.cos(mwAngle) * perp + h * 0.05,
      size: rand(0.15, 0.7),
      alpha: rand(0.04, 0.28),
    };
  });

  // Two constellation networks
  const cons1Nodes = Array.from({ length: 10 }, () => ({ x: rand(w * 0.05, w * 0.45), y: rand(h * 0.05, h * 0.55) }));
  const cons1Lines: [number, number][] = [[0,1],[1,2],[2,3],[3,4],[4,0],[1,5],[5,6],[2,7],[7,8],[8,9]];
  const cons2Nodes = Array.from({ length: 9 }, () => ({ x: rand(w * 0.55, w * 0.95), y: rand(h * 0.45, h * 0.95) }));
  const cons2Lines: [number, number][] = [[0,1],[1,2],[2,3],[3,0],[1,4],[4,5],[5,6],[0,7],[7,8]];

  let shooters: ShootingStar[] = [];
  let nextShootDelay = rand(1500, 4000);
  let elapsed = 0;

  return (ctx: CanvasRenderingContext2D, t: number) => {
    const dt = t - elapsed; elapsed = t;

    ctx.fillStyle = '#020408';
    ctx.fillRect(0, 0, w, h);

    // Deep blue core
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.32, 0, w * 0.5, h * 0.32, w * 0.72);
    bg.addColorStop(0, '#0d1b40');
    bg.addColorStop(1, 'rgba(2,4,8,0)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    // Five nebulae — cyan, purple, rose, amber, emerald
    const np = 0.55 + 0.45 * Math.sin(t * 0.00005);
    const nebDefs = [
      { x: 0.28, y: 0.38, r: 0.28, c: '6,182,212',   a: 0.11 },
      { x: 0.73, y: 0.65, r: 0.27, c: '168,85,247',  a: 0.09 },
      { x: 0.55, y: 0.80, r: 0.22, c: '244,63,94',   a: 0.045 },
      { x: 0.15, y: 0.70, r: 0.20, c: '245,158,11',  a: 0.04 },
      { x: 0.85, y: 0.22, r: 0.18, c: '16,185,129',  a: 0.05 },
    ];
    for (const n of nebDefs) {
      const neb = ctx.createRadialGradient(w * n.x, h * n.y, 0, w * n.x, h * n.y, w * n.r);
      neb.addColorStop(0, `rgba(${n.c},${n.a * np})`);
      neb.addColorStop(1, `rgba(${n.c},0)`);
      ctx.fillStyle = neb; ctx.fillRect(0, 0, w, h);
    }

    // Milky Way band
    for (const ms of mwStars) {
      ctx.beginPath(); ctx.arc(ms.x, ms.y, ms.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,230,255,${ms.alpha})`; ctx.fill();
    }

    // Stars
    for (const s of stars) {
      const alpha = s.speed > 0.0018
        ? 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase))
        : 0.55 + 0.35 * Math.sin(t * s.speed + s.phase);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${alpha})`; ctx.fill();
    }

    // Constellation networks (two separate groups)
    const ca1 = 0.040 + 0.020 * Math.sin(t * 0.00012);
    ctx.strokeStyle = `rgba(100,200,255,${ca1})`; ctx.lineWidth = 0.7;
    for (const [a, b] of cons1Lines) {
      if (a < cons1Nodes.length && b < cons1Nodes.length) {
        ctx.beginPath(); ctx.moveTo(cons1Nodes[a].x, cons1Nodes[a].y); ctx.lineTo(cons1Nodes[b].x, cons1Nodes[b].y); ctx.stroke();
      }
    }
    ctx.strokeStyle = `rgba(200,140,255,${ca1 * 0.8})`; ctx.lineWidth = 0.65;
    for (const [a, b] of cons2Lines) {
      if (a < cons2Nodes.length && b < cons2Nodes.length) {
        ctx.beginPath(); ctx.moveTo(cons2Nodes[a].x, cons2Nodes[a].y); ctx.lineTo(cons2Nodes[b].x, cons2Nodes[b].y); ctx.stroke();
      }
    }

    // Shooting stars
    nextShootDelay -= dt;
    if (nextShootDelay <= 0) {
      const angle = rand(-0.28, -0.12) * Math.PI;
      const speed = rand(280, 500);
      shooters.push({ x: rand(0, w * 0.75), y: rand(0, h * 0.55), vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0, maxLife: 500, length: rand(70, 160) });
      nextShootDelay = rand(2500, 8000);
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
      ctx.strokeStyle = grad; ctx.lineWidth = 1.8;
      ctx.shadowColor = 'rgba(200,240,255,0.45)'; ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(ss.x, ss.y); ctx.stroke();
      ctx.restore();
      ss.x += ss.vx * (dt / 1000); ss.y += ss.vy * (dt / 1000);
      return true;
    });

    // Edge vignette
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.40, w * 0.5, h * 0.5, Math.max(w, h) * 0.84);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
  };
}

// ─── MEMORY PALACE ─────────────────────────────────────────────────────────
function initMemoryPalace(w: number, h: number) {
  const scale = Math.min(w, h) / 900;
  const cx = w * 0.5, cy = h * 0.5;

  // Architectural floorplan rooms
  const rooms = [
    // Central hall (tall nave)
    { x: cx - 95 * scale, y: cy - 170 * scale, width: 190 * scale, height: 340 * scale },
    // Left wing
    { x: cx - 290 * scale, y: cy - 125 * scale, width: 175 * scale, height: 250 * scale },
    // Right wing
    { x: cx + 115 * scale, y: cy - 125 * scale, width: 175 * scale, height: 250 * scale },
    // Top apse
    { x: cx - 65 * scale, y: cy - 295 * scale, width: 130 * scale, height: 115 * scale },
    // Bottom gallery
    { x: cx - 160 * scale, y: cy + 190 * scale, width: 320 * scale, height: 105 * scale },
    // Left anteroom
    { x: cx - 400 * scale, y: cy - 75 * scale, width: 95 * scale, height: 150 * scale },
    // Right anteroom
    { x: cx + 305 * scale, y: cy - 75 * scale, width: 95 * scale, height: 150 * scale },
  ];

  // Column positions (pairs along central hall)
  const columnPairs = [
    [cx - 60 * scale, cy - 105 * scale], [cx + 60 * scale, cy - 105 * scale],
    [cx - 60 * scale, cy - 15 * scale],  [cx + 60 * scale, cy - 15 * scale],
    [cx - 60 * scale, cy + 75 * scale],  [cx + 60 * scale, cy + 75 * scale],
    [cx - 195 * scale, cy - 55 * scale], [cx + 195 * scale, cy - 55 * scale],
    [cx - 195 * scale, cy + 55 * scale], [cx + 195 * scale, cy + 55 * scale],
  ];

  const candles = columnPairs.map(([px, py]) => ({
    x: px, y: py,
    phase: rand(0, Math.PI * 2),
    scale: rand(0.82, 1.18),
  }));

  const motes = Array.from({ length: 75 }, () => ({
    x: rand(0, w), y: rand(0, h),
    vy: rand(-0.10, -0.40),
    vx: rand(-0.06, 0.06),
    alpha: rand(0.12, 0.55),
    size: rand(0.8, 2.3),
    phase: rand(0, Math.PI * 2),
  }));

  return (ctx: CanvasRenderingContext2D, t: number) => {
    ctx.fillStyle = '#0d0602';
    ctx.fillRect(0, 0, w, h);

    // Warm radial base glow
    const base = ctx.createRadialGradient(cx, cy + h * 0.08, 0, cx, cy + h * 0.08, w * 0.62);
    base.addColorStop(0, 'rgba(165,88,14,0.18)');
    base.addColorStop(0.55, 'rgba(120,55,7,0.06)');
    base.addColorStop(1, 'rgba(90,35,4,0)');
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);

    // Fine background floor grid
    ctx.strokeStyle = 'rgba(105,72,26,0.026)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    // Room fills (very subtle)
    ctx.fillStyle = 'rgba(140,95,36,0.016)';
    for (const r of rooms) { ctx.fillRect(r.x, r.y, r.width, r.height); }

    // Room outlines
    ctx.strokeStyle = 'rgba(145,98,38,0.13)';
    ctx.lineWidth = 1.4;
    for (const r of rooms) { ctx.strokeRect(r.x, r.y, r.width, r.height); }

    // Herringbone diagonal lines inside central room
    const cr = rooms[0];
    ctx.save();
    ctx.beginPath(); ctx.rect(cr.x + 2, cr.y + 2, cr.width - 4, cr.height - 4); ctx.clip();
    ctx.strokeStyle = 'rgba(125,82,28,0.044)'; ctx.lineWidth = 1;
    const hStep = 22 * scale;
    for (let d = -(cr.height + cr.width); d < cr.width + cr.height * 2; d += hStep) {
      ctx.beginPath(); ctx.moveTo(cr.x + d, cr.y); ctx.lineTo(cr.x + d + cr.height, cr.y + cr.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cr.x + d + cr.height, cr.y); ctx.lineTo(cr.x + d, cr.y + cr.height); ctx.stroke();
    }
    ctx.restore();

    // Doorway arches connecting rooms
    const archPositions = [
      { x: cx, y: rooms[0].y, r: 22 * scale },  // central ↔ apse
      { x: cx, y: rooms[0].y + rooms[0].height, r: 22 * scale }, // central ↔ gallery
      { x: rooms[1].x + rooms[1].width, y: cy, r: 20 * scale }, // left wing ↔ central
      { x: rooms[2].x, y: cy, r: 20 * scale }, // right wing ↔ central
    ];
    ctx.strokeStyle = 'rgba(175,118,48,0.20)'; ctx.lineWidth = 1.5;
    for (const arch of archPositions) {
      ctx.beginPath(); ctx.arc(arch.x, arch.y, arch.r, Math.PI, 0); ctx.stroke();
    }

    // Column glows + markers
    for (const [colX, colY] of columnPairs) {
      const colPulse = 0.5 + 0.5 * Math.sin(t * 0.00042 + colX * 0.008);
      const colA = 0.05 + 0.04 * colPulse;
      const colGlow = ctx.createRadialGradient(colX, colY, 0, colX, colY, 13 * scale);
      colGlow.addColorStop(0, `rgba(195,148,55,${colA * 3.5})`);
      colGlow.addColorStop(1, `rgba(195,148,55,0)`);
      ctx.fillStyle = colGlow; ctx.beginPath(); ctx.arc(colX, colY, 13 * scale, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(colX, colY, 2.8 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(195,148,55,${0.28 + 0.16 * colPulse})`; ctx.lineWidth = 1; ctx.stroke();
    }

    // Ornamental border frame (just inside canvas edges)
    const bMargin = 18 * scale;
    ctx.strokeStyle = 'rgba(140,90,30,0.065)'; ctx.lineWidth = 1;
    ctx.strokeRect(bMargin, bMargin, w - bMargin * 2, h - bMargin * 2);
    ctx.strokeStyle = 'rgba(140,90,30,0.035)'; ctx.lineWidth = 1;
    ctx.strokeRect(bMargin + 7 * scale, bMargin + 7 * scale, w - (bMargin + 7 * scale) * 2, h - (bMargin + 7 * scale) * 2);
    // Corner brackets
    const brkLen = 22 * scale;
    ctx.strokeStyle = 'rgba(160,108,38,0.10)'; ctx.lineWidth = 1.2;
    for (const [bx, by] of [[bMargin, bMargin], [w - bMargin, bMargin], [bMargin, h - bMargin], [w - bMargin, h - bMargin]]) {
      const sx = bx === bMargin ? 1 : -1, sy = by === bMargin ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(bx + sx * brkLen, by); ctx.lineTo(bx, by); ctx.lineTo(bx, by + sy * brkLen); ctx.stroke();
    }

    // Candle glows
    for (const c of candles) {
      const f1 = Math.sin(t * 0.0025 + c.phase);
      const f2 = Math.sin(t * 0.0097 + c.phase * 2.3);
      const f3 = Math.sin(t * 0.021 + c.phase * 1.7);
      const flicker = 0.65 + 0.2 * f1 + 0.1 * f2 + 0.05 * f3;
      const r = (42 + 32 * flicker) * c.scale * (Math.min(w, h) / 700);
      const outer = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r * 1.8);
      outer.addColorStop(0, `rgba(245,158,11,${0.10 * flicker})`);
      outer.addColorStop(0.45, `rgba(200,80,10,${0.06 * flicker})`);
      outer.addColorStop(1, 'rgba(180,60,5,0)');
      ctx.fillStyle = outer; ctx.fillRect(0, 0, w, h);
      const inner = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r * 0.32);
      inner.addColorStop(0, `rgba(255,230,100,${0.22 * flicker})`);
      inner.addColorStop(1, 'rgba(255,200,50,0)');
      ctx.fillStyle = inner; ctx.fillRect(0, 0, w, h);
    }

    // Amber dust motes
    for (const m of motes) {
      const sway = Math.sin(t * 0.0006 + m.phase) * 0.34;
      m.x += m.vx + sway * 0.13; m.y += m.vy;
      if (m.y < -4) { m.y = h + 4; m.x = rand(0, w); }
      if (m.x < -2) m.x = w + 2;
      if (m.x > w + 2) m.x = -2;
      const alpha = m.alpha * (0.5 + 0.5 * Math.sin(t * 0.0012 + m.phase));
      ctx.beginPath(); ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245,158,11,${alpha})`; ctx.fill();
    }

    // Warm vignette
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.36, w * 0.5, h * 0.5, Math.max(w, h) * 0.86);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.58)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
  };
}

// ─── MYTHIC LANDSCAPE ──────────────────────────────────────────────────────
function initMythicLandscape(w: number, h: number) {
  // Ley line nodes — heptagonal star geometry
  const leyNodes = [
    { x: w * 0.50, y: h * 0.50 }, // center
    { x: w * 0.50, y: h * 0.18 }, // top
    { x: w * 0.82, y: h * 0.33 }, // top-right
    { x: w * 0.82, y: h * 0.67 }, // bottom-right
    { x: w * 0.50, y: h * 0.82 }, // bottom
    { x: w * 0.18, y: h * 0.67 }, // bottom-left
    { x: w * 0.18, y: h * 0.33 }, // top-left
  ];
  const leyLines: [number, number][] = [
    [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],
    [1,2],[2,3],[3,4],[4,5],[5,6],[6,1],
    [1,3],[3,5],[5,1], // inner pentagram
  ];

  const COLORS = ['168,85,247', '6,182,212', '16,185,129', '244,63,94', '168,85,247', '6,182,212'];
  const particles = Array.from({ length: 85 }, () => ({
    x: rand(0, w), y: rand(0, h),
    vx: rand(-0.16, 0.16), vy: rand(-0.22, -0.58),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: rand(1.0, 3.4),
    alpha: rand(0.22, 0.72),
    phase: rand(0, Math.PI * 2),
  }));

  return (ctx: CanvasRenderingContext2D, t: number) => {
    ctx.fillStyle = '#060410';
    ctx.fillRect(0, 0, w, h);

    // Deep purple radial
    const bg = ctx.createRadialGradient(w * 0.46, h * 0.52, 0, w * 0.46, h * 0.52, w * 0.66);
    bg.addColorStop(0, 'rgba(168,85,247,0.13)');
    bg.addColorStop(0.5, 'rgba(6,182,212,0.04)');
    bg.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    // Secondary teal accent
    const bg2 = ctx.createRadialGradient(w * 0.72, h * 0.28, 0, w * 0.72, h * 0.28, w * 0.40);
    bg2.addColorStop(0, 'rgba(6,182,212,0.07)');
    bg2.addColorStop(1, 'rgba(6,182,212,0)');
    ctx.fillStyle = bg2; ctx.fillRect(0, 0, w, h);

    // Mountain silhouette at horizon
    ctx.fillStyle = 'rgba(75,25,115,0.13)';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.76);
    ctx.lineTo(w * 0.07, h * 0.63);
    ctx.lineTo(w * 0.16, h * 0.73);
    ctx.lineTo(w * 0.28, h * 0.57);
    ctx.lineTo(w * 0.38, h * 0.68);
    ctx.lineTo(w * 0.48, h * 0.52);
    ctx.lineTo(w * 0.58, h * 0.66);
    ctx.lineTo(w * 0.70, h * 0.54);
    ctx.lineTo(w * 0.80, h * 0.71);
    ctx.lineTo(w * 0.90, h * 0.61);
    ctx.lineTo(w * 0.97, h * 0.76);
    ctx.lineTo(w, h * 0.78);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Horizon glow
    const horizon = 0.5 + 0.5 * Math.sin(t * 0.00025);
    const hg = ctx.createLinearGradient(0, h * 0.68, 0, h);
    hg.addColorStop(0, 'rgba(168,85,247,0)');
    hg.addColorStop(0.55, `rgba(168,85,247,${0.06 * horizon})`);
    hg.addColorStop(1, `rgba(16,185,129,${0.045 * horizon})`);
    ctx.fillStyle = hg; ctx.fillRect(0, 0, w, h);

    // Ley lines (pulsing gradient)
    const leyPulse = 0.5 + 0.5 * Math.sin(t * 0.00055);
    for (const [a, b] of leyLines) {
      const na = leyNodes[a], nb = leyNodes[b];
      const isSpoke = a === 0 || b === 0;
      const baseA = isSpoke ? 0.044 : 0.028;
      const pulseA = isSpoke ? 0.052 : 0.032;
      const totalA = baseA + pulseA * leyPulse;
      const grad = ctx.createLinearGradient(na.x, na.y, nb.x, nb.y);
      grad.addColorStop(0, `rgba(168,85,247,${totalA})`);
      grad.addColorStop(0.5, `rgba(6,182,212,${totalA * 1.35})`);
      grad.addColorStop(1, `rgba(168,85,247,${totalA})`);
      ctx.strokeStyle = grad; ctx.lineWidth = isSpoke ? 1.2 : 0.85;
      ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y); ctx.stroke();
    }

    // Ley node glows
    for (let i = 0; i < leyNodes.length; i++) {
      const n = leyNodes[i];
      const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.0012 + i * 0.85));
      const r = (i === 0 ? 18 : 9) * (0.7 + 0.3 * pulse);
      const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.8);
      glow.addColorStop(0, `rgba(168,85,247,${0.42 * pulse})`);
      glow.addColorStop(0.45, `rgba(6,182,212,${0.22 * pulse})`);
      glow.addColorStop(1, 'rgba(168,85,247,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(n.x, n.y, i === 0 ? 3.5 : 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(210,180,255,${0.6 + 0.4 * pulse})`; ctx.fill();
    }

    // Central runic circle
    const rcx = w * 0.5, rcy = h * 0.5;
    const rcPulse = 0.5 + 0.5 * Math.sin(t * 0.00065);
    const rcR = Math.min(w, h) * 0.115;
    ctx.strokeStyle = `rgba(168,85,247,${0.065 + 0.040 * rcPulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(rcx, rcy, rcR, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(rcx, rcy, rcR * 0.68, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(rcx, rcy, rcR * 0.38, 0, Math.PI * 2); ctx.stroke();
    // Rotating spokes
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI / 4) + t * 0.00007;
      ctx.beginPath();
      ctx.moveTo(rcx + Math.cos(angle) * rcR * 0.22, rcy + Math.sin(angle) * rcR * 0.22);
      ctx.lineTo(rcx + Math.cos(angle) * rcR, rcy + Math.sin(angle) * rcR);
      ctx.stroke();
    }
    // Inner counter-rotating triangle
    ctx.strokeStyle = `rgba(6,182,212,${0.045 + 0.025 * rcPulse})`;
    for (let i = 0; i < 3; i++) {
      const a1 = (i * 2 * Math.PI / 3) - t * 0.00012;
      const a2 = ((i + 1) * 2 * Math.PI / 3) - t * 0.00012;
      ctx.beginPath();
      ctx.moveTo(rcx + Math.cos(a1) * rcR * 0.62, rcy + Math.sin(a1) * rcR * 0.62);
      ctx.lineTo(rcx + Math.cos(a2) * rcR * 0.62, rcy + Math.sin(a2) * rcR * 0.62);
      ctx.stroke();
    }

    // Floating particles
    for (const p of particles) {
      const sway = Math.sin(t * 0.00035 + p.phase) * 0.45;
      p.x += p.vx + sway * 0.18; p.y += p.vy;
      if (p.y < -14) { p.y = h + 14; p.x = rand(0, w); }
      if (p.x < -14) p.x = w + 14;
      if (p.x > w + 14) p.x = -14;
      const yFade = p.y < h * 0.25 ? p.y / (h * 0.25) : 1;
      const pulse = 0.7 + 0.3 * Math.sin(t * 0.0018 + p.phase);
      const alpha = p.alpha * yFade * pulse;
      const glowR = p.size * 4;
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
      glow.addColorStop(0, `rgba(${p.color},${alpha * 0.5})`);
      glow.addColorStop(1, `rgba(${p.color},0)`);
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${Math.min(1, alpha * 1.8)})`; ctx.fill();
    }

    // Edge vignette
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.35, w * 0.5, h * 0.5, Math.max(w, h) * 0.84);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.52)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
  };
}

// ─── TERRESTRIAL GLOBE ─────────────────────────────────────────────────────
function initTerrestrialGlobe(w: number, h: number) {
  const cx = w * 0.5, cy = h * 0.5;
  const globeR = Math.min(w, h) * 0.37;

  // Abstract continent shapes (bezier waypoints, normalized 0-1)
  const continentDefs = [
    [{ x: 0.42, y: 0.28 },{ x: 0.35, y: 0.22 },{ x: 0.24, y: 0.30 },{ x: 0.21, y: 0.42 },{ x: 0.29, y: 0.48 },{ x: 0.43, y: 0.45 }],
    [{ x: 0.18, y: 0.55 },{ x: 0.11, y: 0.63 },{ x: 0.17, y: 0.70 },{ x: 0.27, y: 0.66 },{ x: 0.29, y: 0.57 }],
    [{ x: 0.60, y: 0.37 },{ x: 0.73, y: 0.31 },{ x: 0.82, y: 0.42 },{ x: 0.76, y: 0.56 },{ x: 0.64, y: 0.59 },{ x: 0.58, y: 0.50 }],
    [{ x: 0.46, y: 0.62 },{ x: 0.38, y: 0.73 },{ x: 0.48, y: 0.80 },{ x: 0.59, y: 0.73 },{ x: 0.56, y: 0.62 }],
  ].map(pts => pts.map(p => ({ x: p.x * w, y: p.y * h })));

  const GLOWCOLORS = ['6,182,212', '180,140,60', '180,140,60', '6,182,212', '16,185,129'];
  const pulseNodes = Array.from({ length: 22 }, () => ({
    xi: Math.floor(rand(1, Math.floor(w / 60))),
    yi: Math.floor(rand(1, Math.floor(h / 60))),
    phase: rand(0, Math.PI * 2),
    speed: rand(0.0006, 0.0018),
    color: GLOWCOLORS[Math.floor(Math.random() * GLOWCOLORS.length)],
  }));

  // Fixed route lines between key points
  const routes = [
    [{ x: 0.22, y: 0.35 }, { x: 0.50, y: 0.42 }, { x: 0.73, y: 0.38 }],
    [{ x: 0.38, y: 0.68 }, { x: 0.52, y: 0.50 }, { x: 0.66, y: 0.55 }],
  ].map(path => path.map(p => ({ x: p.x * w, y: p.y * h })));

  return (ctx: CanvasRenderingContext2D, t: number) => {
    ctx.fillStyle = '#0f0c05';
    ctx.fillRect(0, 0, w, h);

    const drift = (t * 0.004) % 60;

    // Parchment radial base
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.62);
    bg.addColorStop(0, 'rgba(175,138,58,0.072)');
    bg.addColorStop(0.5, 'rgba(6,182,212,0.025)');
    bg.addColorStop(1, 'rgba(175,138,58,0)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    // Background cartographic grid (drifting)
    ctx.strokeStyle = 'rgba(175,138,58,0.038)';
    ctx.lineWidth = 1;
    for (let x = -60 + drift % 60; x < w + 60; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = drift % 60 - 60; y < h + 60; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Diagonal survey lines
    ctx.strokeStyle = 'rgba(175,138,58,0.015)'; ctx.lineWidth = 1;
    for (let x = -h + drift % 120; x < w + h; x += 120) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + h, 0); ctx.stroke();
    }

    // Globe depth shadow
    const shadow = ctx.createRadialGradient(cx + globeR * 0.12, cy + globeR * 0.14, 0, cx, cy, globeR * 1.12);
    shadow.addColorStop(0.72, 'rgba(0,0,0,0)');
    shadow.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = shadow; ctx.beginPath(); ctx.arc(cx, cy, globeR * 1.14, 0, Math.PI * 2); ctx.fill();

    // Globe interior fill
    const globeFill = ctx.createRadialGradient(cx - globeR * 0.28, cy - globeR * 0.28, 0, cx, cy, globeR);
    globeFill.addColorStop(0, 'rgba(135,108,38,0.07)');
    globeFill.addColorStop(0.65, 'rgba(95,72,18,0.04)');
    globeFill.addColorStop(1, 'rgba(55,38,8,0.09)');
    ctx.fillStyle = globeFill; ctx.beginPath(); ctx.arc(cx, cy, globeR, 0, Math.PI * 2); ctx.fill();

    // Clip globe interior for latitude/longitude and continents
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, globeR - 1, 0, Math.PI * 2); ctx.clip();

    // Latitude lines (ellipses to simulate sphere curvature)
    ctx.strokeStyle = 'rgba(175,138,58,0.065)'; ctx.lineWidth = 0.85;
    for (let i = 1; i < 8; i++) {
      const lat = cy - globeR + (i / 8) * 2 * globeR;
      const latR = Math.sqrt(Math.max(0, globeR * globeR - (lat - cy) * (lat - cy)));
      ctx.beginPath(); ctx.ellipse(cx, lat, latR, latR * 0.16, 0, 0, Math.PI * 2); ctx.stroke();
    }

    // Longitude lines (ellipses with rotating drift)
    const lonDrift = (t * 0.00038) % (Math.PI / 8);
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI / 8) + lonDrift;
      ctx.strokeStyle = 'rgba(175,138,58,0.058)'; ctx.lineWidth = 0.85;
      ctx.beginPath(); ctx.ellipse(cx, cy, globeR * Math.abs(Math.cos(angle)) + 0.5, globeR, 0, 0, Math.PI * 2); ctx.stroke();
    }

    // Continent shapes
    ctx.lineWidth = 1;
    for (const pts of continentDefs) {
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      ctx.quadraticCurveTo(pts[pts.length - 1].x, pts[pts.length - 1].y, pts[0].x, pts[0].y);
      ctx.fillStyle = 'rgba(135,105,28,0.09)'; ctx.fill();
      ctx.strokeStyle = 'rgba(175,138,58,0.20)'; ctx.stroke();
    }

    // Route lines between waypoints
    const routeAlpha = 0.045 + 0.025 * Math.sin(t * 0.0006);
    for (const route of routes) {
      ctx.beginPath(); ctx.moveTo(route[0].x, route[0].y);
      for (let i = 1; i < route.length; i++) { ctx.lineTo(route[i].x, route[i].y); }
      ctx.setLineDash([4, 8]);
      ctx.strokeStyle = `rgba(6,182,212,${routeAlpha})`; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.setLineDash([]);
      for (const pt of route) {
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6,182,212,${routeAlpha * 3})`; ctx.fill();
      }
    }

    ctx.restore(); // end globe clip

    // Globe rim ring
    const globeA = 0.22 + 0.06 * Math.sin(t * 0.00032);
    ctx.strokeStyle = `rgba(175,138,58,${globeA})`; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(cx, cy, globeR, 0, Math.PI * 2); ctx.stroke();
    // Atmospheric glow halo
    const atmGlow = ctx.createRadialGradient(cx, cy, globeR * 0.93, cx, cy, globeR * 1.07);
    atmGlow.addColorStop(0, 'rgba(6,182,212,0)');
    atmGlow.addColorStop(0.5, `rgba(6,182,212,${0.032 + 0.015 * Math.sin(t * 0.00032)})`);
    atmGlow.addColorStop(1, 'rgba(6,182,212,0)');
    ctx.fillStyle = atmGlow; ctx.beginPath(); ctx.arc(cx, cy, globeR * 1.08, 0, Math.PI * 2); ctx.fill();

    // Pulsing waypoint nodes (across the full canvas)
    for (const n of pulseNodes) {
      const nx = n.xi * 60 + drift * 0.5 % 60;
      const ny = n.yi * 60;
      const pulse = 0.5 + 0.5 * Math.sin(t * n.speed + n.phase);
      const a = 0.10 + 0.45 * pulse;
      const r = 2 + 3.5 * pulse;
      const dg = ctx.createRadialGradient(nx, ny, 0, nx, ny, r);
      dg.addColorStop(0, `rgba(${n.color},${a})`);
      dg.addColorStop(1, `rgba(${n.color},0)`);
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(nx, ny, r, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(nx, ny, 1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${n.color},${Math.min(1, a * 2.5)})`; ctx.fill();
    }

    // Enhanced compass rose (bottom-left corner)
    const cScale = Math.min(w, h) / 800;
    const compCx = w * 0.09, compCy = h * 0.88;
    const compR = 26 * cScale;
    const compRot = t * 0.000014;
    const compA = 0.22 + 0.08 * Math.sin(t * 0.00042);

    // Three concentric rings
    for (const [ringR, ringOpacity] of [[1, 1], [0.72, 0.7], [0.46, 0.45]] as [number, number][]) {
      ctx.beginPath(); ctx.arc(compCx, compCy, compR * ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(175,138,58,${compA * ringOpacity})`; ctx.lineWidth = 1; ctx.stroke();
    }
    // 16-point cardinal lines
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI / 8) + compRot;
      const isMain = i % 4 === 0, isMid = i % 2 === 0;
      const len = isMain ? compR : isMid ? compR * 0.72 : compR * 0.52;
      ctx.strokeStyle = `rgba(175,138,58,${compA * (isMain ? 1.9 : isMid ? 1.2 : 0.65)})`;
      ctx.lineWidth = isMain ? 1.3 : 0.8;
      ctx.beginPath();
      ctx.moveTo(compCx + Math.cos(angle) * compR * 0.14, compCy + Math.sin(angle) * compR * 0.14);
      ctx.lineTo(compCx + Math.cos(angle) * len, compCy + Math.sin(angle) * len);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(compCx, compCy, 2.8 * cScale, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(6,182,212,${compA * 2.8})`; ctx.fill();

    // Scale bar (bottom-right)
    const sbX = w * 0.82, sbY = h * 0.92, sbW = 60 * cScale;
    ctx.strokeStyle = `rgba(175,138,58,${compA * 0.8})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sbX, sbY); ctx.lineTo(sbX + sbW, sbY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sbX, sbY - 4 * cScale); ctx.lineTo(sbX, sbY + 4 * cScale); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sbX + sbW, sbY - 4 * cScale); ctx.lineTo(sbX + sbW, sbY + 4 * cScale); ctx.stroke();
    // Alternating filled segments
    ctx.fillStyle = `rgba(175,138,58,${compA * 0.6})`;
    ctx.fillRect(sbX, sbY - 2 * cScale, sbW * 0.5, 4 * cScale);

    // Edge vignette
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.42, w * 0.5, h * 0.5, Math.max(w, h) * 0.86);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.54)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
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
