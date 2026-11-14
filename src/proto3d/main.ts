// PROTOTIPO 3D (Three.js) para validar la dirección visual con el autor. No está conectado al juego 2D:
// si se aprueba, la lógica de src/core (misiones, economía, guardado) se reutiliza tal cual.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import cfg from '../config/game.config.json';

const DEMO = location.hash === '#demo'; // bot para capturas
const es = !navigator.language.startsWith('en');
const $ = (id: string) => document.getElementById(id)!;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

// ---------- Render ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
const HAZE = 0x1c2c40;
scene.background = new THREE.Color(HAZE);
scene.fog = new THREE.FogExp2(HAZE, 0.03);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; // reflejos del metal
scene.environmentIntensity = 0.45;
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
scene.add(new THREE.HemisphereLight(0x7f9cc4, 0x1a1412, 0.75));
const moon = new THREE.DirectionalLight(0xc4d6ff, 1.7);
moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
Object.assign(moon.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 80 });
moon.shadow.bias = -0.0015;
scene.add(moon, moon.target);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.7, 0.82);
composer.addPass(bloom); composer.addPass(new OutputPass());
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- Texturas por código ----------
function canvasTex(size: number, draw: (c: CanvasRenderingContext2D, s: number) => void, repeat = 1) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  draw(cv.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 4; return t;
}
const asphalt = canvasTex(512, (c, s) => {
  c.fillStyle = '#3a3b40'; c.fillRect(0, 0, s, s);
  for (let i = 0; i < 5000; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.07)'; c.fillRect(Math.random() * s, Math.random() * s, 1.5, 1.5); }
  for (let i = 0; i < 14; i++) { const x = Math.random() * s, y = Math.random() * s, r = rnd(20, 70); const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(10,10,14,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); }
  c.strokeStyle = 'rgba(8,8,10,.7)'; c.lineWidth = 1.5;
  for (let k = 0; k < 7; k++) { let x = rnd(40, s - 40), y = rnd(40, s - 40), a = rnd(0, 6.28); c.beginPath(); c.moveTo(x, y); for (let i = 0; i < 9; i++) { a += rnd(-0.7, 0.7); x += Math.cos(a) * 18; y += Math.sin(a) * 18; c.lineTo(x, y); } c.stroke(); }
}, 26);
const facade = (lit: string) => canvasTex(256, (c, s) => {
  c.fillStyle = '#4b4a4f'; c.fillRect(0, 0, s, s);
  for (let i = 0; i < 900; i++) { c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(Math.random() * s, Math.random() * s, 2, rnd(2, 14)); }
  for (let y = 14; y < s - 20; y += 40) for (let x = 12; x < s - 20; x += 32) {
    const r = Math.random();
    c.fillStyle = r < 0.07 ? lit : r < 0.5 ? '#0a0c10' : '#1c2028'; c.fillRect(x, y, 20, 26);
    if (r > 0.8) { c.fillStyle = '#4b4a4f'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + rnd(6, 20), y); c.lineTo(x, y + rnd(8, 26)); c.fill(); } // cristal roto
  }
});
const facades = [facade('#ffb65c'), facade('#7fd0ff'), facade('#ff8a4a')];

