import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { UiLayoutSnapshot } from '../../src/presentation/hudSafeArea';

const out = process.env.PAO19_HUD_OUT || 'D:/worker/paoku-diagnostics/pao18-pao19-integration-20261106/hud-producer';
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => { const list: string[] = []; errors.set(page, list); page.on('pageerror', e => list.push(e.message)); });
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

/** F read-only scheduling fixture: captures the existing instance, without production main wiring. */
async function open(page: Page, isolated = false) {
  await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  const capability = await page.evaluate(async () => {
    const url = '/src/ui/dom.ts'; const { UIManager } = await import(/* @vite-ignore */ url);
    const original = UIManager.prototype.update;
    const ui = await new Promise<any>(resolve => {
      UIManager.prototype.update = function (ctx: any) { UIManager.prototype.update = original; original.call(this, ctx); resolve(this); };
    });
    const w = window as any; w.__hud = { ui, frame: 0 };
    return typeof ui.measureOcclusion;
  });
  expect(capability, 'approved producer public measurement capability').toBe('function');
  if (isolated) await page.evaluate(async () => {
    const w = window as any, sensor = w.__GAME_SENSOR__;
    const app = structuredClone(sensor.getAppSnapshot()); const ctx = JSON.parse(JSON.stringify(sensor.getSimulationSnapshot().context));
    const mainUrl = '/src/main.ts', domUrl = '/src/ui/dom.ts';
    const { disposeGame } = await import(/* @vite-ignore */ mainUrl); disposeGame();
    const { UIManager } = await import(/* @vite-ignore */ domUrl);
    const ui = new UIManager(document.querySelector('#game-container')!, () => app);
    ctx.player.activePowerUps = new Map(); w.__hud = { ui, app, ctx, frame: 0 }; ui.update(ctx);
  });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(100);
}

async function sample(page: Page): Promise<UiLayoutSnapshot> {
  return page.evaluate(async () => {
    const w = window as any, f = w.__hud;
    // Production host is the sole sampler. Isolated F instances retain their own frame domain.
    if (!f.app) {
      let app = w.__GAME_SENSOR__.getAppSnapshot(), cur = f.ui.readOcclusion();
      const deadline = performance.now() + 250;
      while ((!cur || cur.status !== 'READY' || cur.page !== app.appState || cur.runId !== app.activeRunId) && performance.now() < deadline) {
        await new Promise<void>(r => requestAnimationFrame(() => r()));
        app = w.__GAME_SENSOR__.getAppSnapshot(); cur = f.ui.readOcclusion();
      }
      return cur;
    }
    const app = f.app, r = document.querySelector('#game-canvas')!.getBoundingClientRect(), v = visualViewport;
    return f.ui.measureOcclusion({ sampleFrame: ++f.frame, page: app.appState, runId: app.activeRunId,
      canvasRect: { x: r.x, y: r.y, width: r.width, height: r.height },
      viewport: { layoutWidth: document.documentElement.clientWidth, layoutHeight: document.documentElement.clientHeight,
        visual: { x: v?.offsetLeft || 0, y: v?.offsetTop || 0, width: v?.width || innerWidth, height: v?.height || innerHeight }, visualScale: v?.scale || 1 } });
  });
}
async function ready(page: Page) { let s = await sample(page); expect(s.status, s.reason || '').toBe('READY'); return s; }
async function setPage(page: Page, state: string, max = false) {
  await page.evaluate(({ state, max }) => {
    const f = (window as any).__hud; f.app.appState = state; f.app.activeRunId = state === 'MENU' || state === 'SHOP' ? null : 'F-layout';
    if (max) { f.ctx.score = 123456789012345; f.ctx.coins = 123456789012345; f.ctx.player.hoverboardActive = true; f.ctx.player.activePowerUps = new Map([['MAGNET', 12], ['DOUBLE_SCORE', 2], ['SUPER_SNEAKERS', 3], ['HOVERBOARD', 4]]); }
    f.ui.update(f.ctx);
  }, { state, max }); await page.waitForTimeout(80);
}
async function evidence(page: Page, name: string, s: UiLayoutSnapshot) {
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/${name}.json`, JSON.stringify(s, null, 2));
  await page.evaluate(s => {
    const overlay = document.createElement('div'); overlay.id = 'hud-measurement-overlay'; overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;pointer-events:none';
    for (const item of s.surfaces) { const r = item.clientRect, el = document.createElement('div'); el.style.cssText = `position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;border:2px solid #c93071;box-sizing:border-box`; overlay.append(el); }
    const label = document.createElement('div'); label.textContent = `F producer measurement · ${s.page} · epoch ${s.epoch}/revision ${s.layoutRevision} · no camera bridge`; label.style.cssText = 'position:absolute;left:4px;bottom:2px;font:12px system-ui;background:#fff;color:#56112b'; overlay.append(label); document.body.append(overlay);
  }, s);
  await page.screenshot({ path: `${out}/${name}.png` });
  await page.locator('#hud-measurement-overlay').evaluate(el => el.remove());
}

