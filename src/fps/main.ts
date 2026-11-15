// Bucle de juego en primera persona. Las REGLAS no viven aquí: MissionDirector/EndlessDirector deciden
// cuándo aparecen enemigos y cuándo se gana; enemies.json/weapons.json definen comportamiento y armas.
import * as THREE from 'three';
import { BALANCE, CAMPAIGNS, ENEMIES, UPGRADES, enemyDef, hex, missionDef, weaponDef } from '../core/data';
import { completeMission, playerStats, recordEndless } from '../core/Economy';
import { MissionDirector } from '../core/MissionDirector';
import { EndlessDirector } from '../core/WaveGenerator';
import type { Director, EnemyDef, MissionDef, SpawnRequest, WeaponDef } from '../core/types';
import { setLang, t } from '../i18n/i18n';
import { ads, saves } from '../services';
import { audio } from './audio';
import { TOUCH, camera, composer, glowMat, moon, renderer, rnd, scene, sky } from './gfx';
import { L, buildLevel, collide, wallDist, type Keep } from './level';
import { makeConvoy, makeRig, makeTerminal, makeViewModel, type Rig } from './models';
import { $, continuePrompt, mainMenu, on, pauseMenu, resultScreen, show } from './ui';

const U = 1 / 25;          // los datos de diseño están en px del prototipo 2D: 25 px = 1 m
const RANGE = U * 1.6;     // alcances algo mayores en primera persona
const F = BALANCE.fps; // dificultad de la versión en primera persona (balance.json)
setLang(saves.data.settings.lang); audio.setOn(saves.data.settings.sound);

interface Enemy { def: EnemyDef; rig: Rig; hp: number; maxHp: number; x: number; z: number; alive: boolean; cds: number[]; dashCd: number; dashT: number; vx: number; vz: number; summonCd: number; touchCd: number; phase: number; toConvoy: boolean; retreat: number }
const P = { x: 0, z: 0, yaw: 0, pitch: 0, hp: 100, maxHp: 100, speed: 5.4, mag: 30, fireCd: 0, reload: 0, recoil: 0, bob: 0, stepT: 0, lastHurt: 0, crouch: 0 };
const G = { id: 'endless', mission: undefined as MissionDef | undefined, arena: BALANCE.endless.arena as { w: number; h: number; tint: string; theme?: string }, director: null as Director | null,
  playing: false, paused: false, ended: false, continued: false, coins: 0, dmgMult: 1, weapon: weaponDef('blaster') as WeaponDef, bot: false, speed: 1, lastCoins: 0 };
const enemies: Enemy[] = [];
let boss: Enemy | undefined, shake = 0, noteT = 0, time = 0, hudT = 0;
let convoy: { g: THREE.Group; x: number; z: number; hp: number; max: number; t: number; fx: number; fz: number; tx: number; tz: number; speed: number } | undefined;
let terminals: { x: number; z: number; r: number; finished: boolean; done(): void }[] = [];
const { view, flash, light: muzzle } = makeViewModel(camera);

// ---------- Efectos (pools: nada se crea durante la partida salvo los enemigos) ----------
const tracers = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })); m.visible = false; scene.add(m); return { m, life: 0 }; });
const boltMat = glowMat(0xff3020, 6), boltGeo = new THREE.SphereGeometry(0.09, 8, 8);
const bolts = Array.from({ length: 60 }, () => { const m = new THREE.Mesh(boltGeo, boltMat); m.scale.z = 4; m.visible = false; scene.add(m); return { m, v: new THREE.Vector3(), life: 0, dmg: 0 }; });
const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a18).multiplyScalar(2), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
const beams = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 60, 10, 1, true), beamMat); m.visible = false; scene.add(m); return { m, life: 0 }; });
const SP = 500, spPos = new Float32Array(SP * 3).fill(-99), spVel = new Float32Array(SP * 3), spLife = new Float32Array(SP); let spI = 0;
const sparks = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffb870, size: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
sparks.geometry.setAttribute('position', new THREE.BufferAttribute(spPos, 3)); sparks.frustumCulled = false; scene.add(sparks);
function burst(x: number, y: number, z: number, n: number, speed: number) { for (let i = 0; i < n; i++) { const k = (spI++ % SP) * 3; spPos[k] = x; spPos[k + 1] = y; spPos[k + 2] = z; spVel[k] = rnd(-1, 1) * speed; spVel[k + 1] = rnd(0, 1.2) * speed; spVel[k + 2] = rnd(-1, 1) * speed; spLife[k / 3] = rnd(0.25, 0.7); } }
const embers = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xff9a4a, size: 0.07, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
const emberPos = new Float32Array(300 * 3); for (let i = 0; i < emberPos.length; i += 3) { emberPos[i] = rnd(-30, 30); emberPos[i + 1] = rnd(0, 10); emberPos[i + 2] = rnd(-30, 30); }
embers.geometry.setAttribute('position', new THREE.BufferAttribute(emberPos, 3)); embers.frustumCulled = false; scene.add(embers);
const debris: { m: THREE.Object3D; v: THREE.Vector3; w: THREE.Vector3; life: number }[] = [];
function note(text: string, secs = 2.4) { $('note').textContent = text; noteT = secs; }

