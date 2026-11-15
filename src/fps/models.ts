// Modelos por código. Cada máquina se arma con segmentos rígidos cuyas piezas se FUSIONAN por material
// al arrancar (pocas mallas por enemigo aunque tenga mucho detalle). El aspecto sale de EnemyDef.shape.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { EnemyDef } from '../core/types';
import { M, box, canvasTex, glowMat, rnd } from './gfx';

const chrome = new THREE.MeshStandardMaterial({ color: 0x7a8292, metalness: 1, roughness: 0.3 });
const dark = new THREE.MeshStandardMaterial({ color: 0x1b1e24, metalness: 0.85, roughness: 0.5 });
const heavy = new THREE.MeshStandardMaterial({ color: 0x4a4038, metalness: 0.9, roughness: 0.42 }); // blindaje del mech
const black = new THREE.MeshStandardMaterial({ color: 0x2a2c36, metalness: 1, roughness: 0.2 }); // cazador
export const eyeMat = glowMat(0xff2412, 5);
type V3 = [number, number, number];
type Part = [THREE.BufferGeometry, number, V3, V3?, V3?]; // geometría, material (0 claro, 1 oscuro), posición, rotación, escala
const bx = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d), cy = (a: number, b: number, h: number, n = 10) => new THREE.CylinderGeometry(a, b, h, n);
const sp = (r: number, n = 16) => new THREE.SphereGeometry(r, n, Math.round(n * 0.75)), cp = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 4, 10), to = (R: number, r: number, arc = 6.2832) => new THREE.TorusGeometry(R, r, 6, 20, arc);
const mtx = new THREE.Matrix4(), eul = new THREE.Euler(), qt = new THREE.Quaternion(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
type Seg = (THREE.BufferGeometry | null)[];
function segment(parts: Part[]): Seg {
  const by: THREE.BufferGeometry[][] = [[], []];
  for (const [g, m, p, r = [0, 0, 0] as V3, sc = [1, 1, 1] as V3] of parts) { mtx.compose(v1.set(p[0], p[1], p[2]), qt.setFromEuler(eul.set(r[0], r[1], r[2])), v2.set(sc[0], sc[1], sc[2])); by[m].push(g.applyMatrix4(mtx)); }
  return by.map((list) => (list.length ? mergeGeometries(list) : null));
}
function inst(seg: Seg, parent: THREE.Object3D, x: number, y: number, z: number, light: THREE.Material = chrome) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  seg.forEach((geo, i) => { if (geo) { const m = new THREE.Mesh(geo, i ? dark : light); m.castShadow = true; g.add(m); } });
  parent.add(g); return g;
}
const H = Math.PI / 2;
const SEG = {
  pelvis: segment([[bx(0.34, 0.14, 0.2), 1, [0, 0, 0]], [sp(0.085), 0, [-0.16, -0.03, 0]], [sp(0.085), 0, [0.16, -0.03, 0]], [bx(0.16, 0.16, 0.06), 0, [0, -0.04, 0.1], [0.2, 0, 0]], [cy(0.07, 0.09, 0.1), 1, [0, 0.1, 0]]]),
  torso: segment([
    [cy(0.03, 0.03, 0.62), 0, [0, 0.31, -0.03]], ...[0, 1, 2, 3, 4, 5].map((i): Part => [cy(0.062, 0.062, 0.05), 1, [0, 0.06 + i * 0.1, -0.03]]),
    ...[0, 1, 2, 3, 4].map((i): Part => [to(0.19, 0.022, Math.PI * 1.5), 0, [0, 0.2 + i * 0.1, 0], [H, 0, Math.PI * 0.75], [0.92 + (i > 1 ? 0.16 : 0), 0.78, 1]]),
    [bx(0.21, 0.2, 0.06), 0, [-0.115, 0.56, 0.16], [-0.18, 0.28, 0]], [bx(0.21, 0.2, 0.06), 0, [0.115, 0.56, 0.16], [-0.18, -0.28, 0]], [bx(0.07, 0.42, 0.05), 1, [0, 0.42, 0.17]],
    [bx(0.66, 0.1, 0.17), 1, [0, 0.72, 0]], [sp(0.105), 0, [-0.37, 0.72, 0]], [sp(0.105), 0, [0.37, 0.72, 0]], [bx(0.16, 0.05, 0.2), 0, [-0.33, 0.8, 0], [0, 0, 0.25]], [bx(0.16, 0.05, 0.2), 0, [0.33, 0.8, 0], [0, 0, -0.25]],
    [cy(0.02, 0.02, 0.34), 1, [-0.17, 0.76, -0.05], [0, 0, 1.05]], [cy(0.02, 0.02, 0.34), 1, [0.17, 0.76, -0.05], [0, 0, -1.05]],
    [bx(0.26, 0.34, 0.11), 1, [0, 0.5, -0.15]], [cy(0.035, 0.035, 0.16), 0, [-0.08, 0.7, -0.17]], [cy(0.035, 0.035, 0.16), 0, [0.08, 0.7, -0.17]],
    [cy(0.016, 0.016, 0.4), 1, [-0.14, 0.2, 0.08], [0.2, 0, 0.3]], [cy(0.016, 0.016, 0.4), 1, [0.14, 0.2, 0.08], [0.2, 0, -0.3]],
  ]),
  head: segment([
    [cy(0.045, 0.055, 0.12), 1, [0, 0.05, 0]], [cy(0.012, 0.012, 0.14), 0, [-0.055, 0.06, -0.04]], [cy(0.012, 0.012, 0.14), 0, [0.055, 0.06, -0.04]],
    [sp(0.165), 0, [0, 0.22, 0], [0, 0, 0], [1, 1.08, 1.2]], [bx(0.27, 0.05, 0.1), 0, [0, 0.265, 0.135], [0.3, 0, 0]],
    [bx(0.06, 0.12, 0.1), 0, [-0.11, 0.15, 0.1], [0, 0.2, 0]], [bx(0.06, 0.12, 0.1), 0, [0.11, 0.15, 0.1], [0, -0.2, 0]],
    [sp(0.062, 10), 1, [-0.072, 0.215, 0.15]], [sp(0.062, 10), 1, [0.072, 0.215, 0.15]], [bx(0.04, 0.06, 0.04), 1, [0, 0.15, 0.185]],
    [bx(0.17, 0.03, 0.04), 1, [0, 0.1, 0.165]], ...[-3, -2, -1, 0, 1, 2, 3].map((i): Part => [bx(0.018, 0.04, 0.02), 0, [i * 0.024, 0.095, 0.19]]),
    [bx(0.2, 0.07, 0.17), 0, [0, 0.045, 0.085]], [bx(0.1, 0.05, 0.06), 0, [0, 0.02, 0.17]], [cy(0.03, 0.03, 0.25), 1, [0, 0.11, 0.02], [0, 0, H]],
    [bx(0.02, 0.14, 0.22), 1, [0, 0.38, -0.02], [0.15, 0, 0]],
  ]),
  upperArm: segment([[cp(0.05, 0.22), 0, [0, -0.18, 0]], [bx(0.09, 0.2, 0.05), 0, [0, -0.17, 0.05]], [cy(0.015, 0.015, 0.3), 1, [0, -0.18, -0.065]], [cy(0.062, 0.062, 0.11), 1, [0, -0.37, 0], [0, 0, H]]]),
  foreArm: segment([[cy(0.024, 0.02, 0.32), 0, [-0.028, -0.17, 0]], [cy(0.024, 0.02, 0.32), 0, [0.028, -0.17, 0]], [bx(0.085, 0.16, 0.04), 0, [0, -0.13, 0.04]], [bx(0.085, 0.05, 0.07), 1, [0, -0.345, 0]],
    ...[-0.03, 0, 0.03].map((x): Part => [bx(0.018, 0.13, 0.024), 0, [x, -0.43, 0.02], [-0.3, 0, 0]]), [bx(0.018, 0.09, 0.024), 0, [-0.05, -0.39, -0.02], [0.5, 0, 0.3]]]),
  thigh: segment([[cp(0.062, 0.3), 0, [0, -0.24, 0]], [bx(0.11, 0.27, 0.05), 0, [0, -0.22, 0.065]], [cy(0.016, 0.016, 0.38), 1, [-0.05, -0.24, -0.06]], [cy(0.016, 0.016, 0.38), 1, [0.05, -0.24, -0.06]], [cy(0.072, 0.072, 0.13), 1, [0, -0.48, 0], [0, 0, H]]]),
  shin: segment([[cy(0.03, 0.022, 0.44), 0, [0, -0.24, -0.028]], [cy(0.03, 0.022, 0.44), 0, [0, -0.24, 0.028]], [bx(0.08, 0.32, 0.035), 0, [0, -0.2, 0.06]], [sp(0.05, 10), 1, [0, -0.47, 0]],
    [bx(0.12, 0.05, 0.28), 1, [0, -0.52, 0.07]], [bx(0.12, 0.04, 0.1), 0, [0, -0.525, 0.24]], [bx(0.05, 0.1, 0.05), 1, [0, -0.47, -0.08], [0.5, 0, 0]]]),
  blaster: segment([[bx(0.09, 0.1, 0.42), 1, [0, -0.3, 0.1]], [cy(0.03, 0.03, 0.3), 0, [0, -0.3, 0.42], [H, 0, 0]], [bx(0.05, 0.06, 0.16), 0, [0, -0.24, 0.05]]]),
  armor: segment([[bx(0.5, 0.36, 0.14), 0, [0, 0.52, 0.2], [-0.12, 0, 0]], [bx(0.34, 0.2, 0.3), 0, [-0.42, 0.84, 0]], [bx(0.34, 0.2, 0.3), 0, [0.42, 0.84, 0]], [bx(0.4, 0.4, 0.16), 1, [0, 0.5, -0.2]],
    ...[-1, 0, 1].map((i): Part => [cy(0.035, 0.035, 0.12), 1, [-0.42 + 0 * i, 0.98, i * 0.09], [0, 0, 0]]), ...[-1, 0, 1].map((i): Part => [cy(0.035, 0.035, 0.12), 1, [0.42, 0.98, i * 0.09]])]), // placas y lanzadores del mech
  blades: segment([[bx(0.03, 0.5, 0.12), 0, [-0.2, 0.75, -0.22], [0.5, 0, 0.3]], [bx(0.03, 0.5, 0.12), 0, [0.2, 0.75, -0.22], [0.5, 0, -0.3]], [bx(0.03, 0.36, 0.1), 0, [0, 0.85, -0.24], [0.6, 0, 0]]]), // crestas del cazador
  drone: segment([[sp(0.3), 1, [0, 0, 0], [0, 0, 0], [1, 0.62, 1.25]], [bx(0.5, 0.05, 0.16), 0, [0, 0.06, 0.02]], [bx(0.1, 0.1, 0.34), 0, [0, -0.16, 0.2]], [cy(0.035, 0.035, 0.3), 1, [0, -0.17, 0.45], [H, 0, 0]],
    ...([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).flatMap(([x, z]): Part[] => [[cy(0.02, 0.02, 0.52), 0, [x * 0.27, 0.04, z * 0.27], [0, 0, H], [1, 1, 1]], [to(0.19, 0.022), 0, [x * 0.46, 0.08, z * 0.4], [H, 0, 0]], [cy(0.035, 0.035, 0.1), 1, [x * 0.46, 0.06, z * 0.4]]])]),
  rotor: segment([[bx(0.36, 0.008, 0.04), 1, [0, 0, 0]], [bx(0.04, 0.008, 0.36), 1, [0, 0, 0]]]),
  turretBase: segment([[cy(0.75, 0.95, 0.35, 8), 1, [0, 0.18, 0]], [cy(0.5, 0.6, 0.5, 8), 0, [0, 0.55, 0]], ...[0, 1, 2, 3].map((i): Part => [bx(0.3, 0.12, 1.1), 1, [0, 0.06, 0], [0, i * H / 2 + 0.4, 0], [1, 1, 2]])]),
  turretTop: segment([[sp(0.5), 0, [0, 0, 0], [0, 0, 0], [1, 0.8, 1.1]], [bx(0.9, 0.3, 0.5), 1, [0, 0, -0.1]], [cy(0.07, 0.07, 1.3), 1, [-0.26, 0.02, 0.7], [H, 0, 0]], [cy(0.07, 0.07, 1.3), 1, [0.26, 0.02, 0.7], [H, 0, 0]],
    [cy(0.1, 0.1, 0.25), 0, [-0.26, 0.02, 1.25], [H, 0, 0]], [cy(0.1, 0.1, 0.25), 0, [0.26, 0.02, 1.25], [H, 0, 0]], [bx(0.3, 0.2, 0.3), 0, [0, 0.36, -0.1]]]),
  core: segment([[sp(1.5, 28), 1, [0, 0, 0]], ...[0, 1, 2, 3, 4, 5, 6, 7].map((i): Part => [bx(0.5, 1.5, 0.3), 0, [Math.cos(i * 0.785) * 1.55, 0, Math.sin(i * 0.785) * 1.55], [0, -i * 0.785 + H, 0]]),
    [to(1.9, 0.09), 0, [0, 0, 0], [H, 0, 0]], [cy(0.5, 0.9, 2.6, 10), 1, [0, -2.6, 0]], [cy(1.4, 1.8, 0.5, 10), 0, [0, -3.75, 0]]]),
  coreRing: segment([[to(2.5, 0.07), 0, [0, 0, 0]], ...[0, 1, 2, 3].map((i): Part => [bx(0.3, 0.3, 0.3), 1, [Math.cos(i * H) * 2.5, Math.sin(i * H) * 2.5, 0]])]),
};
const glowTex = canvasTex(64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,90,60,1)'); g.addColorStop(0.25, 'rgba(255,40,20,.55)'); g.addColorStop(1, 'rgba(255,20,10,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
const haloMat = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
const eyeGeo = new THREE.SphereGeometry(0.03, 10, 10);
function eye(parent: THREE.Object3D, x: number, y: number, z: number, s = 1, halo = 0) {
  const e = new THREE.Mesh(eyeGeo, eyeMat); e.position.set(x, y, z); e.scale.setScalar(s); parent.add(e);
  if (halo) { const g = new THREE.Sprite(haloMat); g.position.set(x, y, z + 0.05); g.scale.set(halo, halo * 0.6, 1); parent.add(g); }
  return e;
}

/** Aparejo de un enemigo: lo que el bucle de juego necesita para animarlo, apuntarle y desarmarlo. */
export interface Rig {
  root: THREE.Group; kind: 'walker' | 'drone' | 'turret' | 'core'; pieces: THREE.Object3D[];
  /** Volumen de impacto: radio, altura total, altura a partir de la cual es "cabeza", altura de vuelo, altura desde la que dispara. */
  r: number; h: number; headY: number; baseY: number; muzzleY: number;
  torso?: THREE.Group; head?: THREE.Group; legs?: THREE.Group[]; knees?: THREE.Group[]; arms?: THREE.Group[]; elbows?: THREE.Group[]; spin?: THREE.Object3D[];
}
export function makeRig(def: EnemyDef, scene: THREE.Object3D): Rig {
  const root = new THREE.Group(); scene.add(root);
  if (def.shape === 'tri') { // dron
    const body = inst(SEG.drone, root, 0, 0, 0); eye(body, 0, -0.02, 0.36, 2.2, 0.7);
    const spin = ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).map(([x, z]) => inst(SEG.rotor, body, x * 0.46, 0.12, z * 0.4));
    return { root, kind: 'drone', pieces: [body], r: 0.7, h: 0.7, headY: 9, baseY: 1.45, muzzleY: 0, spin };
  }
  if (def.shape === 'hex') { // torreta
    const base = inst(SEG.turretBase, root, 0, 0, 0), top = inst(SEG.turretTop, root, 0, 1.15, 0); eye(top, 0, 0.12, 0.52, 3, 0.9);
    return { root, kind: 'turret', pieces: [top, base], r: 0.85, h: 1.7, headY: 9, baseY: 0, muzzleY: 1.2, head: top };
  }
  if (def.shape === 'core') { // TUTELA: núcleo flotante con anillos
    const body = inst(SEG.core, root, 0, 4.2, 0); const iris = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 18), eyeMat); iris.position.set(0, 0, 1.05); iris.scale.z = 0.5; body.add(iris);
    const halo = new THREE.Sprite(haloMat); halo.position.set(0, 0, 1.6); halo.scale.set(7, 5, 1); body.add(halo);
    const spin = [inst(SEG.coreRing, root, 0, 4.2, 0), inst(SEG.coreRing, root, 0, 4.2, 0)]; spin[1].rotation.y = H; spin[1].scale.setScalar(1.18);
    return { root, kind: 'core', pieces: [body, ...spin], r: 2, h: 6.2, headY: 99, baseY: 0, muzzleY: 4.2, head: body, spin };
  }
  // caminantes: sintético (normal), mech (grande y blindado), cazador (oscuro, rápido, con garras)
  const mech = def.shape === 'mech', hunter = def.shape === 'boss', light = mech ? heavy : hunter ? black : chrome;
  const k = (mech ? 1.55 : hunter ? 1.3 : 1) * rnd(0.97, 1.05);
  const pelvis = inst(SEG.pelvis, root, 0, 1.08, 0, light), torso = inst(SEG.torso, root, 0, 1.16, 0, light), head = inst(SEG.head, torso, 0, 0.78, 0.02, light);
  if (mech) inst(SEG.armor, torso, 0, 0, 0, light); if (hunter) inst(SEG.blades, torso, 0, 0, 0, light);
  eye(head, -0.072, 0.215, 0.19); eye(head, 0.072, 0.215, 0.19, 1, hunter ? 0.8 : 0.5); eye(torso, 0, 0.36, 0.2, 1.6).scale.set(1.4, 2.4, 0.6);
  const legs: THREE.Group[] = [], knees: THREE.Group[] = [], arms: THREE.Group[] = [], elbows: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const leg = inst(SEG.thigh, root, sx * 0.16, 1.03, 0, light), knee = inst(SEG.shin, leg, 0, -0.48, 0, light); legs.push(leg); knees.push(knee);
    const arm = inst(SEG.upperArm, torso, sx * 0.37, 0.72, 0, light), elbow = inst(SEG.foreArm, arm, 0, -0.37, 0, light); arm.rotation.z = sx * 0.12; arms.push(arm); elbows.push(elbow);
    if (def.attacks && (sx > 0 || mech)) { inst(SEG.blaster, elbow, 0, 0, 0, light); eye(elbow, 0, -0.3, 0.58); }
  }
  root.scale.setScalar(k);
  return { root, kind: 'walker', pieces: [head, ...arms, torso, ...legs, pelvis], r: 0.42 * k, h: 2.4 * k, headY: 1.95 * k, baseY: 0, muzzleY: 1.55 * k, torso, head, legs, knees, arms, elbows };
}

