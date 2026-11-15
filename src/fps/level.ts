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

/** Qué lleva cada tipo de escenario: densidad de cada cobertura (por 1000 m²), borde y ambiente. */
interface Theme { ground: number; fog: number; edge: 'city' | 'fence' | 'rail' | 'pillars'; cars: number; barriers: number; containers: number; stacks: number; heaps: number; planters: number; slabs: number; monos: number; fires: number }
const THEMES: Record<string, Theme> = {
  street: { ground: 0xffffff, fog: 0.026, edge: 'city', cars: 2.4, barriers: 3.2, containers: 1, stacks: 0, heaps: 0, planters: 0, slabs: 0.6, monos: 0, fires: 5 },
  scrapyard: { ground: 0xc9a783, fog: 0.03, edge: 'fence', cars: 1.2, barriers: 1.6, containers: 2.4, stacks: 3.4, heaps: 3, planters: 0, slabs: 0, monos: 0, fires: 6 },
  bridge: { ground: 0xd5d8e2, fog: 0.019, edge: 'rail', cars: 4.2, barriers: 4.5, containers: 0.8, stacks: 0, heaps: 0, planters: 0, slabs: 0, monos: 0, fires: 4 },
  campus: { ground: 0xbfd2d6, fog: 0.022, edge: 'city', cars: 0.5, barriers: 1.2, containers: 0, stacks: 0, heaps: 0, planters: 5.5, slabs: 0.5, monos: 0, fires: 3 },
  ruins: { ground: 0x9a98b4, fog: 0.04, edge: 'city', cars: 1.8, barriers: 2, containers: 0.4, stacks: 0, heaps: 2.2, planters: 0, slabs: 3.6, monos: 0, fires: 6 },
  core: { ground: 0x8a7482, fog: 0.03, edge: 'pillars', cars: 0, barriers: 3.4, containers: 0, stacks: 0, heaps: 0, planters: 0, slabs: 0, monos: 3.2, fires: 0 },
};
const stripMat = glowMat(0xff2a18, 3), blackM = M(0x0c0d12, 0.35, 0.8), soil = M(0x1f1a14, 1), steelM = M(0x2c2f36, 0.5, 0.8), water = M(0x0a1622, 0.15, 0.9), bridgeM = M(0x5a2f28, 0.85, 0.05); // pintura mate: el metal pulido deslumbraba con el bloom