// ---------- Mundo ----------
const M = (color: number, rough = 0.9, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
type Collider = { x: number; z: number; hw: number; hd: number };
const colliders: Collider[] = [];
const blocks: { x: number; z: number; hw: number; hd: number; parts: THREE.Object3D[] }[] = []; // edificios que pueden tapar la cámara
function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const paint = new THREE.MeshStandardMaterial({ color: 0xb9ae7a, roughness: 1, transparent: true, opacity: 0.4 });
for (let i = -60; i < 60; i += 7) for (const rot of [0, 1]) { // líneas de carril gastadas
  if (Math.random() < 0.25) continue;
  const l = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.22), paint); l.rotation.x = -Math.PI / 2; l.rotation.z = rot * Math.PI / 2;
  l.position.set(rot ? 0 : i, 0.01, rot ? i : 0); scene.add(l);
}
const concrete = M(0x55545a), rust = M(0x4a2f22, 0.8, 0.3), dark = M(0x15161a, 0.7, 0.4);
function building(x: number, z: number, w: number, d: number, h: number) {
  const mat = new THREE.MeshStandardMaterial({ map: facades[Math.floor(Math.random() * 3)].clone(), roughness: 0.9 });
  mat.map!.repeat.set(Math.max(1, Math.round(w / 6)), Math.max(1, Math.round(h / 7))); mat.map!.needsUpdate = true;
  const parts: THREE.Object3D[] = [box(w, h, d, mat, x, h / 2, z)];
  blocks.push({ x, z, hw: w / 2, hd: d / 2, parts });
  for (let i = 0; i < 5; i++) { // remate derruido
    const bw = rnd(w * 0.15, w * 0.5), bh = rnd(1, h * 0.35);
    const top = box(bw, bh, rnd(d * 0.3, d), concrete, x + rnd(-w / 2 + bw / 2, w / 2 - bw / 2), h + bh / 2 - 0.2, z + rnd(-1, 1));
    top.rotation.z = rnd(-0.08, 0.08); parts.push(top);
  }
  colliders.push({ x, z, hw: w / 2 + 0.2, hd: d / 2 + 0.2 });
}
const HALF = 30; // calle jugable: cruce de ±HALF
for (const sx of [-1, 1]) for (const sz of [-1, 1]) { // cuatro manzanas alrededor de un cruce
  for (let i = 0; i < 4; i++) {
    const w = rnd(9, 15), d = rnd(9, 14), h = rnd(9, 30);
    building(sx * (11 + w / 2 + (i % 2) * 15), sz * (11 + d / 2 + Math.floor(i / 2) * 15), w, d, h);
  }
}
for (let i = -3; i <= 3; i++) for (const s of [-1, 1]) { building(i * 16, s * (HALF + 14), 14, 12, rnd(12, 34)); building(s * (HALF + 14), i * 16, 12, 14, rnd(12, 34)); }
function car(x: number, z: number, rot: number, color: number) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; g.rotation.z = rnd(-0.05, 0.05);
  const paintMat = M(color, 0.55, 0.5);
  box(4.2, 0.75, 1.9, paintMat, 0, 0.7, 0, g); box(2.2, 0.65, 1.7, paintMat, -0.2, 1.38, 0, g); box(2.0, 0.5, 1.72, dark, -0.2, 1.4, 0, g).scale.set(0.9, 1, 1);
  for (const wx of [-1.3, 1.3]) for (const wz of [-0.95, 0.95]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12), dark); w.rotation.x = Math.PI / 2; w.position.set(wx, 0.38, wz); w.castShadow = true; g.add(w); }
  scene.add(g); colliders.push({ x, z, hw: 1.9, hd: 1.9 });
}
[[-5, 4, 0.3, 0x5a2a22], [6, -6, 1.9, 0x2f3b45], [14, 3, 0.1, 0x4a4a3a], [-16, -3, -0.2, 0x35323a], [2, 17, 1.5, 0x5b4a2a], [-3, -19, 1.7, 0x3a2a2a]]
  .forEach(([x, z, r, c]) => car(x, z, r, c));