// ---------- Objetos de misión ----------
export function makeConvoy(parent: THREE.Object3D) { // camión blindado de refugiados
  const g = new THREE.Group(), body = M(0x5a5a3c, 0.7, 0.3), plate = M(0x3a3a28, 0.6, 0.5), tire = M(0x111214, 0.9);
  box(6.4, 1.9, 2.5, body, -0.8, 1.75, 0, g); box(2, 1.6, 2.4, body, 3.4, 1.6, 0, g); box(0.1, 0.7, 2, M(0x9fd3e6, 0.2, 0.6), 4.42, 1.95, 0, g);
  box(6.5, 0.35, 2.6, plate, -0.8, 0.95, 0, g); box(6.4, 0.25, 2.56, M(0xffb347, 0.6), -0.8, 2.2, 0, g); box(0.5, 0.5, 2.6, plate, 4.5, 0.75, 0, g);
  for (const x of [-3, -1.2, 3.2]) for (const z of [-1.25, 1.25]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 14), tire); w.rotation.x = H; w.position.set(x, 0.55, z); w.castShadow = true; g.add(w); }
  for (const z of [-0.8, 0.8]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), glowMat(0xfff0c0, 4)); l.position.set(4.45, 1.2, z); g.add(l); }
  const lamp = new THREE.SpotLight(0xfff0c0, 60, 30, 0.5, 0.6, 1.5); lamp.position.set(4.5, 1.3, 0); lamp.target.position.set(14, 0, 0); g.add(lamp, lamp.target);
  parent.add(g); return g;
}
export function makeTerminal(parent: THREE.Object3D, radius: number) {
  const g = new THREE.Group(), screen = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x35e0ff).multiplyScalar(2.2) });
  box(0.9, 1.1, 0.6, M(0x30323a, 0.5, 0.7), 0, 0.55, 0, g); box(1, 0.7, 0.08, M(0x15161a, 0.4, 0.8), 0, 1.45, 0.1, g).rotation.x = -0.25;
  const s = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.56), screen); s.position.set(0, 1.46, 0.16); s.rotation.x = -0.25; g.add(s);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.2, 6), dark); antenna.position.set(0.35, 2.2, -0.2); g.add(antenna);
  const ringM = new THREE.MeshBasicMaterial({ color: 0x35e0ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius - 0.12, radius, 48), ringM); ring.rotation.x = -H; ring.position.y = 0.03; g.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 60, 8, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x35e0ff).multiplyScalar(1.5), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  beam.position.y = 32; g.add(beam);
  const light = new THREE.PointLight(0x35e0ff, 14, 12, 1.8); light.position.set(0, 1.8, 0.6); g.add(light);
  parent.add(g);
  return { g, done() { const c = new THREE.Color(0xffb347); screen.color.copy(c).multiplyScalar(2.2); ringM.color.copy(c); (beam.material as THREE.MeshBasicMaterial).color.copy(c).multiplyScalar(1.5); light.color.copy(c); } };
}

