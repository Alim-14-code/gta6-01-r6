// Harbor Lights — canvas rendering: dusk harbor city, cars, people, police, markers.
import { PALETTE, ISLANDS, BRIDGES } from './config.js';
import { drawStar, roundRect } from './hud.js';

export function drawWorld(ctx, view, state, city) {
  const cam = state.camera;
  const W = view.w;
  const H = view.h;
  ctx.save();
  // Dusk sky wash behind the world.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#2a2a55');
  sky.addColorStop(1, '#c86a3a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.translate(-cam.x + W / 2, -cam.y + H / 2);

  const vx0 = cam.x - W / 2 - 80;
  const vy0 = cam.y - H / 2 - 80;
  const vx1 = cam.x + W / 2 + 80;
  const vy1 = cam.y + H / 2 + 80;
  const vis = (x, y, m = 0) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;

  // Water.
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  ctx.fillStyle = PALETTE.waterDeep;
  for (let i = 0; i < 40; i++) {
    const wx = ((i * 613) % 3840);
    const wy = ((i * 977) % 2560);
    if (vis(wx, wy)) ctx.fillRect(wx, wy, 90, 4);
  }

  // Islands (land).
  for (const isl of ISLANDS) {
    ctx.fillStyle = isl.hue === 'beach' ? PALETTE.sand : PALETTE.grass;
    ctx.fillRect(isl.x, isl.y, isl.w, isl.h);
    if (isl.hue === 'beach') {
      ctx.fillStyle = PALETTE.sand;
      ctx.fillRect(isl.x, isl.y, isl.w, 40);
    }
  }

  // Docks.
  ctx.fillStyle = PALETTE.dock;
  for (const d of city.docks) ctx.fillRect(d.x, d.y, d.w, d.h);
  // Boats at the docks.
  ctx.fillStyle = '#e8e0d0';
  for (let i = 0; i < city.docks.length; i++) {
    const d = city.docks[i];
    ctx.fillRect(d.x + 20 + i * 6, d.y + d.h + 6, 60, 16);
  }

  // Roads.
  for (const r of city.roads) {
    ctx.strokeStyle = r.bridge ? PALETTE.bridge : PALETTE.road;
    ctx.lineWidth = 52;
    ctx.beginPath();
    ctx.moveTo(r.x0, r.y0);
    ctx.lineTo(r.x1, r.y1);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.roadLine;
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 22]);
    ctx.beginPath();
    ctx.moveTo(r.x0, r.y0);
    ctx.lineTo(r.x1, r.y1);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Sidewalks.
  ctx.strokeStyle = PALETTE.sidewalk;
  ctx.lineWidth = 8;
  for (const r of city.roads) {
    if (r.bridge) continue;
    ctx.beginPath();
    ctx.moveTo(r.x0, r.y0);
    ctx.lineTo(r.x1, r.y1);
    ctx.stroke();
  }

  // Trees.
  for (const t of city.trees) {
    if (!vis(t.x, t.y, 30)) continue;
    ctx.fillStyle = '#2a5a2a';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a7a3a';
    ctx.beginPath();
    ctx.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Buildings with lit windows at dusk.
  for (const b of city.buildings) {
    if (!vis(b.x + b.w / 2, b.y + b.h / 2, 120)) continue;
    ctx.fillStyle = PALETTE.buildingEdge;
    ctx.fillRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255, 214, 120, 0.85)';
    const cols = Math.max(1, Math.floor(b.w / 26));
    const rows = Math.max(1, Math.floor(b.h / 24));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if ((i * 7 + j * 3 + b.x) % 5 < 2) {
          ctx.fillRect(b.x + 8 + i * 24, b.y + 8 + j * 22, 10, 12);
        }
      }
    }
  }

  // Lighthouse.
  const lh = city.places.lighthouse;
  ctx.fillStyle = PALETTE.lighthouse;
  ctx.fillRect(lh.x - 14, lh.y - 46, 28, 46);
  ctx.fillStyle = '#c03a3a';
  ctx.fillRect(lh.x - 14, lh.y - 46, 28, 10);
  ctx.fillStyle = '#ffd98a';
  ctx.beginPath();
  ctx.arc(lh.x, lh.y - 50, 8, 0, Math.PI * 2);
  ctx.fill();
  // Sweeping beam.
  const beamA = state.timeSec * 0.7;
  ctx.save();
  ctx.translate(lh.x, lh.y - 50);
  ctx.rotate(beamA);
  const beam = ctx.createLinearGradient(0, 0, 320, 0);
  beam.addColorStop(0, 'rgba(255, 220, 130, 0.5)');
  beam.addColorStop(1, 'rgba(255, 220, 130, 0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(320, -26);
  ctx.lineTo(320, 26);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Skid marks.
  ctx.strokeStyle = 'rgba(20, 16, 12, 0.5)';
  ctx.lineWidth = 4;
  for (const s of state.skids) {
    ctx.beginPath();
    ctx.moveTo(s.x0, s.y0);
    ctx.lineTo(s.x1, s.y1);
    ctx.stroke();
  }

  // Mission marker (pulsing ring + beacon).
  const t = state.missionTarget;
  if (t) {
    const pulse = 1 + Math.sin(state.timeSec * 4) * 0.12;
    ctx.strokeStyle = '#ffd23c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 34 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd23c';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd23c';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(t.label || 'TARGET', t.x, t.y - 46);
    ctx.textAlign = 'left';
    // Vertical beacon so the marker reads from far away.
    const bg = ctx.createLinearGradient(t.x, t.y - 260, t.x, t.y);
    bg.addColorStop(0, 'rgba(255, 210, 60, 0)');
    bg.addColorStop(1, 'rgba(255, 210, 60, 0.55)');
    ctx.fillStyle = bg;
    ctx.fillRect(t.x - 5, t.y - 260, 10, 260);
  }

  // Traffic.
  for (const c of state.traffic) drawCar(ctx, c, false);
  // Mission vehicles (van / sedan) drawn larger, with a label.
  if (state.mission.chaseTarget) drawCar(ctx, { ...state.mission.chaseTarget, w: 52, h: 24, color: '#8a8a96' }, false);
  if (state.mission.tailTarget) drawCar(ctx, { ...state.mission.tailTarget, w: 46, h: 22, color: '#6a6a72' }, false);
  // Cops with light bars.
  for (const c of state.cops) drawCar(ctx, c, true);
  // Helicopter + spotlight.
  if (state.heli) {
    const h = state.heli;
    ctx.fillStyle = 'rgba(255, 240, 180, 0.14)';
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.fillStyle = PALETTE.heli;
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 14, h.angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c8c8d0';
    ctx.lineWidth = 3;
    const ra = h.rotor;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ra) * -46, Math.sin(ra) * -10);
    ctx.lineTo(Math.cos(ra) * 46, Math.sin(ra) * 10);
    ctx.moveTo(Math.cos(ra + Math.PI / 2) * -46, Math.sin(ra + Math.PI / 2) * -10);
    ctx.lineTo(Math.cos(ra + Math.PI / 2) * 46, Math.sin(ra + Math.PI / 2) * 10);
    ctx.stroke();
    ctx.restore();
  }

  // Pedestrians.
  for (const p of state.people) {
    if (!vis(p.x, p.y, 20)) continue;
    const bob = Math.sin(p.walkPhase) * 2;
    ctx.fillStyle = p.shirt;
    ctx.beginPath();
    ctx.arc(p.x, p.y + bob, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c8a0';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 4 + bob, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Player: on foot (a walker) or in the car.
  if (state.inCar) {
    drawCar(ctx, state.playerCar, false);
  } else {
    const p = state.player;
    const bob = Math.sin(p.walkPhase || 0) * 2;
    ctx.fillStyle = '#ff5a3c';
    ctx.beginPath();
    ctx.arc(p.x, p.y + bob, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe0b0';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 5 + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    // Facing tick.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.angle) * 16, p.y + Math.sin(p.angle) * 16);
    ctx.stroke();
  }

  // Dusk vignette: warm light pools around street lamps near the player.
  ctx.fillStyle = 'rgba(255, 180, 90, 0.05)';
  ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  ctx.restore();
}

function drawCar(ctx, c, isCop) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(-c.w / 2 + 3, -c.h / 2 + 4, c.w, c.h);
  // Body.
  ctx.fillStyle = c.color;
  roundRect(ctx, -c.w / 2, -c.h / 2, c.w, c.h, 6);
  ctx.fill();
  // Cabin + windshield.
  ctx.fillStyle = 'rgba(20, 30, 50, 0.85)';
  roundRect(ctx, -c.w / 2 + 10, -c.h / 2 + 4, c.w - 22, c.h - 8, 4);
  ctx.fill();
  // Headlights.
  ctx.fillStyle = '#ffe9a0';
  ctx.fillRect(c.w / 2 - 2, -c.h / 2 + 2, 3, 5);
  ctx.fillRect(c.w / 2 - 2, c.h / 2 - 7, 3, 5);
  // Brake lights.
  if (c.brake) {
    ctx.fillStyle = '#ff2020';
    ctx.fillRect(-c.w / 2 - 1, -c.h / 2 + 2, 3, 5);
    ctx.fillRect(-c.w / 2 - 1, c.h / 2 - 7, 3, 5);
  }
  // Cop light bar.
  if (isCop) {
    const blink = Math.floor(Date.now() / 180) % 2 === 0;
    ctx.fillStyle = blink ? '#ff2020' : '#2050ff';
    ctx.fillRect(-6, -c.h / 2 - 3, 12, 4);
    ctx.fillStyle = blink ? '#2050ff' : '#ff2020';
    ctx.fillRect(-6, c.h / 2 - 1, 12, 4);
  }
  ctx.restore();
}
// Harbor Lights — recorded build touch