const rubbleGeo = new THREE.DodecahedronGeometry(1, 0);
for (let i = 0; i < 70; i++) {
  const m = new THREE.Mesh(rubbleGeo, concrete), s = rnd(0.15, 0.7), a = rnd(0, 6.28), r = rnd(4, 36);
  m.scale.set(s, s * rnd(0.4, 0.9), s); m.position.set(Math.cos(a) * r, s * 0.3, Math.sin(a) * r); m.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3)); m.castShadow = m.receiveShadow = true; scene.add(m);
}
const fires: THREE.PointLight[] = [];
const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff7a22).multiplyScalar(3) });
[[-8, -8], [9, 9], [-10, 12], [18, -10]].forEach(([x, z]) => { // bidones ardiendo
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 1.1, 14), rust); b.position.set(x, 0.55, z); b.castShadow = true; scene.add(b);
  const f = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 8), flameMat); f.position.set(x, 1.4, z); scene.add(f);
  const l = new THREE.PointLight(0xff7a2a, 30, 16, 1.8); l.position.set(x, 1.9, z); scene.add(l); fires.push(l);
  colliders.push({ x, z, hw: 0.5, hd: 0.5 });
});
const poleMat = M(0x2a2c30, 0.6, 0.7);
for (const [x, z, tilt] of [[-10.5, 10.5, 0.12], [10.5, -10.5, -0.3], [10.5, 22, 0.05], [-22, -10.5, 0.5]]) {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 7, 8), poleMat); p.position.set(x, 3.4, z); p.rotation.z = tilt; p.castShadow = true; scene.add(p);
}
const embers = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xff9a4a, size: 0.09, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
const emberPos = new Float32Array(240 * 3); for (let i = 0; i < emberPos.length; i += 3) { emberPos[i] = rnd(-30, 30); emberPos[i + 1] = rnd(0, 12); emberPos[i + 2] = rnd(-30, 30); }
embers.geometry.setAttribute('position', new THREE.BufferAttribute(emberPos, 3)); scene.add(embers);

// ---------- Personajes ----------
const skin = M(0xc99b7a, 0.8), jeans = M(0x2d3f5c), jacket = M(0x4a6079, 0.85), pack = M(0xb5532a), wood = M(0x6b4a2c, 0.7), capM = M(0x2b2622);
interface Walker { root: THREE.Group; legL: THREE.Object3D; legR: THREE.Object3D; armL?: THREE.Object3D; armR?: THREE.Object3D }
function limb(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, len: number) {
  const pivot = new THREE.Group(); pivot.position.set(x, y, z); // pivote en la articulación superior
  const m = new THREE.Mesh(geo, mat); m.position.y = -len / 2; m.castShadow = true; pivot.add(m); parent.add(pivot); return pivot;
}
function makeHuman(): Walker {
  const root = new THREE.Group();
  const legG = new THREE.BoxGeometry(0.22, 0.85, 0.26), armG = new THREE.BoxGeometry(0.16, 0.6, 0.18);
  const legL = limb(root, legG, jeans, -0.14, 0.85, 0, 0.85), legR = limb(root, legG, jeans, 0.14, 0.85, 0, 0.85);
  box(0.6, 0.72, 0.34, jacket, 0, 1.2, 0, root); box(0.44, 0.5, 0.2, pack, 0, 1.22, -0.27, root);
  const armL = limb(root, armG, jacket, -0.38, 1.5, 0.02, 0.6), armR = limb(root, armG, jacket, 0.38, 1.5, 0.02, 0.6);
  armL.rotation.x = -1.25; armR.rotation.x = -1.05; armL.rotation.z = -0.35;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), skin); head.position.y = 1.76; head.castShadow = true; root.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.11, 16), capM); cap.position.y = 1.9; root.add(cap);
  box(0.3, 0.03, 0.2, capM, 0, 1.86, 0.24, root);
  box(0.07, 0.07, 0.9, dark, 0.14, 1.28, 0.62, root); box(0.08, 0.14, 0.4, wood, 0.14, 1.25, 0.2, root); // rifle de caza
  scene.add(root); return { root, legL, legR };
}
const chrome = new THREE.MeshStandardMaterial({ color: 0x8f98a8, metalness: 1, roughness: 0.3 });
const gun = new THREE.MeshStandardMaterial({ color: 0x2a2d35, metalness: 0.9, roughness: 0.45 });
const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2412).multiplyScalar(6) });
const G = { // geometrías compartidas por todos los robots
  bone: new THREE.CylinderGeometry(0.05, 0.04, 0.5, 8), arm: new THREE.CylinderGeometry(0.04, 0.035, 0.38, 8),
  joint: new THREE.SphereGeometry(0.07, 10, 8), rib: new THREE.TorusGeometry(0.2, 0.024, 6, 18), spine: new THREE.CylinderGeometry(0.055, 0.055, 0.7, 8),
  skull: new THREE.SphereGeometry(0.17, 18, 14), eye: new THREE.SphereGeometry(0.032, 8, 8), socket: new THREE.SphereGeometry(0.055, 8, 8),
};
function boneChain(parent: THREE.Object3D, x: number, y: number, geo: THREE.BufferGeometry, len: number) {
  const up = limb(parent, geo, chrome, x, y, 0, len); // fémur / húmero con rótula y segundo hueso
  const j = new THREE.Mesh(G.joint, gun); j.position.y = -len; up.add(j);
  const low = new THREE.Mesh(geo, chrome); low.position.y = -len * 1.5; low.castShadow = true; up.add(low);
  return up;
}
function makeRobot(): Walker {
  const root = new THREE.Group();
  const legL = boneChain(root, -0.16, 1.02, G.bone, 0.5), legR = boneChain(root, 0.16, 1.02, G.bone, 0.5);
  box(0.2, 0.06, 0.34, gun, -0.16, 0.03, 0.06, root); box(0.2, 0.06, 0.34, gun, 0.16, 0.03, 0.06, root);
  box(0.42, 0.14, 0.2, gun, 0, 1.05, 0, root);
  const sp = new THREE.Mesh(G.spine, gun); sp.position.y = 1.42; root.add(sp);
  for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(G.rib, chrome); r.rotation.x = Math.PI / 2; r.position.y = 1.25 + i * 0.12; r.scale.set(1 - i * 0.02 + (i > 1 ? 0.12 : 0), 0.72, 1); r.castShadow = true; root.add(r); }
  box(0.66, 0.09, 0.14, chrome, 0, 1.74, 0, root);
  const armL = boneChain(root, -0.36, 1.72, G.arm, 0.38), armR = boneChain(root, 0.36, 1.72, G.arm, 0.38);
  for (const x of [-0.36, 0.36]) { const j = new THREE.Mesh(G.joint, chrome); j.position.set(x, 1.74, 0); j.scale.setScalar(1.3); root.add(j); }
  const skull = new THREE.Mesh(G.skull, chrome); skull.position.set(0, 2.0, 0.02); skull.scale.set(1, 1.12, 1.18); skull.castShadow = true; root.add(skull);
  box(0.2, 0.09, 0.2, chrome, 0, 1.84, 0.07, root); box(0.16, 0.02, 0.05, gun, 0, 1.87, 0.17, root); // mandíbula
  for (const x of [-0.07, 0.07]) {
    const s = new THREE.Mesh(G.socket, gun); s.position.set(x, 2.02, 0.17); root.add(s);
    const e = new THREE.Mesh(G.eye, eyeMat); e.position.set(x, 2.02, 0.205); root.add(e);
  }
  scene.add(root); return { root, legL, legR, armL, armR };
}

