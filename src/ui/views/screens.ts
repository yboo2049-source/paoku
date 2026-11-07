export const screens = `
      <div id="ui-layer">

        <!-- HUD LAYER (PLAYING / 已暂停) -->
        <div id="hud-overlay" style="display: none;">
          <div class="hud-top-bar">
            <div class="hud-badge-group">
              <div class="hud-badge" aria-label="Score">
                <svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16"/></svg>
                <div class="hud-val-container">
                  <span class="hud-val-title">分数</span>
                  <span id="hud-score" class="hud-val">0</span>
                </div>
              </div>
              <div class="hud-badge" aria-label="Coins">
                <svg class="icon gold" aria-hidden="true" viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,4M11,16H13V18H11V16M12,6C13.66,6 15,7.34 15,9C15,10.66 14.12,11.53 13.06,12.44C12.33,13.08 12,13.67 12,14.5H12V15H10.5V14.5C10.5,13 11.5,12.18 12.44,11.36C13.19,10.71 13.5,10.27 13.5,9C13.5,8.17 12.83,7.5 12,7.5C11.17,7.5 10.5,8.17 10.5,9H9C9,7.34 10.34,6 12,6Z"/></svg>
                <div class="hud-val-container">
                  <span class="hud-val-title">本局金币</span>
                  <span id="hud-coins" class="hud-val">0</span>
                </div>
              </div>
            </div>

            <div>
              <button id="audio-toggle-btn" class="pause-btn-hud" title="Toggle Sound" aria-label="Toggle sound">
                <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16.02C15.5,15.29 16.5,13.77 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/></svg>
              </button>
              <button id="hud-pause-btn" class="pause-btn-hud" title="Pause Game (ESC)" aria-label="Pause game">
                <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14,19H18V5H14M6,19H10V5H6V19Z"/></svg>
              </button>
            </div>
          </div>

          <!-- Speedometer -->
          <div class="speedometer-wrap">
            <div class="speed-info">
              <span>奔跑速度</span>
              <span id="hud-speed-text" class="speed-val-text">18.0 m/s</span>
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
        <div id="menu-screen" class="ui-screen animate-pop" role="dialog" aria-label="Main menu">
          <div class="ui-card"><div class="command-feedback" role="status"></div><div class="command-error" role="alert"></div>
            <h1 class="cyber-title">城市跑酷</h1>
            <div class="stats-row">
              <div class="stat-item">
                <span class="stat-label">最高分</span>
                <span id="menu-high-score" class="stat-val">0</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">钱包金币</span>
                <span id="menu-total-coins" class="stat-val gold">0</span>
              </div>
            </div>

            <button id="start-btn" class="cyber-btn">开始奔跑</button>
            <button id="open-shop-btn" class="cyber-btn secondary-btn">外观商店</button>

            <div class="controls-hint"><span class="desktop-hint">A / D 换道 · 空格跳跃 · S 翻滚 · Esc 暂停</span><span class="touch-hint">左右滑换道 · 上滑跳跃 · 下滑翻滚</span></div>

            <details class="audio-settings" open><summary>音频设置</summary>
              <div>音频设置</div>
              <div>
                <button id="bgm-toggle-btn" class="audio-toggle">MUSIC</button>
                <input id="bgm-volume" type="range" min="0" max="100" step="1" aria-label="Background music volume">
              </div>
              <div>
                <button id="sfx-toggle-btn" class="audio-toggle">SFX</button>
                <input id="sfx-volume" type="range" min="0" max="100" step="1" aria-label="Sound effects volume">
              </div></details>
          </div>
        </div>

        <!-- 已暂停 SCREEN -->
        <div id="paused-screen" class="ui-screen animate-pop" role="dialog" aria-label="Paused" style="display: none;">
          <div class="ui-card"><div class="command-feedback" role="status"></div><div class="command-error" role="alert"></div>
            <h1 class="cyber-title">已暂停</h1>
            <p>重开或返回将结束本局并尝试保存。</p>
            <button id="resume-btn" class="cyber-btn">继续奔跑</button>
            <button id="pause-restart-btn" class="cyber-btn secondary-btn">重新开始</button>
            <button id="pause-menu-btn" class="cyber-btn secondary-btn">返回菜单</button>
          </div>
        </div>

        <!-- 本局结束 SCREEN -->
        <div id="gameover-screen" class="ui-screen animate-pop" role="dialog" aria-label="Game over" style="display: none;">
          <div class="ui-card"><div class="command-feedback" role="status"></div><div class="command-error" role="alert"></div>
            <h1 class="cyber-title danger-title">本局结束</h1>
            <div id="go-new-record" class="new-record-badge" style="display: none;">新纪录！</div>

            <div class="stats-row">
              <div class="stat-item">
                <span class="stat-label">本局分数</span>
                <span id="go-final-score" class="stat-val">0</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">本局收益</span>
                <span id="go-coins-earned" class="stat-val gold">+0</span>
              </div>
            </div>

            <div>
              最高纪录： <span id="go-high-score">0</span>
            </div>

            <p id="result-details"></p><p id="settlement-status" role="status"></p><button id="restart-btn" class="cyber-btn danger-btn">再跑一次</button>
            <button id="go-shop-btn" class="cyber-btn secondary-btn">外观商店</button>
            <button id="go-menu-btn" class="cyber-btn secondary-btn">返回菜单</button>
          </div>
        </div>

        <!-- SHOP SCREEN -->
        <div id="shop-screen" class="ui-screen animate-pop" role="dialog" aria-label="Shop" style="display: none;">
          <div class="ui-card shop-card"><div class="command-feedback" role="status"></div><div class="command-error" role="alert"></div>
            <h1 class="cyber-title">外观商店</h1>
            <div>
              钱包金币： <span id="shop-coins" class="stat-val gold">0</span>
            </div>

            <div id="skins-grid" class="skins-grid">
              <!-- Rendered Dynamically -->
            </div>

            <button id="close-shop-btn" class="cyber-btn secondary-btn">返回菜单</button>
          </div>
        </div>

      </div>
    `;
