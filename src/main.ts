import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { BootScene, MenuScene, MissionsScene, SettingsScene, StoreScene, WorkshopScene } from './scenes/menus';
import { PauseScene, ResultScene } from './scenes/overlays';

// Alto lógico fijo (540) y ancho según la pantalla: sin barras negras en móviles 16:9 a 21:9.
const HEIGHT = 540;
const ratio = Math.max(window.innerWidth, window.innerHeight) / Math.max(1, Math.min(window.innerWidth, window.innerHeight));
const WIDTH = Math.round(HEIGHT * Phaser.Math.Clamp(ratio, 16 / 10, 21.5 / 9));

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0d0b14',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: WIDTH, height: HEIGHT },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  render: { powerPreference: 'high-performance', antialias: true },
  input: { activePointers: 3 },
  scene: [BootScene, MenuScene, MissionsScene, WorkshopScene, StoreScene, SettingsScene, GameScene, PauseScene, ResultScene],
});
// Para depuración y para scripts/smoke.mjs.
(window as unknown as { __GAME__: Phaser.Game }).__GAME__ = game;
