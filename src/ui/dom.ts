import type { GameContext } from '../types';
import { saveSaveData } from '../core/storage';
import { fetchLeaderboard } from '../core/leaderboard';

export class UIManager {
  private menuScreen = document.getElementById('menu-screen')!;
  private gameOverScreen = document.getElementById('game-over-screen')!;
  private scoreSpan = document.getElementById('score')!;
  private finalScoreSpan = document.getElementById('final-score')!;
  private debugPanel = document.getElementById('debug-panel')!;
  private startBtn = document.getElementById('start-btn')!;
  private restartBtn = document.getElementById('restart-btn')!;

  private shopScreen = document.getElementById('shop-screen')!;
  private pausedScreen = document.getElementById('paused-screen')!;
  private openShopBtn = document.getElementById('open-shop-btn')!;
  private closeShopBtn = document.getElementById('close-shop-btn')!;
  private buyRedSkinBtn = document.getElementById('buy-red-skin-btn')!;
  private menuHighScore = document.getElementById('menu-high-score')!;
  private menuTotalCoins = document.getElementById('menu-total-coins')!;
  private shopTotalCoins = document.getElementById('shop-total-coins')!;

  private leaderboardScreen!: HTMLElement;
  private leaderboardList!: HTMLElement;
  private closeLeaderboardBtn!: HTMLElement;
  private openLeaderboardBtn!: HTMLElement;

  private hudLayer = document.getElementById('hud-layer')!;
  private speedBarFill = document.getElementById('speed-bar-fill')!;
  private buffsContainer = document.getElementById('buffs-container')!;

  private contextRef?: GameContext;
  private lastScore?: number;

  constructor(onStart: () => void) {
    this.openLeaderboardBtn = document.createElement('button');
    this.openLeaderboardBtn.id = 'open-leaderboard-btn';
    this.openLeaderboardBtn.className = 'cyber-btn text-btn';
    this.openLeaderboardBtn.innerText = 'Leaderboard';
    this.menuScreen.appendChild(this.openLeaderboardBtn);

    this.leaderboardScreen = document.createElement('div');
    this.leaderboardScreen.id = 'leaderboard-screen';
    this.leaderboardScreen.className = 'screen animate-pop';
    this.leaderboardScreen.style.display = 'none';
    this.leaderboardScreen.innerHTML = `
      <h1>Leaderboard</h1>
      <div class="stats panel">
        <ol id="leaderboard-list"><li>Loading...</li></ol>
      </div>
      <button id="close-leaderboard-btn" class="cyber-btn secondary-btn"><span class="btn-text">Back</span></button>
    `;
    document.getElementById('ui-layer')!.appendChild(this.leaderboardScreen);
    this.leaderboardList = document.getElementById('leaderboard-list')!;
    this.closeLeaderboardBtn = document.getElementById('close-leaderboard-btn')!;

    this.startBtn.addEventListener('click', onStart);
    this.restartBtn.addEventListener('click', onStart);

    this.openShopBtn.addEventListener('click', () => {
      if (this.contextRef) {
        this.contextRef.state = 'SHOP';
      }
    });

    this.closeShopBtn.addEventListener('click', () => {
      if (this.contextRef) {
        this.contextRef.state = 'MENU';
      }
    });

    this.buyRedSkinBtn.addEventListener('click', () => {
      if (this.contextRef) {
        if (this.contextRef.saveData.totalCoins >= 100) {
          this.contextRef.saveData.totalCoins -= 100;
          if (!this.contextRef.saveData.unlockedSkins.includes('red')) {
            this.contextRef.saveData.unlockedSkins.push('red');
          }
          this.contextRef.player.skinColor = 'red';
          saveSaveData(this.contextRef.saveData);
        } else {
          // Play shake animation if not enough coins
          this.buyRedSkinBtn.style.transform = 'translateX(-10px)';
          setTimeout(() => this.buyRedSkinBtn.style.transform = 'translateX(10px)', 50);
          setTimeout(() => this.buyRedSkinBtn.style.transform = 'translateX(0)', 100);
        }
      }
    });

    this.openLeaderboardBtn.addEventListener('click', async () => {
      if (this.contextRef) {
        (this.contextRef as any).state = 'LEADERBOARD';
        this.leaderboardList.innerHTML = '<li>Loading...</li>';
        const data = await fetchLeaderboard();
        this.leaderboardList.innerHTML = data.map(d => `<li>${d.name}: ${d.score}</li>`).join('');
      }
    });

    this.closeLeaderboardBtn.addEventListener('click', () => {
      if (this.contextRef) {
        this.contextRef.state = 'MENU';
      }
    });
  }

