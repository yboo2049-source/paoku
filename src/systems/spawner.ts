import type { ObstacleEntity, CoinEntity, PowerUpEntity } from '../types';
import { CONSTANTS } from '../types';

export type PatternType = 'ZigZag_Trains' | 'Under_Over' | 'Moving_Rush' | 'Coin_Frenzy';

export class SpawnerSystem {
  private lastSpawnZ: number = 30;

  update(
    playerZ: number,
    obstacles: ObstacleEntity[],
    coins: CoinEntity[],
    powerUps: PowerUpEntity[]
  ): void {
    // 保持前方有足够生成的区块
    while (this.lastSpawnZ - playerZ < 150) {
      this.spawnPattern(this.lastSpawnZ, obstacles, coins, powerUps);
      this.lastSpawnZ += 40;
    }

    // 清理落后于玩家身后的物体
    for (let i = obstacles.length - 1; i >= 0; i--) {
      if (obstacles[i].z < playerZ - 15) {
        obstacles.splice(i, 1);
      }
    }

    for (let i = coins.length - 1; i >= 0; i--) {
      if (coins[i].z < playerZ - 15) {
        coins.splice(i, 1);
      }
    }

    for (let i = powerUps.length - 1; i >= 0; i--) {
      if (powerUps[i].z < playerZ - 15) {
        powerUps.splice(i, 1);
      }
    }
  }

  reset(): void {
    this.lastSpawnZ = 30;
  }

  spawnPattern(
    spawnZ: number,
    obstacles: ObstacleEntity[],
    coins: CoinEntity[],
    _powerUps: PowerUpEntity[],
    forcedPattern?: PatternType
  ): void {
    const patterns: PatternType[] = ['ZigZag_Trains', 'Under_Over', 'Moving_Rush', 'Coin_Frenzy'];
    const pattern = forcedPattern || patterns[Math.floor(Math.random() * patterns.length)];

    switch (pattern) {
      case 'ZigZag_Trains':
        this.spawnZigZagTrains(spawnZ, obstacles, coins);
        break;
      case 'Under_Over':
        this.spawnUnderOver(spawnZ, obstacles, coins);
        break;
      case 'Moving_Rush':
        this.spawnMovingRush(spawnZ, obstacles, coins);
        break;
      case 'Coin_Frenzy':
        this.spawnCoinFrenzy(spawnZ, coins);
        break;
    }

    // 25% 概率在跑道中央放置一个随机 PowerUp 道具
    if (Math.random() < 0.35) {
      const pTypes: PowerUpEntity['type'][] = ['MAGNET', 'DOUBLE_SCORE', 'SUPER_SNEAKERS', 'HOVERBOARD'];
      const randomType = pTypes[Math.floor(Math.random() * pTypes.length)];
      const randomLane = Math.floor(Math.random() * 3);

      _powerUps.push({
        id: `powerup_${spawnZ}_${Date.now()}`,
        type: randomType,
        lane: randomLane,
        x: CONSTANTS.LANE_X[randomLane],
        y: 1.0,
        z: spawnZ + 20,
        collected: false,
      });
    }
  }

  private spawnZigZagTrains(spawnZ: number, obstacles: ObstacleEntity[], coins: CoinEntity[]): void {
    // 交错的火车 + 斜坡(RAMP)与金币
    // 车道0 (左): RAMP at spawnZ, 火车顶部有金币
    obstacles.push({
      id: `obs_ramp_${spawnZ}_0`,
      type: 'RAMP',
      lane: 0,
      x: CONSTANTS.LANE_X[0],
      y: 0,
      z: spawnZ,
      width: 2.4,
      height: 3.0,
      depth: 6.0,
    });
    obstacles.push({
      id: `obs_train_${spawnZ}_0`,
      type: 'STATIC_TRAIN',
      lane: 0,
      x: CONSTANTS.LANE_X[0],
      y: 0,
      z: spawnZ + 9,
      width: 2.4,
      height: 3.0,
      depth: 12.0,
    });
    for (let i = 0; i < 4; i++) {
      coins.push({
        id: `coin_${spawnZ}_0_${i}`,
        lane: 0,
        x: CONSTANTS.LANE_X[0],
        y: 3.8,
        z: spawnZ + 4 + i * 3,
        collected: false,
      });
    }

    // 车道1 (中): STATIC_TRAIN at spawnZ + 15
    obstacles.push({
      id: `obs_train_${spawnZ}_1`,
      type: 'STATIC_TRAIN',
      lane: 1,
      x: CONSTANTS.LANE_X[1],
      y: 0,
      z: spawnZ + 15,
      width: 2.4,
      height: 3.0,
      depth: 12.0,
    });

    // 车道2 (右): RAMP at spawnZ + 20
    obstacles.push({
      id: `obs_ramp_${spawnZ}_2`,
      type: 'RAMP',
      lane: 2,
      x: CONSTANTS.LANE_X[2],
      y: 0,
      z: spawnZ + 20,
      width: 2.4,
      height: 3.0,
      depth: 6.0,
    });
  }

