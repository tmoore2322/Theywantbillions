'use strict';
// ============================================================
// Simulation: state, buildings, units, occupation, waves,
// tech tree, lieutenants.
// ============================================================
const G = {};

function tileIndex(x, y) { return y * MAP_W + x; }
function inMap(x, y) { return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function rectDist(px, py, b) { // distance from point to building footprint
  const dx = Math.max(b.x - px, 0, px - (b.x + b.w));
  const dy = Math.max(b.y - py, 0, py - (b.y + b.h));
  return Math.hypot(dx, dy);
}
function rectGap(a, b) { // tile gap between two footprints (0 = touching)
  const dx = Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w), 0);
  const dy = Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h), 0);
  return Math.max(dx, dy);
}
function bCenter(b) { return [b.x + b.w / 2, b.y + b.h / 2]; }
function techDone(id) { return !id || (G.tech && G.tech.done.has(id)); }
function isIndustry(b) { return b.def.kind === 'industry'; }

// ---------- cost / solidity ----------
function terImpassable(t) { const v = G.terrain[t]; return v === TER.WATER || v === TER.ROCK || v === TER.TREE; }
function solidTile(t) { return terImpassable(t) || G.grid[t] >= 0; }
function enemyCost(t) {
  if (terImpassable(t)) return Infinity;
  const bid = G.grid[t];
  if (bid >= 0) {
    const b = G.bmap.get(bid); if (!b || b.state !== 'player') return Infinity;
    if (b.def.kind === 'trap') return 3;
    if (b.def.gate && G.gatesOpen > 0) return 1;
    if (b.paint > 0) return 1.5;
    return 2 + b.hp / 45;
  }
  return 1;
}
function goonCost(t) {
  if (terImpassable(t)) return Infinity;
  const bid = G.grid[t];
  if (bid >= 0) {
    const b = G.bmap.get(bid); if (!b || b.state !== 'player') return Infinity;
    if (b.def.kind === 'trap') return 3;
    if (b.def.kind === 'defense' && !b.def.range) return 2.5; // walls and gates: jump
    return 2 + b.hp / 45;
  }
  return 1;
}
function playerCost(t) {
  if (terImpassable(t)) return Infinity;
  const bid = G.grid[t];
  if (bid >= 0) { const b = G.bmap.get(bid); return (b && b.def.gate && b.state === 'player') ? 1.5 : Infinity; }
  return 1;
}
function costFor(u) { return u.side === 'player' ? playerCost : (u.def.jump ? goonCost : enemyCost); }
function getField(key, goals, costFn) {
  let f = G.fields.get(key);
  if (!f) { f = computeField(goals, costFn, solidTile); G.fields.set(key, f); }
  return f;
}
function invalidateFields() { G.fields.clear(); G.fieldsDirty = true; }
function footprintTiles(b) { const out = []; for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) out.push(tileIndex(x, y)); return out; }

// ---------- init ----------
function newGame(opts) {
  opts = opts || {}; G.seed = opts.seed | 0; G.difficulty = DIFFICULTY[opts.difficulty] ? opts.difficulty : 'normal';
  G.time = 0; G.day = 1; G.dayTimer = DAY_LENGTH; G.paused = false; G.speed = 1; G.over = false; G.won = false;
  G.res = Object.assign({}, START_RES); for (const k in G.res) G.res[k] = Math.round(G.res[k] * DIFFICULTY[G.difficulty].res); G.trust = START_TRUST; G.momentum = START_MOMENTUM;
  G.buildings = []; G.units = []; G.nextId = 1; G.bmap = new Map(); G.umap = new Map();
  G.grid = new Int32Array(MAP_W * MAP_H).fill(-1);
  G.map = generateMap(G.seed); G.terrain = G.map.terrain; G.seed = G.map.seed;
  G.fields = new Map(); G.fieldsDirty = true;
  G.vis = new Uint8Array(MAP_W * MAP_H); G.visTimer = 0; G.slowTimer = 0;
  G.msgs = []; G.levyDay = 0; G.treasuryZero = 0; G.foodShort = false;
  G.wave = null; G.wavesBeaten = 0; G.waveDir = '';
  G.stats = { killed: 0, lost: 0, recaptured: 0, waves: 0, flips: 0, lts: 0 };
  G.muster = { queue: 0, timer: 0 }; G.trainQ = [];
  G.tech = { done: new Set(), current: null, timer: 0, total: 0 };
  G.organized = 0; G.orgMsgT = 0; G.regulation = false; G.lts = []; G.publicFund = 0; G.freeze = { t: 0, warn: 0 }; G.revive = []; G.gatesOpen = 0; G.seizureBoost = 0; G.committee = null; G.raids = 0;
  G.effects = []; G.hall = null; G.vault = null;
  G.unitGrid = new Map();
  G.hh = { used: 0, cap: 0 };
  G.hall = placeBuilding('townhall', 26, 26, true);
  G.vault = placeBuilding('vault', 29, 27, true);
  spawnUnit('minuteman', 25.5, 30.5); spawnUnit('minuteman', 30.5, 30.5);
  for (const e of G.map.camps) { const b = placeBuilding('encampment', e.x, e.y, true); if (b) { b.state = 'enemy'; b.pulse = 20 + Math.random() * 20; } }
  const rnd = makeRng(4242 + G.seed);
  let placed = 0, tries = 0;
  while (placed < 34 && tries++ < 4000) {
    const x = Math.floor(rnd() * MAP_W), y = Math.floor(rnd() * MAP_H);
    const dx = x - 27.5, dy = y - 27.5; if (dx * dx + dy * dy < 15 * 15) continue;
    if (!terrainPassable(G.terrain[tileIndex(x, y)])) continue;
    const u = spawnUnit(placed % 8 === 7 ? 'organizer' : 'activist', x + 0.5, y + 0.5);
    u.idle = true; u.wave = false; placed++;
  }
  msg('Day 1: Study Group. The fog is quiet. Title the town, wall the choke, muster before the clock runs out.', 'info');
  msg('The first Wave arrives at the start of Day ' + FIRST_WAVE_DAY + '. Survive Day ' + WIN_DAY + ' to win.', 'warn');
}

// ---------- messages / effects ----------
function msg(text, cls) { G.msgs.push({ text, cls: cls || '', t: G.time, real: performance.now() }); if (G.msgs.length > 8) G.msgs.shift(); if (typeof UI !== 'undefined') UI.refreshMsgs(); }
function fx(type, x, y, opts) { G.effects.push(Object.assign({ type, x, y, t: 0 }, opts || {})); }

