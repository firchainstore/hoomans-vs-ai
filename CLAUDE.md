# Last Hoomans — guía para quien continúe el proyecto

Shooter contra máquinas. Empezó como top-down 2D (Phaser) para Android; desde 2026-11-15 la dirección
es un shooter 3D en primera persona para web (ver «DIRECCIÓN ACTUAL» abajo). Autor: desarrollador independiente
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
src/game/                    Phaser: textures.ts (arte procedural en canvas), atmosphere.ts (decorado, viñeta,
                             brasas), entities.ts (Enemy, Bullet), Sticks.ts, Sfx.ts
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

- **Arte procedural en Canvas 2D** (`textures.ts`): degradados, sombras y brillos dibujados una vez al
  arrancar; cero coste por frame. El autor rechazó la primera versión de formas planas ("parece Atari"):
  **el aspecto visual es prioridad**. No volver a formas simples; cualquier elemento nuevo debe llevar
  sombra, volumen y brillo, y seguir el tono oscuro de ruinas con máquinas luminosas.
- `SPRITE_SCALE` (1,45) agranda dibujo y colisión de personajes a la vez; los `radius` de los JSON son lógicos.
- El juego se renderiza a 540 px de alto y se escala (rápido en gama baja, algo suave en pantallas grandes).
- **Visión original del autor** (más amplia que la v1): elegir bando. Humanos = mundo apocalíptico;
  Máquinas = San Francisco actual, soleado y próspero, que se va degradando hasta el apocalipsis.

- **Dirección de arte pedida por el autor (2026-11-14):** los humanos son GENTE COMÚN (oficios normales:
  enfermera, mecánico, maestra, repartidor…) obligada a sobrevivir de un día para otro, no héroes de acción
  ni soldados. Las máquinas deben dar miedo: industriales, esqueléticas, frías.
- **Nombre (elegido por el autor):** marca "Last Hoomans" ("hoomans" = forma coloquial de "humans").
  Títulos de tienda: ES "Últimos Hoomans: Shooter IA", EN "Last Hoomans: AI Robot Shooter" (30 caracteres
  justos). Quiere "AI/IA" en el título y "robot" porque la gente asocia IA con robots. Se descartó
  "Humans/Hoomans vs AI" porque ya existe "Humans vs Ai: Battle Simulator" en Play y App Store.
  El appId sigue siendo `com.firchain.hoomansvsai` (provisional).
- **Referencias del autor:** máquinas = esqueleto metálico con ojos rojos y mecánica expuesta (se toma la
  sensación, NO el diseño de la película); humanos = gente con ropa de calle. Los personajes jugables
  son los "skins" (`skins.json`: chaqueta, pelo/gorro, mochila) con nombre y oficio.
- **Distribución:** Google Play sigue siendo el objetivo; el mismo build sirve como web (Cloudflare Pages
  gratis alcanza de sobra: el juego pesa ~1,3 MB) para demo y captación. Campaña humana primero.