  private spawnUnderOver(spawnZ: number, obstacles: ObstacleEntity[], coins: CoinEntity[]): void {
    // 组合高空与低矮障碍
    // 车道 0: HIGH_OBSTACLE (需翻滚)
    obstacles.push({
      id: `obs_high_${spawnZ}_0`,
      type: 'HIGH_OBSTACLE',
      lane: 0,
      x: CONSTANTS.LANE_X[0],
      y: 1.2,
      z: spawnZ + 5,
      width: 2.2,
      height: 1.8,
      depth: 0.5,
    });
    coins.push({
      id: `coin_${spawnZ}_0_0`,
      lane: 0,
      x: CONSTANTS.LANE_X[0],
      y: 0.8,
      z: spawnZ + 5,
      collected: false,
    });

    // 车道 1: LOW_OBSTACLE (需跳跃)
    obstacles.push({
      id: `obs_low_${spawnZ}_1`,
      type: 'LOW_OBSTACLE',
      lane: 1,
      x: CONSTANTS.LANE_X[1],
      y: 0,
      z: spawnZ + 15,
      width: 2.2,
      height: 1.0,
      depth: 0.5,
    });
    coins.push({
      id: `coin_${spawnZ}_1_0`,
      lane: 1,
      x: CONSTANTS.LANE_X[1],
      y: 2.0,
      z: spawnZ + 15,
      collected: false,
    });

    // 车道 2: HIGH_OBSTACLE
    obstacles.push({
      id: `obs_high_${spawnZ}_2`,
      type: 'HIGH_OBSTACLE',
      lane: 2,
      x: CONSTANTS.LANE_X[2],
      y: 1.2,
      z: spawnZ + 25,
      width: 2.2,
      height: 1.8,
      depth: 0.5,
    });
  }

  private spawnMovingRush(spawnZ: number, obstacles: ObstacleEntity[], coins: CoinEntity[]): void {
    // 迎面驶来的动态火车
    obstacles.push({
      id: `obs_mov_${spawnZ}_0`,
      type: 'MOVING_TRAIN',
      lane: 0,
      x: CONSTANTS.LANE_X[0],
      y: 0,
      z: spawnZ + 30,
      width: 2.4,
      height: 3.0,
      depth: 12.0,
      speedZ: -10,
    });

    obstacles.push({
      id: `obs_mov_${spawnZ}_2`,
      type: 'MOVING_TRAIN',
      lane: 2,
      x: CONSTANTS.LANE_X[2],
      y: 0,
      z: spawnZ + 10,
      width: 2.4,
      height: 3.0,
      depth: 12.0,
      speedZ: -12,
    });

    // 安全车道 1 放置金币
    for (let i = 0; i < 6; i++) {
      coins.push({
        id: `coin_${spawnZ}_1_${i}`,
        lane: 1,
        x: CONSTANTS.LANE_X[1],
        y: 0.8,
        z: spawnZ + i * 5,
        collected: false,
      });
    }
  }

  private spawnCoinFrenzy(spawnZ: number, coins: CoinEntity[]): void {
    // 密集金币阵列
    for (let lane = 0; lane < 3; lane++) {
      for (let i = 0; i < 5; i++) {
        coins.push({
          id: `coin_frenzy_${spawnZ}_${lane}_${i}`,
          lane,
          x: CONSTANTS.LANE_X[lane],
          y: 0.8,
          z: spawnZ + i * 4,
          collected: false,
        });
      }
    }
  }
}

export const spawnerSystem = new SpawnerSystem();

