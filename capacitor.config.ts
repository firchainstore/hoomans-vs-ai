import type { CapacitorConfig } from '@capacitor/cli';
import { readFileSync } from 'node:fs';

// Nombre y appId salen del único archivo de configuración del juego.
const cfg = JSON.parse(readFileSync('./src/config/game.config.json', 'utf8'));

const config: CapacitorConfig = {
  appId: cfg.appId,
  appName: cfg.name,
  webDir: 'dist',
  android: { backgroundColor: '#0d0b14' },
};
export default config;
