import Phaser from 'phaser';
import cfg from '../config/game.config.json';
import { applyPurchase, buyUpgrade, buyWeapon, equipWeapon, missionUnlocked, upgradeCost } from '../core/Economy';
import { CAMPAIGNS, PRODUCTS, SKINS, UPGRADES, WEAPONS, missionDef, productDef, skinDef } from '../core/data';
import { sfx } from '../game/Sfx';
import { buildTextures } from '../game/textures';
import { nextLang, setLang, t } from '../i18n/i18n';
import { ads, purchases, saves } from '../services';
import { COLORS, TEXT, button, label, menuFrame } from './ui';

const coinsLabel = (s: Phaser.Scene) => label(s, s.scale.width - 24, 36, `◆ ${saves.data.coins}`, 22, TEXT.accent).setOrigin(1, 0.5);

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  // preload(): aquí se cargarán sprites y audio reales (ver public/assets/README.md).
  create() {
    buildTextures(this);
    setLang(saves.data.settings.lang);
    sfx.enabled = saves.data.settings.sound;
    // Servicios en segundo plano: el menú no espera a la red.
    void ads.init();
    void purchases.init().then(() => purchases.restore()).then((owned) => {
      for (const id of owned) applyPurchase(saves.data, productDef(id));
      saves.save();
    }).catch(() => undefined);
    this.scene.start('Menu');
  }
}

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }
  create() {
    const { width, height } = this.scale, cx = width / 2;
    menuFrame(this, '', undefined, 0.3);
    coinsLabel(this);
    // Título partido en dos colores: la primera palabra (humanos) en ámbar, el resto (máquinas) en cian.
    const [first, ...rest] = cfg.name.split(' ');
    const a = label(this, 0, 0, first.toUpperCase(), 54, TEXT.accent).setFontStyle('bold').setOrigin(0, 0.5).setShadow(0, 0, '#ff8a3d', 18, false, true);
    const b = label(this, a.width + 14, 0, rest.join(' ').toUpperCase(), 54, TEXT.machine).setFontStyle('bold').setOrigin(0, 0.5).setShadow(0, 0, '#35e0ff', 18, false, true);
    this.add.container(cx - (a.width + 14 + b.width) / 2, 78, [a, b]);
    label(this, cx, 124, t('menu.tagline'), 17, TEXT.dim);
    const s = saves.data, col = Math.min(170, width * 0.18);
    button(this, cx, 196, t('menu.campaign'), () => this.scene.start('Missions'), { w: 340, h: 60, size: 24, fill: 0x3a2c18 });
    const best = s.bestScore ? `  ·  ${t('menu.best', { n: s.bestWave, s: s.bestScore })}` : '';
    button(this, cx, 270, t('menu.endless') + best, () => this.scene.start('Game', { mode: 'endless' }), { w: 340, h: 56 });
    button(this, cx - col / 2 - 4, 340, t('menu.workshop'), () => this.scene.start('Workshop'), { w: 166 });
    button(this, cx + col / 2 + 4, 340, t('menu.store'), () => this.scene.start('Store'), { w: 166 });
    button(this, cx, 404, t('menu.settings'), () => this.scene.start('Settings'), { w: 340 });
    label(this, cx, height - 20, `v${cfg.version}`, 13, TEXT.dim);
  }
}

export class MissionsScene extends Phaser.Scene {
  constructor() { super('Missions'); }
  create() {
    const { width, height } = this.scale;
    const camp = CAMPAIGNS.find((c) => c.active)!;
    menuFrame(this, t(camp.nameKey), 'Menu');
    const cw = Math.min(290, (width - 60) / 3), ch = 150, x0 = width / 2 - cw;
    camp.missions.forEach((id, i) => {
      const m = missionDef(id), open = missionUnlocked(saves.data, camp, id), done = saves.data.completed.includes(id);
      const x = x0 + (i % 3) * cw, y = 150 + Math.floor(i / 3) * (ch + 12);
      const card = this.add.rectangle(x, y, cw - 12, ch, open ? COLORS.panelHi : COLORS.panel)
        .setStrokeStyle(2, done ? COLORS.ok : open ? COLORS.accent : 0x4a4460);
      label(this, x, y - 48, `${i + 1}. ${t(m.nameKey)}`, 20, open ? TEXT.accent : TEXT.dim).setFontStyle('bold');
      label(this, x, y + 4, open ? t(m.briefKey) : t('missions.locked'), 14, open ? TEXT.main : TEXT.dim, cw - 36);
      label(this, x, y + 56, done ? `✔ ${t('missions.done')}` : `◆ ${m.reward}`, 14, done ? '#7ee081' : TEXT.dim);
      if (open) card.setInteractive({ useHandCursor: true }).on('pointerup', () => { sfx.play('ui'); this.scene.start('Game', { mode: 'mission', missionId: id }); });
    });
    // Campañas inactivas (datos preparados para una actualización): solo un aviso.
    CAMPAIGNS.filter((c) => !c.active).forEach((c, i) =>
      label(this, width / 2, height - 60 + i * 22, `🔒 ${t(c.nameKey)} — ${t('missions.soon')}`, 16, TEXT.machine));
  }
}

