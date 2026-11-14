import Phaser from 'phaser';
import { rng } from './textures';

const DECALS = ['d_crater', 'd_rubble', 'd_mark', 'd_plate', 'd_rubble', 'd_mark', 'd_crater'];

/** Decorado sin colisión, repartido con semilla (cada misión siempre se ve igual). */
export function decorateArena(scene: Phaser.Scene, w: number, h: number, seedText: string, tint: number) {
  const R = rng([...seedText].reduce((n, ch) => n * 31 + ch.charCodeAt(0), 7));
  scene.add.tileSprite(0, 0, w, h, 'ground').setOrigin(0).setTint(tint);
  const n = Math.round((w * h) / 42000);
  for (let i = 0; i < n; i++) {
    const key = DECALS[Math.floor(R() * DECALS.length)];
    scene.add.image(40 + R() * (w - 80), 40 + R() * (h - 80), key)
      .setRotation(key === 'd_mark' ? (R() < 0.5 ? 0 : Math.PI / 2) + (R() - 0.5) * 0.08 : R() * 6.28)
      .setScale(0.8 + R() * 0.7).setAlpha(0.65 + R() * 0.35).setTint(key === 'd_puddle' ? 0xffffff : tint).setDepth(0.5);
  }
  // Valla de energía del perímetro
  scene.add.rectangle(w / 2, h / 2, w, h).setStrokeStyle(14, 0xff3d81, 0.18).setBlendMode(Phaser.BlendModes.ADD).setDepth(1);
  scene.add.rectangle(w / 2, h / 2, w, h).setStrokeStyle(3, 0xff9fc0, 0.9).setDepth(1);
}

/** Viñeta + brasas flotando, fijas a la cámara. Pocas partículas: barato en móviles modestos. */
export function addAtmosphere(scene: Phaser.Scene) {
  const { width, height } = scene.scale;
  scene.add.particles(0, 0, 'particle', {
    x: { min: 0, max: width }, y: { min: 0, max: height }, lifespan: 5000, frequency: 220, quantity: 1,
    speedX: { min: -30, max: -8 }, speedY: { min: -26, max: -6 }, scale: { min: 0.25, max: 0.7 },
    alpha: { start: 0.7, end: 0 }, tint: [0xff8a3d, 0xffc27a, 0xff5e3a], blendMode: 'ADD',
  }).setScrollFactor(0).setDepth(89);
  scene.add.image(width / 2, height / 2, 'vignette').setScrollFactor(0).setDepth(90);
}
