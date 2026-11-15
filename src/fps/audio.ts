// Sonido sintetizado con WebAudio (sin archivos). PROVISIONAL: sustituible por grabaciones reales
// manteniendo esta misma interfaz. Los navegadores solo dejan sonar tras un toque o clic: llamar unlock().
type Wave = OscillatorType;
let ctx: AudioContext | undefined, master: GainNode, noiseBuf: AudioBuffer, ambientOn = false;
const last: Record<string, number> = {};

function ready(name: string, gapMs: number) {
  if (!audio.on || !ctx) return false;
  const now = performance.now(); if (now - (last[name] ?? 0) < gapMs) return false; last[name] = now; return true;
}
function env(vol: number, dur: number, at = 0) {
  const g = ctx!.createGain(), t = ctx!.currentTime + at; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); g.connect(master); return g;
}
function tone(type: Wave, f0: number, f1: number, dur: number, vol: number, at = 0) {
  const o = ctx!.createOscillator(), t = ctx!.currentTime + at; o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  o.connect(env(vol, dur, at)); o.start(t); o.stop(t + dur + 0.02);
}
function noise(f0: number, f1: number, dur: number, vol: number, type: BiquadFilterType = 'lowpass', at = 0) {
  const s = ctx!.createBufferSource(), f = ctx!.createBiquadFilter(), t = ctx!.currentTime + at; s.buffer = noiseBuf; s.loop = true;
  f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  s.connect(f).connect(env(vol, dur, at)); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.02);
}

export const audio = {
  on: true,
  unlock() {
    try {
      if (!ctx) {
        ctx = new AudioContext(); master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') void ctx.resume();
      if (!ambientOn && audio.on) { // viento y zumbido grave de fondo, en bucle
        ambientOn = true;
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.frequency.value = 320; f.Q.value = 0.6; g.gain.value = 0.05;
        lfo.frequency.value = 0.09; lg.gain.value = 180; lfo.connect(lg).connect(f.frequency); s.connect(f).connect(g).connect(master); s.start(); lfo.start();
        const hum = ctx.createOscillator(), hg = ctx.createGain(); hum.type = 'sawtooth'; hum.frequency.value = 46; hg.gain.value = 0.018; hum.connect(hg).connect(master); hum.start();
      }
    } catch { /* sin audio: el juego sigue */ }
  },
  setOn(v: boolean) { audio.on = v; if (ctx) master.gain.value = v ? 0.7 : 0; },
  shot(heavy = false) { if (!ready('shot', 40)) return; noise(heavy ? 2200 : 3800, 260, heavy ? 0.26 : 0.14, heavy ? 0.6 : 0.42); tone('triangle', heavy ? 120 : 170, 45, heavy ? 0.2 : 0.11, 0.5); noise(6000, 3000, 0.03, 0.2, 'highpass'); },
  hit() { if (!ready('hit', 50)) return; tone('square', 1250, 900, 0.05, 0.07); tone('triangle', 2100, 1500, 0.07, 0.06); noise(5000, 2000, 0.04, 0.1, 'highpass'); },
  head() { if (!ready('head', 60)) return; tone('square', 1900, 2600, 0.09, 0.09); tone('triangle', 3100, 2400, 0.12, 0.07); },
  boom(big = false) { if (!ready('boom', 70)) return; noise(big ? 1400 : 900, 60, big ? 1.1 : 0.5, big ? 0.9 : 0.55); tone('sine', big ? 90 : 110, 28, big ? 0.9 : 0.4, 0.7); for (let i = 0; i < (big ? 7 : 3); i++) tone('square', 700 + Math.random() * 1600, 300, 0.06, 0.05, 0.05 + i * 0.07); },
  bolt(vol = 1) { if (!ready('bolt', 90)) return; tone('sawtooth', 1300, 240, 0.22, 0.09 * vol); tone('square', 640, 130, 0.2, 0.05 * vol); },
  hurt() { if (!ready('hurt', 150)) return; tone('sine', 190, 60, 0.28, 0.5); noise(700, 120, 0.2, 0.35); },
  reload() { if (!ready('reload', 300)) return; noise(3000, 900, 0.04, 0.3, 'bandpass'); noise(2200, 700, 0.05, 0.32, 'bandpass', 0.55); tone('square', 320, 180, 0.04, 0.12, 1.15); noise(4000, 1200, 0.05, 0.35, 'bandpass', 1.2); },
  empty() { if (ready('empty', 200)) tone('square', 900, 700, 0.03, 0.1); },
  spawn() { if (!ready('spawn', 400)) return; tone('sawtooth', 70, 420, 0.5, 0.14); noise(300, 2400, 0.45, 0.12, 'bandpass'); },
  alarm() { if (!ready('alarm', 1500)) return; for (let i = 0; i < 3; i++) { tone('sawtooth', 520, 500, 0.2, 0.09, i * 0.42); tone('sawtooth', 390, 380, 0.2, 0.09, i * 0.42 + 0.2); } },
  step() { if (ready('step', 240)) noise(380, 120, 0.07, 0.11); },
  ui() { if (ready('ui', 50)) tone('sine', 620, 820, 0.06, 0.12); },
  coin() { if (!ready('coin', 80)) return; tone('sine', 880, 1320, 0.1, 0.12); tone('sine', 1320, 1760, 0.12, 0.09, 0.07); },
  hack() { if (ready('hack', 220)) tone('square', 500 + Math.random() * 700, 600, 0.05, 0.05); },
  win() { if (!ready('win', 2000)) return; [392, 494, 587, 784].forEach((f, i) => tone('triangle', f, f, 0.5, 0.16, i * 0.16)); },
  lose() { if (!ready('lose', 2000)) return; [330, 262, 196, 131].forEach((f, i) => tone('sawtooth', f, f * 0.9, 0.6, 0.1, i * 0.22)); },
};
