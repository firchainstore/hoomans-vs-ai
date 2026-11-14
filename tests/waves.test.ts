import { describe, expect, it } from 'vitest';
import { EndlessDirector, generateWave } from '../src/core/WaveGenerator';
import { BALANCE, ENEMIES, enemyDef } from '../src/core/data';
import { seeded } from './helpers';

const cost = (groups: { enemy: string; count: number }[]) =>
  groups.reduce((n, g) => n + (enemyDef(g.enemy).boss ? 0 : enemyDef(g.enemy).cost! * g.count), 0);

describe('generateWave', () => {
  it('es determinista con la misma semilla', () => {
    expect(generateWave(7, ENEMIES, seeded(1))).toEqual(generateWave(7, ENEMIES, seeded(1)));
  });
  it('respeta minWave y el presupuesto crece con la oleada', () => {
    expect(generateWave(1, ENEMIES, seeded(2)).every((g) => g.enemy === 'drone')).toBe(true);
    for (let n = 1; n <= 30; n++) {
      const g = generateWave(n, ENEMIES, seeded(n));
      expect(g.length).toBeGreaterThan(0);
      expect(cost(g)).toBeLessThanOrEqual(5 + n * 3);
      for (const x of g) if (!enemyDef(x.enemy).boss) expect(enemyDef(x.enemy).minWave ?? 1).toBeLessThanOrEqual(n);
    }
    expect(cost(generateWave(20, ENEMIES, seeded(3)))).toBeGreaterThan(cost(generateWave(2, ENEMIES, seeded(3))));
  });
  it('añade un jefe móvil cada N oleadas', () => {
    expect(generateWave(10, ENEMIES, seeded(4)).some((g) => enemyDef(g.enemy).boss)).toBe(true);
    expect(generateWave(9, ENEMIES, seeded(4)).some((g) => enemyDef(g.enemy).boss)).toBe(false);
  });
});

describe('EndlessDirector', () => {
  it('encadena oleadas solo cuando no quedan enemigos y suma puntuación', () => {
    const d = new EndlessDirector(ENEMIES, BALANCE.endless, seeded(5));
    let spawned = [] as ReturnType<typeof d.update>;
    for (let i = 0; i < 30 && !spawned.length; i++) spawned = d.update(0.1, 0);
    expect(d.wave).toBe(1);
    expect(spawned.length).toBeGreaterThan(0);
    for (let i = 0; i < 100; i++) expect(d.update(0.1, 4)).toHaveLength(0);
    expect(d.wave).toBe(1);
    d.onEnemyKilled('drone');
    expect(d.score).toBe(10);
    for (let i = 0; i < 40 && d.wave < 2; i++) d.update(0.1, 0);
    expect(d.wave).toBe(2);
    expect(d.score).toBe(60);
    d.fail();
    expect(d.update(0.1, 0)).toHaveLength(0);
    expect(d.status).toBe('lost');
  });
});