// ---------- buildings ----------
function canPlace(type, x, y) {
  const def = BUILDINGS[type];
  if (!def) return { ok: false, why: 'unknown' };
  if (!techDone(def.tech)) return { ok: false, why: 'Requires ' + TECH[def.tech].name };
  if (G.freeze.t > 0) return { ok: false, why: 'Listening Session in progress (please wait)' };
  if (!inMap(x, y) || !inMap(x + def.w - 1, y + def.h - 1)) return { ok: false, why: 'Off the map' };
  const cx = x + def.w / 2, cy = y + def.h / 2;
  const hx = G.hall.x + 1.5, hy = G.hall.y + 1.5;
  if (Math.hypot(cx - hx, cy - hy) > BUILD_RADIUS) return { ok: false, why: 'Outside Town Hall mandate radius' };
  let depositTouch = false; const need = def.needsStone ? TER.STONE : def.needsIron ? TER.IRON : -1;
  for (let ty = y; ty < y + def.h; ty++) for (let tx = x; tx < x + def.w; tx++) {
    const t = tileIndex(tx, ty); const v = G.terrain[t];
    if (v !== TER.GRASS && v !== need) return { ok: false, why: 'Blocked terrain' };
    if (G.grid[t] >= 0) return { ok: false, why: 'Building in the way' };
    if (v === need) depositTouch = true;
  }
  if (need >= 0 && !depositTouch) {
    for (let ty = y - 1; ty <= y + def.h; ty++) for (let tx = x - 1; tx <= x + def.w; tx++)
      if (inMap(tx, ty) && G.terrain[tileIndex(tx, ty)] === need) depositTouch = true;
    if (!depositTouch) return { ok: false, why: def.name + ' must touch a ' + (need === TER.STONE ? 'stone' : 'iron') + ' deposit' };
  }
  for (const u of G.units) { if (u.dead || u.side !== 'enemy') continue; if (u.x >= x && u.x < x + def.w && u.y >= y && u.y < y + def.h) return { ok: false, why: 'The Wave is standing there' }; }
  for (const k in def.cost) if (G.res[k] < def.cost[k]) return { ok: false, why: 'Not enough ' + k };
  if (def.workers && G.hh.used + def.workers > G.hh.cap) return { ok: false, why: 'Not enough households (workers)' };
  return { ok: true };
}
function placeBuilding(type, x, y, free) {
  const def = BUILDINGS[type];
  if (!free) { const c = canPlace(type, x, y); if (!c.ok) return null; for (const k in def.cost) G.res[k] -= def.cost[k]; }
  const b = { id: G.nextId++, kind: 'b', type, def, x, y, w: def.w, h: def.h, hp: def.hp, maxHp: def.hp, state: 'player',
    recap: 0, recover: 0, pulse: OCCUPY_PULSE * 0.5, cool: 0, occN: 0, inCourt: false, inChapel: false, inDeed: false, inWarehouse: false, inLodge: false,
    treeAdj: 0, target: null, paint: 0, shut: 0, deedUsed: false, deaf: 0 };
  if (!free && G.regulation && def.kind !== 'trap') { b.hp = Math.round(b.maxHp * 0.5); b.recover = 10; }
  G.buildings.push(b); G.bmap.set(b.id, b);
  for (const t of footprintTiles(b)) G.grid[t] = b.id;
  if (type === 'mill') b.treeAdj = countAdjacent(b, TER.TREE);
  invalidateFields(); recountHouseholds(); slowTick(true);
  for (const u of G.units) { if (u.dead || u.side !== 'player') continue; if (u.x >= x && u.x < x + def.w && u.y >= y && u.y < y + def.h) { const p = freeTileNear(b); u.x = p.x; u.y = p.y; u.next = -1; } }
  return b;
}
function countAdjacent(b, ter) {
  let n = 0;
  for (let ty = b.y - 1; ty <= b.y + b.h; ty++) for (let tx = b.x - 1; tx <= b.x + b.w; tx++) {
    if (!inMap(tx, ty)) continue; if (tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h) continue;
    if (G.terrain[tileIndex(tx, ty)] === ter) n++;
  }
  return n;
}
function removeBuilding(b) {
  b.dead = true; G.bmap.delete(b.id);
  const i = G.buildings.indexOf(b); if (i >= 0) G.buildings.splice(i, 1);
  for (const t of footprintTiles(b)) if (G.grid[t] === b.id) G.grid[t] = -1;
  if (G.selected) G.selected = G.selected.filter(e => e !== b);
  invalidateFields(); recountHouseholds();
}
function recountHouseholds() {
  let cap = 0, used = 0;
  for (const b of G.buildings) { if (b.state !== 'player') continue; cap += b.def.households || 0; used += b.def.workers || 0; }
  for (const u of G.units) if (!u.dead && u.side === 'player') used += u.def.workers || 0;
  used += G.muster.queue; for (const q of G.trainQ) used += UNITS[q.type].workers || 0;
  G.hh.cap = Math.max(0, cap - G.organized); G.hh.used = used;
}
function tryFlip(b, how) {
  if (b.state !== 'player') return false;
  if (b.inDeed && !b.deedUsed && b.def.kind !== 'defense') {
    b.deedUsed = true; b.hp = Math.max(b.hp, b.maxHp * 0.15);
    msg(b.def.name + ' held its title (Deed Office). Next time it flips.', 'warn'); fx('recap', b.x + b.w / 2, b.y + b.h / 2);
    return false;
  }
  occupyBuilding(b, how); return true;
}
function occupyBuilding(b, how) {
  if (b.state === 'occupied') return;
  b.state = 'occupied'; b.hp = Math.max(b.hp, b.maxHp * 0.6); b.recap = 0; b.pulse = OCCUPY_PULSE * 0.6; b.target = null; b.paint = 0; b.shut = 0;
  const skins = OCC_SKINS[b.type]; b.skin = skins ? skins[(Math.random() * skins.length) | 0] : 'Occupied';
  G.stats.flips++; if (G.wave) G.wave.lost = true;
  G.momentum = clamp(G.momentum + 3, 0, 100);
  if (b.type === 'vault') { const loss = Math.floor(G.res.treasury * 0.4); G.res.treasury -= loss; msg('The Treasury Vault has been NATIONALIZED. ' + loss + ' gold redistributed.', 'bad'); }
  else msg(b.def.name + ' is OCCUPIED: it is now the ' + b.skin + (how === 'seizure' ? ' (nationalized by a Seizure Crew)' : '') + '. Send units to recapture it.', 'bad');
  fx('flip', b.x + b.w / 2, b.y + b.h / 2);
  Sound.sting();
  invalidateFields(); recountHouseholds(); slowTick(true);
}
function recaptureBuilding(b) {
  b.state = 'player'; b.hp = Math.max(b.hp, b.maxHp * 0.5); b.recover = RECOVER_TIME; b.recap = 0;
  G.stats.recaptured++; G.trust = clamp(G.trust + 2, 0, 100); G.momentum = clamp(G.momentum - 3, 0, 100);
  msg(b.def.name + ' recaptured. Title restored. Production resumes in ' + RECOVER_TIME + 's.', 'good');
  fx('recap', b.x + b.w / 2, b.y + b.h / 2);
  invalidateFields(); recountHouseholds(); slowTick(true);
}
function damageBuilding(b, amt, src, raw) {
  if (b.state !== 'player' || b.dead) return;
  let m = 1;
  if (!raw) { m = 1 + 0.35 * Math.min(b.occN, 3); if (b.inCourt) m = 1 + (m - 1) * 0.5; if (b.paint > 0) m *= 1.5; if (b.inCommittee) m *= 1.5; }
  b.hp -= amt * m;
  if (b.hp <= 0) {
    b.hp = 0;
    if (b.type === 'townhall') { removeBuilding(b); gameOver(false, 'Town Hall destroyed. The charter is void.'); return; }
    if (b.def.kind === 'defense' || b.def.kind === 'trap') {
      G.stats.lost++; if (G.wave) G.wave.lost = true;
      if (b.def.gate) { msg('GATE BREACHED!', 'bad'); Sound.gate(); R.shake = 0.5; }
      else if (b.def.range) msg(b.def.name + ' destroyed.', 'bad');
      fx('rubble', b.x + 0.5, b.y + 0.5);
      removeBuilding(b);
    } else tryFlip(b, 'hp');
  }
}
function damageEnemyBuilding(b, amt) {
  if (b.state !== 'enemy' || b.dead) return;
  b.hp -= amt;
  if (b.hp <= 0) {
    const loot = b.def.loot; for (const k in loot) G.res[k] += loot[k];
    G.raids++; G.momentum = clamp(G.momentum + 5, 0, 100);
    const bl = ENCAMP_DEF.backlash; const list = [];
    for (const t in bl) for (let i = 0; i < bl[t] + Math.floor(G.day / 4); i++) list.push(t);
    if (G.day >= 9) list.push('goon', 'goon', 'goon'); if (G.day >= 12) list.push('carebear');
    const cx = b.x + 1.5, cy = b.y + 1.5;
    removeBuilding(b); fx('boom', cx, cy);
    for (const t of list) { const p = freeTileNear({ x: cx | 0, y: cy | 0, w: 1, h: 1 }); const u = spawnUnit(t, p.x + (Math.random() - 0.5), p.y + (Math.random() - 0.5)); u.idle = false; u.wave = false; }
    msg('Encampment raided: +' + Object.entries(loot).map(([k, v]) => v + ' ' + k).join(', ') + '. Backlash: ' + list.length + ' angry campers. Momentum +5.', 'warn'); Sound.sting();
  }
}
function repairCost(b) {
  const cost = {}; const mul = (G.regulation ? 3 : 1) * (G.committee && !G.committee.dead ? 2 : 1);
  for (const k in b.def.cost) cost[k] = Math.ceil(b.def.cost[k] * 0.3 * (1 - b.hp / b.maxHp) * mul + 0.01);
  return cost;
}
function repairBuilding(b) {
  if (b.state !== 'player' || b.hp >= b.maxHp) return false;
  const cost = repairCost(b);
  for (const k in cost) if (G.res[k] < cost[k]) { msg('Repair needs ' + cost[k] + ' ' + k + (G.regulation ? ' (Liz Barren: triple cost)' : '') + '.', 'warn'); return false; }
  for (const k in cost) G.res[k] -= cost[k];
  b.hp = b.maxHp; invalidateFields(); return true;
}
function demolishBuilding(b) {
  if (b.type === 'townhall' || b.type === 'vault') return false;
  if (b.state === 'player') for (const k in b.def.cost) G.res[k] += Math.floor(b.def.cost[k] * 0.5);
  else if (b.state === 'occupied') msg('Scuttled an occupied ' + b.def.name + '. Dead mill beats a People\'s Foundry.', 'info');
  removeBuilding(b); return true;
}

// ---------- tech ----------
function canResearch(id) {
  const t = TECH[id]; if (!t) return { ok: false, why: 'unknown' };
  if (G.tech.done.has(id)) return { ok: false, why: 'Done' };
  if (G.tech.current) return { ok: false, why: 'Researching ' + TECH[G.tech.current].name };
  for (const r of t.requires) if (!G.tech.done.has(r)) return { ok: false, why: 'Needs ' + TECH[r].name };
  for (const k in t.cost) if (G.res[k] < t.cost[k]) return { ok: false, why: 'Not enough ' + k };
  return { ok: true };
}
function startResearch(id) {
  const c = canResearch(id); if (!c.ok) { msg(c.why + '.', 'warn'); return false; }
  const t = TECH[id]; for (const k in t.cost) G.res[k] -= t.cost[k];
  G.tech.current = id; G.tech.timer = t.time; G.tech.total = t.time;
  msg('Researching ' + t.name + ' (' + t.time + 's).', 'info'); return true;
}
function updateTech(dt) {
  if (!G.tech.current) return;
  G.tech.timer -= dt;
  if (G.tech.timer <= 0) {
    const t = TECH[G.tech.current]; G.tech.done.add(G.tech.current); G.tech.current = null;
    msg(t.name + ' complete: ' + t.unlocks.map(u => (BUILDINGS[u] || UNITS[u]).name).join(', ') + ' unlocked.', 'good'); Sound.chime();
    if (typeof UI !== 'undefined') UI.buildTray();
  }
}

