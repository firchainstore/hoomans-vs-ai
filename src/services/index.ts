// Punto único donde se eligen las implementaciones. Para integrar AdMob / Play Billing:
// crear AdMobAdService / PlayBillingPurchaseService (ver docs/MONETIZATION.md) y cambiarlas aquí.
import cfg from '../config/game.config.json';
import { SaveManager } from '../core/SaveManager';
import { FakeAdService, type AdService } from './AdService';
import { FakePurchaseService, type PurchaseService } from './PurchaseService';

const memory = new Map<string, string>();
// En algunos WebView o marcos aislados, tocar localStorage lanza una excepción: se usa memoria.
function pickStorage() {
  try { localStorage.getItem(cfg.saveKey); return localStorage; }
  catch { return { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v) }; }
}
const storage = pickStorage();

export const saves = new SaveManager(storage, cfg.saveKey, cfg.defaultLang);
export const ads: AdService = new FakeAdService();
export const purchases: PurchaseService = new FakePurchaseService();