// ---------- Partida ----------
const toW = (p: { x: number; y: number }) => ({ x: (p.x - G.arena.w / 2) * U, z: (p.y - G.arena.h / 2) * U });
function clearWorld() {
  for (const e of enemies) scene.remove(e.rig.root); enemies.length = 0; boss = undefined;
  for (const d of debris) scene.remove(d.m); debris.length = 0;
  for (const b of bolts) b.m.visible = false; convoy = undefined; terminals = []; gateBeam.visible = false; lastWave = 0;
}
function start(id: string) {
  clearWorld();
  const s = saves.data; G.id = id; G.mission = id === 'endless' ? undefined : missionDef(id); G.arena = G.mission?.arena ?? BALANCE.endless.arena;
  const o = G.mission?.objective, st = G.mission?.playerStart ? toW(G.mission.playerStart) : { x: 0, z: 0 }, keep: Keep[] = [{ ...st, r: 5 }];
  for (const sp of G.mission?.spawns ?? []) if (typeof sp.where === 'object') keep.push({ ...toW(sp.where), r: 3.5 });
  if (o?.type === 'hack') for (const p of o.terminals) keep.push({ ...toW(p), r: o.radius * U + 2 });
  if (o?.type === 'defend') { const a = toW(o.convoy.from), b = toW(o.convoy.to); for (let k = 0; k <= 1; k += 0.03) keep.push({ x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, r: 4 }); }
  buildLevel(G.arena.w, G.arena.h, id, hex(G.arena.tint), keep, G.arena.theme);
  gate = -1; gateT = 0;
  if (o?.type === 'hack') terminals = o.terminals.map((p) => { const w = toW(p), tm = makeTerminal(L.group, o.radius * U); tm.g.position.set(w.x, 0, w.z); return { ...w, r: o.radius * U, finished: false, done: tm.done }; });
  if (o?.type === 'defend') { const a = toW(o.convoy.from), b = toW(o.convoy.to); convoy = { g: makeConvoy(L.group), x: a.x, z: a.z, hp: o.convoy.hp, max: o.convoy.hp, t: 0, fx: a.x, fz: a.z, tx: b.x, tz: b.z, speed: o.convoy.speed * U }; convoy.g.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x); }
  G.director = G.mission ? new MissionDirector(G.mission) : new EndlessDirector(ENEMIES, BALANCE.endless);
  const stats = playerStats(s, UPGRADES, BALANCE.player);
  G.weapon = weaponDef(s.equipped); G.dmgMult = stats.damageMult; G.coins = 0; G.ended = G.continued = G.paused = false;
  Object.assign(P, { x: st.x, z: st.z, yaw: convoy ? -Math.PI / 2 : 0, pitch: 0, hp: stats.maxHp, maxHp: stats.maxHp, speed: 5.4 * (stats.speed / BALANCE.player.speed), mag: G.weapon.mag ?? 30, fireCd: 0, reload: 0, recoil: 0, lastHurt: -99 });
  $('wname').textContent = t(G.weapon.nameKey); $('hudAll').style.display = 'block'; $('pauseBtn').style.display = $('crouchBtn').style.display = TOUCH ? 'block' : 'none';
  show(null); G.playing = true; lock(); audio.unlock(); audio.alarm();
  note(G.mission ? `${t(G.mission.nameKey)} — ${t(G.mission.briefKey)}` : t('menu.endless'), 5);
}
// Las máquinas llegan por UN lado de la zona (la "puerta"), marcado con un haz rojo; cambia cada cierto tiempo.
let gate = -1, gateT = 0;
const gateBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 2, 240, 12, 1, true), beamMat); gateBeam.visible = false; scene.add(gateBeam);
const GATES: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // norte, este, sur, oeste
function nextGate() {
  const long = L.hw > L.hd * 2.2, opts = long ? [0, 2] : [0, 1, 2, 3]; let g = gate; while (g === gate && opts.length > 1) g = opts[Math.floor(Math.random() * opts.length)];
  gate = g < 0 ? opts[0] : g; gateT = F.gateSeconds; note(t(`fps.gate${gate}`), 3.5); audio.alarm();
}
function spawnPoint(where: SpawnRequest['where']) {
  if (typeof where === 'object') return toW(where);
  if (gate < 0) nextGate();
  const a = where === 'objective' && convoy ? convoy : P, [gx, gz] = GATES[gate], p = { x: 0, z: 0 };
  for (let i = 0; i < 8; i++) { // sobre el borde de esa puerta, cerca del jugador pero nunca encima
    p.x = gx ? gx * (L.hw - 2) : THREE.MathUtils.clamp(a.x + rnd(-11, 11), -L.hw + 2, L.hw - 2); p.z = gz ? gz * (L.hd - 2) : THREE.MathUtils.clamp(a.z + rnd(-9, 9), -L.hd + 2, L.hd - 2);
    if (gx && Math.abs(p.x - a.x) > 34) p.x = a.x + gx * 34; if (gz && Math.abs(p.z - a.z) > 34) p.z = a.z + gz * 34;
    if (Math.hypot(p.x - P.x, p.z - P.z) > 13) break; p.x += gx ? 0 : (p.x > P.x ? 9 : -9); p.z += gz ? 0 : (p.z > P.z ? 9 : -9);
  }
  gateBeam.position.set(gx ? gx * (L.hw + 1) : a.x, 118, gz ? gz * (L.hd + 1) : a.z); gateBeam.visible = true;
  return p;
}
let lastWave = 0;
function spawn(req: SpawnRequest) {
  const def = enemyDef(req.enemy), dd = G.director;
  if (dd instanceof EndlessDirector && dd.wave !== lastWave) { lastWave = dd.wave; nextGate(); }
  const n = def.boss || typeof req.where === 'object' ? req.count : Math.max(1, Math.round(req.count * F.countScale)); // menos máquinas a la vez que en el 2D
  for (let i = 0; i < n; i++) {
    if (!def.boss && enemies.filter((e) => e.alive).length >= F.maxAlive) return;
    const p = spawnPoint(req.where), rig = makeRig(def, scene), hp = def.hp * (req.hpMult ?? 1);
    const e: Enemy = { def, rig, hp, maxHp: hp, x: p.x, z: p.z, alive: true, cds: (def.attacks ?? []).map((a) => a.cooldown * rnd(0.6, 1.2)), dashCd: def.dash?.cooldown ?? 0, dashT: 0, vx: 0, vz: 0, summonCd: def.summon?.cooldown ?? 0, touchCd: 0, phase: rnd(0, 6), toConvoy: !!convoy && !def.boss && Math.random() < 0.45, retreat: 0 };
    if (rig.kind === 'walker' || rig.kind === 'drone') collide(e, rig.r);
    rig.root.position.set(e.x, rig.baseY, e.z); enemies.push(e);
    const b = beams.find((q) => !q.m.visible); if (b) { b.m.position.set(e.x, 30, e.z); b.m.visible = true; b.life = 0.9; }
    if (def.boss) { boss = e; shake = 0.5; audio.alarm(); note(t(def.nameKey), 3); } else audio.spawn();
  }
}
function kill(e: Enemy, dir: THREE.Vector3) {
  e.alive = false; e.rig.root.updateMatrixWorld(true); const big = !!e.def.boss || e.def.shape === 'mech';
  for (const part of e.rig.pieces) { scene.attach(part); debris.push({ m: part, v: new THREE.Vector3(dir.x * 4 + rnd(-2, 2), rnd(1.5, big ? 8 : 5), dir.z * 4 + rnd(-2, 2)), w: new THREE.Vector3(rnd(-7, 7), rnd(-7, 7), rnd(-7, 7)), life: 4 }); }
  scene.remove(e.rig.root); burst(e.x, e.rig.baseY + e.rig.h * 0.5, e.z, big ? 80 : 30, big ? 8 : 5); audio.boom(big); if (big) shake = 0.6;
  G.coins += e.def.coins; G.director!.onEnemyKilled(e.def.id); if (boss === e) boss = undefined;
}
function hurt(n: number) {
  if (G.ended || G.bot) return; P.hp -= n * F.damageScale; P.lastHurt = time; shake = Math.max(shake, 0.3); $('hurt').style.opacity = '1'; audio.hurt();
  if (P.hp <= 0) G.director!.fail();
}
function hurtConvoy(n: number) { if (!convoy || convoy.hp <= 0) return; convoy.hp -= n * F.damageScale; burst(convoy.x, 2, convoy.z, 6, 3); if (convoy.hp <= 0) { burst(convoy.x, 2, convoy.z, 120, 9); audio.boom(true); convoy.g.visible = false; } }

