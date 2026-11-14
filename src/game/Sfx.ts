/**
 * PLACEHOLDER de sonido: pitidos sintetizados con WebAudio (sin archivos).
 * Para audio real: cargar los archivos en BootScene y reemplazar play() por this.sound.play(nombre).
 * Lista de sonidos necesarios: public/assets/README.md
 */
export type SfxName = 'shoot' | 'hit' | 'boom' | 'hurt' | 'pickup' | 'ui' | 'win' | 'lose';
type Tone = [freq: number, slideTo: number, dur: number, type: OscillatorType, vol: number];
const TONES: Record<SfxName, Tone> = {
  shoot: [720, 240, 0.07, 'square', 0.04], hit: [300, 160, 0.05, 'triangle', 0.05],
  boom: [160, 40, 0.22, 'sawtooth', 0.09], hurt: [200, 70, 0.2, 'square', 0.09],
  pickup: [660, 1100, 0.12, 'sine', 0.08], ui: [520, 640, 0.06, 'sine', 0.06],
  win: [520, 1040, 0.5, 'triangle', 0.1], lose: [300, 60, 0.6, 'sawtooth', 0.09],
};

class Sfx {
  enabled = true;
  private ctx?: AudioContext;
  private last: Partial<Record<SfxName, number>> = {};

  play(name: SfxName) {
    if (!this.enabled || typeof AudioContext === 'undefined') return;
    const now = performance.now();
    if (now - (this.last[name] ?? 0) < 60) return; // evita saturar con ráfagas
    this.last[name] = now;
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      const [f, to, dur, type, vol] = TONES[name];
      const t = this.ctx.currentTime, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(to, t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t); osc.stop(t + dur);
    } catch { /* sin audio: el juego sigue */ }
  }
}
export const sfx = new Sfx();
