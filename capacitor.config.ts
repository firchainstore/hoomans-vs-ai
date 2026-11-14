import type { CapacitorConfig } from '@capacitor/cli';
import cfg from './src/config/game.config.json';

const config: CapacitorConfig = {
  appId: cfg.appId,
  appName: cfg.name,
  webDir: 'dist',
  android: { backgroundColor: '#0d0b14' },
};
export default config;
