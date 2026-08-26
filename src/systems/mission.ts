import type { Mission, GameContext } from '../types';
import { eventBus } from '../core/eventBus';

export class MissionSystem {
  private initialMissions: Mission[] = [
    {
      id: 'm1',
      title: 'COIN COLLECTOR',
      description: 'Collect 30 coins in a single run',
      target: 30,
      current: 0,
      rewardCoins: 50,
      completed: false,
      type: 'COLLECT_COINS',
    },
    {
      id: 'm2',
      title: 'HIGH JUMPER',
      description: 'Perform 10 jumps in a single run',
      target: 10,
      current: 0,
      rewardCoins: 40,
      completed: false,
      type: 'JUMP_TIMES',
    },
    {
      id: 'm3',
      title: 'SLIDER PRO',
      description: 'Perform 8 rolls under obstacles',
      target: 8,
      current: 0,
      rewardCoins: 40,
      completed: false,
      type: 'ROLL_TIMES',
    },
    {
      id: 'm4',
      title: 'SCORE RUNNER',
      description: 'Reach a score of 500 in a single run',
      target: 500,
      current: 0,
      rewardCoins: 100,
      completed: false,
      type: 'SCORE_REACH',
    },
  ];

  public initMissions(): Mission[] {
    return JSON.parse(JSON.stringify(this.initialMissions));
  }

  public resetMissions(missions: Mission[]): void {
    missions.forEach((m) => {
      m.current = 0;
      m.completed = false;
    });
  }

  public update(ctx: GameContext): void {
    if (ctx.state !== 'PLAYING') return;

    ctx.missions.forEach((mission) => {
      if (mission.completed) return;

      switch (mission.type) {
        case 'COLLECT_COINS':
          mission.current = ctx.coins;
          break;
        case 'SCORE_REACH':
          mission.current = Math.floor(ctx.score);
          break;
      }

      // JUMP_TIMES / ROLL_TIMES 的 current 由 trackAction() 在输入事件中自增；
      // COLLECT_COINS / SCORE_REACH 的 current 在下方 switch 中由 ctx 同步。
      if (mission.current >= mission.target && !mission.completed) {
        mission.completed = true;
        // 奖励通过 ctx.coins 结算，在 GAMEOVER 时由 dom.ts 持久化入账；
        // 不要在此累加 ctx.totalCoins（dom.ts 每帧会以存档值覆盖它）。
        ctx.coins += mission.rewardCoins;

        eventBus.emit('MISSION_COMPLETED', {
          title: mission.title,
          reward: mission.rewardCoins,
        });
      }
    });
  }

  public trackAction(missions: Mission[], action: 'JUMP' | 'ROLL'): void {
    missions.forEach((mission) => {
      if (mission.completed) return;

      if (action === 'JUMP' && mission.type === 'JUMP_TIMES') {
        mission.current++;
      } else if (action === 'ROLL' && mission.type === 'ROLL_TIMES') {
        mission.current++;
      }
    });
  }
}

export const missionSystem = new MissionSystem();