/** Taller: mejoras permanentes, armas y aspecto. Todo se paga con monedas del juego. */
export class WorkshopScene extends Phaser.Scene {
  constructor() { super('Workshop'); }
  create() {
    const { width } = this.scale, s = saves.data;
    menuFrame(this, t('workshop.title'), 'Menu');
    coinsLabel(this);
    const act = (fn: () => boolean) => () => { if (fn()) { saves.save(); sfx.play('pickup'); this.scene.restart(); } };
    const lx = width * 0.26, rx = width * 0.74, colW = width * 0.44;

    label(this, lx, 92, t('workshop.upgrades'), 18, TEXT.machine);
    UPGRADES.forEach((u, i) => {
      const y = 150 + i * 84, lvl = s.upgrades[u.id] ?? 0, cost = upgradeCost(u, lvl);
      this.add.rectangle(lx, y, colW, 72, COLORS.panel).setStrokeStyle(1, 0x4a4460);
      label(this, lx - colW / 2 + 16, y - 12, t(u.nameKey), 18).setOrigin(0, 0.5);
      label(this, lx - colW / 2 + 16, y + 14, '■'.repeat(lvl) + '□'.repeat(u.maxLevel - lvl), 16, TEXT.accent).setOrigin(0, 0.5);
      button(this, lx + colW / 2 - 76, y, cost === null ? t('workshop.max') : `◆ ${cost}`, act(() => buyUpgrade(s, u)),
        { w: 130, h: 46, size: 18, enabled: cost !== null && s.coins >= cost });
    });
    const skin = skinDef(s.skin);
    this.add.image(lx - colW / 2 + 30, 420, `player_${skin.id}`).setScale(0.8);
    label(this, lx - colW / 2 + 60, 420, `${t('workshop.skin')}: ${t(skin.nameKey)}`, 17).setOrigin(0, 0.5);
    button(this, lx + colW / 2 - 76, 420, t('workshop.change'), act(() => {
      const owned = SKINS.filter((k) => s.skins.includes(k.id));
      s.skin = owned[(owned.findIndex((k) => k.id === s.skin) + 1) % owned.length].id;
      return true;
    }), { w: 130, h: 46, size: 18, enabled: s.skins.length > 1 });

    label(this, rx, 92, t('workshop.weapons'), 18, TEXT.machine);
    WEAPONS.forEach((w, i) => {
      const y = 150 + i * 84, owned = s.weapons.includes(w.id), eq = s.equipped === w.id;
      this.add.rectangle(rx, y, colW, 72, COLORS.panel).setStrokeStyle(eq ? 2 : 1, eq ? COLORS.accent : 0x4a4460);
      label(this, rx - colW / 2 + 16, y - 14, t(w.nameKey), 18).setOrigin(0, 0.5);
      label(this, rx - colW / 2 + 16, y + 13, t(w.descKey), 13, TEXT.dim, colW - 190).setOrigin(0, 0.5).setAlign('left');
      const text = eq ? t('workshop.equipped') : owned ? t('workshop.equip') : `◆ ${w.cost}`;
      button(this, rx + colW / 2 - 76, y, text, act(() => (owned ? equipWeapon(s, w.id) : buyWeapon(s, w) && equipWeapon(s, w.id))),
        { w: 130, h: 46, size: 17, enabled: !eq && (owned || s.coins >= w.cost) });
    });
  }
}

/** Tienda de dinero real (PurchaseService). Nada aquí es necesario para terminar el juego. */
export class StoreScene extends Phaser.Scene {
  constructor() { super('Store'); }
  async create() {
    const { width } = this.scale, s = saves.data, cx = width / 2;
    menuFrame(this, t('store.title'), 'Menu');
    label(this, cx, 84, t('store.note'), 15, TEXT.dim, width * 0.8);
    const grant = (id: string) => { applyPurchase(s, productDef(id)); saves.save(); };
    const prices = new Map((await purchases.getProducts().catch(() => [])).map((p) => [p.id, p.price]));
    if (!this.scene.isActive()) return; // el usuario salió mientras cargaban los precios
    PRODUCTS.forEach((p, i) => {
      const y = 170 + i * 110, owned = s.purchases.owned.includes(p.id), w = Math.min(640, width - 80);
      this.add.rectangle(cx, y, w, 96, COLORS.panel).setStrokeStyle(1, owned ? COLORS.ok : COLORS.accent);
      label(this, cx - w / 2 + 20, y - 20, t(p.nameKey), 20, TEXT.accent).setOrigin(0, 0.5);
      label(this, cx - w / 2 + 20, y + 16, t(p.descKey), 14, TEXT.main, w - 220).setOrigin(0, 0.5).setAlign('left');
      button(this, cx + w / 2 - 90, y, owned ? t('store.owned') : prices.get(p.id) ?? '—', async () => {
        if (await purchases.purchase(p.id)) { grant(p.id); sfx.play('pickup'); this.scene.restart(); }
      }, { w: 150, enabled: !owned && prices.has(p.id) });
    });
    button(this, cx, 170 + PRODUCTS.length * 110, t('store.restore'), async () => {
      (await purchases.restore()).forEach(grant);
      this.scene.restart();
    }, { w: 300, h: 46, size: 17 });
  }
}

export class SettingsScene extends Phaser.Scene {
  private confirmReset = false;
  constructor() { super('Settings'); }
  init(data: { confirm?: boolean }) { this.confirmReset = !!data.confirm; }
  create() {
    const cx = this.scale.width / 2, s = saves.data.settings;
    menuFrame(this, t('settings.title'), 'Menu');
    button(this, cx, 140, t(s.sound ? 'settings.sound_on' : 'settings.sound_off'), () => {
      s.sound = sfx.enabled = !s.sound; saves.save(); this.scene.restart();
    }, { w: 360 });
    button(this, cx, 210, t('settings.language'), () => {
      s.lang = nextLang(); setLang(s.lang); saves.save(); this.scene.restart();
    }, { w: 360 });
    button(this, cx, 310, t(this.confirmReset ? 'settings.reset_confirm' : 'settings.reset'), () => {
      if (this.confirmReset) saves.reset();
      this.scene.restart({ confirm: !this.confirmReset });
    }, { w: 360, color: TEXT.danger });
    label(this, cx, 400, t('settings.credits'), 14, TEXT.dim);
  }
}