test('H02/H06/H15 N keyboard lifecycle with F read-only producer scheduling', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await open(page);
  const records: UiLayoutSnapshot[] = []; records.push(await ready(page));
  expect(records[0].surfaces.map(s => s.id)).toEqual(['menu-card']);
  await page.click('#open-shop-btn'); await expect(page.locator('#shop-screen')).toBeVisible(); records.push(await ready(page));
  expect(records.at(-1)?.profile).toBe('modal');
  await page.click('#close-shop-btn'); await expect(page.locator('#menu-screen')).toBeVisible(); records.push(await ready(page));
  await page.click('#start-btn'); await expect(page.locator('#hud-pause-btn')).toBeVisible(); await page.waitForTimeout(100);
  const hud = await ready(page); expect(hud.surfaces.map(s => s.id)).toEqual(['audio', 'coins', 'pause', 'score', 'speed']); records.push(hud);
  const readOnly = await page.evaluate(() => { const f = (window as any).__hud, sensor = (window as any).__GAME_SENSOR__; const before = JSON.stringify(sensor.getAppSnapshot()); f.ui.readOcclusion(); f.ui.invalidateLayout(); return before === JSON.stringify(sensor.getAppSnapshot()); }); expect(readOnly).toBe(true);
  await page.keyboard.press('a'); await page.keyboard.press('d'); await page.keyboard.press('Space'); await page.keyboard.press('s');
  await page.click('#hud-pause-btn'); await expect(page.locator('#paused-screen')).toBeVisible(); records.push(await ready(page));
  expect(records.at(-1)?.surfaces.some(s => s.id === 'score')).toBe(true); expect(records.at(-1)?.surfaces.some(s => s.id === 'paused-card')).toBe(true);
  const tick = await page.evaluate(() => (window as any).__GAME_SENSOR__.getSimulationSnapshot().tick); await page.waitForTimeout(150);
  expect(await page.evaluate(() => (window as any).__GAME_SENSOR__.getSimulationSnapshot().tick)).toBe(tick);
  await page.click('#resume-btn'); await expect(page.locator('#hud-pause-btn')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME_SENSOR__.getGameState()), { timeout: 55000 }).toBe('GAMEOVER'); records.push(await ready(page));
  await page.click('#restart-btn'); await expect(page.locator('#hud-pause-btn')).toBeVisible(); await page.click('#hud-pause-btn'); await page.click('#pause-menu-btn'); await expect(page.locator('#menu-screen')).toBeVisible(); records.push(await ready(page));
  expect(records.at(-1)?.layoutRevision).toBeGreaterThan(records[0].layoutRevision);
  await mkdir(out, { recursive: true }); await writeFile(`${out}/N-keyboard.json`, JSON.stringify(records, null, 2));
});

