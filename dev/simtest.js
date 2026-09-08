// Dev harness: builds a sane town and fast-forwards the simulation. Load in the page console:
//   eval(await (await fetch('/dev/simtest.js')).text()); simtest(8, {militia:6, auto:true})
window.buildTestTown = function () {
  G.res.wood = 5000; G.res.stone = 5000; G.res.gold = 5000; G.res.iron = 500;
  const fails = [];
  const P = (t, x, y) => { const b = placeBuilding(t, x, y); if (!b) fails.push([t, x, y, canPlace(t, x, y).why]); return b; };
  P('cottage', 23, 23); P('cottage', 31, 23); P('cottage', 23, 29); P('cottage', 33, 29);
  P('farm', 27, 32); P('quarry', 23, 25); P('mill', 31, 31); P('militiahall', 30, 34); P('chapel', 33, 25);
  for (let x = 23; x <= 36; x++) if (x !== 28) P('wall_wood', x, 22);
  for (let x = 20; x <= 36; x++) if (x !== 28) P('wall_wood', x, 36);
  for (let y = 24; y <= 35; y++) P('wall_wood', 20, y);
  for (let y = 23; y <= 35; y++) P('wall_wood', 36, y);
  P('gate', 28, 22); P('gate', 28, 36);
  P('tower', 26, 23); P('tower', 30, 23); P('tower', 26, 35); P('tower', 32, 35);
  G.res.wood = 400; G.res.stone = 100; G.res.gold = 400; G.res.iron = 0;
  return fails;
};
// Crude autopilot: repairs, recaptures, musters at wave start, dismisses after, adds towers, researches.
window.autopilot = function () {
  const army = G.units.filter(u => !u.dead && u.side === 'player');
  const enemiesIn = G.units.filter(u => !u.dead && u.side === 'enemy' && !u.idle && Math.hypot(u.x - 27.5, u.y - 27.5) < 15);
  const towers = G.buildings.filter(b => b.def.range && b.state === 'player').length;
  const claim = G.buildings.find(b => b.state === 'occupied' || b.state === 'crate');
  const idle = army.filter(u => u.state === 'idle');
  if (G.wave && G.wave.alive) {
    if (!G.autoMustered) { musterMilitia(8); G.autoMustered = true; }
    if (enemiesIn.length && idle.length) { enemiesIn.sort((a, b) => (b.def.lt ? 1 : 0) - (a.def.lt ? 1 : 0)); cmdAttack(idle, enemiesIn[0]); }
    else if (claim && idle.length) cmdRecapture(idle, claim);
    for (const b of G.buildings) if (b.state === 'player' && b.def.kind === 'defense' && b.hp < b.maxHp * 0.4 && G.res.gold > 40) repairBuilding(b);
  } else {
    G.autoMustered = false;
    const mil = army.filter(u => u.type === 'militia'); if (mil.length) dismissMilitia(mil);
    for (const b of G.buildings) if (b.state === 'player' && b.hp < b.maxHp * 0.7) repairBuilding(b);
    if (claim && idle.length) cmdRecapture(idle, claim);
    // rebuild missing gates/walls on the ring
    for (let x = 23; x <= 36; x++) if (x !== 28 && !solidTile(tileIndex(x, 22)) && canPlace('wall_wood', x, 22).ok) placeBuilding('wall_wood', x, 22);
    for (let x = 20; x <= 36; x++) if (x !== 28 && !solidTile(tileIndex(x, 36)) && canPlace('wall_wood', x, 36).ok) placeBuilding('wall_wood', x, 36);
    for (let y = 24; y <= 35; y++) if (!solidTile(tileIndex(20, y)) && canPlace('wall_wood', 20, y).ok) placeBuilding('wall_wood', 20, y);
    for (let y = 23; y <= 35; y++) if (!solidTile(tileIndex(36, y)) && canPlace('wall_wood', 36, y).ok) placeBuilding('wall_wood', 36, y);
    for (const [gx, gy] of [[28, 22], [28, 36]]) if (!solidTile(tileIndex(gx, gy)) && canPlace('gate', gx, gy).ok) placeBuilding('gate', gx, gy);
    if (towers < 10) { const spots = [[24, 24], [33, 23], [22, 31], [34, 33], [25, 27], [31, 26], [27, 30], [22, 27], [24, 34], [33, 21]]; for (const [x, y] of spots) if (canPlace('tower', x, y).ok) { placeBuilding('tower', x, y); break; } }
    else if (!G.tech.current && G.res.gold > 120) for (const id of ['stonework', 'stakes', 'marksmen', 'mining', 'deeds', 'gazette', 'workshop', 'posse', 'fieldpieces', 'school', 'lodge', 'storage', 'veterans']) if (canResearch(id).ok) { startResearch(id); break; }
    if (G.res.gold > 150) for (const t of ['marksman', 'posse', 'fieldpiece', 'veteran', 'minuteman']) if (canTrain(t).ok) { trainUnit(t); break; }
    if (G.tech.done.has('stonework') && G.res.stone > 60 && G.res.gold > 80) { const spots = [[26, 21], [30, 21], [26, 37], [30, 37]]; for (const [x, y] of spots) if (canPlace('tower_stone', x, y).ok) { placeBuilding('tower_stone', x, y); break; } }
    if (G.tech.done.has('stakes') && G.res.wood > 60) for (const [x, y] of [[27, 20], [28, 20], [29, 20], [27, 38], [28, 38], [29, 38]]) if (canPlace('stakes', x, y).ok) { placeBuilding('stakes', x, y); break; }
    if (G.res.wood > 60 && G.res.gold > 60 && G.hh.cap - G.hh.used < 3) for (const [x, y] of [[25, 24], [29, 24], [21, 27], [25, 30], [34, 31], [22, 33]]) if (canPlace('cottage', x, y).ok) { placeBuilding('cottage', x, y); break; }
  }
};
window.simtest = function (days, opts) {
  opts = opts || {};
  const fails = window.buildTestTown();
  if (opts.militia) musterMilitia(opts.militia);
  const log = []; const t0 = performance.now(); let maxStep = 0, slow = 0;
  for (let i = 0; i < 30 * DAY_LENGTH * days; i++) {
    const s = performance.now(); step(1 / 30); const d = performance.now() - s; if (d > maxStep) maxStep = d; if (d > 8) slow++;
    if (opts.auto && i % 30 === 0) window.autopilot();
    if (G.over) break;
    if (i % (30 * 60) === 0) log.push([G.day, Math.round(G.time), 'e' + G.units.filter(u => !u.dead && u.side === 'enemy').length, 'occ' + G.buildings.filter(b => b.state === 'occupied').length, 'army' + G.units.filter(u => !u.dead && u.side === 'player').length, 'g' + Math.round(G.res.gold), 'T' + Math.round(G.res.treasury), 'th' + Math.round(G.hall.hp), 'def' + G.buildings.filter(b => b.def.kind === 'defense').length, 'tech' + G.tech.done.size].join('|'));
  }
  return { fails: fails.length, ms: Math.round(performance.now() - t0), maxStep: maxStep.toFixed(1), slowSteps: slow, over: G.over, why: G.overWhy, day: G.day, stats: G.stats, trust: G.trust, mom: G.momentum, log, msgs: G.msgs.map(m => m.text) };
};
