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
  const cStars = [
    ...midStars.slice(0, 9).map(s => ({ ...s, size: Math.max(s.size, 1.1) })),
    ...nearStars.slice(0, 5),
  ];
  const cLines: [number, number][] = [
    [0,1],[1,2],[2,3],[3,4],[4,0],[2,5],[5,6],[6,7],[3,8],[8,9],[9,10],[0,11],[11,12],[12,13],
  ];
  const glowStars = nearStars.slice(0, 8);

  return (ctx: CanvasRenderingContext2D, t: number) => {
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);
    const breathe = 0.045 + 0.030 * Math.sin(t * 0.00055);
    const aura = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.44);
    aura.addColorStop(0, `rgba(6,182,212,${breathe})`);
    aura.addColorStop(0.5, `rgba(6,182,212,${breathe * 0.35})`);
    aura.addColorStop(1, 'rgba(6,182,212,0)');
    ctx.fillStyle = aura; ctx.fillRect(0, 0, w, h);
    const purpA = 0.028 + 0.018 * Math.sin(t * 0.00042 + 1.5);
    const purp = ctx.createRadialGradient(w * 0.27, h * 0.68, 0, w * 0.27, h * 0.68, w * 0.40);
    purp.addColorStop(0, `rgba(168,85,247,${purpA})`);
    purp.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.fillStyle = purp; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const consAlpha = 0.09 + 0.04 * Math.sin(t * 0.00040);
    ctx.strokeStyle = `rgba(100,200,255,${consAlpha})`; ctx.lineWidth = 0.75;
    for (const [a, b] of cLines) {
      if (a < cStars.length && b < cStars.length) {
        ctx.beginPath(); ctx.moveTo(cStars[a].x, cStars[a].y); ctx.lineTo(cStars[b].x, cStars[b].y); ctx.stroke();
      }
    }
    for (const s of farStars) {
      const alpha = 0.16 + 0.20 * Math.sin(t * s.speed + s.phase);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,215,255,${alpha})`; ctx.fill();
    }
    for (const s of midStars) {
      const alpha = 0.28 + 0.30 * Math.sin(t * s.speed + s.phase);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,232,255,${alpha})`; ctx.fill();
    }
    for (const s of nearStars) {
      const alpha = 0.48 + 0.42 * Math.sin(t * s.speed + s.phase);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,245,255,${alpha})`; ctx.fill();
    }
    for (const gs of glowStars) {
      const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.0009 + gs.phase));
      const alpha = 0.12 + 0.28 * pulse;
      const crossLen = gs.size * 7.5 * (0.7 + 0.3 * pulse);
      ctx.save(); ctx.translate(gs.x, gs.y);
      ctx.strokeStyle = `rgba(180,240,255,${alpha * 0.7})`; ctx.lineWidth = 0.7;
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
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.38, w * 0.5, h * 0.5, Math.max(w, h) * 0.82);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.62)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
  };
}

// ─── INTERSTELLAR PLANE — Space Field ─────────────────────────────────────
interface ShootingStar { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; length: number; }

function initInterstellar(w: number, h: number) {
  const starColors = [
    { r: 155, g: 176, b: 255 },
    { r: 200, g: 220, b: 255 },
    { r: 255, g: 252, b: 240 },
    { r: 255, g: 220, b: 170 },
    { r: 255, g: 190, b: 130 },
  ];

  const farStars = Array.from({ length: 280 }, () => ({
    x: rand(0, w), y: rand(0, h), size: rand(0.1, 0.4),
    phase: rand(0, Math.PI * 2), speed: rand(0.0001, 0.0003),
    ...starColors[Math.floor(rand(0, starColors.length))],
  }));
  const midStars = Array.from({ length: 200 }, () => ({
    x: rand(0, w), y: rand(0, h), size: rand(0.4, 1.1),
    phase: rand(0, Math.PI * 2), speed: rand(0.0003, 0.0009),
    ...starColors[Math.floor(rand(0, 3))],
  }));
  const nearStars = Array.from({ length: 60 }, () => ({
    x: rand(0, w), y: rand(0, h), size: rand(1.0, 2.8),
    phase: rand(0, Math.PI * 2), speed: rand(0.0007, 0.0018),
    ...starColors[Math.floor(rand(0, 3))],
  }));

  const mwAngle = 0.32;
  const mwStars = Array.from({ length: 400 }, () => {
    const along = rand(0, Math.sqrt(w * w + h * h));
    const perp = rand(-h * 0.1, h * 0.1) * (0.5 + 0.5 * Math.abs(rand(-1, 1)));
    return {
      x: Math.cos(mwAngle) * along - Math.sin(mwAngle) * perp + w * 0.1,
      y: Math.sin(mwAngle) * along + Math.cos(mwAngle) * perp + h * 0.05,
      size: rand(0.1, 0.5), alpha: rand(0.12, 0.42),
    };
  });

  const coreStars = Array.from({ length: 60 }, () => {
    const angle = rand(0, Math.PI * 2);
    const dist = rand(0, 0.12) * Math.min(w, h);
    return {
      x: w * 0.5 + Math.cos(angle) * dist,
      y: h * 0.42 + Math.sin(angle) * dist * 0.7,
      size: rand(0.15, 0.6), alpha: rand(0.20, 0.65),
    };
  });

  const cons1Nodes = Array.from({ length: 12 }, () => ({ x: rand(w * 0.05, w * 0.48), y: rand(h * 0.05, h * 0.52) }));
  const cons1Lines: [number, number][] = [[0,1],[1,2],[2,3],[3,4],[4,0],[1,5],[5,6],[2,7],[7,8],[8,9],[0,10],[10,11]];
  const cons2Nodes = Array.from({ length: 10 }, () => ({ x: rand(w * 0.52, w * 0.95), y: rand(h * 0.48, h * 0.95) }));
  const cons2Lines: [number, number][] = [[0,1],[1,2],[2,3],[3,0],[1,4],[4,5],[5,6],[0,7],[7,8],[8,9]];

  const pathNodes = [
    { x: w * 0.12, y: h * 0.22 }, { x: w * 0.35, y: h * 0.35 },
    { x: w * 0.58, y: h * 0.28 }, { x: w * 0.80, y: h * 0.42 }, { x: w * 0.92, y: h * 0.65 },
  ];
  const pathControls = [
    { x: w * 0.22, y: h * 0.12 }, { x: w * 0.48, y: h * 0.50 },
    { x: w * 0.68, y: h * 0.18 }, { x: w * 0.88, y: h * 0.30 },
  ];

  const orbitalRings = [
    { cx: w * 0.5, cy: h * 0.42, rx: w * 0.38, ry: h * 0.12, angle: 0.15, speed: 0.000008 },
    { cx: w * 0.5, cy: h * 0.42, rx: w * 0.52, ry: h * 0.16, angle: -0.22, speed: -0.000005 },
    { cx: w * 0.5, cy: h * 0.42, rx: w * 0.28, ry: h * 0.085, angle: 0.35, speed: 0.000012 },
  ];

  const lumClusters = Array.from({ length: 5 }, () => ({
    x: rand(w * 0.1, w * 0.9), y: rand(h * 0.1, h * 0.9),
    size: rand(2.5, 5.0), phase: rand(0, Math.PI * 2),
    r: Math.floor(rand(160, 220)), g: Math.floor(rand(200, 255)), b: Math.floor(rand(240, 255)),
  }));

  let shooters: ShootingStar[] = [];
  let nextShootDelay = rand(1000, 3000);
  let elapsed = 0;

  return (ctx: CanvasRenderingContext2D, t: number) => {
    const dt = t - elapsed; elapsed = t;

    ctx.fillStyle = '#020309';
    ctx.fillRect(0, 0, w, h);

    const bg = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, w * 0.75);
    bg.addColorStop(0, '#0a0318');
    bg.addColorStop(0.5, '#04091a');
    bg.addColorStop(1, 'rgba(2,3,9,0)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    const np = 0.6 + 0.4 * Math.sin(t * 0.000038);
    const nebDefs = [
      { x: 0.28, y: 0.38, rx: 0.32, ry: 0.28, c: '6,182,212',  a: 0.28, drift: 0.00004 },
      { x: 0.73, y: 0.62, rx: 0.30, ry: 0.24, c: '168,85,247', a: 0.22, drift: -0.000035 },
      { x: 0.55, y: 0.78, rx: 0.26, ry: 0.18, c: '244,63,94',  a: 0.12, drift: 0.000028 },
      { x: 0.16, y: 0.68, rx: 0.24, ry: 0.16, c: '245,158,11', a: 0.12, drift: -0.000042 },
      { x: 0.87, y: 0.22, rx: 0.22, ry: 0.15, c: '16,185,129', a: 0.14, drift: 0.000031 },
      { x: 0.48, y: 0.20, rx: 0.20, ry: 0.12, c: '99,102,241', a: 0.16, drift: -0.000025 },
      { x: 0.82, y: 0.78, rx: 0.18, ry: 0.12, c: '6,182,212',  a: 0.10, drift: 0.000035 },
    ];
    for (const n of nebDefs) {
      const dx = w * n.x + Math.sin(t * n.drift) * w * 0.02;
      const dy = h * n.y + Math.cos(t * n.drift * 1.3) * h * 0.015;
      const neb = ctx.createRadialGradient(dx, dy, 0, dx, dy, Math.max(w * n.rx, h * n.ry));
      neb.addColorStop(0,    `rgba(${n.c},${n.a * np * 1.2})`);
      neb.addColorStop(0.35, `rgba(${n.c},${n.a * np * 0.7})`);
      neb.addColorStop(0.7,  `rgba(${n.c},${n.a * np * 0.25})`);
      neb.addColorStop(1,    `rgba(${n.c},0)`);
      ctx.fillStyle = neb; ctx.fillRect(0, 0, w, h);
    }

    // Hexagonal navigation grid
    const hexSize = 55;
    const hexW2 = Math.sqrt(3) * hexSize;
    const hexH2 = 2 * hexSize;
    ctx.strokeStyle = 'rgba(100,180,255,0.05)'; ctx.lineWidth = 0.7;
    for (let row = -1; row <= Math.ceil(h / (hexH2 * 0.75)) + 1; row++) {
      for (let col = -1; col <= Math.ceil(w / hexW2) + 1; col++) {
        const hx = col * hexW2 + (row % 2 !== 0 ? hexW2 / 2 : 0);
        const hy = row * hexH2 * 0.75;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const px = hx + hexSize * Math.cos(angle);
          const py = hy + hexSize * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.stroke();
      }
    }

    for (const ms of mwStars) {
      ctx.beginPath(); ctx.arc(ms.x, ms.y, ms.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,220,255,${ms.alpha})`; ctx.fill();
    }

    const coreGlow = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, w * 0.14);
    const coreP = 0.5 + 0.5 * Math.sin(t * 0.000065);
    coreGlow.addColorStop(0, `rgba(255,230,180,${0.06 + 0.03 * coreP})`);
    coreGlow.addColorStop(0.4, `rgba(200,180,255,${0.04 * coreP})`);
    coreGlow.addColorStop(1, 'rgba(100,50,200,0)');
    ctx.fillStyle = coreGlow; ctx.fillRect(0, 0, w, h);
    for (const s of coreStars) {
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(240,225,200,${s.alpha})`; ctx.fill();
    }

    for (const s of farStars) {
      const alpha = 0.15 + 0.25 * Math.sin(t * s.speed + s.phase);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${alpha})`; ctx.fill();
    }
    for (const s of midStars) {
      const alpha = 0.40 + 0.45 * Math.sin(t * s.speed + s.phase);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${alpha})`; ctx.fill();
    }
    for (const s of nearStars) {
      const alpha = 0.40 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${alpha})`; ctx.fill();
    }

    for (const ring of orbitalRings) {
      const rot = t * ring.speed;
      ctx.save();
      ctx.translate(ring.cx, ring.cy);
      ctx.rotate(ring.angle + rot);
      ctx.beginPath(); ctx.ellipse(0, 0, ring.rx, ring.ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(100,200,255,${0.09 + 0.04 * Math.sin(t * 0.00025)})`;
      ctx.lineWidth = 0.55; ctx.stroke();
      ctx.restore();
    }

    const pathAlpha = 0.10 + 0.05 * Math.sin(t * 0.00022);
    ctx.strokeStyle = `rgba(150,220,255,${pathAlpha})`; ctx.lineWidth = 0.7;
    for (let i = 0; i < pathNodes.length - 1; i++) {
      ctx.beginPath();
      ctx.moveTo(pathNodes[i].x, pathNodes[i].y);
      ctx.quadraticCurveTo(pathControls[i].x, pathControls[i].y, pathNodes[i + 1].x, pathNodes[i + 1].y);
      ctx.stroke();
    }
    const travelT = (t * 0.00016) % 1;
    for (let i = 0; i < pathNodes.length - 1; i++) {
      const tp = (travelT + i * 0.25) % 1;
      const om = 1 - tp;
      const px = om * om * pathNodes[i].x + 2 * om * tp * pathControls[i].x + tp * tp * pathNodes[i + 1].x;
      const py = om * om * pathNodes[i].y + 2 * om * tp * pathControls[i].y + tp * tp * pathNodes[i + 1].y;
      const dotA = tp < 0.2 ? tp / 0.2 : tp > 0.8 ? (1 - tp) / 0.2 : 1;
      ctx.beginPath(); ctx.arc(px, py, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(150,240,255,${0.7 * dotA})`; ctx.fill();
    }

    const ca1 = 0.11 + 0.05 * Math.sin(t * 0.00012);
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

    for (const lc of lumClusters) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.0009 + lc.phase);
      const alpha = 0.55 + 0.45 * pulse;
      const halo = ctx.createRadialGradient(lc.x, lc.y, 0, lc.x, lc.y, lc.size * 6);
      halo.addColorStop(0, `rgba(${lc.r},${lc.g},${lc.b},${alpha * 0.35})`);
      halo.addColorStop(0.5, `rgba(${lc.r},${lc.g},${lc.b},${alpha * 0.08})`);
      halo.addColorStop(1, `rgba(${lc.r},${lc.g},${lc.b},0)`);
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(lc.x, lc.y, lc.size * 6, 0, Math.PI * 2); ctx.fill();
      const crossLen = lc.size * 9 * (0.8 + 0.2 * pulse);
      ctx.save(); ctx.translate(lc.x, lc.y);
      ctx.strokeStyle = `rgba(${lc.r},${lc.g},${lc.b},${alpha * 0.65})`; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-crossLen, 0); ctx.lineTo(crossLen, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -crossLen); ctx.lineTo(0, crossLen); ctx.stroke();
      const diagLen = crossLen * 0.45;
      ctx.strokeStyle = `rgba(${lc.r},${lc.g},${lc.b},${alpha * 0.28})`;
      ctx.beginPath(); ctx.moveTo(-diagLen, -diagLen); ctx.lineTo(diagLen, diagLen); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(diagLen, -diagLen); ctx.lineTo(-diagLen, diagLen); ctx.stroke();
      ctx.restore();
      ctx.beginPath(); ctx.arc(lc.x, lc.y, lc.size * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${lc.r},${lc.g},${lc.b},${Math.min(1, alpha * 1.2)})`; ctx.fill();
    }

    nextShootDelay -= dt;
    if (nextShootDelay <= 0) {
      const angle = rand(-0.32, -0.10) * Math.PI;
      const speed = rand(320, 600);
      shooters.push({ x: rand(0, w * 0.8), y: rand(0, h * 0.6), vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0, maxLife: 480, length: rand(80, 200) });
      nextShootDelay = rand(1800, 5000);
    }
    shooters = shooters.filter((ss) => {
      ss.life += dt;
      if (ss.life > ss.maxLife) return false;
      const prog = ss.life / ss.maxLife;
      const alpha = prog < 0.25 ? prog / 0.25 : 1 - (prog - 0.25) / 0.75;
      const tailFrac = Math.min(1, ss.life / 180);
      const tailX = ss.x - (ss.vx / 400) * ss.length * tailFrac;
      const tailY = ss.y - (ss.vy / 400) * ss.length * tailFrac;
      const grad = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, `rgba(255,255,255,${alpha * 0.92})`);
      ctx.save();
      ctx.strokeStyle = grad; ctx.lineWidth = 1.6;
      ctx.shadowColor = 'rgba(180,230,255,0.5)'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(ss.x, ss.y); ctx.stroke();
      const ghostTailX = tailX - (ss.vx / 400) * ss.length * 0.3;
      const ghostTailY = tailY - (ss.vy / 400) * ss.length * 0.3;
      const ghostGrad = ctx.createLinearGradient(ghostTailX, ghostTailY, tailX, tailY);
      ghostGrad.addColorStop(0, 'rgba(100,180,255,0)');
      ghostGrad.addColorStop(1, `rgba(100,180,255,${alpha * 0.25})`);
      ctx.strokeStyle = ghostGrad; ctx.lineWidth = 0.8; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(ghostTailX, ghostTailY); ctx.lineTo(tailX, tailY); ctx.stroke();
      ctx.restore();
      ss.x += ss.vx * (dt / 1000); ss.y += ss.vy * (dt / 1000);
      return true;
    });

    const nodeAlpha = 0.28 + 0.18 * Math.sin(t * 0.00022);
    for (let i = 0; i < cons1Nodes.length; i++) {
      const p = cons1Nodes[i];
      const pa = nodeAlpha * (0.5 + 0.5 * Math.sin(t * 0.0008 + i * 0.7));
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100,200,255,${Math.min(1, pa * 2.5)})`; ctx.fill();
    }
    for (let i = 0; i < cons2Nodes.length; i++) {
      const p = cons2Nodes[i];
      const pa = nodeAlpha * (0.5 + 0.5 * Math.sin(t * 0.0007 + i * 0.9));
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,140,255,${Math.min(1, pa * 2.5)})`; ctx.fill();
    }
    for (let i = 0; i < pathNodes.length; i++) {
      const p = pathNodes[i];
      const pa = 0.22 + 0.14 * Math.sin(t * 0.0006 + i * 1.1);
      const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 4);
      pg.addColorStop(0, `rgba(150,240,255,${pa * 2.2})`);
      pg.addColorStop(1, 'rgba(150,240,255,0)');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,250,255,${pa * 3})`; ctx.fill();
    }

    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.40, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
  };
}