// ---------- units ----------
function spawnUnit(type, x, y, opts) {
  const def = UNITS[type];
  const u = { id: G.nextId++, kind: 'u', type, def, side: def.side, x, y, hp: def.hp, maxHp: def.hp, state: 'idle',
    target: null, tgtKind: null, fieldKey: null, next: -1, cool: Math.random() * 0.5, stun: 0, idle: false, wave: false,
    buffed: false, tantrumDone: false, channel: 0, hair: NEON[(Math.random() * NEON.length) | 0], armor: def.armor || 0,
    jx: (Math.random() - 0.5) * 0.3, jy: (Math.random() - 0.5) * 0.3, wander: 0, shot: 0, retarget: 0, dead: false,
    deaf: 0, persistUsed: !def.persist, megaT: 3, paintT: 2, stolen: 0, shutT: 8, ltT: 0 };
  if (type === 'militia' && G.trust >= 70) { u.maxHp = Math.round(def.hp * 1.15); u.hp = u.maxHp; }
  Object.assign(u, opts || {});
  G.units.push(u); G.umap.set(u.id, u);
  return u;
}
function killUnit(u, silent) {
  if (u.dead) return; u.dead = true; G.umap.delete(u.id);
  if (u.side === 'enemy') {
    G.stats.killed++; if (!silent) fx('death', u.x, u.y, { color: u.hair, big: u.def.r > 0.35 });
    if (u.def.lt) { const gold = u.def.boss ? 300 : 150; G.stats.lts++; G.res.gold += gold; G.momentum = clamp(G.momentum - (u.def.boss ? 20 : 10), 0, 100); G.trust = clamp(G.trust + 5, 0, 100);
      msg(u.def.name + ' is DOWN. +' + gold + ' gold recovered, Momentum -' + (u.def.boss ? 20 : 10) + ', Trust +5.', 'good'); Sound.good(); G.lts = G.lts.filter(l => l !== u);
      if (u.def.regulation) { G.regulation = G.lts.some(l => l.def.regulation); }
      if (u.def.final) { G.committee = null; gameOver(true, 'The Committee is adjourned. Its dais is kindling. The fiscal year is survived.'); } }
    if (u.organized) { G.organized = Math.max(0, G.organized - 1); recountHouseholds(); }
    if (u.type === 'activist' && !u.revived && !silent) {
      const train = G.units.find(w => !w.dead && w.def.revive && Math.hypot(w.x - u.x, w.y - u.y) <= w.def.revive.radius);
      if (train) G.revive.push({ x: u.x, y: u.y, t: train.def.revive.delay });
    }
  } else { if (!silent) fx('death', u.x, u.y, { color: '#e8d9b0' }); }
  if (G.selected) G.selected = G.selected.filter(e => e !== u);
  if (u.side === 'player') recountHouseholds();
}
function damageUnit(u, amt) {
  if (u.dead) return;
  if (u.armor) amt = Math.max(1, amt - u.armor);
  u.hp -= amt; u.idle = false;
  if (u.hp <= 0) {
    if (!u.persistUsed) { u.persistUsed = true; u.hp = u.def.hp2; u.maxHp = u.def.hp2; fx('persist', u.x, u.y); Sound.pop(); msg('Nevertheless, she persisted. Second bar.', 'warn'); return; }
    killUnit(u);
  }
}
function unitTile(u) { return tileIndex(clamp(u.x | 0, 0, MAP_W - 1), clamp(u.y | 0, 0, MAP_H - 1)); }

function rebuildUnitGrid() {
  G.unitGrid.clear();
  for (const u of G.units) { if (u.dead) continue; const t = unitTile(u); let a = G.unitGrid.get(t); if (!a) { a = []; G.unitGrid.set(t, a); } a.push(u); }
}
function forUnitsNear(x, y, range, fn) {
  const r = Math.ceil(range);
  const x0 = clamp((x | 0) - r, 0, MAP_W - 1), x1 = clamp((x | 0) + r, 0, MAP_W - 1);
  const y0 = clamp((y | 0) - r, 0, MAP_H - 1), y1 = clamp((y | 0) + r, 0, MAP_H - 1);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const a = G.unitGrid.get(ty * MAP_W + tx); if (!a) continue;
    for (const u of a) { if (u.dead) continue; const d = Math.hypot(u.x - x, u.y - y); if (d <= range) fn(u, d); }
  }
}
function nearestUnit(x, y, range, side, filter) {
  let best = null, bd = range;
  forUnitsNear(x, y, range, (u, d) => { if (u.side !== side) return; if (filter && !filter(u)) return; if (d < bd) { bd = d; best = u; } });
  return best;
}
function nearestBuilding(x, y, pred) {
  let best = null, bd = Infinity;
  for (const b of G.buildings) { if (!pred(b)) continue; const d = rectDist(x, y, b); if (d < bd) { bd = d; best = b; } }
  return best;
}
function adjacentPlayerBuilding(u) {
  const tx = u.x | 0, ty = u.y | 0; let best = null, bd = 9;
  for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) {
    if (!inMap(x, y)) continue; const bid = G.grid[tileIndex(x, y)]; if (bid < 0) continue;
    const b = G.bmap.get(bid); if (!b || b.state !== 'player' || b.def.kind === 'trap') continue;
    let d = rectDist(u.x, u.y, b); if (b.paint > 0) d -= 0.5; if (d < bd) { bd = d; best = b; }
  }
  return best;
}
function adjacentClaimable(u) {
  const tx = u.x | 0, ty = u.y | 0;
  for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) {
    if (!inMap(x, y)) continue; const bid = G.grid[tileIndex(x, y)]; if (bid < 0) continue;
    const b = G.bmap.get(bid); if (b && (b.state === 'occupied' || b.state === 'crate')) return b;
  }
  return null;
}
function losBlocked(x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0); const n = Math.ceil(d * 2);
  for (let i = 1; i < n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; const bid = G.grid[tileIndex(clamp(x | 0, 0, MAP_W - 1), clamp(y | 0, 0, MAP_H - 1))]; if (bid >= 0) { const b = G.bmap.get(bid); if (b && b.def.kind === 'defense') return true; } }
  return false;
}

// Movement along a field. Returns the building blocking the next step (if any).
function followField(u, field, dt) {
  const costFn = costFor(u);
  if (u.next < 0 || G.fieldsDirty) {
    const tx = clamp(u.x | 0, 0, MAP_W - 1), ty = clamp(u.y | 0, 0, MAP_H - 1);
    const n = bestStep(field, tx, ty, costFn, solidTile, u.side === 'enemy' ? 0.8 : 0.3);
    if (n < 0) { u.next = -1; return null; }
    const bid = G.grid[n];
    if (bid >= 0) {
      const b = G.bmap.get(bid);
      let pass = false;
      if (b) {
        if (u.side === 'player') pass = b.def.gate && b.state === 'player';
        else pass = b.state === 'player' && (b.def.kind === 'trap' || (b.def.gate && G.gatesOpen > 0) || (u.def.jump && b.def.kind === 'defense' && !b.def.range));
      }
      if (!pass) { u.next = -1; return b; }
    }
    u.next = n;
  }
  const nx = (u.next % MAP_W) + 0.5 + u.jx, ny = ((u.next / MAP_W) | 0) + 0.5 + u.jy;
  const dx = nx - u.x, dy = ny - u.y, d = Math.hypot(dx, dy);
  let spd = u.def.speed * (u.buffed ? 1.35 : 1);
  if (u.side === 'enemy') { const bid = G.grid[unitTile(u)]; if (bid >= 0) { const b = G.bmap.get(bid); if (b && b.def.kind === 'trap') spd *= 0.5; } }
  const step = spd * dt;
  if (d <= step) { u.x = nx; u.y = ny; u.next = -1; } else { u.x += dx / d * step; u.y += dy / d * step; }
  return null;
}