// ---------- Disparo ----------
const dir = new THREE.Vector3(), tmp = new THREE.Vector3(), eyeP = new THREE.Vector3();
function trace(o: THREE.Vector3, d: THREE.Vector3, max: number) {
  let dist = wallDist(o, d, max), hit: Enemy | null = null, head = false; const h2 = d.x * d.x + d.z * d.z || 1e-6;
  for (const e of enemies) if (e.alive) {
    const tt = ((e.x - o.x) * d.x + (e.z - o.z) * d.z) / h2; if (tt <= 0 || tt >= dist) continue;
    const r = e.rig, y = o.y + d.y * tt, lo = r.kind === 'drone' ? r.baseY - 0.45 : r.kind === 'core' ? 2.3 : 0, hi = r.kind === 'drone' ? r.baseY + 0.45 : r.h;
    if (y < lo || y > hi) continue; const isHead = y > r.headY;
    if (Math.hypot(o.x + d.x * tt - e.x, o.z + d.z * tt - e.z) < (isHead ? r.r * 0.65 : r.r) * F.hitRadius) { dist = tt; hit = e; head = isHead; }
  }
  return { e: hit, dist, head };
}
const aimDir = (yo = 0, po = 0) => { const y = P.yaw + yo, p = P.pitch + po; return dir.set(-Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p)); };
function fire() {
  const w = G.weapon, sp = THREE.MathUtils.degToRad(w.spreadDeg), max = Math.max(w.range * U * 2.5, 18), heavy = w.pellets > 1 || w.damage > 20;
  P.fireCd = 1 / w.fireRate; P.mag--; P.recoil = heavy ? 1.8 : 1; shake = Math.max(shake, heavy ? 0.12 : 0.05); flash.visible = true; flash.rotation.z = rnd(0, 6.28); muzzle.intensity = 9; audio.shot(heavy);
  let anyHit = false, anyHead = false;
  for (let i = 0; i < w.pellets; i++) {
    const h = trace(eyeP.copy(camera.position), aimDir(rnd(-0.5, 0.5) * sp, rnd(-0.5, 0.5) * sp), max); tmp.copy(eyeP).addScaledVector(dir, h.dist);
    const tr = tracers[(spI + i) % tracers.length]; view.getWorldPosition(tr.m.position); tr.m.scale.z = tr.m.position.distanceTo(tmp); tr.m.lookAt(tmp); tr.m.position.lerp(tmp, 0.5); (tr.m.material as THREE.MeshBasicMaterial).color.set(hex(w.color)).multiplyScalar(3); tr.m.visible = true; tr.life = 0.05;
    burst(tmp.x, tmp.y, tmp.z, h.e ? 8 : 4, h.e ? 3.5 : 2);
    if (h.e) { anyHit = true; anyHead ||= h.head; h.e.hp -= w.damage * G.dmgMult * (h.head ? 2 : 1); if (h.e.hp <= 0) kill(h.e, dir); }
  }
  if (anyHit) { $('cross').classList.add('on'); setTimeout(() => $('cross').classList.remove('on'), 90); if (anyHead) audio.head(); else audio.hit(); }
  if (P.mag <= 0) startReload();
}
function startReload() { if (P.reload > 0 || P.mag >= (G.weapon.mag ?? 30)) return; P.reload = 1.5; note(t('fps.reload'), 1.5); audio.reload(); }

