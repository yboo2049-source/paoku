import { readdir, readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve('.');
const evidence = resolve(root, 'docs/evidence/PAO-10');
const historical = resolve(root, 'docs/evidence/PAO-6');
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? files(resolve(dir, e.name)) : [resolve(dir, e.name)]))).flat();
}
const rootScreens = Array.from({ length: 6 }, (_, i) => resolve(root, [
  'screenshot_1_menu.png', 'screenshot_2_shop.png', 'screenshot_3_gameplay_chase.png',
  'screenshot_4_bank_tilt.png', 'screenshot_5_jump_action.png', 'screenshot_6_paused_screen.png',
][i]));
const before = new Map();
for (const file of [...await files(historical), ...rootScreens]) {
  try { before.set(file, await readFile(file)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
}
let output = '';
let exitCode = 1;
try {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npm run test:e2e -- --config docs/evidence/PAO-10/playwright.config.ts']
    : ['run', 'test:e2e', '--', '--config', 'docs/evidence/PAO-10/playwright.config.ts'];
  exitCode = await new Promise((resolveCode, reject) => {
    const child = spawn(command, args, { cwd: root, env: process.env });
    for (const stream of [child.stdout, child.stderr]) stream.on('data', d => { const s = d.toString(); output += s; process.stdout.write(s); });
    child.on('error', reject); child.on('close', code => resolveCode(code ?? 1));
  });
} finally {
  const records = [];
  for (const file of [...await files(historical), ...rootScreens]) {
    let current;
    try { current = await readFile(file); } catch (e) { if (e.code === 'ENOENT') continue; throw e; }
    const original = before.get(file);
    if (original && current.equals(original)) continue;
    const inside = file.startsWith(historical + '\\') || file.startsWith(historical + '/');
    if (!inside && !rootScreens.includes(file)) throw new Error('Unexpected restore path: ' + file);
    const copy = resolve(evidence, 'regression-screenshots', inside ? 'pao6/' + relative(historical, file) : relative(root, file));
    await mkdir(dirname(copy), { recursive: true }); await writeFile(copy, current);
    if (original) await writeFile(file, original); else await unlink(file);
    records.push({ path: relative(root, file), evidence: relative(root, copy), restored: !!original });
  }
  await writeFile(resolve(evidence, 'browser-history-restoration.json'), JSON.stringify(records, null, 2));
  await writeFile(resolve(evidence, 'e2e.log'), output + `\nexitCode=${exitCode}\n`);
}
process.exitCode = exitCode;