for (const width of [1440, 390]) test(`H02/H03/H04 F maximal-HUD-${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 }); await open(page, true); await setPage(page, 'PLAYING', true);
  await page.evaluate(() => { const f = (window as any).__hud; f.ui.showToast('测试任务提示：只测量当前可见的一条'); f.ui.update(f.ctx); });
  await page.waitForTimeout(80); const s = await ready(page);
  expect(s.surfaces.filter(s => s.kind === 'powerup')).toHaveLength(4); expect(s.surfaces.filter(s => s.kind === 'toast')).toHaveLength(1);
  const actual = await page.locator('.hud-badge').first().boundingBox(); const score = s.surfaces.find(s => s.id === 'score')!.clientRect;
  expect(score.x).toBeCloseTo(actual!.x, 1); expect(score.width).toBeCloseTo(actual!.width, 1);
  expect(s.surfaces.every(s => s.clientRect.width < width)).toBe(true);
  await evidence(page, `F-hud-${width}`, s);
  await page.evaluate(() => { const f = (window as any).__hud; f.ui.notifyCommandPending({ commandId: 'F-feedback', type: 'UPDATE_AUDIO', runId: 'F-layout' }); f.ui.notifyCommandResult({ commandId: 'F-feedback', ok: false, errorCode: 'SAVE_FAILED' }); f.ui.update(f.ctx); });
  await page.waitForTimeout(80); expect((await ready(page)).surfaces.some(s => s.id === 'hud-feedback')).toBe(true);
});

test('H05/H09 F visible surfaces, inert HUD, card and scroll clipping', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await open(page, true); await setPage(page, 'PLAYING', true);
  await page.evaluate(() => { const f = (window as any).__hud; document.querySelector<HTMLElement>('#hud-buffs')!.style.maxHeight = '68px'; f.ui.invalidateLayout(); });
  const s = await ready(page); expect(s.surfaces.filter(s => s.kind === 'powerup')).toHaveLength(2);
  const clipped = s.surfaces.find(s => s.id === 'powerup-DOUBLE_SCORE')!; expect(clipped.clientRect.height).toBeLessThan(48);
  await page.locator('#hud-buffs').evaluate(el => { el.scrollTop = el.scrollHeight; }); await page.waitForTimeout(60);
  const bottom = await ready(page); expect(bottom.surfaces.some(s => s.id === 'powerup-HOVERBOARD')).toBe(true);
  await page.evaluate(() => { const f = (window as any).__hud; document.querySelector<HTMLElement>('#audio-toggle-btn')!.style.opacity = '0'; document.querySelector<HTMLElement>('#hud-pause-btn')!.style.opacity = '.2'; f.ui.invalidateLayout(); });
  const hidden = await ready(page); expect(hidden.surfaces.some(s => s.id === 'audio')).toBe(false); expect(hidden.surfaces.some(s => s.id === 'pause')).toBe(true);
  await setPage(page, 'PAUSED'); const paused = await ready(page); expect(paused.surfaces.some(s => s.id === 'score')).toBe(true); expect(paused.surfaces.filter(s => s.kind === 'card')).toHaveLength(1); expect(paused.modal).toBe('dimmed');
  await setPage(page, 'MENU'); const menu = await ready(page); expect(menu.surfaces.map(s => s.id)).toEqual(['menu-card']);
  await page.locator('#menu-screen .ui-card').evaluate(el => { el.scrollTop = el.scrollHeight; }); await page.waitForTimeout(60);
  expect((await ready(page)).surfaces[0].clientRect).toEqual(menu.surfaces[0].clientRect);
});

test('H07/H08 F 200-percent font and paused rotation with explicit viewport basis', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await open(page, true); await setPage(page, 'PAUSED', true);
  await page.evaluate(() => { const nodes = [...document.querySelectorAll<HTMLElement>('#ui-layer *')].map(el => [el, parseFloat(getComputedStyle(el).fontSize)] as const); for (const [el, size] of nodes) el.style.fontSize = `${size * 2}px`; (window as any).__hud.ui.invalidateLayout(); });
  const tall = await ready(page); expect(tall.profile).toBe('modal');
  await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(120);
  const landscape = await ready(page); expect(landscape.canvasRect.width).toBe(844); expect(landscape.layoutRevision).toBeGreaterThan(tall.layoutRevision);
  const card = landscape.surfaces.find(s => s.id === 'paused-card')!.clientRect; expect(card.y).toBeGreaterThanOrEqual(0); expect(card.y + card.height).toBeLessThanOrEqual(390);
  await evidence(page, 'F-paused-rotated', landscape);
});

test('H10/H12/H16 F lease caching, coalescing, rebuild and disposal', async ({ page }) => {
  await open(page, true); await ready(page);
  const result = await page.evaluate(async () => {
    const f = (window as any).__hud, ui = f.ui; let reads = 0; const get = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () { reads++; return get.call(this); };
    const first = ui.readOcclusion(); for (let i = 0; i < 10; i++) ui.readOcclusion(); const cacheReads = reads;
    const notices: string[] = []; const off = ui.subscribeLayoutInvalidation((n: any) => notices.push(n.status));
    ui.invalidateLayout(); ui.invalidateLayout(); const dirty = ui.readOcclusion();
    const b = { ...first, sampleFrame: ++f.frame }; const next = ui.measureOcclusion(b); const after = reads;
    ui.invalidateLayout(); const same = ui.measureOcclusion(b); const noSecondRead = reads === after;
    ui.resetLayout(); const reset = ui.measureOcclusion({ ...b, sampleFrame: ++f.frame });
    ui.disposeLayout(); ui.disposeLayout(); document.fonts.dispatchEvent(new Event('loadingdone')); document.querySelector('#menu-screen .ui-card')!.dispatchEvent(new Event('scroll')); await Promise.resolve();
    const disposed = ui.measureOcclusion({ ...b, sampleFrame: ++f.frame }); off(); off();
    Element.prototype.getBoundingClientRect = get;
    const oldId = first.producerId, url = '/src/ui/dom.ts'; const { UIManager } = await import(/* @vite-ignore */ url);
    const replacement = new UIManager(document.querySelector('#game-container')!, () => f.app); replacement.update(f.ctx);
    const newValue = replacement.measureOcclusion({ ...b, sampleFrame: ++f.frame });
    const probes = document.querySelectorAll('[data-hud-safe-area-probe]').length; replacement.disposeLayout();
    return { cacheReads, dirty: dirty.status, next: next.status, noSecondRead, same: same.status, oldEpoch: first.epoch, resetEpoch: reset.epoch, disposed: disposed.status, notices, oldId, newId: newValue.producerId, probes, probesAfter: document.querySelectorAll('[data-hud-safe-area-probe]').length };
  });
  expect(result.cacheReads).toBe(0); expect(result.dirty).toBe('UNREADY'); expect(result.next).toBe('READY'); expect(result.noSecondRead).toBe(true); expect(result.same).toBe('UNREADY'); expect(result.resetEpoch).toBeGreaterThan(result.oldEpoch); expect(result.disposed).toBe('RELEASED'); expect(result.newId).not.toBe(result.oldId); expect(result.probes).toBe(1); expect(result.probesAfter).toBe(0);
});

test('H10 F late ResizeObserver and font promise cannot revive disposed or reset leases', async ({ page }) => {
  await open(page, true); await ready(page);
  const result = await page.evaluate(async () => {
    const f = (window as any).__hud, url = '/src/ui/dom.ts', { UIManager } = await import(/* @vite-ignore */ url);
    const Native = window.ResizeObserver, callbacks: ResizeObserverCallback[] = [];
    window.ResizeObserver = class extends Native { constructor(callback: ResizeObserverCallback) { super(callback); callbacks.push(callback); } };
    const descriptor = Object.getOwnPropertyDescriptor(document.fonts, 'ready'); let resolve!: () => void;
    const pending = new Promise<void>(r => { resolve = r; }); Object.defineProperty(document.fonts, 'ready', { configurable: true, value: pending });
    const ui = new UIManager(document.querySelector('#game-container')!, () => f.app); ui.update(f.ctx);
    const b = { ...f.ui.readOcclusion(), sampleFrame: 1 }; ui.measureOcclusion(b); const notices: string[] = [];
    ui.subscribeLayoutInvalidation((n: any) => notices.push(n.status)); ui.resetLayout(); ui.measureOcclusion({ ...b, sampleFrame: 2 });
    ui.disposeLayout(); const before = ui.readOcclusion(); const count = notices.length;
    resolve(); await Promise.resolve(); for (const callback of callbacks) callback([], {} as ResizeObserver);
    document.fonts.dispatchEvent(new Event('loadingdone'));
    if (descriptor) Object.defineProperty(document.fonts, 'ready', descriptor); else delete (document.fonts as any).ready;
    window.ResizeObserver = Native;
    return { same: before === ui.readOcclusion(), status: ui.readOcclusion().status, noticesAfter: notices.length - count, probes: document.querySelectorAll('[data-hud-safe-area-probe]').length, callbackCount: callbacks.length };
  });
  expect(result).toMatchObject({ same: true, status: 'RELEASED', noticesAfter: 0, probes: 0 }); expect(result.callbackCount).toBe(2);
});

for (const dpr of [1, 2]) test.describe(`H01/H08/H11 F DPR-${dpr}`, () => {
  test.use({ deviceScaleFactor: dpr });
  test('offset canvas, explicit inset and raw source identity', async ({ page, request }) => {
    await page.setViewportSize({ width: 500, height: 1000 }); await open(page, true); await setPage(page, 'PLAYING');
    await page.evaluate(() => { const el = document.querySelector<HTMLElement>('#game-container')!; el.style.cssText = 'position:relative;left:30px;top:20px;width:390px;height:844px'; const probe = document.querySelector<HTMLElement>('[data-hud-safe-area-probe]')!; probe.style.paddingTop = '47px'; probe.style.paddingBottom = '34px'; (window as any).__hud.ui.invalidateLayout(); });
    await page.waitForTimeout(60); const s = await ready(page); expect(s.canvasRect).toEqual({ x: 30, y: 20, width: 390, height: 844 }); expect(s.deviceInsets.top).toBe(47);
    const geometry = await page.evaluate(async s => { const url = '/src/presentation/hudSafeArea.ts', m = await import(/* @vite-ignore */ url); const local = m.normalizeOcclusion(s); return { local, buffer: m.toBufferGeometry(local, 780, 1688), dpr: devicePixelRatio }; }, s);
    expect(geometry.dpr).toBe(dpr); expect(geometry.local.safeInsets.top).toBe(27);
    const score = s.surfaces.find(s => s.id === 'score')!.clientRect, localIndex = s.surfaces.findIndex(s => s.id === 'score');
    expect(geometry.local.reservedRects[localIndex].x).toBeCloseTo(score.x - 30, 1); expect(geometry.buffer.rawReservedRects[localIndex].x).toBeCloseTo((score.x - 30) * 2, 1);
    const invalid = await page.evaluate(s => { const ui = (window as any).__hud.ui; return ui.measureOcclusion({ ...s, sampleFrame: 100, canvasRect: { ...s.canvasRect, width: 0 } }); }, s); expect(invalid).toMatchObject({ status: 'UNREADY', reason: 'ZERO_CANVAS' });
    const identities = [];
    for (const file of ['src/ui/dom.ts', 'src/presentation/hudSafeArea.ts', 'src/main.ts', 'src/style.css', 'src/ui/views/screens.ts']) { const disk = await readFile(file, 'utf8'), response = await request.get('/' + file + '?raw'); expect(response.ok()).toBe(true); const body = await response.text(); const served: string = body.startsWith('export default ') ? JSON.parse(body.slice(15).replace(/;\s*$/, '')) : body; expect(served).toBe(disk); identities.push({ file, sha256: createHash('sha256').update(served).digest('hex') }); }
    await mkdir(out, { recursive: true }); await writeFile(`${out}/F-DPR-${dpr}.json`, JSON.stringify({ geometry, identities }, null, 2));
  });
});

test('H06/H15 N CDP touch lifecycle with F read-only measurement scheduling', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 }); const cdp = await context.newCDPSession(page); await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 }); await open(page);
  const activate = async (selector: string) => { const el = page.locator(selector); await el.scrollIntoViewIfNeeded(); const b = await el.boundingBox(); if (!b) throw Error('Missing touch button'); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }] }); await page.waitForTimeout(60); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
  await activate('#start-btn'); await expect(page.locator('#hud-pause-btn')).toBeVisible(); const records = [await ready(page)];
  for (const [x, y, toX, toY] of [[250, 420, 100, 420], [100, 420, 250, 420], [180, 500, 180, 300], [180, 350, 180, 550]]) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: toX, y: toY }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(100); }
  await activate('#hud-pause-btn'); await expect(page.locator('#paused-screen')).toBeVisible(); records.push(await ready(page));
  await activate('#resume-btn'); await expect.poll(() => page.evaluate(() => (window as any).__GAME_SENSOR__.getGameState()), { timeout: 55000 }).toBe('GAMEOVER'); records.push(await ready(page));
  await activate('#restart-btn'); await expect(page.locator('#hud-pause-btn')).toBeVisible(); await activate('#hud-pause-btn'); await activate('#pause-menu-btn'); await expect(page.locator('#menu-screen')).toBeVisible(); records.push(await ready(page));
  await mkdir(out, { recursive: true }); await writeFile(`${out}/N-touch.json`, JSON.stringify({ qaMode: await page.evaluate(() => (window as any).__QA_MODE__ ?? false), records }, null, 2));
});