// ---------- Enemigos (comportamiento definido por enemies.json) ----------
function shoot(e: Enemy, tgt: { x: number; z: number }, d: number, tall: number) {
  const r = e.rig, base = Math.atan2(tgt.x - e.x, tgt.z - e.z);
  for (let i = 0; i < e.def.attacks!.length; i++) {
    const a = e.def.attacks![i]; if (e.cds[i] > 0) continue;
    const radial = a.pattern === 'radial', oy = radial ? 1.3 : r.muzzleY;
    if (!radial) { tmp.set(e.x, oy, e.z); dir.set(tgt.x - e.x, tall - oy, tgt.z - e.z).normalize(); if (wallDist(tmp, dir, d) < d - 1.2) { e.cds[i] = 0.35; continue; } } // sin línea de tiro
    e.cds[i] = a.cooldown; audio.bolt(Math.max(0.25, 1 - d / 40));
    for (let k = 0; k < a.count; k++) {
      const b = bolts.find((q) => !q.m.visible); if (!b) break;
      const ang = radial ? time * 0.7 + (k * 6.2832) / a.count : base + (a.count > 1 ? (k / (a.count - 1) - 0.5) * THREE.MathUtils.degToRad(a.spreadDeg) : 0);
      b.v.set(Math.sin(ang), radial ? 0 : (tall - oy) / d, Math.cos(ang)).normalize();
      b.m.position.set(e.x, oy, e.z).addScaledVector(b.v, r.r + 0.3); b.m.lookAt(tmp.copy(b.m.position).add(b.v)); b.v.multiplyScalar(a.bulletSpeed * U * 1.7); b.dmg = a.damage; b.life = 4; b.m.visible = true;
    }
  }
}
function tickEnemy(e: Enemy, dt: number) {
  const def = e.def, r = e.rig, toC = e.toConvoy && !!convoy && convoy.hp > 0, tgt = toC ? convoy! : P;
  const dx = tgt.x - e.x, dz = tgt.z - e.z, d = Math.hypot(dx, dz) || 1, rage = def.enrageAt !== undefined && e.hp < e.maxHp * def.enrageAt ? 1.6 : 1;
  const range = (def.range ?? 9999) * RANGE, contact = r.r + (toC ? 2.4 : 0.75); let moving = false; e.touchCd -= dt;
  if (e.dashT > 0) { e.dashT -= dt; e.x += e.vx * dt; e.z += e.vz * dt; moving = true; }
  else if (def.behavior !== 'turret') {
    let k = 1; if (def.behavior === 'shooter') k = d < range * 0.55 ? -0.6 : d < range * 0.85 ? 0 : 1; if (d < contact) k = 0;
    if (e.retreat > 0) { e.retreat -= dt; k = -0.8; } // tras golpear se aparta: da un respiro para dispararle
    const sp = def.speed * U * (r.kind === 'drone' ? F.droneSpeed : F.enemySpeed) * (rage > 1 ? 1.25 : 1) * k; if (sp) { e.x += (dx / d) * sp * dt; e.z += (dz / d) * sp * dt; moving = true; }
    if (def.dash && (e.dashCd -= dt) <= 0 && d < 22 && d > 3) { e.dashCd = def.dash.cooldown / rage; e.dashT = def.dash.duration; e.vx = (dx / d) * def.dash.speed * U; e.vz = (dz / d) * def.dash.speed * U; audio.spawn(); }
  }
  if (r.kind === 'walker' || r.kind === 'drone') {
    for (const o of enemies) if (o !== e && o.alive && o.rig.kind === r.kind) { const ex = e.x - o.x, ez = e.z - o.z, q = Math.hypot(ex, ez), min = r.r + o.rig.r + 0.15; if (q < min && q > 0) { e.x += (ex / q) * (min - q) * 0.5; e.z += (ez / q) * (min - q) * 0.5; } }
    collide(e, r.r);
  }
  if (def.contactDamage && d < contact + 0.35 && e.touchCd <= 0) { e.touchCd = F.touchCooldown; if (r.kind === 'drone') e.retreat = F.droneRetreat; if (toC) hurtConvoy(def.contactDamage); else hurt(def.contactDamage); }
  if (def.attacks) { for (let i = 0; i < e.cds.length; i++) e.cds[i] -= dt * rage; if (d <= range * 1.15) shoot(e, tgt, d, toC ? 1.6 : 1.3 - 0.6 * P.crouch); }
  if (def.summon && (e.summonCd -= dt * rage) <= 0) { e.summonCd = def.summon.cooldown; for (let i = 0; i < def.summon.count; i++) { const a = rnd(0, 6.28), w = { x: (e.x + Math.cos(a) * 4) / U + G.arena.w / 2, y: (e.z + Math.sin(a) * 4) / U + G.arena.h / 2 }; spawn({ enemy: def.summon.enemy, count: 1, where: w }); } }
  // animación
  const face = Math.atan2(dx, dz), ph = time * 6 + e.phase, sw = moving ? Math.sin(ph) : 0;
  if (r.kind === 'walker') {
    const near = d < contact + 2 && !!def.contactDamage && !def.attacks, gun = !!def.attacks;
    r.root.rotation.y = face; r.root.position.set(e.x, moving ? Math.abs(Math.cos(ph)) * 0.05 : 0, e.z);
    r.legs![0].rotation.x = -sw * 0.55; r.legs![1].rotation.x = sw * 0.55; r.knees![0].rotation.x = 0.12 + Math.max(0, -sw) * 0.9; r.knees![1].rotation.x = 0.12 + Math.max(0, sw) * 0.9;
    r.torso!.rotation.x = 0.16 + (e.dashT > 0 ? 0.5 : 0); r.torso!.rotation.y = sw * 0.12; r.head!.rotation.x = -0.12;
    r.arms![0].rotation.x = near ? -1.5 + Math.sin(time * 9 + e.phase) * 0.5 : gun && def.shape === 'mech' ? -1.25 : sw * 0.45; r.elbows![0].rotation.x = -0.45;
    r.arms![1].rotation.x = gun ? -1.25 : near ? -1.5 - Math.sin(time * 9 + e.phase) * 0.5 : -sw * 0.45; r.elbows![1].rotation.x = gun ? -0.35 : -0.45;
  } else if (r.kind === 'drone') {
    r.root.rotation.set(moving ? 0.25 : 0, face, 0, 'YXZ'); r.root.position.set(e.x, r.baseY + Math.sin(time * 3 + e.phase) * 0.15, e.z); for (const s of r.spin!) s.rotation.y += dt * 40;
  } else if (r.kind === 'turret') { r.head!.rotation.y = face; r.root.position.set(e.x, 0, e.z); }
  else { r.head!.rotation.y = face; r.root.position.set(e.x, Math.sin(time * 1.2) * 0.25, e.z); r.spin![0].rotation.x += dt * (rage > 1 ? 2.2 : 0.9); r.spin![1].rotation.z += dt * (rage > 1 ? 1.8 : 0.7); }
}

