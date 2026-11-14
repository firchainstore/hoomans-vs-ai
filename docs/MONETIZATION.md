# Monetización: diseño e integración pendiente

## Diseño (ya implementado con servicios falsos)
- Gratis, sin muros de pago: todo se consigue jugando.
- **Anuncios solo con recompensa y solo si el jugador los pide**, nunca durante una misión:
  - `continue`: revivir una vez por partida con 60 % de vida.
  - `double_coins`: duplicar las monedas en la pantalla de resultado.
- **Compras** (`src/data/products.json`):
  - `remove_ads` — compra única. Las recompensas se entregan sin anuncio.
  - `starter_pack` — compra única: Dispersor + Ráfaga + aspecto Brasa + 500 monedas.

## Dónde vive en el código
| Archivo | Papel |
|---|---|
| `src/services/AdService.ts` | Interfaz `AdService` + `FakeAdService` |
| `src/services/PurchaseService.ts` | Interfaz `PurchaseService` + `FakePurchaseService` |
| `src/services/index.ts` | **Único sitio** donde se elige la implementación |
| `src/scenes/overlays.ts` → `ResultScene.reward()` | Único punto que muestra anuncios |
| `src/scenes/menus.ts` → `StoreScene`, `BootScene` | Compra, restauración al arrancar |
| `src/core/Economy.ts` → `applyPurchase()` | Entrega (idempotente) de lo comprado |

Los `Fake*` siempre conceden la recompensa/compra. **No deben llegar a producción**: publicar con
ellos regalaría todas las compras.

## Plugins recomendados
> Antes de instalar, confirma en la página de cada plugin que soporta **Capacitor 8** (la versión de
> este proyecto) y sigue su guía actual: los nombres de métodos de abajo son orientativos.

### Anuncios: `@capacitor-community/admob`
Es el plugin de AdMob mantenido por la comunidad de Capacitor; soporta anuncios con recompensa y el
formulario de consentimiento **UMP** (obligatorio en Europa, Reino Unido y Suiza).

Tarea (complejidad alta, hay que probar en teléfono real):
1. Crear cuenta de AdMob, registrar la app y crear **un bloque de anuncios con recompensa**.
2. `npm i @capacitor-community/admob && npx cap sync android`.
3. Añadir el **App ID de AdMob** en `AndroidManifest.xml` (meta-data
   `com.google.android.gms.ads.APPLICATION_ID`), como indica el plugin.
4. Crear `src/services/AdMobAdService.ts` que implemente `AdService`:
   - `init()`: inicializar el SDK, pedir consentimiento UMP si hace falta y precargar un anuncio.
   - `isRewardedReady()`: `true` solo si hay uno cargado (la UI ya oculta los botones si es `false`).
   - `showRewarded()`: mostrarlo y resolver `true` **solo** con el evento de recompensa; al cerrarse, precargar el siguiente.
5. En `services/index.ts`: usar `AdMobAdService` cuando `Capacitor.isNativePlatform()`, y el falso en el navegador.
6. Durante el desarrollo usar SIEMPRE los **IDs de prueba** de Google; hacer clic en anuncios reales
   propios puede suspender la cuenta.
7. Añadir en Ajustes un botón "Privacidad / opciones de anuncios" que reabra el formulario UMP.

### Compras: RevenueCat (`@revenuecat/purchases-capacitor`)
Recomendado para un primer juego: envuelve Google Play Billing, valida los recibos en su servidor
(evita trampas triviales) y es gratis hasta un volumen de ingresos alto (revisa sus tarifas actuales).
Alternativa sin intermediario ni cuenta externa: `cordova-plugin-purchase` (funciona con Capacitor),
a cambio de más trabajo y sin validación de servidor.

Tarea (complejidad alta):
1. En Play Console: crear los productos **`remove_ads`** y **`starter_pack`** (productos únicos, no
   consumibles) con los mismos ids que `products.json`. Requiere perfil de pagos (cuenta de comerciante).
2. Crear el proyecto en RevenueCat, conectar Play Console y definir un *entitlement* por producto.
3. `npm i @revenuecat/purchases-capacitor && npx cap sync android`.
4. Crear `src/services/RevenueCatPurchaseService.ts` que implemente `PurchaseService`:
   `init()` configura con la clave pública de Android; `getProducts()` devuelve precios localizados;
   `purchase(id)` resuelve `true` solo si la compra se completa (cancelar = `false`);
   `restore()` devuelve los ids activos.
5. Cambiar la implementación en `services/index.ts` (solo en plataforma nativa).
6. Probar con **testers de licencia** de Play Console en una pista de prueba interna: comprar,
   cancelar, reinstalar y restaurar.

La clave pública de RevenueCat y los ids de AdMob no son secretos, pero ninguna contraseña ni
archivo de firma debe entrar en el repositorio.

## Reglas de Google a respetar
- Declarar "Contiene anuncios" y "Compras en la aplicación" en la ficha.
- Los anuncios con recompensa deben ser claramente opcionales (ya lo son: botón con "(ver anuncio)").
- Bienes digitales solo mediante Google Play Billing (no enlaces de pago externos).
- Ofrecer "Restaurar compras" (ya existe en la Tienda).
