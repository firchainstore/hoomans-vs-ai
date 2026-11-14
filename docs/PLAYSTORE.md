# Checklist para publicar en Google Play

Las políticas de Google cambian: confirma cada punto en Play Console al momento de publicar.

## Cuenta
- [ ] Cuenta de desarrollador de Google Play (pago único de registro, verificación de identidad).
- [ ] **Cuentas personales nuevas**: Google exige una prueba cerrada con un mínimo de testers durante
      14 días seguidos antes de poder publicar en producción (al escribir esto, 12 testers). Empieza
      a reclutar pronto: es lo que más retrasa un primer lanzamiento.
- [ ] Perfil de pagos / cuenta de comerciante para vender compras (confirma disponibilidad y datos fiscales para Panamá).
- [ ] Decidir el **appId** definitivo (hoy `com.firchain.hoomansvsai`): no se puede cambiar después.
- [ ] Comprobar que el nombre "Hoomans vs AI" no choca con una marca o un juego existente en Play.

## Requisitos técnicos
- [ ] AAB firmado (`docs/BUILD_ANDROID.md`), con Play App Signing activado.
- [ ] `targetSdk` al nivel que exija Google ese año (hoy el proyecto usa 36).
- [ ] Probado en al menos un teléfono de gama baja y uno moderno.
- [ ] Servicios falsos reemplazados por AdMob y Billing reales (`docs/MONETIZATION.md`).

## Política de privacidad (obligatoria por usar anuncios)
- [ ] Publicarla en una URL pública (GitHub Pages, Netlify o tu web) en español e inglés.
- [ ] Debe decir: quién eres y un correo de contacto; que el juego guarda el progreso solo en el
      dispositivo; que AdMob (Google) recoge el identificador de publicidad y datos de uso para
      mostrar anuncios; que las compras las procesa Google Play (y RevenueCat si lo usas); cómo
      pedir la eliminación de datos; que no está dirigido a menores de 13 años.
- [ ] Enlazarla en la ficha de Play y dentro del juego (botón en Ajustes — pendiente en `TASKS.md`).

## Formulario "Seguridad de los datos"
El juego por sí mismo no recopila nada; lo que declares depende de los SDK. Con AdMob normalmente:
- [ ] **ID de dispositivo u otros identificadores** — recopilado y compartido — publicidad, analíticas.
- [ ] **Interacciones con la app / diagnósticos** — según la guía de AdMob para este formulario.
- [ ] **Historial de compras** — si usas RevenueCat.
- [ ] Datos cifrados en tránsito: sí. Indicar cómo solicitar la eliminación.
- [ ] Usa las guías oficiales "Data safety" de AdMob y de RevenueCat para marcar exactamente lo que piden.

## Clasificación de contenido (cuestionario IARC)
Responde con la verdad; lo esperable para este juego:
- [ ] Violencia: sí, **de fantasía/ciencia ficción contra robots**, sin sangre ni gore, sin víctimas humanas.
- [ ] Sexo, lenguaje soez, drogas, apuestas, miedo intenso: no.
- [ ] Interacción entre usuarios y ubicación compartida: no. Compras digitales: sí.
- Resultado probable: Todos 10+ / PEGI 7. Si se añade contenido nuevo, hay que repetir el cuestionario.

## Público objetivo y anuncios
- [ ] Público objetivo: **13 años o más**. Incluir menores de 13 activa la política de Familias
      (SDK de anuncios certificados y más restricciones).
- [ ] Marcar "Contiene anuncios" y "Compras en la aplicación".
- [ ] **Consentimiento UMP** (Europa, Reino Unido, Suiza): crear el mensaje de consentimiento en
      AdMob → Privacidad y mensajería, mostrarlo al arrancar antes de cargar anuncios, y ofrecer en
      Ajustes la forma de cambiar la elección. Añadir también el mensaje para estados de EE. UU. si AdMob lo pide.

## Ficha de la tienda (español principal + inglés)
- [ ] **Ícono** 512×512 PNG. **Gráfico de funciones** 1024×500.
- [ ] **Capturas de teléfono**: mínimo 2 (recomendado 6–8), horizontales 16:9, p. ej. 1920×1080.
      Sugeridas: combate con muchos drones, jefe TUTELA, convoy en el puente, hackeo, Taller, Oleadas.
      Con arte final, no con los placeholders.
- [ ] Vídeo corto (opcional, ayuda a la conversión).
- [ ] Categoría: Juegos → Acción. Etiquetas: shooter, arcade.
- [ ] Correo de contacto público.

### Textos propuestos (ajústalos; máx. título 30, descripción breve 80, completa 4000 caracteres)
**ES — Título:** Hoomans vs AI: Shooter Arcade
**ES — Breve:** Shooter de doble stick: destruye robots y salva a la Resistencia. ¡Sin wifi!
**ES — Completa (borrador):**
> Las máquinas ganaron. Tú no te has rendido.
> Hoomans vs AI es un shooter arcade de doble stick con partidas de 2 a 4 minutos. Recorre las
> ruinas de la Bahía, destruye drones, torretas y mechs, y apaga a TUTELA, la inteligencia artificial
> que decidió "protegernos".
> • 6 misiones de campaña: sobrevive, escolta el convoy, hackea terminales y derrota jefes.
> • Modo Oleadas infinito: ¿hasta dónde llegas?
> • 4 armas y mejoras permanentes de daño, vida y velocidad.
> • Juega sin conexión. Gratis, sin muros de pago: los anuncios son opcionales y siempre dan recompensa.
> • En español e inglés.

Palabras clave ES (úsalas de forma natural, sin listas): shooter, juego de disparos, robots, doble
stick, arcade, oleadas, sin conexión, sin wifi, apocalipsis, inteligencia artificial, acción, jefes.

**EN — Title:** Hoomans vs AI: Arcade Shooter
**EN — Short:** Twin-stick shooter: smash robots and save the Resistance. Play offline!
**EN — Full (draft):**
> The machines won. You haven't given up.
> Hoomans vs AI is a twin-stick arcade shooter with 2–4 minute runs. Fight through the ruins of the
> Bay, destroy drones, turrets and mechs, and shut down TUTELA, the AI that decided to "protect" us.
> • 6 campaign missions: survive, escort the convoy, hack terminals, beat bosses.
> • Endless Waves mode. • 4 weapons and permanent upgrades. • Offline play.
> • Free with no paywalls: ads are optional and always rewarded. • English and Spanish.

Keywords EN: twin-stick shooter, top-down shooter, robots, arcade, wave survival, offline game, AI apocalypse, boss fights.

No menciones marcas ni películas ajenas en la ficha ("tipo Terminator", etc.): es motivo de rechazo.
"Sin conexión" solo es cierto para jugar; los anuncios y las compras necesitan internet.

## Lanzamiento
- [ ] Prueba interna → prueba cerrada (los 14 días) → producción con lanzamiento gradual (20 % → 100 %).
- [ ] Revisar fallos y ANR en Play Console durante la primera semana.
