// Harbor Lights — pedestrians: sidewalk walkers who stroll, wait and scatter.
import { makeRng, pick, range } from './random.js';

const SHIRTS = ['#d05a5a', '#5a8ad0', '#d0b05a', '#5ad08a', '#a05ad0', '#d07a3a', '#e0e0e0'];

export function makePeople(city, count, seed = 4242) {
  const rng = makeRng(seed);
  const people = [];
  for (let i = 0; i < count; i++) {
    // Start on a sidewalk beside a road: pick a road point, offset to the side.
    const r = pick(rng, city.roads);
    const t = rng();
    const bx = r.vertical ? r.x0 : r.x0 + (r.x1 - r.x0) * t;
    const by = r.vertical ? r.y0 + (r.y1 - r.y0) * t : r.y0;
    const side = rng() < 0.5 ? -1 : 1;
    const x = bx + (r.vertical ? side * 38 : range(rng, -30, 30));
    const y = by + (r.vertical ? range(rng, -30, 30) : side * 38);
    people.push({
      x, y, angle: rng() * Math.PI * 2,
      speed: 28 + rng() * 26,
      shirt: pick(rng, SHIRTS),
      walkPhase: rng() * Math.PI * 2,
      wait: 0,
      scared: 0,
    });
  }
  return people;
}

export function stepPeople(people, dt, city, player, playerSpeed) {
  for (const p of people) {
    if (p.scared > 0) {
      p.scared -= dt;
      // Flee from the player.
      const away = Math.atan2(p.y - player.y, p.x - player.x);
      p.angle = away;
      p.x += Math.cos(away) * 150 * dt;
      p.y += Math.sin(away) * 150 * dt;
      p.walkPhase += dt * 14;
      continue;
    }
    // Scare: a fast car passing close by.
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    if (dx * dx + dy * dy < 90 * 90 && playerSpeed > 220) {
      p.scared = 1.2;
      continue;
    }
    if (p.wait > 0) {
      p.wait -= dt;
      continue;
    }
    const nx = p.x + Math.cos(p.angle) * p.speed * dt;
    const ny = p.y + Math.sin(p.angle) * p.speed * dt;
    if (city.hitBuilding(nx, ny, 8) || city.isWater(nx, ny) || city.isRoad(nx, ny)) {
      // Reached a corner or the road: pick a new direction or wait a beat.
      if (Math.random() < 0.25) p.wait = 1 + Math.random() * 2;
      p.angle += (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2 + Math.random() * 0.6);
      continue;
    }
    p.x = nx;
    p.y = ny;
    p.walkPhase += dt * 7;
  }
}
// Harbor Lights — recorded build touch
