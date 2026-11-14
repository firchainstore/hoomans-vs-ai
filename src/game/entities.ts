import Phaser from 'phaser';
import type { EnemyDef } from '../core/types';
import { PAD } from './textures';

/** Lo que un enemigo necesita saber del mundo. Lo implementa GameScene. */
export interface World {
  player: Phaser.GameObjects.Components.Transform;
  convoy?: Phaser.GameObjects.Image;
  enemyFire(x: number, y: number, angle: number, speed: number, damage: number): void;
  summon(enemyId: string, count: number, x: number, y: number): void;
}

/** Bala reutilizable (pool): nunca se destruye, se desactiva con kill(). */
export class Bullet extends Phaser.Physics.Arcade.Image {
  damage = 0; life = 0; pierce = 0;
  readonly hits: Enemy[] = [];

  fire(x: number, y: number, angle: number, speed: number, damage: number, life: number, pierce = 0, tint = 0xffffff) {
    this.enableBody(true, x, y, true, true);
    this.setRotation(angle).setTint(tint);
    this.scene.physics.velocityFromRotation(angle, speed, this.body!.velocity);
    this.damage = damage; this.life = life; this.pierce = pierce; this.hits.length = 0;
  }
  update(_t: number, delta: number) {
    this.life -= delta / 1000;
    if (this.life <= 0) this.kill();
  }
  kill() { this.disableBody(true, true); }
}

/** Enemigo reutilizable (pool). Todo su comportamiento sale de EnemyDef (enemies.json). */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  def!: EnemyDef;
  hp = 0; maxHp = 0;
  targetConvoy = false;
  touchCd = 0;
  private cds: number[] = [];
  private dashCd = 0; private dashT = 0; private summonCd = 0; private flashT = 0; private spin = 0;

  spawn(def: EnemyDef, x: number, y: number, hpMult: number, targetConvoy: boolean) {
    this.def = def;
    this.setTexture(`enemy_${def.id}`);
    this.enableBody(true, x, y, true, true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(def.radius, PAD, PAD);
    body.setImmovable(def.speed === 0);
    body.pushable = def.speed !== 0 && !def.boss;
    this.hp = this.maxHp = def.hp * hpMult;
    this.targetConvoy = targetConvoy;
    this.cds = (def.attacks ?? []).map((a) => a.cooldown * (0.6 + Math.random() * 0.6));
    this.dashCd = def.dash?.cooldown ?? 0;
    this.summonCd = def.summon?.cooldown ?? 0;
    this.dashT = this.flashT = this.touchCd = 0;
    this.clearTint().setAlpha(0).setDepth(def.boss ? 4 : 5);
  }

  get enraged() { return this.def.enrageAt !== undefined && this.hp < this.maxHp * this.def.enrageAt; }

  flash() { this.setTintFill(0xffffff); this.flashT = 0.06; }

  tick(dt: number, w: World) {
    const def = this.def, body = this.body as Phaser.Physics.Arcade.Body;
    if (this.alpha < 1) this.alpha = Math.min(1, this.alpha + dt * 3); // aparición gradual = aviso al jugador
    const tgt = this.targetConvoy && w.convoy?.active ? w.convoy : w.player;
    const dx = tgt.x - this.x, dy = tgt.y - this.y;
    const dist = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx);
    const rage = this.enraged ? 1.6 : 1;
    this.touchCd -= dt;
    if (this.flashT > 0 && (this.flashT -= dt) <= 0) { if (rage > 1) this.setTint(0xff9090); else this.clearTint(); }

    if (this.dashT > 0) this.dashT -= dt;
    else {
      let dir = 1;
      if (def.behavior === 'shooter') { const r = def.range ?? 250; dir = dist < r * 0.55 ? -0.6 : dist < r * 0.85 ? 0 : 1; }
      if (dist < def.radius + 8) dir = 0; // no encimarse sobre el objetivo
      const sp = def.behavior === 'turret' ? 0 : def.speed * (rage > 1 ? 1.25 : 1) * dir;
      body.setVelocity((dx / dist) * sp, (dy / dist) * sp);
      if (def.dash && (this.dashCd -= dt) <= 0 && dist < 520) {
        this.dashCd = def.dash.cooldown / rage; this.dashT = def.dash.duration;
        body.setVelocity((dx / dist) * def.dash.speed, (dy / dist) * def.dash.speed);
      }
    }
    if (def.shape === 'core') this.rotation += dt * 0.6; else this.rotation = ang;

    if (def.attacks && this.alpha >= 1 && dist <= (def.range ?? 9999) * 1.15) {
      for (let i = 0; i < def.attacks.length; i++) {
        if ((this.cds[i] -= dt * rage) > 0) continue;
        const a = def.attacks[i];
        this.cds[i] = a.cooldown;
        const spread = Phaser.Math.DegToRad(a.spreadDeg);
        if (a.pattern === 'radial') { this.spin += 0.23; }
        for (let k = 0; k < a.count; k++) {
          const angle = a.pattern === 'radial' ? this.spin + (k * Math.PI * 2) / a.count
            : ang + (a.count > 1 ? (k / (a.count - 1) - 0.5) * spread : 0);
          w.enemyFire(this.x, this.y, angle, a.bulletSpeed, a.damage);
        }
      }
    }
    if (def.summon && (this.summonCd -= dt * rage) <= 0) {
      this.summonCd = def.summon.cooldown;
      w.summon(def.summon.enemy, def.summon.count, this.x, this.y);
    }
  }
}
