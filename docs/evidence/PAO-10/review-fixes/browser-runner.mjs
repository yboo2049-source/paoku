import { readdir, readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { resolve, relative, dirname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

const root = resolve('.');
const evidence = resolve(root, 'docs/evidence/PAO-10/review-fixes');
const historicalRoots = ['docs/evidence/PAO-6', 'docs/evidence/PAO-10'].map(p => resolve(root, p));
const within = (path, directory) => path.startsWith(directory + sep);
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => {
    const path = resolve(dir, e.name);
    if (path === evidence) return [];
    return e.isDirectory() ? files(path) : [path];
  }))).flat();
}
const rootScreens = [
  'screenshot_1_menu.png', 'screenshot_2_shop.png', 'screenshot_3_gameplay_chase.png',
  'screenshot_4_bank_tilt.png', 'screenshot_5_jump_action.png', 'screenshot_6_paused_screen.png',
].map(p => resolve(root, p));
const before = new Map();
for (const file of [...(await Promise.all(historicalRoots.map(files))).flat(), ...rootScreens]) {
  try { before.set(file, await readFile(file)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
let output = '', exitCode = 1;
try {
  const args = ['run', 'test:e2e', '--', '--config', 'docs/evidence/PAO-10/review-fixes/playwright.config.ts'];
  exitCode = await new Promise((resolveCode, reject) => {
    const child = process.platform === 'win32'
      ? spawn('cmd.exe', ['/d', '/s', '/c', 'npm ' + args.join(' ')], { cwd: root, env: { ...process.env, PAO10_REVIEW_PHASE: 'final' } })
      : spawn('npm', args, { cwd: root, env: { ...process.env, PAO10_REVIEW_PHASE: 'final' } });
    for (const stream of [child.stdout, child.stderr]) stream.on('data', d => { const s = d.toString(); output += s; process.stdout.write(s); });
    child.on('error', reject); child.on('close', code => resolveCode(code ?? 1));
  });
} finally {
  const changed = [];
  const after = [...(await Promise.all(historicalRoots.map(files))).flat(), ...rootScreens];
  for (const file of after) {
    let current;
    try { current = await readFile(file); } catch (e) { if (e.code === 'ENOENT') continue; throw e; }
    const original = before.get(file);
    if (original && current.equals(original)) continue;
    if (!historicalRoots.some(dir => within(file, dir)) && !rootScreens.includes(file)) throw new Error('Unexpected restore path: ' + file);
    if (within(file, evidence)) throw new Error('Revision evidence cannot be restored: ' + file);
    const copy = resolve(evidence, 'regression-output', relative(root, file));
    await mkdir(dirname(copy), { recursive: true }); await writeFile(copy, current);
    if (original) await writeFile(file, original); else await unlink(file);
    changed.push({ path: relative(root, file), revisionCopy: relative(root, copy), originalSha256: original ? hash(original) : null, runSha256: hash(current), restored: !!original });
  }
  const mismatches = [];
  for (const [file, original] of before) {
    const current = await readFile(file);
    if (!current.equals(original)) mismatches.push(relative(root, file));
  }
  await writeFile(resolve(evidence, 'history-restoration.json'), JSON.stringify({ checked: before.size, changed, mismatches }, null, 2));
  await writeFile(resolve(evidence, 'browser-final.log'), output + `\nexitCode=${exitCode}\n`);
  if (mismatches.length) throw new Error('Historical output restoration mismatch');
}
process.exitCode = exitCode;
