import Phaser from 'phaser';
import { sfx } from '../game/Sfx';

// Identidad visual: humanos = ámbar cálido; máquinas = cian/magenta frío; fondo violeta casi negro.
export const COLORS = { bg: 0x0d0b14, panel: 0x1c1830, panelHi: 0x2c2548, accent: 0xffb347, machine: 0x35e0ff, danger: 0xff3d81, ok: 0x7ee081 };
export const TEXT = { main: '#f2ecff', dim: '#9a90b8', accent: '#ffb347', machine: '#35e0ff', danger: '#ff3d81', dark: '#14111f' };
export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
const RES = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;

export function label(scene: Phaser.Scene, x: number, y: number, text: string, size = 20, color: string = TEXT.main, wrap = 0) {
  return scene.add.text(x, y, text, {
    fontFamily: FONT, fontSize: `${size}px`, color, resolution: RES, align: 'center',
    wordWrap: wrap ? { width: wrap } : undefined,
  }).setOrigin(0.5);
}

export interface ButtonOpts { w?: number; h?: number; fill?: number; color?: string; size?: number; enabled?: boolean }
export function button(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, o: ButtonOpts = {}) {
  const { w = 280, h = 52, fill = COLORS.panelHi, color = TEXT.main, size = 20, enabled = true } = o;
  const bg = scene.add.rectangle(0, 0, w, h, fill, 0.92).setStrokeStyle(2, enabled ? COLORS.accent : 0x4a4460);
  const txt = label(scene, 0, 0, text, size, enabled ? color : TEXT.dim);
  const c = scene.add.container(x, y, [bg, txt]);
  if (enabled) {
    bg.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => bg.setFillStyle(COLORS.accent, 0.35))
      .on('pointerout', () => bg.setFillStyle(fill))
      .on('pointerup', () => { bg.setFillStyle(fill); sfx.play('ui'); onClick(); });
  } else c.setAlpha(0.7);
  return c;
}

/** Fondo común de los menús + título + botón de volver opcional. */
export function menuFrame(scene: Phaser.Scene, title: string, backTo?: string, dim = 0.72) {
  const { width, height } = scene.scale;
  scene.add.image(0, 0, 'menu_bg').setOrigin(0);
  scene.add.rectangle(0, 0, width, height, COLORS.bg, dim).setOrigin(0);
  if (title) label(scene, width / 2, 36, title, 30, TEXT.accent).setFontStyle('bold');
  if (backTo) button(scene, 70, 36, '‹', () => scene.scene.start(backTo), { w: 84, h: 44, size: 28 });
}