// ---------- enemy AI ----------
function enemyPickTarget(u) {
  if (u.def.seizure) { const shut = G.buildings.find(b => b.state === 'player' && b.shut > 0); if (shut) { u.target = shut.id; u.fieldKey = 'e:b' + shut.id; return; } }
  const prefer = (u.tantrumDone && u.def.preferAfter) ? u.def.preferAfter : u.def.prefer;
  if (prefer) {
    const b = nearestBuilding(u.x, u.y, b => b.state === 'player' && prefer.includes(b.type) && !(u.def.paints && b.paint > 0));
    if (b) { u.target = b.id; u.fieldKey = 'e:b' + b.id; return; }
  }
  if (G.hall && !G.hall.dead) { u.target = G.hall.id; u.fieldKey = 'e:th'; return; }
  u.target = null; u.fieldKey = null;
}
function enemyField(u) {
  const b = G.bmap.get(u.target); if (!b) return null;
  return getField((u.def.jump ? 'g' : '') + u.fieldKey, footprintTiles(b), costFor(u));
}
function attackBuilding(u, b) {
  if (u.cool > 0) return;
  u.cool = 1 / u.def.rate; u.shot = 0.15;
  let dmg = (u.def.bdmg !== undefined ? u.def.bdmg : u.def.dmg) * (u.buffed ? 1.25 : 1);
  if (u.tantrumDone) dmg *= 3;
  if (dmg > 0) damageBuilding(b, dmg, u);
}
function updateEnemy(u, dt) {
  if (u.stun > 0) { u.stun -= dt; return; }
  u.cool -= dt;
  if (u.def.tantrum && !u.tantrumDone && u.hp <= u.maxHp * 0.5) {
    u.tantrumDone = true; u.stun = 1.5; u.retarget = 0;
    forUnitsNear(u.x, u.y, 2.6, p => { if (p.side === 'player') p.stun = Math.max(p.stun, 2); });
    fx('tantrum', u.x, u.y); msg('A Man-Child is throwing a TANTRUM. Nearby units are stunned.', 'warn');
    return;
  }
  if (u.idle) {
    u.wander -= dt;
    if (u.hx === undefined) { u.hx = u.x; u.hy = u.y; }
    if (u.wander <= 0) { u.wander = 2 + Math.random() * 4; u.wx = u.hx + (Math.random() - 0.5) * 5; u.wy = u.hy + (Math.random() - 0.5) * 5; }
    if (u.wx !== undefined) { const dx = u.wx - u.x, dy = u.wy - u.y, d = Math.hypot(dx, dy);
      if (d > 0.1) { const nx = u.x + dx / d * dt * 0.4, ny = u.y + dy / d * dt * 0.4; const t = tileIndex(clamp(nx | 0, 0, MAP_W - 1), clamp(ny | 0, 0, MAP_H - 1)); if (!solidTile(t)) { u.x = nx; u.y = ny; } else u.wander = 0; } }
    if (u.retarget <= 0) {
      u.retarget = 0.5;
      const p = nearestUnit(u.x, u.y, u.def.aggro, 'player', p => !(p.def.quiet && Math.hypot(p.x - u.x, p.y - u.y) > 3.2));
      const bnear = nearestBuilding(u.x, u.y, b => b.state === 'player' && rectDist(u.x, u.y, b) <= u.def.aggro + 1);
      if (p || bnear) u.idle = false;
    } else u.retarget -= dt;
    return;
  }
  // specials with their own tick
  if (u.def.megaphone) { u.megaT -= dt; if (u.megaT <= 0) { u.megaT = u.def.megaphone.every; let hit = 0;
      forUnitsNear(u.x, u.y, u.def.megaphone.radius, p => { if (p.side === 'player') { p.deaf = Math.max(p.deaf, u.def.megaphone.dur * (nearCourt(p.x, p.y) ? 0.5 : 1)); hit++; } });
      for (const b of G.buildings) if (b.def.range && b.state === 'player' && rectDist(u.x, u.y, b) <= u.def.megaphone.radius) { b.deaf = Math.max(b.deaf, u.def.megaphone.dur * (b.inCourt ? 0.5 : 1)); hit++; }
      if (hit) fx('megaphone', u.x, u.y); } }
  if (u.def.heals) { forUnitsNear(u.x, u.y, u.def.heals.radius, p => { if (p.side === 'enemy' && p !== u && u.def.heals.types.includes(p.type) && p.hp < p.maxHp) { p.hp = Math.min(p.maxHp, p.hp + u.def.heals.rate * dt); p.healed = 0.3; } }); }
  if (u.def.paints) { u.paintT -= dt; if (u.paintT <= 0) { u.paintT = 4; const b = nearestBuilding(u.x, u.y, b => b.state === 'player' && b.paint <= 0 && b.def.kind !== 'trap' && rectDist(u.x, u.y, b) <= 3.5);
      if (b) { b.paint = PAINT_TIME; fx('paint', b.x + b.w / 2, b.y + b.h / 2); if (Math.random() < 0.3) msg('Agitprop Van painted your ' + b.def.name + '. Painted tiles flip faster and pull the Wave.', 'warn'); } } }
  if (u.def.lt) updateLieutenant(u, dt);
  if (u.hold) return; // debug/test: stand still but keep ticking specials
  // retarget periodically
  u.retarget -= dt;
  if (u.retarget <= 0 || !u.target || !G.bmap.get(u.target) || G.bmap.get(u.target).state !== 'player') { u.retarget = 3 + Math.random(); enemyPickTarget(u); u.next = -1; }
  // Care Bear: shadow a patient
  if (u.def.heals) {
    const pat = nearestUnit(u.x, u.y, 14, 'enemy', p => p !== u && u.def.heals.types.includes(p.type) && !p.idle);
    if (pat) { if (Math.hypot(pat.x - u.x, pat.y - u.y) > 1.8) { const tt = unitTile(pat); const key = 'e:t' + tt; if (u.fieldKey !== key) { u.fieldKey = key; u.next = -1; } followField(u, getField(key, [tt], enemyCost), dt); } return; }
  }
  const target = G.bmap.get(u.target);
  if (u.def.seizure && target && rectDist(u.x, u.y, target) <= 1.25 && target.state === 'player') {
    u.channel += dt * (G.seizureBoost > 0 ? 2 : 1) / (target.inCourt ? 1.5 : 1);
    if (u.channel >= u.def.channel) { u.channel = 0; tryFlip(target, 'seizure'); u.retarget = 0; }
    return;
  } else if (u.def.seizure) u.channel = Math.max(0, u.channel - dt * 2);
  if (!u.def.seizure && !u.def.paints) {
    const p = nearestUnit(u.x, u.y, u.def.range, 'player');
    if (p) { if (u.cool <= 0) { u.cool = 1 / u.def.rate; if (p.def.civilian) organize(p, u); else damageUnit(p, u.def.dmg * (u.buffed ? 1.25 : 1)); u.shot = 0.15; } return; }
    const ab = adjacentPlayerBuilding(u);
    if (ab && rectDist(u.x, u.y, ab) <= u.def.range && !(u.def.jump && ab.def.kind === 'defense' && !ab.def.range)) { attackBuilding(u, ab); return; }
  }
  if (u.def.paints && target && rectDist(u.x, u.y, target) <= 3) { u.next = -1; if (target.paint > 0) u.retarget = 0; return; }
  const field = enemyField(u);
  if (!field) return;
  const block = followField(u, field, dt);
  if (block && !u.def.paints && rectDist(u.x, u.y, block) <= u.def.range + 0.4) attackBuilding(u, block);
}
function nearCourt(x, y) { return G.buildings.some(c => c.type === 'courthouse' && c.state === 'player' && c.recover <= 0 && Math.hypot(c.x + 1 - x, c.y + 1 - y) <= c.def.aura); }

function updateLieutenant(u, dt) {
  if (u.def.drain) {
    const near = G.buildings.some(b => b.state === 'player' && rectDist(u.x, u.y, b) <= u.def.drain.radius);
    if (near && G.res.treasury > 0) {
      const amt = Math.min(G.res.treasury, u.def.drain.rate * dt); G.res.treasury -= amt; u.stolen += amt; u.draining = true;
      Sound.vacuum(true);
      if (u.stolen >= u.def.drain.crate) { u.stolen -= u.def.drain.crate; const p = freeTileNear({ x: u.x | 0, y: u.y | 0, w: 1, h: 1 });
        const c = placeBuilding('crate', p.x | 0, p.y | 0, true); if (c) { c.state = 'crate'; c.gold = u.def.drain.crate; fx('crate', p.x, p.y); msg('Sernie dumped ' + u.def.drain.crate + ' gold as a crate. It blocks the street until retrieved.', 'warn'); } }
    } else { u.draining = false; }
  }
  if (u.def.freeze) {
    u.ltT += dt; const f = u.def.freeze;
    if (u.ltT >= f.every - f.warn && !u.warned) { u.warned = true; G.freeze.warn = f.warn; msg('LISTENING SESSION in ' + f.warn + 's: your voice matters (please wait). Build tray and commands will freeze.', 'warn'); Sound.sting(); }
    if (u.ltT >= f.every) { u.ltT = 0; u.warned = false;
      let dur = f.dur; if (G.buildings.some(b => b.type === 'courthouse' && b.state === 'player')) dur -= 2; if (G.buildings.some(b => b.type === 'printshop' && b.state === 'player')) dur -= 2;
      G.freeze.t = Math.max(3, dur); G.freeze.warn = 0; msg('LISTENING SESSION: build tray and rally frozen for ' + G.freeze.t + 's.', 'bad'); fx('megaphone', u.x, u.y); }
  }
  if (u.def.final) {
    if (!u.quarters) u.quarters = 3;
    while (u.quarters > 0 && u.hp <= u.maxHp * 0.25 * u.quarters) { u.quarters--; tableResolution(u); }
    if (G.hall && !G.hall.dead && rectDist(u.x, u.y, G.hall) <= 1.6) { gameOver(false, 'The Committee touched the Town Hall. The charter is superseded.'); return; }
  }
  if (u.def.shut) {
    u.shutT -= dt;
    if (u.shutT <= 0) { u.shutT = u.def.shut.every; const b = nearestBuilding(u.x, u.y, b => b.state === 'player' && isIndustry(b) && b.shut <= 0);
      if (b) { b.shut = u.def.shut.dur; fx('shut', b.x + b.w / 2, b.y + b.h / 2); msg('Occasion-Cortex shut your ' + b.def.name + ' "for the planet" (' + u.def.shut.dur + 's). Seizure Crews are rushing it.', 'bad');
        for (const s of G.units) if (!s.dead && s.def.seizure) { s.retarget = 0; s.idle = false; } } }
  }
}

