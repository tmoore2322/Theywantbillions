'use strict';
// ============================================================
// Maps. Seed 0 = the hand-authored "County Seat". Any other seed
// = procedural map with the same structural guarantees: a lake,
// rock ridges with chokes, tree stands, deposits, five Encampments.
// ============================================================
function makeRng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }

function terrainPassable(v) { return v === TER.GRASS || v === TER.STONE || v === TER.IRON; }

function buildTerrain(seed) {
  seed = seed | 0;
  const t = new Uint8Array(MAP_W * MAP_H);
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) t[y * MAP_W + x] = v; };
  const blob = (cx, cy, r, v) => { for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy <= r * r) set(x, y, v); } };
  const ellipse = (cx, cy, rx, ry, v) => { for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) { const dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy <= 1) set(x, y, v); } };
  let camps;
  if (seed === 0) {
    ellipse(8, 30, 6.5, 5, TER.WATER); ellipse(44, 40, 3.5, 2.5, TER.WATER);
    for (let x = 13; x <= 41; x++) { if (x < 26 || x > 29) set(x, 15, TER.ROCK); }
    for (let x = 12; x <= 40; x++) { if (x < 25 || x > 28) set(x, 16, TER.ROCK); }
    for (let x = 15; x <= 43; x++) { if (x < 26 || x > 29) set(x, 39, TER.ROCK); }
    for (let x = 16; x <= 44; x++) { if (x < 27 || x > 30) set(x, 40, TER.ROCK); }
    for (let y = 22; y <= 33; y++) { if (y < 26 || y > 29) set(43, y, TER.ROCK); }
    const trees = [[20, 21, 2.4], [35, 22, 2.2], [19, 34, 2.4], [36, 35, 2.2], [10, 12, 4], [46, 10, 4], [47, 47, 3.2], [8, 47, 3.5], [27, 6, 3], [27, 50, 2.6], [51, 28, 3], [4, 20, 2.5], [14, 27, 1.6], [40, 30, 1.6]];
    for (const [x, y, r] of trees) blob(x, y, r, TER.TREE);
    blob(21.5, 26.5, 1.4, TER.STONE); blob(33.5, 31.5, 1.4, TER.STONE); blob(30, 20, 1.1, TER.STONE); blob(24, 34, 1.1, TER.STONE); blob(12, 40, 1.5, TER.STONE); blob(45, 18, 1.5, TER.STONE);
    blob(18, 30, 1.2, TER.IRON); blob(37, 25, 1.2, TER.IRON); blob(33, 42, 1.4, TER.IRON); blob(25, 12, 1.4, TER.IRON);
    const rnd = makeRng(1337);
    for (let i = 0; i < 90; i++) { const x = Math.floor(rnd() * MAP_W), y = Math.floor(rnd() * MAP_H); const dx = x - 27.5, dy = y - 27.5; if (dx * dx + dy * dy < 49) continue; if (t[y * MAP_W + x] === TER.GRASS) set(x, y, TER.TREE); }
    camps = [{ x: 9, y: 9 }, { x: 46, y: 6 }, { x: 5, y: 40 }, { x: 47, y: 46 }, { x: 27, y: 3 }];
  } else {
    const rnd = makeRng(seed);
    const cx0 = 27.5, cy0 = 27.5;
    const far = (x, y, d) => Math.hypot(x - cx0, y - cy0) >= d;
    // lakes
    const nl = 1 + (rnd() < 0.5 ? 1 : 0);
    for (let i = 0; i < nl; i++) { let x, y; do { x = 4 + rnd() * 48; y = 4 + rnd() * 48; } while (!far(x, y, 15)); ellipse(x, y, 3 + rnd() * 4, 2.5 + rnd() * 3, TER.WATER); }
    // ridges: two or three, each with a 4-wide gap
    const nr = 2 + (rnd() < 0.5 ? 1 : 0);
    const sides = ['n', 's', 'e', 'w'].sort(() => rnd() - 0.5).slice(0, nr);
    for (const sd of sides) {
      const off = 11 + Math.floor(rnd() * 4); const len = 22 + Math.floor(rnd() * 10); const start = 27 - Math.floor(len / 2) + Math.floor((rnd() - 0.5) * 8);
      const gap = 25 + Math.floor(rnd() * 4);
      for (let i = 0; i < len; i++) { const a = start + i; const inGap = a >= gap && a < gap + 4; if (inGap) continue;
        for (let k = 0; k < 2; k++) { if (sd === 'n') set(a + k, 27 - off - k, TER.ROCK); else if (sd === 's') set(a + k, 27 + off + k, TER.ROCK); else if (sd === 'w') set(27 - off - k, a + k, TER.ROCK); else set(27 + off + k, a + k, TER.ROCK); } }
    }
    // tree stands
    const nt = 12 + Math.floor(rnd() * 5);
    for (let i = 0; i < nt; i++) { let x, y; do { x = 2 + rnd() * 52; y = 2 + rnd() * 52; } while (!far(x, y, 8)); blob(x, y, 1.6 + rnd() * 2.6, TER.TREE); }
    for (let i = 0; i < 100; i++) { const x = Math.floor(rnd() * MAP_W), y = Math.floor(rnd() * MAP_H); if (!far(x, y, 7)) continue; if (t[y * MAP_W + x] === TER.GRASS) set(x, y, TER.TREE); }
    // deposits: two of each within reach of the hall, more further out
    const dep = (v, n, dmin, dmax) => { for (let i = 0; i < n; i++) { let x, y, tries = 0; do { x = 3 + rnd() * 50; y = 3 + rnd() * 50; } while ((!far(x, y, dmin) || far(x, y, dmax)) && tries++ < 200); blob(x, y, 1 + rnd() * 0.6, v); } };
    dep(TER.STONE, 2, 5, 9); dep(TER.STONE, 4, 9, 22); dep(TER.IRON, 2, 7, 11); dep(TER.IRON, 3, 11, 24);
    // clear the hall block
    for (let y = 22; y <= 33; y++) for (let x = 22; x <= 33; x++) { const v = t[y * MAP_W + x]; if (v === TER.TREE || v === TER.WATER || v === TER.ROCK) set(x, y, TER.GRASS); }
    for (let y = 25; y <= 30; y++) for (let x = 25; x <= 30; x++) set(x, y, TER.GRASS);
    // encampments: five, far out, on clear 3x3 land
    camps = [];
    let tries = 0;
    while (camps.length < 5 && tries++ < 2000) {
      const x = 2 + Math.floor(rnd() * (MAP_W - 7)), y = 2 + Math.floor(rnd() * (MAP_H - 7));
      if (!far(x + 1.5, y + 1.5, 19)) continue;
      if (camps.some(c => Math.hypot(c.x - x, c.y - y) < 12)) continue;
      let ok = true; for (let yy = y - 1; yy <= y + 3 && ok; yy++) for (let xx = x - 1; xx <= x + 3; xx++) { if (xx < 0 || yy < 0 || xx >= MAP_W || yy >= MAP_H) continue; if (t[yy * MAP_W + xx] !== TER.GRASS) { ok = false; break; } }
      if (ok) camps.push({ x, y });
    }
  }
  return { terrain: t, camps };
}

// Reachability check: fraction of passable tiles reachable from the hall block.
function terrainReach(t) {
  const N = MAP_W * MAP_H; const seen = new Uint8Array(N); const q = [tileIndex(27, 27)]; seen[q[0]] = 1; let n = 0, total = 0;
  for (let i = 0; i < N; i++) if (terrainPassable(t[i])) total++;
  while (q.length) { const c = q.pop(); n++; const x = c % MAP_W, y = (c / MAP_W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue; const nt = ny * MAP_W + nx; if (seen[nt] || !terrainPassable(t[nt])) continue; seen[nt] = 1; q.push(nt); } }
  return n / total;
}

function generateMap(seed) {
  if (seed === 0) return Object.assign(buildTerrain(0), { seed: 0 });
  for (let s = seed, i = 0; i < 40; i++, s++) { const m = buildTerrain(s); if (m.camps.length === 5 && terrainReach(m.terrain) >= 0.75) return Object.assign(m, { seed: s }); }
  return Object.assign(buildTerrain(0), { seed: 0 });
}