// ─── MEMORY PALACE — Architectural Blueprint Cognition ─────────────────────
function initMemoryPalace(w: number, h: number) {
  const scale = Math.min(w, h) / 900;
  const cx = w * 0.5, cy = h * 0.5;
  const baseW = 1280;
  const baseH = 720;
  const sx = w / baseW;
  const sy = h / baseH;

  const rooms = [
    { x: cx - 100 * scale, y: cy - 180 * scale, width: 200 * scale, height: 360 * scale, label: 'CENTRAL ARCHIVE', hidden: false },
    { x: cx - 310 * scale, y: cy - 140 * scale, width: 185 * scale, height: 280 * scale, label: 'VAULT 7',          hidden: false },
    { x: cx + 125 * scale, y: cy - 140 * scale, width: 185 * scale, height: 280 * scale, label: 'CHAMBER 3',        hidden: false },
    { x: cx - 70  * scale, y: cy - 320 * scale, width: 140 * scale, height: 130 * scale, label: 'OBSERVATORY',      hidden: false },
    { x: cx - 170 * scale, y: cy + 200 * scale, width: 340 * scale, height: 115 * scale, label: 'GALLERY B',        hidden: false },
    { x: cx - 420 * scale, y: cy - 90  * scale, width: 100 * scale, height: 160 * scale, label: 'ANTE-4',           hidden: false },
    { x: cx + 320 * scale, y: cy - 90  * scale, width: 100 * scale, height: 160 * scale, label: 'ANTE-5',           hidden: false },
    { x: cx - 260 * scale, y: cy - 60  * scale, width: 110 * scale, height: 110 * scale, label: 'VOID ROOM',        hidden: true  },
    { x: cx - 35  * scale, y: cy - 50  * scale, width: 70  * scale, height: 100 * scale, label: '???',              hidden: true  },
    { x: cx - 30  * scale, y: cy - 295 * scale, width: 60  * scale, height: 55  * scale, label: 'INNER',            hidden: false },
    { x: cx + 330 * scale, y: cy + 80  * scale, width: 80  * scale, height: 120 * scale, label: 'CORRIDOR 9',       hidden: false },
    { x: cx - 400 * scale, y: cy + 80  * scale, width: 80  * scale, height: 120 * scale, label: 'ANNEX B',          hidden: false },
  ];

  const crosshairs = [
    { x: cx,               y: cy - 90  * scale },
    { x: cx - 215 * scale, y: cy - 5   * scale },
    { x: cx + 215 * scale, y: cy - 5   * scale },
    { x: cx,               y: cy + 240 * scale },
    { x: cx - 360 * scale, y: cy - 10  * scale },
  ];

  const coffeeStains = [
    { x: cx - 180 * scale, y: cy + 120 * scale, r: 80 * scale },
    { x: cx + 150 * scale, y: cy - 200 * scale, r: 60 * scale },
    { x: cx + 280 * scale, y: cy + 150 * scale, r: 50 * scale },
  ];

  const blueprintRects = [
    { x: 380, y: 220, width: 520, height: 480, lineWidth: 3, opacity: 0.82, color: '46,139,139', radius: 8 },
    { x: 420, y: 280, width: 240, height: 180, lineWidth: 1.1, opacity: 0.55, color: '74,124,142' },
    { x: 680, y: 310, width: 180, height: 320, lineWidth: 1.1, opacity: 0.55, color: '74,124,142' },
    { x: 480, y: 380, width: 160, height: 240, lineWidth: 2, opacity: 0.65, color: '46,139,139' },
    { x: 220, y: 280, width: 140, height: 110, lineWidth: 2.2, opacity: 0.75, color: '46,139,139' },
    { x: 820, y: 180, width: 90, height: 160, lineWidth: 2, opacity: 0.78, color: '46,139,139' },
  ];


  const blueprintLayer2Giant = [
    { x: 520, y: 180, width: 130, height: 95, lineWidth: 1.8, opacity: 0.58, color: '46,139,139' },
    { x: 310, y: 520, width: 145, height: 110, lineWidth: 1.8, opacity: 0.55, color: '46,139,139' },
  ];

  const blueprintLayer2Rooms = [
    { x: 650, y: 480, width: 68, height: 52, lineWidth: 1, opacity: 0.65, color: '74,124,142' },
    { x: 580, y: 455, width: 62, height: 44, lineWidth: 1, opacity: 0.63, color: '74,124,142' },
    { x: 725, y: 470, width: 74, height: 56, lineWidth: 1, opacity: 0.62, color: '74,124,142' },
    { x: 610, y: 545, width: 64, height: 46, lineWidth: 1, opacity: 0.64, color: '74,124,142' },
    { x: 690, y: 545, width: 58, height: 48, lineWidth: 1, opacity: 0.66, color: '74,124,142' },
  ];

  const blueprintLayer2MicroRooms = [
    { x: 740, y: 290, width: 14, height: 11 },
    { x: 756, y: 289, width: 12, height: 10 },
    { x: 771, y: 291, width: 13, height: 10 },
    { x: 739, y: 304, width: 11, height: 9 },
    { x: 752, y: 303, width: 12, height: 9 },
    { x: 766, y: 304, width: 10, height: 8 },
    { x: 778, y: 304, width: 11, height: 9 },
    { x: 744, y: 316, width: 13, height: 10 },
    { x: 760, y: 316, width: 12, height: 10 },
    { x: 775, y: 317, width: 12, height: 9 },
    { x: 736, y: 329, width: 12, height: 9 },
    { x: 750, y: 330, width: 13, height: 9 },
  ];
  return (ctx: CanvasRenderingContext2D, t: number) => {
    ctx.fillStyle = '#020912';
    ctx.fillRect(0, 0, w, h);

    // Paper grain
    for (let i = 0; i < 1200; i++) {
      ctx.fillStyle = 'rgba(180,200,220,0.028)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 0.8, 0.8);
    }

    for (const cs of coffeeStains) {
      const stain = ctx.createRadialGradient(cs.x, cs.y, 0, cs.x, cs.y, cs.r);
      stain.addColorStop(0,    'rgba(80,50,20,0.0)');
      stain.addColorStop(0.6,  'rgba(80,50,20,0.03)');
      stain.addColorStop(0.85, 'rgba(80,50,20,0.06)');
      stain.addColorStop(1,    'rgba(80,50,20,0.0)');
      ctx.fillStyle = stain; ctx.fillRect(cs.x - cs.r, cs.y - cs.r, cs.r * 2, cs.r * 2);
    }

    ctx.strokeStyle = 'rgba(0,160,200,0.055)'; ctx.lineWidth = 0.5;
    const gs = 20 * scale;
    for (let x = 0; x < w; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    // Fold line
    const foldA = 0.045 + 0.020 * Math.sin(t * 0.00022);
    ctx.strokeStyle = `rgba(0,180,220,${foldA})`; ctx.lineWidth = 1;
    ctx.setLineDash([8, 5]);
    ctx.beginPath(); ctx.moveTo(w * 0.08, 0); ctx.lineTo(w, h * 0.85); ctx.stroke();
    ctx.setLineDash([]);

    // Blueprint layer 1 structural mass
    for (const rect of blueprintRects) {
      const rx = rect.x * sx;
      const ry = rect.y * sy;
      const rw = rect.width * sx;
      const rh = rect.height * sy;
      const pulse = 0.92 + 0.08 * Math.sin(t * 0.0002 + rect.x * 0.01);
      ctx.strokeStyle = `rgba(${rect.color},${rect.opacity * pulse})`;
      ctx.lineWidth = rect.lineWidth * scale;
      if (rect.radius) {
        ctx.beginPath();
        ctx.roundRect(rx, ry, rw, rh, rect.radius * scale);
        ctx.stroke();
      } else {
        ctx.strokeRect(rx, ry, rw, rh);
      }
    }

    // Blueprint layer 2 multi-scale room system
    for (const rect of [...blueprintLayer2Giant, ...blueprintLayer2Rooms]) {
      const rx = rect.x * sx;
      const ry = rect.y * sy;
      const rw = rect.width * sx;
      const rh = rect.height * sy;
      const pulse = 0.9 + 0.1 * Math.sin(t * 0.00024 + rect.x * 0.012);
      ctx.strokeStyle = `rgba(${rect.color},${rect.opacity * pulse})`;
      ctx.lineWidth = rect.lineWidth * scale;
      ctx.strokeRect(rx, ry, rw, rh);
    }

    // Dense micro-room clusters
    const microA = 0.34 + 0.04 * Math.sin(t * 0.00022);
    ctx.strokeStyle = `rgba(74,124,142,${microA})`;
    ctx.lineWidth = 0.5 * scale;
    for (const room of blueprintLayer2MicroRooms) {
      ctx.strokeRect(room.x * sx, room.y * sy, room.width * sx, room.height * sy);
    }

    // Layer 2 infrastructure shaft
    ctx.strokeStyle = 'rgba(74,124,142,0.45)';
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.moveTo(420 * sx, 650 * sy);
    ctx.lineTo(420 * sx, Math.min(h, 720 * sy));
    ctx.stroke();

    // connecting corridor (double line)
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(46,139,139,0.70)';
    ctx.lineWidth = 7 * scale;
    ctx.beginPath();
    ctx.moveTo(380 * sx, 340 * sy);
    ctx.lineTo(220 * sx, 340 * sy);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(5,13,26,0.90)';
    ctx.lineWidth = 3.5 * scale;
    ctx.beginPath();
    ctx.moveTo(380 * sx, 340 * sy);
    ctx.lineTo(220 * sx, 340 * sy);
    ctx.stroke();

    // corridor exiting viewport
    ctx.strokeStyle = 'rgba(46,139,139,0.75)';
    ctx.lineWidth = 6 * scale;
    ctx.beginPath();
    ctx.moveTo(920 * sx, 420 * sy);
    ctx.lineTo(Math.min(w + 20 * scale, 1050 * sx), 420 * sy);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Hidden rooms
    ctx.strokeStyle = 'rgba(0,180,220,0.055)'; ctx.lineWidth = 0.8;
    ctx.setLineDash([4, 4]);
    for (const r of rooms.filter(r => r.hidden)) {
      ctx.strokeRect(r.x, r.y, r.width, r.height);
      ctx.strokeRect(r.x + 4, r.y + 4, r.width - 8, r.height - 8);
    }
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(0,160,200,0.008)';
    for (const r of rooms.filter(r => !r.hidden)) ctx.fillRect(r.x, r.y, r.width, r.height);

    const wallA = 0.28 + 0.04 * Math.sin(t * 0.00020);
    ctx.strokeStyle = `rgba(0,180,220,${wallA})`; ctx.lineWidth = 1.8;
    for (const r of rooms.filter(r => !r.hidden)) ctx.strokeRect(r.x, r.y, r.width, r.height);
    const innerOff = 3.5 * scale;
    ctx.strokeStyle = `rgba(0,180,220,${wallA * 0.45})`; ctx.lineWidth = 0.7;
    for (const r of rooms.filter(r => !r.hidden)) {
      ctx.strokeRect(r.x + innerOff, r.y + innerOff, r.width - innerOff * 2, r.height - innerOff * 2);
    }

    ctx.font = `${Math.max(7, 8 * scale)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    const labelA = 0.46 + 0.10 * Math.sin(t * 0.00028);
    for (const r of rooms) {
      const lx = r.x + r.width / 2;
      const ly = r.y + r.height / 2;
      ctx.fillStyle = r.hidden ? `rgba(0,160,200,${labelA * 0.4})` : `rgba(0,200,230,${labelA})`;
      ctx.fillText(r.label, lx, ly);
      if (!r.hidden) {
        ctx.beginPath(); ctx.arc(lx, ly - 10 * scale, 2 * scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,200,230,${labelA * 0.6})`; ctx.fill();
      }
    }

    // Dimension lines
    const dimA = 0.07 + 0.02 * Math.sin(t * 0.00016);
    ctx.strokeStyle = `rgba(0,180,220,${dimA})`; ctx.lineWidth = 0.6;
    const mr = rooms[0];
    const dimY = mr.y + mr.height + 14 * scale;
    ctx.beginPath(); ctx.moveTo(mr.x, dimY); ctx.lineTo(mr.x + mr.width, dimY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mr.x, dimY - 5 * scale); ctx.lineTo(mr.x, dimY + 5 * scale); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mr.x + mr.width, dimY - 5 * scale); ctx.lineTo(mr.x + mr.width, dimY + 5 * scale); ctx.stroke();
    const dimX = mr.x + mr.width + 14 * scale;
    ctx.beginPath(); ctx.moveTo(dimX, mr.y); ctx.lineTo(dimX, mr.y + mr.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(dimX - 5 * scale, mr.y); ctx.lineTo(dimX + 5 * scale, mr.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(dimX - 5 * scale, mr.y + mr.height); ctx.lineTo(dimX + 5 * scale, mr.y + mr.height); ctx.stroke();

    // Crosshairs
    const crossA2 = 0.11 + 0.04 * Math.sin(t * 0.00018);
    ctx.strokeStyle = `rgba(0,200,230,${crossA2})`; ctx.lineWidth = 0.7;
    const cLen = 8 * scale;
    for (const ch of crosshairs) {
      ctx.beginPath(); ctx.moveTo(ch.x - cLen, ch.y); ctx.lineTo(ch.x + cLen, ch.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ch.x, ch.y - cLen); ctx.lineTo(ch.x, ch.y + cLen); ctx.stroke();
      ctx.beginPath(); ctx.arc(ch.x, ch.y, cLen * 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,200,230,${crossA2 * 0.5})`; ctx.stroke();
      ctx.strokeStyle = `rgba(0,200,230,${crossA2})`;
    }

    // Border frame
    const bM = 12 * scale;
    ctx.strokeStyle = 'rgba(0,160,200,0.09)'; ctx.lineWidth = 1;
    ctx.strokeRect(bM, bM, w - bM * 2, h - bM * 2);
    ctx.strokeStyle = 'rgba(0,160,200,0.055)';
    ctx.strokeRect(bM + 6 * scale, bM + 6 * scale, w - (bM + 6 * scale) * 2, h - (bM + 6 * scale) * 2);
    const bkLen = 20 * scale;
    ctx.strokeStyle = 'rgba(0,180,220,0.15)'; ctx.lineWidth = 1.2;
    for (const [bx, by] of [[bM, bM], [w - bM, bM], [bM, h - bM], [w - bM, h - bM]] as [number,number][]) {
      const sx = bx === bM ? 1 : -1, sy = by === bM ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(bx + sx * bkLen, by); ctx.lineTo(bx, by); ctx.lineTo(bx, by + sy * bkLen); ctx.stroke();
    }

    // Revision cloud
    const cloudA = 0.055 + 0.018 * Math.sin(t * 0.00020);
    ctx.strokeStyle = `rgba(0,200,230,${cloudA})`; ctx.lineWidth = 0.8;
    const cloudX = w * 0.82, cloudY = h * 0.18;
    const cloudW = 70 * scale, bumpR = 8 * scale, bumpCount = 5;
    ctx.beginPath();
    for (let b = 0; b < bumpCount; b++) {
      ctx.arc(cloudX - cloudW / 2 + (b + 0.5) * (cloudW / bumpCount), cloudY - bumpR * 1.5, bumpR, Math.PI, 0);
    }
    for (let b = bumpCount - 1; b >= 0; b--) {
      ctx.arc(cloudX - cloudW / 2 + (b + 0.5) * (cloudW / bumpCount), cloudY + bumpR * 0.5, bumpR, 0, Math.PI);
    }
    ctx.closePath(); ctx.stroke();
    ctx.font = `${Math.max(6, 7 * scale)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(0,200,230,${cloudA * 1.5})`;
    ctx.fillText('REV.3', cloudX, cloudY + 3);

    const coreGlow2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.4);
    coreGlow2.addColorStop(0, 'rgba(0,160,200,0.03)');
    coreGlow2.addColorStop(1, 'rgba(0,160,200,0)');
    ctx.fillStyle = coreGlow2; ctx.fillRect(0, 0, w, h);

    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.38, w * 0.5, h * 0.5, Math.max(w, h) * 0.87);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.62)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
  };
}

// ─── MYTHIC LANDSCAPE — Ritual Symbology Cartography ──────────────────────
function initMythicLandscape(w: number, h: number) {
  const cx = w * 0.5, cy = h * 0.5;

  const circleSystems = [
    { x: cx,              y: cy,              r: Math.min(w, h) * 0.18, spokes: 8,  rot: 0.00007  },
    { x: cx - w * 0.28,   y: cy - h * 0.18,  r: Math.min(w, h) * 0.10, spokes: 6,  rot: -0.00010 },
    { x: cx + w * 0.30,   y: cy + h * 0.20,  r: Math.min(w, h) * 0.09, spokes: 12, rot: 0.00006  },
  ];

  const leyNodes = [
    { x: cx,       y: cy        },
    { x: cx,       y: h * 0.14  },
    { x: w * 0.84, y: h * 0.30  },
    { x: w * 0.84, y: h * 0.70  },
    { x: cx,       y: h * 0.86  },
    { x: w * 0.16, y: h * 0.70  },
    { x: w * 0.16, y: h * 0.30  },
  ];
  const leyLines: [number, number][] = [
    [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],
    [1,2],[2,3],[3,4],[4,5],[5,6],[6,1],
    [1,3],[3,5],[5,1],
  ];

  const mythGlyphs = [
    { x: cx,       y: h * 0.05, dir: 'N' },
    { x: cx,       y: h * 0.95, dir: 'S' },
    { x: w * 0.95, y: cy,       dir: 'E' },
    { x: w * 0.05, y: cy,       dir: 'W' },
  ];

  const ceremPaths = [
    [{ x: cx - w * 0.38, y: h * 0.25 }, { x: cx - w * 0.15, y: h * 0.32 }, { x: cx, y: h * 0.26 }],
    [{ x: cx, y: h * 0.74 }, { x: cx + w * 0.15, y: h * 0.68 }, { x: cx + w * 0.38, y: h * 0.75 }],
  ];

  const EMBER = ['220,120,30','200,80,20','240,160,40','255,180,60','210,100,25'];
  const particles = Array.from({ length: 60 }, () => ({
    x: rand(cx - w * 0.35, cx + w * 0.35),
    y: rand(h * 0.3, h * 0.9),
    vx: rand(-0.08, 0.08), vy: rand(-0.10, -0.28),
    color: EMBER[Math.floor(Math.random() * EMBER.length)],
    size: rand(0.8, 2.2), alpha: rand(0.18, 0.60),
    phase: rand(0, Math.PI * 2),
  }));

  return (ctx: CanvasRenderingContext2D, t: number) => {
    ctx.fillStyle = '#060410';
    ctx.fillRect(0, 0, w, h);

    const bg = ctx.createRadialGradient(cx * 0.92, cy * 1.08, 0, cx, cy, w * 0.68);
    bg.addColorStop(0, 'rgba(90,20,140,0.15)');
    bg.addColorStop(0.4, 'rgba(40,10,80,0.08)');
    bg.addColorStop(1, 'rgba(6,4,16,0)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    const bg2 = ctx.createRadialGradient(w * 0.74, h * 0.28, 0, w * 0.74, h * 0.28, w * 0.38);
    bg2.addColorStop(0, 'rgba(0,180,100,0.06)');
    bg2.addColorStop(1, 'rgba(0,180,100,0)');
    ctx.fillStyle = bg2; ctx.fillRect(0, 0, w, h);

    // Illuminated manuscript border
    const borderA = 0.16 + 0.05 * Math.sin(t * 0.00035);
    const bM = 14;
    ctx.strokeStyle = `rgba(200,160,40,${borderA})`; ctx.lineWidth = 1.2;
    ctx.strokeRect(bM, bM, w - bM * 2, h - bM * 2);
    ctx.strokeStyle = `rgba(200,160,40,${borderA * 0.55})`; ctx.lineWidth = 0.7;
    ctx.strokeRect(bM + 8, bM + 8, w - (bM + 8) * 2, h - (bM + 8) * 2);
    const cornR = 10;
    ctx.strokeStyle = `rgba(200,160,40,${borderA * 1.2})`; ctx.lineWidth = 1;
    for (const [bx, by] of [[bM, bM], [w - bM, bM], [bM, h - bM], [w - bM, h - bM]] as [number,number][]) {
      ctx.beginPath(); ctx.arc(bx, by, cornR, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx, by, cornR * 0.5, 0, Math.PI * 2); ctx.stroke();
    }
    for (const [mx, my] of [[w / 2, bM], [w / 2, h - bM], [bM, h / 2], [w - bM, h / 2]] as [number,number][]) {
      ctx.beginPath(); ctx.arc(mx, my, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx, my - 10); ctx.lineTo(mx + 6, my); ctx.lineTo(mx, my + 10); ctx.lineTo(mx - 6, my); ctx.closePath(); ctx.stroke();
    }

    // Mountain silhouette
    ctx.fillStyle = 'rgba(50,10,80,0.16)';
    ctx.beginPath(); ctx.moveTo(0, h);
    const mtPts: [number, number][] = [
      [0, h * 0.80],[w * 0.04, h * 0.70],[w * 0.10, h * 0.58],[w * 0.15, h * 0.66],
      [w * 0.21, h * 0.50],[w * 0.25, h * 0.60],[w * 0.31, h * 0.44],[w * 0.35, h * 0.52],
      [w * 0.40, h * 0.56],[w * 0.45, h * 0.48],[w * 0.50, h * 0.42],[w * 0.55, h * 0.48],
      [w * 0.60, h * 0.56],[w * 0.65, h * 0.44],[w * 0.69, h * 0.52],[w * 0.75, h * 0.60],
      [w * 0.79, h * 0.50],[w * 0.85, h * 0.66],[w * 0.90, h * 0.58],[w * 0.96, h * 0.70],
      [w, h * 0.80],[w, h],
    ];
    for (const [px, py] of mtPts) ctx.lineTo(px, py);
    ctx.closePath(); ctx.fill();

    const hGlowP = 0.5 + 0.5 * Math.sin(t * 0.00022);
    const hg = ctx.createLinearGradient(0, h * 0.62, 0, h);
    hg.addColorStop(0,    'rgba(168,85,247,0)');
    hg.addColorStop(0.4,  `rgba(120,40,180,${0.06 * hGlowP})`);
    hg.addColorStop(0.75, `rgba(200,100,20,${0.05 * hGlowP})`);
    hg.addColorStop(1,    `rgba(100,30,10,${0.08 * hGlowP})`);
    ctx.fillStyle = hg; ctx.fillRect(0, 0, w, h);

    // Ley lines (double-line ceremonial)
    const leyPulse = 0.5 + 0.5 * Math.sin(t * 0.00048);
    for (const [a, b] of leyLines) {
      const na = leyNodes[a], nb = leyNodes[b];
      const isSpoke = a === 0 || b === 0;
      const totalA = (isSpoke ? 0.11 : 0.07) + (isSpoke ? 0.10 : 0.07) * leyPulse;
      const grad = ctx.createLinearGradient(na.x, na.y, nb.x, nb.y);
      grad.addColorStop(0,   `rgba(168,85,247,${totalA})`);
      grad.addColorStop(0.5, `rgba(200,150,255,${totalA * 1.5})`);
      grad.addColorStop(1,   `rgba(168,85,247,${totalA})`);
      ctx.strokeStyle = grad; ctx.lineWidth = isSpoke ? 1.6 : 1.1;
      ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y); ctx.stroke();
      const len = Math.hypot(nb.x - na.x, nb.y - na.y);
      if (len > 0) {
        const perpDX = (nb.y - na.y) / len * 2.5;
        const perpDY = -(nb.x - na.x) / len * 2.5;
        ctx.strokeStyle = `rgba(200,150,255,${totalA * 0.35})`; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(na.x + perpDX, na.y + perpDY); ctx.lineTo(nb.x + perpDX, nb.y + perpDY); ctx.stroke();
      }
    }

    // Ceremonial paths
    const cpA = 0.10 + 0.05 * Math.sin(t * 0.00050);
    for (const path of ceremPaths) {
      ctx.strokeStyle = `rgba(200,150,40,${cpA})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();
      ctx.strokeStyle = `rgba(200,150,40,${cpA * 0.4})`; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y + 3);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y + 3);
      ctx.stroke();
      for (const pt of path) {
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(200,160,40,${cpA * 2.2})`; ctx.lineWidth = 1; ctx.stroke();
      }
    }

    // Ley node glows
    for (let i = 0; i < leyNodes.length; i++) {
      const n = leyNodes[i];
      const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.0012 + i * 0.85));
      const r = (i === 0 ? 20 : 10) * (0.7 + 0.3 * pulse);
      const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.8);
      glow.addColorStop(0, `rgba(168,85,247,${0.40 * pulse})`);
      glow.addColorStop(0.45, `rgba(200,150,255,${0.18 * pulse})`);
      glow.addColorStop(1, 'rgba(168,85,247,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(n.x, n.y, i === 0 ? 3.5 : 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,180,255,${0.65 + 0.35 * pulse})`; ctx.fill();
    }

    // Three ritual circle systems
    for (const cs of circleSystems) {
      const rcPulse = 0.5 + 0.5 * Math.sin(t * 0.00058 + cs.spokes * 0.3);
      const rot = t * cs.rot;
      for (let ring = 0; ring < 3; ring++) {
        ctx.strokeStyle = `rgba(168,85,247,${0.14 + 0.08 * rcPulse})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cs.x, cs.y, cs.r * (1 - ring * 0.28), 0, Math.PI * 2); ctx.stroke();
      }
      ctx.strokeStyle = `rgba(168,85,247,${0.13 + 0.07 * rcPulse})`; ctx.lineWidth = 0.85;
      for (let i = 0; i < cs.spokes; i++) {
        const angle = (i * Math.PI * 2 / cs.spokes) + rot;
        ctx.beginPath();
        ctx.moveTo(cs.x + Math.cos(angle) * cs.r * 0.28, cs.y + Math.sin(angle) * cs.r * 0.28);
        ctx.lineTo(cs.x + Math.cos(angle) * cs.r,        cs.y + Math.sin(angle) * cs.r);
        ctx.stroke();
      }
    }

    // Central alchemical sigil
    const sigR = Math.min(w, h) * 0.115;
    const sigPulse = 0.5 + 0.5 * Math.sin(t * 0.00065);
    const sigRot = t * 0.000055;
    ctx.strokeStyle = `rgba(168,85,247,${0.16 + 0.08 * sigPulse})`; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(cx, cy, sigR, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, sigR * 0.72, 0, Math.PI * 2); ctx.stroke();
    for (let tri = 0; tri < 2; tri++) {
      const triRot = sigRot * (tri === 0 ? 1 : -1.3) + (tri === 1 ? Math.PI / 3 : 0);
      ctx.strokeStyle = `rgba(${tri === 0 ? '168,85,247' : '6,182,212'},${0.13 + 0.07 * sigPulse})`; ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let v = 0; v < 3; v++) {
        const a = triRot + (v * Math.PI * 2) / 3;
        const px = cx + Math.cos(a) * sigR * 0.68;
        const py = cy + Math.sin(a) * sigR * 0.68;
        if (v === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.stroke();
    }
    const vesicaOff = sigR * 0.38;
    ctx.strokeStyle = `rgba(200,150,40,${0.10 + 0.05 * sigPulse})`; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(cx - vesicaOff, cy, sigR * 0.5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + vesicaOff, cy, sigR * 0.5, 0, Math.PI * 2); ctx.stroke();

    // Directional myth glyphs
    const glyphA = 0.22 + 0.08 * Math.sin(t * 0.00015);
    ctx.strokeStyle = `rgba(200,160,40,${glyphA})`; ctx.lineWidth = 1.1;
    for (const g of mythGlyphs) {
      const gs2 = 12;
      ctx.save(); ctx.translate(g.x, g.y);
      if (g.dir === 'N' || g.dir === 'S') {
        ctx.beginPath(); ctx.moveTo(-gs2 * 0.4, -gs2); ctx.lineTo(-gs2 * 0.4, gs2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(gs2 * 0.4,  -gs2); ctx.lineTo(gs2 * 0.4,  gs2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-gs2 * 0.7, 0);    ctx.lineTo(gs2 * 0.7, 0);    ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-gs2 * 0.4, -gs2 * 0.5); ctx.lineTo(gs2 * 0.4, -gs2 * 0.5); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(-gs2, -gs2 * 0.4); ctx.lineTo(gs2, -gs2 * 0.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-gs2,  gs2 * 0.4); ctx.lineTo(gs2,  gs2 * 0.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -gs2 * 0.7);    ctx.lineTo(0,    gs2 * 0.7);  ctx.stroke();
        ctx.beginPath(); ctx.moveTo(gs2 * 0.5, -gs2 * 0.4); ctx.lineTo(gs2 * 0.5, gs2 * 0.4); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, 0, gs2 * 0.18, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // Celestial alignment marks
    const alignA = 0.07 + 0.025 * Math.sin(t * 0.00038);
    ctx.strokeStyle = `rgba(200,180,60,${alignA})`; ctx.lineWidth = 0.55;
    ctx.setLineDash([3, 8]);
    for (const angle of [Math.PI * 0.15, Math.PI * 0.52, Math.PI * 0.88, Math.PI * 1.22, Math.PI * 1.68, Math.PI * 1.92]) {
      const horizDist = Math.max(w, h) * 1.2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * sigR * 1.1, cy + Math.sin(angle) * sigR * 1.1);
      ctx.lineTo(cx + Math.cos(angle) * horizDist,  cy + Math.sin(angle) * horizDist);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Fibonacci spiral
    ctx.strokeStyle = `rgba(200,160,40,${0.06 + 0.025 * Math.sin(t * 0.00050)})`; ctx.lineWidth = 0.6;
    const fibCx = cx + w * 0.15, fibCy = cy - h * 0.08;
    ctx.beginPath();
    let fibR = 3;
    for (let theta = 0; theta < Math.PI * 8; theta += 0.08) {
      const fx = fibCx + fibR * Math.cos(theta);
      const fy = fibCy + fibR * Math.sin(theta);
      if (theta === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy);
      fibR *= 1.012;
    }
    ctx.stroke();

    // Ember particles
    for (const p of particles) {
      const sway = Math.sin(t * 0.00032 + p.phase) * 0.38;
      p.x += p.vx + sway * 0.15; p.y += p.vy * 0.6;
      if (p.y < -14) { p.y = h * 0.85 + rand(0, h * 0.1); p.x = rand(cx - w * 0.35, cx + w * 0.35); }
      if (p.x < -14) p.x = w + 14;
      if (p.x > w + 14) p.x = -14;
      const yFade = p.y < h * 0.3 ? Math.max(0, p.y / (h * 0.3)) : 1;
      const pulse = 0.7 + 0.3 * Math.sin(t * 0.0022 + p.phase);
      const alpha = p.alpha * yFade * pulse * 0.75;
      const glowR = p.size * 3.5;
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
      glow.addColorStop(0, `rgba(${p.color},${alpha * 0.6})`);
      glow.addColorStop(1, `rgba(${p.color},0)`);
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${Math.min(1, alpha * 2.2)})`; ctx.fill();
    }

    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.35, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
  };
}

// ─── TERRESTRIAL GLOBE — Illuminated Topographical System ──────────────────
function initTerrestrialGlobe(w: number, h: number) {
  const cx = w * 0.5, cy = h * 0.5;
  const globeR = Math.min(w, h) * 0.38;

  const continentDefs = [
    [{ x: 0.40, y: 0.26 },{ x: 0.32, y: 0.20 },{ x: 0.21, y: 0.28 },{ x: 0.19, y: 0.41 },{ x: 0.27, y: 0.48 },{ x: 0.42, y: 0.44 }],
    [{ x: 0.16, y: 0.53 },{ x: 0.10, y: 0.62 },{ x: 0.16, y: 0.70 },{ x: 0.26, y: 0.65 },{ x: 0.28, y: 0.56 }],
    [{ x: 0.58, y: 0.35 },{ x: 0.72, y: 0.29 },{ x: 0.83, y: 0.40 },{ x: 0.78, y: 0.55 },{ x: 0.63, y: 0.58 },{ x: 0.56, y: 0.49 }],
    [{ x: 0.45, y: 0.61 },{ x: 0.37, y: 0.72 },{ x: 0.47, y: 0.80 },{ x: 0.58, y: 0.73 },{ x: 0.55, y: 0.61 }],
  ].map(pts => pts.map(p => ({ x: p.x * w, y: p.y * h })));

  const weatherSpirals = [
    { cx: w * 0.38, cy: h * 0.35, r: w * 0.12, dir:  1, speed: 0.00018 },
    { cx: w * 0.68, cy: h * 0.58, r: w * 0.09, dir: -1, speed: 0.00025 },
  ];

  const energyLines = Array.from({ length: 8 }, (_, i) => ({
    yBase: h * (0.2 + i * 0.075),
    amp:   h * 0.028 * (0.7 + Math.random() * 0.6),
    freq:  0.003 + Math.random() * 0.002,
    phase: Math.random() * Math.PI * 2,
    speed: 0.00022 + Math.random() * 0.00015,
    color: i % 2 === 0 ? '6,182,212' : '180,220,60',
  }));

  return (ctx: CanvasRenderingContext2D, t: number) => {
    ctx.fillStyle = '#030a0f';
    ctx.fillRect(0, 0, w, h);

    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.72);
    bg.addColorStop(0,   'rgba(0,40,55,0.55)');
    bg.addColorStop(0.5, 'rgba(0,20,35,0.25)');
    bg.addColorStop(1,   'rgba(3,10,15,0)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(0,180,200,0.035)'; ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    const shadow = ctx.createRadialGradient(cx + globeR * 0.14, cy + globeR * 0.16, 0, cx, cy, globeR * 1.15);
    shadow.addColorStop(0.7, 'rgba(0,0,0,0)'); shadow.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = shadow; ctx.beginPath(); ctx.arc(cx, cy, globeR * 1.16, 0, Math.PI * 2); ctx.fill();

    const globeFill = ctx.createRadialGradient(cx - globeR * 0.3, cy - globeR * 0.3, 0, cx, cy, globeR);
    globeFill.addColorStop(0,    'rgba(60,200,180,0.04)');
    globeFill.addColorStop(0.4,  'rgba(0,80,100,0.06)');
    globeFill.addColorStop(0.75, 'rgba(0,20,50,0.08)');
    globeFill.addColorStop(1,    'rgba(0,5,20,0.12)');
    ctx.fillStyle = globeFill; ctx.beginPath(); ctx.arc(cx, cy, globeR, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, globeR - 1, 0, Math.PI * 2); ctx.clip();

    // Bathymetric depth rings
    for (let d = 1; d <= 4; d++) {
      ctx.beginPath(); ctx.arc(cx, cy, globeR * (1 - d * 0.12), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,60,100,${0.09 + d * 0.04})`; ctx.lineWidth = 1; ctx.stroke();
    }

    // Latitude lines
    const lonDrift = (t * 0.00038) % (Math.PI / 8);
    for (let i = 1; i < 8; i++) {
      const lat  = cy - globeR + (i / 8) * 2 * globeR;
      const latR = Math.sqrt(Math.max(0, globeR * globeR - (lat - cy) * (lat - cy)));
      const isEquator = Math.abs(i - 4) < 1;
      ctx.beginPath(); ctx.ellipse(cx, lat, latR, latR * 0.14, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${isEquator ? '0,220,200' : '0,160,180'},${0.13 + 0.07 * Math.sin(t * 0.00025 + i * 0.4)})`;
      ctx.lineWidth = isEquator ? 1.1 : 0.8; ctx.stroke();
    }

    // Longitude lines
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI / 8) + lonDrift;
      ctx.strokeStyle = 'rgba(0,160,180,0.13)'; ctx.lineWidth = 0.75;
      ctx.beginPath(); ctx.ellipse(cx, cy, globeR * Math.abs(Math.cos(angle)) + 0.5, globeR, 0, 0, Math.PI * 2); ctx.stroke();
    }

    // Elevation contour rings
    const contours = [
      { r: 0.88, c: '0,80,120',   a: 0.14 },
      { r: 0.74, c: '0,120,150',  a: 0.16 },
      { r: 0.58, c: '0,180,200',  a: 0.20 },
      { r: 0.44, c: '0,220,180',  a: 0.18 },
      { r: 0.30, c: '80,220,140', a: 0.16 },
      { r: 0.18, c: '200,200,80', a: 0.16 },
      { r: 0.08, c: '255,220,100',a: 0.20 },
    ];
    for (const c of contours) {
      const pulse = 0.8 + 0.2 * Math.sin(t * 0.00022 + c.r * 8);
      ctx.beginPath(); ctx.arc(cx, cy, globeR * c.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${c.c},${c.a * pulse})`; ctx.lineWidth = 0.9; ctx.stroke();
    }

    // Continent shapes
    for (const pts of continentDefs) {
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      ctx.quadraticCurveTo(pts[pts.length - 1].x, pts[pts.length - 1].y, pts[0].x, pts[0].y);
      ctx.fillStyle = 'rgba(100,160,60,0.13)'; ctx.fill();
      ctx.strokeStyle = 'rgba(0,200,160,0.35)'; ctx.lineWidth = 0.9; ctx.stroke();
    }

    // Energy/wind lines
    const lineA = 0.13 + 0.05 * Math.sin(t * 0.00035);
    for (const el of energyLines) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const y = el.yBase + el.amp * Math.sin(x * el.freq + el.phase + t * el.speed);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(${el.color},${lineA})`; ctx.lineWidth = 0.65; ctx.stroke();
    }

    // Weather spirals
    for (const ws of weatherSpirals) {
      const rot = t * ws.speed * ws.dir;
      const spiralA = 0.08 + 0.04 * Math.sin(t * 0.00055);
      ctx.save(); ctx.translate(ws.cx, ws.cy);
      for (let arm = 0; arm < 3; arm++) {
        const armAngle = rot + (arm * Math.PI * 2) / 3;
        ctx.beginPath();
        for (let i = 0; i <= 60; i++) {
          const theta = (i / 60) * Math.PI * 1.5 + armAngle;
          const r = ws.r * (i / 60);
          const px = Math.cos(theta) * r, py = Math.sin(theta) * r * 0.6;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = `rgba(150,220,255,${spiralA})`; ctx.lineWidth = 0.7; ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore(); // end globe clip

    // Globe rim
    ctx.strokeStyle = `rgba(0,200,200,${0.42 + 0.12 * Math.sin(t * 0.00055)})`; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, globeR, 0, Math.PI * 2); ctx.stroke();

    // Atmospheric bloom (multi-layer)
    for (let i = 0; i < 3; i++) {
      const atmR = globeR * (1.04 + i * 0.04);
      const atmA = (0.13 - i * 0.03) + 0.05 * Math.sin(t * 0.00055);
      const atm = ctx.createRadialGradient(cx, cy, globeR * 0.96, cx, cy, atmR + globeR * 0.08);
      atm.addColorStop(0, `rgba(0,200,220,${atmA})`);
      atm.addColorStop(1, 'rgba(0,200,220,0)');
      ctx.fillStyle = atm; ctx.beginPath(); ctx.arc(cx, cy, atmR + globeR * 0.08, 0, Math.PI * 2); ctx.fill();
    }

    // Coordinate labels
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    const labelA = 0.22 + 0.08 * Math.sin(t * 0.00018);
    ctx.fillStyle = `rgba(0,200,200,${labelA})`;
    ctx.fillText('90°N', cx, cy - globeR - 6);
    ctx.fillText('90°S', cx, cy + globeR + 14);
    ctx.textAlign = 'left';
    ctx.fillText('0°', cx + globeR + 5, cy + 3);

    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.44, w * 0.5, h * 0.5, Math.max(w, h) * 0.88);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.60)');
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
  preview?: boolean;
}

export default function TerrainCanvas({ terrain, style, preview }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let startTime: number | null = null;
    let frameCount = 0;
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
      if (preview) {
        frameCount++;
        if (frameCount % 3 !== 0) {
          animId = requestAnimationFrame(loop);
          return;
        }
        renderFn(ctx, (time - startTime) * 6 + 9000);
      } else {
        renderFn(ctx, time - startTime);
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [terrain, preview]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: preview ? 'none' : undefined,
        ...style,
      }}
    />
  );
}
