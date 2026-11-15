// Sonido sintetizado con WebAudio (sin archivos). PROVISIONAL: sustituible por grabaciones reales
// manteniendo esta interfaz. Cadena: sonidos → (seco + reverberación de calle) → compresor → salida.
// Los navegadores solo dejan sonar tras un toque o clic: llamar unlock().
type Wave = OscillatorType;
let ctx: AudioContext | undefined, master: GainNode, dry: GainNode, wet: GainNode, noiseBuf: AudioBuffer, ambientOn = false;
const last: Record<string, number> = {};

function ready(name: string, gapMs: number) {
  if (!audio.on || !ctx) return false;
  const now = performance.now(); if (now - (last[name] ?? 0) < gapMs) return false; last[name] = now; return true;
}
/** Envolvente con ataque corto (sin chasquidos) y caída exponencial. `rev` = cuánto va a la reverberación. */
function env(vol: number, dur: number, at: number, rev: number, attack = 0.004) {
  const g = ctx!.createGain(), t = ctx!.currentTime + at;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
  g.connect(dry); if (rev) { const s = ctx!.createGain(); s.gain.value = rev; g.connect(s).connect(wet); }
  return g;
}
function tone(type: Wave, f0: number, f1: number, dur: number, vol: number, at = 0, rev = 0.15) {
  const o = ctx!.createOscillator(), t = ctx!.currentTime + at; o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  o.connect(env(vol, dur, at, rev)); o.start(t); o.stop(t + dur + 0.05);
}
function noise(f0: number, f1: number, dur: number, vol: number, type: BiquadFilterType = 'lowpass', at = 0, rev = 0.25, q = 0.7) {
  const s = ctx!.createBufferSource(), f = ctx!.createBiquadFilter(), t = ctx!.currentTime + at; s.buffer = noiseBuf; s.loop = true;
  f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  s.connect(f).connect(env(vol, dur, at, rev)); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
}
/** Golpe metálico: varios parciales no armónicos que se apagan a distinto ritmo (suena a chapa, no a pitido). */
function clank(base: number, vol: number, dur: number, at = 0) {
  [1, 1.48, 2.09, 2.76, 3.9].forEach((k, i) => tone(i % 2 ? 'triangle' : 'sine', base * k * (0.97 + Math.random() * 0.06), base * k * 0.98, dur / (1 + i * 0.5), vol / (1 + i * 0.7), at, 0.3));
  noise(5200, 1800, 0.03, vol * 0.8, 'bandpass', at, 0.2, 1.2);
}

