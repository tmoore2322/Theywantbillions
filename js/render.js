'use strict';
// ============================================================
// Isometric renderer. Placeholder art built from primitives,
// palette per art bible: barn red, chapel white, pine, lamp gold;
// the Wave in purple/pink neon.
// ============================================================
const R = { cam: { x: 0, y: 0, zoom: 1 }, W: 0, H: 0, terrainCanvas: null, hoverTile: null };

function worldOf(px, py) { return [(px - py) * TILE_W / 2, (px + py) * TILE_H / 2]; }
function screenToWorld(sx, sy) { return [(sx - R.W / 2) / R.cam.zoom + R.cam.x, (sy - R.H / 2) / R.cam.zoom + R.cam.y]; }
function worldToTile(wx, wy) { return [(wx / (TILE_W / 2) + wy / (TILE_H / 2)) / 2, (wy / (TILE_H / 2) - wx / (TILE_W / 2)) / 2]; }
function screenToTile(sx, sy) { const [wx, wy] = screenToWorld(sx, sy); return worldToTile(wx, wy); }
function worldToScreen(wx, wy) { return [(wx - R.cam.x) * R.cam.zoom + R.W / 2, (wy - R.cam.y) * R.cam.zoom + R.H / 2]; }

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = clamp(Math.round(r * f), 0, 255); g = clamp(Math.round(g * f), 0, 255); b = clamp(Math.round(b * f), 0, 255);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
function diamond(ctx, X, Y) { ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + TILE_W / 2, Y + TILE_H / 2); ctx.lineTo(X, Y + TILE_H); ctx.lineTo(X - TILE_W / 2, Y + TILE_H / 2); ctx.closePath(); }

function buildTerrainCanvas() {
  const c = document.createElement('canvas');
  const W = (MAP_W + MAP_H) * TILE_W / 2, H = (MAP_W + MAP_H) * TILE_H / 2;
  c.width = W; c.height = H; const g = c.getContext('2d');
  R.terrainOX = MAP_H * TILE_W / 2;
  g.translate(R.terrainOX, 0);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const v = G.terrain[y * MAP_W + x];
    const [X, Y] = worldOf(x, y); const odd = (x + y) & 1;
    let col;
    if (v === TER.WATER) col = odd ? '#2f5f8a' : '#31648f';
    else if (v === TER.ROCK) col = odd ? '#6b6b66' : '#75756f';
    else if (v === TER.STONE) col = odd ? '#8f8b7f' : '#9a9588';
    else if (v === TER.IRON) col = odd ? '#6e6a78' : '#787384';
    else if (v === TER.TREE) col = odd ? '#4d6b30' : '#527334';
    else col = odd ? '#5f7f3a' : '#668a3f';
    g.fillStyle = col; diamond(g, X, Y); g.fill();
    if (v === TER.STONE) { g.fillStyle = '#c9c4b4'; g.beginPath(); g.ellipse(X - 8, Y + 14, 6, 3, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(X + 9, Y + 19, 7, 3.5, 0, 0, 7); g.fill(); }
    if (v === TER.IRON) { g.fillStyle = '#b8b2c8'; g.beginPath(); g.moveTo(X - 10, Y + 18); g.lineTo(X - 4, Y + 8); g.lineTo(X + 4, Y + 12); g.lineTo(X + 10, Y + 20); g.closePath(); g.fill(); g.fillStyle = '#d9a35a'; g.fillRect(X - 2, Y + 12, 3, 3); g.fillRect(X + 5, Y + 16, 2, 2); }
    if (v === TER.ROCK) { g.fillStyle = '#8a8a84'; g.beginPath(); g.moveTo(X - 18, Y + 22); g.lineTo(X - 6, Y + 4); g.lineTo(X + 10, Y + 10); g.lineTo(X + 20, Y + 22); g.closePath(); g.fill(); g.fillStyle = '#55554f'; g.beginPath(); g.moveTo(X + 10, Y + 10); g.lineTo(X + 20, Y + 22); g.lineTo(X - 18, Y + 22); g.lineTo(X - 6, Y + 18); g.closePath(); g.fill(); }
    if (v === TER.WATER && ((x * 7 + y * 3) % 5 === 0)) { g.strokeStyle = '#7fb0d8'; g.lineWidth = 1; g.beginPath(); g.moveTo(X - 10, Y + 16); g.lineTo(X + 6, Y + 16); g.stroke(); }
  }
  g.strokeStyle = 'rgba(0,0,0,0.08)'; g.lineWidth = 1;
  for (let y = 0; y <= MAP_H; y++) { const [a, b] = worldOf(0, y), [c2, d] = worldOf(MAP_W, y); g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d); g.stroke(); }
  for (let x = 0; x <= MAP_W; x++) { const [a, b] = worldOf(x, 0), [c2, d] = worldOf(x, MAP_H); g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d); g.stroke(); }
  R.terrainCanvas = c;
}

function drawBlock(ctx, x, y, w, h, hgt, color, opts) {
  opts = opts || {};
  const hp = hgt * 28;
  const [tx, ty] = worldOf(x, y), [rx, ry] = worldOf(x + w, y), [bx, by] = worldOf(x + w, y + h), [lx, ly] = worldOf(x, y + h);
  const top = opts.top || shade(color, 1.15), left = shade(color, 0.85), right = shade(color, 0.65);
  ctx.fillStyle = left; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(bx, by); ctx.lineTo(bx, by - hp); ctx.lineTo(lx, ly - hp); ctx.closePath(); ctx.fill();
  ctx.fillStyle = right; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(rx, ry); ctx.lineTo(rx, ry - hp); ctx.lineTo(bx, by - hp); ctx.closePath(); ctx.fill();
  ctx.fillStyle = top; ctx.beginPath(); ctx.moveTo(tx, ty - hp); ctx.lineTo(rx, ry - hp); ctx.lineTo(bx, by - hp); ctx.lineTo(lx, ly - hp); ctx.closePath(); ctx.fill();
  if (opts.outline) { ctx.strokeStyle = opts.outline; ctx.lineWidth = 1.5; ctx.stroke(); }
  return { tx, ty: ty - hp, rx, ry: ry - hp, bx, by: by - hp, lx, ly: ly - hp, hp };
}

