// Shooter en PRIMERA PERSONA (Three.js). Todo el arte es geometría y texturas generadas por código.
// Estado: rebanada vertical (una calle, oleadas). Pendiente conectar src/core (misiones, economía, guardado).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import cfg from '../config/game.config.json';
import { setLang, t } from '../i18n/i18n';

const DEMO = location.hash === '#demo'; // bot para capturas automáticas
const TOUCH = matchMedia('(pointer: coarse)').matches;
setLang(navigator.language.startsWith('en') ? 'en' : 'es');
const $ = (id: string) => document.getElementById(id)!;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

// ---------- Render ----------
const renderer = new THREE.WebGLRenderer({ antialias: !TOUCH, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, TOUCH ? 1.5 : 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
const HAZE = 0x22344a;
scene.fog = new THREE.FogExp2(HAZE, 0.026);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; // reflejos del metal
scene.environmentIntensity = 0.4;
const camera = new THREE.PerspectiveCamera(72, 1, 0.06, 260);
camera.rotation.order = 'YXZ'; scene.add(camera);
scene.add(new THREE.HemisphereLight(0x86a4cc, 0x1a1412, 0.8));
const moon = new THREE.DirectionalLight(0xc8d8ff, 1.9);
moon.castShadow = true; moon.shadow.mapSize.set(TOUCH ? 1024 : 2048, TOUCH ? 1024 : 2048);
Object.assign(moon.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 120 });
moon.shadow.bias = -0.0012; scene.add(moon, moon.target);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.6, 0.9)); composer.addPass(new OutputPass());
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// ---------- Texturas por código ----------
function canvasTex(size: number, draw: (c: CanvasRenderingContext2D, s: number) => void, repeat = 1) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size; draw(cv.getContext('2d')!, size);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(repeat, repeat); tx.anisotropy = 8; return tx;
}
const grime = (c: CanvasRenderingContext2D, s: number, n: number) => { for (let i = 0; i < n; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.22)' : 'rgba(255,255,255,.06)'; c.fillRect(Math.random() * s, Math.random() * s, 1.5, 1.5); } };
const asphalt = canvasTex(512, (c, s) => {
  c.fillStyle = '#3b3c41'; c.fillRect(0, 0, s, s); grime(c, s, 6000);
  for (let i = 0; i < 14; i++) { const x = Math.random() * s, y = Math.random() * s, r = rnd(20, 70), g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(10,10,14,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); }
  c.strokeStyle = 'rgba(8,8,10,.7)'; c.lineWidth = 1.5;
  for (let k = 0; k < 7; k++) { let x = rnd(40, s - 40), y = rnd(40, s - 40), a = rnd(0, 6.28); c.beginPath(); c.moveTo(x, y); for (let i = 0; i < 9; i++) { a += rnd(-0.7, 0.7); x += Math.cos(a) * 18; y += Math.sin(a) * 18; c.lineTo(x, y); } c.stroke(); }
}, 30);
const facade = (base: string, lit: string) => canvasTex(512, (c, s) => {
  c.fillStyle = base; c.fillRect(0, 0, s, s); grime(c, s, 5000);
  for (let i = 0; i < 60; i++) { c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(Math.random() * s, Math.random() * s, rnd(2, 5), rnd(30, 160)); } // chorretones
  for (let y = 26; y < s - 40; y += 84) for (let x = 22; x < s - 40; x += 62) {
    const r = Math.random();
    c.fillStyle = '#2c2d32'; c.fillRect(x - 4, y - 4, 48, 62); // marco
    c.fillStyle = r < 0.06 ? lit : r < 0.55 ? '#06080c' : '#161b24'; c.fillRect(x, y, 40, 54);
    c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(x, y, 40, 3); c.fillStyle = '#2c2d32'; c.fillRect(x + 19, y, 2, 54);
    if (r > 0.78) { c.fillStyle = base; c.beginPath(); c.moveTo(x, y + 54); c.lineTo(x + rnd(10, 40), y + 54); c.lineTo(x + rnd(0, 20), y + rnd(10, 40)); c.fill(); }
  }
});
const facades = [facade('#56545a', '#ffb65c'), facade('#4a4f58', '#7fd0ff'), facade('#5e5148', '#ff8a4a')];
const metalTex = canvasTex(256, (c, s) => { c.fillStyle = '#6a3a2a'; c.fillRect(0, 0, s, s); grime(c, s, 2500); for (let x = 0; x < s; x += 16) { c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(x, 0, 5, s); } for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(40,20,10,.4)'; c.fillRect(Math.random() * s, Math.random() * s, rnd(8, 40), rnd(8, 30)); } });

// ---------- Mundo ----------
const M = (color: number, rough = 0.9, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
type Collider = { x: number; z: number; hw: number; hd: number; h: number };
const colliders: Collider[] = [];
function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
const sky = new THREE.Mesh(new THREE.SphereGeometry(230, 24, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, map: canvasTex(512, (c, s) => {
  const g = c.createLinearGradient(0, 0, 0, s); g.addColorStop(0, '#05070d'); g.addColorStop(0.38, '#12203a'); g.addColorStop(0.5, '#3a4a66'); g.addColorStop(0.56, '#22344a'); g.addColorStop(1, '#22344a');
  c.fillStyle = g; c.fillRect(0, 0, s, s);
  for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(255,255,255,${rnd(0.2, 0.9)})`; c.fillRect(Math.random() * s, Math.random() * s * 0.42, 1, 1); }
  for (let i = 0; i < 9; i++) { const y = s * rnd(0.3, 0.5), gg = c.createLinearGradient(0, y - 14, 0, y + 14); gg.addColorStop(0, 'rgba(8,10,18,0)'); gg.addColorStop(0.5, 'rgba(8,10,18,.5)'); gg.addColorStop(1, 'rgba(8,10,18,0)'); c.fillStyle = gg; c.fillRect(0, y - 14, s, 28); }
}) }));
scene.add(sky);
// El ojo de TUTELA: un anillo rojo gigante sobre la ciudad, visible desde cualquier calle.
const eyeGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a18).multiplyScalar(3), fog: false });
const tutela = new THREE.Group(); tutela.position.set(0, 62, -190);
tutela.add(new THREE.Mesh(new THREE.TorusGeometry(26, 1.1, 8, 64), eyeGlow), new THREE.Mesh(new THREE.TorusGeometry(15, 0.5, 8, 48), eyeGlow), new THREE.Mesh(new THREE.CircleGeometry(6, 32), eyeGlow));
box(7, 150, 7, new THREE.MeshBasicMaterial({ color: 0x0a0d14, fog: false }), 0, -75, 0, tutela).castShadow = false; scene.add(tutela);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.92 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const paint = new THREE.MeshStandardMaterial({ color: 0xb9ae7a, roughness: 1, transparent: true, opacity: 0.45 });
for (let i = -70; i < 70; i += 7) for (const rot of [0, 1]) { if (Math.random() < 0.25) continue; const l = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.22), paint); l.rotation.x = -Math.PI / 2; l.rotation.z = rot * Math.PI / 2; l.position.set(rot ? 0 : i, 0.012, rot ? i : 0); scene.add(l); }
const concrete = M(0x5a595e), rust = new THREE.MeshStandardMaterial({ map: metalTex, roughness: 0.75, metalness: 0.35 }), dark = M(0x15161a, 0.7, 0.4), curb = M(0x6a6a70);
function building(x: number, z: number, w: number, d: number, h: number) {
  const map = facades[Math.floor(Math.random() * 3)].clone(); map.repeat.set(Math.max(1, Math.round(w / 9)), Math.max(1, Math.round(h / 10))); map.needsUpdate = true;
  box(w, h, d, new THREE.MeshStandardMaterial({ map, roughness: 0.9 }), x, h / 2, z);
  box(w + 0.5, 0.5, d + 0.5, curb, x, 3.6, z); box(w + 1.6, 0.22, d + 1.6, curb, x, 0.11, z); // cornisa y acera
  for (let i = 0; i < 5; i++) { const bw = rnd(w * 0.15, w * 0.5), bh = rnd(1, h * 0.3); box(bw, bh, rnd(d * 0.3, d), concrete, x + rnd(-w / 2 + bw / 2, w / 2 - bw / 2), h + bh / 2 - 0.2, z).rotation.z = rnd(-0.08, 0.08); }
  colliders.push({ x, z, hw: w / 2 + 0.1, hd: d / 2 + 0.1, h: 99 });
}
const HALF = 40; // cruce jugable: calles de 20 m de ancho, ±HALF de largo
for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) building(sx * (19 + i * 17), sz * (19 + j * 17), 16, 16, rnd(12, 38));
for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) { building(i * 17, s * (HALF + 12), 16, 14, rnd(16, 40)); if (s > 0) building(s * (HALF + 12), i * 17, 14, 16, rnd(16, 40)); else building(-(HALF + 12), i * 17, 14, 16, rnd(16, 40)); }
function prop(x: number, z: number, hw: number, hd: number, h: number) { colliders.push({ x, z, hw, hd, h }); }
function car(x: number, z: number, rot: number, color: number) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; const pm = M(color, 0.5, 0.55), glass = M(0x0c1016, 0.2, 0.8);
  box(4.3, 0.7, 1.9, pm, 0, 0.72, 0, g); box(2.3, 0.62, 1.72, pm, -0.25, 1.36, 0, g); box(2.34, 0.44, 1.5, glass, -0.25, 1.38, 0, g); box(1.9, 0.44, 1.76, glass, -0.25, 1.38, 0, g);
  box(0.12, 0.2, 1.6, M(0xdddddd, 0.3, 0.2), 2.16, 0.78, 0, g);
  for (const wx of [-1.35, 1.35]) for (const wz of [-0.95, 0.95]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 14), dark); w.rotation.x = Math.PI / 2; w.position.set(wx, 0.4, wz); w.castShadow = true; g.add(w); }
  scene.add(g); const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot)); prop(x, z, 2.15 * c + 0.95 * s, 2.15 * s + 0.95 * c, 1.6);
}
[[-5, -14, 0.1, 0x6a2a22], [6, -27, 1.57, 0x2f3b45], [6.8, 9, 0.12, 0x55553a], [-22, 5, 0, 0x35323a], [24, -5, 0, 0x6b5a2a], [-6, 30, 1.57, 0x3a2a2a], [30, 6, 0.2, 0x244034]].forEach(([x, z, r, c]) => car(x, z, r, c));
for (const [x, z, r] of [[-4, -7, 0], [3, -8.5, 0.15], [7, -20, 1.57], [-8, 6, 1.57], [12, 4, 0], [-15, -4, 0]]) { // barreras de hormigón (cobertura)
  const b = box(3, 0.95, 0.5, concrete, x, 0.475, z); b.rotation.y = r; const c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r)); prop(x, z, 1.5 * c + 0.25 * s, 1.5 * s + 0.25 * c, 0.95);
}
for (const [x, z] of [[8.5, -14], [-8.5, 16]]) { box(2.5, 2.6, 6.1, rust, x, 1.3, z); prop(x, z, 1.25, 3.05, 2.6); } // contenedores
const rubbleGeo = new THREE.DodecahedronGeometry(1, 0);
for (let i = 0; i < 90; i++) { const m = new THREE.Mesh(rubbleGeo, concrete), s = rnd(0.12, 0.6), a = rnd(0, 6.28), r = rnd(4, 44); m.scale.set(s, s * rnd(0.4, 0.9), s); const x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.abs(x) > 9 && Math.abs(z) > 9) continue; m.position.set(x, s * 0.3, z); m.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3)); m.castShadow = m.receiveShadow = true; scene.add(m); }
const fires: THREE.PointLight[] = [], flames: THREE.Mesh[] = [];
const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff7a22).multiplyScalar(3.5) });
[[-7, -3], [7.5, 8], [-6, -24], [22, 7], [-26, -6]].forEach(([x, z]) => {
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 1.05, 16), rust); b.position.set(x, 0.52, z); b.castShadow = true; scene.add(b);
  const f = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 8), flameMat); f.position.set(x, 1.4, z); scene.add(f); flames.push(f);
  const l = new THREE.PointLight(0xff7a2a, 34, 20, 1.7); l.position.set(x, 1.9, z); scene.add(l); fires.push(l); prop(x, z, 0.45, 0.45, 1.05);
});
const poleMat = M(0x2a2c30, 0.6, 0.7);
for (const [x, z, tilt] of [[-9.6, -9.6, 0.1], [9.6, 9.6, -0.25], [9.6, -26, 0.04], [-26, 9.6, 0.45], [-9.6, 28, 0]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 8, 8), poleMat); p.position.set(x, 3.9, z); p.rotation.z = tilt; p.castShadow = true; scene.add(p); box(1.6, 0.1, 0.25, poleMat, x + 0.7, 7.8, z).rotation.z = tilt; }
const embers = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xff9a4a, size: 0.07, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
const emberPos = new Float32Array(300 * 3); for (let i = 0; i < emberPos.length; i += 3) { emberPos[i] = rnd(-30, 30); emberPos[i + 1] = rnd(0, 10); emberPos[i + 2] = rnd(-30, 30); }
embers.geometry.setAttribute('position', new THREE.BufferAttribute(emberPos, 3)); embers.frustumCulled = false; scene.add(embers);

// ---------- Máquinas: esqueletos de metal ----------
const chrome = new THREE.MeshStandardMaterial({ color: 0x8f98a8, metalness: 1, roughness: 0.28 });
const gunM = new THREE.MeshStandardMaterial({ color: 0x24272e, metalness: 0.9, roughness: 0.45 });
const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2412).multiplyScalar(5) });
const G = {
  bone: new THREE.CylinderGeometry(0.05, 0.038, 0.5, 8), arm: new THREE.CylinderGeometry(0.042, 0.034, 0.38, 8), piston: new THREE.CylinderGeometry(0.018, 0.018, 0.5, 6),
  joint: new THREE.SphereGeometry(0.07, 12, 10), rib: new THREE.TorusGeometry(0.2, 0.024, 6, 20, Math.PI * 1.5), spine: new THREE.CylinderGeometry(0.05, 0.06, 0.74, 8),
  skull: new THREE.SphereGeometry(0.17, 20, 16), eye: new THREE.SphereGeometry(0.03, 10, 10), socket: new THREE.SphereGeometry(0.058, 10, 10), tooth: new THREE.BoxGeometry(0.022, 0.04, 0.02),
};
interface Bot { root: THREE.Group; legL: THREE.Object3D; legR: THREE.Object3D; armL: THREE.Object3D; armR: THREE.Object3D; hp: number; phase: number; alive: boolean; gunner: boolean; cd: number; x: number; z: number }
function limb(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, len: number) {
  const pivot = new THREE.Group(); pivot.position.set(x, y, 0);
  const add = (g: THREE.BufferGeometry, m: THREE.Material, px: number, py: number, pz: number) => { const o = new THREE.Mesh(g, m); o.position.set(px, py, pz); o.castShadow = true; pivot.add(o); return o; };
  add(geo, mat, 0, -len / 2, 0); add(G.piston, gunM, 0, -len / 2, -0.05).scale.y = len / 0.5; add(G.joint, gunM, 0, -len, 0); add(geo, mat, 0, -len * 1.5, 0);
  parent.add(pivot); return pivot;
}
function makeRobot(gunner: boolean): Bot {
  const root = new THREE.Group();
  const legL = limb(root, G.bone, chrome, -0.16, 1.02, 0.5), legR = limb(root, G.bone, chrome, 0.16, 1.02, 0.5);
  box(0.2, 0.06, 0.34, gunM, -0.16, 0.03, 0.06, root); box(0.2, 0.06, 0.34, gunM, 0.16, 0.03, 0.06, root);
  box(0.42, 0.15, 0.2, chrome, 0, 1.05, 0, root);
  const sp = new THREE.Mesh(G.spine, gunM); sp.position.y = 1.42; sp.castShadow = true; root.add(sp);
  for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(G.rib, chrome); r.rotation.set(Math.PI / 2, 0, Math.PI * 0.75); r.position.y = 1.2 + i * 0.105; r.scale.set(0.95 + (i > 1 ? 0.14 : 0), 0.72, 1); r.castShadow = true; root.add(r); }
  box(0.1, 0.5, 0.05, chrome, 0, 1.44, 0.15, root); // esternón
  box(0.68, 0.09, 0.14, chrome, 0, 1.74, 0, root);
  const armL = limb(root, G.arm, chrome, -0.37, 1.72, 0.38), armR = limb(root, G.arm, chrome, 0.37, 1.72, 0.38);
  for (const x of [-0.37, 0.37]) { const j = new THREE.Mesh(G.joint, chrome); j.position.set(x, 1.74, 0); j.scale.setScalar(1.35); root.add(j); }
  if (gunner) { box(0.09, 0.09, 0.5, gunM, 0, -0.82, 0.12, armR); const m = new THREE.Mesh(G.eye, eyeMat); m.position.set(0, -0.82, 0.38); armR.add(m); }
  box(0.07, 0.14, 0.07, gunM, 0, 1.84, 0, root); // cuello
  const skull = new THREE.Mesh(G.skull, chrome); skull.position.set(0, 2.02, 0.02); skull.scale.set(1, 1.1, 1.2); skull.castShadow = true; root.add(skull);
  box(0.2, 0.1, 0.19, chrome, 0, 1.87, 0.08, root); box(0.24, 0.05, 0.12, chrome, 0, 1.95, 0.12, root); // mandíbula y pómulos
  for (let i = -3; i <= 3; i++) { const tt = new THREE.Mesh(G.tooth, gunM); tt.position.set(i * 0.026, 1.905, 0.185); root.add(tt); }
  for (const x of [-0.07, 0.07]) { const s = new THREE.Mesh(G.socket, gunM); s.position.set(x, 2.04, 0.175); root.add(s); const e = new THREE.Mesh(G.eye, eyeMat); e.position.set(x, 2.04, 0.215); root.add(e); }
  scene.add(root);
  return { root, legL, legR, armL, armR, hp: 0, phase: rnd(0, 6), alive: true, gunner, cd: rnd(1, 3), x: 0, z: 0 };
}

// ---------- Arma en primera persona: rifle de caza de una persona corriente ----------
const view = new THREE.Group(); view.scale.setScalar(0.72); camera.add(view);
const wood = M(0x6b4424, 0.6), sleeve = M(0x4a6079, 0.9), skin = M(0xc99b7a, 0.8), steel = new THREE.MeshStandardMaterial({ color: 0x1c1e22, metalness: 0.9, roughness: 0.35 });
const vbox = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, rx = 0) => { const o = box(w, h, d, m, x, y, z, view); o.castShadow = o.receiveShadow = false; o.rotation.x = rx; return o; };
vbox(0.05, 0.07, 0.42, wood, 0, -0.01, 0.12, -0.05); vbox(0.055, 0.1, 0.2, wood, 0, -0.045, 0.34, -0.25); // culata
vbox(0.045, 0.06, 0.3, steel, 0, 0.012, -0.16); vbox(0.05, 0.05, 0.26, wood, 0, -0.03, -0.3); // cajón y guardamanos
const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.015, 0.62, 10), steel); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -0.55); view.add(barrel);
vbox(0.012, 0.03, 0.012, steel, 0, 0.045, -0.84); vbox(0.03, 0.035, 0.05, steel, 0, 0.05, -0.1); // miras
vbox(0.03, 0.1, 0.06, steel, 0, -0.08, -0.14); // cargador
vbox(0.085, 0.085, 0.3, sleeve, 0.02, -0.07, 0.2, 0.3); vbox(0.07, 0.075, 0.09, skin, 0.01, -0.05, 0.04); // mano derecha
vbox(0.085, 0.085, 0.34, sleeve, -0.11, -0.1, -0.16, -0.25).rotation.y = -0.5; vbox(0.075, 0.07, 0.1, skin, -0.02, -0.06, -0.32); // mano izquierda
const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, map: canvasTex(64, (c) => {
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(0.3, 'rgba(255,190,90,.9)'); g.addColorStop(1, 'rgba(255,120,30,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  c.strokeStyle = 'rgba(255,220,150,.9)'; c.lineWidth = 3; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(32, 32); c.lineTo(32 + Math.cos(i * 1.05) * 30, 32 + Math.sin(i * 1.05) * 30); c.stroke(); }
}) })); flash.position.set(0, 0.02, -0.9); flash.visible = false; view.add(flash);
const muzzle = new THREE.PointLight(0xffb060, 0, 18, 2); camera.add(muzzle); muzzle.position.set(0.2, -0.1, -1);

// ---------- Estado ----------
const P = { x: 0, z: 14, yaw: 0, pitch: 0, hp: 100, mag: 30, fireCd: 0, reload: 0, dead: false, playing: false, recoil: 0, bob: 0 };
const bots: Bot[] = []; let wave = 0, kills = 0, nextWave = 2, shake = 0, noteT = 0;
const tracerMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd28a).multiplyScalar(3), transparent: true, opacity: 0.9 });
const tracers = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 1), tracerMat); m.visible = false; scene.add(m); return { m, life: 0 }; });
const boltMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3020).multiplyScalar(6) });
const bolts = Array.from({ length: 24 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), boltMat); m.scale.z = 4; m.visible = false; scene.add(m); return { m, v: new THREE.Vector3(), life: 0 }; });
const SP = 500, spPos = new Float32Array(SP * 3).fill(-99), spVel = new Float32Array(SP * 3), spLife = new Float32Array(SP); let spI = 0;
const sparks = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffb870, size: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
sparks.geometry.setAttribute('position', new THREE.BufferAttribute(spPos, 3)); sparks.frustumCulled = false; scene.add(sparks);
function burst(x: number, y: number, z: number, n: number, speed: number) { for (let i = 0; i < n; i++) { const k = (spI++ % SP) * 3; spPos[k] = x; spPos[k + 1] = y; spPos[k + 2] = z; spVel[k] = rnd(-1, 1) * speed; spVel[k + 1] = rnd(0, 1.2) * speed; spVel[k + 2] = rnd(-1, 1) * speed; spLife[k / 3] = rnd(0.25, 0.7); } }
const debris: { m: THREE.Object3D; v: THREE.Vector3; w: THREE.Vector3; life: number }[] = [];
function shatter(b: Bot, dir: THREE.Vector3) { // la máquina se desarma en piezas
  b.alive = false; b.root.updateMatrixWorld(true);
  for (const part of [...b.root.children]) { scene.attach(part); debris.push({ m: part, v: new THREE.Vector3(dir.x * 4 + rnd(-2, 2), rnd(1.5, 5), dir.z * 4 + rnd(-2, 2)), w: new THREE.Vector3(rnd(-7, 7), rnd(-7, 7), rnd(-7, 7)), life: 4 }); }
  scene.remove(b.root); burst(b.x, 1.4, b.z, 30, 5); kills++;
}
function note(text: string) { $('note').textContent = text; noteT = 2.2; }
function spawnWave() {
  wave++; note(t('fps.incoming'));
  for (let i = 0; i < Math.min(3 + wave * 2, 12); i++) {
    const r = makeRobot(Math.random() < 0.35 && wave > 1), side = Math.floor(Math.random() * 4), d = rnd(30, HALF - 2), o = rnd(-7, 7);
    r.x = side < 2 ? o : (side === 2 ? -d : d); r.z = side < 2 ? (side === 0 ? -d : d) : o; r.hp = 34 + wave * 5; r.root.position.set(r.x, 0, r.z); bots.push(r);
  }
}
function collide(o: { x: number; z: number }, r: number) {
  for (const c of colliders) { const dx = o.x - c.x, dz = o.z - c.z, px = c.hw + r - Math.abs(dx), pz = c.hd + r - Math.abs(dz); if (px > 0 && pz > 0) { if (px < pz) o.x += Math.sign(dx) * px; else o.z += Math.sign(dz) * pz; } }
  o.x = THREE.MathUtils.clamp(o.x, -HALF, HALF); o.z = THREE.MathUtils.clamp(o.z, -HALF, HALF);
}
/** Distancia a la primera pared u obstáculo en la dirección d (Infinity si no hay). */
function wallDist(o: THREE.Vector3, d: THREE.Vector3, max: number) {
  let best = max;
  for (const c of colliders) {
    const tx1 = (c.x - c.hw - o.x) / d.x, tx2 = (c.x + c.hw - o.x) / d.x, tz1 = (c.z - c.hd - o.z) / d.z, tz2 = (c.z + c.hd - o.z) / d.z;
    const tn = Math.max(Math.min(tx1, tx2), Math.min(tz1, tz2)), tf = Math.min(Math.max(tx1, tx2), Math.max(tz1, tz2));
    if (tn < tf && tf > 0 && tn < best && tn > 0 && o.y + d.y * tn < c.h) best = tn;
  }
  if (d.y < -0.001) best = Math.min(best, -o.y / d.y); // suelo
  return best;
}
const dir = new THREE.Vector3(), tmp = new THREE.Vector3(), eyeP = new THREE.Vector3();
function aimTarget(max: number): { bot: Bot | null; dist: number; head: boolean } {
  camera.getWorldDirection(dir); eyeP.copy(camera.position);
  let dist = wallDist(eyeP, dir, max), bot: Bot | null = null, head = false; const h2 = dir.x * dir.x + dir.z * dir.z || 1e-6;
  for (const b of bots) if (b.alive) {
    const tt = ((b.x - eyeP.x) * dir.x + (b.z - eyeP.z) * dir.z) / h2; if (tt <= 0 || tt >= dist) continue;
    const y = eyeP.y + dir.y * tt; if (y < 0 || y > 2.25) continue;
    if (Math.hypot(eyeP.x + dir.x * tt - b.x, eyeP.z + dir.z * tt - b.z) < (y > 1.8 ? 0.24 : 0.4)) { dist = tt; bot = b; head = y > 1.8; }
  }
  return { bot, dist, head };
}
function fire() {
  P.fireCd = 0.115; P.mag--; P.recoil = 1; shake = Math.max(shake, 0.05);
  const hit = aimTarget(120); flash.visible = true; flash.rotation.z = rnd(0, 6.28); muzzle.intensity = 26;
  tmp.copy(eyeP).addScaledVector(dir, hit.dist);
  const tr = tracers.find((q) => !q.m.visible) ?? tracers[0]; view.getWorldPosition(tr.m.position); const len = tr.m.position.distanceTo(tmp);
  tr.m.scale.z = len; tr.m.lookAt(tmp); tr.m.position.lerp(tmp, 0.5); tr.m.visible = true; tr.life = 0.05;
  burst(tmp.x, tmp.y, tmp.z, hit.bot ? 9 : 5, hit.bot ? 3.5 : 2);
  if (hit.bot) { hit.bot.hp -= hit.head ? 26 : 11; $('cross').classList.add('on'); setTimeout(() => $('cross').classList.remove('on'), 90); if (hit.bot.hp <= 0) shatter(hit.bot, dir); }
  if (P.mag <= 0) { P.reload = 1.5; note(t('fps.reload')); }
}
function hurt(n: number) {
  if (P.dead || DEMO) return; P.hp -= n; shake = 0.3; $('hurt').style.opacity = '1';
  if (P.hp <= 0) { P.dead = true; P.playing = false; document.exitPointerLock?.(); $('title').innerHTML = t('fps.dead'); $('sub').textContent = `${t('fps.wave', { n: wave })} · ${t('fps.kills', { n: kills })}`; $('go').textContent = t('fps.retry'); $('menu').style.display = 'flex'; }
}

// ---------- Controles ----------
const keys = new Set<string>(); const move = { x: 0, z: 0 }; let mouseFire = false, locked = false;
addEventListener('keydown', (e) => { keys.add(e.key.toLowerCase()); if (e.key.toLowerCase() === 'r' && P.mag < 30 && P.reload <= 0) { P.reload = 1.5; note(t('fps.reload')); } });
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
const cv = renderer.domElement;
document.addEventListener('pointerlockchange', () => (locked = document.pointerLockElement === cv));
const look = (dx: number, dy: number, k: number) => { P.yaw -= dx * k; P.pitch = THREE.MathUtils.clamp(P.pitch - dy * k, -1.3, 1.3); };
let stick: { id: number; ox: number; oy: number } | null = null; const lookIds = new Map<number, { x: number; y: number }>();
cv.addEventListener('pointerdown', (e) => {
  if (!P.playing) return;
  if (e.pointerType === 'mouse') { mouseFire = true; if (!locked) { try { void (cv.requestPointerLock() as unknown as Promise<void>)?.catch?.(() => undefined); } catch { /* sin bloqueo de puntero: se mira arrastrando */ } } return; }
  if (e.clientX < innerWidth * 0.45 && !stick) { stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY }; const el = $('sl'); el.style.display = 'block'; el.style.left = e.clientX + 'px'; el.style.top = e.clientY + 'px'; }
  else lookIds.set(e.pointerId, { x: e.clientX, y: e.clientY });
});
addEventListener('pointermove', (e) => {
  if (!P.playing) return;
  if (e.pointerType === 'mouse') { if (locked || mouseFire) look(e.movementX, e.movementY, 0.0023); return; }
  if (stick && e.pointerId === stick.id) { let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy; const len = Math.hypot(dx, dy), k = Math.min(len, 50) / (len || 1); dx *= k; dy *= k; ($('sl').firstElementChild as HTMLElement).style.transform = `translate(${dx}px,${dy}px)`; move.x = dx / 50; move.z = dy / 50; return; }
  const l = lookIds.get(e.pointerId); if (l) { look(e.clientX - l.x, e.clientY - l.y, 0.0052); l.x = e.clientX; l.y = e.clientY; }
});
const up = (e: PointerEvent) => { if (e.pointerType === 'mouse') mouseFire = false; if (stick && e.pointerId === stick.id) { stick = null; move.x = move.z = 0; $('sl').style.display = 'none'; ($('sl').firstElementChild as HTMLElement).style.transform = ''; } lookIds.delete(e.pointerId); };
addEventListener('pointerup', up); addEventListener('pointercancel', up);

const [first, ...rest] = cfg.name.toUpperCase().split(' ');
$('title').innerHTML = `${first}<br><span>${rest.join(' ')}</span>`; $('sub').textContent = t('fps.sub'); $('go').textContent = t('fps.deploy'); $('help').textContent = t(TOUCH ? 'fps.help_touch' : 'fps.help_pc');
$('go').addEventListener('click', () => {
  if (P.dead) return location.reload();
  P.playing = true; $('menu').style.display = 'none';
  if (!TOUCH) { try { void (cv.requestPointerLock() as unknown as Promise<void>)?.catch?.(() => undefined); } catch { /* opcional */ } }
});

// ---------- Bucle ----------
const clock = new THREE.Clock(); let time = 0, hudT = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05); time += dt;
  let firing = false, speed = 0;
  if (P.playing || DEMO) {
    let mx = move.x + (+keys.has('d') - +keys.has('a')), mz = move.z + (+keys.has('s') - +keys.has('w'));
    if (DEMO) { // bot de capturas: gira hacia la máquina más cercana
      let best: Bot | null = null, bd = 1e9; for (const b of bots) if (b.alive) { const d = Math.hypot(b.x - P.x, b.z - P.z); if (d < bd) { bd = d; best = b; } }
      if (best) { const want = Math.atan2(-(best.x - P.x), -(best.z - P.z)); P.yaw += Math.atan2(Math.sin(want - P.yaw), Math.cos(want - P.yaw)) * Math.min(1, dt * 6); P.pitch = Math.atan2(1.45 - 1.65, bd) ; }
      mx = 0; mz = best && bd < 8 ? 0.8 : 0;
    }
    const ml = Math.hypot(mx, mz);
    if (ml > 0.1) { const k = 5.4 / Math.max(ml, 1), s = Math.sin(P.yaw), c = Math.cos(P.yaw); P.x += (mx * c + mz * s) * k * dt; P.z += (mz * c - mx * s) * k * dt; speed = Math.min(ml, 1); }
    collide(P, 0.6);
    const aim = aimTarget(60);
    firing = (locked && mouseFire) || ((TOUCH || DEMO || !locked) && !!aim.bot);
    P.fireCd -= dt;
    if (P.reload > 0) { if ((P.reload -= dt) <= 0) P.mag = 30; } else if (firing && P.fireCd <= 0) fire();
    if (bots.every((b) => !b.alive) && (nextWave -= dt) <= 0) { spawnWave(); nextWave = 3.5; }
  } else P.yaw += dt * 0.05; // cámara lenta en el menú
  P.bob += dt * speed * 9; P.recoil = Math.max(0, P.recoil - dt * 9); shake = Math.max(0, shake - dt);
  camera.position.set(P.x + rnd(-1, 1) * shake * 0.12, 1.65 + Math.sin(P.bob * 2) * 0.035 * speed + (P.dead ? -1.2 : 0), P.z + rnd(-1, 1) * shake * 0.12);
  camera.rotation.set(P.pitch + P.recoil * 0.012, P.yaw, P.dead ? 0.6 : 0);
  view.position.set(0.17 + Math.cos(P.bob) * 0.012 * speed, -0.16 + Math.abs(Math.sin(P.bob)) * 0.014 * speed - (P.reload > 0 ? Math.sin((P.reload / 1.5) * Math.PI) * 0.28 : 0), -0.27 + P.recoil * 0.05);
  view.rotation.set(P.recoil * 0.06 + (P.reload > 0 ? -Math.sin((P.reload / 1.5) * Math.PI) * 0.7 : 0), 0.02, 0);
  if (flash.visible && P.recoil < 0.6) flash.visible = false; muzzle.intensity *= Math.pow(0.0004, dt);
  for (const tr of tracers) if (tr.m.visible && (tr.life -= dt) <= 0) tr.m.visible = false;

  for (const r of bots) if (r.alive) {
    const dx = P.x - r.x, dz = P.z - r.z, d = Math.hypot(dx, dz) || 1, stop = r.gunner ? 13 : 1.25;
    const moving = d > stop && !P.dead;
    if (moving) { const sp = (r.gunner ? 2.2 : 3.1) + wave * 0.1; r.x += (dx / d) * sp * dt; r.z += (dz / d) * sp * dt; }
    for (const o of bots) if (o !== r && o.alive) { const ex = r.x - o.x, ez = r.z - o.z, e = Math.hypot(ex, ez); if (e < 1 && e > 0) { r.x += (ex / e) * (1 - e) * 0.5; r.z += (ez / e) * (1 - e) * 0.5; } }
    collide(r, 0.42); r.root.position.set(r.x, 0, r.z); r.root.rotation.y = Math.atan2(dx, dz);
    const s = moving ? Math.sin(time * 6.5 + r.phase) * 0.6 : 0; r.legL.rotation.x = s; r.legR.rotation.x = -s; r.armL.rotation.x = -s * 0.8 - (d < 3 ? 1.3 : 0); r.armR.rotation.x = r.gunner ? -1.5 : s * 0.8 - (d < 3 ? 1.3 : 0);
    r.root.position.y = moving ? Math.abs(Math.sin(time * 6.5 + r.phase)) * 0.04 : 0;
    r.cd -= dt;
    if (r.gunner && d < 34 && r.cd <= 0 && (P.playing || DEMO)) {
      tmp.set(r.x, 1.5, r.z); dir.set(dx, 0.1, dz).normalize();
      if (wallDist(tmp, dir, d) >= d - 0.5) { r.cd = 2.1; const b = bolts.find((q) => !q.m.visible); if (b) { b.m.position.copy(tmp).addScaledVector(dir, 0.6); b.v.copy(dir).multiplyScalar(17); b.m.lookAt(tmp.addScaledVector(dir, 5)); b.life = 3; b.m.visible = true; } } else r.cd = 0.4;
    }
    if (!r.gunner && d < 1.5 && r.cd <= 0) { r.cd = 0.8; hurt(14); }
  }
  for (const b of bolts) if (b.m.visible) {
    b.m.position.addScaledVector(b.v, dt); const p = b.m.position;
    if ((b.life -= dt) <= 0) b.m.visible = false;
    else if (Math.hypot(p.x - P.x, p.z - P.z) < 0.5 && p.y > 0.3 && p.y < 1.9) { b.m.visible = false; hurt(9); }
    else for (const c of colliders) if (Math.abs(p.x - c.x) < c.hw && Math.abs(p.z - c.z) < c.hd && p.y < c.h) { b.m.visible = false; burst(p.x, p.y, p.z, 5, 2); break; }
  }
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i]; d.life -= dt; d.v.y -= 16 * dt; d.m.position.addScaledVector(d.v, dt);
    if (d.m.position.y < 0.06) { d.m.position.y = 0.06; d.v.set(d.v.x * 0.5, -d.v.y * 0.3, d.v.z * 0.5); d.w.multiplyScalar(0.5); }
    d.m.rotation.x += d.w.x * dt; d.m.rotation.z += d.w.z * dt; if (d.life <= 0) { scene.remove(d.m); debris.splice(i, 1); }
  }
  for (let i = 0; i < SP; i++) if (spLife[i] > 0) { const k = i * 3; spLife[i] -= dt; spVel[k + 1] -= 12 * dt; spPos[k] += spVel[k] * dt; spPos[k + 1] += spVel[k + 1] * dt; spPos[k + 2] += spVel[k + 2] * dt; if (spLife[i] <= 0) spPos[k + 1] = -99; }
  sparks.geometry.attributes.position.needsUpdate = true;
  for (let i = 0; i < emberPos.length; i += 3) { emberPos[i] += dt * 0.5; emberPos[i + 1] += dt * 0.45; if (emberPos[i + 1] > 10) { emberPos[i] = P.x + rnd(-30, 30); emberPos[i + 1] = 0; emberPos[i + 2] = P.z + rnd(-30, 30); } }
  embers.geometry.attributes.position.needsUpdate = true;
  fires.forEach((l, i) => { l.intensity = 30 + Math.sin(time * 13 + i * 2) * 7 + Math.random() * 6; flames[i].scale.set(1, 0.85 + Math.random() * 0.4, 1); });
  tutela.lookAt(P.x, 30, P.z); sky.position.set(P.x, 0, P.z);
  moon.position.set(P.x - 24, 46, P.z + 18); moon.target.position.set(P.x, 0, P.z);
  $('hurt').style.opacity = String(Math.max(0, parseFloat($('hurt').style.opacity || '0') - dt * 2.2));
  if (noteT > 0 && (noteT -= dt) <= 0 && P.reload <= 0) $('note').textContent = '';
  if ((hudT -= dt) <= 0) { hudT = 0.15; $('hp').style.width = Math.max(0, P.hp) + '%'; $('hpn').textContent = String(Math.max(0, Math.round(P.hp))); $('mag').textContent = String(P.mag); $('kills').textContent = t('fps.kills', { n: kills }); $('wave').textContent = wave ? t('fps.wave', { n: wave }) : ''; $('left').textContent = wave ? t('fps.left', { n: bots.filter((b) => b.alive).length }) : ''; }
  composer.render();
}
if (DEMO) $('menu').style.display = 'none';
(window as unknown as { __FPS: object }).__FPS = { P, bots };
frame();