// ---------- Estado ----------
const human = makeHuman();
const P = { x: 0, z: 6, hp: 100, aim: 0, fireCd: 0, hurtCd: 0, dead: false };
interface Bot extends Walker { hp: number; phase: number; alive: boolean; hitCd: number }
const bots: Bot[] = [];
let wave = 0, kills = 0, nextWave = 2.5, shake = 0;
const bulletGeo = new THREE.BoxGeometry(0.07, 0.07, 1.1), bulletMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc266).multiplyScalar(4) });
const bullets = Array.from({ length: 40 }, () => { const m = new THREE.Mesh(bulletGeo, bulletMat); m.visible = false; scene.add(m); return { m, vx: 0, vz: 0, life: 0 }; });
const muzzle = new THREE.PointLight(0xffb060, 0, 14, 2); scene.add(muzzle);
const SP = 400, spPos = new Float32Array(SP * 3).fill(-99), spVel = new Float32Array(SP * 3), spLife = new Float32Array(SP); let spI = 0;
const sparks = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffb870, size: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
sparks.geometry.setAttribute('position', new THREE.BufferAttribute(spPos, 3)); sparks.frustumCulled = false; scene.add(sparks);
function burst(x: number, y: number, z: number, n: number, speed: number) {
  for (let i = 0; i < n; i++) { const k = (spI++ % SP) * 3; spPos[k] = x; spPos[k + 1] = y; spPos[k + 2] = z; spVel[k] = rnd(-1, 1) * speed; spVel[k + 1] = rnd(0.3, 1.2) * speed; spVel[k + 2] = rnd(-1, 1) * speed; spLife[k / 3] = rnd(0.3, 0.8); }
}
const debris: { m: THREE.Object3D; v: THREE.Vector3; w: THREE.Vector3; life: number }[] = [];
function shatter(b: Bot) { // el robot se desarma en piezas
  b.alive = false; b.root.updateMatrixWorld(true);
  for (const part of [...b.root.children]) {
    scene.attach(part);
    debris.push({ m: part, v: new THREE.Vector3(rnd(-3, 3), rnd(2, 6), rnd(-3, 3)), w: new THREE.Vector3(rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)), life: 2.2 });
  }
  scene.remove(b.root); burst(b.root.position.x, 1.3, b.root.position.z, 26, 5); kills++;
}
function spawnWave() {
  wave++;
  for (let i = 0; i < Math.min(4 + wave * 2, 14); i++) {
    const r = makeRobot() as Bot, side = Math.floor(Math.random() * 4), d = rnd(24, HALF), o = rnd(-8, 8);
    r.root.position.set(side < 2 ? o : (side === 2 ? -d : d), 0, side < 2 ? (side === 0 ? -d : d) : o);
    r.hp = 30 + wave * 4; r.phase = rnd(0, 6); r.alive = true; r.hitCd = 0; bots.push(r);
  }
}
function collide(o: { x: number; z: number }, r: number) {
  for (const c of colliders) {
    const dx = o.x - c.x, dz = o.z - c.z, px = c.hw + r - Math.abs(dx), pz = c.hd + r - Math.abs(dz);
    if (px > 0 && pz > 0) { if (px < pz) o.x += Math.sign(dx) * px; else o.z += Math.sign(dz) * pz; }
  }
  o.x = THREE.MathUtils.clamp(o.x, -HALF, HALF); o.z = THREE.MathUtils.clamp(o.z, -HALF, HALF);
}

