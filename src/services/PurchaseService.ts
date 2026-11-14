import { PRODUCTS } from '../core/data';

export interface ProductInfo { id: string; price: string }

export interface PurchaseService {
  init(): Promise<void>;
  /** Precios localizados de la tienda (Google Play los da en la moneda del usuario). */
  getProducts(): Promise<ProductInfo[]>;
  /** Resuelve true si la compra se completó. Lo que concede se aplica con Economy.applyPurchase. */
  purchase(productId: string): Promise<boolean>;
  /** Ids de productos ya comprados (reinstalación / cambio de teléfono). */
  restore(): Promise<string[]>;
}

/** Implementación de desarrollo: toda compra se aprueba al instante. NO usar en producción. */
export class FakePurchaseService implements PurchaseService {
  private owned = new Set<string>();
  async init() {}
  async getProducts() { return PRODUCTS.map((p) => ({ id: p.id, price: p.fakePrice })); }
  async purchase(productId: string) {
    console.info(`[FakePurchase] compra simulada: ${productId}`);
    this.owned.add(productId);
    return true;
  }
  async restore() { return [...this.owned]; }
}