function tableResolution(u) {
  const opts = ['gates', 'farm', 'seizure', 'lieutenant'];
  const pick = opts[(Math.random() * opts.length) | 0];
  fx('lt', u.x, u.y); Sound.horn();
  if (pick === 'gates') { G.gatesOpen = 15; invalidateFields(); msg('RESOLUTION 1: "Open Borders" — every gate freezes OPEN for 15s.', 'bad'); }
  else if (pick === 'farm') {
    const farm = G.buildings.find(b => b.type === 'farm' && b.state === 'player' && !G.units.some(p => !p.dead && p.side === 'player' && rectDist(p.x, p.y, b) <= 4));
    if (farm) { msg('RESOLUTION 2: "Land Back" — an unattended farm is collectivized.', 'bad'); occupyBuilding(farm, 'resolution'); }
    else msg('RESOLUTION 2: "Land Back" — no unattended farm found. The motion fails.', 'warn');
  }
  else if (pick === 'seizure') { G.seizureBoost = 30; msg('RESOLUTION 3: "Expedited Redistribution" — Seizure channels run at double speed for 30s.', 'bad'); }
  else { const lts = ['sernie', 'liz', 'alex']; spawnLieutenant(lts[(Math.random() * 3) | 0], G.wave ? G.wave.side : 'north'); msg('RESOLUTION 4: "Recognize the Comrade" — a leftover lieutenant is summoned.', 'bad'); }
}
function frozen() { if (G.freeze.t > 0) { msg('Listening Session in progress: please wait ' + Math.ceil(G.freeze.t) + 's.', 'warn'); return true; } return false; }
function wakeNear(x, y, r) { if (!r) return; forUnitsNear(x, y, r, e => { if (e.side === 'enemy' && e.idle) e.idle = false; }); }

// ---------- player AI ----------
function fireAt(u, e) {
  u.cool = (1 / u.def.rate) * (u.deaf > 0 ? 2 : 1); u.shot = 0.12; u.shotX = e.x; u.shotY = e.y; wakeNear(u.x, u.y, NOISE[u.type]); Sound.shot();
  if (u.def.splash) {
    const hits = []; forUnitsNear(e.x, e.y, u.def.splash, p => { if (p.side === 'enemy') hits.push(p); });
    for (const p of hits) damageUnit(p, u.def.dmg);
    let own = 0; for (const b of G.buildings) if (b.state === 'player' && rectDist(e.x, e.y, b) <= u.def.splash) { damageBuilding(b, u.def.dmg * 0.3, u, true); own++; }
    if (own) G.trust = clamp(G.trust - 0.5 * own, 0, 100);
    fx('boom', e.x, e.y); Sound.boom(); R.shake = Math.max(R.shake || 0, 0.2); return;
  }
  if (u.def.scatter) {
    const hits = []; forUnitsNear(u.x, u.y, u.def.range, (p, d) => { if (p.side === 'enemy' && !losBlocked(u.x, u.y, p.x, p.y)) hits.push([d, p]); });
    hits.sort((a, b) => a[0] - b[0]); for (const [, p] of hits.slice(0, u.def.scatter)) damageUnit(p, u.def.dmg);
    fx('scatter', u.x, u.y, { tx: e.x, ty: e.y }); return;
  }
  damageUnit(e, u.def.dmg);
}
function pickPlayerTarget(u) {
  const inRange = p => { const d = Math.hypot(p.x - u.x, p.y - u.y); return d <= u.def.range && (!u.def.minRange || d >= u.def.minRange) && (!u.def.scatter || !losBlocked(u.x, u.y, p.x, p.y)); };
  if (u.state === 'attack') { const t = G.umap.get(u.target); if (t && !t.dead && inRange(t)) return t; }
  if (u.def.special) { const s = nearestUnit(u.x, u.y, u.def.range, 'enemy', p => p.type !== 'activist' && p.type !== 'organizer' && inRange(p)); if (s) return s; }
  return nearestUnit(u.x, u.y, u.def.range, 'enemy', inRange);
}
function organize(p, by) {
  if (p.dead) return;
  const x = p.x, y = p.y; const home = G.bmap.get(p.home); if (home) home.hsT = 60; killUnit(p, true);
  const a = spawnUnit('activist', x, y); a.idle = false; a.wave = false; a.organized = true; a.hair = '#ff5fd0';
  G.organized++; recountHouseholds(); fx('flip', x, y);
  if (G.time - G.orgMsgT > 6) { G.orgMsgT = G.time; msg('A Homesteader got ORGANIZED. Households -1 until that Activist is put down.', 'bad'); }
}
function spawnHomesteaders() {
  if (G.loading) return;
  const cottages = G.buildings.filter(b => b.type === 'cottage' && b.state === 'player' && b.recover <= 0 && !(b.hsT > 0));
  const have = new Set(G.units.filter(u => !u.dead && u.type === 'homesteader').map(u => u.home));
  for (const c of cottages) if (!have.has(c.id)) { const p = freeTileNear(c); const h = spawnUnit('homesteader', p.x, p.y); h.home = c.id; h.pause = 1 + Math.random() * 3; h.state = 'civ'; }
}
function updateCivilian(u, dt) {
  const home = G.bmap.get(u.home);
  if (!home || home.state !== 'player') { if (!u.homeless) { u.homeless = 8; } u.homeless -= dt; if (u.homeless <= 0) { killUnit(u, true); return; } }
  const threat = nearestUnit(u.x, u.y, 3.5, 'enemy', e => !e.idle && !e.def.seizure && !e.def.paints);
  if (threat) { u.flee = 6; u.civTarget = null; }
  if (u.flee > 0) {
    u.flee -= dt;
    if (G.hall && !G.hall.dead) { const key = 'p:b' + G.hall.id; if (u.fieldKey !== key) { u.fieldKey = key; u.goals = footprintTiles(G.hall); u.next = -1; } const f = getField(key, u.goals, playerCost); if (f[unitTile(u)] > 1.5) followField(u, f, dt); }
    return;
  }
  u.pause -= dt; if (u.pause > 0) return;
  if (!u.civTarget || !G.bmap.get(u.civTarget)) {
    const pool = G.buildings.filter(b => b.state === 'player' && (b.def.kind === 'industry' || b.def.kind === 'economy' || b.def.kind === 'civic') && b.def.w >= 2 && b.id !== u.home);
    const dest = (u.atWork && home) ? home : (pool.length ? pool[(Math.random() * pool.length) | 0] : home);
    if (!dest) return; u.civTarget = dest.id; u.atWork = dest !== home; u.fieldKey = 'p:b' + dest.id; u.goals = footprintTiles(dest); u.next = -1;
  }
  const f = getField(u.fieldKey, u.goals, playerCost);
  if (f[unitTile(u)] <= 1.5 || f[unitTile(u)] === Infinity) { u.civTarget = null; u.pause = 3 + Math.random() * 6; u.next = -1; return; }
  followField(u, f, dt);
}
function updatePlayerUnit(u, dt) {
  if (u.def.civilian) { updateCivilian(u, dt); return; }
  if (u.deaf > 0) u.deaf -= dt;
  if (u.stun > 0) { u.stun -= dt; return; }
  u.cool -= dt;
  if (u.cool <= 0 && u.def.range > 0) { const e = pickPlayerTarget(u); if (e) fireAt(u, e); }
  if (u.state === 'idle') {
    const ob = adjacentClaimable(u);
    if (ob) { u.state = 'recapture'; u.target = ob.id; u.next = -1; }
    return;
  }
  if (u.state === 'move') {
    const field = getField(u.fieldKey, u.goals, playerCost);
    const fv = field[unitTile(u)];
    if (fv === 0 || fv === Infinity) { u.state = 'idle'; u.next = -1; return; }
    if (fv <= 1.5 && u.next < 0) {
      const g = u.goals[0]; const gx = g % MAP_W, gy = (g / MAP_W) | 0;
      const taken = G.grid[g] >= 0 || G.units.some(o => o !== u && !o.dead && o.side === 'player' && (o.x | 0) === gx && (o.y | 0) === gy);
      if (taken) { u.state = 'idle'; u.next = -1; return; }
    }
    const block = followField(u, field, dt);
    if (block) { u.state = 'idle'; u.next = -1; }
    return;
  }
  if (u.state === 'attack') {
    const t = G.umap.get(u.target);
    if (!t || t.dead) { u.state = 'idle'; u.next = -1; return; }
    if (Math.hypot(t.x - u.x, t.y - u.y) <= u.def.range) { u.next = -1; return; }
    const tt = unitTile(t);
    if (u.fieldKey !== 'p:t' + tt) { u.fieldKey = 'p:t' + tt; u.goals = [tt]; u.next = -1; }
    followField(u, getField(u.fieldKey, u.goals, playerCost), dt);
    return;
  }
  if (u.state === 'attackb') {
    const b = G.bmap.get(u.target);
    if (!b || b.dead || b.state !== 'enemy') { u.state = 'idle'; u.next = -1; return; }
    if (rectDist(u.x, u.y, b) <= Math.max(1.2, u.def.range)) { u.next = -1; if (u.cool <= 0) { u.cool = 1 / u.def.rate; u.shot = 0.12; u.shotX = b.x + 1.5; u.shotY = b.y + 1.5; damageEnemyBuilding(b, u.def.dmg); wakeNear(u.x, u.y, NOISE[u.type]); } return; }
    const key = 'p:b' + b.id;
    if (u.fieldKey !== key) { u.fieldKey = key; u.goals = footprintTiles(b); u.next = -1; }
    followField(u, getField(key, u.goals, playerCost), dt);
    return;
  }
  if (u.state === 'recapture') {
    const b = G.bmap.get(u.target);
    if (!b || (b.state !== 'occupied' && b.state !== 'crate')) { u.state = 'idle'; u.next = -1; return; }
    if (rectDist(u.x, u.y, b) <= 1.25) { u.next = -1; b.recap += dt * (b.inChapel ? 2 : 1) * (b.inDeed ? 1.5 : 1); b.recapActive = true; return; }
    const key = 'p:b' + b.id;
    if (u.fieldKey !== key) { u.fieldKey = key; u.goals = footprintTiles(b); u.next = -1; }
    followField(u, getField(key, u.goals, playerCost), dt);
    return;
  }
}

