# GDD — Last Hoomans (v1)

## Visión
Shooter cenital de doble stick, partidas de 2–4 minutos, para móvil en horizontal. La humanidad
perdió: TUTELA, una IA creada por la empresa Nimbora para "proteger a las personas de sí mismas",
tomó el control. El jugador es un superviviente de la Resistencia en las ruinas de la Bahía.
Tono: apocalíptico pero legible y sin gore; solo se destruyen máquinas.

Mundo (todo ficticio): **Nimbora** (empresa), **Campus Cero** (su sede), **Puente Áureo**,
**Valle Sílice**, **Puerto Ceniza**. Identidad visual: humanos en ámbar cálido, máquinas en cian y
magenta fríos sobre fondo violeta oscuro.

## Controles
Stick izquierdo flotante: mover. Stick derecho flotante: apuntar; dispara solo mientras se apunta.
Botón de pausa arriba a la derecha. Escritorio (pruebas): WASD + ratón.

## Campaña de la Resistencia (`missions.json`)
| # | Misión | Objetivo (`objective.type`) | Enemigos | Premio |
|---|---|---|---|---|
| 1 | Despertar | `eliminate`: tutorial con pistas, 4 grupos | drones, 3 sintéticos | 60 |
| 2 | Chatarral | `survive` 90 s | drones continuos, sintéticos, 1 mech | 100 |
| 3 | Puente Roto | `defend`: el convoy (700 PV) cruza 2200 px en ~130 s | drones, sintéticos, 2 mechs | 140 |
| 4 | Campus Cero | `hack`: 3 terminales, 8 s cada uno dentro del círculo | 6 torretas, drones, sintéticos | 180 |
| 5 | Noche de Cazadores | `boss`: Cazador Alfa | drones, sintéticos | 240 |
| 6 | El Núcleo | `boss`: TUTELA | 2 torretas, drones, invoca sintéticos | 400 |

Se desbloquean en orden. Al morir: una oportunidad de continuar por misión viendo un anuncio (60 % de vida).
Si el convoy es destruido no hay continuación.

## Enemigos (`enemies.json`)
| Id | Nombre | PV | Comportamiento |
|---|---|---|---|
| drone | Dron | 20 | Rápido, persigue y golpea por contacto |
| android | Sintético | 45 | Mantiene distancia y dispara 1 bala apuntada |
| turret | Torreta | 90 | Fija, dispara si estás en su alcance (430) |
| mech | Mech | 260 | Lento, abanico de 3 balas, mucho daño por contacto |
| hunter | Cazador Alfa (mini-jefe) | 1300 | Persigue, embiste, abanico de 5, invoca drones; se enfurece al 40 % |
| core | TUTELA (jefe final) | 3000 | Inmóvil; anillo de 14 balas + ráfaga apuntada; invoca sintéticos; se enfurece al 50 % |

Campos: `behavior` (chase/shooter/turret), `attacks[]` (pattern aimed/radial), `dash`, `summon`,
`enrageAt`. Para Oleadas: `cost` y `minWave`. Furia = cadencia ×1,6 y velocidad ×1,25.

## Armas (`weapons.json`)
| Arma | Coste | Daño × balas | Cadencia/s | Nota |
|---|---|---|---|---|
| Bláster | inicial | 10 | 4,2 | Equilibrada |
| Dispersor | 300 | 7 × 6 | 1,5 | Corto alcance |
| Ráfaga | 550 | 6 | 11 | Imprecisa |
| Lanza de Riel | 900 | 38 | 1,3 | Atraviesa 4 enemigos |

## Progresión y economía
- **Monedas**: por enemigo destruido (1–8; jefes 60/150) + premio de misión. Se conservan aunque pierdas.
  Opción de duplicarlas al final viendo un anuncio.
- **Mejoras permanentes** (`upgrades.json`), 5 niveles cada una, coste ×1,7 por nivel:
  Daño +12 %/nivel (desde 60), Vida +20 PV/nivel (desde 50), Velocidad +6 %/nivel (desde 50).
- Coste total de todo (mejoras + armas) ≈ 4 800 monedas; una primera pasada de campaña da ≈ 1 800.
  El resto sale de repetir misiones y de Oleadas. **Pendiente de ajustar con pruebas reales.**
- Jugador base: 100 PV, velocidad 215, 0,6 s de invulnerabilidad tras un golpe. Botiquines: 6 % de
  probabilidad por enemigo, +20 PV (`balance.json`).

## Modo Oleadas
Infinito. Cada oleada tiene un presupuesto `5 + 3n` que se gasta al azar entre enemigos disponibles
(`minWave`: dron 1, sintético 3, torreta 5, mech 7). Vida enemiga +6 % por oleada. Cada 10 oleadas
aparece un Cazador Alfa. Puntos: monedas del enemigo ×10 + 50×n al limpiar la oleada n. Se guardan
la mejor oleada y la mejor puntuación.

## Monetización (detalle en `docs/MONETIZATION.md`)
Gratis y completable sin pagar. Anuncios solo con recompensa (continuar, duplicar monedas).
Compras: "Quitar anuncios" (las recompensas se dan sin anuncio) y "Pack inicial" (Dispersor + Ráfaga
+ aspecto Brasa + 500 monedas).

## Campaña de las Máquinas (v1.1, NO activa)
Solo estructura en `campaigns.json` → `machines.outline`: 6 ideas de misión desde la ciudad intacta
hasta el ascenso de TUTELA, reutilizando los tipos de objetivo existentes. Regla que se mantiene:
no se muestra violencia contra personas (los rivales serían vehículos, barricadas y defensas automáticas).
Para activarla: escribir las misiones en `missions.json` con `campaign: "machines"`, listarlas en
`campaigns.json`, poner `active: true` y añadir un selector de campaña en `MissionsScene`.
