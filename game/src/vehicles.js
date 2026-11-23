// Harbor Lights — vehicles: player car physics, traffic, police pursuit, helicopter.
import { TUNING, PALETTE } from './config.js';
import { makeRng, pick } from './random.js';

const TRAFFIC_COLORS = ['#c8c8d0', '#3a7a4a', '#c8a03a', '#7a3a6b', '#4a6b8a', '#d0d0c8', '#8a2a2a'];

export function makeCar(x, y, angle, color) {
  return { x, y, angle, speed: 0, color, w: 46, h: 22, brake: false };
}

export function stepPlayerCar(car, input, dt, city) {
  const ax = input.axis();
  // Steering scales down at low speed so the car does not spin in place.
  const spd = car.speed;
  const steer = ax.x * TUNING.carTurn * Math.min(1, Math.abs(spd) / 120) * (spd < 0 ? -1 : 1);
  car.angle += steer * dt * (spd >= 0 ? 1 : -1);
  if (ax.y > 0) car.speed += TUNING.carAccel * dt;
  else if (ax.y < 0) car.speed -= (spd > 10 ? TUNING.carBrake : TUNING.carAccel * 0.6) * dt;
  else car.speed -= Math.sign(spd) * Math.min(Math.abs(spd), TUNING.carDrag * 90 * dt);
  if (car.speed > TUNING.carMaxSpeed) car.speed = TUNING.carMaxSpeed;
  if (car.speed < -TUNING.carReverseMax) car.speed = -TUNING.carReverseMax;
  if (Math.abs(car.speed) < 4 && ax.y === 0) car.speed = 0;
  car.brake = ax.y < 0 && spd > 10;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // Buildings block the car; water blocks it too (bridges excepted).
  if (!city.hitBuilding(nx, ny, 12) && !city.isWater(nx, ny)) {
    car.x = nx; car.y = ny;
  } else {
    car.speed *= 0.4; // scrape along the obstacle
  }
  car.x = Math.max(30, Math.min(city.bounds.w - 30, car.x));
  car.y = Math.max(30, Math.min(city.bounds.h - 30, car.y));
}

export function makeTraffic(city, count, seed = 777) {
  const rng = makeRng(seed);
  const cars = [];
  const roadPoints = [];
  for (const r of city.roads) {
    const len = r.vertical ? r.y1 - r.y0 : r.x1 - r.x0;
    for (let d = 80; d < len - 40; d += 160) {
      roadPoints.push(r.vertical ? { x: r.x0, y: r.y0 + d } : { x: r.x0 + d, y: r.y0 });
    }
  }
  for (let i = 0; i < count; i++) {
    const p = pick(rng, roadPoints);
    const angle = rng() < 0.5 ? 0 : Math.PI;
    const c = makeCar(p.x + (rng() - 0.5) * 20, p.y + (rng() - 0.5) * 20, angle, pick(rng, TRAFFIC_COLORS));
    c.speed = 90 + rng() * 90;
    c.road = true;
    cars.push(c);
  }
  return cars;
}

export function stepTraffic(cars, dt, city) {
  for (const c of cars) {
    // Follow the road: keep to the current lane, turn at intersections by
    // snapping to the nearest road centerline ahead.
    const aheadX = c.x + Math.cos(c.angle) * 60;
    const aheadY = c.y + Math.sin(c.angle) * 60;
    if (!city.isRoad(aheadX, aheadY)) {
      // Find the closest road point and steer toward it.
      let best = null;
      let bestD = Infinity;
      for (const r of city.roads) {
        const px = r.vertical ? r.x0 : Math.max(r.x0, Math.min(c.x, r.x1));
        const py = r.vertical ? Math.max(r.y0, Math.min(c.y, r.y1)) : r.y0;
        const d = (px - c.x) * (px - c.x) + (py - c.y) * (py - c.y);
        if (d < bestD) { bestD = d; best = { x: px, y: py }; }
      }
      if (best) {
        const want = Math.atan2(best.y - c.y, best.x - c.x);
        let diff = want - c.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        c.angle += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
      }
    }
    c.x += Math.cos(c.angle) * c.speed * dt;
    c.y += Math.sin(c.angle) * c.speed * dt;
    if (city.hitBuilding(c.x, c.y, 10) || city.isWater(c.x, c.y)) {
      c.angle += Math.PI; // turn around rather than beach itself
      c.x += Math.cos(c.angle) * 30;
      c.y += Math.sin(c.angle) * 30;
    }
  }
  // Gentle separation so traffic does not stack into one bumper.
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i]; const b = cars[j];
      const dx = b.x - a.x; const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 50 * 50 && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const push = (50 - d) / 2;
        a.x -= (dx / d) * push; a.y -= (dy / d) * push;
        b.x += (dx / d) * push; b.y += (dy / d) * push;
      }
    }
  }
}

export function makeCop(x, y) {
  const c = makeCar(x, y, 0, PALETTE.copCar);
  c.cop = true;
  c.siren = 0;
  return c;
}

export function stepCops(cops, target, dt, city, wanted) {
  const wantCount = wanted === 0 ? 0 : wanted === 1 ? 1 : wanted === 2 ? 2 : wanted === 3 ? 3 : 4;
  while (cops.length < wantCount) {
    // Spawn behind the player, on a road, out of immediate sight.
    const a = Math.random() * Math.PI * 2;
    const sx = target.x + Math.cos(a) * 700;
    const sy = target.y + Math.sin(a) * 700;
    const spot = city.clampToLand(sx, sy);
    cops.push(makeCop(spot.x, spot.y));
  }
  while (cops.length > wantCount) cops.pop();
  for (const c of cops) {
    const want = Math.atan2(target.y - c.y, target.x - c.x);
    let diff = want - c.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    c.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    c.speed = Math.min(TUNING.copMaxSpeed, c.speed + TUNING.copAccel * dt);
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    if (!city.hitBuilding(nx, ny, 12) && !city.isWater(nx, ny)) {
      c.x = nx; c.y = ny;
    } else {
      c.speed *= 0.5;
      c.angle += 0.6 * dt;
    }
    c.siren += dt;
  }
  return cops;
}

export function makeHeli(x, y) {
  return { x, y, angle: 0, rotor: 0, spotlight: 0 };
}

export function stepHeli(heli, target, dt) {
  const want = Math.atan2(target.y - heli.y, target.x - heli.x);
  let diff = want - heli.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  heli.angle += Math.max(-1.2 * dt, Math.min(1.2 * dt, diff));
  heli.x += Math.cos(heli.angle) * 260 * dt;
  heli.y += Math.sin(heli.angle) * 260 * dt;
  heli.rotor += dt * 22;
  heli.spotlight += dt;
}
// Harbor Lights — recorded build touch