function drawBuilding(ctx, b, zoom, icon) {
  const def = b.def; const occ = b.state === 'occupied';
  const color = occ ? '#6a3d9a' : def.color;
  const outline = (!icon && G.selected && G.selected.includes(b)) ? '#ffe680' : null;
  let f;
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const [X, Y] = worldOf(cx, cy);
  if (def.gate) {
    drawBlock(ctx, b.x, b.y, 1, 1, 0.25, '#6b4a24');
    ctx.fillStyle = occ ? '#6a3d9a' : def.trim; ctx.fillRect(X - 3, Y - 44, 6, 40);
    ctx.fillStyle = '#4a3216'; ctx.fillRect(X - 26, Y - 46, 52, 8);
    ctx.fillStyle = '#3b2a12'; ctx.fillRect(X - 26, Y - 20, 8, 20); ctx.fillRect(X + 18, Y - 20, 8, 20);
    f = { tx: X, ty: Y - 46, hp: 46 };
  } else if (def.kind === 'trap') {
    f = drawBlock(ctx, b.x, b.y, 1, 1, 0.12, '#5a4a2a');
    ctx.fillStyle = '#d9c7a3'; for (let i = 0; i < 5; i++) { const px = X - 16 + i * 8, py = Y + 6 - (i % 2) * 6; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 3, py - 14); ctx.lineTo(px + 6, py); ctx.closePath(); ctx.fill(); }
  } else if (def.kind === 'enemy') {
    f = drawBlock(ctx, b.x, b.y, b.w, b.h, 0.15, '#3a2a3a', { outline });
    const top = Y - f.hp;
    const tent = (tx, ty, col) => { const [px, py] = worldOf(tx, ty); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(px, py - 26); ctx.lineTo(px + 14, py); ctx.lineTo(px - 14, py); ctx.closePath(); ctx.fill(); ctx.fillStyle = shade(col, 0.6); ctx.beginPath(); ctx.moveTo(px, py - 26); ctx.lineTo(px + 14, py); ctx.lineTo(px + 2, py); ctx.closePath(); ctx.fill(); };
    tent(b.x + 0.8, b.y + 2.4, '#6a3d9a'); tent(b.x + 2.3, b.y + 1.0, '#8a4fb0'); tent(b.x + 2.4, b.y + 2.6, '#4a5a8a');
    ctx.fillStyle = '#8a6a3a'; ctx.fillRect(f.lx + 30, f.ly - 12, 22, 10); ctx.fillStyle = '#ff7a4d'; ctx.beginPath(); ctx.arc(f.lx + 41, f.ly - 16, 4 + Math.sin(G.time * 6) * 1.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#c9b48a'; ctx.fillRect(X - 1, top - 44, 2, 40); ctx.fillStyle = '#ff5fd0'; ctx.fillRect(X + 1, top - 44, 20, 12); ctx.fillStyle = '#2a1040'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'left'; ctx.fillText('NO', X + 3, top - 35);
    ctx.fillStyle = '#ffe14d'; for (let i = 0; i < 3; i++) ctx.fillRect(f.lx + 8 + i * 7, f.ly + 2, 3, 6);
    if (b.hp < b.maxHp) { const p = b.hp / b.maxHp; ctx.fillStyle = '#111'; ctx.fillRect(X - 24, top - 52, 48, 4); ctx.fillStyle = '#ff5fd0'; ctx.fillRect(X - 24, top - 52, 48 * p, 4); }
    if (zoom >= 0.75) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.fillRect(X - 36, Y + 10, 72, 12); ctx.fillStyle = '#ffb0e8'; ctx.fillText('Encampment', X, Y + 19); }
    return f;
  } else if (def.kind === 'crate' || b.state === 'crate') {
    f = drawBlock(ctx, b.x + 0.2, b.y + 0.2, 0.6, 0.6, 0.6, '#a8843a', { outline });
    ctx.fillStyle = '#5a4a12'; ctx.fillRect(X - 10, Y - 14, 20, 3); ctx.fillStyle = '#ffe680'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('$', X, Y - 4);
    if (b.recap > 0) { const p = b.recap / CRATE_TIME; ctx.fillStyle = '#222'; ctx.fillRect(X - 14, Y + 4, 28, 4); ctx.fillStyle = '#c9a227'; ctx.fillRect(X - 14, Y + 4, 28 * p, 4); }
  } else if (def.kind === 'defense' && !def.range) {
    f = drawBlock(ctx, b.x, b.y, 1, 1, def.height, color, { outline });
    if (b.type === 'wall_wood') { ctx.strokeStyle = shade(color, 0.5); ctx.lineWidth = 1; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(X + i * 6, Y - 2); ctx.lineTo(X + i * 6, Y - f.hp - 2); ctx.stroke(); } }
    else { ctx.strokeStyle = shade(color, 0.6); ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(X - 14, Y - 6 - i * 7); ctx.lineTo(X + 14, Y - 6 - i * 7); ctx.stroke(); } }
  } else if (def.range) {
    f = drawBlock(ctx, b.x + 0.15, b.y + 0.15, 0.7, 0.7, def.height, color, { outline });
    ctx.fillStyle = shade(def.trim, 1.2);
    for (let i = 0; i < 3; i++) ctx.fillRect(f.lx + 6 + i * 10, f.ly - 8, 5, 8);
    ctx.fillStyle = '#c9a227'; ctx.fillRect(f.tx - 2, f.ty - 22, 4, 22); ctx.fillStyle = '#b23a2f'; ctx.fillRect(f.tx + 2, f.ty - 22, 12, 8);
    if (b.deaf > 0) { ctx.fillStyle = '#ff5fd0'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('DEAF', f.tx, f.ty - 26); }
  } else {
    const topCol = occ ? '#8a55c2' : (b.type === 'cottage' ? '#7a2f26' : b.type === 'farm' ? '#b7c55a' : undefined);
    f = drawBlock(ctx, b.x, b.y, b.w, b.h, def.height, color, { outline, top: topCol });
    const top = Y - f.hp;
    if (b.type === 'townhall') {
      const [lx, ly] = worldOf(b.x + 0.5, b.y + b.h); const fy = ly - f.hp * 0.55;
      ctx.fillStyle = '#f3e9cf'; ctx.beginPath(); ctx.arc(lx + 22, fy, 12, 0, 7); ctx.fill();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(lx + 22, fy, 12, 0, 7); ctx.stroke();
      const ang = (1 - G.dayTimer / DAY_LENGTH) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(lx + 22, fy); ctx.lineTo(lx + 22 + Math.cos(ang) * 9, fy + Math.sin(ang) * 9); ctx.stroke();
      drawBlock(ctx, b.x + 1.2, b.y + 1.2, 0.6, 0.6, def.height + 0.5, '#f3e9cf');
      ctx.fillStyle = '#c9a227'; ctx.fillRect(X - 1, top - 60, 2, 44); ctx.fillStyle = '#b23a2f'; ctx.fillRect(X + 1, top - 60, 16, 9); ctx.fillStyle = '#3b4a6b'; ctx.fillRect(X + 1, top - 60, 6, 9);
    } else if (b.type === 'chapel') {
      ctx.fillStyle = '#f3f0e6'; ctx.fillRect(X - 3, top - 26, 6, 26); ctx.fillStyle = '#9a3a2f'; ctx.fillRect(X - 1.5, top - 40, 3, 14); ctx.fillRect(X - 6, top - 36, 12, 3);
    } else if (b.type === 'cottage') {
      ctx.fillStyle = '#5a4a3a'; ctx.fillRect(X + 8, top - 14, 6, 14);
      ctx.fillStyle = '#f3e9cf'; ctx.fillRect(f.lx + 10, f.ly + 6, 8, 8); ctx.fillRect(f.bx + 10, f.by + 6, 8, 8);
    } else if (b.type === 'farm') {
      ctx.strokeStyle = '#6b7f2c'; ctx.lineWidth = 2; for (let i = 1; i < b.w * 2; i++) { const [a, c] = worldOf(b.x + i / 2, b.y), [d, e] = worldOf(b.x + i / 2, b.y + b.h); ctx.beginPath(); ctx.moveTo(a, c - f.hp); ctx.lineTo(d, e - f.hp); ctx.stroke(); }
    } else if (b.type === 'mill') {
      ctx.strokeStyle = '#d9d0b0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X, top - 10, 12, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X - 12, top - 10); ctx.lineTo(X + 12, top - 10); ctx.moveTo(X, top - 22); ctx.lineTo(X, top + 2); ctx.stroke();
    } else if (b.type === 'quarry') {
      ctx.fillStyle = '#c9c4b4'; ctx.beginPath(); ctx.ellipse(X - 10, top - 4, 9, 5, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(X + 8, top - 8, 7, 4, 0, 0, 7); ctx.fill();
    } else if (b.type === 'mine') {
      ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.moveTo(X - 12, top + 4); ctx.lineTo(X, top - 14); ctx.lineTo(X + 12, top + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a6a3a'; ctx.fillRect(X - 14, top - 16, 28, 3); ctx.fillStyle = '#b8b2c8'; ctx.fillRect(X + 12, top - 8, 6, 6);
    } else if (b.type === 'workshop') {
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(X + 6, top - 30, 8, 30); ctx.fillStyle = '#c9a227'; ctx.beginPath(); ctx.arc(X - 8, top - 6, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#5a4a3a'; ctx.beginPath(); ctx.arc(X - 8, top - 6, 3, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(200,200,200,0.5)'; ctx.beginPath(); ctx.arc(X + 10, top - 38 - (G.time * 8 % 10), 5, 0, 7); ctx.fill();
    } else if (b.type === 'warehouse') {
      ctx.fillStyle = '#5a3a1a'; for (let i = 0; i < 3; i++) ctx.fillRect(f.lx + 8 + i * 16, f.ly - 14, 10, 14);
    } else if (b.type === 'militiahall') {
      ctx.fillStyle = '#c9a227'; ctx.fillRect(X - 1, top - 36, 2, 36); ctx.fillStyle = '#3b4a6b'; ctx.fillRect(X + 1, top - 36, 14, 8); ctx.fillStyle = '#b23a2f'; ctx.fillRect(X + 1, top - 28, 14, 4);
    } else if (b.type === 'courthouse') {
      ctx.fillStyle = '#f3f0e6'; for (let i = -1; i <= 1; i++) ctx.fillRect(f.lx + 26 + i * 12, f.ly - 24, 4, 22);
      ctx.fillStyle = '#3b4a6b'; ctx.fillRect(f.lx + 10, f.ly - 30, 42, 5);
    } else if (b.type === 'deedoffice') {
      ctx.fillStyle = '#f3e9cf'; ctx.fillRect(X - 10, top - 18, 20, 14); ctx.fillStyle = '#5a4a12'; for (let i = 0; i < 3; i++) ctx.fillRect(X - 7, top - 15 + i * 4, 14, 1.5);
      ctx.fillStyle = '#b23a2f'; ctx.beginPath(); ctx.arc(X + 6, top - 8, 3, 0, 7); ctx.fill();
    } else if (b.type === 'printshop') {
      ctx.fillStyle = '#1a1a2a'; ctx.fillRect(X - 14, top - 16, 28, 12); ctx.fillStyle = '#f3f0e6'; ctx.fillRect(X - 12, top - 22, 24, 6); ctx.fillStyle = '#1a1a2a'; for (let i = 0; i < 4; i++) ctx.fillRect(X - 10 + i * 6, top - 20, 4, 1); ctx.fillRect(X - 10, top - 18, 12, 1);
    } else if (b.type === 'school') {
      ctx.fillStyle = '#b23a2f'; ctx.fillRect(X - 2, top - 30, 4, 30); ctx.fillStyle = '#c9a227'; ctx.beginPath(); ctx.arc(X, top - 32, 5, 0, 7); ctx.fill();
      ctx.fillStyle = '#f3e9cf'; ctx.fillRect(f.lx + 8, f.ly + 4, 7, 9); ctx.fillRect(f.lx + 22, f.ly + 4, 7, 9); ctx.fillRect(f.bx + 8, f.by + 4, 7, 9);
    } else if (b.type === 'lodge') {
      ctx.fillStyle = '#c9a227'; ctx.fillRect(X - 1, top - 34, 2, 34); ctx.fillStyle = '#7a5230'; ctx.beginPath(); ctx.moveTo(X + 1, top - 34); ctx.lineTo(X + 16, top - 30); ctx.lineTo(X + 1, top - 26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f3e9cf'; ctx.beginPath(); ctx.arc(X + 7, top - 30, 2, 0, 7); ctx.fill();
    } else if (b.type === 'vault') {
      ctx.fillStyle = '#5a4a12'; ctx.fillRect(X - 6, top - 8, 12, 12); ctx.fillStyle = '#f3e9cf'; ctx.beginPath(); ctx.arc(X, top - 2, 3, 0, 7); ctx.fill();
    }
    if (b.shut > 0) { ctx.fillStyle = '#2a8a3a'; ctx.fillRect(X - 26, top - 46, 52, 12); ctx.fillStyle = '#e8ffe8'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('CLOSED FOR THE PLANET', X, top - 37); }
  }
  if (icon) return f;
  if (b.paint > 0 && !occ) {
    ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = '#ff5fd0'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
    ctx.translate(X, Y - (f.hp || 0) * 0.4); ctx.rotate(0.2); ctx.fillText('EAT THE RICH', 0, 0); ctx.fillStyle = '#5ff0ff'; ctx.fillRect(-14, 3, 28, 2); ctx.restore();
  }
  if (occ) {
    ctx.save(); ctx.translate(X, Y - 10 - (f.hp || 0) * 0.5); ctx.rotate(-0.15);
    ctx.fillStyle = '#ff5fd0'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillText('OCCUPIED', 0, 0);
    if (b.skin && zoom >= 0.75) { ctx.font = 'bold 9px monospace'; ctx.fillText(b.skin.toUpperCase(), 0, 11); }
    ctx.beginPath(); ctx.arc(0, -16, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#2a1040'; ctx.fillRect(-2, -20, 4, 8);
    ctx.restore();
    if (b.recap > 0) { const p = b.recap / RECAPTURE_TIME; ctx.fillStyle = '#222'; ctx.fillRect(X - 18, Y + 4, 36, 5); ctx.fillStyle = '#c9a227'; ctx.fillRect(X - 18, Y + 4, 36 * p, 5); }
  }
  if (zoom >= 0.75 && b.w >= 2 && !occ) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    const label = def.name + (b.recover > 0 ? ' (recovering)' : '');
    const wdt = ctx.measureText(label).width + 6; ctx.fillRect(X - wdt / 2, Y + 10, wdt, 12);
    ctx.fillStyle = '#f3e9cf'; ctx.fillText(label, X, Y + 19);
  }
  if (b.hp < b.maxHp && b.state === 'player') {
    const p = b.hp / b.maxHp; const wdt = 12 + b.w * 8; const by = Y - (f.hp || 0) - 8 - TILE_H * b.h * 0.5;
    ctx.fillStyle = '#111'; ctx.fillRect(X - wdt / 2, by, wdt, 4);
    ctx.fillStyle = p > 0.5 ? '#6fbf4a' : p > 0.25 ? '#e0b030' : '#d23c2f'; ctx.fillRect(X - wdt / 2, by, wdt * p, 4);
  }
  if (b.shot > 0 && b.shotX !== undefined) { const [ex, ey] = worldOf(b.shotX, b.shotY); ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X, Y - (f.hp || 0)); ctx.lineTo(ex, ey - 8); ctx.stroke(); }
  return f;
}

function drawTree(ctx, x, y) {
  const [X, Y] = worldOf(x + 0.5, y + 0.5);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(X, Y + 2, 12, 5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#4a3218'; ctx.fillRect(X - 2, Y - 14, 4, 16);
  const v = ((x * 31 + y * 17) % 3);
  ctx.fillStyle = v === 0 ? '#2f5a2a' : v === 1 ? '#376a30' : '#2b4f25';
  ctx.beginPath(); ctx.moveTo(X, Y - 42); ctx.lineTo(X + 13, Y - 16); ctx.lineTo(X - 13, Y - 16); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(X, Y - 32); ctx.lineTo(X + 11, Y - 8); ctx.lineTo(X - 11, Y - 8); ctx.closePath(); ctx.fill();
}

function person(ctx, X, Y, coat, hair, opts) { // small biped
  opts = opts || {};
  ctx.fillStyle = coat; ctx.fillRect(X - 5, Y - 16, 10, 14);
  if (opts.sash) { ctx.fillStyle = opts.sash; ctx.fillRect(X - 5, Y - 12, 10, 3); }
  if (opts.trim) { ctx.fillStyle = opts.trim; ctx.fillRect(X - 5, Y - 16, 10, 3); }
  ctx.fillStyle = opts.skin || '#e8c8a8'; ctx.beginPath(); ctx.arc(X, Y - 19, 4, 0, 7); ctx.fill();
  if (hair) { ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(X, Y - 21, 4.2, Math.PI, 2 * Math.PI); ctx.fill(); }
  if (opts.hat) { ctx.fillStyle = opts.hat; ctx.fillRect(X - 7, Y - 23, 14, 2); ctx.fillRect(X - 3, Y - 26, 6, 3); }
  if (opts.tricorn) { ctx.fillStyle = opts.tricorn; ctx.fillRect(X - 6, Y - 23, 12, 2); ctx.beginPath(); ctx.moveTo(X - 5, Y - 23); ctx.lineTo(X, Y - 28); ctx.lineTo(X + 5, Y - 23); ctx.closePath(); ctx.fill(); }
  if (opts.gun) { ctx.strokeStyle = opts.gun; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X + 5, Y - 4); ctx.lineTo(X + 11, Y - 25); ctx.stroke(); }
}

// Static unit bodies are rendered once per (type, variant) into a sprite canvas; dynamic
// bits (rings, bars, channel text, shots) are drawn on top each frame.
const SPRITES = new Map(); const SPR_W = 100, SPR_H = 120, SPR_OX = 50, SPR_OY = 100;
function unitVariant(u) { return u.type + '|' + (u.type === 'activist' ? u.hair + (u.buffed ? 'b' : '') : ''); }
function drawUnitBody(ctx, u, X, Y, icon) {
  const t = u.type;
  if (t === 'activist') {
    person(ctx, X, Y, u.buffed ? '#9a4fd0' : '#7a3fb0', u.hair);
    ctx.fillStyle = '#c9b48a'; ctx.fillRect(X + 5, Y - 30, 1.5, 16); ctx.fillStyle = '#5a2c8a'; ctx.fillRect(X + 3, Y - 34, 9, 7);
  } else if (t === 'organizer') {
    person(ctx, X, Y, '#3d6b3a', '#2a1a10');
    ctx.fillStyle = '#f3f0e6'; ctx.fillRect(X + 5, Y - 12, 5, 7); ctx.strokeStyle = '#3d6b3a'; ctx.lineWidth = 1; ctx.strokeRect(X + 5, Y - 12, 5, 7);
  } else if (t === 'manchild') {
    ctx.fillStyle = '#4f6fbf'; ctx.beginPath(); ctx.ellipse(X, Y - 14, 14, 16, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8c8a8'; ctx.beginPath(); ctx.arc(X, Y - 30, 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#7f9fe0'; ctx.beginPath(); ctx.arc(X - 5, Y - 35, 3, 0, 7); ctx.arc(X + 5, Y - 35, 3, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffe14d'; ctx.fillRect(X + 12, Y - 26, 5, 9);
    ctx.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) ctx.fillRect(X - 10 + i * 6, Y - 20 + (i % 2) * 8, 2, 2);
  } else if (t === 'goon') {
    person(ctx, X, Y, '#111116', null, { skin: '#111116' });
    ctx.fillStyle = '#2a2a30'; ctx.fillRect(X - 7, Y - 14, 3, 8);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X + 4, Y - 6); ctx.lineTo(X + 10, Y - 30); ctx.stroke();
    ctx.fillStyle = '#111116'; ctx.beginPath(); ctx.moveTo(X + 2, Y - 30); ctx.lineTo(X + 18, Y - 30); ctx.lineTo(X + 10, Y - 37); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d23c2f'; ctx.fillRect(X - 4, Y - 27, 2, 2);
  } else if (t === 'agitprop') {
    drawBlock(ctx, u.x - 0.45, u.y - 0.3, 0.9, 0.6, 0.7, '#6a3d9a');
    ctx.fillStyle = '#5ff0ff'; ctx.fillRect(X - 6, Y - 30, 12, 8); ctx.fillStyle = '#c9b48a'; ctx.fillRect(X + 8, Y - 34, 2, 12); ctx.fillStyle = '#eee'; ctx.beginPath(); ctx.moveTo(X + 9, Y - 34); ctx.lineTo(X + 16, Y - 40); ctx.lineTo(X + 16, Y - 28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff5fd0'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'; ctx.fillText('RIGGED', X - 6, Y - 10);
  } else if (t === 'haes') {
    // reinforced mobility scooter with a battering-ram bumper
    ctx.fillStyle = '#5a1a1a'; ctx.fillRect(X - 20, Y - 10, 40, 8);
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(X - 14, Y - 3, 5, 0, 7); ctx.arc(X + 14, Y - 3, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#8f8f8f'; ctx.fillRect(X + 18, Y - 22, 8, 20); ctx.fillStyle = '#c9c4b4'; ctx.fillRect(X + 22, Y - 26, 6, 4); ctx.fillRect(X + 22, Y - 8, 6, 4); // ram plate
    ctx.fillStyle = '#c9c4b4'; ctx.fillRect(X + 12, Y - 38, 2, 28); ctx.fillRect(X + 6, Y - 39, 14, 3);
    ctx.fillStyle = '#ff7ab8'; ctx.beginPath(); ctx.ellipse(X - 3, Y - 20, 16, 15, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('EVERY', X - 3, Y - 22); ctx.fillText('BODY', X - 3, Y - 16);
    ctx.fillStyle = '#e8c8a8'; ctx.beginPath(); ctx.arc(X - 3, Y - 39, 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#5ff0ff'; ctx.fillRect(X - 9, Y - 43, 12, 2.5);
    ctx.fillStyle = '#e8c8a8'; ctx.fillRect(X + 4, Y - 30, 8, 3);
    ctx.fillStyle = '#c9b48a'; ctx.fillRect(X - 22, Y - 50, 1.5, 42); ctx.fillStyle = '#a6ff4d'; ctx.fillRect(X - 21, Y - 50, 14, 8); ctx.fillStyle = '#1a2a10'; ctx.font = 'bold 5px sans-serif'; ctx.fillText('HAES', X - 14, Y - 44);
  } else if (t === 'seizure') {
    for (const dx of [-6, 6]) { person(ctx, X + dx, Y, '#2d2d33', '#3a2a1a', { sash: '#d23c2f' }); ctx.fillStyle = '#8a6a3a'; ctx.fillRect(X + dx + 4, Y - 8, 5, 6); }
    ctx.fillStyle = '#c9b48a'; ctx.fillRect(X - 3, Y - 24, 6, 2);
  } else if (t === 'nevertheless') {
    person(ctx, X, Y, '#ff8fd8', '#5a3a2a', { hat: '#ff5fd0' });
    ctx.fillStyle = '#eee'; ctx.beginPath(); ctx.moveTo(X + 5, Y - 18); ctx.lineTo(X + 14, Y - 24); ctx.lineTo(X + 14, Y - 12); ctx.closePath(); ctx.fill();
  } else if (t === 'carebear') {
    // adult in a pastel bear fursuit: round body, big ears, muzzle, heart, tail, lanyard
    ctx.fillStyle = '#c9a0e8'; ctx.beginPath(); ctx.ellipse(X - 14, Y - 6, 5, 4, 0, 0, 7); ctx.fill(); // tail
    ctx.fillStyle = '#b48ad8'; ctx.beginPath(); ctx.ellipse(X, Y - 14, 13, 15, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8d0f8'; ctx.beginPath(); ctx.ellipse(X, Y - 10, 7, 8, 0, 0, 7); ctx.fill(); // belly patch
    ctx.fillStyle = '#d23c2f'; ctx.beginPath(); ctx.moveTo(X, Y - 6); ctx.lineTo(X - 5, Y - 12); ctx.lineTo(X, Y - 15); ctx.lineTo(X + 5, Y - 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b48ad8'; ctx.beginPath(); ctx.arc(X - 9, Y - 33, 5, 0, 7); ctx.arc(X + 9, Y - 33, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#e8d0f8'; ctx.beginPath(); ctx.arc(X - 9, Y - 33, 2.5, 0, 7); ctx.arc(X + 9, Y - 33, 2.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#b48ad8'; ctx.beginPath(); ctx.arc(X, Y - 28, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8d0f8'; ctx.beginPath(); ctx.ellipse(X, Y - 25, 4.5, 3.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(X, Y - 26.5, 1.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillRect(X - 4, Y - 31, 2, 2); ctx.fillRect(X + 2, Y - 31, 2, 2);
    ctx.fillStyle = '#ffe14d'; ctx.fillRect(X - 1, Y - 20, 2, 8); ctx.fillStyle = '#f3e9cf'; ctx.fillRect(X - 3, Y - 12, 6, 4); // lanyard + badge
    ctx.fillStyle = '#c9a0e8'; ctx.beginPath(); ctx.arc(X - 12, Y - 16, 4, 0, 7); ctx.arc(X + 12, Y - 16, 4, 0, 7); ctx.fill(); // paws
  } else if (t === 'sernie') {
    drawBlock(ctx, u.x - 0.6, u.y - 0.5, 1.2, 1.0, 0.8, '#b08a2a');
    ctx.fillStyle = '#5a4a12'; ctx.fillRect(X - 8, Y - 40, 16, 16); ctx.fillStyle = '#c9a227'; ctx.beginPath(); ctx.arc(X, Y - 32, 5, 0, 7); ctx.fill();
    person(ctx, X, Y - 26, '#6a4a2a', '#eee', { skin: '#e8c8a8' });
  } else if (t === 'liz') {
    drawBlock(ctx, u.x - 0.6, u.y - 0.4, 1.2, 0.8, 0.6, '#5a3a1a');
    ctx.fillStyle = '#f3e9cf'; ctx.fillRect(X - 22, Y - 52, 14, 18); ctx.fillRect(X + 8, Y - 52, 14, 18); ctx.fillStyle = '#111'; ctx.font = 'bold 5px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('5 YEAR', X - 15, Y - 44); ctx.fillText('PLAN', X - 15, Y - 38); ctx.fillText('EQUITY', X + 15, Y - 44);
    person(ctx, X, Y - 16, '#2a2a30', '#2a1a10');
  } else if (t === 'alex') {
    drawBlock(ctx, u.x - 0.7, u.y - 0.6, 1.4, 1.2, 0.5, '#3a6a2a');
    ctx.fillStyle = '#2a4a8a'; ctx.fillRect(X - 20, Y - 36, 12, 8); ctx.fillRect(X + 8, Y - 40, 12, 8); ctx.fillStyle = '#eee'; ctx.fillRect(X - 1, Y - 52, 2, 26); ctx.beginPath(); ctx.moveTo(X, Y - 52); ctx.lineTo(X + 10, Y - 46); ctx.lineTo(X - 10, Y - 46); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a8a3a'; ctx.fillRect(X - 18, Y - 14, 36, 8); ctx.fillStyle = '#e8ffe8'; ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GREEN NEW DEAL', X, Y - 8);
  } else if (t === 'warcommunism') {
    drawBlock(ctx, u.x - 0.9, u.y - 0.5, 1.8, 1.0, 1.0, '#1a1a1e');
    ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.arc(X - 16, Y - 26, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.fillRect(X + 14, Y - 60, 8, 30);
    ctx.fillStyle = 'rgba(180,180,180,0.5)'; ctx.beginPath(); ctx.arc(X + 18, Y - 70 - (G.time * 10 % 14), 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#b23a2f'; ctx.fillRect(X - 30, Y - 44, 44, 12); ctx.fillStyle = '#ffe680'; ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('VICTORY THROUGH RATIONS', X - 8, Y - 36);
    ctx.fillStyle = '#8a6a3a'; ctx.fillRect(X - 2, Y - 22, 14, 10); ctx.fillStyle = '#ff7a4d'; ctx.beginPath(); ctx.arc(X + 5, Y - 24, 3, 0, 7); ctx.fill();
  } else if (t === 'gosplan') {
    for (const [dx, dy] of [[-0.6, 0.3], [0.5, 0.35], [-0.5, -0.3], [0.6, -0.25]]) { const [lx, ly] = worldOf(u.x + dx, u.y + dy); ctx.fillStyle = '#2a2a30'; ctx.fillRect(lx - 3, ly - 20, 6, 20); }
    drawBlock(ctx, u.x - 0.8, u.y - 0.7, 1.6, 1.4, 1.6, '#3a3a44');
    ctx.fillStyle = '#c9a227'; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) ctx.fillRect(X - 22 + j * 22, Y - 58 + i * 12, 16, 3);
    ctx.fillStyle = '#f3e9cf'; ctx.fillRect(X - 26, Y - 74, 52, 12); ctx.fillStyle = '#111'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GOSPLAN ANNEX', X, Y - 65);
  } else if (t === 'listening') {
    drawBlock(ctx, u.x - 0.9, u.y - 0.6, 1.8, 1.2, 0.7, '#5a3a1a');
    ctx.fillStyle = '#2a3a8a'; ctx.fillRect(X - 34, Y - 76, 68, 22); ctx.fillStyle = '#f3e9cf'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('YOUR VOICE MATTERS', X, Y - 66); ctx.font = '6px sans-serif'; ctx.fillText('(PLEASE WAIT)', X, Y - 58);
    ctx.fillStyle = '#c9b48a'; ctx.fillRect(X - 30, Y - 54, 2, 24); ctx.fillRect(X + 28, Y - 54, 2, 24);
    for (const dx of [-14, 0, 14]) person(ctx, X + dx, Y - 14, '#2a2a30', '#3a2a1a');
    ctx.fillStyle = '#b23a2f'; ctx.fillRect(X - 20, Y - 6, 40, 4);
  } else if (t === 'committee') {
    drawBlock(ctx, u.x - 1.2, u.y - 1.0, 2.4, 2.0, 0.9, '#4a2a6a');
    ctx.fillStyle = '#6a3d9a'; ctx.fillRect(X - 50, Y - 96, 100, 30); ctx.fillStyle = '#f3e9cf'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('EQUITY', X - 26, Y - 78); ctx.fillText('ALIGNMENT', X + 26, Y - 78);
    ctx.fillStyle = '#c9a227'; ctx.font = '10px sans-serif'; ctx.fillText('⚖', X, Y - 74);
    for (const dx of [-30, -15, 0, 15, 30]) person(ctx, X + dx, Y - 30, '#2a2a30', '#3a2a1a');
    ctx.fillStyle = '#5a3a1a'; ctx.save(); ctx.translate(X + 20, Y - 12); ctx.rotate(-0.6 + Math.sin(G.time * 3) * 0.3); ctx.fillRect(-3, -30, 6, 34); ctx.fillRect(-14, -34, 28, 12); ctx.restore();
    ctx.fillStyle = '#f3e9cf'; ctx.font = 'bold 6px sans-serif'; ctx.fillText('BE KIND', X - 34, Y - 2); ctx.fillText('STAY ALIGNED', X + 30, Y - 2);
    ctx.strokeStyle = 'rgba(255,95,208,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.ellipse(X, Y, u.def.aura * 32, u.def.aura * 16, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  } else if (t === 'homesteader') {
    person(ctx, X, Y, '#8a6a4a', '#5a3a1a', { hat: '#c9b48a' });
    ctx.fillStyle = '#a8843a'; ctx.fillRect(X + 5, Y - 9, 5, 5);
  } else if (t === 'militia') {
    person(ctx, X, Y, '#3b4a6b', null, { trim: '#b23a2f', hat: '#444', gun: '#5a3a1a' });
  } else if (t === 'minuteman') {
    person(ctx, X, Y, '#2f5a2a', null, { hat: '#4a3218', gun: '#3a2a1a' });
  } else if (t === 'marksman') {
    person(ctx, X, Y, '#4a4a3a', null, { hat: '#2a2a1a' });
    ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X + 4, Y - 6); ctx.lineTo(X + 16, Y - 30); ctx.stroke();
  } else if (t === 'posse') {
    person(ctx, X, Y, '#7a5230', null, { tricorn: '#3a2a1a', gun: '#5a3a1a' });
    ctx.fillStyle = '#c9a227'; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5, a2 = a + Math.PI / 5; ctx.lineTo(X - 2 + Math.cos(a) * 3, Y - 12 + Math.sin(a) * 3); ctx.lineTo(X - 2 + Math.cos(a2) * 1.2, Y - 12 + Math.sin(a2) * 1.2); } ctx.closePath(); ctx.fill();
  } else if (t === 'fieldpiece') {
    ctx.fillStyle = '#4a3218'; ctx.beginPath(); ctx.arc(X - 9, Y - 6, 7, 0, 7); ctx.arc(X + 9, Y - 6, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a2a30'; ctx.save(); ctx.translate(X, Y - 14); ctx.rotate(-0.5); ctx.fillRect(-4, -4, 26, 8); ctx.restore();
    ctx.fillStyle = '#5a4a3a'; ctx.fillRect(X - 10, Y - 16, 20, 8);
  } else if (t === 'veteran') {
    person(ctx, X, Y, '#1e2a44', null, { trim: '#c9a227', tricorn: '#111', gun: '#3a2a1a' });
    ctx.fillStyle = '#c9a227'; ctx.fillRect(X - 5, Y - 8, 10, 2);
  }
}
function getSprite(u) {
  const key = unitVariant(u); let c = SPRITES.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = SPR_W; c.height = SPR_H; const g = c.getContext('2d');
  g.translate(SPR_OX, SPR_OY); drawUnitBody(g, Object.assign({}, u, { x: 0, y: 0 }), 0, 0, false);
  SPRITES.set(key, c); return c;
}
function drawUnit(ctx, u, zoom, icon) {
  const [X, Y] = icon ? [0, 0] : worldOf(u.x, u.y);
  const sel = !icon && G.selected && G.selected.includes(u);
  if (sel) { ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(X, Y, 12 + u.def.r * 10, 6 + u.def.r * 5, 0, 0, 7); ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(X, Y, 8 + u.def.r * 10, 4 + u.def.r * 5, 0, 0, 7); ctx.fill();
  if (icon || u.def.lt) drawUnitBody(ctx, u, X, Y, icon);
  else ctx.drawImage(getSprite(u), X - SPR_OX, Y - SPR_OY);
  if (icon) return;
  const t = u.type;
  if (t === 'organizer' && !u.idle) { ctx.strokeStyle = 'rgba(166,255,77,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(X, Y, u.def.buff * 16, u.def.buff * 8, 0, 0, 7); ctx.stroke(); }
  else if (t === 'manchild' && u.tantrumDone) { ctx.fillStyle = '#ff5fd0'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText('!!!', X, Y - 42); }
  else if (t === 'seizure' && u.channel > 0) { const p = u.channel / u.def.channel; ctx.fillStyle = '#111'; ctx.fillRect(X - 14, Y - 34, 28, 4); ctx.fillStyle = '#ff5fd0'; ctx.fillRect(X - 14, Y - 34, 28 * p, 4); ctx.fillStyle = '#ff5fd0'; ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.fillText('NATIONALIZING', X, Y - 37); }
  else if (t === 'nevertheless' && !u.persistUsed) { ctx.strokeStyle = '#ff5fd0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(X, Y, 14, 7, 0, 0, 7); ctx.stroke(); }
  else if (t === 'carebear') { ctx.strokeStyle = 'rgba(180,138,216,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(X, Y, u.def.heals.radius * 32, u.def.heals.radius * 16, 0, 0, 7); ctx.stroke(); }
  else if (t === 'sernie' && u.draining) { ctx.strokeStyle = 'rgba(255,225,77,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(X, Y, u.def.drain.radius * 32, u.def.drain.radius * 16, 0, 0, 7); ctx.stroke(); }
  else if (t === 'homesteader' && u.flee > 0) { ctx.fillStyle = '#ffe14d'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', X, Y - 30); }
  if (u.stun > 0) { ctx.fillStyle = '#ffe14d'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✶✶', X, Y - 34 - u.def.r * 20); }
  if (u.deaf > 0) { ctx.fillStyle = '#ff5fd0'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('DEAF', X, Y - 34); }
  if (u.healed > 0) { ctx.fillStyle = '#6fbf4a'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('+', X + 10, Y - 30 - u.def.r * 20); }
  if (u.hp < u.maxHp || u.def.lt) { const p = u.hp / u.maxHp; const w = u.def.lt ? 40 : 16; const by = Y - 30 - u.def.r * 30; ctx.fillStyle = '#111'; ctx.fillRect(X - w / 2, by, w, 3); ctx.fillStyle = u.side === 'player' ? '#6fbf4a' : '#d23c2f'; ctx.fillRect(X - w / 2, by, w * p, 3);
    if (u.def.lt) { ctx.fillStyle = '#ffe680'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(u.def.name.toUpperCase(), X, by - 3); } }
  if (u.shot > 0 && u.side === 'player' && u.shotX !== undefined && !u.def.scatter) { const [ex, ey] = worldOf(u.shotX, u.shotY); ctx.strokeStyle = u.def.splash ? '#ffb060' : '#ffe680'; ctx.lineWidth = u.def.splash ? 2.5 : 1.2; ctx.beginPath(); ctx.moveTo(X + 8, Y - 20); ctx.lineTo(ex, ey - 12); ctx.stroke(); }
  if (u.shot > 0 && u.side === 'enemy') { ctx.fillStyle = 'rgba(255,95,208,0.6)'; ctx.beginPath(); ctx.arc(X, Y - 12, 6, 0, 7); ctx.fill(); }
}

function drawEffects(ctx) {
  for (const e of G.effects) {
    const [X, Y] = worldOf(e.x, e.y); const p = e.t / (e.life || 1.2);
    ctx.globalAlpha = 1 - p;
    if (e.type === 'death') { ctx.fillStyle = e.color || '#fff'; const n = e.big ? 9 : 5; for (let i = 0; i < n; i++) { const a = i * 6.28 / n + e.t; ctx.fillRect(X + Math.cos(a) * 14 * p, Y - 10 + Math.sin(a) * 7 * p, 3, 3); } }
    else if (e.type === 'flip') { ctx.strokeStyle = '#ff5fd0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(X, Y, 20 + 60 * p, 10 + 30 * p, 0, 0, 7); ctx.stroke(); }
    else if (e.type === 'recap') { ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(X, Y, 20 + 40 * p, 10 + 20 * p, 0, 0, 7); ctx.stroke(); }
    else if (e.type === 'tantrum') { ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(X, Y, 2.6 * 32 * p, 2.6 * 16 * p, 0, 0, 7); ctx.stroke(); }
    else if (e.type === 'megaphone') { ctx.strokeStyle = '#ff5fd0'; ctx.lineWidth = 3; for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(X, Y, 4 * 32 * p * i / 3, 4 * 16 * p * i / 3, 0, 0, 7); ctx.stroke(); } }
    else if (e.type === 'rubble') { ctx.fillStyle = '#555'; ctx.beginPath(); ctx.ellipse(X, Y, 14, 7, 0, 0, 7); ctx.fill(); }
    else if (e.type === 'spawn') { ctx.fillStyle = '#ff5fd0'; ctx.beginPath(); ctx.ellipse(X, Y, 10, 5, 0, 0, 7); ctx.fill(); }
    else if (e.type === 'paint') { ctx.fillStyle = '#ff5fd0'; for (let i = 0; i < 6; i++) { const a = i * 1.05; ctx.beginPath(); ctx.arc(X + Math.cos(a) * 18 * p, Y - 10 + Math.sin(a) * 9 * p, 3, 0, 7); ctx.fill(); } }
    else if (e.type === 'scrub') { ctx.strokeStyle = '#f3f0e6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(X, Y, 8 * 32 * p, 8 * 16 * p, 0, 0, 7); ctx.stroke(); }
    else if (e.type === 'boom') { ctx.fillStyle = '#ffb060'; ctx.beginPath(); ctx.ellipse(X, Y - 4, 1.6 * 32 * (0.3 + p), 1.6 * 16 * (0.3 + p), 0, 0, 7); ctx.fill(); ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(X, Y - 20 - 20 * p, 8 + 10 * p, 0, 7); ctx.fill(); }
    else if (e.type === 'scatter') { const [tx, ty] = worldOf(e.tx, e.ty); ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 1; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(X, Y - 18); ctx.lineTo(tx + i * 8, ty - 10 + i * 3); ctx.stroke(); } }
    else if (e.type === 'persist') { ctx.strokeStyle = '#ff5fd0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(X, Y, 14 + 40 * p, 7 + 20 * p, 0, 0, 7); ctx.stroke(); }
    else if (e.type === 'crate') { ctx.fillStyle = '#ffe680'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('$$$', X, Y - 20 - 20 * p); }
    else if (e.type === 'shut') { ctx.fillStyle = '#2a8a3a'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SHUT FOR THE PLANET', X, Y - 40 - 20 * p); }
    else if (e.type === 'lt') { ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(X, Y, 30 + 80 * p, 15 + 40 * p, 0, 0, 7); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
}

function render(ctx) {
  const W = R.W, H = R.H, z = R.cam.zoom;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0c1220'; ctx.fillRect(0, 0, W, H);
  let shx = 0, shy = 0; if (R.shake > 0) { R.shake -= 1 / 60; const a = R.shake * 6; shx = (Math.random() - 0.5) * a; shy = (Math.random() - 0.5) * a; }
  ctx.setTransform(z, 0, 0, z, W / 2 - R.cam.x * z + shx, H / 2 - R.cam.y * z + shy);
  ctx.imageSmoothingEnabled = z < 1;
  ctx.drawImage(R.terrainCanvas, -R.terrainOX, 0);
  const corners = [screenToTile(0, 0), screenToTile(W, 0), screenToTile(0, H), screenToTile(W, H)];
  const minX = Math.max(0, Math.floor(Math.min(...corners.map(c => c[0])) - 2)), maxX = Math.min(MAP_W - 1, Math.ceil(Math.max(...corners.map(c => c[0])) + 2));
  const minY = Math.max(0, Math.floor(Math.min(...corners.map(c => c[1])) - 2)), maxY = Math.min(MAP_H - 1, Math.ceil(Math.max(...corners.map(c => c[1])) + 4));
  if (UI.placing) {
    const hx = G.hall.x + 1.5, hy = G.hall.y + 1.5; const [cX, cY] = worldOf(hx, hy);
    ctx.strokeStyle = 'rgba(201,162,39,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.ellipse(cX, cY, BUILD_RADIUS * TILE_W / 2, BUILD_RADIUS * TILE_H / 2, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  }
  if (G.selected && G.selected.length === 1 && G.selected[0].kind === 'b') {
    const b = G.selected[0]; const r = b.def.aura || b.def.range;
    if (r) { const [cX, cY] = worldOf(b.x + b.w / 2, b.y + b.h / 2); ctx.strokeStyle = b.def.range ? 'rgba(255,230,128,0.6)' : 'rgba(243,240,230,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cX, cY, r * TILE_W / 2, r * TILE_H / 2, 0, 0, 7); ctx.stroke(); }
  }
  const items = [];
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) { const t = y * MAP_W + x; if (G.terrain[t] === TER.TREE && G.vis[t] > 0) items.push({ d: x + y + 1, k: 't', x, y }); }
  for (const b of G.buildings) { if (b.x + b.w < minX || b.x > maxX || b.y + b.h < minY || b.y > maxY) continue; items.push({ d: b.x + b.w - 1 + b.y + b.h - 1 + 1.01, k: 'b', b }); }
  for (const u of G.units) { if (u.dead) continue; const tx = u.x | 0, ty = u.y | 0; if (tx < minX || tx > maxX || ty < minY || ty > maxY) continue; if (u.side === 'enemy' && G.vis[unitTile(u)] !== 2) continue; items.push({ d: u.x + u.y + (u.def.r > 0.45 ? 0.5 : 0), k: 'u', u }); }
  items.sort((a, b) => a.d - b.d);
  for (const it of items) { if (it.k === 't') drawTree(ctx, it.x, it.y); else if (it.k === 'b') drawBuilding(ctx, it.b, z); else drawUnit(ctx, it.u, z); }
  drawEffects(ctx);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const v = G.vis[y * MAP_W + x]; if (v === 2) continue;
    const [X, Y] = worldOf(x, y); ctx.fillStyle = v === 1 ? 'rgba(8,10,20,0.45)' : 'rgba(8,10,20,0.88)';
    diamond(ctx, X, Y); ctx.fill();
  }
  if (UI.placing && R.hoverTile) {
    const def = BUILDINGS[UI.placing]; const [tx, ty] = R.hoverTile; const ok = canPlace(UI.placing, tx, ty);
    ctx.globalAlpha = 0.55; drawBlock(ctx, tx, ty, def.w, def.h, def.height, ok.ok ? '#6fbf4a' : '#d23c2f'); ctx.globalAlpha = 1;
    if (def.range || def.aura) { const [cX, cY] = worldOf(tx + def.w / 2, ty + def.h / 2); const r = def.range || def.aura; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(cX, cY, r * TILE_W / 2, r * TILE_H / 2, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    if (!ok.ok) { const [cX, cY] = worldOf(tx + def.w / 2, ty + def.h / 2); ctx.fillStyle = '#ffb0a0'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(ok.why, cX, cY - 40); }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (UI.drag && UI.drag.box) { const d = UI.drag; ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 1; ctx.strokeRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0); ctx.fillStyle = 'rgba(255,230,128,0.1)'; ctx.fillRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0); }
  if (G.wave && G.wave.alive + (G.wave.list.length - G.wave.spawned) > 0) {
    const s = G.wave.side; ctx.fillStyle = 'rgba(255,95,208,0.9)'; ctx.font = 'bold 16px Georgia, serif'; ctx.textAlign = 'center';
    const txt = 'WAVE: ' + s.toUpperCase() + ' (' + (G.wave.alive + G.wave.list.length - G.wave.spawned) + ')';
    const pos = { north: [W * 0.75, 150], east: [W - 200, H * 0.7], south: [W * 0.25, H - 190], west: [200, H * 0.3] }[s];
    ctx.fillText(txt, pos[0], pos[1]);
  }
  if (G.freeze.t > 0 || G.freeze.warn > 0) {
    const on = G.freeze.t > 0; ctx.fillStyle = on ? 'rgba(42,58,138,0.85)' : 'rgba(42,58,138,0.45)'; ctx.fillRect(W / 2 - 220, 200, 440, 48);
    ctx.strokeStyle = '#f3e9cf'; ctx.lineWidth = 2; ctx.strokeRect(W / 2 - 220, 200, 440, 48);
    ctx.fillStyle = '#f3e9cf'; ctx.font = 'bold 16px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(on ? 'YOUR VOICE MATTERS (PLEASE WAIT)  ' + Math.ceil(G.freeze.t) + 's' : 'LISTENING SESSION IN ' + Math.ceil(G.freeze.warn) + 's', W / 2, 222);
    ctx.font = '11px Georgia, serif'; ctx.fillText(on ? 'Build tray and rally frozen. Towers and units keep fighting.' : 'Queue your commands now.', W / 2, 240);
  }
  if (G.paused && !G.over) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(W / 2 - 90, 150, 180, 34); ctx.fillStyle = '#ffe680'; ctx.font = 'bold 18px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('PAUSED  (space)', W / 2, 174); }
}

// Icon / portrait renderer for the HUD (draws a building or unit into a small canvas).
function renderIcon(canvas, kind, type) {
  const ctx = canvas.getContext('2d'); const W = canvas.width, H = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  if (kind === 'b') {
    const def = BUILDINGS[type]; const fake = { id: -1, kind: 'b', type, def, x: 0, y: 0, w: def.w, h: def.h, hp: def.hp, maxHp: def.hp, state: 'player', recap: 0, recover: 0, paint: 0, shut: 0, deaf: 0 };
    const span = (def.w + def.h) * TILE_W / 2; const tall = def.height * 28 + 46 + (def.w + def.h) * TILE_H / 2;
    const s = Math.min(W / span, H / tall) * 0.92;
    ctx.setTransform(s, 0, 0, s, W / 2, H - 4 * s - 2);
    ctx.translate(0, -(def.w + def.h) * TILE_H / 2);
    drawBuilding(ctx, fake, 1, true);
  } else {
    const def = UNITS[type]; const fake = { type, def, x: 0, y: 0, hp: def.hp, maxHp: def.hp, side: def.side, hair: '#ff5fd0', persistUsed: false, buffed: false, idle: true, channel: 0 };
    const s = Math.min(W / 56, H / 60) * (def.r > 0.45 ? 0.7 : 1.1);
    ctx.setTransform(s, 0, 0, s, W / 2, H - 6);
    drawUnit(ctx, fake, 1, true);
  }
}

function renderMinimap(mc) {
  const g = mc.getContext('2d'); const W = mc.width, H = mc.height;
  g.fillStyle = '#0c1220'; g.fillRect(0, 0, W, H);
  const sx = W / (MAP_W + MAP_H), sy = H / (MAP_W + MAP_H);
  const px = (x, y) => [(x - y + MAP_H) * sx, (x + y) * sy];
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const t = y * MAP_W + x; const vis = G.vis[t]; if (vis === 0) continue;
    const v = G.terrain[t]; let col = v === TER.WATER ? '#2f5f8a' : v === TER.ROCK ? '#6b6b66' : v === TER.TREE ? '#3d5a2a' : v === TER.STONE ? '#8f8b7f' : v === TER.IRON ? '#6e6a78' : '#5f7f3a';
    const bid = G.grid[t]; if (bid >= 0) { const b = G.bmap.get(bid); col = b && b.state === 'occupied' ? '#ff5fd0' : b && b.state === 'crate' ? '#ffe680' : b && b.state === 'enemy' ? '#9a3fd0' : '#e0b030'; }
    g.fillStyle = col; g.globalAlpha = vis === 2 ? 1 : 0.5; const [X, Y] = px(x, y); g.fillRect(X - sx, Y, sx * 2, sy * 2);
  }
  g.globalAlpha = 1;
  for (const u of G.units) { if (u.dead) continue; const t = unitTile(u); if (u.side === 'enemy' && G.vis[t] !== 2) continue; g.fillStyle = u.side === 'enemy' ? (u.def.lt ? '#ffe680' : '#ff3b3b') : '#ffffff'; const [X, Y] = px(u.x, u.y); const s = u.def.lt ? 4 : 2; g.fillRect(X - s / 2, Y - s / 2, s, s); }
  if (G.committee && !G.committee.dead) { const [X, Y] = px(G.committee.x, G.committee.y); g.strokeStyle = 'rgba(255,230,128,' + (0.5 + 0.5 * Math.sin(performance.now() / 150)) + ')'; g.lineWidth = 2; g.strokeRect(X - 6, Y - 6, 12, 12); }
  const c0 = screenToTile(0, 0), c1 = screenToTile(R.W, 0), c2 = screenToTile(R.W, R.H), c3 = screenToTile(0, R.H);
  g.strokeStyle = '#ffe680'; g.lineWidth = 1; g.beginPath();
  for (const [i, c] of [c0, c1, c2, c3].entries()) { const [X, Y] = px(c[0], c[1]); if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y); }
  g.closePath(); g.stroke();
  if (G.wave && (G.wave.alive || G.wave.spawned < G.wave.list.length)) { g.strokeStyle = 'rgba(255,95,208,' + (0.5 + 0.5 * Math.sin(performance.now() / 200)) + ')'; g.lineWidth = 3; g.beginPath();
    const s = G.wave.side; const e = s === 'north' ? [px(0, 0), px(MAP_W, 0)] : s === 'east' ? [px(MAP_W, 0), px(MAP_W, MAP_H)] : s === 'south' ? [px(MAP_W, MAP_H), px(0, MAP_H)] : [px(0, MAP_H), px(0, 0)];
    g.moveTo(e[0][0], e[0][1]); g.lineTo(e[1][0], e[1][1]); g.stroke(); }
}
function minimapToTile(mc, mx, my) { const W = mc.width, H = mc.height; const sx = W / (MAP_W + MAP_H), sy = H / (MAP_W + MAP_H); const a = mx / sx - MAP_H, b = my / sy; return [(a + b) / 2, (b - a) / 2]; }

// Clock face for the HUD
function renderClock(canvas) {
  const g = canvas.getContext('2d'); const W = canvas.width, H = canvas.height; const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 3;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#0a0d14'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  g.strokeStyle = '#c9a227'; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
  g.strokeStyle = '#5a4a12'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, r - 5, 0, 7); g.stroke();
  const p = 1 - G.dayTimer / DAY_LENGTH;
  g.strokeStyle = G.wave && G.wave.alive ? '#ff5fd0' : '#c9a227'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, r - 9, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); g.stroke();
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.fillStyle = '#c9a227'; g.fillRect(cx + Math.cos(a) * (r - 14) - 1, cy + Math.sin(a) * (r - 14) - 1, 2, 2); }
  const a = -Math.PI / 2 + p * Math.PI * 2; g.strokeStyle = '#f3e9cf'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (r - 16), cy + Math.sin(a) * (r - 16)); g.stroke();
  g.fillStyle = '#c9a227'; g.beginPath(); g.arc(cx, cy, 3, 0, 7); g.fill();
}
