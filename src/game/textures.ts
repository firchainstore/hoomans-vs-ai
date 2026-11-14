import Phaser from 'phaser';
import { ENEMIES, SKINS, hex } from '../core/data';
import type { EnemyDef, SkinDef } from '../core/types';

/** Margen alrededor del círculo de colisión dentro de cada textura (deja sitio a brillos y sombras). */
export const PAD = 10;
/** Escala de dibujo de personajes y objetos: se ven grandes y legibles en pantallas de móvil. */
export const SPRITE_SCALE = 1.45;
type C = CanvasRenderingContext2D;

/** RNG con semilla: el arte generado es idéntico en cada arranque. */
export function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shade = (n: number, k: number) => (Math.round(((n >> 16) & 255) * k) << 16) | (Math.round(((n >> 8) & 255) * k) << 8) | Math.round((n & 255) * k);
const rgba = (n: number, a = 1) => `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;

// ---- utilidades de dibujo (origen en el centro del sprite, mirando a la derecha) ----
function grad(c: C, y0: number, y1: number, a: string, b: string) {
  const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g;
}
function radial(c: C, x: number, y: number, r: number, stops: [number, string][]) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
}
function rr(c: C, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient) {
  c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill();
}
function ell(c: C, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, rot = 0) {
  c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
}
function poly(c: C, pts: number[], fill: string | CanvasGradient, stroke?: string) {
  c.beginPath(); c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath(); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); }
}
/** Brillo aditivo (ojos, motores, pantallas). */
function glow(c: C, x: number, y: number, r: number, col: number, a = 1) {
  c.save(); c.globalCompositeOperation = 'lighter';
  c.fillStyle = radial(c, x, y, r, [[0, rgba(col, a)], [1, rgba(col, 0)]]);
  c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
}
const shadow = (c: C, rx: number, ry: number) => ell(c, 2, 4, rx, ry, 'rgba(0,0,0,0.38)');
const eye = (c: C, x: number, y: number, r: number, col: number) => {
  ell(c, x, y, r, r, rgba(col)); ell(c, x, y, r * 0.45, r * 0.45, '#ffffff'); glow(c, x, y, r * 4, col, 0.8);
};

/**
 * TODO EL ARTE ES PROCEDURAL (dibujado por código), no hay ilustraciones. Para usar arte real, cargar
 * en BootScene.preload() una imagen con la MISMA clave: si la clave ya existe, aquí no se genera.
 * Claves y tamaños: public/assets/README.md
 */
export function buildTextures(scene: Phaser.Scene) {
  const make = (key: string, w: number, h: number, draw: (c: C) => void, centered = true, k = 1) => {
    if (scene.textures.exists(key)) return;
    const t = scene.textures.createCanvas(key, Math.ceil(w * k), Math.ceil(h * k))!;
    const c = t.getContext();
    c.scale(k, k);
    if (centered) c.translate(w / 2, h / 2);
    draw(c); t.refresh();
  };
  const R = rng(7), K = SPRITE_SCALE;
  const { width: W, height: H } = scene.scale;

  for (const s of SKINS) make(`player_${s.id}`, 46, 46, (c) => drawPlayer(c, s), true, K);
  for (const e of ENEMIES) { const s = 2 * (e.radius + PAD); make(`enemy_${e.id}`, s, s, (c) => drawEnemy(c, e), true, K); }

  make('bullet_p', 26, 10, (c) => { // trazadora blanca (se tiñe con el color del arma)
    const g = c.createLinearGradient(-13, 0, 13, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0.55)'); g.addColorStop(1, '#ffffff');
    rr(c, -13, -3, 26, 6, 3, g); rr(c, 3, -1.5, 10, 3, 1.5, '#ffffff');
  });
  make('bullet_e', 20, 20, (c) => { c.fillStyle = radial(c, 0, 0, 10, [[0, '#ffffff'], [0.3, '#ff6aa0'], [0.6, 'rgba(255,61,129,0.5)'], [1, 'rgba(255,61,129,0)']]); c.fillRect(-10, -10, 20, 20); });
  const soft = (key: string, s: number, mid = 0.35) => make(key, s, s, (c) => {
    c.fillStyle = radial(c, 0, 0, s / 2, [[0, '#ffffff'], [mid, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(-s / 2, -s / 2, s, s);
  });
  soft('particle', 12); soft('flash', 96, 0.25); soft('light', 320, 0.3);
  make('scorch', 72, 72, (c) => {
    c.fillStyle = radial(c, 0, 0, 36, [[0, 'rgba(0,0,0,0.75)'], [0.5, 'rgba(8,6,10,0.45)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(-36, -36, 72, 72);
    for (let i = 0; i < 14; i++) { const a = R() * 6.28, d = 8 + R() * 22; ell(c, Math.cos(a) * d, Math.sin(a) * d, 1 + R() * 2, 1 + R() * 2, 'rgba(0,0,0,0.5)'); }
  });
  make('heal', 30, 30, (c) => {
    shadow(c, 10, 9);
    rr(c, -10, -9, 20, 18, 3, grad(c, -9, 9, '#4a4636', '#25231b'));
    c.strokeStyle = '#8f8667'; c.lineWidth = 1; c.strokeRect(-9.5, -8.5, 19, 17);
    rr(c, -2, -6, 4, 12, 1, '#ffb347'); rr(c, -6, -2, 12, 4, 1, '#ffb347'); glow(c, 0, 0, 13, 0xffb347, 0.6);
  }, true, K);
  make('convoy', 116, 62, (c) => {
    ell(c, 3, 5, 54, 26, 'rgba(0,0,0,0.4)');
    for (const [x, y] of [[-38, -27], [-10, -27], [28, -27], [-38, 20], [-10, 20], [28, 20]]) rr(c, x, y, 16, 7, 2, '#0f0e0c');
    rr(c, -52, -22, 104, 44, 6, grad(c, -22, 22, '#6f6a4c', '#35331f'));
    rr(c, -48, -18, 66, 36, 3, grad(c, -18, 18, '#565238', '#2b2a1b'));
    c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 1;
    for (let x = -36; x < 18; x += 13) { c.beginPath(); c.moveTo(x, -18); c.lineTo(x, 18); c.stroke(); }
    rr(c, 22, -19, 24, 38, 4, grad(c, -19, 19, '#7a7556', '#403d27'));
    rr(c, 34, -14, 8, 28, 2, grad(c, -14, 14, '#9fd3e6', '#35566b'));
    rr(c, -48, -3, 66, 6, 0, '#ffb347'); glow(c, 50, -15, 12, 0xfff0c0, 0.9); glow(c, 50, 15, 12, 0xfff0c0, 0.9);
  }, true, K);
  make('terminal', 52, 52, (c) => { // claro: el juego lo tiñe (cian → ámbar al hackearlo)
    shadow(c, 20, 18);
    rr(c, -20, -20, 40, 40, 5, grad(c, -20, 20, '#8b8b96', '#44444d'));
    rr(c, -15, -15, 30, 19, 2, '#111118'); rr(c, -13, -13, 26, 15, 1, '#ffffff');
    c.fillStyle = 'rgba(0,0,0,0.35)'; for (let y = -11; y < 1; y += 4) c.fillRect(-11, y, 8 + R() * 14, 1.5);
    for (let x = -14; x < 14; x += 6) rr(c, x, 8, 4, 3, 1, '#d8d8e0');
    glow(c, 0, -6, 24, 0xffffff, 0.45);
  }, true, K);
  make('arrow', 26, 26, (c) => { poly(c, [12, 0, -9, -10, -4, 0, -9, 10], '#ffb347', '#fff1cf'); });
  make('stick_base', 128, 128, (c) => { ell(c, 0, 0, 62, 62, 'rgba(255,255,255,0.08)'); c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 61, 0, 6.29); c.stroke(); });
  make('stick_thumb', 56, 56, (c) => ell(c, 0, 0, 27, 27, radial(c, 0, 0, 27, [[0, 'rgba(255,255,255,0.75)'], [1, 'rgba(255,255,255,0.35)']])));

  // Asfalto en grises (cada misión lo tiñe con arena.tint). Debe poder repetirse sin costuras.
  make('ground', 256, 256, (c) => {
    c.fillStyle = '#4a4752'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 9; i++) { const x = 40 + R() * 176, y = 40 + R() * 176, r = 20 + R() * 20;
      c.fillStyle = radial(c, x, y, r, [[0, `rgba(${R() < 0.5 ? '20,18,26' : '120,116,130'},0.22)`], [1, 'rgba(0,0,0,0)']]); c.fillRect(x - r, y - r, r * 2, r * 2); }
    for (let i = 0; i < 1500; i++) { c.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.09)'; c.fillRect(R() * 256, R() * 256, 1 + R(), 1 + R()); }
    for (let k = 0; k < 4; k++) { // grietas
      let x = 30 + R() * 190, y = 30 + R() * 190, a = R() * 6.28;
      c.beginPath(); c.moveTo(x, y);
      for (let i = 0; i < 7; i++) { a += (R() - 0.5) * 1.4; x = Phaser.Math.Clamp(x + Math.cos(a) * 14, 6, 250); y = Phaser.Math.Clamp(y + Math.sin(a) * 14, 6, 250); c.lineTo(x, y); }
      c.strokeStyle = 'rgba(10,8,14,0.6)'; c.lineWidth = 1.4; c.stroke();
    }
  }, false);
  // Calcomanías de decorado (sin colisión)
  make('d_crater', 110, 110, (c) => {
    c.fillStyle = radial(c, 0, 0, 55, [[0, 'rgba(8,6,12,0.85)'], [0.45, 'rgba(20,17,26,0.7)'], [0.62, 'rgba(110,104,120,0.35)'], [0.8, 'rgba(30,26,36,0.25)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(-55, -55, 110, 110);
    for (let i = 0; i < 26; i++) { const a = R() * 6.28, d = 26 + R() * 24, s = 1 + R() * 3.5; rr(c, Math.cos(a) * d, Math.sin(a) * d, s, s, 1, R() < 0.5 ? '#77727f' : '#2a2731'); }
  });
  make('d_rubble', 96, 96, (c) => {
    for (let i = 0; i < 20; i++) {
      const x = (R() - 0.5) * 60, y = (R() - 0.5) * 60, s = 5 + R() * 11, a = R() * 6.28, pts: number[] = [];
      for (let k = 0; k < 5; k++) { const d = s * (0.55 + R() * 0.45); pts.push(x + Math.cos(a + k * 1.257) * d, y + Math.sin(a + k * 1.257) * d); }
      poly(c, pts.map((v, j) => v + (j % 2 ? 3 : 2)), 'rgba(0,0,0,0.4)');
      const v = 70 + Math.floor(R() * 70); poly(c, pts, `rgb(${v},${v - 4},${v + 6})`, 'rgba(255,255,255,0.18)');
    }
  });
  make('d_mark', 150, 12, (c) => { for (let x = -75; x < 75; x += 50) { rr(c, x, -3, 32, 6, 1, 'rgba(226,214,160,0.34)'); c.clearRect(x + 8 + R() * 14, -3, 3, 6); } });
  make('d_puddle', 110, 70, (c) => {
    c.save(); c.beginPath(); c.ellipse(0, 0, 50, 28, 0.2, 0, 6.29); c.ellipse(18, 8, 30, 20, -0.4, 0, 6.29); c.clip();
    c.fillStyle = grad(c, -30, 30, 'rgba(12,10,20,0.85)', 'rgba(40,30,60,0.8)'); c.fillRect(-55, -35, 110, 70);
    glow(c, -14, -6, 30, 0xffffff, 0.22); glow(c, 22, 10, 22, 0xffffff, 0.14); c.restore();
  });
  make('d_plate', 90, 70, (c) => {
    poly(c, [-36, -20, 30, -28, 40, 14, -8, 26, -40, 8].map((v, i) => v + (i % 2 ? 4 : 3)), 'rgba(0,0,0,0.4)');
    poly(c, [-36, -20, 30, -28, 40, 14, -8, 26, -40, 8], grad(c, -28, 26, '#8d8a95', '#4a4752'), 'rgba(255,255,255,0.25)');
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.moveTo(-30, -8); c.lineTo(34, -12); c.moveTo(-26, 8); c.lineTo(30, 6); c.stroke();
    for (let i = 0; i < 5; i++) glow(c, (R() - 0.5) * 60, (R() - 0.5) * 36, 9, 0x8a4a2a, 0.5);
  });
  make('vignette', W, H, (c) => {
    c.fillStyle = radial(c, 0, 0, Math.hypot(W, H) / 2, [[0.45, 'rgba(6,4,12,0)'], [0.8, 'rgba(6,4,12,0.45)'], [1, 'rgba(6,4,12,0.85)']]); c.fillRect(-W / 2, -H / 2, W, H);
  });
  make('menu_bg', W, H, (c) => drawMenuBg(c, W, H), false);
}

/** Superviviente: una persona corriente con ropa de calle, mochila y un rifle de caza. */
function drawPlayer(c: C, s: SkinDef) {
  const jacket = hex(s.jacket), hair = hex(s.hair), pack = hex(s.color), skin = '#c99b7a';
  shadow(c, 13, 12);
  rr(c, 2, -2.5, 10, 5, 1.5, '#6b4a2c'); rr(c, 10, -1.4, 13, 2.8, 1, '#1c1c20'); // rifle de caza: culata de madera
  rr(c, -14, -7, 8, 14, 3, grad(c, -7, 7, rgba(pack), rgba(shade(pack, 0.5)))); // mochila
  c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-10, -7); c.lineTo(-10, 7); c.stroke();
  ell(c, 7, -7, 5.5, 3.2, rgba(shade(jacket, 0.9)), 0.55); ell(c, 6, 6.5, 5.5, 3.2, rgba(shade(jacket, 0.7)), -0.5); // mangas
  ell(c, 11.5, -3.6, 2, 2, skin); ell(c, 9.5, 3, 2, 2, skin); // manos
  ell(c, 0, 0, 8.5, 13, grad(c, -13, 13, rgba(shade(jacket, 1.15)), rgba(shade(jacket, 0.5)))); // chaqueta
  c.strokeStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.moveTo(3, -9); c.lineTo(6, 0); c.lineTo(3, 9); c.stroke(); // solapas
  rr(c, -6, -13, 3, 26, 1.5, rgba(shade(pack, 0.7))); // correas
  ell(c, 1, 0, 6.3, 6.3, skin);
  if (s.head === 'cap') { ell(c, 0.5, 0, 6.3, 6.3, rgba(hair)); ell(c, 6.5, 0, 3, 5.2, rgba(shade(hair, 0.6))); }
  else if (s.head === 'beanie') { ell(c, 0.5, 0, 6.6, 6.6, rgba(hair)); ell(c, -1, 0, 2.2, 2.2, rgba(shade(hair, 1.4))); }
  else { ell(c, -0.5, 0, 6.3, 6.4, rgba(hair)); ell(c, 4.6, 0, 2.3, 4.2, skin); if (s.head === 'bun') ell(c, -6.5, 0, 3, 3, rgba(shade(hair, 0.8))); }
  c.strokeStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.arc(1, 0, 6.3, 0, 6.29); c.stroke();
}

function drawEnemy(c: C, e: EnemyDef) {
  const r = e.radius, col = hex(e.color), steel = (a: string, b: string) => grad(c, -r, r, a, b);
  switch (e.shape) {
    case 'tri': { // dron cuadricóptero
      shadow(c, r, r * 0.9);
      c.strokeStyle = '#23242c'; c.lineWidth = 3;
      for (const [x, y] of [[9, 9], [9, -9], [-9, 9], [-9, -9]]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(x, y); c.stroke(); }
      for (const [x, y] of [[9, 9], [9, -9], [-9, 9], [-9, -9]]) {
        ell(c, x, y, 6.5, 6.5, 'rgba(190,215,255,0.16)'); c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, 6.5, 0, 6.29); c.stroke(); ell(c, x, y, 1.6, 1.6, '#101014');
      }
      ell(c, 0, 0, 7.5, 6, steel('#9aa0b0', '#3a3d49')); eye(c, 4, 0, 2.6, col);
      break;
    }
    case 'square': { // sintético: esqueleto de metal desnudo, pistones a la vista
      shadow(c, r * 0.8, r);
      rr(c, 6, 3.6, 17, 3.4, 1, '#0f1014'); glow(c, 23, 5.3, 6, col, 0.7); // arma integrada en el antebrazo
      c.strokeStyle = '#8d93a3'; c.lineWidth = 2.4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, -12); c.lineTo(9, -8); c.moveTo(0, 12); c.lineTo(8, 5.5); c.stroke();
      c.strokeStyle = '#3a3d48'; c.lineWidth = 1; c.beginPath(); c.moveTo(1, -10.5); c.lineTo(8, -7); c.moveTo(1, 10.5); c.lineTo(7, 5); c.stroke();
      rr(c, -1.8, -12, 3.6, 24, 1.8, '#23252e'); // columna
      for (let y = -9; y <= 9; y += 4.5) rr(c, -6.5, y - 1, 12, 2, 1, steel('#c3c8d4', '#5b6070')); // costillas
      ell(c, 0, -12, 3.6, 3.6, steel('#d5d9e2', '#555a68')); ell(c, 0, 12, 3.6, 3.6, steel('#d5d9e2', '#555a68')); // hombros
      ell(c, 9, -8, 2, 2, '#30323c'); ell(c, 8, 5.5, 2, 2, '#30323c');
      ell(c, 2, 0, 5.6, 5, radial(c, 0, -2, 7, [[0, '#f1f3f7'], [1, '#5a5f6d']])); // cráneo
      rr(c, 4.2, -3.6, 3.2, 7.2, 1, '#1b1c23'); // placa de sensores
      eye(c, 5.6, -2.1, 1.25, col); eye(c, 5.6, 2.1, 1.25, col);
      break;
    }
    case 'hex': { // torreta
      const pts: number[] = [];
      for (let i = 0; i < 6; i++) pts.push(r * Math.cos(i * Math.PI / 3), r * Math.sin(i * Math.PI / 3));
      poly(c, pts.map((v, i) => v + (i % 2 ? 4 : 2)), 'rgba(0,0,0,0.4)');
      poly(c, pts, steel('#5d5a6c', '#26242f'), 'rgba(255,255,255,0.3)');
      for (let i = 0; i < 12; i += 2) ell(c, pts[i] * 0.8, pts[i + 1] * 0.8, 1.6, 1.6, '#12111a');
      rr(c, 5, -7, 20, 4.5, 1.5, '#16161c'); rr(c, 5, 2.5, 20, 4.5, 1.5, '#16161c');
      ell(c, 0, 0, 10.5, 10.5, steel('#a2a4b3', '#3d3e4b')); eye(c, 2, 0, 3, col);
      break;
    }
    case 'mech': {
      shadow(c, r, r);
      rr(c, -12, -r, 18, 10, 3, '#1d1e26'); rr(c, -12, r - 10, 18, 10, 3, '#1d1e26'); // piernas
      rr(c, 8, -19, 20, 6, 2, '#121217'); rr(c, 8, 13, 20, 6, 2, '#121217'); // cañones
      rr(c, -15, -15, 28, 30, 6, steel('#9a9eab', '#343742'));
      rr(c, -8, -r + 1, 15, 10, 3, steel('#70748a', '#2c2e3a')); rr(c, -8, r - 11, 15, 10, 3, steel('#70748a', '#2c2e3a'));
      for (const y of [-r + 6, r - 6]) for (const x of [-4, 0, 4]) ell(c, x, y, 1.3, 1.3, '#0e0e13');
      c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1; c.strokeRect(-11.5, -10.5, 14, 21);
      rr(c, 5, -7, 5, 14, 2, rgba(col)); glow(c, 8, 0, 16, col, 0.75);
      break;
    }
    case 'boss': { // Cazador Alfa: depredador en forma de cuchilla
      ell(c, 3, 5, r * 0.9, r * 0.8, 'rgba(0,0,0,0.4)');
      glow(c, -20, -9, 16, 0x35e0ff, 0.9); glow(c, -20, 9, 16, 0x35e0ff, 0.9);
      poly(c, [r, 0, -4, -r + 3, -r + 6, -13, -15, 0, -r + 6, 13, -4, r - 3], grad(c, -r, r, '#8a8fa6', '#1b1d2b'), 'rgba(255,255,255,0.45)');
      poly(c, [r - 6, 0, -2, -12, -12, 0, -2, 12], grad(c, -12, 12, '#3a3d50', '#11121c'));
      c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-4, -r + 3); c.lineTo(8, -4); c.moveTo(-4, r - 3); c.lineTo(8, 4); c.stroke();
      rr(c, 9, -5, 7, 10, 3, rgba(col)); rr(c, 11, -2.5, 3, 5, 1.5, '#ffffff'); glow(c, 13, 0, 22, col, 0.9);
      break;
    }
    default: { // TUTELA: ojo-reactor
      glow(c, 0, 0, r + PAD, 0xff3d81, 0.35);
      ell(c, 0, 0, r, r, radial(c, 0, 0, r, [[0.55, '#2c2a3a'], [1, '#12111a']]));
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        c.save(); c.rotate(a); rr(c, r - 13, -7, 11, 14, 2, grad(c, -7, 7, '#70708a', '#2e2d3d')); ell(c, r - 7.5, 0, 1.6, 1.6, i % 3 ? '#15141c' : '#ff3d81'); c.restore();
      }
      c.strokeStyle = '#ff3d81'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r - 16, 0, 6.29); c.stroke();
      ell(c, 0, 0, r - 19, r - 19, radial(c, -6, -6, r - 12, [[0, '#8c8fa6'], [1, '#262735']]));
      ell(c, 0, 0, 17, 17, radial(c, 0, 0, 17, [[0, '#ffffff'], [0.35, rgba(col)], [0.75, '#ff3d81'], [1, '#5a1030']]));
      ell(c, 0, 0, 4.5, 4.5, '#0b0a12'); glow(c, 0, 0, 34, 0xff3d81, 0.7);
    }
  }
}

/** Ilustración del menú: bahía en ruinas, puente roto y el ojo de TUTELA sobre el horizonte. */
function drawMenuBg(c: C, W: number, H: number) {
  const R = rng(42), hz = H * 0.66;
  const sky = c.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, '#07060f'); sky.addColorStop(0.5, '#1d1030'); sky.addColorStop(0.85, '#6a2440'); sky.addColorStop(1, '#d9603a');
  c.fillStyle = sky; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) { // bandas de humo
    const y = H * (0.12 + i * 0.08), g = c.createLinearGradient(0, y - 22, 0, y + 22);
    g.addColorStop(0, 'rgba(10,6,18,0)'); g.addColorStop(0.5, `rgba(10,6,18,${0.25 + R() * 0.25})`); g.addColorStop(1, 'rgba(10,6,18,0)');
    c.fillStyle = g; c.fillRect(0, y - 22, W, 44);
  }
  const ex = W * 0.74, ey = hz - 70; // ojo de TUTELA
  glow(c, ex, ey, 260, 0xff3d81, 0.5);
  ell(c, ex, ey, 74, 74, radial(c, ex, ey, 74, [[0, '#ffffff'], [0.3, '#ffd0e0'], [0.7, '#ff3d81'], [1, '#7a1840']]));
  c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2; c.beginPath(); c.arc(ex, ey, 92, 0, 6.29); c.stroke();
  c.strokeStyle = 'rgba(255,61,129,0.5)'; c.lineWidth = 1; c.beginPath(); c.arc(ex, ey, 112, 0, 6.29); c.stroke();
  ell(c, ex, ey, 15, 15, '#0b0812');
  const skyline = (base: number, col: string, hMin: number, hMax: number, lit: number) => {
    for (let x = -10; x < W;) {
      const w = 26 + R() * 56, h = hMin + R() * (hMax - hMin), top = base - h, pts = [x, base, x, top + R() * 14];
      for (let k = 1; k <= 4; k++) pts.push(x + (w * k) / 4, top + (R() < 0.45 ? R() * h * 0.35 : 0)); // remate roto
      pts.push(x + w, base);
      poly(c, pts, col);
      for (let i = 0; i < lit; i++) if (R() < 0.5) { c.fillStyle = R() < 0.5 ? 'rgba(53,224,255,0.55)' : 'rgba(255,61,129,0.5)'; c.fillRect(x + 4 + R() * (w - 10), top + h * 0.4 + R() * h * 0.5, 2, 3); }
      x += w + R() * 10;
    }
  };
  skyline(hz + 8, '#3b1a3c', 50, 170, 3);
  // Puente colgante roto
  const deck = hz - 26, t1 = W * 0.1, t2 = W * 0.42, top = hz - 190, col = '#190d20';
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 2;
  for (const tx of [t1, t2]) { c.fillRect(tx - 7, top, 5, 220); c.fillRect(tx + 2, top, 5, 220); for (let y = top + 12; y < deck; y += 34) c.fillRect(tx - 7, y, 14, 4); }
  const cableY = (x: number) => top + 4 + (deck - top - 22) * (1 - Math.pow((x - (t1 + t2) / 2) / ((t2 - t1) / 2), 2));
  const gap0 = W * 0.24, gap1 = W * 0.31;
  c.beginPath(); for (let x = t1; x <= gap0; x += 4) c.lineTo(x, cableY(x)); c.stroke();
  c.beginPath(); for (let x = gap1 + 20; x <= t2; x += 4) c.lineTo(x, cableY(x)); c.stroke();
  c.beginPath(); c.moveTo(gap0, cableY(gap0)); c.quadraticCurveTo(gap0 + 14, deck + 30, gap0 + 8, deck + 60); c.stroke(); // cable colgando
  c.beginPath(); c.moveTo(0, top + 90); c.lineTo(t1, top + 4); c.moveTo(t2, top + 4); c.lineTo(t2 + 150, deck); c.stroke();
  c.lineWidth = 1;
  for (let x = t1 + 12; x < t2; x += 12) if (x < gap0 || x > gap1 + 20) { c.beginPath(); c.moveTo(x, cableY(x)); c.lineTo(x, deck); c.stroke(); }
  c.fillRect(0, deck, gap0, 7); c.fillRect(gap1, deck + 0, t2 + 150 - gap1, 7);
  poly(c, [gap0, deck, gap0 + 22, deck + 26, gap0 + 16, deck + 30, gap0 - 8, deck + 7], col); // tramo caído
  const haze = c.createLinearGradient(0, hz - 60, 0, hz + 30);
  haze.addColorStop(0, 'rgba(255,120,60,0)'); haze.addColorStop(0.7, 'rgba(255,120,60,0.28)'); haze.addColorStop(1, 'rgba(255,120,60,0)');
  c.fillStyle = haze; c.fillRect(0, hz - 60, W, 90);
  skyline(H * 0.8, '#130a1a', 40, 210, 2);
  c.fillStyle = '#09060e'; c.fillRect(0, H * 0.8 - 1, W, H * 0.2 + 1);
  for (let i = 0; i < 40; i++) { const x = R() * W, s = 6 + R() * 22; poly(c, [x, H * 0.8, x + s * 0.4, H * 0.8 - s * 0.5, x + s, H * 0.8 - s * 0.2, x + s * 1.3, H * 0.8], '#09060e'); }
  // Supervivientes: siluetas de gente corriente mirando hacia el ojo
  const person = (x: number, h: number, kind: number) => {
    const y = H * 0.8 + 6, w = h * 0.3; c.fillStyle = '#07050b';
    c.fillRect(x - w * 0.45, y - h * 0.48, w * 0.38, h * 0.48); c.fillRect(x + w * 0.07, y - h * 0.48, w * 0.38, h * 0.48);
    poly(c, [x - w * 0.6, y - h * 0.44, x - w * 0.5, y - h * 0.82, x + w * 0.5, y - h * 0.82, x + w * 0.6, y - h * 0.44], '#07050b');
    ell(c, x, y - h * 0.91, h * 0.085, h * 0.09, '#07050b');
    if (kind === 1) c.fillRect(x - w * 0.9, y - h * 0.8, w * 0.4, h * 0.3); // mochila
    if (kind === 2) c.fillRect(x - h * 0.1, y - h * 0.99, h * 0.26, h * 0.03); // gorra
    if (kind === 3) { c.save(); c.translate(x + w * 0.5, y - h * 0.7); c.rotate(-0.5); c.fillRect(0, 0, h * 0.5, h * 0.035); c.restore(); } // rifle al hombro
    c.strokeStyle = 'rgba(255,140,70,0.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + w * 0.52, y - h * 0.8); c.lineTo(x + w * 0.62, y - h * 0.45); c.stroke();
    c.beginPath(); c.arc(x, y - h * 0.91, h * 0.09, -1.2, 0.9); c.stroke();
  };
  [[0.05, 62, 1], [0.085, 54, 0], [0.12, 66, 3], [0.16, 50, 2], [0.19, 58, 1]].forEach(([fx, h, k]) => person(W * fx, h, k));
  for (let i = 0; i < 90; i++) glow(c, R() * W, R() * H * 0.85, 1.5 + R() * 3, R() < 0.8 ? 0xff8a3d : 0xffd9a0, 0.5 + R() * 0.5); // brasas
  for (let y = 0; y < H; y += 3) { c.fillStyle = 'rgba(0,0,0,0.07)'; c.fillRect(0, y, W, 1); }
}