// ---------- commands ----------
function cmdMove(units, tx, ty) {
  if (frozen()) return;
  const t = tileIndex(tx, ty);
  if (playerCost(t) === Infinity) return;
  for (const u of units) { u.state = 'move'; u.fieldKey = 'p:t' + t; u.goals = [t]; u.next = -1; }
}
function cmdAttack(units, e) { if (frozen()) return; for (const u of units) { u.state = 'attack'; u.target = e.id; u.next = -1; u.fieldKey = null; } }
function cmdRecapture(units, b) { if (frozen()) return; for (const u of units) { u.state = 'recapture'; u.target = b.id; u.next = -1; u.fieldKey = null; } }
function cmdAttackBuilding(units, b) { if (frozen()) return; for (const u of units) { u.state = 'attackb'; u.target = b.id; u.next = -1; u.fieldKey = null; } }
function cmdMoveToBuilding(units, b) {
  if (frozen()) return;
  const key = 'p:b' + b.id; for (const u of units) { u.state = 'move'; u.fieldKey = key; u.goals = footprintTiles(b); u.next = -1; }
}
function musterDelay() { let d = 1 + (100 - G.trust) / 20; if (G.buildings.some(b => b.type === 'militiahall' && b.state === 'player' && b.inLodge)) d *= 0.5; return d; }
function musterMilitia(n) {
  if (frozen()) return;
  const halls = G.buildings.filter(b => b.type === 'militiahall' && b.state === 'player' && b.recover <= 0);
  if (!halls.length) { msg('Build a Militia Hall to muster militia.', 'warn'); return; }
  const alive = G.units.filter(u => !u.dead && u.type === 'militia').length + G.muster.queue;
  const cap = halls.length * UNITS.militia.capPerHall;
  let added = 0;
  for (let i = 0; i < n; i++) {
    if (alive + added >= cap) { msg('Militia cap reached (' + cap + '). Build another hall.', 'warn'); break; }
    if (G.res.gold < UNITS.militia.cost.gold) { msg('Not enough gold to muster.', 'warn'); break; }
    if (G.hh.used + 1 > G.hh.cap) { msg('No free households to muster from.', 'warn'); break; }
    G.res.gold -= UNITS.militia.cost.gold; G.muster.queue++; added++; recountHouseholds();
  }
  if (added && G.muster.timer <= 0) G.muster.timer = musterDelay();
}
function dismissMilitia(list) {
  let n = 0; for (const u of list) if (!u.dead && u.type === 'militia') { killUnit(u, true); n++; }
  if (n) msg('Dismissed ' + n + ' militia. They go home; the upkeep stops.', 'info');
}
function canTrain(type) {
  const d = UNITS[type]; if (!d || d.side !== 'player' || !d.train) return { ok: false, why: 'unknown' };
  if (!techDone(d.tech)) return { ok: false, why: 'Requires ' + TECH[d.tech].name };
  if (!G.buildings.some(b => b.type === d.from && b.state === 'player')) return { ok: false, why: 'Needs a ' + BUILDINGS[d.from].name };
  const alive = G.units.filter(u => !u.dead && u.type === type).length + G.trainQ.filter(q => q.type === type).length;
  if (alive >= d.cap) return { ok: false, why: d.name + ' cap reached (' + d.cap + ')' };
  for (const k in d.cost) if (G.res[k] < d.cost[k]) return { ok: false, why: 'Not enough ' + k };
  if (G.hh.used + (d.workers || 0) > G.hh.cap) return { ok: false, why: 'No free households' };
  return { ok: true };
}
function trainUnit(type) {
  if (frozen()) return false;
  const c = canTrain(type); if (!c.ok) { msg(c.why + '.', 'warn'); return false; }
  const d = UNITS[type]; for (const k in d.cost) G.res[k] -= d.cost[k];
  G.trainQ.push({ type, timer: d.train }); recountHouseholds(); return true;
}
function trainMinuteman() { trainUnit('minuteman'); }
function warLevy() {
  if (G.levyDay === G.day) { msg('War levy already used today.', 'warn'); return; }
  G.levyDay = G.day; G.res.gold += 200; G.trust = clamp(G.trust - 15, 0, 100); G.momentum = clamp(G.momentum + 12, 0, 100);
  msg('WAR LEVY: +200 gold. Trust -15, Momentum +12. Use only when the town is on fire.', 'warn');
}
function freeTileNear(b) {
  for (let r = 1; r < 5; r++) for (let ty = b.y - r; ty <= b.y + b.h - 1 + r; ty++) for (let tx = b.x - r; tx <= b.x + b.w - 1 + r; tx++) {
    if (!inMap(tx, ty)) continue; const t = tileIndex(tx, ty); if (!solidTile(t)) return { x: tx + 0.5, y: ty + 0.5 };
  }
  return { x: b.x + b.w / 2, y: b.y + b.h + 1 };
}

// ---------- economy ----------
function updateEconomy(dt) {
  const k = dt / DAY_LENGTH;
  const goldMul = G.foodShort ? 0.5 : 1;
  for (const b of G.buildings) {
    if (b.state === 'occupied') { G.res.treasury -= (b.type === 'vault' ? 40 : 4) * k; continue; }
    if (b.recover > 0 || b.shut > 0 || b.state !== 'player') continue;
    const inc = b.def.income; if (!inc) continue;
    const wm = b.inWarehouse && (b.def.kind === 'economy' || b.def.kind === 'industry') ? 1.2 : 1;
    for (const r in inc) {
      let v = inc[r];
      if (r === 'wood' && b.type === 'mill') v += b.treeAdj * b.def.treeBonus;
      if (v > 0) v *= wm; if (r === 'gold' && v > 0) v *= goldMul;
      if (G.gosplan && v > 0 && r !== 'treasury') { const cut = v * G.gosplan.def.siphon.share; v -= cut; G.publicFund += cut * k * (r === 'gold' ? 1 : 0.5); }
      G.res[r] += v * k;
    }
  }
  let up = 0; for (const u of G.units) if (!u.dead && u.type === 'militia') up += UNITS.militia.upkeep;
  G.res.gold -= up * dt;
  if (G.res.gold < 0) G.res.gold = 0;
  G.foodShort = G.res.food <= 0; if (G.res.food < 0) G.res.food = 0;
  for (const r of ['wood', 'stone', 'iron']) if (G.res[r] < 0) G.res[r] = 0;
  if (G.res.treasury <= 0) { G.res.treasury = 0; G.treasuryZero += dt; if (G.treasuryZero >= TREASURY_GRACE) gameOver(false, 'The Treasury sat empty too long. The institutions shuttered.'); }
  else G.treasuryZero = 0;
  if (G.muster.queue > 0) { G.muster.timer -= dt; if (G.muster.timer <= 0) {
    const hall = G.buildings.find(b => b.type === 'militiahall' && b.state === 'player');
    if (hall) { const p = freeTileNear(hall); spawnUnit('militia', p.x, p.y); }
    G.muster.queue--; recountHouseholds(); if (G.muster.queue > 0) G.muster.timer = Math.max(0.4, musterDelay() * 0.4); } }
  if (G.trainQ.length) { const q = G.trainQ[0]; q.timer -= dt; if (q.timer <= 0) { G.trainQ.shift(); const d = UNITS[q.type]; const src = G.buildings.find(b => b.type === d.from && b.state === 'player') || G.hall; const p = freeTileNear(src); spawnUnit(q.type, p.x, p.y); recountHouseholds(); msg(d.name + ' ready.', 'info'); } }
  if (G.gosplan && G.publicFund >= G.gosplan.def.siphon.cap) {
    G.publicFund -= G.gosplan.def.siphon.cap; const g = G.gosplan; const t = spawnUnit('tankie', g.x + 0.8, g.y + 0.5); t.idle = false; t.wave = true;
    msg('The Public Fund is full. A Tankie steps out of the Gosplan stacks.', 'bad'); fx('lt', g.x, g.y);
  }
  updateTech(dt);
}

function slowTick(force) {
  const occ = G.buildings.filter(b => b.state === 'occupied');
  const auras = t => G.buildings.filter(b => b.type === t && b.state === 'player' && b.recover <= 0);
  const courts = auras('courthouse'), chapels = auras('chapel'), deeds = auras('deedoffice'), wares = auras('warehouse'), lodges = auras('lodge');
  const within = (list, cx, cy) => list.some(c => Math.hypot(c.x + 1 - cx, c.y + 1 - cy) <= c.def.aura);
  for (const b of G.buildings) {
    let n = 0; for (const o of occ) if (o !== b && rectGap(o, b) <= 2) n++; b.occN = n;
    const [cx, cy] = bCenter(b);
    b.inCourt = within(courts, cx, cy); b.inChapel = within(chapels, cx, cy); b.inDeed = within(deeds, cx, cy);
    b.inWarehouse = within(wares, cx, cy); b.inLodge = within(lodges, cx, cy);
  }
  spawnHomesteaders();
  G.regulation = G.units.some(u => !u.dead && u.def.regulation);
  G.gosplan = G.units.find(u => !u.dead && u.def.siphon) || null;
  G.committee = G.units.find(u => !u.dead && u.def.final) || null;
  for (const b of G.buildings) b.inCommittee = !!(G.committee && Math.hypot(G.committee.x - b.x - b.w / 2, G.committee.y - b.y - b.h / 2) <= G.committee.def.aura);
}

