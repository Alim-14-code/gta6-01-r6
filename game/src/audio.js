// Harbor Lights — all sound is synthesized with WebAudio: no audio files.
// Engine hum follows speed, sirens wail at wanted 2+, stingers mark mission events.
export function makeAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let muted = false;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(ctx.destination);
      sirenOsc.start();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function blip(freq, dur, type, vol, when = 0) {
    const c = ensure();
    if (!c || muted) return;
    const t = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setMuted(m) { muted = m; if (engineGain) engineGain.gain.value = 0; if (sirenGain) sirenGain.gain.value = 0; },
    get muted() { return muted; },
    // Call every frame: speed 0..1, inCar, wanted stars.
    update(dt, speed01, inCar, wanted) {
      const c = ensure();
      if (!c) return;
      if (muted) return;
      if (engineOsc && engineGain) {
        engineOsc.frequency.value = 50 + speed01 * 140;
        engineGain.gain.value = inCar ? 0.035 + speed01 * 0.05 : 0;
      }
      if (sirenOsc && sirenGain) {
        if (wanted >= 2) {
          sirenTimer += dt;
          const phase = Math.floor(sirenTimer * 1.6) % 2;
          sirenOsc.frequency.value = phase === 0 ? 660 : 880;
          sirenGain.gain.value = 0.028;
        } else {
          sirenGain.gain.value = 0;
        }
      }
    },
    pickup() { blip(660, 0.12, 'sine', 0.12); blip(990, 0.18, 'sine', 0.12, 0.09); },
    crash() { blip(90, 0.25, 'square', 0.16); blip(55, 0.3, 'sawtooth', 0.12, 0.02); },
    horn() { blip(370, 0.22, 'square', 0.08); blip(466, 0.22, 'square', 0.06, 0.0); },
    missionStart() { blip(523, 0.14, 'triangle', 0.12); blip(659, 0.14, 'triangle', 0.12, 0.12); blip(784, 0.22, 'triangle', 0.12, 0.24); },
    missionDone() { [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.2, 'triangle', 0.13, i * 0.11)); },
    missionFail() { [392, 330, 262].forEach((f, i) => blip(f, 0.25, 'sawtooth', 0.1, i * 0.14)); },
    busted() { blip(220, 0.4, 'square', 0.14); blip(165, 0.6, 'square', 0.14, 0.3); },
  };
}
// Harbor Lights — recorded build touch
