import Phaser from 'phaser';
import { ENEMIES, hex } from '../core/data';
import type { EnemyDef } from '../core/types';

/** Margen alrededor del círculo de colisión dentro de cada textura. */
export const PAD = 4;
type G = Phaser.GameObjects.Graphics;

/**
 * PLACEHOLDERS: todas las texturas se dibujan por código. Para usar arte real, cargar en BootScene
 * una imagen con la MISMA clave (p. ej. 'enemy_drone'): si la clave ya existe, aquí no se genera.
 * Lista de claves y tamaños: public/assets/README.md
 */
export function buildTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const make = (key: string, w: number, h: number, draw: (g: G) => void) => {
    if (scene.textures.exists(key)) return;
    g.clear(); draw(g); g.generateTexture(key, w, h);
  };

  // Jugador: en grises claros para poder teñirlo con el color de la skin. Mira hacia la derecha.
  make('player', 34, 34, (g) => {
    g.fillStyle(0xdddddd).fillRect(17, 13, 16, 8);
    g.fillStyle(0xffffff).fillCircle(17, 17, 13);
    g.fillStyle(0x777777).fillCircle(20, 17, 6);
    g.lineStyle(2, 0x555555).strokeCircle(17, 17, 12);
  });
  for (const e of ENEMIES) {
    const s = 2 * (e.radius + PAD);
    make(`enemy_${e.id}`, s, s, (g) => drawEnemy(g, e, s / 2));
  }
  make('bullet_p', 16, 6, (g) => g.fillStyle(0xffffff).fillRoundedRect(0, 0, 16, 6, 3));
  make('bullet_e', 12, 12, (g) => { g.fillStyle(0xff3d81).fillCircle(6, 6, 6); g.fillStyle(0xffffff).fillCircle(6, 6, 2.5); });
  make('particle', 6, 6, (g) => g.fillStyle(0xffffff).fillRect(0, 0, 6, 6));
  make('heal', 22, 22, (g) => {
    g.fillStyle(0x1c1830).fillCircle(11, 11, 11);
    g.fillStyle(0xffb347).fillRect(9, 4, 4, 14).fillRect(4, 9, 14, 4);
  });
  make('convoy', 96, 48, (g) => {
    g.fillStyle(0x5a4a2a).fillRoundedRect(0, 4, 96, 40, 6);
    g.fillStyle(0xffb347).fillRoundedRect(4, 8, 60, 32, 4);
    g.fillStyle(0xffe0a3).fillRect(70, 12, 18, 24);
    g.fillStyle(0x221c10).fillRect(10, 0, 16, 6).fillRect(60, 0, 16, 6).fillRect(10, 42, 16, 6).fillRect(60, 42, 16, 6);
  });
  make('terminal', 44, 44, (g) => {
    g.fillStyle(0x2a2440).fillRoundedRect(0, 0, 44, 44, 6);
    g.fillStyle(0xffffff).fillRect(7, 7, 30, 18);
    g.fillStyle(0x777777).fillRect(7, 30, 30, 4).fillRect(7, 36, 18, 3);
  });
  make('arrow', 24, 24, (g) => g.fillStyle(0xffb347).fillTriangle(24, 12, 2, 2, 2, 22));
  make('stick_base', 128, 128, (g) => { g.fillStyle(0xffffff, 0.12).fillCircle(64, 64, 62); g.lineStyle(3, 0xffffff, 0.5).strokeCircle(64, 64, 62); });
  make('stick_thumb', 56, 56, (g) => g.fillStyle(0xffffff, 0.6).fillCircle(28, 28, 28));
  // Suelo en grises (cada misión lo tiñe con arena.tint): losas agrietadas y escombros.
  make('ground', 128, 128, (g) => {
    g.fillStyle(0x3b3747).fillRect(0, 0, 128, 128);
    g.lineStyle(2, 0x514c61).strokeRect(0, 0, 128, 128);
    g.lineStyle(1, 0x464153).lineBetween(64, 0, 64, 128).lineBetween(0, 64, 128, 64);
    g.fillStyle(0x5d5870);
    [[14, 22, 5], [90, 40, 3], [50, 100, 4], [110, 96, 6], [30, 70, 2]].forEach(([x, y, r]) => g.fillRect(x, y, r, r));
    g.lineStyle(1, 0x25222e).lineBetween(70, 76, 96, 84).lineBetween(96, 84, 104, 110);
  });
  g.destroy();
}

function drawEnemy(g: G, e: EnemyDef, c: number) {
  const r = e.radius, col = hex(e.color), dark = 0x14111f;
  g.fillStyle(col).lineStyle(2, 0xffffff, 0.5);
  switch (e.shape) {
    case 'tri':
      g.fillTriangle(c + r, c, c - r * 0.8, c - r * 0.85, c - r * 0.8, c + r * 0.85);
      g.fillStyle(dark).fillCircle(c, c, r * 0.3);
      break;
    case 'square':
      g.fillRoundedRect(c - r * 0.85, c - r * 0.85, r * 1.7, r * 1.7, 4);
      g.fillStyle(dark).fillRect(c + r * 0.1, c - r * 0.55, r * 0.5, r * 1.1);
      break;
    case 'hex': {
      const pts = Array.from({ length: 6 }, (_, i) => new Phaser.Math.Vector2(c + r * Math.cos(i * Math.PI / 3), c + r * Math.sin(i * Math.PI / 3)));
      g.fillStyle(0x3a3050).fillPoints(pts, true);
      g.fillStyle(col).fillCircle(c, c, r * 0.5).fillRect(c, c - 3, r, 6);
      break;
    }
    case 'mech':
      g.fillRect(c - r * 0.6, c - r * 0.95, r * 0.9, r * 0.45).fillRect(c - r * 0.6, c + r * 0.5, r * 0.9, r * 0.45);
      g.fillRoundedRect(c - r * 0.7, c - r * 0.55, r * 1.3, r * 1.1, 5);
      g.fillStyle(dark).fillRect(c + r * 0.2, c - r * 0.25, r * 0.3, r * 0.5);
      g.fillStyle(0xffffff).fillRect(c + r * 0.5, c - 3, r * 0.5, 6);
      break;
    case 'boss': {
      const pts = Array.from({ length: 12 }, (_, i) => {
        const rr = i % 2 ? r * 0.6 : r, a = i * Math.PI / 6;
        return new Phaser.Math.Vector2(c + rr * Math.cos(a), c + rr * Math.sin(a));
      });
      g.fillPoints(pts, true);
      g.fillStyle(dark).fillCircle(c, c, r * 0.4);
      g.fillStyle(0xffffff).fillCircle(c + r * 0.2, c, r * 0.14);
      break;
    }
    default: // 'core': ojo-reactor concéntrico
      g.fillStyle(0x3a3050).fillCircle(c, c, r);
      g.lineStyle(3, 0xff3d81).strokeCircle(c, c, r - 2);
      g.fillStyle(col).fillCircle(c, c, r * 0.6);
      g.fillStyle(0xff3d81).fillCircle(c, c, r * 0.3);
      g.fillStyle(dark).fillCircle(c, c, r * 0.12);
  }
}