export const audio = {
  on: true,
  unlock() {
    try {
      if (!ctx) {
        ctx = new AudioContext();
        const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2;
        master = ctx.createGain(); master.gain.value = audio.on ? 0.8 : 0; comp.connect(master).connect(ctx.destination);
        dry = ctx.createGain(); dry.connect(comp);
        // reverberación: respuesta al impulso generada (ruido que decae ≈ eco entre edificios)
        const len = Math.floor(ctx.sampleRate * 1.9), ir = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); let lp = 0; for (let i = 0; i < len; i++) { lp += (Math.random() * 2 - 1 - lp) * 0.35; d[i] = lp * Math.pow(1 - i / len, 2.6) * (i < 600 ? i / 600 : 1); } }
        const conv = ctx.createConvolver(); conv.buffer = ir; wet = ctx.createGain(); wet.gain.value = 0.9; wet.connect(conv).connect(comp);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') void ctx.resume();
      if (!ambientOn && audio.on) { // fondo: acorde grave que respira + viento muy sordo (sin siseo)
        ambientOn = true; const out = ctx.createGain(); out.gain.value = 0.5; out.connect(dry);
        [[55, 0.05], [55.4, 0.045], [82.4, 0.022], [110.3, 0.012]].forEach(([f, v], i) => {
          const o = ctx!.createOscillator(), g = ctx!.createGain(), l = ctx!.createOscillator(), lg = ctx!.createGain();
          o.type = 'sine'; o.frequency.value = f; g.gain.value = v; l.frequency.value = 0.05 + i * 0.03; lg.gain.value = v * 0.6; l.connect(lg).connect(g.gain); o.connect(g).connect(out); o.start(); l.start();
        });
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
        s.buffer = noiseBuf; s.loop = true; f.type = 'lowpass'; f.frequency.value = 170; f.Q.value = 0.3; g.gain.value = 0.07; l.frequency.value = 0.07; lg.gain.value = 0.04; l.connect(lg).connect(g.gain); s.connect(f).connect(g).connect(out); s.start(); l.start();
      }
    } catch { /* sin audio: el juego sigue */ }
  },
  setOn(v: boolean) { audio.on = v; if (ctx) master.gain.value = v ? 0.8 : 0; },
  shot(heavy = false) {
    if (!ready('shot', 40)) return;
    noise(heavy ? 1700 : 2600, 180, heavy ? 0.3 : 0.16, heavy ? 0.75 : 0.5, 'lowpass', 0, 0.45);   // estampido
    tone('sine', heavy ? 105 : 150, 42, heavy ? 0.24 : 0.13, 0.7, 0, 0.2);                       // cuerpo grave
    noise(3200, 1500, 0.025, 0.28, 'bandpass', 0, 0.1, 1.5);                                      // mecanismo
  },
  hit() { if (ready('hit', 55)) clank(520 + Math.random() * 160, 0.11, 0.16); },
  head() { if (ready('head', 70)) { clank(980, 0.14, 0.3); tone('sine', 1960, 1900, 0.25, 0.05, 0.01, 0.4); } },
  boom(big = false) {
    if (!ready('boom', 70)) return;
    noise(big ? 1100 : 800, 50, big ? 1.3 : 0.6, big ? 1 : 0.65, 'lowpass', 0, 0.6); tone('sine', big ? 82 : 100, 26, big ? 1 : 0.45, 0.9, 0, 0.3);
    for (let i = 0; i < (big ? 6 : 3); i++) clank(300 + Math.random() * 700, 0.06, 0.25, 0.06 + i * 0.09); // piezas cayendo
  },
  bolt(vol = 1) { if (!ready('bolt', 90)) return; tone('sine', 900, 190, 0.24, 0.11 * vol, 0, 0.35); tone('triangle', 450, 110, 0.2, 0.06 * vol, 0, 0.3); },
  hurt() { if (!ready('hurt', 150)) return; tone('sine', 150, 55, 0.3, 0.6, 0, 0.1); noise(500, 100, 0.22, 0.35, 'lowpass', 0, 0.1); },
  reload() { if (!ready('reload', 300)) return; clank(700, 0.07, 0.07); clank(520, 0.08, 0.08, 0.55); noise(1500, 500, 0.06, 0.25, 'bandpass', 1.15, 0.1); clank(880, 0.09, 0.1, 1.2); },
  spawn() { if (!ready('spawn', 400)) return; tone('sine', 60, 240, 0.6, 0.16, 0, 0.5); noise(200, 1200, 0.5, 0.07, 'bandpass', 0, 0.5, 2); },
  alarm() { if (!ready('alarm', 1500)) return; for (let i = 0; i < 2; i++) { tone('triangle', 440, 430, 0.32, 0.1, i * 0.5, 0.5); tone('triangle', 330, 322, 0.32, 0.1, i * 0.5 + 0.25, 0.5); } },
  step() { if (ready('step', 240)) { noise(210, 70, 0.08, 0.16, 'lowpass', 0, 0.1); tone('sine', 85, 50, 0.06, 0.1, 0, 0.05); } },
  ui() { if (ready('ui', 50)) tone('sine', 560, 700, 0.07, 0.1, 0, 0.1); },
  coin() { if (!ready('coin', 80)) return; tone('sine', 880, 880, 0.14, 0.1, 0, 0.3); tone('sine', 1318, 1318, 0.2, 0.09, 0.08, 0.3); },
  pickup() { if (!ready('pickup', 120)) return; [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.22, 0.1, i * 0.06, 0.35)); },
  streak() { if (!ready('streak', 300)) return; [660, 880, 1100].forEach((f, i) => tone('sine', f, f * 1.01, 0.18, 0.09, i * 0.07, 0.4)); },
  hack() { if (ready('hack', 220)) tone('sine', 700 + Math.random() * 500, 800, 0.05, 0.04, 0, 0.2); },
  win() { if (!ready('win', 2000)) return; [392, 494, 587, 784].forEach((f, i) => { tone('triangle', f, f, 0.7, 0.14, i * 0.16, 0.5); tone('sine', f / 2, f / 2, 0.7, 0.1, i * 0.16, 0.3); }); },
  lose() { if (!ready('lose', 2000)) return; [330, 262, 196, 131].forEach((f, i) => tone('triangle', f, f * 0.94, 0.8, 0.13, i * 0.24, 0.5)); },
};
