'use strict';
(function () {
  const canvas = document.getElementById('game'); const ctx = canvas.getContext('2d');
  const mini = document.getElementById('minimap');
  function resize() { R.W = canvas.width = window.innerWidth; R.H = canvas.height = window.innerHeight; }
  window.addEventListener('resize', resize); resize();
  // Boot into a fresh game (paused behind the start overlay) so the map is visible.
  newGame(); UI.init(); buildTerrainCanvas(); G.selected = []; G.paused = true;
  { const [wx, wy] = worldOf(G.hall.x + 1.5, G.hall.y + 2.5); R.cam.x = wx; R.cam.y = wy; }
  let last = performance.now(), acc = 0, miniT = 0;
  const FIXED = 1 / 30;
  window.__frames = 0;
  function frame(now) {
    let dt = Math.min(0.1, (now - last) / 1000); last = now; window.__frames++;
    try {
      UI.updateCamera(dt);
      if (!G.paused && !G.over) {
        acc += dt * G.speed;
        let n = 0; while (acc >= FIXED && n++ < 8) { step(FIXED); acc -= FIXED; }
        if (acc > FIXED) acc = 0; // don't spiral after a stall
      }
      render(ctx);
      miniT -= dt; if (miniT <= 0) { miniT = 0.2; renderMinimap(mini); }
      UI.updateHUD(); Sound.tick();
    } catch (e) { console.error('frame error', e); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