// ---------- Controles: doble stick táctil, o WASD + ratón ----------
const keys = new Set<string>(); const move = { x: 0, z: 0 }; const aimStick = { x: 0, z: 0, on: false };
let mouseDown = false; const mouse = new THREE.Vector2(); const ray = new THREE.Raycaster(); const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.2); const hit = new THREE.Vector3();
addEventListener('keydown', (e) => keys.add(e.key.toLowerCase())); addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
const sticks = new Map<number, { el: HTMLElement; ox: number; oy: number; left: boolean }>();
const cv = renderer.domElement;
cv.addEventListener('pointerdown', (e) => {
  if (P.dead) return location.reload();
  $('msg').style.opacity = '0';
  if (e.pointerType === 'mouse') { mouseDown = true; return; }
  const left = e.clientX < innerWidth / 2, el = $(left ? 'sl' : 'sr');
  el.style.display = 'block'; el.style.left = e.clientX + 'px'; el.style.top = e.clientY + 'px';
  sticks.set(e.pointerId, { el, ox: e.clientX, oy: e.clientY, left });
});
addEventListener('pointermove', (e) => {
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  const s = sticks.get(e.pointerId); if (!s) return;
  let dx = e.clientX - s.ox, dy = e.clientY - s.oy; const len = Math.hypot(dx, dy), k = Math.min(len, 50) / (len || 1); dx *= k; dy *= k;
  (s.el.firstElementChild as HTMLElement).style.transform = `translate(${dx}px,${dy}px)`;
  if (s.left) { move.x = dx / 50; move.z = dy / 50; } else { aimStick.x = dx / 50; aimStick.z = dy / 50; aimStick.on = len > 12; }
});
const up = (e: PointerEvent) => {
  if (e.pointerType === 'mouse') mouseDown = false;
  const s = sticks.get(e.pointerId); if (!s) return;
  s.el.style.display = 'none'; (s.el.firstElementChild as HTMLElement).style.transform = '';
  if (s.left) move.x = move.z = 0; else aimStick.on = false; sticks.delete(e.pointerId);
};
addEventListener('pointerup', up); addEventListener('pointercancel', up);

