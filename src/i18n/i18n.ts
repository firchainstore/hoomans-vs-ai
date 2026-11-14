import es from './es.json';
import en from './en.json';

export const LANGS: Record<string, Record<string, string>> = { es, en };
let current = 'es';

export function setLang(lang: string) { current = LANGS[lang] ? lang : 'es'; }
export function getLang() { return current; }
export function nextLang() { const k = Object.keys(LANGS); return k[(k.indexOf(current) + 1) % k.length]; }

/** t('hud.survive', { s: 12 }) → reemplaza {s}. Si falta la clave devuelve la clave (visible en pruebas). */
export function t(key: string, params?: Record<string, string | number>): string {
  let text = LANGS[current][key] ?? LANGS.es[key] ?? key;
  if (params) for (const p in params) text = text.replace(`{${p}}`, String(params[p]));
  return text;
}
