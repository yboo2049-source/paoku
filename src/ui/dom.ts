import { screens } from './views/screens';
import { speedLabel, powerUps, ToastQueue, Receipts, InteractionScope, errorLabel } from './views/models';
import type { PendingReceipt } from './views/models';
import type { CommandResult } from '../application/types';
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
  private receipts = new Receipts();
  private interactionScope = new InteractionScope();
  private toasts = new ToastQueue();
  private lastPage = '';
  private lastRun: string | null = null;
  private sequence = 0;
  private requests = new Map<string, {event:string; payload:Record<string,unknown>; key:string}>();
  private retries = new Map<string, {event:string; payload:Record<string,unknown>; key:string}>();
  private shopFingerprint = '';
  private newRecordRunId: string | null = null;

  constructor(container: HTMLElement, readApp: () => AppSnapshot) {
    this.container = container;
    this.readApp = readApp;
    this.buildUI();
    this.setupGlobalEvents();
    const readings=document.createElement('div');readings.className='hud-readings';
    const badges=this.hudEl.querySelector('.hud-badge-group')!;badges.replaceWith(readings);readings.append(badges,this.hudEl.querySelector('.speedometer-wrap')!);
    this.setupFocus();
    const feedback=document.createElement('div');feedback.className='hud-feedback';feedback.innerHTML='<div class="command-feedback" role="status"></div><div class="command-error" role="alert"></div>';this.hudEl.append(feedback);
  }

  public getSelectedSkin(): SkinConfig {
    return SKINS.find(s => s.id === this.readApp().selectedSkinId) || SKINS[0];
  }

  public markNewRecord(runId: string): void { this.newRecordRunId = runId; }

  private setupGlobalEvents(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.readApp().appState === 'PLAYING' || this.readApp().appState === 'PAUSED') {
          this.intent('TOGGLE_PAUSE');
        } else if (this.readApp().appState === 'SHOP') {
          this.intent('GO_MENU');
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

    this.container.insertAdjacentHTML('beforeend', screens);

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
      this.intent('RESTART');
      setTimeout(() => { isTransitioning = false; }, 300);
    };

    document.getElementById('start-btn')?.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement)?.blur();
      if (isTransitioning) return;
      isTransitioning = true;
      this.intent('START_GAME');
      setTimeout(() => { isTransitioning = false; }, 300);
    });

    document.getElementById('restart-btn')?.addEventListener('click', triggerRestart);
    document.getElementById('pause-restart-btn')?.addEventListener('click', triggerRestart);

    document.getElementById('hud-pause-btn')?.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement)?.blur();
      this.intent('TOGGLE_PAUSE');
    });

    document.getElementById('audio-toggle-btn')?.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement)?.blur();
      this.intent('UPDATE_AUDIO', {kind:'TOGGLE',field:'masterMuted'});
    });

    // 监听任务完成 Toast 弹出 + 提示音
    eventBus.on('MISSION_COMPLETED', (payload: any) => {
      this.showToast(`任务完成：${payload?.title}（本局奖励 +${payload?.reward}）`);
      audioEngine.playMissionComplete();
    });

    document.getElementById('resume-btn')?.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement)?.blur();
      this.intent('TOGGLE_PAUSE');
    });

    const openShop = (e: MouseEvent) => {
      (e.currentTarget as HTMLElement)?.blur();
      this.intent('OPEN_SHOP');
    };

    document.getElementById('open-shop-btn')?.addEventListener('click', openShop);
    document.getElementById('go-shop-btn')?.addEventListener('click', openShop);

    const backToMenu = (e: MouseEvent) => {
      (e.currentTarget as HTMLElement)?.blur();
      this.intent('GO_MENU');
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
    if(this.lastRun!==app.activeRunId || this.lastPage!==state) this.toasts.clear();
    this.syncInteractionScope(app);
    const changed=this.lastPage!==state;
    this.lastRun=app.activeRunId; this.lastPage=state;
    const pages=[this.menuEl,this.pausedEl,this.gameOverEl,this.shopEl];
    const states=['MENU','PAUSED','GAMEOVER','SHOP'];
    pages.forEach((el,i)=>{el.inert=states[i]!==state;el.setAttribute('aria-modal','true');});
    if(changed) queueMicrotask(()=>{
      if(this.readApp().appState!==state)return;
      const active=pages[states.indexOf(state)];
      if(active){active.tabIndex=-1;active.focus({preventScroll:true});}
      else { (document.activeElement as HTMLElement)?.blur?.(); }
    });
    this.renderFeedback(app);
    this.menuEl.style.display = state === 'MENU' ? 'flex' : 'none';
    this.hudEl.inert=state!=='PLAYING';
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
      this.hudSpeedTextEl.textContent = speedLabel(ctx.speed);

      // Buffs 渲染
      this.renderBuffs(ctx);
    }

    if (state === 'GAMEOVER') {
      this.goFinalScoreEl.textContent = app.summary ? String(app.summary.scoreInt) : '等待结算数据';
      this.goCoinsEarnedEl.textContent = app.summary ? '+'+app.summary.earnedCoins : '—';
      this.goHighScoreEl.textContent = String(app.highScore);
      this.goBadgeEl.style.display = app.summary?.runId === this.newRecordRunId ? 'inline-block' : 'none';
    }
    this.shopCoinsEl.textContent = app.walletCoins.toString();
    const shopFingerprint = JSON.stringify([app.walletCoins, app.ownedSkinIds, app.selectedSkinId]);
    if (this.shopFingerprint !== shopFingerprint) {
      this.shopFingerprint = shopFingerprint;
      this.renderShop(app);
    }
    this.renderAudioControls(app);
    this.toasts.advance(performance.now(),document.hidden || state!=='PLAYING');
    this.renderToast(state==='PLAYING');
  }

  /**
   * 渲染 Active PowerUps (Buffs)
   */
  private renderBuffs(ctx: DeepReadonly<GameContext>): void {
    const views=powerUps(ctx.player);
    const key=JSON.stringify(views);
    if(this.hudBuffsEl.dataset.key===key)return;
    this.hudBuffsEl.dataset.key=key;
    this.hudBuffsEl.replaceChildren(...views.map(view=>{
      const pill=document.createElement('div');pill.className='buff-pill';
      pill.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24"><path d="'+view.path+'"/></svg>';
      const label=document.createElement('span');label.textContent=view.label+' '+view.time;pill.append(label);return pill;
    }));
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
    this.intent(this.readApp().ownedSkinIds.includes(skinId) ? 'EQUIP_SKIN' : 'BUY_SKIN', { skinId });
  }

  private bindAudioSettings(): void {
    document.getElementById('bgm-toggle-btn')?.addEventListener('click', () => {
      this.intent('UPDATE_AUDIO', { kind: 'TOGGLE', field: 'bgmEnabled' });
    });
    document.getElementById('sfx-toggle-btn')?.addEventListener('click', () => {
      this.intent('UPDATE_AUDIO', { kind: 'TOGGLE', field: 'sfxEnabled' });
    });
    for (const [id, field] of [['bgm-volume', 'bgmVolume'], ['sfx-volume', 'sfxVolume']] as const) {
      document.getElementById(id)?.addEventListener('input', e => {
        this.intent('UPDATE_AUDIO', { kind: 'SET_VOLUME', field, value: Number((e.currentTarget as HTMLInputElement).value) / 100 });
      });
    }
    this.renderAudioControls();
  }

  private renderAudioControls(app: AppSnapshot = this.readApp()): void {
    const audio = app.audio;
    const bgm = document.getElementById('bgm-toggle-btn');
    const sfx = document.getElementById('sfx-toggle-btn');
    if (bgm) bgm.textContent = '音乐: ' + (audio.bgmEnabled ? '开' : '关');
    if (sfx) sfx.textContent = '音效: ' + (audio.sfxEnabled ? '开' : '关');
    const bgmVolume = document.getElementById('bgm-volume') as HTMLInputElement | null;
    const sfxVolume = document.getElementById('sfx-volume') as HTMLInputElement | null;
    // Focused ranges keep their native editing draft while persistence is pending.
    if (bgmVolume && document.activeElement !== bgmVolume) bgmVolume.value = String(Math.round(audio.bgmVolume * 100));
    if (sfxVolume && document.activeElement !== sfxVolume) sfxVolume.value = String(Math.round(audio.sfxVolume * 100));
  }

  /**
   * 动态显示 Cyber 风格任务 Toast 通知
   */
  public showToast(message: string): void {this.toasts.add(message,performance.now());}
  private renderToast(visible:boolean):void {
    let el=this.container.querySelector<HTMLElement>('.cyber-toast');
    const text=this.toasts.items[0]?.text;
    if(!text||!visible){el?.remove();return;}
    if(!el){el=document.createElement('div');el.className='cyber-toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');this.container.append(el);}
    if(el.textContent!==text){el.textContent=text;el.setAttribute('aria-label',text);}
  }
  private syncInteractionScope(app:AppSnapshot):void {
    if(!this.interactionScope.enter(app))return;
    // Retire presentation leases only. Service idempotency/unknown outcomes stay
    // authoritative, and terminal retries within one run retain their identity.
    this.requests.clear();this.retries.clear();
    this.receipts.pending.clear();this.receipts.error='';
  }
  public notifyCommandPending(p:PendingReceipt):void {
    this.syncInteractionScope(this.readApp());
    this.receipts.begin(p,performance.now());
  }
  public notifyCommandResult(result:Readonly<CommandResult>):boolean {
    const app=this.readApp();
    this.syncInteractionScope(app);
    const accepted=this.receipts.end(result,app.activeRunId);
    if(result.commandId==='initialize'&&!result.ok)this.receipts.error=errorLabel(result.errorCode);
    const request=this.requests.get(result.commandId);
    if(request){this.requests.delete(result.commandId);if(!result.ok)this.retries.set(request.key,request);else this.retries.delete(request.key);}
    return accepted;
  }
  private intent(event:string,payload:Record<string,unknown>={}):void {
    const app=this.readApp();
    this.syncInteractionScope(app);
    const key=event+JSON.stringify(payload);
    if(event!=='UPDATE_AUDIO'&&[...this.requests.values()].some(x=>x.key===key))return;
    // Changing a field is a new intention, even when later returning to a value
    // whose earlier acknowledgement was lost. An unchanged retry keeps its id.
    if(event==='UPDATE_AUDIO')for(const [oldKey,old] of this.retries){
      if(oldKey!==key&&old.event===event&&old.payload.field===payload.field)this.retries.delete(oldKey);
    }
    const retry=this.retries.get(key);
    const request=retry&&retry.payload.runId===app.activeRunId?retry:{event,key,payload:{...payload,runId:app.activeRunId,commandId:'pao19-'+crypto.randomUUID()+'-'+(++this.sequence)}};
    this.requests.set(String(request.payload.commandId),request);
    eventBus.emit(request.event,request.payload);
    // Stage A has no lifecycle producer. Avoid creating a fake pending state.
    if(!this.receipts.pending.has(String(request.payload.commandId)))this.requests.delete(String(request.payload.commandId));
  }
  private renderFeedback(app:AppSnapshot):void {
    const pending=this.receipts.message(performance.now());
    const busy=[...this.receipts.pending.values()].some(p=>!['UPDATE_AUDIO','BUY_SKIN','EQUIP_SKIN'].includes(p.type));
    this.container.querySelectorAll<HTMLButtonElement>('#start-btn,#restart-btn,#pause-restart-btn,#pause-menu-btn,#go-menu-btn,#go-shop-btn,#open-shop-btn,#close-shop-btn,#hud-pause-btn,#resume-btn').forEach(button=>{
      if(busy&&!button.disabled){button.disabled=true;button.dataset.receiptDisabled='true';}
      if(!busy&&button.dataset.receiptDisabled){button.disabled=false;delete button.dataset.receiptDisabled;}
    });
    const error=this.receipts.error || (app.settlementStatus==='FAILED'?errorLabel(app.errorCode):'');
    this.container.querySelectorAll<HTMLElement>('.command-feedback').forEach(el=>{if(el.textContent!==pending)el.textContent=pending;});
    this.container.querySelectorAll<HTMLElement>('.command-error').forEach(el=>{if(el.textContent!==error)el.textContent=error;});
    const status=this.container.querySelector('#settlement-status');
    if(status)status.textContent=({NONE:'',PENDING:'正在保存本局…',COMMITTED:'本局已保存',FAILED:'保存未完成，请重试原操作'})[app.settlementStatus];
    const details=this.container.querySelector('#result-details');
    if(details)details.textContent=app.summary?[(app.summary.endReason==='COLLISION'?'碰撞结束':'主动结束'),'拾取 '+app.summary.pickupCoins,'任务奖励 '+app.summary.rewardCoins].join(' · '):'等待结算数据';
  }
  private setupFocus():void {
    const layer=this.container.querySelector<HTMLElement>('#ui-layer')!;
    document.addEventListener('visibilitychange',()=>this.toasts.advance(performance.now(),true));
    let tap:{button:HTMLButtonElement;x:number;y:number}|null=null;
    const isUI=(target:EventTarget|null)=>(target as Element)?.closest('button,input,summary,.ui-screen,.buffs-wrap');
    layer.addEventListener('touchstart',e=>{
      const button=(e.target as Element).closest<HTMLButtonElement>('button');
      const point=e.touches[0];
      tap=button&&point&&e.touches.length===1?{button,x:point.clientX,y:point.clientY}:null;
      if(isUI(e.target))e.stopPropagation();
    },{passive:true});
    layer.addEventListener('touchmove',e=>{
      const point=e.touches[0];
      if(tap&&(!point||Math.hypot(point.clientX-tap.x,point.clientY-tap.y)>10))tap=null;
      if(isUI(e.target))e.stopPropagation();
    },{passive:true});
    layer.addEventListener('touchend',e=>{
      const activation=tap;tap=null;
      if(isUI(e.target))e.stopPropagation();
      // Cancel the compatibility click before issuing exactly one native button
      // activation. A scroll never becomes an action; mouse/keyboard stay native.
      if(activation&&!activation.button.disabled){e.preventDefault();activation.button.click();}
    },{passive:false});
    layer.addEventListener('touchcancel',()=>{tap=null;},{passive:true});
    layer.addEventListener('keydown',e=>{
      const modal=[this.menuEl,this.pausedEl,this.gameOverEl,this.shopEl].find(el=>!el.inert&&el.style.display!=='none');
      if(e.key==='Tab'&&modal){const controls=[...modal.querySelectorAll<HTMLElement>('button:not(:disabled),input,summary')].filter(el=>el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===modal)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
    });
  }
}