// ---------- Fin de partida ----------
function lock() { if (!TOUCH && !G.bot) { try { void (renderer.domElement.requestPointerLock() as unknown as Promise<void>)?.catch?.(() => undefined); } catch { /* sin bloqueo: se mira arrastrando */ } } }
function end(won: boolean) {
  G.ended = true; G.playing = false; $('wp').style.display = $('arrow').style.display = 'none'; document.exitPointerLock?.(); if (won) audio.win(); else audio.lose();
  setTimeout(() => { if (!won && P.hp <= 0 && !G.continued && ads.isRewardedReady()) continuePrompt(saves.data.purchases.removeAds); else summary(won); }, G.bot ? 0 : 1100);
}
async function reward(place: 'continue' | 'double_coins') { return saves.data.purchases.removeAds || ads.showRewarded(place); }
function summary(won: boolean) {
  const s = saves.data, d = G.director!, endless = d instanceof EndlessDirector, coins = G.coins + (won ? G.mission?.reward ?? 0 : 0);
  s.coins += coins; G.lastCoins = coins; let record = false;
  if (won && G.mission) completeMission(s, G.mission.id);
  if (d instanceof EndlessDirector) record = recordEndless(s, d.wave, d.score);
  saves.save();
  const camp = CAMPAIGNS.find((c) => c.missions.includes(G.id)), next = won && camp ? camp.missions[camp.missions.indexOf(G.id) + 1] : undefined;
  (window as unknown as { __RESULT: object }).__RESULT = { won, coins };
  resultScreen({ won, endless, missionName: G.mission ? t(G.mission.nameKey) : '', coins, wave: d instanceof EndlessDirector ? d.wave : 0, score: d instanceof EndlessDirector ? d.score : 0, record, canDouble: coins > 0 && ads.isRewardedReady(), adFree: s.purchases.removeAds, hasNext: !!next });
}
function toMenu() { G.playing = G.paused = false; G.ended = true; $('hudAll').style.display = 'none'; document.exitPointerLock?.(); mainMenu(); }
on('play', start); on('restart', () => start(G.id)); on('quit', toMenu); on('menu', toMenu); on('giveup', () => summary(false));
on('next', () => { const camp = CAMPAIGNS.find((c) => c.missions.includes(G.id))!; start(camp.missions[camp.missions.indexOf(G.id) + 1]); });
on('resume', () => { G.paused = false; G.playing = true; show(null); lock(); });
on('continue', async () => {
  if (!(await reward('continue'))) return summary(false);
  P.hp = Math.round(P.maxHp * BALANCE.continueHpFraction); G.continued = true; G.ended = false; G.director!.resume(); for (const b of bolts) b.m.visible = false; show(null); G.playing = true; lock();
});
on('double', async () => { const b = document.querySelector('[data-a="double"]') as HTMLButtonElement; b.disabled = true; if (!(await reward('double_coins'))) return; saves.data.coins += G.lastCoins; saves.save(); $('rcoins').textContent = t('result.coins', { n: G.lastCoins * 2 }); audio.coin(); b.remove(); });
function pause() { if (!G.playing) return; G.playing = false; G.paused = true; document.exitPointerLock?.(); pauseMenu(); }

