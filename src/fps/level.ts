// Generador de escenarios: una zona abierta del tamaño de la arena de la misión, rodeada de edificios en
// ruinas y sembrada de coberturas. Determinista por misión (semilla = id). Unidades: metros.
import * as THREE from 'three';
import { M, box, canvasTex, fog, glowMat, grime, rnd, scene, seeded, tutela } from './gfx';

export interface Collider { x: number; z: number; hw: number; hd: number; h: number }
export interface Keep { x: number; z: number; r: number }
export const L = { hw: 30, hd: 20, colliders: [] as Collider[], fires: [] as THREE.PointLight[], flames: [] as THREE.Mesh[], group: new THREE.Group() };

const asphalt = canvasTex(512, (c, s) => {
  c.fillStyle = '#3b3c41'; c.fillRect(0, 0, s, s); grime(c, s, 6000);
  for (let i = 0; i < 14; i++) { const x = Math.random() * s, y = Math.random() * s, r = rnd(20, 70), g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(10,10,14,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); }
  c.strokeStyle = 'rgba(8,8,10,.7)'; c.lineWidth = 1.5;
  for (let k = 0; k < 7; k++) { let x = rnd(40, s - 40), y = rnd(40, s - 40), a = rnd(0, 6.28); c.beginPath(); c.moveTo(x, y); for (let i = 0; i < 9; i++) { a += rnd(-0.7, 0.7); x += Math.cos(a) * 18; y += Math.sin(a) * 18; c.lineTo(x, y); } c.stroke(); }
});
const facade = (base: string, lit: string) => canvasTex(512, (c, s) => {
  c.fillStyle = base; c.fillRect(0, 0, s, s); grime(c, s, 5000);
  for (let i = 0; i < 60; i++) { c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(Math.random() * s, Math.random() * s, rnd(2, 5), rnd(30, 160)); }
  for (let y = 26; y < s - 40; y += 84) for (let x = 22; x < s - 40; x += 62) {
    const r = Math.random(); c.fillStyle = '#2c2d32'; c.fillRect(x - 4, y - 4, 48, 62);
    c.fillStyle = r < 0.06 ? lit : r < 0.55 ? '#06080c' : '#161b24'; c.fillRect(x, y, 40, 54);
    c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(x, y, 40, 3); c.fillStyle = '#2c2d32'; c.fillRect(x + 19, y, 2, 54);
    if (r > 0.78) { c.fillStyle = base; c.beginPath(); c.moveTo(x, y + 54); c.lineTo(x + rnd(10, 40), y + 54); c.lineTo(x + rnd(0, 20), y + rnd(10, 40)); c.fill(); }
  }
});
const facades = [facade('#56545a', '#ffb65c'), facade('#4a4f58', '#7fd0ff'), facade('#5e5148', '#ff8a4a')];
const metalTex = canvasTex(256, (c, s) => { c.fillStyle = '#6a3a2a'; c.fillRect(0, 0, s, s); grime(c, s, 2500); for (let x = 0; x < s; x += 16) { c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(x, 0, 5, s); } for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(40,20,10,.4)'; c.fillRect(Math.random() * s, Math.random() * s, rnd(8, 40), rnd(8, 30)); } });
const concrete = M(0x5a595e), rust = new THREE.MeshStandardMaterial({ map: metalTex, roughness: 0.75, metalness: 0.35 }), darkM = M(0x15161a, 0.7, 0.4), curb = M(0x6a6a70), glass = M(0x0c1016, 0.2, 0.8);
const paint = new THREE.MeshStandardMaterial({ color: 0xb9ae7a, roughness: 1, transparent: true, opacity: 0.45 });
const flameMat = glowMat(0xff7a22, 3.5), poleMat = M(0x2a2c30, 0.6, 0.7), rubbleGeo = new THREE.DodecahedronGeometry(1, 0), wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 14);
const CAR_COLORS = [0x6a2a22, 0x2f3b45, 0x55553a, 0x35323a, 0x6b5a2a, 0x244034];

export function buildLevel(wPx: number, hPx: number, seedText: string, tint: number, keep: Keep[]) {
  scene.remove(L.group);
  L.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.geometry !== rubbleGeo && m.geometry !== wheelGeo) m.geometry.dispose(); });
  const G = (L.group = new THREE.Group()); scene.add(G);
  const R = seeded(seedText), hw = (L.hw = wPx / 50), hd = (L.hd = hPx / 50);
  L.colliders = []; L.fires = []; L.flames = [];
  fog.color.set(0x22344a).lerp(new THREE.Color(tint), 0.14); // cada misión tiene su tono de niebla
  tutela.position.set(0, 62, -hd - 150);

  const gmap = asphalt.clone(); gmap.repeat.set((hw + 60) / 4.5, (hd + 60) / 4.5); gmap.needsUpdate = true;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2 * hw + 120, 2 * hd + 120), new THREE.MeshStandardMaterial({ map: gmap, roughness: 0.92 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; G.add(ground);
  for (let x = -hw; x < hw; x += 7) { if (R() < 0.25) continue; const l = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.22), paint); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.012, 0); G.add(l); }

  const building = (x: number, z: number, w: number, d: number, h: number) => {
    const map = facades[Math.floor(R(0, 3))].clone(); map.repeat.set(Math.max(1, Math.round(w / 9)), Math.max(1, Math.round(h / 10))); map.needsUpdate = true;
    box(w, h, d, new THREE.MeshStandardMaterial({ map, roughness: 0.9 }), x, h / 2, z, G); box(w + 0.5, 0.5, d + 0.5, curb, x, 3.6, z, G);
    for (let i = 0; i < 4; i++) { const bw = R(w * 0.15, w * 0.5), bh = R(1, h * 0.3); box(bw, bh, R(d * 0.3, d), concrete, x + R(-w / 2 + bw / 2, w / 2 - bw / 2), h + bh / 2 - 0.2, z, G).rotation.z = R(-0.08, 0.08); }
  };
  for (const s of [-1, 1]) { // dos filas de edificios en cada lado: la zona queda cerrada y con fondo de ciudad
    for (let x = -hw - 16; x < hw + 16;) { const w = R(13, 19); building(x + w / 2, s * (hd + 9), w - 1, 16, R(12, 34)); x += w; }
    for (let z = -hd; z < hd;) { const d = R(13, 19); building(s * (hw + 9), z + d / 2, 16, d - 1, R(12, 34)); z += d; }
    for (let x = -hw - 30; x < hw + 30; x += 22) building(x + 11, s * (hd + 30), 20, 18, R(30, 60));
    for (let z = -hd - 10; z < hd + 10; z += 22) building(s * (hw + 30), z + 11, 18, 20, R(30, 60));
  }
  box(2 * hw + 2, 0.24, 2.4, curb, 0, 0.12, hd + 0.2, G); box(2 * hw + 2, 0.24, 2.4, curb, 0, 0.12, -hd - 0.2, G); // aceras

  const free = (x: number, z: number, r: number) => Math.abs(x) < hw - r - 1 && Math.abs(z) < hd - r - 1 && keep.every((k) => Math.hypot(x - k.x, z - k.z) > k.r + r) && L.colliders.every((c) => Math.abs(x - c.x) > c.hw + r + 1.6 || Math.abs(z - c.z) > c.hd + r + 1.6);
  const place = (n: number, r: number, make: (x: number, z: number) => void) => { for (let i = 0, tries = 0; i < n && tries < n * 12; tries++) { const x = R(-hw, hw), z = R(-hd, hd); if (free(x, z, r)) { make(x, z); i++; } } };
  const area = (4 * hw * hd) / 1000;
  place(Math.round(area * 2.2), 2.4, (x, z) => { // coches abandonados
    const rot = R() < 0.6 ? R(-0.2, 0.2) : Math.PI / 2 + R(-0.2, 0.2), g = new THREE.Group(), pm = M(CAR_COLORS[Math.floor(R(0, 6))], 0.5, 0.55); g.position.set(x, 0, z); g.rotation.y = rot;
    box(4.3, 0.7, 1.9, pm, 0, 0.72, 0, g); box(2.3, 0.62, 1.72, pm, -0.25, 1.36, 0, g); box(2.34, 0.44, 1.5, glass, -0.25, 1.38, 0, g); box(1.9, 0.44, 1.76, glass, -0.25, 1.38, 0, g);
    for (const wx of [-1.35, 1.35]) for (const wz of [-0.95, 0.95]) { const w = new THREE.Mesh(wheelGeo, darkM); w.rotation.x = Math.PI / 2; w.position.set(wx, 0.4, wz); w.castShadow = true; g.add(w); }
    G.add(g); const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot)); L.colliders.push({ x, z, hw: 2.15 * c + 0.95 * s, hd: 2.15 * s + 0.95 * c, h: 1.6 });
  });
  place(Math.round(area * 2.6), 1.6, (x, z) => { const r = R() < 0.5 ? 0 : Math.PI / 2; box(3, 0.95, 0.5, concrete, x, 0.475, z, G).rotation.y = r; L.colliders.push({ x, z, hw: r ? 0.25 : 1.5, hd: r ? 1.5 : 0.25, h: 0.95 }); }); // barreras
  place(Math.round(area * 0.9), 3.2, (x, z) => { const r = R() < 0.5; box(r ? 6.1 : 2.5, 2.6, r ? 2.5 : 6.1, rust, x, 1.3, z, G); L.colliders.push({ x, z, hw: r ? 3.05 : 1.25, hd: r ? 1.25 : 3.05, h: 2.6 }); }); // contenedores
  place(Math.min(5, Math.round(area * 1.3)), 0.6, (x, z) => { // bidones ardiendo (luz)
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 1.05, 16), rust); b.position.set(x, 0.52, z); b.castShadow = true; G.add(b);
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 8), flameMat); f.position.set(x, 1.4, z); G.add(f); L.flames.push(f);
    const l = new THREE.PointLight(0xff7a2a, 34, 20, 1.7); l.position.set(x, 1.9, z); G.add(l); L.fires.push(l); L.colliders.push({ x, z, hw: 0.45, hd: 0.45, h: 1.05 });
  });
  for (let i = 0; i < area * 22; i++) { const m = new THREE.Mesh(rubbleGeo, concrete), s = R(0.12, 0.55); m.scale.set(s, s * R(0.4, 0.9), s); m.position.set(R(-hw, hw), s * 0.3, R(-hd, hd)); m.rotation.set(R(0, 3), R(0, 3), R(0, 3)); m.castShadow = m.receiveShadow = true; G.add(m); }
  for (let x = -hw + 6; x < hw; x += 19) for (const s of [-1, 1]) { const tilt = R(-0.3, 0.3), p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 8, 8), poleMat); p.position.set(x, 3.9, s * (hd - 0.6)); p.rotation.z = tilt; p.castShadow = true; G.add(p); }
}

