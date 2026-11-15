# Tareas

Leyenda de complejidad: **[ALTA]** = requiere el modelo más capaz y/o pruebas en teléfono real ·
**[ECON]** = contenido, interfaz o pulido que un modelo más económico hace sin problema ·
**[TÚ]** = solo puede hacerlo el autor (cuentas, dinero, decisiones, dispositivo físico).

## Hecho (v0.1.0)
- [x] Proyecto TypeScript + Phaser 3 + Vite + Capacitor; git en la rama `desarrollo`.
- [x] Núcleo: doble stick táctil (+ WASD/ratón), disparo, pools de balas y enemigos, cámara, HUD, partículas.
- [x] Sistema de misiones en datos y 5 tipos de objetivo (eliminate, survive, defend, hack, boss).
- [x] Campaña de la Resistencia: 6 misiones con tutorial, mini-jefe y jefe final.
- [x] 6 enemigos definidos por datos (patrones de ataque, embestida, invocación, furia).
- [x] Modo Oleadas infinito con récord guardado.
- [x] Progresión: monedas, 3 mejoras permanentes, 4 armas, 2 aspectos; guardado local tolerante a errores.
- [x] Menú, selección de misión, Taller, Tienda, Ajustes (sonido, idioma, borrar progreso), Pausa, Resultado.
- [x] Español e inglés completos en archivos de traducción.
- [x] `AdService` / `PurchaseService` con implementaciones falsas; continuar y duplicar monedas con anuncio.
- [x] Campaña de las máquinas preparada como datos inactivos.
- [x] 28 pruebas de lógica + prueba de humo en navegador (el bot gana las 6 misiones).
- [x] Proyecto `android/` generado (horizontal, pantalla completa). **Sin compilar.**
- [x] Documentación: CLAUDE.md, GDD, BUILD_ANDROID, MONETIZATION, PLAYSTORE, assets/README.

- [x] Rehecho visual completo (el autor rechazó las formas planas): personajes y máquinas con volumen,
      asfalto con cráteres y escombros, luces aditivas, fogonazos, quemaduras, viñeta, brasas y menú ilustrado.

## AHORA — shooter 3D en primera persona (`fps.html`, `src/fps/main.ts`)
- [x] Rebanada vertical jugable: calle en ruinas, máquinas esqueléticas (cuerpo a cuerpo y tiradoras), rifle,
      recarga, tiros a la cabeza, oleadas, HUD, controles de PC y táctiles.
- [ ] **[TÚ]** Jugarlo en computador y en el teléfono; decir qué se siente bien/mal (velocidad, puntería, dificultad).
- [ ] **[ALTA]** Partir `src/fps/main.ts` en módulos (mundo, enemigos, arma, controles, hud) antes de que crezca.
- [ ] **[ALTA]** Conectar `MissionDirector`/`EndlessDirector`, `enemies.json`, `weapons.json`, economía y guardado.
- [ ] **[ALTA]** Un escenario 3D por misión (desguace, puente, campus, núcleo) y los objetivos (convoy, terminales, jefes).
- [ ] **[ALTA]** Rendimiento en móvil: niveles de calidad (sombras, bloom, resolución), fusionar geometrías/instancing.
- [ ] **[ECON]** Modelos por código: dron, torreta, mech, Cazador, TUTELA; más armas en pantalla.
- [ ] **[ECON]** Sonido (disparo, pasos metálicos, impactos), menú principal y pausa en 3D, textos.
- [ ] **[ECON]** Publicar en Cloudflare Pages (requiere que el autor conecte su cuenta o lo suba él).

## Versión 2D anterior (Phaser) — congelada

- [ ] **[TÚ]** Decidir si el arte procedural actual basta o se consiguen sprites reales (ver `public/assets/README.md`).
- [ ] **[ALTA]** Edificios en ruinas, muros y coches CON colisión (hoy el decorado es plano): es lo que
      más falta para que parezca una ciudad. Requiere cuerpos estáticos por misión y que los enemigos los rodeen.
- [ ] **[ALTA]** Tema visual "San Francisco actual" para la campaña de las máquinas: calles limpias, luz
      de día, vegetación, tranvía, y degradación progresiva misión a misión.
- [ ] **[ECON]** Animación de pasos/retroceso al disparar, casquillos, humo en máquinas dañadas.
- [ ] **[ECON]** Decorado específico por misión (desguace, puente con barandas y agua, campus, sala del núcleo).
- [ ] **[ECON]** Opción de calidad alta: renderizar a 1080 px en teléfonos potentes.