/** Arma en primera persona: rifle de caza con culata de madera y las manos del superviviente. */
export function makeViewModel(cam: THREE.Camera) {
  const view = new THREE.Group(); view.scale.setScalar(0.72); cam.add(view);
  const wood = M(0x6b4424, 0.6), sleeve = M(0x4a6079, 0.9), skin = M(0xc99b7a, 0.8), steel = new THREE.MeshStandardMaterial({ color: 0x1c1e22, metalness: 0.9, roughness: 0.35 });
  const vb = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, rx = 0) => { const o = box(w, h, d, m, x, y, z, view); o.castShadow = o.receiveShadow = false; o.rotation.x = rx; return o; };
  vb(0.05, 0.07, 0.42, wood, 0, -0.01, 0.12, -0.05); vb(0.055, 0.1, 0.2, wood, 0, -0.045, 0.34, -0.25); vb(0.045, 0.06, 0.3, steel, 0, 0.012, -0.16); vb(0.05, 0.05, 0.26, wood, 0, -0.03, -0.3);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.015, 0.62, 10), steel); barrel.rotation.x = H; barrel.position.set(0, 0.02, -0.55); view.add(barrel);
  vb(0.012, 0.03, 0.012, steel, 0, 0.045, -0.84); vb(0.03, 0.035, 0.05, steel, 0, 0.05, -0.1); vb(0.03, 0.1, 0.06, steel, 0, -0.08, -0.14);
  vb(0.085, 0.085, 0.3, sleeve, 0.02, -0.07, 0.2, 0.3); vb(0.07, 0.075, 0.09, skin, 0.01, -0.05, 0.04);
  vb(0.085, 0.085, 0.34, sleeve, -0.11, -0.1, -0.16, -0.25).rotation.y = -0.5; vb(0.075, 0.07, 0.1, skin, -0.02, -0.06, -0.32);
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, map: canvasTex(64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(0.3, 'rgba(255,190,90,.9)'); g.addColorStop(1, 'rgba(255,120,30,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    c.strokeStyle = 'rgba(255,220,150,.9)'; c.lineWidth = 3; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(32, 32); c.lineTo(32 + Math.cos(i * 1.05) * 30, 32 + Math.sin(i * 1.05) * 30); c.stroke(); }
  }) })); flash.position.set(0, 0.02, -0.9); flash.visible = false; view.add(flash);
  const light = new THREE.PointLight(0xffb060, 0, 18, 2); cam.add(light); light.position.set(0.2, -0.1, -1);
  return { view, flash, light };
}
