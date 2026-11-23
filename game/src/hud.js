// Harbor Lights — HUD, minimap and menus, all drawn on the same canvas.
import { MISSIONS, STORY } from './config.js';
import { currentMission } from './missions.js';

export function drawHud(ctx, view, state, city) {
  const { cash, health, wanted, speedMph, mission, time } = state;
  const W = view.w;
  const H = view.h;
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  // Top-left: cash, health, clock.
  ctx.fillStyle = 'rgba(10, 12, 20, 0.55)';
  roundRect(ctx, 12, 12, 210, 86, 10);
  ctx.fill();
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 26px monospace';
  ctx.fillText(`$${cash}`, 26, 44);
  ctx.fillStyle = '#ff5a5a';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`HEALTH ${Math.max(0, Math.round(health))}`, 26, 68);
  ctx.fillStyle = '#e8e0d0';
  ctx.font = '14px monospace';
  ctx.fillText(time, 26, 88);

  // Top-right: wanted stars.
  ctx.fillStyle = 'rgba(10, 12, 20, 0.55)';
  roundRect(ctx, W - 222, 12, 210, 46, 10);
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < wanted ? '#ffd23c' : 'rgba(255,255,255,0.18)';
    drawStar(ctx, W - 196 + i * 38, 35, i < wanted ? 13 : 11);
  }

  // Bottom-left: speed + gear hint.
  ctx.fillStyle = 'rgba(10, 12, 20, 0.55)';
  roundRect(ctx, 12, H - 64, 170, 52, 10);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(`${Math.round(speedMph)}`, 26, H - 30);
  ctx.font = '13px monospace';
  ctx.fillStyle = '#c8c8d0';
  ctx.fillText('mph', 92, H - 30);
  ctx.fillText(state.inCar ? 'DRIVE' : 'ON FOOT', 26, H - 16);

  // Bottom-center: mission objective.
  const def = currentMission(mission);
  if (def && mission.stage !== 'idle') {
    ctx.fillStyle = 'rgba(10, 12, 20, 0.6)';
    const label = `JOB ${def.id}: ${def.title}` + (mission.timer > 0 ? `  —  ${Math.ceil(mission.timer)}s` : '');
    ctx.font = 'bold 15px monospace';
    const tw = ctx.measureText(label).width;
    roundRect(ctx, (W - tw) / 2 - 14, H - 58, tw + 28, 34, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd23c';
    ctx.fillText(label, (W - tw) / 2, H - 35);
  } else if (def) {
    ctx.fillStyle = 'rgba(10, 12, 20, 0.6)';
    ctx.font = '15px monospace';
    const label = `Next job: ${def.title} — press E to start`;
    const tw = ctx.measureText(label).width;
    roundRect(ctx, (W - tw) / 2 - 14, H - 58, tw + 28, 34, 8);
    ctx.fill();
    ctx.fillStyle = '#e8e0d0';
    ctx.fillText(label, (W - tw) / 2, H - 35);
  }

  // Toast message.
  if (mission.message && mission.messageT > 0) {
    ctx.font = 'bold 17px monospace';
    const tw = ctx.measureText(mission.message).width;
    ctx.fillStyle = 'rgba(10, 12, 20, 0.72)';
    roundRect(ctx, (W - tw) / 2 - 14, 118, tw + 28, 36, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(mission.message, (W - tw) / 2, 142);
  }

  drawMinimap(ctx, view, state, city);
  ctx.restore();
}

function drawMinimap(ctx, view, state, city) {
  const mw = 190;
  const mh = 128;
  const x0 = view.w - mw - 12;
  const y0 = 66;
  const sx = mw / city.bounds.w;
  const sy = mh / city.bounds.h;
  ctx.save();
  ctx.fillStyle = 'rgba(10, 12, 20, 0.6)';
  roundRect(ctx, x0 - 6, y0 - 6, mw + 12, mh + 12, 8);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(x0, y0, mw, mh);
  ctx.clip();
  // Water + islands.
  ctx.fillStyle = '#16324a';
  ctx.fillRect(x0, y0, mw, mh);
  ctx.fillStyle = '#3d6b35';
  for (const isl of city.islands || []) {
    ctx.fillRect(x0 + isl.x * sx, y0 + isl.y * sy, isl.w * sx, isl.h * sy);
  }
  // Roads.
  ctx.strokeStyle = '#8a8f9b';
  ctx.lineWidth = 1.5;
  for (const r of city.roads) {
    ctx.beginPath();
    ctx.moveTo(x0 + r.x0 * sx, y0 + r.y0 * sy);
    ctx.lineTo(x0 + r.x1 * sx, y0 + r.y1 * sy);
    ctx.stroke();
  }
  // Mission marker (blinking).
  const t = state.missionTarget;
  if (t) {
    const blink = Math.floor(state.timeSec * 3) % 2 === 0;
    ctx.fillStyle = blink ? '#ffd23c' : '#ff5a3c';
    ctx.beginPath();
    ctx.arc(x0 + t.x * sx, y0 + t.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Cops (blue) and player (white).
  ctx.fillStyle = '#5a8aff';
  for (const c of state.cops) {
    ctx.fillRect(x0 + c.x * sx - 2, y0 + c.y * sy - 2, 4, 4);
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x0 + state.player.x * sx, y0 + state.player.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawStar(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawStartScreen(ctx, view, save) {
  const W = view.w;
  const H = view.h;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1a2340');
  g.addColorStop(0.55, '#7a3a5a');
  g.addColorStop(1, '#e8803a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Sun + skyline silhouette.
  ctx.fillStyle = '#ffd98a';
  ctx.beginPath();
  ctx.arc(W * 0.87, H * 0.26, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#14101c';
  const base = H * 0.72;
  for (let i = 0; i < 14; i++) {
    const bw = 60 + ((i * 53) % 70);
    const bh = 90 + ((i * 97) % 190);
    ctx.fillRect(40 + i * 88, base - bh, bw, bh);
  }
  ctx.fillStyle = '#14101c';
  ctx.fillRect(0, base, W, H - base);
  // Water shimmer under the sun.
  ctx.fillStyle = 'rgba(255, 216, 138, 0.25)';
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(W * 0.87 - 90 + i * 24, base + 12 + i * 10, 180 - i * 20, 3);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 84px Georgia, serif';
  ctx.fillText('HARBOR', W / 2, 150);
  ctx.fillStyle = '#ffd23c';
  ctx.font = 'bold 84px Georgia, serif';
  ctx.fillText('LIGHTS', W / 2, 236);
  ctx.fillStyle = '#e8e0d0';
  ctx.font = '20px monospace';
  ctx.fillText('A dusk-lit open-city crime story  •  Port Alegre', W / 2, 284);
  ctx.font = '16px monospace';
  ctx.fillText('Dusk over Port Alegre. Kai Marlin is back with one fast car,', W / 2, 318);
  ctx.fillText('no cash, and a crew that owes the harbor boss. Six jobs stand between Kai and a clean slate.', W / 2, 342);
  ctx.fillStyle = 'rgba(10, 12, 20, 0.65)';
  roundRect(ctx, W / 2 - 330, 360, 660, 150, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px monospace';
  ctx.fillText('WASD / arrows — drive & walk    E — enter car / start job', W / 2, 396);
  ctx.fillText('P — pause    H — horn    M — mute    R — restart run', W / 2, 424);
  ctx.fillText('Steal cars, lose the cops, finish all six jobs.', W / 2, 452);
  ctx.fillText('Progress saves to this browser automatically.', W / 2, 480);
  if (save && save.missionIndex > 0) {
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 17px monospace';
    ctx.fillText(`Save found: job ${save.missionIndex + 1} of ${MISSIONS.length}, $${save.cash} — press Enter to continue`, W / 2, 556);
  } else {
    ctx.fillStyle = '#ffd23c';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('Press Enter to start', W / 2, 556);
  }
  ctx.textAlign = 'left';
}

export function drawCenterCard(ctx, view, title, lines, accent) {
  const W = view.w;
  const H = view.h;
  ctx.fillStyle = 'rgba(8, 10, 18, 0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(16, 20, 34, 0.95)';
  roundRect(ctx, W / 2 - 320, H / 2 - 130, 640, 260, 14);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText(title, W / 2, H / 2 - 46);
  ctx.fillStyle = '#e8e0d0';
  ctx.font = '17px monospace';
  lines.forEach((ln, i) => ctx.fillText(ln, W / 2, H / 2 + 4 + i * 28));
  ctx.fillStyle = '#ffd23c';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('Press Enter to continue', W / 2, H / 2 + 108);
  ctx.textAlign = 'left';
}
// Harbor Lights — recorded build touch
