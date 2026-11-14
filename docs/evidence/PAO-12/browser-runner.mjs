import { readdir, readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { resolve, relative, dirname, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = resolve('.');
const phase = process.env.PAO12_PHASE || 'final';
if (!/^[a-zA-Z0-9-]+$/.test(phase)) throw new Error('Invalid evidence phase');
const evidence = resolve(root, 'docs/evidence/PAO-12/runs', phase);
const historical = ['PAO-6', 'PAO-10', 'PAO-11'].map(id => resolve(root, 'docs/evidence', id));
const rootScreens = [
  'screenshot_1_menu.png', 'screenshot_2_shop.png', 'screenshot_3_gameplay_chase.png',
  'screenshot_4_bank_tilt.png', 'screenshot_5_jump_action.png', 'screenshot_6_paused_screen.png',
].map(name => resolve(root, name));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function retry(action) {
  for (let attempt = 0; ; attempt++) {
    try { return await action(); }
    catch (error) {
      if (attempt >= 19 || !['UNKNOWN', 'EPERM', 'EBUSY', 'EACCES'].includes(error.code)) throw error;
      await new Promise(done => setTimeout(done, 150));
    }
  }
}
async function files(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return (await Promise.all(entries.map(e => e.isDirectory() ? files(resolve(dir, e.name)) : [resolve(dir, e.name)]))).flat();
  } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
async function bytes(file) {
  try { return await retry(() => readFile(file)); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
async function targets() { return [...(await Promise.all(historical.map(files))).flat(), ...rootScreens]; }
await mkdir(evidence, { recursive: true });
const before = new Map(await Promise.all((await targets()).map(async file => [file, await bytes(file)])));
const productionFiles = ['src/main.ts', 'src/core/simulation.ts', 'src/systems/input.ts', 'src/systems/physics.ts', 'src/systems/contacts.ts', 'src/systems/surfaces.ts', 'src/types/index.ts', 'src/types/contracts.ts'];
async function sourceHashes() { return Object.fromEntries(await Promise.all(productionFiles.map(async path => [path, hash(await readFile(resolve(root, path)))]))); }
const sourceBefore = await sourceHashes();
await writeFile(resolve(evidence, 'source-at-start.json'), JSON.stringify(sourceBefore, null, 2));
// Durable backups permit recovery after an interrupted test runner, too.
for (const [file, content] of before) {
  if (content === null) continue;
  const backup = resolve(evidence, 'history-backup', relative(root, file));
  await mkdir(dirname(backup), { recursive: true }); await writeFile(backup, content);
}
let output = '', exitCode = 1;
try {
  const args = ['run', 'test:e2e', '--', '--config', 'docs/evidence/PAO-12/playwright.config.ts', ...process.argv.slice(2)];
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const actualArgs = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm ' + args.join(' ')] : args;
  exitCode = await new Promise((done, reject) => {
    const child = spawn(command, actualArgs, { cwd: root, env: process.env });
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { const text = chunk.toString(); output += text; process.stdout.write(text); });
    child.on('error', reject); child.on('close', code => done(code ?? 1));
  });
} finally {
  const records = [];
  for (const file of new Set([...before.keys(), ...await targets()])) {
    if (!rootScreens.includes(file) && !historical.some(dir => file.startsWith(dir + sep))) throw new Error('Restore escaped history scope');
    const original = before.get(file) ?? null, current = await bytes(file);
    const changed = original === null ? current !== null : current === null || !current.equals(original);
    let captured = null;
    if (changed && current !== null) {
      captured = resolve(evidence, 'regression-output', relative(root, file));
      await mkdir(dirname(captured), { recursive: true }); await writeFile(captured, current);
    }
    if (changed) {
      if (original !== null) { await mkdir(dirname(file), { recursive: true }); await retry(() => writeFile(file, original)); }
      else if (current !== null) await retry(() => unlink(file));
    }
    const restored = await bytes(file);
    const verified = original === null ? restored === null : restored !== null && restored.equals(original);
    records.push({ path: relative(root, file), changed, captured: captured ? relative(root, captured) : null, beforeSha256: original ? hash(original) : null, restoredSha256: restored ? hash(restored) : null, verified });
  }
  await writeFile(resolve(evidence, 'history-restoration.json'), JSON.stringify({ allVerified: records.every(x => x.verified), files: records }, null, 2));
  const sourceAfter = await sourceHashes();
  const unchanged = JSON.stringify(sourceBefore) === JSON.stringify(sourceAfter);
  await writeFile(resolve(evidence, 'source-stability.json'), JSON.stringify({ unchanged, before: sourceBefore, after: sourceAfter }, null, 2));
  await writeFile(resolve(evidence, 'e2e.log'), output + `\nexitCode=${exitCode}\n`);
  if (!records.every(x => x.verified) || !unchanged) exitCode = 1;
}
process.exitCode = exitCode;
