# Superpowers Spec: V5 Master Architecture & Clean Rebuild

> **Spec Version**: 5.0.0  
> **Status**: Approved & Active  
> **Author**: Antigravity Agent  

---

## 1. Goal & Requirements

全面使用 Superpowers & Harness Engineering 范式，清洗老旧冗余代码，并重新构建支持高度解耦（Data & Rendering Separated）、全覆盖测试（Sensors & Playwright）的 3D 无尽跑酷系统。

---

## 2. Technical Architecture & File Layout

```
src/
├── types/index.ts         # 全局数据模型、枚举与类型定义
├── core/
│   ├── eventBus.ts        # 全局解耦事件发布/订阅单例
│   └── gameLoop.ts        # 独立 requestAnimationFrame 游戏循环
├── systems/
│   ├── physics.ts         # 纯数学 AABB 包围盒与碰撞检测
│   ├── input.ts           # 键盘 WASD + 触控 Swipe 多端输入
│   └── spawner.ts         # Pattern-based 动态区块生成器
├── render/
│   └── three.ts           # Three.js Canvas 场景、摄像机与粒子
├── ui/
│   └── dom.ts             # 状态机驱动的原生 DOM 界面
└── main.ts                # 主入口与 Sensor 曝光
```

---

## 3. Sensors Specification

为了满足机械化自动化验证规则，在入口 `main.ts` 中必须挂载 `window.__GAME_SENSOR__` 传感器：

```typescript
declare global {
  interface Window {
    __GAME_SENSOR__: {
      getGameState: () => string;
      getPlayerPos: () => { x: number; y: number; z: number };
      getScore: () => number;
      getCoins: () => number;
      getActiveObstaclesCount: () => number;
    };
  }
}
```
