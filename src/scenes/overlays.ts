import Phaser from 'phaser';
import { completeMission, recordEndless } from '../core/Economy';
import { CAMPAIGNS, missionDef } from '../core/data';
import { sfx } from '../game/Sfx';
import { t } from '../i18n/i18n';
import { ads, saves } from '../services';
import type { GameData, GameScene, ResultData } from './GameScene';
import { COLORS, TEXT, button, label } from './ui';

function dim(scene: Phaser.Scene) {
  const { width, height } = scene.scale;
  scene.add.rectangle(0, 0, width, height, COLORS.bg, 0.78).setOrigin(0).setInteractive(); // bloquea toques al juego
  return { cx: width / 2, cy: height / 2 };
}
function leave(scene: Phaser.Scene, to: string, data?: object) {
  scene.scene.stop('Game');
  scene.scene.start(to, data);
}

export class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }
  create(data: GameData) {
    const { cx, cy } = dim(this);
    label(this, cx, cy - 150, t('pause.title'), 36, TEXT.accent).setFontStyle('bold');
    button(this, cx, cy - 70, t('pause.resume'), () => { this.scene.stop(); this.scene.resume('Game'); });
    button(this, cx, cy - 6, t('pause.restart'), () => leave(this, 'Game', data));
    const snd = () => t(saves.data.settings.sound ? 'settings.sound_on' : 'settings.sound_off');
    const b = button(this, cx, cy + 58, snd(), () => {
      saves.data.settings.sound = sfx.enabled = !saves.data.settings.sound; saves.save();
      (b.list[1] as Phaser.GameObjects.Text).setText(snd());
    });
    button(this, cx, cy + 122, t('pause.quit'), () => leave(this, 'Menu'));
  }
}

/** Fin de partida: ofrece continuar (anuncio) si murió, luego resumen + duplicar monedas (anuncio). */
export class ResultScene extends Phaser.Scene {
  private d!: ResultData;
  constructor() { super('Result'); }

  create(data: ResultData) {
    this.d = data;
    if (data.canContinue && ads.isRewardedReady()) this.continuePrompt(); else this.summary();
  }

  /** Anuncio con recompensa. Con "Quitar anuncios" comprado, la recompensa se da directamente. */
  private async reward(placement: 'continue' | 'double_coins'): Promise<boolean> {
    if (saves.data.purchases.removeAds) return true;
    this.input.enabled = false;
    const ok = await ads.showRewarded(placement);
    this.input.enabled = true;
    return ok;
  }

  private continuePrompt() {
    const { cx, cy } = dim(this);
    label(this, cx, cy - 110, t('result.down'), 36, TEXT.danger).setFontStyle('bold');
    label(this, cx, cy - 60, t('result.continue_q'), 18, TEXT.dim);
    const adTag = saves.data.purchases.removeAds ? '' : ` ${t('result.ad_tag')}`;
    button(this, cx, cy + 10, t('result.continue') + adTag, async () => {
      if (await this.reward('continue')) { (this.scene.get('Game') as GameScene).revive(); this.scene.stop(); }
      else this.scene.restart({ ...this.d, canContinue: false });
    }, { w: 360, fill: 0x3a2c18 });
    button(this, cx, cy + 80, t('result.no_thanks'), () => this.scene.restart({ ...this.d, canContinue: false }), { w: 360 });
  }

  private summary() {
    const d = this.d, save = saves.data;
    const { cx, cy } = dim(this);
    let record = false;
    save.coins += d.coins;
    if (d.mode === 'mission' && d.won) completeMission(save, d.missionId!);
    if (d.mode === 'endless') record = recordEndless(save, d.wave, d.score);
    saves.save();

    const title = d.mode === 'endless' ? t('result.endless_over') : t(d.won ? 'result.won' : 'result.lost');
    label(this, cx, cy - 170, title, 38, d.won ? TEXT.accent : TEXT.danger).setFontStyle('bold');
    if (d.mode === 'endless') {
      label(this, cx, cy - 118, t('result.endless_stats', { n: d.wave, s: d.score }), 20);
      if (record) label(this, cx, cy - 88, t('result.record'), 18, TEXT.machine);
    } else label(this, cx, cy - 118, t(missionDef(d.missionId!).nameKey), 20, TEXT.dim);
    const coinsLbl = label(this, cx, cy - 46, t('result.coins', { n: d.coins }), 26, TEXT.accent);

    let y = cy + 20;
    if (d.coins > 0 && ads.isRewardedReady()) {
      const adTag = save.purchases.removeAds ? '' : ` ${t('result.ad_tag')}`;
      const dbl = button(this, cx, y, t('result.double') + adTag, async () => {
        dbl.destroy();
        if (!(await this.reward('double_coins'))) return;
        save.coins += d.coins; saves.save();
        coinsLbl.setText(t('result.coins', { n: d.coins * 2 }));
        sfx.play('pickup');
      }, { w: 360, fill: 0x3a2c18 });
      y += 64;
    }
    const camp = CAMPAIGNS.find((c) => c.missions.includes(d.missionId ?? ''));
    const next = d.won && camp ? camp.missions[camp.missions.indexOf(d.missionId!) + 1] : undefined;
    if (next) button(this, cx, y, t('result.next'), () => leave(this, 'Game', { mode: 'mission', missionId: next }), { w: 360 });
    else button(this, cx, y, t('result.retry'), () => leave(this, 'Game', { mode: d.mode, missionId: d.missionId }), { w: 360 });
    button(this, cx, y + 64, t('result.menu'), () => leave(this, d.mode === 'mission' ? 'Missions' : 'Menu'), { w: 360 });
  }
}
