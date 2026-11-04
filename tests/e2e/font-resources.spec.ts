import { test, expect, type Page } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const evidence = resolve(process.env.FONT_EVIDENCE || '.pao18.local/font-remediation/target');
const weights: Record<string, number[]> = { Outfit: [400, 600, 700, 900], Orbitron: [400, 500, 700, 900] };
function sensors(page: Page) {
  const errors: string[] = [], google: string[] = [], local: string[] = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (['warning', 'error'].includes(m.type())) errors.push(m.type() + ': ' + m.text()); });
  page.on('requestfailed', r => errors.push(r.url() + ': ' + r.failure()?.errorText));
  page.on('request', r => { const host = new URL(r.url()).hostname; if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(host)) google.push(r.url()); if (new URL(r.url()).pathname.startsWith('/fonts/') && r.resourceType() === 'font') local.push(r.url()); });
  return { errors, google, local };
}
async function loadFaces(page: Page) {
  return page.evaluate(async required => {
    const results = [];
    for (const [family, values] of Object.entries(required)) for (const weight of values) {
      try { const faces = await document.fonts.load(`${weight} 24px "${family}"`, 'SUBWAY 0123456789'); results.push({ family, weight, faces: faces.map(f => ({ family: f.family.replaceAll('"', ''), status: f.status, weight: f.weight })), error: null }); }
      catch (error) { results.push({ family, weight, faces: [], error: String(error) }); }
    }
    return results;
  }, weights);
}
async function actualFonts(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  const results = [];
  for (const [family, values] of Object.entries(weights)) for (const weight of values) {
    const id = `font-probe-${family}-${weight}`;
    await page.evaluate(({ id, family, weight }) => { const span = document.createElement('span'); span.id = id; span.textContent = 'SUBWAY 0123456789'; span.style.cssText = `position:fixed;left:0;top:0;font-family:"${family}";font-weight:${weight};font-size:24px`; document.body.append(span); }, { id, family, weight });
    await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#' + id });
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    results.push({ family, weight, fonts }); await page.locator('#' + id).evaluate(e => e.remove());
  }
  await cdp.detach(); return results;
}
test('N real application uses local faces and glyphs with Google domains unavailable', async ({ page, request }) => {
  await mkdir(evidence, { recursive: true }); const record = sensors(page);
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort('connectionclosed'));
  await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  const faces = await loadFaces(page), glyphs = await actualFonts(page);
  await writeFile(resolve(evidence, 'N-fonts.json'), JSON.stringify({ ...record, faces, glyphs }, null, 2));
  expect(record.google, 'runtime must not request Google fonts').toEqual([]);
  expect(record.local.length, 'real local font requests').toBeGreaterThanOrEqual(2);
  for (const item of faces) { expect(item.error).toBeNull(); expect(item.faces.length).toBeGreaterThan(0); expect(item.faces.every(f => f.family === item.family && f.status === 'loaded')).toBe(true); }
  const manifest = JSON.parse(await readFile(resolve('public/fonts/sources.json'), 'utf8'));
  for (const item of glyphs) {
    const source = manifest.fonts.find((f: any) => f.family === item.family);
    const internalFamilies = source.names.filter((n: any) => [1, 16].includes(n.id)).map((n: any) => n.text);
    expect(item.fonts.some(f => f.isCustomFont && internalFamilies.includes(f.familyName) && f.glyphCount > 0), `${item.family} ${item.weight} actual custom glyphs from verified sfnt name`).toBe(true);
  }
  const http = [];
  for (const item of manifest.fonts) { const response = await request.get('/fonts/' + item.file), bytes = await response.body(), sha256 = createHash('sha256').update(bytes).digest('hex'); expect(response.status()).toBe(200); expect(sha256).toBe(item.sha256); http.push({ file: item.file, status: response.status(), bytes: bytes.length, sha256, contentType: response.headers()['content-type'], cacheControl: response.headers()['cache-control'] }); }
  await writeFile(resolve(evidence, 'N-http-identity.json'), JSON.stringify({ http }, null, 2));
  const css = await request.get('/src/style.css?raw');
  expect(css.ok() && (await css.text()).includes(JSON.stringify(await readFile(resolve('src/style.css'), 'utf8'))), 'raw CSS identity').toBe(true);
  const html = await request.get('/');
  const normalize = (text: string) => text.replace(/<script type="module" src="\/@vite\/client"><\/script>/g, '').replace(/\s+/g, ' ').trim();
  expect(normalize(await html.text()), 'HTML identity excluding Vite development client').toBe(normalize(await readFile(resolve('index.html'), 'utf8')));
  expect(record.errors).toEqual([]);
});
test('F independent local font 404 remains visible to unchanged error sensors', async ({ page }) => {
  await mkdir(evidence, { recursive: true }); const record = sensors(page), statuses: number[] = [];
  page.on('response', r => { if (new URL(r.url()).pathname.startsWith('/fonts/') && r.status() === 404) statuses.push(r.status()); });
  await page.route('**/fonts/*.ttf', route => route.fulfill({ status: 404, contentType: 'text/plain', body: 'independent F: missing font' }));
  await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  const faces = await loadFaces(page); await page.waitForTimeout(200);
  await writeFile(resolve(evidence, 'F-font-404.json'), JSON.stringify({ ...record, statuses, faces, mode: 'F only; no error filtering or success response' }, null, 2));
  expect(record.local.length, 'fixture must reach actual local font URLs').toBeGreaterThanOrEqual(2);
  expect(statuses.length).toBeGreaterThanOrEqual(2);
  expect(faces.some(f => f.error !== null)).toBe(true);
  expect(record.errors.some(e => /404|ERR_|Failed to load/.test(e))).toBe(true);
  expect(record.google).toEqual([]);
});
for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`N pages and F typography matrix ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await mkdir(evidence, { recursive: true }); await page.setViewportSize(viewport);
    const record = sensors(page), measurements: any[] = [];
    await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__); await loadFaces(page);
    async function capture(label: string) {
      for (const stress of [false, true]) {
        const saved = await page.evaluate(stress => {
          const root = document.documentElement.style.fontSize;
          if (stress) {
            document.documentElement.style.fontSize = '32px';
            const originals = [...document.querySelectorAll<HTMLElement>('.ui-card,.hud-top-bar,.speedometer-wrap')].filter(e => e.getClientRects().length);
            const changes = originals.map(original => {
              const clone = original.cloneNode(true) as HTMLElement, display = original.style.display;
              clone.removeAttribute('id'); for (const el of clone.querySelectorAll('[id]')) el.removeAttribute('id');
              for (const el of clone.querySelectorAll('.stat-val,.hud-val')) el.textContent = '999999999999 中文 Ω 😀';
              original.before(clone); original.style.display = 'none'; return { original, clone, display };
            });
            (window as any).__fontStressChanges = changes;
          }
          return { root };
        }, stress);
        await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
        const measurement = await page.evaluate(() => {
          const visible = [...document.querySelectorAll<HTMLElement>('.ui-card,.hud-top-bar,.speedometer-wrap,.cyber-btn,.stat-val,.hud-val')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
          return { viewport: { width: innerWidth, height: innerHeight }, scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }, elements: visible.map(e => { const r = e.getBoundingClientRect(); return { id: e.id, className: e.className, text: e.textContent, x: r.x, y: r.y, width: r.width, height: r.height, font: getComputedStyle(e).fontFamily, fontSize: getComputedStyle(e).fontSize, clippedByViewport: r.x < 0 || r.y < 0 || r.right > innerWidth || r.bottom > innerHeight, internalOverflow: e.scrollWidth > e.clientWidth }; }) };
        });
        measurements.push({ label, mode: stress ? 'F: 200% root size and synthetic long numbers/missing glyphs' : 'N: natural app navigation', ...measurement });
        await page.screenshot({ path: resolve(evidence, `matrix-${viewport.width}-${label}-${stress ? 'stress' : 'normal'}.png`), animations: 'disabled' });
        await page.evaluate(saved => { document.documentElement.style.fontSize = saved.root; for (const item of (window as any).__fontStressChanges || []) { item.clone.remove(); item.original.style.display = item.display; } delete (window as any).__fontStressChanges; }, saved);
      }
    }
    await capture('menu'); await page.click('#open-shop-btn'); await expect(page.locator('#shop-screen')).toBeVisible(); await capture('shop');
    // DOM clicks permit inspection of inherited clipped landscape controls; they do not certify tap usability.
    await page.locator('#close-shop-btn').dispatchEvent('click'); await page.locator('#start-btn').dispatchEvent('click');
    await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getPlayerPos().z > 2); await capture('HUD');
    await page.locator('#hud-pause-btn').dispatchEvent('click'); await expect(page.locator('#paused-screen')).toBeVisible(); await capture('paused');
    await page.locator('#resume-btn').dispatchEvent('click'); await expect(page.locator('#gameover-screen')).toBeVisible({ timeout: 60000 }); await capture('gameover');
    await writeFile(resolve(evidence, `matrix-${viewport.width}.json`), JSON.stringify({ ...record, measurements, note: 'Measurements report existing layout limits, including clipping; no UI/layout changes. F uses ID-free visual clones so live UI updates cannot erase long text; original DOM/root size restored after each capture. DOM-dispatched navigation is not a tap-target usability pass.' }, null, 2));
    expect(record.google).toEqual([]); expect(record.errors).toEqual([]);
  });
}
