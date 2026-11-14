# Assets: qué hay y qué falta

**Estado actual: no hay arte ni audio profesional.** Todo lo que se ve se dibuja por código
(`src/game/textures.ts`) y los sonidos son pitidos sintetizados (`src/game/Sfx.ts`). Son placeholders.

## Cómo reemplazar un placeholder
1. Guarda el PNG en `public/assets/sprites/` (o `ui/`).
2. Cárgalo en `BootScene.preload()` (`src/scenes/menus.ts`) con **la misma clave** de la tabla:
   `this.load.image('enemy_drone', 'assets/sprites/enemy_drone.png')`.
3. Listo: `buildTextures` no genera una textura cuya clave ya existe.

Reglas: PNG con transparencia, vista cenital, **mirando hacia la derecha**, centrado. Respeta el tamaño
(el círculo de colisión es `radius` en `enemies.json`; la imagen mide `2 × (radius + 4)` px).
El jugador y las balas deben ser claros/blancos porque el juego los tiñe (skin, color del arma).

## Sprites necesarios
| Clave | Tamaño px | Qué es |
|---|---|---|
| `player` | 34×34 | Superviviente de la Resistencia (tonos claros, se tiñe) |
| `enemy_drone` | 32×32 | Dron ligero |
| `enemy_android` | 36×36 | Sintético (androide que dispara) |
| `enemy_turret` | 44×44 | Torreta fija |
| `enemy_mech` | 56×56 | Mech pesado |
| `enemy_hunter` | 68×68 | Mini-jefe Cazador Alfa |
| `enemy_core` | 100×100 | Jefe final TUTELA |
| `bullet_p` | 16×6 | Bala del jugador (blanca, se tiñe) |
| `bullet_e` | 12×12 | Bala enemiga |
| `particle` | 6×6 | Chispa de explosión (blanca) |
| `heal` | 22×22 | Botiquín |
| `convoy` | 96×48 | Camión de refugiados |
| `terminal` | 44×44 | Terminal hackeable (claro, se tiñe) |
| `arrow` | 24×24 | Flecha indicadora de objetivo |
| `ground` | 128×128 | Baldosa de suelo repetible, en grises (cada misión la tiñe) |
| `stick_base`, `stick_thumb` | 128×128, 56×56 | Sticks virtuales |

Mejoras de arte no cubiertas por una clave (requieren algo de código, ver `docs/TASKS.md`):
animaciones, decorado de ruinas por misión, retratos, fondo del menú, fuente tipográfica propia.

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
