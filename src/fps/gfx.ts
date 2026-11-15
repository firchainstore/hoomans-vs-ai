// Base gráfica compartida: render, escena, cámara, luces, cielo y utilidades de dibujo.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export const TOUCH = matchMedia('(pointer: coarse)').matches;
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
/** RNG con semilla: cada misión genera siempre el mismo escenario. */
export function seeded(text: string) {
  let s = [...text].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) | 0, 7);
  return (a = 0, b = 1) => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return a + (((t ^ (t >>> 14)) >>> 0) / 4294967296) * (b - a); };
}

export const renderer = new THREE.WebGLRenderer({ antialias: !TOUCH, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, TOUCH ? 1.5 : 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
document.body.prepend(renderer.domElement);
export const scene = new THREE.Scene();
export const fog = new THREE.FogExp2(0x22344a, 0.026); scene.fog = fog;
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; // reflejos del metal
scene.environmentIntensity = 0.4;
export const camera = new THREE.PerspectiveCamera(72, 1, 0.06, 320);
camera.rotation.order = 'YXZ'; scene.add(camera);
scene.add(new THREE.HemisphereLight(0x86a4cc, 0x1a1412, 0.8));
export const moon = new THREE.DirectionalLight(0xc8d8ff, 1.9);
moon.castShadow = true; moon.shadow.mapSize.set(TOUCH ? 1024 : 2048, TOUCH ? 1024 : 2048);
Object.assign(moon.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 130 });
moon.shadow.bias = -0.0012; scene.add(moon, moon.target);
export const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.6, 0.9)); composer.addPass(new OutputPass());
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

export function canvasTex(size: number, draw: (c: CanvasRenderingContext2D, s: number) => void, repeat = 1) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size; draw(cv.getContext('2d')!, size);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(repeat, repeat); tx.anisotropy = 8; return tx;
}
export const grime = (c: CanvasRenderingContext2D, s: number, n: number) => { for (let i = 0; i < n; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.22)' : 'rgba(255,255,255,.06)'; c.fillRect(Math.random() * s, Math.random() * s, 1.5, 1.5); } };
export const M = (color: number, rough = 0.9, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
export function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
/** Material que brilla (el bloom lo convierte en luz). */
export const glowMat = (color: number, k: number, fogged = true) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), fog: fogged });

// Cielo nocturno y el ojo de TUTELA: un anillo rojo gigante visible desde cualquier calle.
export const sky = new THREE.Mesh(new THREE.SphereGeometry(280, 24, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, map: canvasTex(512, (c, s) => {
  const g = c.createLinearGradient(0, 0, 0, s); g.addColorStop(0, '#05070d'); g.addColorStop(0.38, '#12203a'); g.addColorStop(0.5, '#3a4a66'); g.addColorStop(0.56, '#22344a'); g.addColorStop(1, '#22344a');
  c.fillStyle = g; c.fillRect(0, 0, s, s);
  for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(255,255,255,${rnd(0.2, 0.9)})`; c.fillRect(Math.random() * s, Math.random() * s * 0.42, 1, 1); }
  for (let i = 0; i < 9; i++) { const y = s * rnd(0.3, 0.5), gg = c.createLinearGradient(0, y - 14, 0, y + 14); gg.addColorStop(0, 'rgba(8,10,18,0)'); gg.addColorStop(0.5, 'rgba(8,10,18,.5)'); gg.addColorStop(1, 'rgba(8,10,18,0)'); c.fillStyle = gg; c.fillRect(0, y - 14, s, 28); }
}) }));
scene.add(sky);
const ring = glowMat(0xff2a18, 3, false);
export const tutela = new THREE.Group();
tutela.add(new THREE.Mesh(new THREE.TorusGeometry(26, 1.1, 8, 64), ring), new THREE.Mesh(new THREE.TorusGeometry(15, 0.5, 8, 48), ring), new THREE.Mesh(new THREE.CircleGeometry(6, 32), ring));
scene.add(tutela);
