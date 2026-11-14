# Hoomans vs AI — guía para quien continúe el proyecto

Shooter top-down 2D de doble stick para Android (Google Play). Autor: desarrollador independiente
(Panamá), primer juego; mercado principal hispanohablante. **Háblale en español y explica las
decisiones importantes en pocas líneas.** Cuida los tokens: no vuelques archivos grandes ni reescribas lo que funciona.

Documentos: `docs/GDD.md` (diseño), `docs/TASKS.md` (estado y siguiente paso — **actualízalo al
terminar cada hito**), `docs/BUILD_ANDROID.md`, `docs/MONETIZATION.md`, `docs/PLAYSTORE.md`,
`public/assets/README.md` (arte y sonido pendientes).

## Comandos
| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (WASD + ratón en escritorio) |
| `npm test` | Pruebas de lógica (Vitest) |
| `npm run build` | Typecheck + build de producción en `dist/` |
| `npm run smoke` | Tras `build`: arranca el juego en Chromium y comprueba menús, misiones, continuar, pausa |
| `npm run smoke -- --full` | Además un bot invulnerable gana las 6 misiones (~6 min) |
| `npm run android:sync` | build + nombre + `cap sync android` |

Antes de cada commit: `npm test && npm run build && npm run smoke`.
Git: se trabaja en la rama `desarrollo` (no en `main`), commits pequeños con mensaje en español.

## Estructura
```
src/config/game.config.json  Nombre del juego, appId, versión (ÚNICO sitio del nombre)
src/data/*.json              CONTENIDO: misiones, enemigos, armas, mejoras, skins, productos, campañas, balance
src/i18n/{es,en}.json        Todos los textos. i18n.ts → t('clave', {params})
src/core/                    Lógica pura SIN Phaser (probada en tests/): MissionDirector, WaveGenerator
                             (+EndlessDirector), Economy, SaveManager, data.ts (acceso tipado), types.ts
src/services/                AdService, PurchaseService (interfaces + Fake*), index.ts elige implementación
src/game/                    Phaser: textures.ts (placeholders), entities.ts (Enemy, Bullet), Sticks.ts, Sfx.ts
src/scenes/                  GameScene.ts (única escena de juego), overlays.ts (Pausa, Resultado),
                             menus.ts (Boot, Menú, Misiones, Taller, Tienda, Ajustes), ui.ts (botones, colores)
tests/                       Vitest. data.test.ts valida integridad de datos y traducciones
scripts/                     smoke.mjs (prueba en navegador), sync-name.mjs
android/                     Proyecto Capacitor generado (se compila en el PC del autor, no aquí)
```

## Convenciones
- **Contenido = datos.** Nueva misión/enemigo/arma/mejora: se edita el JSON y se añaden sus textos a
  `es.json` y `en.json`. Solo se toca código si hace falta un comportamiento nuevo (tipo de objetivo,
  patrón de ataque, forma de dibujo).
- **Ningún texto visible en el código**: siempre `t('clave')`. Las pruebas fallan si una clave falta en
  un idioma o si el nombre del juego aparece fuera de `game.config.json`.
- **Lógica de reglas en `src/core/`** (sin importar Phaser) y con prueba. Las escenas solo dibujan y conectan.
- **Rendimiento**: nada de `new`/`destroy` en `update()`. Enemigos y balas salen de pools
  (`group.get()` / `disableBody`). Textos del HUD se actualizan cada 0,2 s. Máx. 60 enemigos vivos (`balance.json`).
- Coordenadas: alto lógico fijo 540; el ancho varía con la pantalla → usar `this.scale.width`, nunca 960 fijo.
- Paleta (ui.ts): humanos ámbar `#ffb347`, máquinas cian `#35e0ff` / magenta `#ff3d81`, fondo `#0d0b14`.

## Límites de contenido (no negociables)
- Nada con derechos de autor: sin nombres, personajes ni iconografía de Matrix/Terminator (nada de
  lluvia de código verde, píldoras, etc.). No usar la palabra "Doom". Hay una prueba que lo vigila.
- Lugares y empresas FICTICIOS (Nimbora, Puente Áureo, Valle Sílice, Puerto Ceniza). IA final: TUTELA.
- Solo se dispara a máquinas. Sin gore ni violencia contra humanos (clasificación de contenido baja).
- Monetización: gratis, sin muros de pago, anuncios SOLO con recompensa y nunca durante una misión.
- No afirmar que hay arte/audio profesional: son placeholders.

## Decisiones tomadas y por qué
- **Phaser 3 + Vite + Capacitor**: una sola base web, empaquetado Android sencillo, mucha documentación.
  Física Arcade (la más barata en CPU). Phaser 3 (no 4) por estabilidad y ejemplos disponibles.
- **Una sola `GameScene` + interfaz `Director`**: `MissionDirector` (misiones) y `EndlessDirector`
  (Oleadas) deciden cuándo generar enemigos y cuándo se gana/pierde; la escena no conoce las reglas.
- **Balas del jugador nacen en su centro** (no en la boca del arma): si no, los enemigos pegados al
  jugador eran inmunes. Lo detectó el bot de `smoke --full`.
- **Guardado en localStorage** detrás de `KeyValueStorage`: simple y suficiente. Riesgo: Android puede
  borrarlo si falta espacio → tarea pendiente migrar a `@capacitor/preferences`.
- **Con "Quitar anuncios" comprado, las recompensas se dan sin anuncio** (`ResultScene.reward`).
- **Compras idempotentes** (`applyPurchase`): restaurar no duplica monedas.
- **Campaña de las máquinas**: solo datos en `campaigns.json` (`active: false`, con `outline`).
- **appId `com.firchain.hoomansvsai`**: provisional; es permanente tras la primera subida a Play.
- `capacitor.config.ts` lee el JSON con `readFileSync` (el CLI de Capacitor no admite `import` de JSON).

## Cosas que NO están verificadas
- El APK/AAB nunca se ha compilado (no hay Android SDK en el entorno de desarrollo en la nube).
  `MainActivity.java` (pantalla completa) está escrito pero sin compilar.
- Rendimiento y controles táctiles en un teléfono real. El equilibrio de dificultad solo se validó con
  un bot invulnerable (prueba que las misiones se pueden completar, no que sean divertidas).
