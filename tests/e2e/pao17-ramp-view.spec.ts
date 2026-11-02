import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const dir = resolve('docs/evidence/PAO-17/bright-theme-preview', process.env.PAO17_THEME_RUN || 'preview');
for (const baseY of [0, 5]) test(`F actual wedge-roof walk, triangle support and exit at base Y=${baseY}`, async ({ page }) => {
  await mkdir(dir, { recursive: true }); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { (window as any).__QA_MODE__ = true; }); await page.goto('/');
  await page.evaluate(async () => {
    const { spawnerSystem } = await import(/* @vite-ignore */ '/src/systems/spawner.ts');
    const w = window as any; spawnerSystem.update = (_z: number, obstacles: unknown[], coins: unknown[], powerups: unknown[]) => { w.__paoThemeWorld = { obstacles, coins, powerups }; };
    w.__paoThemeTrace = []; const trace = () => { const s = w.__GAME_SENSOR__.getSimulationSnapshot(); w.__paoThemeTrace.push({ tick: s.tick, ...s.context.player }); requestAnimationFrame(trace); }; trace();
  });
  await page.click('#start-btn'); await page.waitForFunction(() => !!(window as any).__paoThemeWorld); await page.keyboard.press('Escape'); await expect(page.locator('#resume-btn')).toBeVisible();
  await page.evaluate(y => {
    const w = window as any, s = w.__GAME_SENSOR__; s.clearWorld(); s.setGodMode(false); s.grantInvulnerable(0); s.setPlayerLane(1); s.setPlayerPos(0, y, 63);
    const obstacle = (id: string, type: string, z: number, y: number, height: number, depth: number) => ({ id, type, lane: 1, x: 0, y, z, width: 2.4, height, depth });
    if (y) w.__paoThemeWorld.obstacles.push(obstacle('approach', 'STATIC_TRAIN', 58, 0, 5, 18));
    w.__paoThemeWorld.obstacles.push(obstacle('route-ramp', 'RAMP', 70, y, 3, 6), obstacle('route-roof', 'STATIC_TRAIN', 79, y, 3, 12)); w.__paoThemeTrace = [];
  }, baseY);
  let imageInterval: unknown = null;
  await page.click('#resume-btn');
  if (!baseY) {
    await page.waitForFunction(() => { const p = (window as any).__GAME_SENSOR__.getSimulationSnapshot().context.player; return p.supportSurfaceId === 'route-ramp:ramp' && p.z >= 69 && p.z < 72; });
    const start = await page.evaluate(() => (window as any).__GAME_SENSOR__.getSimulationSnapshot());
    await page.screenshot({ path: resolve(dir, 'F-bright-ramp-roof.png') });
    const end = await page.evaluate(() => (window as any).__GAME_SENSOR__.getSimulationSnapshot());
    imageInterval = { start, end };
  }
  await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getSimulationSnapshot().context.player.supportSurfaceId === 'route-roof:roof');
  const before = await page.evaluate(() => (window as any).__GAME_SENSOR__.getSimulationSnapshot());
  const geometry = await page.evaluate(async () => {
    const load = (url: string) => import(/* @vite-ignore */ url);
    const text = await (await fetch('/src/render/babylon.ts')).text(); const core = await load(text.match(/from\s*["']([^"']*@babylonjs_core[^"']*)["']/)![1]); const surfaces = await load('/src/systems/surfaces.ts');
    const scene = core.EngineStore.LastCreatedScene; const snapshot = (window as any).__GAME_SENSOR__.getSimulationSnapshot(); const samples = [];
    for (const id of ['route-ramp', 'route-roof']) {
      const obs = snapshot.context.obstacles.find((o: any) => o.id === id); const mesh = scene.getMeshByName((id === 'route-ramp' ? 'ramp_' : 'roof_') + id); mesh.computeWorldMatrix(true);
      for (const x of [-1.2, 0, 1.2]) for (const t of [0, 0.5, 1]) {
        const z = obs.z - obs.depth / 2 + obs.depth * t; const ray = new core.Ray(new core.Vector3(x, 100, z), core.Vector3.Down(), 200); const hit = ray.intersectsMesh(mesh, false);
        samples.push({ id, x, z, expected: surfaces.sampleSurface(surfaces.obstacleSurface(obs), x, z), hit: hit.hit, actual: hit.pickedPoint?.y });
      }
    }
    return { samples, podiumVisible: scene.getMeshByName('menuPodium').isEnabled(), role: scene.getMeshByName('ramp_route-ramp').getTotalVertices() };
  });
  const after = await page.evaluate(() => (window as any).__GAME_SENSOR__.getSimulationSnapshot());
  for (const s of geometry.samples) { expect(s.hit).toBe(true); expect(Math.abs(s.actual! - s.expected)).toBeLessThan(1e-6); }
  expect(geometry.podiumVisible).toBe(false);
  await page.waitForFunction(() => { const p = (window as any).__GAME_SENSOR__.getSimulationSnapshot().context.player; return p.z > 86 && p.supportSurfaceId === 'ground'; });
  const trace = await page.evaluate(() => (window as any).__paoThemeTrace);
  const ramp = trace.filter((p: any) => p.supportSurfaceId === 'route-ramp:ramp'); expect(ramp.length).toBeGreaterThan(2);
  for (const p of ramp) expect(Math.abs(p.y - (baseY + (p.z - 67) / 2))).toBeLessThan(1e-6);
  expect(trace.some((p: any) => p.supportSurfaceId === 'route-roof:roof' && p.y === baseY + 3)).toBe(true); expect(errors).toEqual([]);
  await writeFile(resolve(dir, `F-bright-ramp-Y${baseY}.json`), JSON.stringify({ baseY, before, after, imageInterval, geometry, trace, errors, viewport: page.viewportSize(), browser: page.context().browser()?.version() }, null, 2));
});