- **DIRECCIÓN ACTUAL (decidida por el autor, 2026-11-15): shooter 3D en PRIMERA PERSONA, web primero**
  (Cloudflare Pages), Google Play después con calidad ajustada. El autor quedó "bastante contento con los
  gráficos". Punto de entrada `fps.html`; código en `src/fps/` (Three.js):
  - `gfx.ts` render, cámara, luces, cielo, ojo de TUTELA, utilidades · `models.ts` máquinas por código
    (segmentos fusionados por material; el aspecto sale de `EnemyDef.shape`), convoy, terminal, arma en pantalla
  - `level.ts` genera el escenario de cada misión (tamaño = `arena` del JSON, semilla = id) + colisiones
  - `audio.ts` sonido sintetizado · `ui.ts` menús HTML (menú, misiones, taller, pausa, resultado)
  - `main.ts` bucle: jugador, disparo hitscan, IA de enemigos leída de `enemies.json`, objetivos, HUD, bot de pruebas
  Reutiliza SIN CAMBIOS `src/core` (MissionDirector, EndlessDirector, Economy, SaveManager), los JSON de
  `src/data`, i18n y `src/services`. Conversión de unidades: los JSON están en px del 2D, **25 px = 1 m**
  (`U` en main.ts); alcances ×1,6. `weapons.json` tiene `mag` (balas por cargador, solo FPS).
  Controles: WASD o flechas + ratón (clic dispara, R recarga, Esc/P pausa); táctil: stick izquierdo,
  arrastre derecho para mirar, disparo automático al apuntar a una máquina.
  Escenarios: `arena.theme` en `missions.json` (street, scrapyard, bridge, campus, ruins, core) elige borde,
  coberturas y niebla en la tabla `THEMES` de `level.ts`. Las máquinas llegan por UNA «puerta» (lado de la zona)
  marcada con haz rojo, que rota cada `fps.gateSeconds`; el autor rechazó que aparecieran por la espalda.
  Agacharse (C/Ctrl/Shift o botón ▼): baja la cámara y los disparos enemigos chocan con coberturas de ≥1 m.
  Cada partida abre con una pantalla de situación/misión/consejo (`ui.briefing`, claves `mission.<id>.story|goal|tip`
  y `endless.*`): toda misión nueva debe traer esos tres textos en es y en.
  Niveles de dificultad en `balance.json → fps.levels` (easy por defecto, guardado en `settings.difficulty`):
  cantidad, velocidad, daño, vida de jefes, ayuda al apuntar y disparo automático. El autor juega en laptop con
  flechas y panel táctil y dos veces dijo que la misión 2 era demasiado difícil: Fácil debe ser realmente fácil.
  Recompensas en partida (`balance.json → fps.drops`): las máquinas sueltan botiquín, escudo, sobrecarga (daño ×2)
  o un arma prestada con munición limitada; rachas de 3+ bajas dan monedas extra. Pedido por el autor.
  Sonido: `audio.ts` con reverberación y compresor; el autor rechazó el primer ambiente (ruido filtrado = «radio con
  interferencia»): nada de siseo continuo. Sigue siendo sintetizado; lo ideal son grabaciones con licencia.
  Dificultad FPS: bloque `fps` de `balance.json` (cantidad, velocidad, daño, vida que se regenera, radio de
  impacto). El autor encontró la primera versión demasiado difícil (enjambres de drones): no subirla sin que la pruebe.
  Pruebas: `npm run smoke:fps` (arranca todo) y `npm run smoke:fps -- --full` (un bot gana las 6 misiones).
  El juego 2D de Phaser (`index.html`, `src/scenes`, `src/game`) queda congelado; no invertir más en él.
  Pendiente visible: tienda de compras en la versión FPS, pistas del tutorial, pulir cada escenario.
- Monetización web (conversado, sin decidir): Cloudflare no cobra; opciones = portales con reparto de
  anuncios (CrazyGames/Poki/itch.io), Whop (única pasarela del autor) con clave verificada por un Worker,
  o web gratis como escaparate hacia Play. Recomendado empezar por escaparate gratis.
- **Qué espera realmente el autor (visto en sus 7 enlaces de X, 2026-11-14):** shooters 3D en PRIMERA o
  tercera persona hechos con Claude para navegador de escritorio (arma en pantalla, escenarios industriales
  con luz volumétrica, HUD militar, todo generado por código). No un juego cenital. Cualquier propuesta
  visual debe medirse contra eso. Tensión a resolver con él: esos juegos son de PC (ratón + teclado, GPU
  decente); en móvil de gama baja un FPS así no rinde igual y los controles táctiles son más difíciles.
- **Red del entorno en la nube "Videojuego":** acceso limitado; se permitieron x.com, pbs.twimg.com y
  Pinterest. WebFetch no los resuelve, pero `curl` sin cabeceras falsas sí (título, descripción y miniatura).
  No se pueden ver vídeos: pedir capturas.

## Cosas que NO están verificadas
- El APK/AAB nunca se ha compilado (no hay Android SDK en el entorno de desarrollo en la nube).
  `MainActivity.java` (pantalla completa) está escrito pero sin compilar.
- Rendimiento y controles táctiles en un teléfono real. El equilibrio de dificultad solo se validó con
  un bot invulnerable (prueba que las misiones se pueden completar, no que sean divertidas).