export function buildLevel(wPx: number, hPx: number, seedText: string, tint: number, keep: Keep[], themeName = 'street') {
  scene.remove(L.group);
  L.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.geometry !== rubbleGeo && m.geometry !== wheelGeo) m.geometry.dispose(); });
  const G = (L.group = new THREE.Group()); scene.add(G);
  const R = seeded(seedText), hw = (L.hw = wPx / 50), hd = (L.hd = hPx / 50), T = THEMES[themeName] ?? THEMES.street;
  L.colliders = []; L.fires = []; L.flames = [];
  fog.color.set(0x22344a).lerp(new THREE.Color(tint), 0.16); fog.density = T.fog;
  tutela.position.set(0, 62, -hd - 150); tutela.visible = T.edge !== 'pillars';
  const add = (x: number, z: number, cw: number, cd: number, h: number) => L.colliders.push({ x, z, hw: cw, hd: cd, h });

  const bridge = T.edge === 'rail', pad = bridge ? 0 : 60;
  const gmap = asphalt.clone(); gmap.repeat.set((hw + pad) / 4.5, (hd + pad) / 4.5); gmap.needsUpdate = true;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2 * (hw + pad), 2 * (hd + pad)), new THREE.MeshStandardMaterial({ map: gmap, roughness: 0.92, color: T.ground }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; G.add(ground);
  for (let x = -hw; x < hw; x += 7) { if (R() < 0.25) continue; const l = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.22), paint); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.012, 0); G.add(l); }

  const building = (x: number, z: number, w: number, d: number, h: number) => {
    const map = facades[Math.floor(R(0, 3))].clone(); map.repeat.set(Math.max(1, Math.round(w / 9)), Math.max(1, Math.round(h / 10))); map.needsUpdate = true;
    box(w, h, d, new THREE.MeshStandardMaterial({ map, roughness: 0.9 }), x, h / 2, z, G); box(w + 0.5, 0.5, d + 0.5, curb, x, 3.6, z, G);
    for (let i = 0; i < 4; i++) { const bw = R(w * 0.15, w * 0.5), bh = R(1, h * 0.3); box(bw, bh, R(d * 0.3, d), concrete, x + R(-w / 2 + bw / 2, w / 2 - bw / 2), h + bh / 2 - 0.2, z, G).rotation.z = R(-0.08, 0.08); }
  };
  const skyline = (gap: number) => { for (const s of [-1, 1]) { for (let x = -hw - 40; x < hw + 40; x += 22) building(x + 11, s * (hd + gap), 20, 18, R(30, 60)); for (let z = -hd - 20; z < hd + 20; z += 22) building(s * (hw + gap), z + 11, 18, 20, R(30, 60)); } };
  if (T.edge === 'city') { // calles: fachadas pegadas a la zona y rascacielos detrás
    for (const s of [-1, 1]) { for (let x = -hw - 16; x < hw + 16;) { const w = R(13, 19); building(x + w / 2, s * (hd + 9), w - 1, 16, R(12, 34)); x += w; } for (let z = -hd; z < hd;) { const d = R(13, 19); building(s * (hw + 9), z + d / 2, 16, d - 1, R(12, 34)); z += d; } }
    skyline(30); box(2 * hw + 2, 0.24, 2.4, curb, 0, 0.12, hd + 0.2, G); box(2 * hw + 2, 0.24, 2.4, curb, 0, 0.12, -hd - 0.2, G);
  } else if (T.edge === 'fence') { // desguace: valla de chapa, contenedores apilados fuera y una grúa
    for (const s of [-1, 1]) { box(2 * hw + 2, 4.2, 0.3, rust, 0, 2.1, s * (hd + 0.6), G); box(0.3, 4.2, 2 * hd + 2, rust, s * (hw + 0.6), 2.1, 0, G);
      for (let x = -hw; x < hw; x += 6.6) for (let k = 0; k < Math.floor(R(1, 4)); k++) box(6.1, 2.6, 2.5, rust, x + 3, 1.3 + k * 2.6, s * (hd + 3 + R(0, 0.6)), G);
      for (let z = -hd; z < hd; z += 6.6) for (let k = 0; k < Math.floor(R(1, 4)); k++) box(2.5, 2.6, 6.1, rust, s * (hw + 3 + R(0, 0.6)), 1.3 + k * 2.6, z + 3, G); }
    const cx = -hw - 5, cz = -hd * 0.3; for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) box(0.4, 34, 0.4, steelM, cx + dx, 17, cz + dz, G);
    for (let y = 3; y < 34; y += 4) box(2.8, 0.25, 2.8, steelM, cx, y, cz, G); box(40, 1.2, 1.4, steelM, cx + 14, 34, cz, G); box(0.12, 16, 0.12, darkM, cx + 26, 26, cz, G); box(2.4, 1.2, 2.4, rust, cx + 26, 17.5, cz, G); // carga colgando
    skyline(46);
  } else if (bridge) { // puente colgante: barandas, torres, cables y agua muy abajo
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), water); sea.rotation.x = -Math.PI / 2; sea.position.y = -22; G.add(sea);
    box(2 * hw + 40, 2.4, 2 * hd + 3, concrete, 0, -1.22, 0, G);
    for (const s of [-1, 1]) {
      box(2 * hw + 40, 0.14, 0.14, bridgeM, 0, 1.15, s * (hd + 0.3), G); box(2 * hw + 40, 0.5, 0.4, concrete, 0, 0.25, s * (hd + 0.3), G);
      for (let x = -hw - 20; x < hw + 20; x += 3) box(0.1, 1.1, 0.1, bridgeM, x, 0.6, s * (hd + 0.3), G);
      for (const tx of [-hw * 0.5, hw * 0.5]) { box(3.4, 96, 3.4, bridgeM, tx, 18, s * (hd + 2.6), G); if (s > 0) for (const y of [16, 34, 52, 64]) box(2.6, 2.4, 2 * hd + 5, bridgeM, tx, y, 0, G); }
      for (let x = -hw - 20; x < hw + 20; x += 2.5) { // cable principal (parábolas) y tirantes
        const span = hw, u = ((((x + hw * 0.5) % span) + span) % span) / span, y = 8 + 54 * Math.pow(2 * u - 1, 2);
        box(2.6, 0.5, 0.5, bridgeM, x, y, s * (hd + 2.6), G).castShadow = false; if (Math.round(x / 2.5) % 2 === 0) box(0.07, y - 1, 0.07, darkM, x, (y + 1) / 2, s * (hd + 2.6), G).castShadow = false;
      }
      for (let k = 0; k < 2; k++) box(2.5, 2.6, 2 * hd, rust, s * (hw + 2 + k * 0.3), 1.3 + k * 2.6, 0, G); // barricada en cada extremo
    }
    for (let x = -260; x < 260; x += 24) { building(x, -150 - R(0, 30), 20, 18, R(30, 70)); building(x, 150 + R(0, 30), 20, 18, R(20, 50)); }
  } else { // cámara del núcleo: anillo de pilares negros con franjas rojas
    for (let a = 0; a < 6.283; a += 0.2618) { const x = Math.cos(a) * (hw + 6), z = Math.sin(a) * (hd + 6), h = R(26, 44); box(4, h, 4, blackM, x, h / 2, z, G); box(0.3, h * 0.8, 0.3, stripMat, x - Math.cos(a) * 2.1, h * 0.45, z - Math.sin(a) * 2.1, G).castShadow = false; }
    for (let i = -3; i <= 3; i++) { box(2 * hw, 0.03, 0.12, stripMat, 0, 0.02, i * (hd / 3.2), G).castShadow = false; }
    skyline(60);
  }

  const free = (x: number, z: number, r: number) => Math.abs(x) < hw - r - 1 && Math.abs(z) < hd - r - 1 && keep.every((k) => Math.hypot(x - k.x, z - k.z) > k.r + r) && L.colliders.every((c) => Math.abs(x - c.x) > c.hw + r + 1.5 || Math.abs(z - c.z) > c.hd + r + 1.5);
  const area = (4 * hw * hd) / 1000;
  const place = (density: number, r: number, make: (x: number, z: number) => void, max = 99) => { const n = Math.min(max, Math.round(area * density)); for (let i = 0, tries = 0; i < n && tries < n * 14; tries++) { const x = R(-hw, hw), z = R(-hd, hd); if (free(x, z, r)) { make(x, z); i++; } } };
  const carBody = (g: THREE.Object3D, y: number, pm: THREE.Material, squash = 1) => { box(4.3, 0.7 * squash, 1.9, pm, 0, y + 0.72 * squash, 0, g); box(2.3, 0.62 * squash, 1.72, pm, -0.25, y + 1.36 * squash, 0, g); box(2.34, 0.44 * squash, 1.5, glass, -0.25, y + 1.38 * squash, 0, g); };
  place(T.stacks, 2.6, (x, z) => { // pilas de coches aplastados (cobertura alta)
    const rot = R() < 0.5 ? 0 : Math.PI / 2, g = new THREE.Group(), n = Math.floor(R(2, 4)); g.position.set(x, 0, z); g.rotation.y = rot;
    for (let k = 0; k < n; k++) { const c = new THREE.Group(); c.rotation.y = R(-0.15, 0.15); c.position.y = k * 0.95 - 0.25; carBody(c, 0, M(CAR_COLORS[Math.floor(R(0, 6))], 0.7, 0.4), 0.62); g.add(c); }
    G.add(g); add(x, z, rot ? 1 : 2.2, rot ? 2.2 : 1, n * 0.95);
  });
  place(T.containers, 3.2, (x, z) => { const r = R() < 0.5, two = R() < 0.35; box(r ? 6.1 : 2.5, 2.6, r ? 2.5 : 6.1, rust, x, 1.3, z, G); if (two) box(r ? 6.1 : 2.5, 2.6, r ? 2.5 : 6.1, rust, x + R(-0.3, 0.3), 3.9, z, G); add(x, z, r ? 3.05 : 1.25, r ? 1.25 : 3.05, two ? 5.2 : 2.6); });
  place(T.monos, 1.4, (x, z) => { const h = R(5, 9); box(1.8, h, 1.8, blackM, x, h / 2, z, G); box(0.16, h * 0.7, 1.84, stripMat, x, h * 0.5, z, G).castShadow = false; add(x, z, 0.9, 0.9, 99); });
  place(T.slabs, 2.8, (x, z) => { const r = R() < 0.5; const sl = box(r ? 0.5 : 5, 3.6, r ? 5 : 0.5, concrete, x, 1.5, z, G); sl.rotation[r ? 'z' : 'x'] = R(-0.45, 0.45); add(x, z, r ? 0.9 : 2.5, r ? 2.5 : 0.9, 2.6); }); // losas caídas
  place(T.heaps, 2.4, (x, z) => { // montones de chatarra
    const m = new THREE.Mesh(rubbleGeo, rust); m.scale.set(R(1.8, 2.6), R(1.1, 1.7), R(1.8, 2.6)); m.position.set(x, 0.5, z); m.rotation.y = R(0, 3); m.castShadow = m.receiveShadow = true; G.add(m);
    for (let k = 0; k < 5; k++) box(R(0.4, 1.6), R(0.2, 0.7), R(0.4, 1.4), R() < 0.5 ? rust : steelM, x + R(-1.6, 1.6), R(0.3, 1.5), z + R(-1.6, 1.6), G).rotation.set(R(0, 1), R(0, 3), R(0, 1)); add(x, z, 1.7, 1.7, 1.5);
  });
  place(T.cars, 2.4, (x, z) => {
    const rot = R() < 0.6 ? R(-0.2, 0.2) : Math.PI / 2 + R(-0.2, 0.2), g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; carBody(g, 0, M(CAR_COLORS[Math.floor(R(0, 6))], 0.5, 0.55)); box(1.9, 0.44, 1.76, glass, -0.25, 1.38, 0, g);
    for (const wx of [-1.35, 1.35]) for (const wz of [-0.95, 0.95]) { const w = new THREE.Mesh(wheelGeo, darkM); w.rotation.x = Math.PI / 2; w.position.set(wx, 0.4, wz); w.castShadow = true; g.add(w); }
    G.add(g); const c = Math.abs(Math.cos(rot)), sn = Math.abs(Math.sin(rot)); add(x, z, 2.15 * c + 0.95 * sn, 2.15 * sn + 0.95 * c, 1.6);
  });
  place(T.planters, 2.4, (x, z) => { const r = R() < 0.5; box(r ? 1.3 : 4.2, 1, r ? 4.2 : 1.3, curb, x, 0.5, z, G); box(r ? 1 : 3.9, 0.1, r ? 3.9 : 1, soil, x, 1.02, z, G); for (let k = -1; k <= 1; k++) { const b = new THREE.Mesh(rubbleGeo, soil); b.scale.set(0.45, R(0.3, 0.6), 0.45); b.position.set(x + (r ? 0 : k * 1.2), 1.3, z + (r ? k * 1.2 : 0)); G.add(b); } add(x, z, r ? 0.65 : 2.1, r ? 2.1 : 0.65, 1); }); // jardineras: cobertura baja
  place(T.barriers, 1.6, (x, z) => { const r = R() < 0.5 ? 0 : Math.PI / 2; box(3, 1, 0.5, concrete, x, 0.5, z, G).rotation.y = r; add(x, z, r ? 0.25 : 1.5, r ? 1.5 : 0.25, 1); });
  place(T.fires / Math.max(area, 0.001), 0.6, (x, z) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 1.05, 16), rust); b.position.set(x, 0.52, z); b.castShadow = true; G.add(b);
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 8), flameMat); f.position.set(x, 1.4, z); G.add(f); L.flames.push(f);
    const l = new THREE.PointLight(0xff7a2a, 34, 20, 1.7); l.position.set(x, 1.9, z); G.add(l); L.fires.push(l); add(x, z, 0.45, 0.45, 1.05);
  }, 6);
  if (T.edge !== 'pillars') for (let i = 0; i < area * 20; i++) { const m = new THREE.Mesh(rubbleGeo, T.edge === 'fence' ? rust : concrete), sc = R(0.12, 0.5); m.scale.set(sc, sc * R(0.4, 0.9), sc); m.position.set(R(-hw, hw), sc * 0.3, R(-hd, hd)); m.rotation.set(R(0, 3), R(0, 3), R(0, 3)); m.castShadow = m.receiveShadow = true; G.add(m); }
  if (T.edge === 'city') for (let x = -hw + 6; x < hw; x += 19) for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 8, 8), poleMat); p.position.set(x, 3.9, s * (hd - 0.6)); p.rotation.z = R(-0.3, 0.3); p.castShadow = true; G.add(p); }
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