// ---------- Controles: WASD o flechas + ratón; táctil: stick izquierdo y arrastre derecho ----------
const keys = new Set<string>(); const move = { x: 0, z: 0 }; let mouseFire = false, locked = false, crouchBtn = false;
const eyeY = () => 1.65 - 0.7 * P.crouch;
addEventListener('keydown', (e) => { const k = e.key.toLowerCase(); keys.add(k); if (k.startsWith('arrow') || k === ' ' || k === 'control') e.preventDefault(); if (k === 'r') startReload(); if (k === 'escape' || k === 'p') pause(); });
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => { keys.clear(); pause(); });
const cv = renderer.domElement;
document.addEventListener('pointerlockchange', () => { const was = locked; locked = document.pointerLockElement === cv; if (was && !locked) pause(); });
const look = (dx: number, dy: number, k: number) => { P.yaw -= dx * k; P.pitch = THREE.MathUtils.clamp(P.pitch - dy * k, -1.3, 1.3); };
let stick: { id: number; ox: number; oy: number } | null = null; const lookIds = new Map<number, { x: number; y: number }>();
cv.addEventListener('pointerdown', (e) => {
  if (!G.playing) return;
  if (e.pointerType === 'mouse') { mouseFire = true; if (!locked) lock(); return; }
  if (e.clientX < innerWidth * 0.45 && !stick) { stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY }; const el = $('sl'); el.style.display = 'block'; el.style.left = e.clientX + 'px'; el.style.top = e.clientY + 'px'; }
  else lookIds.set(e.pointerId, { x: e.clientX, y: e.clientY });
});
addEventListener('pointermove', (e) => {
  if (!G.playing) return;
  if (e.pointerType === 'mouse') { if (locked || mouseFire) look(e.movementX, e.movementY, 0.0023); return; }
  if (stick && e.pointerId === stick.id) { let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy; const len = Math.hypot(dx, dy), k = Math.min(len, 50) / (len || 1); dx *= k; dy *= k; ($('sl').firstElementChild as HTMLElement).style.transform = `translate(${dx}px,${dy}px)`; move.x = dx / 50; move.z = dy / 50; return; }
  const l = lookIds.get(e.pointerId); if (l) { look(e.clientX - l.x, e.clientY - l.y, 0.0052); l.x = e.clientX; l.y = e.clientY; }
});
const up = (e: PointerEvent) => { if (e.pointerType === 'mouse') mouseFire = false; if (stick && e.pointerId === stick.id) { stick = null; move.x = move.z = 0; $('sl').style.display = 'none'; ($('sl').firstElementChild as HTMLElement).style.transform = ''; } lookIds.delete(e.pointerId); };
addEventListener('pointerup', up); addEventListener('pointercancel', up); $('pauseBtn').addEventListener('click', pause);
$('crouchBtn').addEventListener('click', () => { crouchBtn = !crouchBtn; $('crouchBtn').classList.toggle('on', crouchBtn); });

// ---------- HUD ----------
const radar = ($('radar') as HTMLCanvasElement).getContext('2d')!;
function goal(): { x: number; z: number; y: number } | null {
  if (convoy && convoy.hp > 0) return { x: convoy.x, z: convoy.z, y: 3.4 };
  let best: { x: number; z: number; y: number } | null = null, bd = 1e9;
  for (const tm of terminals) if (!tm.finished) { const d = Math.hypot(tm.x - P.x, tm.z - P.z); if (d < bd) { bd = d; best = { x: tm.x, z: tm.z, y: 2.6 }; } }
  return best ?? (boss?.alive ? { x: boss.x, z: boss.z, y: boss.rig.h + 0.6 } : null);
}
function drawHud() {
  const R = 60, c = radar, sy = Math.sin(P.yaw), cw = Math.cos(P.yaw); let best = 1e9, bestAng = 0;
  const rel = (x: number, z: number) => { const dx = x - P.x, dz = z - P.z; return { fx: dx * cw - dz * sy, fz: -dx * sy - dz * cw, d: Math.hypot(dx, dz) }; };
  c.clearRect(0, 0, 120, 120); c.fillStyle = 'rgba(6,10,16,.55)'; c.beginPath(); c.arc(R, R, R - 2, 0, 6.29); c.fill(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.1)'; c.beginPath(); c.moveTo(R, R); c.arc(R, R, R - 2, -Math.PI / 2 - 0.62, -Math.PI / 2 + 0.62); c.fill();
  const dot = (x: number, z: number, col: string, size: number) => { const p = rel(x, z), k = (Math.min(p.d, 46) / 46) * (R - 6) / (p.d || 1); c.fillStyle = col; c.beginPath(); c.arc(R + p.fx * k, R - p.fz * k, size, 0, 6.29); c.fill(); return p; };
  for (const e of enemies) if (e.alive) { const p = dot(e.x, e.z, e.def.boss ? '#ff3d81' : e.def.attacks ? '#ffb347' : '#ff3b30', e.def.boss ? 5 : 3); if (p.d < best) { best = p.d; bestAng = Math.atan2(p.fx, p.fz); } }
  for (const tm of terminals) dot(tm.x, tm.z, tm.finished ? '#ffb347' : '#35e0ff', 4); if (convoy && convoy.hp > 0) dot(convoy.x, convoy.z, '#35e0ff', 5);
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(R, R - 5); c.lineTo(R - 4, R + 4); c.lineTo(R + 4, R + 4); c.fill();
  const ar = $('arrow'); if (best < 1e9 && Math.abs(bestAng) > 0.62) { ar.style.display = 'block'; ar.style.transform = `rotate(${bestAng}rad) translateY(-${Math.min(innerHeight * 0.34, 190)}px)`; ar.style.opacity = best < 8 ? '1' : '0.7'; } else ar.style.display = 'none';
  const g = goal(), wp = $('wp'); // marcador del objetivo proyectado en pantalla
  if (g) { tmp.set(g.x, g.y, g.z).project(camera); const back = tmp.z > 1, x = THREE.MathUtils.clamp(((back ? -tmp.x : tmp.x) * 0.5 + 0.5) * innerWidth, 50, innerWidth - 50), y = back ? innerHeight - 110 : THREE.MathUtils.clamp((-tmp.y * 0.5 + 0.5) * innerHeight, 90, innerHeight - 110);
    wp.style.display = 'block'; wp.style.transform = `translate(${x}px,${y}px)`; wp.lastElementChild!.textContent = `${Math.round(Math.hypot(g.x - P.x, g.z - P.z))} m`; } else wp.style.display = 'none';
  const info = G.director!.hud(); $('obj').textContent = t(info.key, info.params);
  const bar = boss?.alive ? [boss.hp / boss.maxHp, t(boss.def.nameKey), '#ff3b30'] as const : convoy ? [convoy.hp / convoy.max, t('hud.convoy'), '#ffb347'] as const : null;
  $('bar2').style.display = bar ? 'block' : 'none'; $('sub2').textContent = bar ? bar[1] : ''; if (bar) { const f = $('bar2').firstElementChild as HTMLElement; f.style.width = Math.max(0, bar[0]) * 100 + '%'; f.style.background = bar[2]; }
  $('hp').style.width = (Math.max(0, P.hp) / P.maxHp) * 100 + '%'; $('hpn').textContent = String(Math.max(0, Math.round(P.hp))); $('mag').textContent = String(P.mag); $('coins').textContent = `◆ ${G.coins}`;
}

