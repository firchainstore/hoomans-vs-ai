import Phaser from 'phaser';
import { BALANCE, ENEMIES, enemyDef, hex, missionDef, skinDef, weaponDef } from '../core/data';
import { playerStats, type PlayerStats } from '../core/Economy';
import { MissionDirector } from '../core/MissionDirector';
import { EndlessDirector } from '../core/WaveGenerator';
import type { Director, MissionDef, SpawnRequest, SpawnWhere, WeaponDef } from '../core/types';
import { UPGRADES } from '../core/data';
import { Bullet, Enemy, type World } from '../game/entities';
import { sfx } from '../game/Sfx';
import { Sticks } from '../game/Sticks';
import { addAtmosphere, decorateArena } from '../game/atmosphere';
import { PAD, SPRITE_SCALE as K } from '../game/textures';
import { t } from '../i18n/i18n';
import { saves } from '../services';
import { COLORS, TEXT, button, label } from './ui';

export interface GameData { mode: 'mission' | 'endless'; missionId?: string }
export interface ResultData extends GameData { won: boolean; coins: number; canContinue: boolean; wave: number; score: number }

/** Escena de juego: única para todas las misiones y el modo Oleadas. Lo que cambia son los datos. */
export class GameScene extends Phaser.Scene implements World {
  player!: Phaser.Physics.Arcade.Sprite;
  convoy?: Phaser.Physics.Arcade.Image;
  director!: Director;
  private cfg!: GameData;
  private mission?: MissionDef;
  private arena!: { w: number; h: number };
  private stats!: PlayerStats;
  private weapon!: WeaponDef;
  private hp = 0; private invuln = 0; private fireCd = 0;
  private coins = 0; private ended = false; private continued = false;
  private enemies!: Phaser.Physics.Arcade.Group;
  private pBullets!: Phaser.Physics.Arcade.Group;
  private eBullets!: Phaser.Physics.Arcade.Group;
  private heals!: Phaser.Physics.Arcade.Group;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private flashes!: Phaser.GameObjects.Particles.ParticleEmitter;
  private light!: Phaser.GameObjects.Image;
  private muzzle!: Phaser.GameObjects.Image;
  private scorches: Phaser.GameObjects.Image[] = [];
  private scorchI = 0; private muzzleT = 0;
  private sticks!: Sticks;
  private boss?: Enemy;
  private convoyHp = 0; private convoyMax = 0; private convoyT = 0;
  private terminals: Phaser.GameObjects.Image[] = [];
  private hackGfx?: Phaser.GameObjects.Graphics;
  // HUD
  private hpFill!: Phaser.GameObjects.Rectangle;
  private coinText!: Phaser.GameObjects.Text;
  private objText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private topBar!: Phaser.GameObjects.Container;
  private topFill!: Phaser.GameObjects.Rectangle;
  private topLabel!: Phaser.GameObjects.Text;
  private arrow!: Phaser.GameObjects.Image;
  private hudT = 0; private hintIdx = 0; private hintT = 0;

  constructor() { super('Game'); }
  init(data: GameData) { this.cfg = data; }

  create() {
    const save = saves.data;
    this.mission = this.cfg.mode === 'mission' ? missionDef(this.cfg.missionId!) : undefined;
    const arena = this.mission?.arena ?? BALANCE.endless.arena;
    this.arena = arena;
    this.director = this.mission ? new MissionDirector(this.mission) : new EndlessDirector(ENEMIES, BALANCE.endless);
    this.stats = playerStats(save, UPGRADES, BALANCE.player);
    this.weapon = weaponDef(save.equipped);
    this.hp = this.stats.maxHp;
    this.invuln = this.fireCd = this.coins = this.hudT = this.hintIdx = this.hintT = this.convoyT = 0;
    this.ended = this.continued = false;
    this.boss = undefined; this.convoy = undefined; this.terminals = []; this.hackGfx = undefined;

    this.physics.world.setBounds(0, 0, arena.w, arena.h);
    decorateArena(this, arena.w, arena.h, this.mission?.id ?? 'endless', hex(arena.tint));
    addAtmosphere(this);

    const start = this.mission?.playerStart ?? { x: arena.w / 2, y: arena.h / 2 };
    this.player = this.physics.add.sprite(start.x, start.y, `player_${skinDef(save.skin).id}`).setDepth(6);
    this.light = this.add.image(start.x, start.y, 'light').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.16).setTint(0xffe2b8).setDepth(1.5);
    this.muzzle = this.add.image(0, 0, 'flash').setBlendMode(Phaser.BlendModes.ADD).setScale(0.45).setDepth(7).setVisible(false);
    this.scorches = Array.from({ length: 36 }, () => this.add.image(0, 0, 'scorch').setDepth(0.8).setVisible(false));
    this.scorchI = 0;
    (this.player.body as Phaser.Physics.Arcade.Body).setCircle(BALANCE.player.radius * K, PAD * K, PAD * K).setCollideWorldBounds(true);
    this.cameras.main.setBounds(0, 0, arena.w, arena.h).startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.fadeIn(250);

