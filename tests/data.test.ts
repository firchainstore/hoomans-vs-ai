import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CAMPAIGNS, ENEMIES, MISSIONS, PRODUCTS, SKINS, UPGRADES, WEAPONS } from '../src/core/data';
import { LANGS } from '../src/i18n/i18n';
import cfg from '../src/config/game.config.json';

const ids = (l: { id: string }[]) => l.map((x) => x.id);
const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const sources = walk('src').filter((f) => f.endsWith('.ts')).map((f) => [f, readFileSync(f, 'utf8')] as const);

describe('integridad de datos', () => {
  it('ids únicos', () => {
    for (const list of [ENEMIES, WEAPONS, UPGRADES, MISSIONS, CAMPAIGNS, SKINS, PRODUCTS]) {
      expect(new Set(ids(list)).size).toBe(list.length);
    }
  });
  it('las misiones referencian enemigos y campañas existentes, dentro de la arena', () => {
    for (const m of MISSIONS) {
      expect(ids(CAMPAIGNS)).toContain(m.campaign);
      for (const s of m.spawns) {
        expect(ids(ENEMIES), `${m.id}: ${s.enemy}`).toContain(s.enemy);
        if (typeof s.where === 'object') {
          expect(s.where.x).toBeLessThan(m.arena.w);
          expect(s.where.y).toBeLessThan(m.arena.h);
        }
      }
      if (m.objective.type === 'boss') expect(m.spawns.some((s) => m.objective.type === 'boss' && s.enemy === m.objective.enemy)).toBe(true);
    }
    for (const c of CAMPAIGNS) for (const id of c.missions) expect(ids(MISSIONS)).toContain(id);
  });
  it('summon y productos referencian ids válidos', () => {
    for (const e of ENEMIES) if (e.summon) expect(ids(ENEMIES)).toContain(e.summon.enemy);
    for (const p of PRODUCTS) {
      for (const w of p.grants.weapons ?? []) expect(ids(WEAPONS)).toContain(w);
      for (const s of p.grants.skins ?? []) expect(ids(SKINS)).toContain(s);
    }
  });
  it('sin nombres prohibidos (marcas ajenas / "Doom")', () => {
    const banned = /skynet|t-?800|terminator|matrix|doom|neo\b|morpheus|red pill|p[ií]ldora roja/i;
    const text = JSON.stringify([LANGS, ENEMIES, WEAPONS, MISSIONS, CAMPAIGNS, cfg]);
    expect(text).not.toMatch(banned);
  });
});

describe('traducciones', () => {
  const es = Object.keys(LANGS.es).sort();
  it('es y en tienen exactamente las mismas claves, sin textos vacíos', () => {
    expect(Object.keys(LANGS.en).sort()).toEqual(es);
    for (const lang of Object.values(LANGS)) for (const v of Object.values(lang)) expect(v.trim()).not.toBe('');
  });
  it('toda clave usada en los datos existe', () => {
    const used = [ENEMIES, WEAPONS, UPGRADES, MISSIONS, CAMPAIGNS, SKINS, PRODUCTS]
      .flatMap((l) => JSON.stringify(l).match(/"(?:\w+Key|key)":"[^"]+"/g) ?? [])
      .map((s) => s.split('":"')[1].slice(0, -1));
    expect(used.length).toBeGreaterThan(30);
    for (const k of used) expect(es, k).toContain(k);
  });
  it("toda clave literal t('...') usada en el código existe", () => {
    for (const [file, code] of sources) {
      for (const m of code.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)) expect(es, `${file}: ${m[1]}`).toContain(m[1]);
    }
  });
  it('el nombre del juego solo vive en game.config.json', () => {
    for (const [file, code] of sources) expect(code.includes(cfg.name), file).toBe(false);
    for (const lang of Object.values(LANGS)) expect(JSON.stringify(lang).includes(cfg.name)).toBe(false);
  });
});
