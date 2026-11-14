# Assets: qué hay y qué falta

**Estado actual: no hay ilustraciones ni audio profesional.** Todo lo que se ve es arte procedural
dibujado por código (`src/game/textures.ts`, `src/game/atmosphere.ts`) y los sonidos son pitidos
sintetizados (`src/game/Sfx.ts`). Sirve para jugar y probar; el salto a calidad comercial son sprites reales.

## Cómo reemplazar un dibujo por un sprite real
1. Guarda el PNG en `public/assets/sprites/`.
2. Cárgalo en `BootScene.preload()` (`src/scenes/menus.ts`) con **la misma clave** de la tabla:
   `this.load.image('enemy_drone', 'assets/sprites/enemy_drone.png')`.
3. Listo: `buildTextures` no genera una textura cuya clave ya existe.

Reglas: PNG con transparencia, vista cenital, **mirando hacia la derecha**, centrado, con el tamaño
exacto de la tabla (el círculo de colisión se calcula a partir de él). Estilo: oscuro, sucio,
iluminado por los ojos/motores de las máquinas; humanos en tonos tierra con detalles ámbar.

## Sprites necesarios
| Clave | Tamaño px | Qué es |
|---|---|---|
| `player_default`, `player_ember` | 67×67 | Superviviente (uno por aspecto de `skins.json`) |
| `enemy_drone` | 64×64 | Dron cuadricóptero |
| `enemy_android` | 70×70 | Sintético (humanoide metálico) |
| `enemy_turret` | 81×81 | Torreta fija |
| `enemy_mech` | 99×99 | Mech pesado |
| `enemy_hunter` | 116×116 | Mini-jefe Cazador Alfa |
| `enemy_core` | 163×163 | Jefe final TUTELA |
| `bullet_p` | 26×10 | Trazadora del jugador (blanca, se tiñe) |
| `bullet_e` | 20×20 | Proyectil enemigo |
| `heal` | 44×44 | Botiquín |
| `convoy` | 168×90 | Camión blindado de refugiados |
| `terminal` | 75×75 | Terminal hackeable (claro, se tiñe) |
| `ground` | 256×256 | Asfalto repetible sin costuras, en grises (cada misión lo tiñe) |
| `d_crater`, `d_rubble`, `d_plate`, `d_mark` | ~100×100 | Decorado del suelo: cráter, escombros, chapa, marca vial |
| `scorch` | 72×72 | Mancha de quemado al destruir una máquina |
| `menu_bg` | 1290×540 | Ilustración del menú (bahía en ruinas, puente roto, ojo de TUTELA) |
| `particle`, `flash`, `light`, `vignette`, `arrow`, `stick_*` | — | Efectos e interfaz; no hace falta cambiarlos |

Tamaño de un enemigo nuevo: `2 × (radius + 10) × 1,45` px (`PAD` y `SPRITE_SCALE` en `textures.ts`).

Lo que más mejoraría el aspecto con arte real: (1) personajes y máquinas con animación de caminar,
(2) losetas de ciudad en ruinas (calles, aceras, edificios derruidos, coches), (3) ilustración del
menú e ícono, (4) retratos para diálogos. Los puntos 1 y 2 necesitan algo de código (ver `docs/TASKS.md`).

## Sonidos necesarios (`public/assets/audio/`, formato .ogg o .m4a)
| Nombre | Uso |
|---|---|
| `shoot` (idealmente uno por arma) | Disparo del jugador |
| `hit` | Bala impacta en una máquina |
| `boom`, `boom_boss` | Explosión de enemigo / de jefe |
| `hurt` | El jugador recibe daño |
| `pickup` | Botiquín, compra, terminal hackeado |
| `ui` | Toque de botón |
| `win`, `lose` | Fin de misión |
| `music_menu`, `music_combat`, `music_boss` | Música en bucle (hoy no hay música) |

## Tienda (fuera del juego)
Ícono 512×512, ícono adaptativo Android (primer plano + fondo), gráfico de funciones 1024×500 y
capturas: ver `docs/PLAYSTORE.md`.

## Licencias
Usa solo arte y audio con licencia comercial clara (propio, encargado, o CC0 / comprado) y guarda
el comprobante. Fuentes habituales: Kenney.nl (CC0), itch.io, OpenGameArt (revisar licencia de cada pack).
