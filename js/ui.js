'use strict';
// ============================================================
// Input + HUD (DOM overlay). Pause-anytime command is mandatory.
// ============================================================
const UI = {
  placing: null, tab: 'frontier', drag: null, keys: {}, mouse: { x: 0, y: 0 }, lastPlaced: null, wallDrag: false, el: {}, cardKey: '',
  init() {
    const $ = id => document.getElementById(id);
    this.el = { canvas: $('game'), mini: $('minimap'), tray: $('tray-items'), card: $('card'), msgs: $('messages'), overlay: $('overlay'), clock: $('clock'),
      wood: $('r-wood'), stone: $('r-stone'), iron: $('r-iron'), food: $('r-food'), hh: $('r-hh'), gold: $('r-gold'), treasury: $('r-treasury'),
      trustFill: $('trust-fill'), trustVal: $('trust-val'), day: $('day'), chapter: $('chapter'), countdown: $('countdown'), clabel: $('clabel'),
      momFill: $('mom-fill'), momVal: $('mom-val'), speed: $('btn-speed'), pause: $('btn-pause'), warn: $('warnline'), occ: $('occ-alert'), tech: $('tech'), techCols: $('tech-cols'), techStatus: $('tech-status') };
    const c = this.el.canvas;
    c.addEventListener('mousedown', e => this.onDown(e));
    window.addEventListener('mousemove', e => this.onMove(e));
    window.addEventListener('mouseup', e => this.onUp(e));
    c.addEventListener('contextmenu', e => e.preventDefault());
    c.addEventListener('wheel', e => { e.preventDefault(); const f = e.deltaY < 0 ? 1.15 : 1 / 1.15; const [wx, wy] = screenToWorld(e.offsetX, e.offsetY); R.cam.zoom = clamp(R.cam.zoom * f, 0.35, 2.2); const [wx2, wy2] = screenToWorld(e.offsetX, e.offsetY); R.cam.x += wx - wx2; R.cam.y += wy - wy2; }, { passive: false });
    window.addEventListener('keydown', e => this.onKey(e));
    window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
    this.el.mini.addEventListener('mousedown', e => { this.miniDrag = true; this.miniTo(e); });
    window.addEventListener('mousemove', e => { if (this.miniDrag) this.miniTo(e); });
    window.addEventListener('mouseup', () => { this.miniDrag = false; });
    document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => this.setTab(b.dataset.tab)));
    $('btn-pause').addEventListener('click', () => this.togglePause());
    $('btn-speed').addEventListener('click', () => this.cycleSpeed());
    $('btn-muster').addEventListener('click', () => musterMilitia(1));
    $('btn-muster5').addEventListener('click', () => musterMilitia(5));
    $('btn-dismiss').addEventListener('click', () => this.dismiss());
    $('btn-selmil').addEventListener('click', () => this.selectAll('militia'));
    $('btn-selall').addEventListener('click', () => this.selectAll());
    $('btn-levy').addEventListener('click', () => warLevy());
    $('btn-tech').addEventListener('click', () => this.toggleTech());
    $('btn-tech2').addEventListener('click', () => this.toggleTech());
    $('btn-close-tech').addEventListener('click', () => this.toggleTech(false));
    $('btn-mute').addEventListener('click', e => { e.target.textContent = Sound.toggle() ? '🔇' : '🔊'; e.target.blur(); });
    $('btn-help').addEventListener('click', () => { $('help').hidden = false; });
    $('btn-start').addEventListener('click', () => this.start());
    $('btn-load').addEventListener('click', () => this.load());
    $('btn-save').addEventListener('click', () => saveGame());
    $('btn-load2').addEventListener('click', () => this.load());
    $('btn-menu').addEventListener('click', () => { G.paused = true; this.el.overlay.hidden = false; $('btn-start').textContent = 'Found a New Town'; $('btn-resume').hidden = false; this.refreshMenu(); });
    $('btn-resume').addEventListener('click', () => { this.el.overlay.hidden = true; G.paused = false; });
    $('btn-seed-random').addEventListener('click', () => { $('seed').value = 1 + Math.floor(Math.random() * 99999); $('map').value = 'random'; });
    $('map').addEventListener('change', () => { if ($('map').value === 'random' && !(+$('seed').value)) $('seed').value = 1 + Math.floor(Math.random() * 99999); });
    $('btn-close-help').addEventListener('click', () => { $('help').hidden = true; });
    document.querySelectorAll('button').forEach(b => b.addEventListener('click', () => b.blur()));
    this.setTab('frontier'); this.refreshMenu();
  },
  miniTo(e) { const r = this.el.mini.getBoundingClientRect(); const [tx, ty] = minimapToTile(this.el.mini, e.clientX - r.left, e.clientY - r.top); const [wx, wy] = worldOf(tx, ty); R.cam.x = wx; R.cam.y = wy; },
  refreshMenu() {
    const $ = id => document.getElementById(id); $('btn-load').hidden = !hasSave();
    const p = campaignProgress(); const list = $('missions'); list.innerHTML = '';
    MISSIONS.forEach((m, i) => {
      const locked = i > p.unlocked; const done = p.done.includes(m.id);
      const el = document.createElement('button'); el.className = 'mission' + (locked ? ' locked' : '') + (done ? ' done' : ''); el.disabled = locked;
      el.innerHTML = `<div class="mn">${i + 1}. ${m.name}${done ? ' ✓' : ''}${locked ? ' 🔒' : ''}</div><div class="md">${m.days} days · waves ×${m.waves}</div><div class="mb">${m.blurb}</div>`;
      el.title = m.objective; el.addEventListener('click', () => this.startMission(m.id)); list.appendChild(el);
    });
  },
  startMission(id) {
    Sound.unlock(); newGame({ mission: id }); buildTerrainCanvas(); G.selected = [];
    const [wx, wy] = worldOf(G.hall.x + 1.5, G.hall.y + 2.5); R.cam.x = wx; R.cam.y = wy; R.cam.zoom = 1;
    this.el.overlay.hidden = true; document.getElementById('end').hidden = true; this.el.tech.hidden = true;
    G.paused = false; this.refreshMsgs(); this.buildTray(); this.cardKey = '';
  },
  load() { Sound.unlock(); if (!loadGame()) return; buildTerrainCanvas(); this.el.overlay.hidden = true; document.getElementById('end').hidden = true; this.el.tech.hidden = true; G.paused = false; this.refreshMsgs(); this.buildTray(); this.cardKey = ''; },
  start() {
    Sound.unlock();
    const $ = id => document.getElementById(id);
    const seed = $('map').value === 'random' ? (+$('seed').value || 1) : 0; const diff = document.querySelector('input[name=diff]:checked').value;
    newGame({ seed, difficulty: diff }); buildTerrainCanvas(); G.selected = [];
    if (seed) msg('Procedural map, seed ' + G.seed + '. Difficulty: ' + DIFFICULTY[diff].name + '.', 'info');
    const [wx, wy] = worldOf(G.hall.x + 1.5, G.hall.y + 2.5); R.cam.x = wx; R.cam.y = wy; R.cam.zoom = 1;
    this.el.overlay.hidden = true; document.getElementById('end').hidden = true; document.getElementById('help').hidden = true; this.el.tech.hidden = true;
    G.paused = false; this.refreshMsgs(); this.buildTray(); this.cardKey = '';
  },
  showEnd() {
    const e = document.getElementById('end'); e.hidden = false;
    document.getElementById('end-title').textContent = G.won ? 'THE FISCAL YEAR IS SURVIVED' : 'THE CHARTER IS SUPERSEDED';
    document.getElementById('end-title').className = G.won ? 'good' : 'bad';
    document.getElementById('end-why').textContent = G.overWhy;
    const next = G.mission ? MISSIONS[MISSIONS.indexOf(G.mission) + 1] : null; const nb = document.getElementById('btn-next');
    nb.hidden = !(G.won && next); if (next) { nb.textContent = 'Next: ' + next.name; nb.onclick = () => this.startMission(next.id); }
    document.getElementById('btn-restart').textContent = G.mission ? (G.won ? 'Back to Menu' : 'Retry ' + G.mission.name) : 'Found a New Town';
    document.getElementById('btn-restart').onclick = () => { if (G.mission && !G.won) this.startMission(G.mission.id); else if (G.mission) { document.getElementById('end').hidden = true; this.el.overlay.hidden = false; this.refreshMenu(); } else this.start(); };
    const s = G.stats;
    document.getElementById('end-stats').innerHTML = `<div>Days survived: <b>${G.day}</b></div><div>Waves beaten: <b>${G.wavesBeaten}</b></div><div>Wave units dispersed: <b>${s.killed}</b></div><div>Lieutenants downed: <b>${s.lts}</b></div><div>Buildings occupied: <b>${s.flips}</b></div><div>Recaptured: <b>${s.recaptured}</b></div><div>Defenses lost: <b>${s.lost}</b></div><div>Tech researched: <b>${G.tech.done.size}/${Object.keys(TECH).length}</b></div><div>Treasury: <b>${Math.floor(G.res.treasury)}</b></div><div>Trust <b>${Math.round(G.trust)}</b> · Momentum <b>${Math.round(G.momentum)}</b></div>`;
    if (G.won) Sound.good();
  },
  togglePause() { if (G.over) return; G.paused = !G.paused; },
  cycleSpeed() { G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 3 : 1; },
  toggleTech(force) { const show = force !== undefined ? force : this.el.tech.hidden; this.el.tech.hidden = !show; if (show) this.buildTech(); },
  dismiss() { const sel = (G.selected || []).filter(u => u.kind === 'u' && u.type === 'militia'); dismissMilitia(sel.length ? sel : G.units.filter(u => u.type === 'militia')); },
  setTab(t) { this.tab = t; document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === t)); this.buildTray(); },
  trayItems() {
    if (this.tab === 'muster') return Object.entries(UNITS).filter(([k, d]) => d.side === 'player' && !d.civilian).map(([k, d]) => ({ k, d, kind: 'u' }));
    return Object.entries(BUILDINGS).filter(([k, d]) => d.tab === this.tab).map(([k, d]) => ({ k, d, kind: 'b' }));
  },
  buildTray() {
    const tray = this.el.tray; tray.innerHTML = '';
    this.trayItems().forEach((it, i) => {
      const { k, d, kind } = it;
      const btn = document.createElement('button'); btn.className = 'tray-item'; btn.dataset.type = k; btn.dataset.kind = kind;
      const cost = Object.entries(d.cost).map(([r, v]) => `<span class="c-${r}">${v}${r === 'gold' ? 'g' : r === 'wood' ? 'w' : r === 'stone' ? 's' : r === 'iron' ? 'i' : ''}</span>`).join(' ');
      const ic = document.createElement('canvas'); ic.width = 64; ic.height = 48; renderIcon(ic, kind, k);
      btn.appendChild(ic);
      const lab = document.createElement('div'); lab.className = 'ti-name'; lab.textContent = d.name.replace('Citizen ', '').replace('Sheriff\'s ', '').replace(' Company', ''); btn.appendChild(lab);
      const cst = document.createElement('div'); cst.className = 'ti-cost'; cst.innerHTML = cost || 'free'; btn.appendChild(cst);
      const key = document.createElement('div'); key.className = 'ti-key'; key.textContent = i + 1; btn.appendChild(key);
      const locked = !techDone(d.tech);
      btn.classList.toggle('locked', locked);
      btn.title = d.name + '\n' + d.desc + (d.workers ? `\nWorkers: ${d.workers}.` : '') + (locked ? `\n🔒 Requires ${TECH[d.tech].name} (T)` : '') + (kind === 'u' && d.train ? `\nTrains in ${d.train}s at the ${BUILDINGS[d.from].name}.` : '');
      btn.addEventListener('click', () => this.trayClick(kind, k));
      tray.appendChild(btn);
    });
  },
  trayClick(kind, k) {
    if (G.over) return;
    if (kind === 'b') this.beginPlace(k);
    else if (k === 'militia') musterMilitia(1);
    else trainUnit(k);
  },
  beginPlace(type) { const c = BUILDINGS[type]; if (!techDone(c.tech)) { msg('Requires ' + TECH[c.tech].name + '. Open the tech tree (T).', 'warn'); return; } this.placing = type; this.el.canvas.style.cursor = 'crosshair'; document.querySelectorAll('.tray-item').forEach(b => b.classList.toggle('active', b.dataset.type === type)); },
  cancelPlace() { this.placing = null; this.el.canvas.style.cursor = 'default'; document.querySelectorAll('.tray-item').forEach(b => b.classList.remove('active')); },
  selectAll(type) { G.selected = G.units.filter(u => !u.dead && u.side === 'player' && !u.def.civilian && (!type || u.type === type)); if (G.selected.length) { const u = G.selected[0]; const [wx, wy] = worldOf(u.x, u.y); R.cam.x = wx; R.cam.y = wy; } },
  buildTech() {
    const cols = this.el.techCols; cols.innerHTML = '';
    for (const tab of TABS) {
      const col = document.createElement('div'); col.className = 'tech-col'; col.innerHTML = `<h3>${tab.name}</h3>`;
      for (const [id, t] of Object.entries(TECH)) {
        if (t.branch !== tab.id) continue;
        const n = document.createElement('div'); const done = G.tech.done.has(id), cur = G.tech.current === id; const c = canResearch(id);
        n.className = 'tech-node' + (done ? ' done' : cur ? ' current' : c.ok ? '' : ' locked');
        const cost = Object.entries(t.cost).map(([r, v]) => v + ' ' + r).join(', ');
        n.innerHTML = `<div class="tn">${t.name} ${done ? '✔' : cur ? '⏳' : ''}</div><div class="tc">${cost} · ${t.time}s${t.requires.length ? ' · needs ' + t.requires.map(r => TECH[r].name).join(', ') : ''}</div><div class="td">${t.desc}</div>` + (cur ? `<div class="tp"><div style="width:${100 * (1 - G.tech.timer / G.tech.total)}%"></div></div>` : '');
        if (!done && !cur) n.addEventListener('click', () => { if (startResearch(id)) { Sound.click(); this.buildTech(); } else this.buildTech(); });
        col.appendChild(n);
      }
      cols.appendChild(col);
    }
    this.el.techStatus.textContent = G.tech.current ? 'Researching ' + TECH[G.tech.current].name + ' — ' + Math.ceil(G.tech.timer) + 's' : (G.tech.done.size + '/' + Object.keys(TECH).length + ' researched. Click a node to start.');
  },
  hitTest(sx, sy) {
    const [wx, wy] = screenToWorld(sx, sy);
    let best = null, bd = 16 / R.cam.zoom;
    for (const u of G.units) { if (u.dead || u.def.civilian) continue; if (u.side === 'enemy' && G.vis[unitTile(u)] !== 2) continue; const [X, Y] = worldOf(u.x, u.y); const d = Math.hypot(X - wx, Y - wy + 12) - u.def.r * 10; if (d < bd) { bd = d; best = u; } }
    if (best) return best;
    const [tx, ty] = worldToTile(wx, wy); const ix = Math.floor(tx), iy = Math.floor(ty);
    for (let k = 0; k < 4; k++) { const x = ix + k, y = iy + k; if (!inMap(x, y)) continue; const bid = G.grid[tileIndex(x, y)]; if (bid < 0) continue;
      const b = G.bmap.get(bid); if (!b) continue; if (k === 0 || k * TILE_H <= b.def.height * 28 + 6) return b; }
    return null;
  },
  onDown(e) {
    const sx = e.offsetX, sy = e.offsetY; this.mouse = { x: sx, y: sy };
    if (G.over) return;
    if (e.button === 1) { this.drag = { pan: true, x: e.clientX, y: e.clientY, cx: R.cam.x, cy: R.cam.y }; e.preventDefault(); return; }
    if (e.button === 2) { if (this.placing) { this.cancelPlace(); return; } this.rightCommand(sx, sy); return; }
    if (e.button === 0) {
      if (this.placing) { const isWall = BUILDINGS[this.placing].w === 1; this.lastPlaced = null; this.placeAt(sx, sy); this.wallDrag = isWall && !!this.placing; return; }
      this.drag = { box: false, x0: sx, y0: sy, x1: sx, y1: sy };
    }
  },
  onMove(e) {
    const r = this.el.canvas.getBoundingClientRect(); const sx = e.clientX - r.left, sy = e.clientY - r.top; this.mouse = { x: sx, y: sy };
    const [tx, ty] = screenToTile(sx, sy); const def = this.placing ? BUILDINGS[this.placing] : null;
    R.hoverTile = def ? [Math.floor(tx - def.w / 2 + 0.5), Math.floor(ty - def.h / 2 + 0.5)] : [Math.floor(tx), Math.floor(ty)];
    if (this.drag && this.drag.pan) { R.cam.x = this.drag.cx - (e.clientX - this.drag.x) / R.cam.zoom; R.cam.y = this.drag.cy - (e.clientY - this.drag.y) / R.cam.zoom; return; }
    if (this.drag && !this.drag.pan) { this.drag.x1 = sx; this.drag.y1 = sy; if (Math.abs(sx - this.drag.x0) + Math.abs(sy - this.drag.y0) > 6) this.drag.box = true; }
    if (this.wallDrag && this.placing && (e.buttons & 1)) this.placeAt(sx, sy, true);
  },
  onUp(e) {
    this.wallDrag = false;
    if (!this.drag) return;
    const d = this.drag; this.drag = null; if (d.pan) return;
    if (e.button !== 0) return;
    if (d.box) {
      const x0 = Math.min(d.x0, d.x1), x1 = Math.max(d.x0, d.x1), y0 = Math.min(d.y0, d.y1), y1 = Math.max(d.y0, d.y1);
      const sel = G.units.filter(u => { if (u.dead || u.side !== 'player' || u.def.civilian) return false; const [X, Y] = worldOf(u.x, u.y); const [sx, sy] = worldToScreen(X, Y - 10); return sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1; });
      if (sel.length || !e.shiftKey) G.selected = e.shiftKey ? G.selected.concat(sel) : sel;
    } else {
      const hit = this.hitTest(d.x0, d.y0);
      if (!hit) G.selected = [];
      else if (hit.kind === 'u' && hit.side === 'player') { if (e.shiftKey) { if (!G.selected.includes(hit)) G.selected.push(hit); } else G.selected = [hit]; }
      else G.selected = [hit];
      if (hit) Sound.click();
    }
    this.cardKey = '';
  },
  rightCommand(sx, sy) {
    const units = (G.selected || []).filter(x => x.kind === 'u' && x.side === 'player' && !x.dead);
    if (!units.length) return;
    const hit = this.hitTest(sx, sy);
    if (hit && hit.kind === 'u' && hit.side === 'enemy') { cmdAttack(units, hit); fx('recap', hit.x, hit.y); return; }
    if (hit && hit.kind === 'b') { if (hit.state === 'occupied' || hit.state === 'crate') cmdRecapture(units, hit); else if (hit.state === 'enemy') { cmdAttackBuilding(units, hit); msg('Raiding the Encampment. Expect a backlash.', 'warn'); } else cmdMoveToBuilding(units, hit); return; }
    const [tx, ty] = screenToTile(sx, sy); const ix = Math.floor(tx), iy = Math.floor(ty);
    if (!inMap(ix, iy)) return;
    cmdMove(units, ix, iy); fx('recap', ix + 0.5, iy + 0.5);
  },
  placeAt(sx, sy, drag) {
    const def = BUILDINGS[this.placing]; const [tx, ty] = screenToTile(sx, sy);
    const x = Math.floor(tx - def.w / 2 + 0.5), y = Math.floor(ty - def.h / 2 + 0.5);
    if (drag && this.lastPlaced && this.lastPlaced[0] === x && this.lastPlaced[1] === y) return;
    if (drag && this.lastPlaced && def.w === 1) {
      let [lx, ly] = this.lastPlaced; const n = Math.max(Math.abs(x - lx), Math.abs(y - ly));
      for (let i = 1; i <= n; i++) { const px = Math.round(lx + (x - lx) * i / n), py = Math.round(ly + (y - ly) * i / n); if (canPlace(this.placing, px, py).ok) placeBuilding(this.placing, px, py); }
      this.lastPlaced = [x, y]; return;
    }
    const c = canPlace(this.placing, x, y);
    if (!c.ok) { if (!drag) msg(c.why + '.', 'warn'); return; }
    placeBuilding(this.placing, x, y); this.lastPlaced = [x, y]; Sound.place();
    if (def.w > 1 && !this.keys['shift']) this.cancelPlace();
  },
  onKey(e) {
    const k = e.key.toLowerCase(); this.keys[k] = true;
    if (e.target.tagName === 'INPUT') return;
    if (k === ' ' || e.code === 'Space') { e.preventDefault(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); this.togglePause(); return; }
    if (G.over) return;
    if (k === 't') { this.toggleTech(); return; }
    if (!this.el.tech.hidden) { if (k === 'escape') this.toggleTech(false); return; }
    if (k === 'escape') { this.cancelPlace(); G.selected = []; return; }
    if (k === 'z') this.setTab('frontier'); else if (k === 'x') this.setTab('charter'); else if (k === 'c') this.setTab('workshop'); else if (k === 'v') this.setTab('muster');
    else if (k >= '1' && k <= '9') { const it = this.trayItems()[+k - 1]; if (it) this.trayClick(it.kind, it.k); }
    else if (k === 'm') musterMilitia(e.shiftKey ? 5 : 1);
    else if (k === 'k') this.dismiss();
    else if (k === 'n') trainUnit('minuteman');
    else if (k === 'f') this.selectAll('militia');
    else if (k === 'g') this.selectAll();
    else if (k === 'h') { const [wx, wy] = worldOf(G.hall.x + 1.5, G.hall.y + 2.5); R.cam.x = wx; R.cam.y = wy; }
    else if (k === 'delete' || k === 'backspace') { const sel = (G.selected || []).filter(b => b.kind === 'b'); for (const b of sel) demolishBuilding(b); G.selected = []; }
    else if (k === 'r') { const sel = (G.selected || []).filter(b => b.kind === 'b'); for (const b of sel) repairBuilding(b); }
    else if (k === '+' || k === '=') this.cycleSpeed();
    else if (k === 'l') warLevy();
    else if (k === 'f5') { e.preventDefault(); saveGame(); }
    else if (k === 'f9') { e.preventDefault(); this.load(); }
  },
  updateCamera(dt) {
    const s = 520 * dt / R.cam.zoom; const k = this.keys;
    if (k['w'] || k['arrowup']) R.cam.y -= s; if (k['s'] || k['arrowdown']) R.cam.y += s;
    if (k['a'] || k['arrowleft']) R.cam.x -= s; if (k['d'] || k['arrowright']) R.cam.x += s;
    const [minx] = worldOf(0, MAP_H), [maxx] = worldOf(MAP_W, 0); const [, topy] = worldOf(0, 0); const [, boty] = worldOf(MAP_W, MAP_H);
    R.cam.x = clamp(R.cam.x, minx, maxx); R.cam.y = clamp(R.cam.y, topy, boty);
  },
  refreshMsgs() {
    const el = this.el.msgs; if (!el) return; el.innerHTML = '';
    for (const m of G.msgs.slice(-6)) { const d = document.createElement('div'); d.className = 'msg ' + m.cls; d.textContent = m.text; el.appendChild(d); }
  },
  fmt(n) { return Math.floor(n).toLocaleString(); },
  updateHUD() {
    const e = this.el, r = G.res;
    e.wood.textContent = this.fmt(r.wood); e.stone.textContent = this.fmt(r.stone); e.iron.textContent = this.fmt(r.iron); e.food.textContent = this.fmt(r.food) + (G.foodShort ? ' ⚠' : '');
    e.hh.textContent = G.hh.used + '/' + G.hh.cap; e.gold.textContent = this.fmt(r.gold); e.treasury.textContent = this.fmt(r.treasury);
    e.trustFill.style.width = G.trust + '%'; e.trustVal.textContent = Math.round(G.trust) + '/100';
    e.day.textContent = G.day; e.chapter.textContent = (G.mission ? G.mission.name + ' · ' : '') + chapterName(G.day) + (G.day >= G.winDay ? ' — FINAL' : '');
    const t = Math.ceil(G.dayTimer); const mm = Math.floor(t / 60), ss = t % 60;
    const waveOn = G.wave && (G.wave.alive || G.wave.spawned < G.wave.list.length);
    if (G.day >= G.winDay) { e.countdown.textContent = waveOn ? (G.wave.alive + G.wave.list.length - G.wave.spawned) : 'HOLD'; e.clabel.textContent = waveOn ? 'FINAL WAVE ON THE MAP' : 'NO MORE WAVES'; }
    else { e.countdown.textContent = mm + ':' + (ss < 10 ? '0' : '') + ss; e.clabel.textContent = waveOn ? 'WAVE ON THE MAP: ' + (G.wave.alive + G.wave.list.length - G.wave.spawned) + ' · NEXT IN' : 'UNTIL NEXT WAVE'; }
    e.countdown.className = waveOn ? 'hot' : '';
    renderClock(e.clock);
    e.momFill.style.height = G.momentum + '%'; e.momVal.textContent = Math.round(G.momentum) + '%';
    e.speed.textContent = G.speed + 'x'; e.pause.textContent = G.paused ? '▶' : '⏸';
    const occN = G.buildings.filter(b => b.state === 'occupied').length; e.occ.hidden = occN === 0; if (occN) e.occ.textContent = '⚠ OCCUPIED ×' + occN;
    const warns = [];
    if (G.treasuryZero > 0) warns.push('TREASURY EMPTY — institutions shutter in ' + Math.ceil(TREASURY_GRACE - G.treasuryZero) + 's');
    if (G.foodShort) warns.push('FOOD SHORTAGE: gold income halved');
    if (G.regulation) warns.push('LIZ BARREN ON THE MAP: repairs cost triple, new buildings open at half HP');
    const org = G.organized; if (org) warns.push(org + ' homesteader(s) ORGANIZED: households -' + org + ' until those Activists are put down');
    const mil = G.units.filter(u => !u.dead && u.type === 'militia').length; if (mil && !G.wave) warns.push(mil + ' militia mobilized: -' + (mil * UNITS.militia.upkeep * DAY_LENGTH).toFixed(0) + ' gold/day. Dismiss (K) between waves.');
    if (G.tech.current) warns.push('Researching ' + TECH[G.tech.current].name + ': ' + Math.ceil(G.tech.timer) + 's');
    if (G.gosplan) warns.push('GOSPLAN ANNEX siphons 30% of your income. Public Fund: ' + Math.floor(G.publicFund) + '/' + G.gosplan.def.siphon.cap + ' — a Heavy when full.');
    if (G.committee && !G.committee.dead) warns.push('THE COMMITTEE IS ON THE MAP: ' + Math.round(G.committee.hp) + '/' + G.committee.maxHp + ' HP. Do not let it touch the Town Hall.');
    if (G.gatesOpen > 0) warns.push('RESOLUTION: gates frozen open for ' + Math.ceil(G.gatesOpen) + 's');
    if (G.seizureBoost > 0) warns.push('RESOLUTION: Seizure channels doubled for ' + Math.ceil(G.seizureBoost) + 's');
    const lt = G.units.find(u => !u.dead && u.def.lt && !u.def.final); if (lt) warns.push(lt.def.name.toUpperCase() + ' on the map: ' + Math.round(lt.hp) + '/' + lt.maxHp + ' HP');
    if (G.trainQ.length) warns.push('Training ' + UNITS[G.trainQ[0].type].name + ': ' + Math.ceil(G.trainQ[0].timer) + 's' + (G.trainQ.length > 1 ? ' (+' + (G.trainQ.length - 1) + ' queued)' : ''));
    e.warn.innerHTML = warns.map(w => '<div>' + w + '</div>').join('');
    document.querySelectorAll('.tray-item').forEach(b => { const d = b.dataset.kind === 'b' ? BUILDINGS[b.dataset.type] : UNITS[b.dataset.type]; let ok = true; for (const k in d.cost) if (G.res[k] < d.cost[k]) ok = false; b.classList.toggle('poor', !ok); });
    if (!this.el.tech.hidden && (performance.now() % 500) < 20) this.buildTech();
    this.updateCard();
  },
  updateCard() {
    const sel = G.selected || []; const c = this.el.card;
    if (!sel.length) { if (this.cardKey !== 'empty') { this.cardKey = 'empty'; c.innerHTML = '<div class="card-empty"><b>Left-click</b> select · <b>drag</b> box-select · <b>right-click</b> move / attack / recapture<br>Space pause · Z X C V tabs · 1-9 build · M muster · K dismiss · N Minuteman · T tech · H home</div>'; } return; }
    const key = sel.map(s => s.id + ':' + Math.round(s.hp) + ':' + (s.state || '') + ':' + Math.round(s.recap || 0) + ':' + Math.round(s.paint || 0) + ':' + Math.round(s.shut || 0)).join(',') + Math.floor(G.res.gold / 10) + G.trainQ.length;
    if (this.cardKey === key) return; this.cardKey = key;
    const portrait = (kind, type) => { const cv = document.createElement('canvas'); cv.width = 72; cv.height = 72; cv.className = 'portrait'; renderIcon(cv, kind, type); return cv; };
    c.innerHTML = '';
    if (sel.length === 1 && sel[0].kind === 'b') {
      const b = sel[0]; const d = b.def; const head = document.createElement('div'); head.className = 'card-head'; head.appendChild(portrait('b', b.type));
      const info = document.createElement('div'); info.style.flex = '1';
      let html = `<div class="card-title">${d.name}${b.state === 'occupied' ? ' <span class="occ">OCCUPIED</span>' : b.state === 'crate' ? ' <span class="occ">STOLEN</span>' : b.recover > 0 ? ' <span class="rec">recovering</span>' : b.shut > 0 ? ' <span class="occ">SHUT</span>' : b.paint > 0 ? ' <span class="occ">PAINTED</span>' : ''}</div>`;
      html += `<div class="bar"><div style="width:${100 * b.hp / b.maxHp}%"></div></div><div class="stats"><div><span>HP</span><b>${Math.round(b.hp)}/${b.maxHp}</b></div>`;
      if (b.state === 'enemy') html += `<div style="grid-column:1/3"><span>Loot</span><b>${Object.entries(d.loot).map(([k, v]) => v + ' ' + k).join(', ')}</b></div>`;
      if (d.range) html += `<div><span>Damage</span><b>${d.dmg}</b></div><div><span>Range</span><b>${d.range}</b></div>`;
      if (d.income && b.state === 'player') html += `<div style="grid-column:1/3"><span>Per day</span><b>${Object.entries(d.income).map(([k, v]) => (k === 'wood' && b.type === 'mill' ? v + b.treeAdj * d.treeBonus : v) + ' ' + k).join(', ')}</b></div>`;
      html += '</div>'; info.innerHTML = html; head.appendChild(info); c.appendChild(head);
      const body = document.createElement('div'); let bh = `<div class="desc">${d.desc}</div>`;
      const flags = []; if (b.inCourt) flags.push('court'); if (b.inChapel) flags.push('chapel'); if (b.inDeed) flags.push('deed' + (b.deedUsed ? ' (used)' : '')); if (b.inWarehouse) flags.push('warehouse +20%'); if (b.inLodge) flags.push('lodge');
      if (flags.length) bh += `<div class="small">Auras: ${flags.join(', ')}</div>`;
      if (b.state === 'occupied') bh += `<div class="small occ">Recapture ${Math.round(100 * b.recap / RECAPTURE_TIME)}% — stand a unit next to it. Draining Treasury and spawning Activists.</div>`;
      if (b.state === 'crate') bh += `<div class="small occ">${b.gold} gold inside. Stand a unit next to it for ${CRATE_TIME}s.</div>`;
      if (b.state === 'enemy') bh += `<div class="small occ">Select units and right-click it to raid. Backlash spawns campers; Momentum +5.</div>`;
      bh += '<div class="btns">';
      if (b.type === 'townhall') { for (const t of ['minuteman', 'marksman']) bh += `<button onclick="trainUnit('${t}')" title="${UNITS[t].desc}">${UNITS[t].name} — ${UNITS[t].cost.gold}g</button>`; bh += `<button onclick="UI.toggleTech()">Tech (T)</button><button onclick="warLevy()">War Levy (L)</button>`; }
      if (b.type === 'militiahall') { bh += `<button onclick="musterMilitia(1)">Muster Militia (M) — ${UNITS.militia.cost.gold}g${G.muster.queue ? ' [' + G.muster.queue + ']' : ''}</button><button onclick="musterMilitia(5)">×5</button>`; for (const t of ['posse', 'veteran']) bh += `<button onclick="trainUnit('${t}')" title="${UNITS[t].desc}">${UNITS[t].name} — ${UNITS[t].cost.gold}g</button>`; }
      if (b.type === 'workshop') bh += `<button onclick="trainUnit('fieldpiece')" title="${UNITS.fieldpiece.desc}">Field Piece — ${UNITS.fieldpiece.cost.gold}g ${UNITS.fieldpiece.cost.iron}i</button>`;
      if (b.state === 'player' && b.hp < b.maxHp) { const rc = repairCost(b); bh += `<button onclick="repairBuilding(G.selected[0])">Repair (R) — ${Object.entries(rc).map(([k, v]) => v + k[0]).join(' ')}</button>`; }
      if (b.type !== 'townhall' && b.type !== 'vault' && b.state !== 'enemy') bh += `<button class="danger" onclick="demolishBuilding(G.selected[0]);G.selected=[]">${b.state === 'occupied' ? 'Scuttle' : 'Demolish'} (Del)</button>`;
      bh += '</div>'; body.innerHTML = bh; c.appendChild(body); return;
    }
    if (sel.length === 1 && sel[0].kind === 'u') {
      const u = sel[0]; const d = u.def; const head = document.createElement('div'); head.className = 'card-head'; head.appendChild(portrait('u', u.type));
      const info = document.createElement('div'); info.style.flex = '1';
      info.innerHTML = `<div class="card-title">${d.name}</div><div class="card-sub">${d.title ? d.title + ' · ' : ''}${u.side === 'enemy' ? 'THE WAVE' : d.range > 4 ? 'Ranged' : 'Line'}${u.side === 'player' ? ' · ' + u.state : ''}</div><div class="bar"><div style="width:${100 * u.hp / u.maxHp}%"></div></div>` +
        `<div class="stats"><div><span>★ Health</span><b>${Math.round(u.hp)}/${u.maxHp}${!u.persistUsed ? ' ×2' : ''}</b></div><div><span>Attack</span><b>${d.dmg}${d.bdmg !== undefined && d.bdmg !== d.dmg ? ' / ' + d.bdmg : ''}</b></div><div><span>Range</span><b>${d.range}</b></div><div><span>Armor</span><b>${u.armor || 0}</b></div></div>`;
      head.appendChild(info); c.appendChild(head);
      const body = document.createElement('div'); let bh = `<div class="desc">${d.desc}</div>`;
      if (u.type === 'militia') bh += `<div class="small">Upkeep ${(d.upkeep * DAY_LENGTH).toFixed(0)} gold/day while mobilized.</div><div class="btns"><button onclick="UI.dismiss()">Dismiss (K)</button></div>`;
      body.innerHTML = bh; c.appendChild(body); return;
    }
    const counts = {}; for (const s of sel) counts[s.def.name] = (counts[s.def.name] || 0) + 1;
    c.innerHTML = `<div class="card-title">${sel.length} selected</div><div class="small">${Object.entries(counts).map(([k, v]) => v + '× ' + k).join(', ')}</div>` + (sel.some(s => s.type === 'militia') ? `<div class="btns"><button onclick="UI.dismiss()">Dismiss militia (K)</button></div>` : '');
  },
};