/** Empuja un círculo fuera de los obstáculos y lo mantiene dentro de la zona. */
export function collide(o: { x: number; z: number }, r: number) {
  for (const c of L.colliders) { const dx = o.x - c.x, dz = o.z - c.z, px = c.hw + r - Math.abs(dx), pz = c.hd + r - Math.abs(dz); if (px > 0 && pz > 0) { if (px < pz) o.x += Math.sign(dx) * px; else o.z += Math.sign(dz) * pz; } }
  o.x = THREE.MathUtils.clamp(o.x, -L.hw + r, L.hw - r); o.z = THREE.MathUtils.clamp(o.z, -L.hd + r, L.hd - r);
}
/** Distancia al primer obstáculo en la dirección d (o `max`). */
export function wallDist(o: THREE.Vector3, d: THREE.Vector3, max: number) {
  let best = max;
  for (const c of L.colliders) {
    const tx1 = (c.x - c.hw - o.x) / d.x, tx2 = (c.x + c.hw - o.x) / d.x, tz1 = (c.z - c.hd - o.z) / d.z, tz2 = (c.z + c.hd - o.z) / d.z;
    const tn = Math.max(Math.min(tx1, tx2), Math.min(tz1, tz2)), tf = Math.min(Math.max(tx1, tx2), Math.max(tz1, tz2));
    if (tn < tf && tf > 0 && tn < best && tn > 0 && o.y + d.y * tn < c.h) best = tn;
  }
  if (d.y < -0.001) best = Math.min(best, -o.y / d.y);
  return best;
}
