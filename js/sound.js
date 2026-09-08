'use strict';
// Minimal WebAudio stings and loops. No assets.
const Sound = (() => {
  let ctx = null; let muted = false; let lastShot = 0; let vac = null, vacT = 0;
  function ac() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } } if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; }
  function tone(freq, dur, type, vol, slide, delay) {
    if (muted) return; const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(); const t0 = c.currentTime + (delay || 0);
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(vol || 0.08, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur);
  }
  function noise(dur, vol, lp) {
    if (muted) return; const c = ac(); if (!c) return;
    const n = Math.floor(c.sampleRate * dur); const buf = c.createBuffer(1, n, c.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(); src.buffer = buf; const g = c.createGain(); g.gain.value = vol;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp || 2000;
    src.connect(f); f.connect(g); g.connect(c.destination); src.start();
  }
  return {
    unlock() { ac(); },
    toggle() { muted = !muted; if (muted && vac) { try { vac.stop(); } catch (e) {} vac = null; } return muted; },
    horn() { tone(110, 1.2, 'sawtooth', 0.12, 90); tone(147, 1.0, 'sawtooth', 0.1, 120, 0.25); },
    drum() { for (let i = 0; i < 3; i++) { tone(60, 0.35, 'sine', 0.2, 40, i * 0.3); noise(0.12, 0.15, 600); } },
    sting() { tone(220, 0.4, 'square', 0.08, 110); },
    gate() { tone(80, 0.6, 'sawtooth', 0.14, 40); tone(60, 0.5, 'square', 0.1, 30, 0.12); noise(0.4, 0.2, 900); },
    boom() { noise(0.5, 0.3, 500); tone(70, 0.5, 'sine', 0.2, 30); },
    pop() { tone(880, 0.12, 'triangle', 0.1, 1760); tone(1320, 0.25, 'sine', 0.08, 440, 0.1); },
    good() { tone(440, 0.15, 'triangle', 0.08); tone(660, 0.2, 'triangle', 0.08, null, 0.12); },
    chime() { tone(523, 0.18, 'sine', 0.08); tone(659, 0.18, 'sine', 0.08, null, 0.15); tone(784, 0.3, 'sine', 0.08, null, 0.3); },
    click() { tone(880, 0.05, 'triangle', 0.04); },
    place() { tone(330, 0.08, 'square', 0.05, 220); },
    shot() { const now = performance.now(); if (now - lastShot < 80) return; lastShot = now; noise(0.06, 0.06, 3000); },
    vacuum(on) {
      if (muted) return; const c = ac(); if (!c) return;
      if (on) { vacT = performance.now(); if (!vac) { const o = c.createOscillator(); const g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = 55; const lfo = c.createOscillator(); const lg = c.createGain(); lfo.frequency.value = 6; lg.gain.value = 12; lfo.connect(lg); lg.connect(o.frequency); g.gain.value = 0.05; o.connect(g); g.connect(c.destination); o.start(); lfo.start(); vac = o; vac.g = g; vac.lfo = lfo; } }
    },
    tick() { if (vac && performance.now() - vacT > 400) { try { vac.stop(); vac.lfo.stop(); } catch (e) {} vac = null; } },
  };
})();
