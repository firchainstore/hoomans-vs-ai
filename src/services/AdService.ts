/** Dónde se ofrece un anuncio con recompensa. Nunca hay anuncios obligatorios. */
export type AdPlacement = 'continue' | 'double_coins';

export interface AdService {
  init(): Promise<void>;
  /** ¿Hay un anuncio con recompensa cargado? Si no, la UI oculta o desactiva el botón. */
  isRewardedReady(): boolean;
  /** Muestra el anuncio. Resuelve true SOLO si el usuario ganó la recompensa. */
  showRewarded(placement: AdPlacement): Promise<boolean>;
}

/** Implementación de desarrollo: simula un anuncio de ~1 s que siempre recompensa. */
export class FakeAdService implements AdService {
  constructor(private delayMs = 900) {}
  async init() {}
  isRewardedReady() { return true; }
  showRewarded(placement: AdPlacement): Promise<boolean> {
    console.info(`[FakeAd] anuncio con recompensa: ${placement}`);
    return new Promise((resolve) => setTimeout(() => resolve(true), this.delayMs));
  }
}