// ---------- Bot de pruebas (scripts/smoke-fps.mjs): invulnerable, apunta solo y va al objetivo ----------
let botStuck = 0, botLast = 0, botStrafe = 0;
function botInput() {
  P.hp = P.maxHp; let best: Enemy | null = null, bd = 1e9;
  for (const e of enemies) if (e.alive) { const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; best = e; } }
  if (best) { const r = best.rig, ay = r.kind === 'drone' ? r.baseY : r.kind === 'core' ? 4.2 : r.kind === 'turret' ? 1.2 : r.h * 0.6; P.yaw = Math.atan2(-(best.x - P.x), -(best.z - P.z)); P.pitch = Math.atan2(ay - 1.65, bd); }
  const g = goal(), tgt = g && !boss ? g : best && bd > 9 ? best : null, stop = convoy ? 6 : 1.2; let mx = 0, mz = 0;
  if (tgt) { const dx = tgt.x - P.x, dz = tgt.z - P.z, d = Math.hypot(dx, dz); if (d > stop) { mx = dx / d; mz = dz / d; } }
  if (botStrafe > 0) { botStrafe -= 0.033; const k = mx; mx = -mz; mz = k; }
  if ((botStuck += 0.033) > 1) { const moved = Math.abs(P.x + P.z * 7 - botLast); botLast = P.x + P.z * 7; botStuck = 0; if ((mx || mz) && moved < 0.5) botStrafe = 0.9; }
  return { mx, mz };
}

