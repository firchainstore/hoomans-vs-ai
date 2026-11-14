import { describe, expect, it } from 'vitest';
import { MissionDirector } from '../src/core/MissionDirector';
import { MISSIONS, missionDef } from '../src/core/data';
import type { MissionDef } from '../src/core/types';

const base = (over: Partial<MissionDef>): MissionDef => ({
  id: 't', campaign: 'resistance', nameKey: 'n', briefKey: 'b', reward: 1,
  arena: { w: 100, h: 100, tint: '0xffffff' }, objective: { type: 'eliminate' }, spawns: [], ...over,
});
const run = (d: MissionDirector, seconds: number, alive = 0, dt = 0.1) => {
  const out = [];
  for (let t = 0; t < seconds - 1e-9; t += dt) out.push(...d.update(dt, alive));
  return out;
};

describe('MissionDirector', () => {
  it('eliminate: genera según la línea de tiempo y gana al limpiar todo', () => {
    const d = new MissionDirector(base({ spawns: [{ at: 1, enemy: 'drone', count: 3 }, { at: 2, enemy: 'drone', count: 2 }] }));
    expect(run(d, 0.5)).toHaveLength(0);
    expect(d.status).toBe('running');
    const spawned = run(d, 2, 3);
    expect(spawned.map((s) => s.count)).toEqual([3, 2]);
    expect(d.status).toBe('running');
    d.update(0.1, 0);
    expect(d.status).toBe('won');
  });

  it('no gana en el mismo frame en que genera el último grupo', () => {
    const d = new MissionDirector(base({ spawns: [{ at: 0, enemy: 'drone', count: 1 }] }));
    d.update(0.1, 0);
    expect(d.status).toBe('running');
  });

  it('survive: spawns repetidos respetan every/until y gana al cumplirse el tiempo', () => {
    const d = new MissionDirector(base({ objective: { type: 'survive', seconds: 10 }, spawns: [{ at: 0, enemy: 'drone', count: 1, every: 2, until: 6 }] }));
    const spawned = run(d, 9.5, 5);
    expect(spawned).toHaveLength(4); // t = 0, 2, 4, 6
    expect(d.status).toBe('running');
    run(d, 1, 5);
    expect(d.status).toBe('won');
  });

  it('defend: gana cuando el convoy llega y pierde si es destruido', () => {
    const o = { type: 'defend' as const, convoy: { hp: 10, speed: 1, from: { x: 0, y: 0 }, to: { x: 10, y: 0 } } };
    const a = new MissionDirector(base({ objective: o }));
    a.setConvoy(1, 5); a.update(0.1, 3);
    expect(a.status).toBe('won');
    const b = new MissionDirector(base({ objective: o }));
    b.setConvoy(0.5, 0);
    expect(b.status).toBe('lost');
    b.resume();
    expect(b.status).toBe('lost'); // no se puede continuar sin convoy
  });

  it('hack: requiere completar todos los terminales', () => {
    const d = new MissionDirector(base({ objective: { type: 'hack', secondsEach: 2, radius: 50, terminals: [{ x: 0, y: 0 }, { x: 9, y: 9 }] } }));
    d.hackTick(0, 5); d.update(0.1, 0);
    expect(d.status).toBe('running');
    expect(d.hud().params).toEqual({ n: 1, t: 2 });
    d.hackTick(1, 1); d.hackTick(1, 1); d.update(0.1, 0);
    expect(d.status).toBe('won');
  });

  it('boss: solo gana al destruir al jefe; morir y continuar reanuda', () => {
    const d = new MissionDirector(base({ objective: { type: 'boss', enemy: 'core' } }));
    d.onEnemyKilled('drone'); d.update(0.1, 0);
    expect(d.status).toBe('running');
    d.fail(); expect(d.status).toBe('lost');
    d.resume(); expect(d.status).toBe('running');
    d.onEnemyKilled('core'); d.update(0.1, 2);
    expect(d.status).toBe('won');
  });

  it('las 6 misiones reales son ganables en simulación y duran entre 0.5 y 4 minutos', () => {
    expect(MISSIONS.filter((m) => m.campaign === 'resistance')).toHaveLength(6);
    for (const m of MISSIONS) {
      const d = new MissionDirector(missionDef(m.id));
      const o = m.objective;
      let t = 0;
      for (; t < 300 && d.status === 'running'; t += 0.1) {
        if (o.type === 'defend') {
          const dist = Math.hypot(o.convoy.to.x - o.convoy.from.x, o.convoy.to.y - o.convoy.from.y);
          d.setConvoy((t * o.convoy.speed) / dist, o.convoy.hp);
        }
        if (o.type === 'hack') o.terminals.forEach((_, i) => t > 20 * (i + 1) && d.hackTick(i, 0.1));
        if (o.type === 'boss' && t > 90) d.onEnemyKilled(o.enemy);
        d.update(0.1, 0);
      }
      expect(d.status, m.id).toBe('won');
      expect(t, m.id).toBeGreaterThan(30);
      expect(t, m.id).toBeLessThanOrEqual(240);
    }
  });
});
