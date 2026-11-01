import { test, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const evidence = resolve('docs/evidence/PAO-14/runs', process.env.PAO14_PHASE || 'unknown-full');
for (const readFailures of [1, 2]) {
  test(`F-unknown-toggle-${readFailures}-confirmation-read-failures`, async ({ page, request }) => {
    await mkdir(evidence, { recursive: true });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const sources = [];
    for (const source of ['src/application/appService.ts', 'src/application/saveRepository.ts']) {
      const disk = await readFile(resolve(source), 'utf8');
      const response = await request.get('/' + source + '?raw');
      const exactRawSourceMatch = response.ok() && (await response.text()).includes(JSON.stringify(disk));
      expect(exactRawSourceMatch).toBe(true);
      sources.push({ source, exactRawSourceMatch, sha256: createHash('sha256').update(disk).digest('hex') });
    }
    await writeFile(resolve(evidence, 'unknown-browser-source-identity.json'), JSON.stringify({ cwd: resolve('.'), baseURL: 'http://127.0.0.1:5185', sources }, null, 2));
    await page.goto('/');
    await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__ && localStorage.getItem('paoku_save_v1') !== null);
    const record = await page.evaluate(async readFailures => {
      const { AppService } = await import(/* @vite-ignore */ '/src/application/appService.ts');
      const { SaveRepository, SAVE_KEY } = await import(/* @vite-ignore */ '/src/application/saveRepository.ts');
      // F: real production services, real localStorage and the normal Web Lock.
      // The auxiliary storage boundary alone injects lost write/read acknowledgments.
      let armed = false, failedReads = 0, writes = 0;
      const storage = {
        getItem(key: string) {
          if (key === SAVE_KEY && failedReads > 0) { failedReads--; throw Error('injected confirmation read failure'); }
          return localStorage.getItem(key);
        },
        setItem(key: string, value: string) {
          localStorage.setItem(key, value);
          if (key === SAVE_KEY) writes++;
          if (armed && key === SAVE_KEY) {
            armed = false; failedReads = readFailures;
            throw Error('injected failure after durable write');
          }
        },
      };
      const service = new AppService(new SaveRepository(storage));
      await service.initialize();
      const initial = service.snapshot;
      const command = { commandId: 'same-unknown-toggle', type: 'UPDATE_AUDIO' as const, audioOperation: { kind: 'TOGGLE' as const, field: 'masterMuted' as const } };
      const attempts = [];
      armed = true;
      for (let i = 0; i < 4; i++) {
        const result = await service.dispatch(command);
        attempts.push({ result, snapshot: service.snapshot, durable: JSON.parse(localStorage.getItem(SAVE_KEY)!), writes });
      }
      const sensor = (window as any).__GAME_SENSOR__;
      return { initial, attempts, readFailures, writes, productionState: sensor.getGameState(), productionTick: sensor.getSimulationSnapshot().tick };
    }, readFailures);
    await writeFile(resolve(evidence, test.info().title + '.json'), JSON.stringify({ ...record, errors }, null, 2));
    expect(record.initial.audio.masterMuted).toBe(false);
    expect(record.attempts[0].result).toMatchObject({ ok: false, errorCode: 'SAVE_FAILED' });
    expect(record.attempts[0].snapshot.audio.masterMuted).toBe(false);
    expect(record.attempts[0].snapshot.revision).toBe(0);
    expect(record.attempts[0].durable.audio.masterMuted).toBe(true);
    expect(record.attempts[0].durable.revision).toBe(1);
    if (readFailures === 2) {
      expect(record.attempts[1].result.ok).toBe(false);
      expect(record.attempts[1].snapshot.audio.masterMuted).toBe(false);
      expect(record.attempts[1].snapshot.revision).toBe(0);
    }
    const last = record.attempts.at(-1)!;
    expect(last.result.ok).toBe(true);
    expect(last.snapshot.audio.masterMuted).toBe(true);
    expect(last.durable.audio.masterMuted).toBe(true);
    expect(last.snapshot.revision).toBe(1);
    expect(last.durable.revision).toBe(1);
    expect(record.writes).toBe(1);
    expect(record.productionState).toBe('MENU');
    expect(record.productionTick).toBe(0);
    expect(errors).toEqual([]);
  });
}
