'use strict';
// ============================================================
// Grid Dijkstra "flow fields". Units descend the gradient.
// Cost is the cost of ENTERING a tile; walls are finite cost
// (chew through) for the Wave and infinite for the player.
// ============================================================
class MinHeap {
  constructor() { this.a = []; }
  push(n, p) { const a = this.a; a.push({ n, p }); let i = a.length - 1;
    while (i > 0) { const q = (i - 1) >> 1; if (a[q].p <= a[i].p) break; const tmp = a[q]; a[q] = a[i]; a[i] = tmp; i = q; } }
  pop() { const a = this.a; const top = a[0]; const last = a.pop();
    if (a.length) { a[0] = last; let i = 0;
      for (;;) { const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && a[l].p < a[m].p) m = l; if (r < a.length && a[r].p < a[m].p) m = r;
        if (m === i) break; const tmp = a[m]; a[m] = a[i]; a[i] = tmp; i = m; } }
    return top; }
  get size() { return this.a.length; }
}
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

function computeField(goals, costFn, solidFn) {
  const N = MAP_W * MAP_H;
  const dist = new Float64Array(N).fill(Infinity);
  const isGoal = new Uint8Array(N);
  const heap = new MinHeap();
  for (const g of goals) { isGoal[g] = 1; dist[g] = 0; heap.push(g, 0); }
  while (heap.size) {
    const { n: t, p: d } = heap.pop();
    if (d > dist[t]) continue;
    const tx = t % MAP_W, ty = (t / MAP_W) | 0;
    const base = isGoal[t] ? 1 : costFn(t);
    for (let k = 0; k < 8; k++) {
      const nx = tx + DIRS[k][0], ny = ty + DIRS[k][1];
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const nt = ny * MAP_W + nx;
      if (costFn(nt) === Infinity && !isGoal[nt]) continue;
      let step = base;
      if (k >= 4) { if (solidFn(ty * MAP_W + nx) || solidFn(ny * MAP_W + tx)) continue; step *= 1.41421; }
      const nd = d + step;
      if (nd < dist[nt]) { dist[nt] = nd; heap.push(nt, nd); }
    }
  }
  return dist;
}

// Pick the neighbor tile with the lowest field value (or -1 if none better).
// slack > 0 lets a unit pick randomly among near-equal steps so a horde spreads instead of forming a queue.
const _cand = new Int32Array(8), _candD = new Float64Array(8);
function bestStep(dist, tx, ty, costFn, solidFn, slack) {
  const here = dist[ty * MAP_W + tx];
  let n = 0, bd = Infinity;
  for (let k = 0; k < 8; k++) {
    const nx = tx + DIRS[k][0], ny = ty + DIRS[k][1];
    if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
    const nt = ny * MAP_W + nx;
    const d = dist[nt];
    if (d >= here) continue;
    if (k >= 4 && (solidFn(ty * MAP_W + nx) || solidFn(ny * MAP_W + tx))) continue;
    if (costFn(nt) === Infinity && d !== 0) continue;
    _cand[n] = nt; _candD[n] = d; n++; if (d < bd) bd = d;
  }
  if (!n) return -1;
  if (!slack) { for (let i = 0; i < n; i++) if (_candD[i] === bd) return _cand[i]; }
  // prefer open ground among near-equal options (don't pick a wall tile when a free tile is as good)
  let m = 0; for (let i = 0; i < n; i++) if (_candD[i] <= bd + slack) { _cand[m] = _cand[i]; _candD[m] = _candD[i]; m++; }
  return _cand[(Math.random() * m) | 0];
}