$('title').textContent = cfg.name.toUpperCase();
$('sub').textContent = es ? 'Prototipo 3D · Toca para empezar · Stick izquierdo mueve, derecho dispara (PC: WASD + ratón)' : '3D prototype · Tap to start · Left stick moves, right stick shoots (PC: WASD + mouse)';

// ---------- Bucle ----------
const clock = new THREE.Clock(); let t = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05); t += dt;
  if (!P.dead) {
    let mx = move.x + (+keys.has('d') - +keys.has('a')), mz = move.z + (+keys.has('s') - +keys.has('w'));
    let firing = aimStick.on || mouseDown;
    if (aimStick.on) P.aim = Math.atan2(aimStick.x, aimStick.z);
    else if (mouseDown || sticks.size === 0) { ray.setFromCamera(mouse, camera); if (ray.ray.intersectPlane(floor, hit)) P.aim = Math.atan2(hit.x - P.x, hit.z - P.z); }
    if (DEMO) { // bot: orbita y dispara al robot más cercano
      P.hp = 100; let best: Bot | null = null, bd = 1e9;
      for (const b of bots) if (b.alive) { const d = Math.hypot(b.root.position.x - P.x, b.root.position.z - P.z); if (d < bd) { bd = d; best = b; } }
      mx = P.x > 6 ? -1 : P.x < -6 ? 1 : Math.cos(t * 0.7); mz = P.z > 6 ? -1 : P.z < -4 ? 1 : Math.sin(t * 0.9) * 0.5; firing = !!best && bd < 22;
      if (best) P.aim = Math.atan2(best.root.position.x - P.x, best.root.position.z - P.z);
    }
    const ml = Math.hypot(mx, mz), sp = 6.2;
    if (ml > 0.1) { P.x += (mx / Math.max(ml, 1)) * sp * dt; P.z += (mz / Math.max(ml, 1)) * sp * dt; }
    collide(P, 0.45);
    human.root.position.set(P.x, 0, P.z); human.root.rotation.y = P.aim;
    const sw = ml > 0.1 ? Math.sin(t * 11) * 0.7 : 0; human.legL.rotation.x = sw; human.legR.rotation.x = -sw;
    P.fireCd -= dt; P.hurtCd -= dt;
    if (firing && P.fireCd <= 0) {
      P.fireCd = 0.13;
      const b = bullets.find((q) => !q.m.visible);
      if (b) { const a = P.aim + rnd(-0.03, 0.03); b.vx = Math.sin(a) * 48; b.vz = Math.cos(a) * 48; b.life = 0.7; b.m.position.set(P.x + Math.sin(a) * 1.1, 1.28, P.z + Math.cos(a) * 1.1); b.m.rotation.y = a; b.m.visible = true; }
      muzzle.position.set(P.x + Math.sin(P.aim) * 1.3, 1.4, P.z + Math.cos(P.aim) * 1.3); muzzle.intensity = 22;
    }
    if (bots.every((b) => !b.alive) && (nextWave -= dt) <= 0) { spawnWave(); nextWave = 3; }
  }
  muzzle.intensity *= Math.pow(0.0005, dt);
  for (const b of bullets) if (b.m.visible) {
    b.m.position.x += b.vx * dt; b.m.position.z += b.vz * dt;
    if ((b.life -= dt) <= 0) { b.m.visible = false; continue; }
    for (const c of colliders) if (Math.abs(b.m.position.x - c.x) < c.hw && Math.abs(b.m.position.z - c.z) < c.hd) { b.m.visible = false; burst(b.m.position.x, 1.2, b.m.position.z, 4, 2); break; }
    if (b.m.visible) for (const r of bots) if (r.alive && Math.hypot(r.root.position.x - b.m.position.x, r.root.position.z - b.m.position.z) < 0.5) {
      b.m.visible = false; r.hp -= 10; burst(b.m.position.x, 1.4, b.m.position.z, 6, 3); if (r.hp <= 0) shatter(r); break;
    }
  }
  for (const r of bots) if (r.alive) {
    const p = r.root.position, dx = P.x - p.x, dz = P.z - p.z, d = Math.hypot(dx, dz) || 1, sp = 2.6 + wave * 0.12;
    if (d > 1.1 && !P.dead) { p.x += (dx / d) * sp * dt; p.z += (dz / d) * sp * dt; }
    for (const o of bots) if (o !== r && o.alive) { const ex = p.x - o.root.position.x, ez = p.z - o.root.position.z, e = Math.hypot(ex, ez); if (e < 0.9 && e > 0) { p.x += (ex / e) * (0.9 - e) * 0.5; p.z += (ez / e) * (0.9 - e) * 0.5; } }
    collide(p, 0.4);
    r.root.rotation.y = Math.atan2(dx, dz);
    const s = Math.sin(t * 6 + r.phase) * 0.55; r.legL.rotation.x = s; r.legR.rotation.x = -s; r.armL!.rotation.x = -s * 0.8 - (d < 3 ? 1.2 : 0); r.armR!.rotation.x = s * 0.8 - (d < 3 ? 1.2 : 0);
    if (d < 1.3 && P.hurtCd <= 0 && !P.dead) { P.hp -= 12; P.hurtCd = 0.6; shake = 0.35; if (P.hp <= 0) { P.dead = true; human.root.rotation.x = -Math.PI / 2; human.root.position.y = 0.3; $('title').textContent = es ? 'HAS CAÍDO' : 'YOU FELL'; $('sub').textContent = es ? 'Toca para reintentar' : 'Tap to retry'; $('msg').style.opacity = '1'; } }
  }
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i]; d.life -= dt; d.v.y -= 16 * dt; d.m.position.addScaledVector(d.v, dt);
    if (d.m.position.y < 0.08) { d.m.position.y = 0.08; d.v.set(d.v.x * 0.5, -d.v.y * 0.3, d.v.z * 0.5); d.w.multiplyScalar(0.5); }
    d.m.rotation.x += d.w.x * dt; d.m.rotation.z += d.w.z * dt;
    if (d.life <= 0) { scene.remove(d.m); debris.splice(i, 1); }
  }
  for (let i = 0; i < SP; i++) if (spLife[i] > 0) { const k = i * 3; spLife[i] -= dt; spVel[k + 1] -= 12 * dt; spPos[k] += spVel[k] * dt; spPos[k + 1] += spVel[k + 1] * dt; spPos[k + 2] += spVel[k + 2] * dt; if (spLife[i] <= 0) spPos[k + 1] = -99; }
  sparks.geometry.attributes.position.needsUpdate = true;
  for (let i = 0; i < emberPos.length; i += 3) { emberPos[i] += dt * 0.6; emberPos[i + 1] += dt * 0.5; if (emberPos[i + 1] > 12) { emberPos[i] = P.x + rnd(-30, 30); emberPos[i + 1] = 0; emberPos[i + 2] = P.z + rnd(-30, 30); } }
  embers.geometry.attributes.position.needsUpdate = true;
  fires.forEach((l, i) => (l.intensity = 26 + Math.sin(t * 13 + i * 2) * 6 + Math.random() * 5));
  shake = Math.max(0, shake - dt);
  camera.position.lerp(hit.set(P.x + rnd(-1, 1) * shake, 12.5, P.z + 10.5 + rnd(-1, 1) * shake), 0.12);
  camera.lookAt(camera.position.x, 0, camera.position.z - 11.5);
  for (const b of blocks) { // oculta los edificios que quedan entre la cámara y el jugador
    const hide = b.z - b.hd > P.z - 2 && b.z - b.hd < P.z + 14 && Math.abs(b.x - P.x) < b.hw + 9;
    if (b.parts[0].visible === hide) for (const m of b.parts) m.visible = !hide;
  }
  moon.position.set(P.x - 14, 26, P.z + 10); moon.target.position.set(P.x, 0, P.z);
  $('hp').style.width = Math.max(0, P.hp) + '%';
  $('info').textContent = (es ? `Oleada ${wave} · Máquinas destruidas: ${kills}` : `Wave ${wave} · Machines destroyed: ${kills}`);
  composer.render();
}
if (DEMO) $('msg').style.opacity = '0';
(window as unknown as { __P3D: object }).__P3D = { P, bots };
frame();
