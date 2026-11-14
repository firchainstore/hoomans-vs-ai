import { defineConfig } from 'vite';
import cfg from './src/config/game.config.json';

// base './' es obligatorio para Capacitor (carga desde file/https local).
export default defineConfig({
  base: './',
  plugins: [{
    name: 'inject-game-name',
    transformIndexHtml: (html) => html.replaceAll('%GAME_NAME%', cfg.name),
  }],
  build: { target: 'es2020', chunkSizeWarningLimit: 2000 },
  test: { include: ['tests/**/*.test.ts'] },
});