  update(context: GameContext, fps: number) {
    this.contextRef = context;

    this.menuScreen.style.display = 'none';
    this.gameOverScreen.style.display = 'none';
    this.hudLayer.style.display = 'none';
    this.shopScreen.style.display = 'none';
    this.pausedScreen.style.display = 'none';
    if (this.leaderboardScreen) this.leaderboardScreen.style.display = 'none';

    if (context.state === 'MENU') {
      this.menuScreen.style.display = 'flex';
      this.menuHighScore.innerText = Math.floor(context.saveData.highScore).toString();
      this.menuTotalCoins.innerText = Math.floor(context.saveData.totalCoins).toString();
    } else if (context.state === 'PLAYING') {
      this.hudLayer.style.display = 'flex';
      const currentScore = Math.floor(context.score);
      
      // Score bump animation on large increase (e.g. coin collection)
      const scoreItem = document.querySelector('.score-item') as HTMLElement;
      if (this.lastScore && currentScore - this.lastScore > 10 && scoreItem) {
        scoreItem.classList.add('score-bump');
        setTimeout(() => scoreItem.classList.remove('score-bump'), 150);
      }
      this.lastScore = currentScore;
      
      this.scoreSpan.innerText = currentScore.toString();

      // Update Speedometer
      const maxSpeed = 1000;
      const speedPercent = Math.min(100, Math.max(0, (context.speed / maxSpeed) * 100));
      this.speedBarFill.style.width = `${speedPercent}%`;
      if (speedPercent > 80) {
        this.speedBarFill.style.background = 'linear-gradient(90deg, #ff00ff, #ff0000)';
        this.speedBarFill.style.boxShadow = '0 0 15px #ff0000';
      } else {
        this.speedBarFill.style.background = 'linear-gradient(90deg, #00ffff, #ff00ff)';
        this.speedBarFill.style.boxShadow = '0 0 10px #ff00ff';
      }

      // Update Buffs
      this.updateBuffsUI(context.player.buffs);

    } else if (context.state === 'GAMEOVER') {
      this.gameOverScreen.style.display = 'flex';
      this.finalScoreSpan.innerText = Math.floor(context.score).toString();
    } else if (context.state === 'SHOP') {
      this.shopScreen.style.display = 'flex';
      this.shopTotalCoins.innerText = Math.floor(context.saveData.totalCoins).toString();
    } else if (context.state === 'PAUSED') {
      this.pausedScreen.style.display = 'flex';
      this.hudLayer.style.display = 'flex';
      this.scoreSpan.innerText = Math.floor(context.score).toString();
    } else if ((context.state as any) === 'LEADERBOARD') {
      this.leaderboardScreen.style.display = 'flex';
    }

    const debugInfo = {
      fps: Math.round(fps),
      state: context.state,
      speed: Math.round(context.speed),
      player: {
        lane: context.player.lane,
        y: Math.round(context.player.y),
        z: Math.round(context.player.z),
        action: context.player.state
      },
      entities: context.entities.length
    };
    this.debugPanel.innerText = JSON.stringify(debugInfo, null, 2);
  }

  private updateBuffsUI(buffs: any) {
    let html = '';
    const createBuffIcon = (svg: string, timer: number) => {
      if (timer <= 0) return '';
      // Using conic-gradient for the ring if we want, but CSS animation is simpler.
      // We will just show the ring pulsing fast when < 3 seconds.
      const pulse = timer < 3 ? 'animation-duration: 0.2s;' : '';
      return `
        <div class="buff-icon">
          ${svg}
          <div class="buff-ring" style="${pulse}"></div>
        </div>
      `;
    };

    // Magnet SVG
    html += createBuffIcon(
      '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M10 21V19C10 17.9 10.9 17 12 17S14 17.9 14 19V21H18V13.8L16.2 8H7.8L6 13.8V21H10M12 15C10.9 15 10 14.1 10 13V9H14V13C14 14.1 13.1 15 12 15M6 2H18L21 11V23H15V19H9V23H3V11L6 2Z"/></svg>', 
      buffs.magnetTimer
    );
    
    // Shield SVG
    if (buffs.shield) {
      html += createBuffIcon(
        '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1Z"/></svg>', 
        10
      ); // shield doesn't have a timer, it just stays until hit
    }

    // Jetpack SVG
    html += createBuffIcon(
      '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M14 6V11H10V6H14M16 4H8V11H5V20H19V11H16V4M10 13H14V16H10V13M10 18H14V22H10V18Z"/></svg>', 
      buffs.jetpackTimer
    );

    // Double Score SVG
    html += createBuffIcon(
      '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2L1 21H23L12 2M12 6L19.53 19H4.47L12 6Z"/></svg>', 
      buffs.doubleScoreTimer
    );

    this.buffsContainer.innerHTML = html;
  }
}
