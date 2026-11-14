import type { Director, HudInfo, MissionDef, RunStatus, SpawnRequest } from './types';

/**
 * Máquina de estados de una misión: decide CUÁNDO generar enemigos y CUÁNDO se gana o pierde.
 * Lógica pura (sin Phaser) para poder probarla. La escena le informa de lo que pasa en el mundo
 * (bajas, progreso de hackeo, estado del convoy) y ejecuta los SpawnRequest que devuelve.
 */
export class MissionDirector implements Director {
  status: RunStatus = 'running';
  elapsed = 0;
  hackProgress: number[] = [];
  convoyProgress = 0;
  convoyHp = 1;
  private nextAt: number[];
  private bossKilled = false;

  constructor(readonly def: MissionDef) {
    this.nextAt = def.spawns.map((s) => s.at);
    if (def.objective.type === 'hack') this.hackProgress = def.objective.terminals.map(() => 0);
  }

  update(dt: number, alive: number): SpawnRequest[] {
    if (this.status !== 'running') return [];
    this.elapsed += dt;
    const out: SpawnRequest[] = [];
    this.def.spawns.forEach((s, i) => {
      while (this.nextAt[i] <= this.elapsed) {
        out.push({ enemy: s.enemy, count: s.count, where: s.where ?? 'ring' });
        const next = s.every ? this.nextAt[i] + s.every : Infinity;
        this.nextAt[i] = s.until !== undefined && next > s.until ? Infinity : next;
      }
    });
    this.checkWin(alive + out.reduce((n, r) => n + r.count, 0));
    return out;
  }

  private checkWin(alive: number) {
    const o = this.def.objective;
    let won = false;
    if (o.type === 'eliminate') won = alive === 0 && this.nextAt.every((t) => t === Infinity);
    else if (o.type === 'survive') won = this.elapsed >= o.seconds;
    else if (o.type === 'defend') won = this.convoyProgress >= 1;
    else if (o.type === 'hack') won = this.hackProgress.every((p) => p >= 1);
    else if (o.type === 'boss') won = this.bossKilled;
    if (won) this.status = 'won';
  }

  onEnemyKilled(enemyId: string) {
    const o = this.def.objective;
    if (o.type === 'boss' && o.enemy === enemyId) this.bossKilled = true;
  }

  /** El jugador está dentro del radio del terminal i durante dt segundos. */
  hackTick(i: number, dt: number) {
    const o = this.def.objective;
    if (o.type !== 'hack' || this.hackProgress[i] >= 1) return;
    this.hackProgress[i] = Math.min(1, this.hackProgress[i] + dt / o.secondsEach);
  }

  /** progress 0..1 del recorrido; hp actual del convoy. */
  setConvoy(progress: number, hp: number) {
    this.convoyProgress = progress;
    this.convoyHp = hp;
    if (hp <= 0) this.fail();
  }

  fail() { if (this.status === 'running') this.status = 'lost'; }
  /** Continuar tras morir (anuncio con recompensa). */
  resume() { if (this.status === 'lost' && this.convoyHp > 0) this.status = 'running'; }

  hud(): HudInfo {
    const o = this.def.objective;
    switch (o.type) {
      case 'eliminate': return { key: 'hud.eliminate' };
      case 'survive': return { key: 'hud.survive', params: { s: Math.max(0, Math.ceil(o.seconds - this.elapsed)) } };
      case 'defend': return { key: 'hud.defend', params: { p: Math.floor(this.convoyProgress * 100) } };
      case 'hack': return { key: 'hud.hack', params: { n: this.hackProgress.filter((p) => p >= 1).length, t: o.terminals.length } };
      case 'boss': return { key: 'hud.boss' };
    }
  }
}