function updateBuildings(dt) {
  for (const b of G.buildings) {
    if (b.dead) continue;
    if (b.recover > 0) b.recover -= dt;
    if (b.hsT > 0) b.hsT -= dt;
    if (b.shut > 0) b.shut -= dt;
    if (b.deaf > 0) b.deaf -= dt;
    if (b.paint > 0) b.paint -= dt;
    if (b.state === 'occupied') {
      b.pulse -= dt;
      if (b.pulse <= 0) { b.pulse = OCCUPY_PULSE; if (G.units.length < 900) { const p = freeTileNear(b); const u = spawnUnit('activist', p.x, p.y); u.wave = false; u.idle = false; fx('spawn', p.x, p.y); } }
      if (!b.recapActive) b.recap = Math.max(0, b.recap - dt * 0.5);
      b.recapActive = false;
      if (b.recap >= RECAPTURE_TIME) recaptureBuilding(b);
      continue;
    }
    if (b.state === 'enemy') {
      b.pulse -= dt;
      if (b.pulse <= 0) { b.pulse = b.def.pulse; const idleAll = G.units.filter(u => !u.dead && u.idle).length; const idleNear = G.units.filter(u => !u.dead && u.idle && Math.hypot(u.x - b.x - 1.5, u.y - b.y - 1.5) < 7).length; if (idleNear < 6 && idleAll < 60) { const p = freeTileNear(b); const u = spawnUnit('activist', p.x, p.y); u.idle = true; u.wave = false; } }
      continue;
    }
    if (b.state === 'crate') {
      if (!b.recapActive) b.recap = Math.max(0, b.recap - dt); b.recapActive = false;
      if (b.recap >= CRATE_TIME) { G.res.gold += b.gold; msg('Crate retrieved: +' + b.gold + ' gold.', 'good'); fx('recap', b.x + 0.5, b.y + 0.5); removeBuilding(b); }
      continue;
    }
    if (b.def.range && b.recover <= 0) {
      b.cool -= dt;
      if (b.cool <= 0) {
        const cx = b.x + 0.5, cy = b.y + 0.5;
        const e = nearestUnit(cx, cy, b.def.range, 'enemy');
        if (e) { b.cool = (1 / b.def.rate) * (b.deaf > 0 ? 2 : 1); damageUnit(e, b.def.dmg); b.shot = 0.12; b.shotX = e.x; b.shotY = e.y; e.idle = false; wakeNear(cx, cy, NOISE[b.type]); Sound.shot(); }
      }
    }
    if (b.def.kind === 'trap') {
      const a = G.unitGrid.get(tileIndex(b.x, b.y));
      if (a) for (const u of a) if (!u.dead && u.side === 'enemy') { damageUnit(u, b.def.trapDmg * dt); b.hp -= 2 * dt; u.idle = false; }
      if (b.hp <= 0) { fx('rubble', b.x + 0.5, b.y + 0.5); removeBuilding(b); }
    }
    if (b.type === 'printshop' && b.recover <= 0) {
      b.scrub = (b.scrub || 0) - dt;
      if (b.scrub <= 0) { b.scrub = 8; let n = 0; for (const o of G.buildings) if (o.paint > 0 && Math.hypot(b.x + 1 - o.x - o.w / 2, b.y + 1 - o.y - o.h / 2) <= b.def.aura) { o.paint = 0; n++; } if (n) fx('scrub', b.x + 1, b.y + 1); }
    }
  }
}

// ---------- waves / days ----------
function spawnWave(day) {
  const table = WAVES[day]; if (!table) return;
  const scale = (1 + G.momentum / 150) * DIFFICULTY[G.difficulty].waves;
  const list = [];
  for (const t in table) {
    if (t === 'lt' || t === 'boss') continue;
    let n = Math.round(table[t] * scale);
    if (t === 'manchild' && G.momentum >= 50) n++; if (t === 'seizure' && G.momentum >= 75) n++;
    const pack = UNITS[t].pack || 1;
    for (let i = 0; i < n; i += pack) list.push({ type: t, n: Math.min(pack, n - i) });
  }
  for (let i = list.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const tmp = list[i]; list[i] = list[j]; list[j] = tmp; }
  const sides = ['north', 'east', 'south', 'west'];
  const side = sides[(Math.random() * 4) | 0];
  G.waveDir = side;
  const total = list.reduce((a, e) => a + e.n, 0);
  let lt = table.lt || null; if (lt === 'random') lt = ['sernie', 'liz', 'alex'][(Math.random() * 3) | 0];
  G.wave = { day, list, spawned: 0, timer: 0, lost: false, total, alive: 0, side, lt, boss: table.boss || null, ltSpawned: false };
  G.stats.waves++;
  const led = [table.boss, lt].filter(Boolean).map(k => UNITS[k].name);
  msg('DAY ' + day + ' — ' + chapterName(day).toUpperCase() + ': a Wave of ' + total + ' is coming from the ' + side.toUpperCase() + (led.length ? ', led by ' + led.join(' and ') + '.' : '.'), 'bad');
  Sound.horn();
}
function waveSpawnPoint(side) {
  for (let tries = 0; tries < 60; tries++) {
    let x, y; const off = 12 + Math.floor(Math.random() * 32);
    if (side === 'north') { x = off; y = Math.floor(Math.random() * 3); }
    else if (side === 'south') { x = off; y = MAP_H - 1 - Math.floor(Math.random() * 3); }
    else if (side === 'west') { y = off; x = Math.floor(Math.random() * 3); }
    else { y = off; x = MAP_W - 1 - Math.floor(Math.random() * 3); }
    if (!solidTile(tileIndex(x, y))) return { x: x + 0.5, y: y + 0.5 };
  }
  return { x: side === 'east' ? MAP_W - 1.5 : side === 'west' ? 1.5 : 27.5, y: side === 'south' ? MAP_H - 1.5 : side === 'north' ? 1.5 : 27.5 };
}
function spawnLieutenant(type, side) {
  const p = waveSpawnPoint(side); const u = spawnUnit(type, p.x, p.y); u.wave = true; u.idle = false; G.lts.push(u);
  if (u.def.regulation) G.regulation = true;
  if (u.def.shut) for (let i = 0; i < 2; i++) { const s = spawnUnit('seizure', p.x + (Math.random() - 0.5), p.y + (Math.random() - 0.5)); s.wave = true; s.idle = false; }
  msg(u.def.name + ', ' + u.def.title + ', has entered the map. ' + u.def.desc, 'bad'); Sound.drum(); fx('lt', p.x, p.y); R.shake = 0.6;
  if (u.def.final) { G.committee = u; G.momentum = clamp(Math.max(G.momentum, 80), 0, 100); }
  slowTick(true);
}
function updateWave(dt) {
  const w = G.wave; if (!w) return;
  if (w.spawned < w.list.length) {
    w.timer += dt; const rate = Math.max(3, w.list.length / 12);
    while (w.timer > 1 / rate && w.spawned < w.list.length) {
      w.timer -= 1 / rate; const p = waveSpawnPoint(w.side); const e = w.list[w.spawned];
      for (let i = 0; i < e.n; i++) { const u = spawnUnit(e.type, p.x + (Math.random() - 0.5) * 0.6, p.y + (Math.random() - 0.5) * 0.6); u.wave = true; u.idle = false; }
      w.spawned++;
      if (!w.ltSpawned && w.spawned >= w.list.length * 0.4) { w.ltSpawned = true; if (w.lt) spawnLieutenant(w.lt, w.side); if (w.boss) spawnLieutenant(w.boss, w.side); }
    }
  }
  let alive = 0; for (const u of G.units) if (!u.dead && u.wave) alive++;
  w.alive = alive;
  if (w.spawned >= w.list.length && alive === 0) {
    G.wavesBeaten++;
    const gain = w.lost ? 2 : 5; G.trust = clamp(G.trust + gain, 0, 100);
    msg('Wave ' + (w.day - 1) + ' beaten' + (w.lost ? ' (but you lost ground). Trust +2.' : ' clean. Trust +5.'), 'good');
    if (w.day >= WIN_DAY) gameOver(true, 'The Big One broke on your walls. The fiscal year is survived.');
    G.wave = null;
  }
}
function dayRollover() {
  G.day++;
  const occ = G.buildings.filter(b => b.state === 'occupied').length;
  const chapels = G.buildings.filter(b => b.type === 'chapel' && b.state === 'player' && b.recover <= 0).length;
  const schools = G.buildings.filter(b => b.type === 'school' && b.state === 'player' && b.recover <= 0).length;
  const boom = Math.floor(Math.max(0, G.res.treasury - 300) / 100);
  G.momentum = clamp(G.momentum + occ * 4 + boom - chapels * BUILDINGS.chapel.momentumBleed, 0, 100);
  G.trust = clamp(G.trust - occ * 3 + (chapels ? 1 : 0) + schools, 0, 100);
  if (occ) msg(occ + ' occupied tile(s) left standing overnight: Momentum +' + occ * 4 + ', Trust -' + occ * 3 + '.', 'warn');
  if (boom) msg('A fat Treasury paints a target. Momentum +' + boom + '.', 'warn');
  msg('Day ' + G.day + ' — ' + chapterName(G.day) + '.', 'info');
  if (G.day >= FIRST_WAVE_DAY && G.day <= WIN_DAY) spawnWave(G.day);
}
function gameOver(won, why) {
  if (G.over) return; G.over = true; G.won = won; G.overWhy = why; G.paused = true;
  msg(why, won ? 'good' : 'bad');
  if (typeof UI !== 'undefined') UI.showEnd();
}

