import type { GameContext } from '../types';
import type { DeepReadonly } from '../types/contracts';
import type { AppSnapshot } from '../application/types';
import { SKINS } from '../application/skinCatalog';
import type { SkinConfig } from '../application/skinCatalog';
export { SKINS } from '../application/skinCatalog';
export type { SkinConfig } from '../application/skinCatalog';
import { CONSTANTS } from '../types';
import { eventBus } from '../core/eventBus';
import { audioEngine } from '../systems/audio';

export class UIManager {
  private container: HTMLElement;

  // DOM Elements
  private menuEl!: HTMLElement;
  private hudEl!: HTMLElement;
  private pausedEl!: HTMLElement;
  private gameOverEl!: HTMLElement;
  private shopEl!: HTMLElement;

  // Dynamic Content Elements
  private hudScoreEl!: HTMLElement;
  private hudCoinsEl!: HTMLElement;
  private hudSpeedFillEl!: HTMLElement;
  private hudSpeedTextEl!: HTMLElement;
  private hudBuffsEl!: HTMLElement;

  private menuHighScoreEl!: HTMLElement;
  private menuTotalCoinsEl!: HTMLElement;

  private goFinalScoreEl!: HTMLElement;
  private goCoinsEarnedEl!: HTMLElement;
  private goHighScoreEl!: HTMLElement;
  private goBadgeEl!: HTMLElement;

  private shopCoinsEl!: HTMLElement;
  private skinsGridEl!: HTMLElement;

  // Only the application owns wallet, rights and page state.
  private readApp: () => AppSnapshot;
  private shopFingerprint = '';
  private newRecordRunId: string | null = null;

  constructor(container: HTMLElement, readApp: () => AppSnapshot) {
    this.container = container;
    this.readApp = readApp;
    this.buildUI();
    this.setupGlobalEvents();
  }

  public getSelectedSkin(): SkinConfig {
    return SKINS.find(s => s.id === this.readApp().selectedSkinId) || SKINS[0];
  }

  public markNewRecord(runId: string): void { this.newRecordRunId = runId; }

