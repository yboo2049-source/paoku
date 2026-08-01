import type { GameContext } from '../types';
import { saveSaveData } from '../core/storage';
import { fetchLeaderboard } from '../core/leaderboard';

export class UIManager {
  private menuScreen = document.getElementById('menu-screen')!;
  private gameOverScreen = document.getElementById('game-over-screen')!;
  private scoreBoard = document.getElementById('score-board')!;
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

  private contextRef?: GameContext;

  constructor(onStart: () => void) {
    this.openLeaderboardBtn = document.createElement('button');
    this.openLeaderboardBtn.id = 'open-leaderboard-btn';
    this.openLeaderboardBtn.innerText = 'Leaderboard';
    this.menuScreen.appendChild(this.openLeaderboardBtn);

    this.leaderboardScreen = document.createElement('div');
    this.leaderboardScreen.id = 'leaderboard-screen';
    this.leaderboardScreen.className = 'screen';
    this.leaderboardScreen.style.display = 'none';
    this.leaderboardScreen.innerHTML = `
      <h1>Leaderboard</h1>
      <ol id="leaderboard-list"><li>Loading...</li></ol>
      <button id="close-leaderboard-btn">Back to Menu</button>
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
          alert('Not enough coins!');
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
    this.scoreBoard.style.display = 'none';
    this.shopScreen.style.display = 'none';
    this.pausedScreen.style.display = 'none';
    if (this.leaderboardScreen) this.leaderboardScreen.style.display = 'none';

    if (context.state === 'MENU') {
      this.menuScreen.style.display = 'flex';
      this.menuHighScore.innerText = Math.floor(context.saveData.highScore).toString();
      this.menuTotalCoins.innerText = Math.floor(context.saveData.totalCoins).toString();
    } else if (context.state === 'PLAYING') {
      this.scoreBoard.style.display = 'block';
      this.scoreSpan.innerText = Math.floor(context.score).toString();
    } else if (context.state === 'GAMEOVER') {
      this.gameOverScreen.style.display = 'flex';
      this.finalScoreSpan.innerText = Math.floor(context.score).toString();
    } else if (context.state === 'SHOP') {
      this.shopScreen.style.display = 'flex';
      this.shopTotalCoins.innerText = Math.floor(context.saveData.totalCoins).toString();
    } else if (context.state === 'PAUSED') {
      this.pausedScreen.style.display = 'flex';
      this.scoreBoard.style.display = 'block';
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
}
