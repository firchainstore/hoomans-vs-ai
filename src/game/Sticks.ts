import Phaser from 'phaser';

const R = 52; // recorrido máximo del pulgar en px de juego
interface Stick { id: number; ox: number; oy: number; x: number; y: number; base: Phaser.GameObjects.Image; thumb: Phaser.GameObjects.Image }

/**
 * Doble stick virtual flotante: mitad izquierda = mover, mitad derecha = apuntar y disparar.
 * En escritorio (pruebas): WASD/flechas para mover, ratón para apuntar y disparar.
 */
export class Sticks {
  readonly move = new Phaser.Math.Vector2();
  readonly aim = new Phaser.Math.Vector2(1, 0);
  firing = false;
  private l: Stick; private r: Stick;
  private mouseDown = false;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor(private scene: Phaser.Scene) {
    const mk = (): Stick => ({
      id: -1, ox: 0, oy: 0, x: 0, y: 0,
      base: scene.add.image(0, 0, 'stick_base').setScrollFactor(0).setDepth(101).setVisible(false),
      thumb: scene.add.image(0, 0, 'stick_thumb').setScrollFactor(0).setDepth(102).setVisible(false),
    });
    this.l = mk(); this.r = mk();
    scene.input.addPointer(2);
    scene.input.on('pointerdown', this.down, this);
    scene.input.on('pointermove', this.moveP, this);
    scene.input.on('pointerup', this.up, this);
    this.keys = scene.input.keyboard?.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT') as Record<string, Phaser.Input.Keyboard.Key> | undefined;
  }

  private down(p: Phaser.Input.Pointer, over: unknown[]) {
    if (over.length) return; // tocó un botón del HUD
    if (!p.wasTouch) { this.mouseDown = true; return; }
    const s = p.x < this.scene.scale.width / 2 ? this.l : this.r;
    if (s.id !== -1) return;
    s.id = p.id; s.ox = s.x = p.x; s.oy = s.y = p.y;
    s.base.setPosition(p.x, p.y).setVisible(true);
    s.thumb.setPosition(p.x, p.y).setVisible(true);
  }
  private moveP(p: Phaser.Input.Pointer) {
    const s = this.l.id === p.id ? this.l : this.r.id === p.id ? this.r : null;
    if (s) { s.x = p.x; s.y = p.y; }
  }
  private up(p: Phaser.Input.Pointer) {
    if (!p.wasTouch) this.mouseDown = false;
    for (const s of [this.l, this.r]) if (s.id === p.id) this.release(s);
  }
  private release(s: Stick) { s.id = -1; s.base.setVisible(false); s.thumb.setVisible(false); }

  reset() { this.release(this.l); this.release(this.r); this.mouseDown = false; this.firing = false; this.move.set(0, 0); }

  private read(s: Stick, out: Phaser.Math.Vector2): number {
    if (s.id === -1) { out.set(0, 0); return 0; }
    out.set(s.x - s.ox, s.y - s.oy);
    const len = Math.min(out.length(), R);
    if (len > 0) out.setLength(len);
    s.thumb.setPosition(s.ox + out.x, s.oy + out.y);
    out.scale(1 / R);
    return len / R;
  }

  private tmp = new Phaser.Math.Vector2();
  update(playerX: number, playerY: number) {
    if (this.read(this.l, this.move) < 0.12) this.move.set(0, 0);
    const k = this.keys;
    if (k) {
      const kx = +(k.D.isDown || k.RIGHT.isDown) - +(k.A.isDown || k.LEFT.isDown);
      const ky = +(k.S.isDown || k.DOWN.isDown) - +(k.W.isDown || k.UP.isDown);
      if (kx || ky) this.move.set(kx, ky).normalize();
    }
    this.firing = false;
    if (this.read(this.r, this.tmp) > 0.2) {
      this.aim.copy(this.tmp).normalize(); this.firing = true;
    } else if (this.mouseDown) {
      const p = this.scene.input.activePointer;
      const w = this.scene.cameras.main.getWorldPoint(p.x, p.y, this.tmp);
      if (w.x !== playerX || w.y !== playerY) { this.aim.set(w.x - playerX, w.y - playerY).normalize(); this.firing = true; }
    }
  }
}
