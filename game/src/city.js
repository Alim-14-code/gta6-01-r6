// Harbor Lights — the city: three islands, a road grid, bridges, docks, lighthouse.
// Buildings sit on blocks only, never on a road; bridges are roads over water.
import { ISLANDS, BRIDGES, WORLD, PALETTE } from './config.js';
import { makeRng, pick, rangeInt } from './random.js';

const ROAD_HALF = 26; // half-width of a road, in world pixels

export function buildCity(seed = 20261123) {
  const rng = makeRng(seed);
  const roads = []; // {x0,y0,x1,y1,vertical} centerline segments, drivable
  const buildings = []; // {x,y,w,h,color,roof}
  const docks = []; // {x,y,w,h} wooden piers over the water
  const places = {}; // named mission spots
  const trees = [];
  const lamps = [];

  // Road grid per island: verticals every 320px, horizontals every 320px.
  for (const isl of ISLANDS) {
    for (let x = isl.x + 160; x < isl.x + isl.w - 80; x += 320) {
      roads.push({ x0: x, y0: isl.y, x1: x, y1: isl.y + isl.h, vertical: true });
    }
    for (let y = isl.y + 160; y < isl.y + isl.h - 80; y += 320) {
      roads.push({ x0: isl.x, y0: y, x1: isl.x + isl.w, y1: y, vertical: false });
    }
    // Perimeter boulevard along the east shore (beachfront / marina front).
    roads.push({ x0: isl.x + isl.w - 40, y0: isl.y, x1: isl.x + isl.w - 40, y1: isl.y + isl.h, vertical: true });
  }
  // Bridges are roads too.
  for (const b of BRIDGES) {
    roads.push({ x0: b.x, y0: b.y0, x1: b.x, y1: b.y1, vertical: true, bridge: true });
  }

  function onRoad(x, y, pad = 0) {
    for (const r of roads) {
      if (r.vertical) {
        if (Math.abs(x - r.x0) <= ROAD_HALF + pad && y >= r.y0 - pad && y <= r.y1 + pad) return true;
      } else if (Math.abs(y - r.y0) <= ROAD_HALF + pad && x >= r.x0 - pad && x <= r.x1 + pad) {
        return true;
      }
    }
    return false;
  }
  function inIsland(x, y) {
    return ISLANDS.some((i) => x >= i.x && x <= i.x + i.w && y >= i.y && y <= i.y + i.h);
  }
  function onBridge(x, y) {
    return BRIDGES.some((b) => Math.abs(x - b.x) <= ROAD_HALF && y >= b.y0 && y <= b.y1);
  }

  // Buildings: one or two per block, inside the cells between the roads
  // (a cell runs from one road's edge to the next), never on a road.
  for (const isl of ISLANDS) {
    const vx = [];
    for (let x = isl.x + 160; x < isl.x + isl.w - 80; x += 320) vx.push(x);
    const hy = [];
    for (let y = isl.y + 160; y < isl.y + isl.h - 80; y += 320) hy.push(y);
    const xs = [isl.x, ...vx, isl.x + isl.w];
    const ys = [isl.y, ...hy, isl.y + isl.h];
    for (let i = 0; i < xs.length - 1; i++) {
      for (let j = 0; j < ys.length - 1; j++) {
        const cx0 = xs[i] + 36;
        const cy0 = ys[j] + 36;
        const cx1 = xs[i + 1] - 36;
        const cy1 = ys[j + 1] - 36;
        if (cx1 - cx0 < 110 || cy1 - cy0 < 90) continue;
        if (rng() < 0.16) continue; // empty lot: park or plaza
        const count = rng() < 0.5 ? 1 : 2;
        for (let k = 0; k < count; k++) {
          const w = rangeInt(rng, 80, Math.min(150, cx1 - cx0 - 10));
          const h = rangeInt(rng, 70, Math.min(120, cy1 - cy0 - 10));
          const x = cx0 + (k === 0 ? 0 : Math.max(0, cx1 - cx0 - w)) + rangeInt(rng, 0, 8);
          const y = cy0 + rangeInt(rng, 0, Math.max(0, cy1 - cy0 - h));
          if (x + w > cx1 || y + h > cy1) continue;
          if (onRoad(x + w / 2, y + h / 2, 40)) continue;
          buildings.push({ x, y, w, h, color: pick(rng, PALETTE.buildingRoof), roof: rng() < 0.5 });
        }
        if (rng() < 0.3) trees.push({ x: cx0 + rangeInt(rng, 10, Math.max(11, cx1 - cx0 - 10)), y: cy0 + rangeInt(rng, 10, Math.max(11, cy1 - cy0 - 10)), r: rangeInt(rng, 10, 18) });
      }
    }
  }

  // Marina docks on Marina Key's east shore, over the water.
  for (let i = 0; i < 5; i++) {
    docks.push({ x: 1840 + i * 8, y: 1300 + i * 110, w: 150, h: 26 });
  }
  // Lighthouse at the southern tip of Sunset Isle.
  places.lighthouse = { x: 1680, y: 2420, label: 'Lighthouse' };
  places.cafe = { x: 1560, y: 420, label: 'Boulevard Cafe' };
  places.dockParcel = { x: 420, y: 900, label: 'Palmetto Docks' };
  places.warehouse = { x: 1560, y: 1450, label: 'Marina Warehouse' };
  places.safehouse = { x: 500, y: 1600, label: 'Safehouse' };
  places.courierStart = { x: 1500, y: 1500, label: 'Courier Van' };
  places.tailStart = { x: 700, y: 500, label: 'Grey Sedan' };

  // Street lamps along the beachfront boulevard.
  for (let y = 200; y < 2400; y += 160) lamps.push({ x: 1800, y });

  function isWater(x, y) {
    if (onBridge(x, y)) return false;
    return !inIsland(x, y);
  }
  function isRoad(x, y) {
    return onRoad(x, y, 0);
  }
  function hitBuilding(x, y, pad = 0) {
    for (const b of buildings) {
      if (x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad) return b;
    }
    return null;
  }
  function clampToLand(x, y) {
    // Keep a point on land: if it fell in water, pull it to the nearest island edge.
    if (!isWater(x, y)) return { x, y };
    let best = null;
    let bestD = Infinity;
    for (const isl of ISLANDS) {
      const cx = Math.max(isl.x + 8, Math.min(x, isl.x + isl.w - 8));
      const cy = Math.max(isl.y + 8, Math.min(y, isl.y + isl.h - 8));
      const d = (cx - x) * (cx - x) + (cy - y) * (cy - y);
      if (d < bestD) { bestD = d; best = { x: cx, y: cy }; }
    }
    return best;
  }

  return {
    islands: ISLANDS, roads, buildings, docks, places, trees, lamps,
    isWater, isRoad, onRoad, hitBuilding, clampToLand,
    bounds: { w: WORLD.width, h: WORLD.height },
  };
}
// Harbor Lights — recorded build touch
