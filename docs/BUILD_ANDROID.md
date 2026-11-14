# Compilar para Android (lo haces tú en tu computador)

En el entorno donde se escribió el juego no hay Android SDK: **el APK/AAB nunca se ha compilado.**
La primera vez puede aparecer algún error de Gradle; anótalo y pásaselo a Claude.

## 1. Instalar una sola vez
1. **Node.js 22 LTS** — https://nodejs.org
2. **Android Studio** (incluye el JDK y el SDK) — https://developer.android.com/studio
   Al abrirlo por primera vez acepta instalar *Android SDK*, *SDK Platform* y *Build-Tools*.
   El proyecto pide `compileSdk 36` y `minSdk 24` (Android 7.0); si falta, Android Studio ofrece instalarlo.
3. Clona el repositorio y entra en la carpeta.

## 2. Probar en el navegador
```bash
npm install
```
```bash
npm run dev
```
Abre la URL que muestra. En Chrome: F12 → icono de móvil para simular pantalla táctil horizontal.

## 3. Pasar el juego al proyecto Android
```bash
npm run android:sync
```
Hace `npm run build`, copia el nombre del juego a Android y ejecuta `npx cap sync android`.
**Repítelo cada vez que cambie el código del juego.**

## 4. Probar en un teléfono
```bash
npm run android:open
```
Se abre Android Studio. Conecta tu teléfono por USB con *Depuración USB* activada (Ajustes → Acerca
del teléfono → toca 7 veces "Número de compilación" → Opciones de desarrollador) y pulsa ▶ **Run**.
Prueba sobre todo en un teléfono de gama media-baja: fluidez, sticks, textos legibles, pantalla completa.

## 5. Crear la clave de firma (una sola vez, ¡guárdala!)
En Android Studio: **Build → Generate Signed App Bundle or APK… → Android App Bundle → Create new…**
- Guarda el archivo `.jks` FUERA del repositorio y haz copia de seguridad (nube + USB).
- Anota contraseñas y alias en un gestor de contraseñas.
- Al subir a Play acepta **Play App Signing**: Google custodia la clave final y la tuya es solo de
  subida, así que si la pierdes se puede restablecer.
- Nunca subas `.jks` ni contraseñas a git (`.gitignore` ya los excluye).

## 6. Generar el AAB firmado
1. Sube la versión en `android/app/build.gradle`: `versionCode` (entero, +1 en CADA subida) y
   `versionName` (lo que ve el usuario, p. ej. "1.0.0"). Mantén igual `version` en `src/config/game.config.json`.
2. `npm run android:sync`
3. **Build → Generate Signed App Bundle or APK… → Android App Bundle → release**.
4. El archivo queda en `android/app/release/app-release.aab`. Ese es el que se sube a Play Console.

Alternativa por terminal (tras configurar la firma en Gradle): `cd android && ./gradlew bundleRelease`.

## Cambiar el nombre o el identificador
- **Nombre**: edita `name` en `src/config/game.config.json` y ejecuta `npm run android:sync`.
- **appId** (`com.firchain.hoomansvsai`): decídelo ANTES de la primera subida; después es permanente.
  Para cambiarlo: edita `appId` en `game.config.json`, borra la carpeta `android/`, ejecuta
  `npx cap add android` y vuelve a aplicar los dos ajustes manuales de abajo.

## Ajustes manuales ya aplicados en `android/`
- `AndroidManifest.xml`: `android:screenOrientation="sensorLandscape"` (siempre horizontal).
- `MainActivity.java`: pantalla completa inmersiva (escrito sin compilar; si da error, se puede
  dejar la clase vacía `public class MainActivity extends BridgeActivity {}` y el juego funciona con barras).

## Pendiente antes de publicar
Ícono y pantalla de carga propios (`npm i -D @capacitor/assets`, ver su documentación), integrar
anuncios y compras (`docs/MONETIZATION.md`) y todo lo de `docs/PLAYSTORE.md`.