  private setupGlobalEvents(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.readApp().appState === 'PLAYING' || this.readApp().appState === 'PAUSED') {
          eventBus.emit('TOGGLE_PAUSE');
        } else if (this.readApp().appState === 'SHOP') {
          eventBus.emit('GO_MENU');
        }
      }
    });
  }

  /**
   * 建立 UI 结构
   */
  private buildUI(): void {
    const existingUILayer = this.container.querySelector('#ui-layer');
    if (existingUILayer) {
      existingUILayer.remove();
    }

    const uiHTML = `
      <div id="ui-layer">
        
        <!-- HUD LAYER (PLAYING / PAUSED) -->
        <div id="hud-overlay" style="display: none;">
          <div class="hud-top-bar">
            <div class="hud-badge-group">
              <div class="hud-badge" aria-label="Score">
                <svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16"/></svg>
                <div class="hud-val-container">
                  <span class="hud-val-title">SCORE</span>
                  <span id="hud-score" class="hud-val">0</span>
                </div>
              </div>
              <div class="hud-badge" aria-label="Coins">
                <svg class="icon gold" aria-hidden="true" viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,4M11,16H13V18H11V16M12,6C13.66,6 15,7.34 15,9C15,10.66 14.12,11.53 13.06,12.44C12.33,13.08 12,13.67 12,14.5H12V15H10.5V14.5C10.5,13 11.5,12.18 12.44,11.36C13.19,10.71 13.5,10.27 13.5,9C13.5,8.17 12.83,7.5 12,7.5C11.17,7.5 10.5,8.17 10.5,9H9C9,7.34 10.34,6 12,6Z"/></svg>
                <div class="hud-val-container">
                  <span class="hud-val-title">COINS</span>
                  <span id="hud-coins" class="hud-val">0</span>
                </div>
              </div>
            </div>
            
            <div style="display: flex; gap: 8px;">
              <button id="audio-toggle-btn" class="pause-btn-hud" title="Toggle Sound" aria-label="Toggle sound">
                <svg aria-hidden="true" style="width: 20px; height: 20px; fill: currentColor;" viewBox="0 0 24 24"><path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16.02C15.5,15.29 16.5,13.77 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/></svg>
              </button>
              <button id="hud-pause-btn" class="pause-btn-hud" title="Pause Game (ESC)" aria-label="Pause game">
                <svg aria-hidden="true" style="width: 22px; height: 22px; fill: currentColor;" viewBox="0 0 24 24"><path d="M14,19H18V5H14M6,19H10V5H6V19Z"/></svg>
              </button>
            </div>
          </div>

          <!-- Speedometer -->
          <div class="speedometer-wrap">
            <div class="speed-info">
              <span>RUN SPEED</span>
              <span id="hud-speed-text" class="speed-val-text">18 KM/H</span>
            </div>
            <div class="speed-track">
              <div id="hud-speed-fill" class="speed-fill"></div>
            </div>
          </div>

          <!-- Active Buffs -->
          <div id="hud-buffs" class="buffs-wrap">
            <!-- Dynamic Buffs Injected Here -->
          </div>
        </div>

        <!-- MENU SCREEN -->
        <div id="menu-screen" class="ui-screen animate-pop" role="dialog" aria-label="Main menu" style="display: flex;">
          <div class="ui-card">
            <h1 class="cyber-title">SUBWAY SURFERS</h1>
            <div class="stats-row">
              <div class="stat-item">
                <span class="stat-label">BEST SCORE</span>
                <span id="menu-high-score" class="stat-val">0</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">TOTAL CREDITS</span>
                <span id="menu-total-coins" class="stat-val gold">0</span>
              </div>
            </div>
            
            <button id="start-btn" class="cyber-btn">START RUN</button>
            <button id="open-shop-btn" class="cyber-btn secondary-btn">SHOP & SKINS</button>
            
            <div class="controls-hint">
              <span><span class="key-cap">A</span><span class="key-cap">D</span> / <span class="key-cap">←</span><span class="key-cap">→</span> Move</span>
              <span><span class="key-cap">W</span> / <span class="key-cap">SPACE</span> Jump</span>
              <span><span class="key-cap">S</span> Roll</span>
              <span><span class="key-cap">ESC</span> Pause</span>
            </div>

            <div class="audio-settings" style="margin-top: 18px; padding: 12px 14px; border: 1px solid var(--panel-border); border-radius: 10px; background: rgba(0,0,0,0.25);">
              <div style="font-family: var(--font-display); font-size: 0.875rem; letter-spacing: 0.12em; color: var(--primary-cyan); margin-bottom: 10px;">AUDIO SETTINGS</div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <button id="bgm-toggle-btn" class="audio-toggle" style="min-width: 92px; text-align: center; padding: 6px 10px; font-family: var(--font-display); font-size: 0.875rem; letter-spacing: 0.06em; color: var(--text-main); background: rgba(0,243,255,0.08); border: 1px solid var(--panel-border); border-radius: 6px; cursor: pointer;">MUSIC</button>
                <input id="bgm-volume" type="range" min="0" max="100" step="1" aria-label="Background music volume" style="flex: 1; accent-color: var(--primary-cyan);">
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <button id="sfx-toggle-btn" class="audio-toggle" style="min-width: 92px; text-align: center; padding: 6px 10px; font-family: var(--font-display); font-size: 0.875rem; letter-spacing: 0.06em; color: var(--text-main); background: rgba(0,243,255,0.08); border: 1px solid var(--panel-border); border-radius: 6px; cursor: pointer;">SFX</button>
                <input id="sfx-volume" type="range" min="0" max="100" step="1" aria-label="Sound effects volume" style="flex: 1; accent-color: var(--primary-cyan);">
              </div>
            </div>
          </div>
        </div>

        <!-- PAUSED SCREEN -->
        <div id="paused-screen" class="ui-screen animate-pop" role="dialog" aria-label="Paused" style="display: none;">
          <div class="ui-card">
            <h1 class="cyber-title">PAUSED</h1>
            <p style="color: var(--text-muted); margin-bottom: 20px;">Game is currently paused.</p>
            <button id="resume-btn" class="cyber-btn">RESUME RUN</button>
            <button id="pause-restart-btn" class="cyber-btn secondary-btn">RESTART</button>
            <button id="pause-menu-btn" class="cyber-btn secondary-btn">MAIN MENU</button>
          </div>
        </div>

        <!-- GAME OVER SCREEN -->
        <div id="gameover-screen" class="ui-screen animate-pop" role="dialog" aria-label="Game over" style="display: none;">
          <div class="ui-card">
            <h1 class="cyber-title danger-title">GAME OVER</h1>
            <div id="go-new-record" class="new-record-badge" style="display: none;">NEW HIGH SCORE!</div>

            <div class="stats-row">
              <div class="stat-item">
                <span class="stat-label">FINAL SCORE</span>
                <span id="go-final-score" class="stat-val">0</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">COINS EARNED</span>
                <span id="go-coins-earned" class="stat-val gold">+0</span>
              </div>
            </div>

            <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 16px;">
              BEST RECORD: <span id="go-high-score" style="color: var(--primary-cyan); font-weight: bold;">0</span>
            </div>

            <button id="restart-btn" class="cyber-btn danger-btn">REBOOT & RUN AGAIN</button>
            <button id="go-shop-btn" class="cyber-btn secondary-btn">CYBER SHOP</button>
            <button id="go-menu-btn" class="cyber-btn secondary-btn">MAIN MENU</button>
          </div>
        </div>

        <!-- SHOP SCREEN -->
        <div id="shop-screen" class="ui-screen animate-pop" role="dialog" aria-label="Shop" style="display: none;">
          <div class="ui-card shop-card">
            <h1 class="cyber-title">CYBER SHOP</h1>
            <div style="font-size: 0.9rem; color: var(--text-muted);">
              AVAILABLE CREDITS: <span id="shop-coins" class="stat-val gold" style="font-size: 1.1rem;">0</span>
            </div>

            <div id="skins-grid" class="skins-grid">
              <!-- Rendered Dynamically -->
            </div>

            <button id="close-shop-btn" class="cyber-btn secondary-btn">BACK TO MENU</button>
          </div>
        </div>

      </div>
    `;
    this.container.insertAdjacentHTML('beforeend', uiHTML);

    // Query Elements
    this.menuEl = document.getElementById('menu-screen')!;
    this.hudEl = document.getElementById('hud-overlay')!;
    this.pausedEl = document.getElementById('paused-screen')!;
    this.gameOverEl = document.getElementById('gameover-screen')!;
    this.shopEl = document.getElementById('shop-screen')!;

    this.hudScoreEl = document.getElementById('hud-score')!;
    this.hudCoinsEl = document.getElementById('hud-coins')!;
    this.hudSpeedFillEl = document.getElementById('hud-speed-fill')!;
    this.hudSpeedTextEl = document.getElementById('hud-speed-text')!;
    this.hudBuffsEl = document.getElementById('hud-buffs')!;

    this.menuHighScoreEl = document.getElementById('menu-high-score')!;
    this.menuTotalCoinsEl = document.getElementById('menu-total-coins')!;

    this.goFinalScoreEl = document.getElementById('go-final-score')!;
    this.goCoinsEarnedEl = document.getElementById('go-coins-earned')!;
    this.goHighScoreEl = document.getElementById('go-high-score')!;
    this.goBadgeEl = document.getElementById('go-new-record')!;

    this.shopCoinsEl = document.getElementById('shop-coins')!;
    this.skinsGridEl = document.getElementById('skins-grid')!;

    // Bind Event Listeners
    let isTransitioning = false;
    const triggerRestart = (e: MouseEvent) => {
      (e.currentTarget as HTMLElement)?.blur();
      if (isTransitioning) return;
      isTransitioning = true;
      eventBus.emit('RESTART');
      setTimeout(() => { isTransitioning = false; }, 300);
    };

    document.getElementById('start-btn')?.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement)?.blur();
      if (isTransitioning) return;
      isTransitioning = true;
      eventBus.emit('START_GAME');
      setTimeout(() => { isTransitioning = false; }, 300);
    });

    document.getElementById('restart-btn')?.addEventListener('click', triggerRestart);
    document.getElementById('pause-restart-btn')?.addEventListener('click', triggerRestart);

    document.getElementById('hud-pause-btn')?.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement)?.blur();
      eventBus.emit('TOGGLE_PAUSE');
    });

    document.getElementById('audio-toggle-btn')?.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement)?.blur();
      eventBus.emit('TOGGLE_AUDIO');
    });

    // 监听任务完成 Toast 弹出 + 提示音
    eventBus.on('MISSION_COMPLETED', (payload: any) => {
      this.showToast(`MISSION COMPLETE: ${payload?.title} (+${payload?.reward} ¢)`);
      audioEngine.playMissionComplete();
    });

    document.getElementById('resume-btn')?.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement)?.blur();
      eventBus.emit('TOGGLE_PAUSE');
    });

    const openShop = (e: MouseEvent) => {
      (e.currentTarget as HTMLElement)?.blur();
      eventBus.emit('OPEN_SHOP');
    };

    document.getElementById('open-shop-btn')?.addEventListener('click', openShop);
    document.getElementById('go-shop-btn')?.addEventListener('click', openShop);

    const backToMenu = (e: MouseEvent) => {
      (e.currentTarget as HTMLElement)?.blur();
      eventBus.emit('GO_MENU');
    };

    document.getElementById('close-shop-btn')?.addEventListener('click', backToMenu);
    document.getElementById('pause-menu-btn')?.addEventListener('click', backToMenu);
    document.getElementById('go-menu-btn')?.addEventListener('click', backToMenu);

    this.bindAudioSettings();

    this.shopCoinsEl.textContent = this.readApp().walletCoins.toString();
    this.renderShop();
  }

  /**
   * 每帧更新 UI 状态与数值
   */
  public update(ctx: DeepReadonly<GameContext>): void {
    const app = this.readApp();
    const state = app.appState;
    this.menuEl.style.display = state === 'MENU' ? 'flex' : 'none';
    this.hudEl.style.display = state === 'PLAYING' || state === 'PAUSED' ? 'block' : 'none';
    this.pausedEl.style.display = state === 'PAUSED' ? 'flex' : 'none';
    this.gameOverEl.style.display = state === 'GAMEOVER' ? 'flex' : 'none';
    this.shopEl.style.display = state === 'SHOP' ? 'flex' : 'none';
    this.menuHighScoreEl.textContent = app.highScore.toString();
    this.menuTotalCoinsEl.textContent = app.walletCoins.toString();
    if (state === 'PLAYING' || state === 'PAUSED') {
      this.hudScoreEl.textContent = Math.floor(ctx.score).toString();
      this.hudCoinsEl.textContent = ctx.coins.toString();

      // Speedometer 计算
      const speedPct = Math.min(
        100,
        Math.max(
          0,
          ((ctx.speed - CONSTANTS.BASE_SPEED) / (CONSTANTS.MAX_SPEED - CONSTANTS.BASE_SPEED)) * 100
        )
      );
      this.hudSpeedFillEl.style.width = `${speedPct.toFixed(1)}%`;
      this.hudSpeedTextEl.textContent = `${Math.floor(ctx.speed)} KM/H`;

      // Buffs 渲染
      this.renderBuffs(ctx);
    }

    if (state === 'GAMEOVER') {
      this.goFinalScoreEl.textContent = String(app.summary?.scoreInt ?? Math.floor(ctx.score));
      this.goCoinsEarnedEl.textContent = '+' + (app.summary?.earnedCoins ?? ctx.coins);
      this.goHighScoreEl.textContent = String(app.highScore);
      this.goBadgeEl.style.display = app.summary?.runId === this.newRecordRunId ? 'inline-block' : 'none';
    }
    this.shopCoinsEl.textContent = app.walletCoins.toString();
    const shopFingerprint = JSON.stringify([app.walletCoins, app.ownedSkinIds, app.selectedSkinId]);
    if (this.shopFingerprint !== shopFingerprint) {
      this.shopFingerprint = shopFingerprint;
      this.renderShop(app);
    }
    this.renderAudioControls();
  }

  /**
   * 渲染 Active PowerUps (Buffs)
   */
  private renderBuffs(ctx: DeepReadonly<GameContext>): void {
    let html = '';

    if (ctx.player.hoverboardActive) {
      html += `
        <div class="buff-pill">
          <svg aria-hidden="true" style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="M19,13H5V11H19V13Z"/></svg>
          <span>HOVERBOARD ACTIVE</span>
        </div>
      `;
    }

    if (ctx.player.activePowerUps) {
      ctx.player.activePowerUps.forEach((timer, type) => {
        if (timer > 0) {
          html += `
            <div class="buff-pill">
              <span>${type}</span>
              <span style="font-size: 0.875rem; opacity: 0.8;">(${timer.toFixed(1)}s)</span>
            </div>
          `;
        }
      });
    }

    this.hudBuffsEl.innerHTML = html;
  }

  /**
   * 渲染 Shop 皮肤列表
   */
  private renderShop(app: AppSnapshot = this.readApp()): void {
    let html = '';

    SKINS.forEach((skin) => {
      const isUnlocked = app.ownedSkinIds.includes(skin.id);
      const isSelected = app.selectedSkinId === skin.id;

      let btnText = 'EQUIP';
      let btnClass = 'cyber-btn skin-action-btn';
      let isDisabled = false;

      if (isSelected) {
        btnText = 'EQUIPPED';
        btnClass += ' secondary-btn disabled';
        isDisabled = true;
      } else if (!isUnlocked) {
        const canAfford = app.walletCoins >= skin.price;
        btnText = `BUY [${skin.price} ¢]`;
        btnClass += canAfford ? '' : ' secondary-btn disabled';
        isDisabled = !canAfford;
      }

      html += `
        <div class="skin-item ${isSelected ? 'selected' : ''}">
          <div class="skin-preview-circle" style="background: radial-gradient(circle at 30% 30%, ${skin.color}, ${skin.secondaryColor});"></div>
          <div class="skin-title">${skin.name}</div>
          <div class="skin-desc">${skin.description}</div>
          <button data-skin-id="${skin.id}" class="${btnClass}" ${isDisabled ? 'disabled' : ''}>
            ${btnText}
          </button>
        </div>
      `;
    });

    this.skinsGridEl.innerHTML = html;

    // 绑定 Skin 按钮点击
    this.skinsGridEl.querySelectorAll('button[data-skin-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const skinId = target.getAttribute('data-skin-id');
        if (!skinId) return;

        this.handleSkinAction(skinId);
      });
    });
  }

  /**
   * 处理皮肤解锁或装备
   */
  private handleSkinAction(skinId: string): void {
    eventBus.emit(this.readApp().ownedSkinIds.includes(skinId) ? 'EQUIP_SKIN' : 'BUY_SKIN', { skinId });
  }

  private bindAudioSettings(): void {
    document.getElementById('bgm-toggle-btn')?.addEventListener('click', () => {
      eventBus.emit('SET_AUDIO', { ...this.readApp().audio, bgmEnabled: !this.readApp().audio.bgmEnabled });
    });
    document.getElementById('sfx-toggle-btn')?.addEventListener('click', () => {
      eventBus.emit('SET_AUDIO', { ...this.readApp().audio, sfxEnabled: !this.readApp().audio.sfxEnabled });
    });
    for (const [id, field] of [['bgm-volume', 'bgmVolume'], ['sfx-volume', 'sfxVolume']] as const) {
      document.getElementById(id)?.addEventListener('input', e => {
        eventBus.emit('SET_AUDIO', { ...this.readApp().audio, [field]: Number((e.currentTarget as HTMLInputElement).value) / 100 });
      });
    }
    this.renderAudioControls();
  }

  private renderAudioControls(): void {
    const audio = this.readApp().audio;
    const bgm = document.getElementById('bgm-toggle-btn');
    const sfx = document.getElementById('sfx-toggle-btn');
    if (bgm) bgm.textContent = 'MUSIC: ' + (audio.bgmEnabled ? 'ON' : 'OFF');
    if (sfx) sfx.textContent = 'SFX: ' + (audio.sfxEnabled ? 'ON' : 'OFF');
    const bgmVolume = document.getElementById('bgm-volume') as HTMLInputElement | null;
    const sfxVolume = document.getElementById('sfx-volume') as HTMLInputElement | null;
    // Focused ranges keep their native editing draft while persistence is pending.
    if (bgmVolume && document.activeElement !== bgmVolume) bgmVolume.value = String(Math.round(audio.bgmVolume * 100));
    if (sfxVolume && document.activeElement !== sfxVolume) sfxVolume.value = String(Math.round(audio.sfxVolume * 100));
  }

  /**
   * 动态显示 Cyber 风格任务 Toast 通知
   */
  public showToast(message: string): void {
    const existing = this.container.querySelectorAll('.cyber-toast');
    const offsetTop = 80 + existing.length * 48;

    const toast = document.createElement('div');
    toast.className = 'cyber-toast animate-pop';
    toast.style.top = `${offsetTop}px`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      <svg aria-hidden="true" style="width:20px;height:20px;fill:#ffd700;" viewBox="0 0 24 24"><path d="M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16"/></svg>
      <span>${message}</span>
    `;
    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }
}
