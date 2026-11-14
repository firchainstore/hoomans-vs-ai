import type { SaveData } from './types';

export interface KeyValueStorage { getItem(k: string): string | null; setItem(k: string, v: string): void }
export const SAVE_VERSION = 1;

export function defaultSave(lang = 'es'): SaveData {
  return {
    v: SAVE_VERSION, coins: 0, upgrades: {}, weapons: ['blaster'], equipped: 'blaster',
    skins: ['default'], skin: 'default', completed: [], bestWave: 0, bestScore: 0,
    settings: { lang, sound: true }, purchases: { removeAds: false, owned: [] },
  };
}

/**
 * Guardado local (localStorage; en Android persiste dentro del WebView de Capacitor).
 * Tolerante a datos corruptos o de versiones viejas: mezcla con los valores por defecto.
 * Al cambiar el formato: subir SAVE_VERSION y añadir la migración en load().
 */
export class SaveManager {
  data: SaveData;
  constructor(private storage: KeyValueStorage, private key: string, private lang = 'es') {
    this.data = this.load();
  }

  private load(): SaveData {
    const base = defaultSave(this.lang);
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return base;
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return base;
      return {
        ...base, ...parsed, v: SAVE_VERSION,
        settings: { ...base.settings, ...parsed.settings },
        purchases: { ...base.purchases, ...parsed.purchases },
      };
    } catch {
      return base;
    }
  }

  save() {
    try { this.storage.setItem(this.key, JSON.stringify(this.data)); } catch { /* almacenamiento lleno o bloqueado */ }
  }

  reset() {
    const { settings, purchases } = this.data;
    this.data = { ...defaultSave(this.lang), settings, purchases };
    this.save();
  }
}
