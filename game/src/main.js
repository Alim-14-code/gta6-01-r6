// Harbor Lights — the game itself: loop, state, wanted level, stealing, save.
import { WORLD, TUNING, SAVE_KEY, MISSIONS } from './config.js';
import { buildCity } from './city.js';
import { makeCar, stepPlayerCar, makeTraffic, stepTraffic, stepCops, makeHeli, stepHeli } from './vehicles.js';
import { makePeople, stepPeople } from './people.js';
import { makeMissions, currentMission, startMission, missionTarget, stepMission, advanceMission, failMissionReset } from './missions.js';
import { drawWorld } from './render.js';
import { drawHud, drawStartScreen, drawCenterCard } from './hud.js';
import { makeInput } from './input.js';
import { makeAudio } from './audio.js';
import { shotFromUrl, stageShot } from './shots.js';

const VIEW_W = 1280;
const VIEW_H = 720;

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (typeof s.cash !== 'number' || typeof s.missionIndex !== 'number') return null;
    return s;
  } catch {
    return null;
  }
}

function storeSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage may be unavailable; the game still plays.
  }
}

export function startGame() {
  const canvas = document.getElementById('game');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d');
  const city = buildCity(20261123);
  const input = makeInput();
  const audio = makeAudio();
  const save = loadSave();

  const S = {
    screen: 'start',
    timeSec: 0,
    clockMin: 18 * 60 + 40, // 18:40, dusk
    cash: save ? save.cash : 120,
    health: 100,
    wanted: 0,
    wantedQuiet: 0,
    camera: { x: 1000, y: 600 },
    player: { x: 1000, y: 620, angle: -Math.PI / 2, walkPhase: 0 },
    playerCar: makeCar(1000, 700, -Math.PI / 2, '#ff5a3c'),
    inCar: false,
    traffic: makeTraffic(city, TUNING.trafficCount),
    cops: [],
    heli: null,
    people: makePeople(city, TUNING.pedCount),
    skids: [],
    mission: makeMissions(),
    missionTarget: null,
    speedMph: 0,
    time: '18:40',
  };
  if (save && save.missionIndex > 0 && save.missionIndex < MISSIONS.length) {
    S.mission.index = save.missionIndex;
    S.cash = save.cash;
  }

  // Screenshot staging: ?shot=start|drive|chase|mission
  const shot = shotFromUrl();
  if (shot) {
    S.screen = shot === 'start' ? 'start' : 'play';
    const ff = stageShot(shot, S, city);
    for (let i = 0; i < Math.floor(ff * 30); i++) stepWorld(S, 1 / 30, city, input, audio, true);
    S.missionTarget = missionTarget(S.mission);
    drawFrame(S, ctx, city);
    return; // staged shot: draw once, no loop
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(S, dt, city, input, audio);
    drawFrame(S, ctx, city);
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function step(S, dt, city, input, audio) {
  if (input.wasPressed('m')) audio.setMuted(!audio.muted);
  if (S.screen === 'start') {
    if (input.actionPressed() || input.wasPressed('Enter')) {
      audio.unlock();
      audio.missionStart();
      S.screen = 'play';
    }
    S.timeSec += dt;
    return;
  }
  if (S.screen === 'pause') {
    if (input.pausePressed() || input.actionPressed()) S.screen = 'play';
    return;
  }
  if (S.screen === 'missionDone' || S.screen === 'missionFail' || S.screen === 'busted' || S.screen === 'wasted' || S.screen === 'storyDone') {
    if (input.actionPressed() || input.wasPressed('Enter')) {
      if (S.screen === 'missionDone') {
        advanceMission(S.mission);
        if (currentMission(S.mission)) S.screen = 'play';
        else S.screen = 'storyDone';
      } else if (S.screen === 'missionFail') {
        failMissionReset(S.mission);
        S.health = 100;
        S.wanted = 0;
        S.cops = [];
        S.screen = 'play';
      } else if (S.screen === 'busted' || S.screen === 'wasted') {
        S.cash = Math.max(0, S.cash - 100); // fines for getting caught
        S.health = 100;
        S.wanted = 0;
        S.cops = [];
        S.player.x = 1000; S.player.y = 620;
        S.screen = 'play';
      } else {
        S.screen = 'start';
      }
    }
    return;
  }
  if (input.pausePressed()) {
    S.screen = 'pause';
    return;
  }
  stepWorld(S, dt, city, input, audio, false);
}

function stepWorld(S, dt, city, input, audio, staged) {
  S.timeSec += dt;
  S.clockMin += dt * 0.6;
  const hh = Math.floor(S.clockMin / 60) % 24;
  const mm = Math.floor(S.clockMin % 60);
  S.time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

  // Enter / exit cars, start / retry missions.
  if (!staged && input.actionPressed()) {
    if (S.mission.stage === 'idle' && currentMission(S.mission)) {
      startMission(S.mission, city);
      audio.missionStart();
    } else if (S.inCar) {
      // Step out beside the car.
      S.inCar = false;
      S.player.x = S.playerCar.x + Math.cos(S.playerCar.angle + Math.PI / 2) * 40;
      S.player.y = S.playerCar.y + Math.sin(S.playerCar.angle + Math.PI / 2) * 40;
      S.player.angle = S.playerCar.angle;
      S.playerCar.speed = 0;
    } else {
      // Steal the nearest traffic car (or climb back into our own).
      let best = null;
      let bestD = 90;
      for (const c of S.traffic) {
        const d = Math.hypot(c.x - S.player.x, c.y - S.player.y);
        if (d < bestD) { bestD = d; best = c; }
      }
      const ownD = Math.hypot(S.playerCar.x - S.player.x, S.playerCar.y - S.player.y);
      if (ownD < 70) {
        S.inCar = true;
        audio.pickup();
      } else if (best) {
        S.traffic.splice(S.traffic.indexOf(best), 1);
        S.playerCar = best;
        S.inCar = true;
        raiseWanted(S, 1);
        audio.horn();
      }
    }
  }
  if (!staged && input.hornPressed()) audio.horn();

  // Movement.
  if (S.inCar) {
    const prevX = S.playerCar.x;
    const prevY = S.playerCar.y;
    stepPlayerCar(S.playerCar, input, dt, city);
    if (S.playerCar.brake && Math.abs(S.playerCar.speed) > 200) {
      S.skids.push({ x0: prevX, y0: prevY, x1: S.playerCar.x, y1: S.playerCar.y });
      if (S.skids.length > 60) S.skids.shift();
    }
    S.player.x = S.playerCar.x;
    S.player.y = S.playerCar.y;
    S.player.angle = S.playerCar.angle;
    S.speedMph = Math.abs(S.playerCar.speed) * 0.09;
    // Hitting a pedestrian while driving raises the heat and hurts.
    for (const p of S.people) {
      if (Math.hypot(p.x - S.playerCar.x, p.y - S.playerCar.y) < 26 && Math.abs(S.playerCar.speed) > 120) {
        p.scared = 2;
        raiseWanted(S, 1);
        S.health = Math.max(0, S.health - 4);
        audio.crash();
      }
    }
    // Ramming traffic.
    for (const c of S.traffic) {
      if (Math.hypot(c.x - S.playerCar.x, c.y - S.playerCar.y) < 44 && Math.abs(S.playerCar.speed) > 240) {
        c.speed = 40;
        S.playerCar.speed *= 0.55;
        S.health = Math.max(0, S.health - 6);
        audio.crash();
      }
    }
  } else {
    const ax = input.axis();
    const moving = ax.x !== 0 || ax.y !== 0;
    const sp = TUNING.walkSpeed;
    const nx = S.player.x + ax.x * sp * dt;
    const ny = S.player.y + ax.y * sp * dt;
    if (!city.hitBuilding(nx, ny, 10) && !city.isWater(nx, ny)) {
      S.player.x = nx;
      S.player.y = ny;
    }
    if (moving) {
      S.player.angle = Math.atan2(ax.y, ax.x);
      S.player.walkPhase += dt * 9;
    }
    S.speedMph = moving ? 4 : 0;
  }

  stepTraffic(S.traffic, dt, city);
  stepPeople(S.people, dt, city, S.player, S.inCar ? Math.abs(S.playerCar.speed) : 0);
  stepCops(S.cops, S.player, dt, city, S.wanted);

  // Helicopter at 4+ stars.
  if (S.wanted >= TUNING.heliAtStars) {
    if (!S.heli) S.heli = makeHeli(S.player.x - 300, S.player.y - 300);
    stepHeli(S.heli, S.player, dt);
  } else {
    S.heli = null;
  }

  // Wanted decay: quiet for a while with no cop close by.
  const copNear = S.cops.some((c) => Math.hypot(c.x - S.player.x, c.y - S.player.y) < 520);
  if (S.wanted > 0 && !copNear) {
    S.wantedQuiet += dt;
    if (S.wantedQuiet > TUNING.wantedDecaySeconds) {
      S.wanted -= 1;
      S.wantedQuiet = 0;
    }
  } else {
    S.wantedQuiet = 0;
  }

  // Busted / wasted: a cop catches the player.
  for (const c of S.cops) {
    const d = Math.hypot(c.x - S.player.x, c.y - S.player.y);
    if (S.inCar) {
      if (d < 46 && Math.abs(S.playerCar.speed) < 60) {
        S.screen = 'busted';
        audio.busted();
        return;
      }
    } else if (d < 30) {
      S.health = Math.max(0, S.health - 30 * dt);
      if (S.health <= 0) {
        S.screen = S.wanted > 0 ? 'busted' : 'wasted';
        audio.busted();
        return;
      }
    }
  }
  if (S.health <= 0) {
    S.screen = 'wasted';
    return;
  }
  if (S.inCar && Math.abs(S.playerCar.speed) > 480) {
    // High-speed wall scrape chips health slowly.
    S.health = Math.max(0, S.health - 1.5 * dt);
  }

  // Missions.
  if (S.mission.stage !== 'idle') {
    const outcome = stepMission(S.mission, dt, { player: S.player, playerCar: S.playerCar, inCar: S.inCar, wanted: S.wanted }, city);
    if (outcome === 'complete') {
      const def = MISSIONS[S.mission.index];
      S.cash += def.reward;
      storeSave({ cash: S.cash, missionIndex: S.mission.index + 1 });
      audio.missionDone();
      S.screen = 'missionDone';
    } else if (outcome === 'failed') {
      audio.missionFail();
      S.screen = 'missionFail';
    }
  }
  // Mission 5 sets the heat when it starts.
  if (S.mission.stage === 'getaway' && S.wanted < 3 && !S.mission.heatSet) {
    S.mission.heatSet = true;
    S.wanted = 3;
  }
  S.missionTarget = missionTarget(S.mission);

  // Camera follows the player with a little look-ahead.
  const tx = S.player.x + Math.cos(S.player.angle) * 60;
  const ty = S.player.y + Math.sin(S.player.angle) * 60;
  S.camera.x += (tx - S.camera.x) * Math.min(1, dt * 4);
  S.camera.y += (ty - S.camera.y) * Math.min(1, dt * 4);

  audio.update(dt, S.inCar ? Math.abs(S.playerCar.speed) / TUNING.carMaxSpeed : 0, S.inCar, S.wanted);
}

function raiseWanted(S, n) {
  S.wanted = Math.min(5, S.wanted + n);
  S.wantedQuiet = 0;
}

function drawFrame(S, ctx, city) {
  const view = { w: VIEW_W, h: VIEW_H };
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (S.screen === 'start') {
    drawStartScreen(ctx, view, loadSave());
    return;
  }
  drawWorld(ctx, view, S, city);
  const hudState = {
    cash: S.cash, health: S.health, wanted: S.wanted,
    speedMph: S.speedMph, mission: S.mission, time: S.time,
    timeSec: S.timeSec, missionTarget: S.missionTarget,
    cops: S.cops, player: S.player, inCar: S.inCar,
  };
  drawHud(ctx, view, hudState, { ...city, islands: cityIslands(city) });
  if (S.screen === 'pause') {
    drawCenterCard(ctx, view, 'PAUSED', ['Take a breath, Kai. The harbor waits.', '', 'Enter — resume    R — restart run'], '#ffd23c');
  } else if (S.screen === 'missionDone') {
    const def = MISSIONS[S.mission.index];
    drawCenterCard(ctx, view, 'JOB DONE', [`${def.title} — $${def.reward} earned.`, `Cash now $${S.cash}.`, S.mission.index + 1 < MISSIONS.length ? `Next: ${MISSIONS[S.mission.index + 1].title}` : 'That was the last job.'], '#7dff8a');
  } else if (S.screen === 'missionFail') {
    drawCenterCard(ctx, view, 'JOB FAILED', [S.mission.message, 'The crew still believes in you.', 'Retry the job.'], '#ff5a5a');
  } else if (S.screen === 'busted') {
    drawCenterCard(ctx, view, 'BUSTED', ['The harbor police caught up with you.', 'You lose $100 in fines. Cash keeps the rest.'], '#5a8aff');
  } else if (S.screen === 'wasted') {
    drawCenterCard(ctx, view, 'WASTED', ['Kai is down. The crew drags him to the safehouse.', 'Health restored. The jobs are still waiting.'], '#ff5a5a');
  } else if (S.screen === 'storyDone') {
    drawCenterCard(ctx, view, 'PORT ALEGRE IS YOURS', ['All six jobs done. The harbor boss is paid off.', `Final cash: $${S.cash}.`, 'Thanks for playing Harbor Lights.'], '#ffd23c');
  }
}

function cityIslands(city) {
  // The minimap needs island rects; city.js owns them.
  return city.islands || [];
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    startGame();
  } catch (err) {
    const el = document.getElementById('err');
    if (el) el.textContent = String(err && err.stack ? err.stack : err);
    throw err;
  }
});
// Harbor Lights — recorded build touch