## Pendiente — imprescindible para publicar
- [ ] **[TÚ]** Compilar e instalar en un teléfono real siguiendo `BUILD_ANDROID.md`; anotar errores,
      fluidez (objetivo 60 fps) y sensación de los sticks.
- [ ] **[TÚ]** Jugar las 6 misiones y Oleadas y anotar qué es demasiado fácil o difícil.
- [ ] **[ALTA]** Ajustar el equilibrio con esas notas (solo JSON: `enemies`, `missions`, `weapons`, `balance`).
      Hoy solo está validado con un bot invulnerable.
- [ ] **[ALTA]** Integrar AdMob con consentimiento UMP (`MONETIZATION.md`).
- [ ] **[ALTA]** Integrar Google Play Billing vía RevenueCat (`MONETIZATION.md`).
- [ ] **[ALTA]** Si en el teléfono no va fluido: perfilar con Chrome remoto (`chrome://inspect`).
      Primeros sospechosos: `collider(enemies, enemies)` y el tamaño del canvas en pantallas de alta densidad.
- [ ] **[TÚ]** Conseguir arte y sonido (`public/assets/README.md`) con licencia comercial.
- [ ] **[ECON]** Cargar el arte y audio reales en `BootScene.preload()` y sustituir `Sfx` por archivos; añadir música y su ajuste.
- [ ] **[ECON]** Ícono y pantalla de carga con `@capacitor/assets`.
- [ ] **[ECON]** Botón "Política de privacidad" en Ajustes (abre URL) y botón de opciones de anuncios (UMP).
- [ ] **[ECON]** Botón Atrás de Android con `@capacitor/app`: pausa en partida, volver en menús, salir en el menú principal.
- [ ] **[TÚ]** Todo `PLAYSTORE.md`: cuenta, política de privacidad, formularios, capturas, prueba cerrada de 14 días.

## Pendiente — mejora la calidad (recomendado antes de lanzar)
- [ ] **[ALTA]** Migrar el guardado a `@capacitor/preferences` (localStorage puede ser borrado por
      Android). Hay que hacer `SaveManager` asíncrono al cargar; mantener compatibilidad con el guardado actual.
- [ ] **[ALTA]** Obstáculos y coberturas en las arenas (ruinas, coches): cuerpos estáticos definidos
      en `missions.json` + esquivado simple. Hoy las arenas están vacías.
- [ ] **[ECON]** Decorado por misión sin colisión (manchas, grietas, restos) para que cada arena se distinga.
- [ ] **[ECON]** Diálogo breve antes y después de cada misión (personajes originales, textos en i18n).
- [ ] **[ECON]** Estrellas por misión (tiempo, vida restante) y premio reducido al repetir misiones ya completadas.
- [ ] **[ECON]** Vibración al recibir daño (`@capacitor/haptics`) con ajuste para desactivarla.
- [ ] **[ECON]** Animaciones de interfaz: transición entre escenas, contador de monedas, números de daño.
- [ ] **[ECON]** Telegrafiar ataques de jefes (línea de embestida del Cazador, aviso del anillo de TUTELA).
- [ ] **[ECON]** Más contenido por datos: armas, enemigos, aspectos, variantes de oleadas.
- [ ] **[ECON]** Opción de stick fijo / zurdos y tamaño de sticks en Ajustes.
- [ ] **[ECON]** Analíticas básicas y reporte de fallos (decidir proveedor; afecta a "Seguridad de los datos").

## Versión 1.1
- [ ] **[ALTA]** Campaña de las Máquinas: diseñar las 6 misiones a partir de `campaigns.json → outline`,
      jugador-máquina con sus propias armas, selector de campaña.
- [ ] **[ECON]** Escribir sus textos, datos de misiones y enemigos "humanos" no personales (vehículos, barricadas).

## Problemas conocidos
- En pantallas muy estrechas (< 16:10) el juego muestra barras laterales; es intencionado.
- `MainActivity.java` no se ha compilado nunca (ver `BUILD_ANDROID.md` para el plan B).
- El tamaño del JS (≈ 1,2 MB, 340 KB comprimido) es casi todo Phaser; no importa dentro de un APK.
- Las monedas por repetir la misma misión no disminuyen: se puede "farmear" la misión 1.

## Siguiente paso
1. **Autor:** jugar la rebanada 3D (`fps.html`) y dar su opinión; decidir si esta es la dirección definitiva.
2. **Modelo que continúe** (leer `CLAUDE.md` → «DIRECCIÓN ACTUAL»): modularizar `src/fps`, conectar `src/core`
   y construir la misión 1 completa en 3D antes de multiplicar contenido. Probar siempre con capturas
   (`fps.html#demo` en Chromium con SwiftShader) y enseñárselas al autor: el aspecto es su prioridad.