// ---------- vision ----------
function updateVision() {
  const v = G.vis;
  for (let i = 0; i < v.length; i++) if (v[i] === 2) v[i] = 1;
  const mark = (cx, cy, r) => {
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(MAP_W - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(MAP_H - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const dx = x + 0.5 - cx, dy = y + 0.5 - cy; if (dx * dx + dy * dy <= r * r) v[y * MAP_W + x] = 2; }
  };
  for (const b of G.buildings) if (b.state === 'player') mark(b.x + b.w / 2, b.y + b.h / 2, b.def.vision || 3);
  for (const u of G.units) if (!u.dead && u.side === 'player') mark(u.x, u.y, u.def.vision || 5);
  if (G.buildings.some(b => b.type === 'printshop' && b.state === 'player')) for (const b of G.buildings) if (b.state === 'enemy') for (const t of footprintTiles(b)) if (v[t] === 0) v[t] = 1;
}

// Light separation so blobs spread along a wall face instead of stacking on one point.
function separateUnits(dt) {
  const R0 = 0.45;
  for (const u of G.units) {
    if (u.dead) continue;
    const tx = u.x | 0, ty = u.y | 0; let px = 0, py = 0;
    for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) {
      if (!inMap(x, y)) continue; const a = G.unitGrid.get(y * MAP_W + x); if (!a) continue;
      for (const o of a) { if (o === u || o.dead) continue; let dx = u.x - o.x, dy = u.y - o.y; let d = Math.hypot(dx, dy);
        const r0 = R0 + (u.def.r > 0.35 ? 0.2 : 0) + (o.def.r > 0.35 ? 0.2 : 0);
        if (d >= r0) continue; if (d < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d = 0.01; }
        const f = (r0 - d) / r0; px += dx / d * f; py += dy / d * f; }
    }
    if (px === 0 && py === 0) continue;
    const nx = clamp(u.x + px * dt * 1.5, 0.05, MAP_W - 0.05), ny = clamp(u.y + py * dt * 1.5, 0.05, MAP_H - 0.05);
    const t = tileIndex(nx | 0, ny | 0);
    if (!solidTile(t) || (u.side === 'player' && playerCost(t) !== Infinity)) { u.x = nx; u.y = ny; }
  }
}

// ---------- main step ----------
function step(dt) {
  if (G.over) return;
  G.time += dt;
  rebuildUnitGrid();
  G.fieldsDirty = false;
  for (const u of G.units) if (!u.dead && u.side === 'enemy') { u.buffed = false; if (u.healed > 0) u.healed -= dt; }
  for (const o of G.units) if (!o.dead && o.type === 'organizer' && !o.idle) forUnitsNear(o.x, o.y, o.def.buff, a => { if (a.type === 'activist') a.buffed = true; });
  for (const u of G.units) { if (u.dead) continue; if (u.shot > 0) u.shot -= dt; if (u.side === 'enemy') updateEnemy(u, dt); else updatePlayerUnit(u, dt); }
  separateUnits(dt);
  for (const b of G.buildings) if (b.shot > 0) b.shot -= dt;
  updateBuildings(dt);
  updateEconomy(dt);
  updateWave(dt);
  if (G.freeze.warn > 0) G.freeze.warn -= dt; if (G.freeze.t > 0) G.freeze.t -= dt;
  if (G.seizureBoost > 0) G.seizureBoost -= dt;
  if (G.gatesOpen > 0) { G.gatesOpen -= dt; if (G.gatesOpen <= 0) { G.gatesOpen = 0; invalidateFields(); msg('The gates close again.', 'info'); } }
  if (G.revive.length) { for (const r of G.revive) r.t -= dt; const up = G.revive.filter(r => r.t <= 0); if (up.length) { G.revive = G.revive.filter(r => r.t > 0); for (const r of up) { if (solidTile(tileIndex(clamp(r.x | 0, 0, MAP_W - 1), clamp(r.y | 0, 0, MAP_H - 1)))) continue; const u = spawnUnit('activist', r.x, r.y); u.revived = true; u.idle = false; u.wave = true; fx('spawn', r.x, r.y); } } }
  if (G.committee && !G.committee.dead && G.momentum < 80) G.momentum = 80;
  G.slowTimer -= dt; if (G.slowTimer <= 0) { G.slowTimer = 1; slowTick(); }
  G.visTimer -= dt; if (G.visTimer <= 0) { G.visTimer = 0.3; updateVision(); }
  G.dayTimer -= dt; if (G.dayTimer <= 0) { G.dayTimer += DAY_LENGTH; dayRollover(); }
  if (G.units.length > 0 && G.time % 2 < dt) G.units = G.units.filter(u => !u.dead);
  for (const e of G.effects) e.t += dt; G.effects = G.effects.filter(e => e.t < (e.life || 1.2));
  if (G.selected) G.selected = G.selected.filter(e => !e.dead);
}


// ---------- save / load ----------
const SAVE_KEY = 'twb_save_v1';
function saveGame() {
  if (G.over) { msg('Nothing to save: the run is over.', 'warn'); return false; }
  const U = ['id', 'type', 'x', 'y', 'hp', 'maxHp', 'state', 'target', 'idle', 'wave', 'persistUsed', 'tantrumDone', 'revived', 'organized', 'home', 'hx', 'hy', 'quarters', 'stolen', 'ltT', 'channel', 'hair', 'armor', 'civTarget', 'atWork'];
  const B = ['id', 'type', 'x', 'y', 'hp', 'state', 'recap', 'recover', 'paint', 'shut', 'deedUsed', 'skin', 'gold', 'pulse', 'treeAdj'];
  const pick = (o, keys) => { const r = {}; for (const k of keys) if (o[k] !== undefined) r[k] = o[k]; return r; };
  const data = { v: 1, seed: G.seed, difficulty: G.difficulty, time: G.time, day: G.day, dayTimer: G.dayTimer, res: G.res, trust: G.trust, momentum: G.momentum, levyDay: G.levyDay, treasuryZero: G.treasuryZero,
    wavesBeaten: G.wavesBeaten, stats: G.stats, tech: { done: [...G.tech.done], current: G.tech.current, timer: G.tech.timer, total: G.tech.total }, trainQ: G.trainQ, muster: G.muster,
    publicFund: G.publicFund, freeze: G.freeze, gatesOpen: G.gatesOpen, seizureBoost: G.seizureBoost, organized: G.organized, raids: G.raids, nextId: G.nextId, vis: Array.from(G.vis),
    buildings: G.buildings.map(b => pick(b, B)), units: G.units.filter(u => !u.dead).map(u => pick(u, U)),
    wave: G.wave ? { day: G.wave.day, list: G.wave.list, spawned: G.wave.spawned, timer: G.wave.timer, lost: G.wave.lost, total: G.wave.total, side: G.wave.side, lt: G.wave.lt, boss: G.wave.boss, ltSpawned: G.wave.ltSpawned } : null,
    cam: { x: R.cam.x, y: R.cam.y, zoom: R.cam.zoom }, msgs: G.msgs.slice(-6).map(m => ({ text: m.text, cls: m.cls })) };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { msg('Save failed: ' + e.message, 'bad'); return false; }
  msg('Game saved (Day ' + G.day + ').', 'good'); Sound.click(); return true;
}
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function loadGame() {
  let data; try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { data = null; }
  if (!data || data.v !== 1) { msg('No saved game.', 'warn'); return false; }
  newGame({ seed: data.seed, difficulty: data.difficulty });
  G.loading = true;
  // wipe the fresh town, then restore
  for (const u of G.units.slice()) killUnit(u, true); G.units = [];
  for (const b of G.buildings.slice()) removeBuilding(b);
  Object.assign(G, { time: data.time, day: data.day, dayTimer: data.dayTimer, res: data.res, trust: data.trust, momentum: data.momentum, levyDay: data.levyDay, treasuryZero: data.treasuryZero,
    wavesBeaten: data.wavesBeaten, stats: data.stats, trainQ: data.trainQ, muster: data.muster, publicFund: data.publicFund, freeze: data.freeze, gatesOpen: data.gatesOpen,
    seizureBoost: data.seizureBoost, organized: data.organized, raids: data.raids });
  G.tech = { done: new Set(data.tech.done), current: data.tech.current, timer: data.tech.timer, total: data.tech.total };
  G.vis = Uint8Array.from(data.vis);
  for (const sb of data.buildings) { const b = placeBuilding(sb.type, sb.x, sb.y, true); if (!b) continue; Object.assign(b, sb); G.bmap.delete(b.id); G.bmap.set(sb.id, b); for (const t of footprintTiles(b)) G.grid[t] = sb.id; if (b.type === 'townhall') G.hall = b; if (b.type === 'vault') G.vault = b; }
  for (const su of data.units) { const u = spawnUnit(su.type, su.x, su.y); Object.assign(u, su); G.umap.delete(u.id); G.umap.set(su.id, u); u.next = -1; u.fieldKey = null; if (u.def.lt) G.lts.push(u); if (u.def.civilian) u.state = 'civ'; }
  G.nextId = data.nextId; G.wave = data.wave;
  G.msgs = data.msgs.map(m => ({ text: m.text, cls: m.cls, t: G.time, real: performance.now() }));
  if (data.cam) { R.cam.x = data.cam.x; R.cam.y = data.cam.y; R.cam.zoom = data.cam.zoom; }
  G.loading = false;
  invalidateFields(); recountHouseholds(); slowTick(true); G.selected = [];
  msg('Game loaded (Day ' + G.day + ').', 'good');
  return true;
}
