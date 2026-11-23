// Harbor Lights — the six story missions: objectives, timers, success and failure.
import { MISSIONS } from './config.js';

export function makeMissions() {
  return {
    index: 0, // 0-based into MISSIONS; 6 means the story is done
    stage: 'idle', // idle | toPickup | toTarget | chase | tail | getaway | done | failed
    timer: 0,
    message: '',
    messageT: 0,
    chaseTarget: null, // the courier van (mission 2)
    tailTarget: null, // the grey sedan (mission 4)
    tailSeen: 0, // seconds the tail target has spotted the player
    busted: false,
  };
}

export function currentMission(m) {
  return m.index < MISSIONS.length ? MISSIONS[m.index] : null;
}

export function startMission(m, city) {
  const def = currentMission(m);
  if (!def) return;
  m.timer = def.timed || 0;
  m.tailSeen = 0;
  if (def.pickup) {
    m.stage = 'toPickup';
    m.message = `Job ${def.id}: ${def.title} — pick up at the marked spot.`;
  } else if (def.chase) {
    m.stage = 'chase';
    m.chaseTarget = { x: 1500, y: 1500, angle: 0, speed: 150, health: 3 };
    m.message = `Job ${def.id}: ${def.title} — ram the courier van to a stop!`;
  } else if (def.tail) {
    m.stage = 'tail';
    m.tailTarget = { x: 700, y: 500, angle: 0, speed: 120, path: 0 };
    m.message = `Job ${def.id}: ${def.title} — follow the grey sedan. Do not get spotted.`;
  } else if (def.getaway) {
    m.stage = 'getaway';
    m.message = `Job ${def.id}: ${def.title} — lose the cops, then reach the safehouse.`;
  } else {
    m.stage = 'toTarget';
    m.message = `Job ${def.id}: ${def.title} — reach the marker.`;
  }
  m.messageT = 4;
}

export function missionTarget(m) {
  const def = currentMission(m);
  if (!def) return null;
  if (m.stage === 'toPickup' && def.pickup) return { ...def.pickup, label: 'PICKUP' };
  if (m.stage === 'chase' && m.chaseTarget) return { ...m.chaseTarget, label: 'VAN' };
  if (m.stage === 'tail' && m.tailTarget) return { ...m.tailTarget, label: 'SEDAN' };
  if (m.stage === 'toTarget' || m.stage === 'getaway') return { ...def.target, label: 'TARGET' };
  return null;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Advance the mission. Returns 'complete' | 'failed' | null.
// state: { player, playerCar, inCar, wanted, setWanted }
export function stepMission(m, dt, state, city) {
  const def = currentMission(m);
  if (!def || m.stage === 'done' || m.stage === 'failed') return null;
  if (m.messageT > 0) m.messageT -= dt;
  if (m.timer > 0) {
    m.timer -= dt;
    if (m.timer <= 0) {
      m.stage = 'failed';
      m.message = `Job ${def.id} failed — out of time.`;
      m.messageT = 4;
      return 'failed';
    }
  }
  const p = state.inCar ? state.playerCar : state.player;

  if (m.stage === 'toPickup' && def.pickup && dist(p, def.pickup) < 70) {
    m.stage = 'toTarget';
    m.message = 'Parcel secured. Now reach the marker.';
    m.messageT = 3;
    return null;
  }
  if (m.stage === 'toTarget' && dist(p, def.target) < 70) {
    return completeMission(m, def);
  }
  if (m.stage === 'chase' && m.chaseTarget) {
    // The van flees along the roads; ramming it (close + fast) damages it.
    const v = m.chaseTarget;
    v.angle += Math.sin(v.path || 0) * 0.4 * dt;
    v.path = (v.path || 0) + dt;
    v.x += Math.cos(v.angle) * v.speed * dt;
    v.y += Math.sin(v.angle) * v.speed * dt;
    const spot = city.clampToLand(v.x, v.y);
    v.x = spot.x; v.y = spot.y;
    if (dist(p, v) < 60 && Math.abs(state.playerCar ? state.playerCar.speed : 0) > 200) {
      v.health -= dt * 2;
      if (v.health <= 0) return completeMission(m, def);
    }
  }
  if (m.stage === 'tail' && m.tailTarget) {
    const t = m.tailTarget;
    // The sedan cruises a downtown loop.
    t.path += dt * 0.25;
    t.x = 700 + Math.cos(t.path) * 420;
    t.y = 500 + Math.sin(t.path * 0.8) * 260;
    const d = dist(p, t);
    if (d < 130) {
      m.tailSeen += dt;
      if (m.tailSeen > 2.5) {
        m.stage = 'failed';
        m.message = 'Spotted! The sedan made you. Job failed.';
        m.messageT = 4;
        return 'failed';
      }
    } else {
      m.tailSeen = Math.max(0, m.tailSeen - dt);
    }
    if (d > 900) {
      m.stage = 'failed';
      m.message = 'Lost the sedan. Job failed.';
      m.messageT = 4;
      return 'failed';
    }
    // Reach the tail destination: after 40s of following, the sedan parks.
    if (t.path > 10) return completeMission(m, def);
  }
  if (m.stage === 'getaway') {
    if (state.wanted === 0 && dist(p, def.target) < 70) return completeMission(m, def);
  }
  return null;
}

function completeMission(m, def) {
  m.stage = 'done';
  m.message = `Job ${def.id} complete — $${def.reward} earned.`;
  m.messageT = 4;
  return 'complete';
}

export function advanceMission(m) {
  // Called after a 'complete': move to the next job and reset the stage.
  m.index += 1;
  m.stage = 'idle';
  m.chaseTarget = null;
  m.tailTarget = null;
  m.timer = 0;
  const def = currentMission(m);
  if (def) {
    m.message = `Next job: ${def.title} — press E to start.`;
    m.messageT = 5;
  } else {
    m.message = 'Story complete! Port Alegre is yours, Kai.';
    m.messageT = 6;
  }
}

export function failMissionReset(m) {
  // After a failure the same job can be retried.
  m.stage = 'idle';
  m.chaseTarget = null;
  m.tailTarget = null;
  m.timer = 0;
  m.message = 'Press E to retry the job.';
  m.messageT = 5;
}
// Harbor Lights — recorded build touch