    // Pools: nada se crea ni destruye durante la partida más allá de estos máximos.
    this.enemies = this.physics.add.group({ classType: Enemy, maxSize: BALANCE.maxEnemiesAlive + 8 });
    this.pBullets = this.physics.add.group({ classType: Bullet, maxSize: 90, runChildUpdate: true, defaultKey: 'bullet_p' });
    this.eBullets = this.physics.add.group({ classType: Bullet, maxSize: 140, runChildUpdate: true, defaultKey: 'bullet_e' });
    this.heals = this.physics.add.group({ maxSize: 8, defaultKey: 'heal' });
    this.sparks = this.add.particles(0, 0, 'particle', {
      speed: { min: 60, max: 260 }, lifespan: 420, scale: { start: 0.9, end: 0 }, emitting: false, blendMode: 'ADD',
    }).setDepth(8);
    this.flashes = this.add.particles(0, 0, 'flash', {
      speed: 0, lifespan: 260, scale: { start: 0.5, end: 1.7 }, alpha: { start: 0.9, end: 0 }, emitting: false, blendMode: 'ADD',
    }).setDepth(8);

    this.setupObjective();
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.pBullets, this.enemies, (b, e) => this.bulletHitsEnemy(b as Bullet, e as Enemy));
    this.physics.add.overlap(this.player, this.eBullets, (_p, b) => { (b as Bullet).kill(); this.hurtPlayer((b as Bullet).damage); });
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => {
      const en = e as Enemy;
      if (en.def.contactDamage && en.alpha >= 1) this.hurtPlayer(en.def.contactDamage);
    });
    this.physics.add.overlap(this.player, this.heals, (_p, h) => {
      (h as Phaser.Physics.Arcade.Image).disableBody(true, true);
      this.hp = Math.min(this.stats.maxHp, this.hp + BALANCE.healDrop.amount);
      sfx.play('pickup'); this.refreshHp();
    });

    this.buildHud();
    this.sticks = new Sticks(this);
    this.events.on('resume', () => this.sticks.reset());
    const onHidden = () => this.pauseGame();
    this.game.events.on('hidden', onHidden);
    this.events.once('shutdown', () => { this.game.events.off('hidden', onHidden); this.events.off('resume'); });
  }

  // ---------- Objetivos ----------
  private setupObjective() {
    const o = this.mission?.objective;
    if (o?.type === 'defend') {
      const c = o.convoy;
      this.convoy = this.physics.add.image(c.from.x, c.from.y, 'convoy').setDepth(3);
      (this.convoy.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      this.convoyHp = this.convoyMax = c.hp;
      this.physics.add.overlap(this.convoy, this.enemies, (_c, e) => {
        const en = e as Enemy;
        if (en.touchCd <= 0) { en.touchCd = 1; this.hurtConvoy(en.def.contactDamage || 6); }
      });
      this.physics.add.overlap(this.convoy, this.eBullets, (_c, b) => { (b as Bullet).kill(); this.hurtConvoy((b as Bullet).damage); });
    } else if (o?.type === 'hack') {
      this.hackGfx = this.add.graphics().setDepth(2);
      for (const p of o.terminals) {
        this.add.circle(p.x, p.y, o.radius).setStrokeStyle(2, COLORS.accent, 0.35).setDepth(1);
        this.terminals.push(this.add.image(p.x, p.y, 'terminal').setTint(COLORS.machine).setDepth(2));
        this.add.image(p.x, p.y, 'light').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.12).setTint(COLORS.machine).setScale(0.6).setDepth(1.5);
      }
    }
  }

  private hurtConvoy(dmg: number) {
    if (this.ended || !this.convoy) return;
    this.convoyHp = Math.max(0, this.convoyHp - dmg);
    this.convoy.setTintFill(0xffffff);
    this.time.delayedCall(60, () => this.convoy?.clearTint());
    if (this.convoyHp <= 0) { this.explode(this.convoy.x, this.convoy.y, COLORS.accent, 30); this.convoy.setVisible(false); }
  }

  private updateObjective(dt: number) {
    const d = this.director, o = this.mission?.objective;
    if (!(d instanceof MissionDirector) || !o) return;
    if (o.type === 'defend' && this.convoy) {
      const { from, to, speed } = o.convoy;
      this.convoyT = Math.min(1, this.convoyT + (speed * dt) / Math.hypot(to.x - from.x, to.y - from.y));
      this.convoy.setPosition(from.x + (to.x - from.x) * this.convoyT, from.y + (to.y - from.y) * this.convoyT);
      d.setConvoy(this.convoyT, this.convoyHp);
    } else if (o.type === 'hack') {
      for (let i = 0; i < o.terminals.length; i++) {
        const p = o.terminals[i];
        if (d.hackProgress[i] >= 1 || Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y) > o.radius) continue;
        d.hackTick(i, dt);
        this.hackGfx!.clear().lineStyle(6, COLORS.accent)
          .beginPath().arc(p.x, p.y, 46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * d.hackProgress[i]).strokePath();
        if (d.hackProgress[i] >= 1) { this.terminals[i].setTint(COLORS.accent); this.hackGfx!.clear(); sfx.play('pickup'); }
      }
    }
  }

  // ---------- Generación de enemigos ----------
  private spawnPoint(where: SpawnWhere, out: Phaser.Math.Vector2) {
    if (typeof where === 'object') return out.set(where.x, where.y);
    const anchor = where === 'objective' && this.convoy ? this.convoy : this.player;
    for (let tries = 0; tries < 6; tries++) {
      const a = Math.random() * Math.PI * 2, r = 520 + Math.random() * 130;
      out.set(Phaser.Math.Clamp(anchor.x + Math.cos(a) * r, 40, this.arena.w - 40), Phaser.Math.Clamp(anchor.y + Math.sin(a) * r, 40, this.arena.h - 40));
      if (Phaser.Math.Distance.Between(out.x, out.y, this.player.x, this.player.y) > 300) break;
    }
    return out;
  }

  private tmp = new Phaser.Math.Vector2();
  private spawn(req: SpawnRequest) {
    const def = enemyDef(req.enemy);
    for (let i = 0; i < req.count; i++) {
      if (!def.boss && this.enemies.countActive(true) >= BALANCE.maxEnemiesAlive) return;
      const p = this.spawnPoint(req.where, this.tmp);
      const e = this.enemies.get(p.x, p.y, `enemy_${def.id}`) as Enemy | null;
      if (!e) return;
      e.spawn(def, p.x, p.y, req.hpMult ?? 1, !!this.convoy && !def.boss && Math.random() < 0.45);
      if (def.boss) { this.boss = e; this.cameras.main.shake(300, 0.008); }
    }
  }

  summon(enemyId: string, count: number, x: number, y: number) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn({ enemy: enemyId, count: 1, where: { x: Phaser.Math.Clamp(x + Math.cos(a) * 110, 40, this.arena.w - 40), y: Phaser.Math.Clamp(y + Math.sin(a) * 110, 40, this.arena.h - 40) } });
    }
  }

  // ---------- Combate ----------
  enemyFire(x: number, y: number, angle: number, speed: number, damage: number) {
    const b = this.eBullets.get(x, y) as Bullet | null;
    b?.fire(x, y, angle, speed, damage, 3.2);
    b?.setDepth(7).setBlendMode(Phaser.BlendModes.ADD).setScale(1.3);
  }

  private firePlayer() {
    const w = this.weapon, ang = this.sticks.aim.angle();
    this.fireCd = 1 / w.fireRate;
    // Las balas nacen en el centro del jugador: así también alcanzan a enemigos pegados a él.
    const mx = this.player.x, my = this.player.y;
    for (let i = 0; i < w.pellets; i++) {
      const b = this.pBullets.get(mx, my) as Bullet | null;
      if (!b) break;
      const off = Phaser.Math.DegToRad((Math.random() - 0.5) * w.spreadDeg);
      b.fire(mx, my, ang + off, w.bulletSpeed, w.damage * this.stats.damageMult, w.range / w.bulletSpeed, w.pierce, hex(w.color));
      b.setDepth(7).setBlendMode(Phaser.BlendModes.ADD).setScale(1.3);
    }
    this.muzzle.setPosition(mx + Math.cos(ang) * 34, my + Math.sin(ang) * 34).setTint(hex(w.color)).setVisible(true);
    this.muzzleT = 0.05;
    sfx.play('shoot');
  }

  private bulletHitsEnemy(b: Bullet, e: Enemy) {
    if (!b.active || !e.active || b.hits.includes(e)) return;
    if (b.pierce > 0) { b.pierce--; b.hits.push(e); } else b.kill();
    e.hp -= b.damage;
    e.flash();
    if (e.hp > 0) { sfx.play('hit'); return; }
    const def = e.def;
    this.explode(e.x, e.y, hex(def.color), def.boss ? 40 : 8);
    this.scorches[this.scorchI++ % this.scorches.length].setPosition(e.x, e.y).setRotation(Math.random() * 6.28).setScale(def.radius / 14).setVisible(true);
    if (def.boss) { this.cameras.main.shake(400, 0.012); if (this.boss === e) this.boss = undefined; }
    this.coins += def.coins;
    this.coinText.setText(`◆ ${this.coins}`);
    if (Math.random() < BALANCE.healDrop.chance) {
      const h = this.heals.get(e.x, e.y) as Phaser.Physics.Arcade.Image | null;
      h?.enableBody(true, e.x, e.y, true, true).setDepth(2);
    }
    e.disableBody(true, true);
    this.director.onEnemyKilled(def.id);
    sfx.play('boom');
  }

  private explode(x: number, y: number, tint: number, n: number) {
    this.sparks.setParticleTint(tint);
    this.sparks.explode(n, x, y);
    this.flashes.setParticleTint(tint);
    this.flashes.explode(n > 20 ? 4 : 1, x, y);
  }

  private hurtPlayer(dmg: number) {
    if (this.invuln > 0 || this.ended) return;
    this.hp -= dmg;
    this.invuln = BALANCE.player.invulnSeconds;
    this.cameras.main.shake(90, 0.006);
    this.cameras.main.flash(140, 255, 40, 70);
    sfx.play('hurt');
    this.refreshHp();
    if (this.hp <= 0) { this.explode(this.player.x, this.player.y, COLORS.accent, 20); this.director.fail(); }
  }

  /** Continuar tras morir (lo llama ResultScene después del anuncio con recompensa). */
  revive() {
    this.hp = Math.round(this.stats.maxHp * BALANCE.continueHpFraction);
    this.invuln = 2.5;
    this.continued = true; this.ended = false;
    this.eBullets.getChildren().forEach((b) => (b as Bullet).active && (b as Bullet).kill());
    this.director.resume();
    this.player.setVisible(true);
    this.physics.resume();
    this.refreshHp();
  }

  // ---------- HUD ----------
  private buildHud() {
    const { width, height } = this.scale;
    const fix = <T extends Phaser.GameObjects.GameObject & { setScrollFactor(n: number): T; setDepth(n: number): T }>(o: T) => o.setScrollFactor(0).setDepth(100);
    fix(this.add.rectangle(16, 16, 204, 20, 0x000000, 0.6).setOrigin(0).setStrokeStyle(2, 0xffffff, 0.4));
    this.hpFill = fix(this.add.rectangle(18, 18, 200, 16, COLORS.accent).setOrigin(0));
    this.coinText = fix(label(this, 18, 52, '◆ 0', 18, TEXT.accent).setOrigin(0, 0.5));
    this.objText = fix(label(this, width / 2, 22, '', 18).setFontStyle('bold'));
    this.hintText = fix(label(this, width / 2, height - 60, '', 20, TEXT.main, width * 0.5)).setAlpha(0);
    this.hintText.setBackgroundColor('rgba(13,11,20,0.7)').setPadding(10, 6, 10, 6);
    const bg = this.add.rectangle(0, 0, 324, 14, 0x000000, 0.6).setStrokeStyle(2, 0xffffff, 0.4);
    this.topFill = this.add.rectangle(-160, 0, 320, 10, COLORS.danger).setOrigin(0, 0.5);
    this.topLabel = label(this, 0, 16, '', 13, TEXT.dim);
    this.topBar = fix(this.add.container(width / 2, 50, [bg, this.topFill, this.topLabel])).setVisible(false);
    this.arrow = fix(this.add.image(0, 0, 'arrow')).setVisible(false);
    fix(button(this, width - 44, 36, 'II', () => this.pauseGame(), { w: 56, h: 44, size: 20 }));
    if (this.mission) {
      const title = fix(label(this, width / 2, height * 0.3, t(this.mission.nameKey), 40, TEXT.accent).setFontStyle('bold'));
      const brief = fix(label(this, width / 2, height * 0.3 + 46, t(this.mission.briefKey), 18, TEXT.main, width * 0.7));
      this.tweens.add({ targets: [title, brief], alpha: 0, delay: 2600, duration: 600, onComplete: () => { title.destroy(); brief.destroy(); } });
    }
  }

  private refreshHp() { this.hpFill.scaleX = Phaser.Math.Clamp(this.hp / this.stats.maxHp, 0, 1); }

  private updateHud(dt: number) {
    const hints = this.mission?.hints;
    if (hints && this.hintIdx < hints.length && this.director.elapsed >= hints[this.hintIdx].at) {
      this.hintText.setText(t(hints[this.hintIdx++].key)).setAlpha(1);
      this.hintT = 5;
    }
    if (this.hintT > 0 && (this.hintT -= dt) <= 0) this.hintText.setAlpha(0);
    if ((this.hudT -= dt) > 0) return;
    this.hudT = 0.2;
    const info = this.director.hud();
    this.objText.setText(t(info.key, info.params));

    let target: { x: number; y: number } | undefined;
    if (this.boss?.active) {
      this.topBar.setVisible(true); this.topFill.setFillStyle(COLORS.danger);
      this.topFill.scaleX = Math.max(0, this.boss.hp / this.boss.maxHp);
      this.topLabel.setText(t(this.boss.def.nameKey));
      target = this.boss;
    } else if (this.convoy) {
      this.topBar.setVisible(true); this.topFill.setFillStyle(COLORS.accent);
      this.topFill.scaleX = this.convoyHp / this.convoyMax;
      this.topLabel.setText(t('hud.convoy'));
      target = this.convoy;
    } else {
      this.topBar.setVisible(false);
      const d = this.director;
      if (d instanceof MissionDirector && this.mission?.objective.type === 'hack') {
        let best = Infinity;
        this.mission.objective.terminals.forEach((p, i) => {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
          if (d.hackProgress[i] < 1 && dist < best) { best = dist; target = p; }
        });
      }
    }
    // Flecha hacia el objetivo cuando está fuera de pantalla.
    const view = this.cameras.main.worldView;
    if (target && !view.contains(target.x, target.y)) {
      const a = Math.atan2(target.y - this.player.y, target.x - this.player.x);
      const { width, height } = this.scale;
      this.arrow.setVisible(true).setRotation(a)
        .setPosition(width / 2 + Math.cos(a) * (width / 2 - 50), height / 2 + Math.sin(a) * (height / 2 - 90));
    } else this.arrow.setVisible(false);
  }

  // ---------- Flujo ----------
  private pauseGame() {
    if (this.ended || !this.scene.isActive()) return;
    this.scene.pause();
    this.scene.launch('Pause', this.cfg);
  }

  private end(won: boolean) {
    this.ended = true;
    this.physics.pause();
    this.sticks.reset();
    if (!won && this.hp <= 0) this.player.setVisible(false);
    sfx.play(won ? 'win' : 'lose');
    const d = this.director;
    const data: ResultData = {
      ...this.cfg, won, coins: this.coins + (won ? this.mission?.reward ?? 0 : 0),
      canContinue: !won && this.hp <= 0 && !this.continued,
      wave: d instanceof EndlessDirector ? d.wave : 0, score: d instanceof EndlessDirector ? d.score : 0,
    };
    this.time.delayedCall(won ? 500 : 800, () => this.scene.launch('Result', data));
  }

  update(_time: number, delta: number) {
    if (this.ended) return;
    const dt = Math.min(delta, 50) / 1000;
    const p = this.player, s = this.sticks;
    s.update(p.x, p.y);
    p.setVelocity(s.move.x * this.stats.speed, s.move.y * this.stats.speed);
    if (s.firing) p.rotation = s.aim.angle();
    else if (s.move.x || s.move.y) p.rotation = s.move.angle();
    this.fireCd -= dt;
    this.light.setPosition(p.x, p.y);
    if (this.muzzleT > 0 && (this.muzzleT -= dt) <= 0) this.muzzle.setVisible(false);
    if (s.firing && this.fireCd <= 0) this.firePlayer();
    if (this.invuln > 0) { this.invuln -= dt; p.setAlpha(this.invuln > 0 ? 0.45 : 1); }

    for (const req of this.director.update(dt, this.enemies.countActive(true))) this.spawn(req);
    const list = this.enemies.getChildren();
    for (let i = 0; i < list.length; i++) { const e = list[i] as Enemy; if (e.active) e.tick(dt, this); }
    this.updateObjective(dt);
    this.updateHud(dt);
    if (this.director.status !== 'running') this.end(this.director.status === 'won');
  }
}
