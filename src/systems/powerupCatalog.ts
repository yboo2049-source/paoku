import type { PlayerEntity, PowerUpType } from '../types';

export type PowerUpSilhouetteKind =
  | 'HORSESHOE_MAGNET'
  | 'STAR_MULTIPLIER'
  | 'WINGED_BOOT'
  | 'THRUSTER_BOARD';

export interface PowerUpDescriptor {
  readonly type: PowerUpType;
  readonly labelZh: string;
  readonly silhouetteKind: PowerUpSilhouetteKind;
  readonly durationSec: number | null;
  readonly charges: number;
  readonly primaryHex: string;
  readonly secondaryHex: string;
  readonly partNames: readonly string[];
  readonly mechanicSummary: string;
}

export interface PowerUpPickupResolution {
  readonly change: 'ACTIVATED' | 'REFRESHED';
  readonly remainingSec: number | null;
  readonly charges: number;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export const SUPPORTED_POWERUP_TYPES: readonly PowerUpType[] = Object.freeze([
  'MAGNET',
  'DOUBLE_SCORE',
  'SUPER_SNEAKERS',
  'HOVERBOARD',
]);

export const POWERUP_CATALOG: Readonly<Record<PowerUpType, PowerUpDescriptor>> = deepFreeze({
  MAGNET: {
    type: 'MAGNET',
    labelZh: '磁铁',
    silhouetteKind: 'HORSESHOE_MAGNET',
    durationSec: 10,
    charges: 0,
    primaryHex: '#E63946',
    secondaryHex: '#DCE5EC',
    partNames: ['arch_left', 'arch_right', 'arch_bridge', 'tip_left', 'tip_right'],
    mechanicSummary: '半径15m内金币以25m/s平滑吸附',
  },
  DOUBLE_SCORE: {
    type: 'DOUBLE_SCORE',
    labelZh: '双倍得分',
    silhouetteKind: 'STAR_MULTIPLIER',
    durationSec: 10,
    charges: 0,
    primaryHex: '#F4B942',
    secondaryHex: '#FFF3B0',
    partNames: ['core_octa', 'ring_orbit', 'crest_top'],
    mechanicSummary: '奔跑里程积分倍率提升至2.0x（不翻倍金币）',
  },
  SUPER_SNEAKERS: {
    type: 'SUPER_SNEAKERS',
    labelZh: '超级跑鞋',
    silhouetteKind: 'WINGED_BOOT',
    durationSec: 10,
    charges: 0,
    primaryHex: '#2EC4B6',
    secondaryHex: '#E0FBF8',
    partNames: ['boot_sole', 'boot_upper', 'wing_left', 'wing_right'],
    mechanicSummary: '起跳初速度提升至1.5x (20.25m/s)',
  },
  HOVERBOARD: {
    type: 'HOVERBOARD',
    labelZh: '悬浮滑板',
    silhouetteKind: 'THRUSTER_BOARD',
    durationSec: null,
    charges: 1,
    primaryHex: '#FF2A85',
    secondaryHex: '#5CE1E6',
    partNames: ['deck_main', 'rail_left', 'rail_right', 'thruster_core'],
    mechanicSummary: '提供1次致命碰撞免死护盾并触发1.2s无敌与12碎片特效',
  },
});

export function resolvePowerUpPickupState(
  player: Readonly<PlayerEntity>,
  pickedType: PowerUpType,
): PowerUpPickupResolution {
  const descriptor = POWERUP_CATALOG[pickedType];
  if (pickedType === 'HOVERBOARD') {
    const wasActive = Boolean(player.hoverboardActive || player.hasHoverboard);
    return {
      change: wasActive ? 'REFRESHED' : 'ACTIVATED',
      remainingSec: descriptor.durationSec,
      charges: descriptor.charges,
    };
  }

  const currentTimer = player.activePowerUps?.get(pickedType) ?? 0;
  return {
    change: currentTimer > 0 ? 'REFRESHED' : 'ACTIVATED',
    remainingSec: descriptor.durationSec,
    charges: descriptor.charges,
  };
}
