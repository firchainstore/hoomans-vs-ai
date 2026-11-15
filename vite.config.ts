import { defineConfig } from 'vitest/config';
import cfg from './src/config/game.config.json';

// base './' es obligatorio para Capacitor (carga desde file/https local).
export default defineConfig({
  base: './',
  plugins: [{
    name: 'inject-game-name',
    transformIndexHtml: (html) => html.split('%GAME_NAME%').join(cfg.name),
  }],
  build: { target: 'es2020', chunkSizeWarningLimit: 2000, rollupOptions: { input: ['index.html', 'fps.html'] } },
  test: { include: ['tests/**/*.test.ts'] },
});