// ---------- Bucle ----------
function step(dt: number) {
  time += dt;
  let speed = 0;
  if (G.playing) {
    let wx = 0, wz = 0;
    if (G.bot) { const b = botInput(); wx = b.mx; wz = b.mz; }
    else {
      const mx = move.x + (+(keys.has('d') || keys.has('arrowright')) - +(keys.has('a') || keys.has('arrowleft'))), mz = move.z + (+(keys.has('s') || keys.has('arrowdown')) - +(keys.has('w') || keys.has('arrowup')));
      const s = Math.sin(P.yaw), c = Math.cos(P.yaw); wx = mx * c + mz * s; wz = mz * c - mx * s;
    }
    const down = crouchBtn || keys.has('c') || keys.has('control') || keys.has('shift'); P.crouch = THREE.MathUtils.clamp(P.crouch + (down ? 1 : -1) * dt * 7, 0, 1);
    const ml = Math.hypot(wx, wz);
    if (ml > 0.1) { const k = (P.speed * (1 - 0.5 * P.crouch)) / Math.max(ml, 1); P.x += wx * k * dt; P.z += wz * k * dt; speed = Math.min(ml, 1); if ((P.stepT -= dt * speed) <= 0) { P.stepT = 0.42; audio.step(); } }
    collide(P, 0.6);
    if (P.hp < P.maxHp && time - P.lastHurt > F.regenDelay) P.hp = Math.min(P.maxHp, P.hp + F.regenPerSecond * dt); // la vida se recupera si te cubres
    camera.position.set(P.x, eyeY(), P.z); camera.rotation.set(P.pitch, P.yaw, 0); camera.updateMatrixWorld();
    const aim = trace(eyeP.copy(camera.position), aimDir(), Math.max(G.weapon.range * U * 2.5, 18));
    const firing = (locked && mouseFire) || ((TOUCH || G.bot || !locked) && !!aim.e); P.fireCd -= dt;
    if (P.reload > 0) { if ((P.reload -= dt) <= 0) P.mag = G.weapon.mag ?? 30; } else if (firing && P.fireCd <= 0) fire();
    const d = G.director!;
    if (gate >= 0 && (gateT -= dt) <= 0 && !(d instanceof EndlessDirector)) nextGate();
    for (const req of d.update(dt, enemies.filter((e) => e.alive).length)) spawn(req);
    for (const e of enemies) if (e.alive) tickEnemy(e, dt);
    if (convoy && d instanceof MissionDirector) {
      if (convoy.hp > 0) { convoy.t = Math.min(1, convoy.t + (convoy.speed * dt) / Math.hypot(convoy.tx - convoy.fx, convoy.tz - convoy.fz)); convoy.x = convoy.fx + (convoy.tx - convoy.fx) * convoy.t; convoy.z = convoy.fz + (convoy.tz - convoy.fz) * convoy.t; convoy.g.position.set(convoy.x, 0, convoy.z); }
      d.setConvoy(convoy.t, convoy.hp);
    }
    if (d instanceof MissionDirector) terminals.forEach((tm, i) => {
      if (tm.finished || Math.hypot(tm.x - P.x, tm.z - P.z) > tm.r) return;
      d.hackTick(i, dt); audio.hack(); note(t('fps.hacking', { p: Math.round(d.hackProgress[i] * 100) }), 0.4);
      if (d.hackProgress[i] >= 1) { tm.finished = true; tm.done(); audio.coin(); }
    });
    if (d.status !== 'running') end(d.status === 'won');
  } else if (!G.paused) P.yaw += dt * 0.04; // cámara lenta en menús
  P.bob += dt * speed * 9; P.recoil = Math.max(0, P.recoil - dt * 9); shake = Math.max(0, shake - dt);
  const dead = G.ended && P.hp <= 0;
  camera.position.set(P.x + rnd(-1, 1) * shake * 0.12, eyeY() + Math.sin(P.bob * 2) * 0.035 * speed - (dead ? 1.2 : 0), P.z + rnd(-1, 1) * shake * 0.12);
  camera.rotation.set(P.pitch + P.recoil * 0.012, P.yaw, dead ? 0.6 : 0);
  const rl = P.reload > 0 ? Math.sin((P.reload / 1.5) * Math.PI) : 0;
  view.position.set(0.17 + Math.cos(P.bob) * 0.012 * speed, -0.16 + Math.abs(Math.sin(P.bob)) * 0.014 * speed - rl * 0.28, -0.27 + P.recoil * 0.05); view.rotation.set(P.recoil * 0.06 - rl * 0.7, 0.02, 0);
  if (flash.visible && P.recoil < 0.6) flash.visible = false; muzzle.intensity *= Math.pow(0.0004, dt);
  for (const tr of tracers) if (tr.m.visible && (tr.life -= dt) <= 0) tr.m.visible = false;
  for (const b of beams) if (b.m.visible) { b.life -= dt; b.m.scale.set(b.life * 1.6, 1, b.life * 1.6); if (b.life <= 0) b.m.visible = false; }
  for (const b of bolts) if (b.m.visible) {
    b.m.position.addScaledVector(b.v, dt); const p = b.m.position;
    if ((b.life -= dt) <= 0 || Math.abs(p.x) > L.hw + 2 || Math.abs(p.z) > L.hd + 2) b.m.visible = false;
    else if (G.playing && Math.hypot(p.x - P.x, p.z - P.z) < 0.5 && p.y > 0.2 && p.y < 1.9 - 0.7 * P.crouch) { b.m.visible = false; hurt(b.dmg); }
    else if (convoy && convoy.hp > 0 && Math.abs(p.x - convoy.x) < 4 && Math.abs(p.z - convoy.z) < 1.6 && p.y < 3) { b.m.visible = false; hurtConvoy(b.dmg); }
    else for (const c of L.colliders) if (Math.abs(p.x - c.x) < c.hw && Math.abs(p.z - c.z) < c.hd && p.y < c.h) { b.m.visible = false; burst(p.x, p.y, p.z, 5, 2); break; }
  }
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i]; d.life -= dt; d.v.y -= 16 * dt; d.m.position.addScaledVector(d.v, dt);
    if (d.m.position.y < 0.06) { d.m.position.y = 0.06; d.v.set(d.v.x * 0.5, -d.v.y * 0.3, d.v.z * 0.5); d.w.multiplyScalar(0.5); }
    d.m.rotation.x += d.w.x * dt; d.m.rotation.z += d.w.z * dt; if (d.life <= 0) { scene.remove(d.m); debris.splice(i, 1); }
  }
  for (let i = 0; i < SP; i++) if (spLife[i] > 0) { const k = i * 3; spLife[i] -= dt; spVel[k + 1] -= 12 * dt; spPos[k] += spVel[k] * dt; spPos[k + 1] += spVel[k + 1] * dt; spPos[k + 2] += spVel[k + 2] * dt; if (spLife[i] <= 0) spPos[k + 1] = -99; }
  for (let i = 0; i < emberPos.length; i += 3) { emberPos[i] += dt * 0.5; emberPos[i + 1] += dt * 0.45; if (emberPos[i + 1] > 10) { emberPos[i] = P.x + rnd(-30, 30); emberPos[i + 1] = 0; emberPos[i + 2] = P.z + rnd(-30, 30); } }
  if (noteT > 0 && (noteT -= dt) <= 0) $('note').textContent = '';
}
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (G.bot) for (let i = 0; i < G.speed; i++) step(0.033); else step(dt);
  sparks.geometry.attributes.position.needsUpdate = true; embers.geometry.attributes.position.needsUpdate = true;
  L.fires.forEach((l, i) => { l.intensity = 30 + Math.sin(time * 13 + i * 2) * 7 + Math.random() * 6; L.flames[i].scale.set(1, 0.85 + Math.random() * 0.4, 1); });
  sky.position.set(P.x, 0, P.z); moon.position.set(P.x - 24, 46, P.z + 18); moon.target.position.set(P.x, 0, P.z);
  $('hurt').style.opacity = String(Math.max(0, parseFloat($('hurt').style.opacity || '0') - dt * 2.2));
  if (G.director && !G.ended && (hudT -= dt) <= 0) { hudT = 0.1; drawHud(); }
  composer.render();
}
buildLevel(G.arena.w, G.arena.h, 'menu', hex(G.arena.tint), []); // escenario de fondo del menú
mainMenu();
(window as unknown as { __FPS: object }).__FPS = { G, P, enemies, start };
frame();
