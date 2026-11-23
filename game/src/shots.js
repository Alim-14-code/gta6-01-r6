// Harbor Lights — screenshot scenes: deterministic staged states for the 4 shots.
// The game reads ?shot=<name> from the URL; each name places the player, the
// mission and the wanted level so the shot shows a different system at its best.
import { MISSIONS } from './config.js';

export const SHOT_NAMES = ['start', 'drive', 'chase', 'mission'];

export function shotFromUrl() {
  const q = new URLSearchParams(window.location.search);
  const s = q.get('shot');
  return SHOT_NAMES.includes(s) ? s : null;
}

// Stage the world for a shot. Mutates the live state object (player, car,
// cops, missions, wanted) and returns how many seconds to fast-forward so
// traffic and the chase settle before the screenshot is taken.
export function stageShot(shot, S, city) {
  if (shot === 'start') {
    // Title screen is drawn by main.js; nothing to stage in-world.
    return 0;
  }
  if (shot === 'drive') {
    // On the x=720 road in Palmetto Cay, rolling down toward the pickup marker.
    S.playerCar.x = 720; S.playerCar.y = 700; S.playerCar.angle = Math.PI / 2; S.playerCar.speed = 300;
    S.player.x = 720; S.player.y = 700;
    S.inCar = true;
    S.wanted = 0;
    S.mission.index = 0;
    S.mission.stage = 'toPickup';
    S.mission.message = 'Job 1: First Delivery — pick up at the marked spot.';
    S.mission.messageT = 99;
    return 0.6;
  }
  if (shot === 'chase') {
    // On the x=1040 road in Marina Key, fleeing south with cops behind.
    S.playerCar.x = 1040; S.playerCar.y = 1400; S.playerCar.angle = Math.PI / 2; S.playerCar.speed = 420;
    S.player.x = 1040; S.player.y = 1400;
    S.inCar = true;
    S.wanted = 3;
    S.mission.index = 4;
    S.mission.stage = 'getaway';
    S.mission.message = 'Job 5: Getaway — lose the cops, then reach the safehouse.';
    S.mission.messageT = 99;
    return 1.0;
  }
  if (shot === 'mission') {
    // On Sunset Bridge, rolling south onto Sunset Isle toward the lighthouse.
    // The isle is a thin strip, so the car approaches from the bridge: the
    // lighthouse and its TARGET marker stay ahead, the job in progress.
    S.playerCar.x = 1440; S.playerCar.y = 2030; S.playerCar.angle = Math.PI / 2; S.playerCar.speed = 300;
    S.player.x = 1440; S.player.y = 2030;
    S.inCar = true;
    S.wanted = 1;
    S.mission.index = 2;
    S.mission.stage = 'toTarget';
    S.mission.timer = 63;
    S.mission.message = 'Job 3: Lighthouse Run — 63s left. Reach the lighthouse.';
    S.mission.messageT = 99;
    return 0.6;
  }
  return 0;
}

export function shotCaption(shot) {
  const def = {
    start: 'Harbor Lights — title screen over the Port Alegre skyline at dusk.',
    drive: 'Driving the boulevard in Palmetto Cay, first job on the HUD with minimap.',
    chase: 'A 3-star getaway across Marina Bridge, police in pursuit, helicopter above.',
    mission: 'Job 3, the Lighthouse Run: timed run to Sunset Isle with the marker ahead.',
  };
  return def[shot] || '';
}

export function missionNameForShot(shot) {
  if (shot === 'drive') return MISSIONS[0].title;
  if (shot === 'chase') return MISSIONS[4].title;
  if (shot === 'mission') return MISSIONS[2].title;
  return 'Harbor Lights';
}
// Harbor Lights — recorded build touch
