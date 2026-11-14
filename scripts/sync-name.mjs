// Copia el nombre del juego de src/config/game.config.json al proyecto Android (strings.xml).
// El appId NO se sincroniza aquí: cambiarlo implica renombrar el paquete Java (ver docs/BUILD_ANDROID.md).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const { name } = JSON.parse(readFileSync('src/config/game.config.json', 'utf8'));
const file = 'android/app/src/main/res/values/strings.xml';
if (!existsSync(file)) { console.log('Sin proyecto Android: nada que sincronizar.'); process.exit(0); }
const esc = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, "\\'");
const xml = readFileSync(file, 'utf8').replace(/(<string name="(?:app_name|title_activity_main)">)[^<]*(<)/g, `$1${esc}$2`);
writeFileSync(file, xml);
console.log(`Nombre Android actualizado: ${name}`);
