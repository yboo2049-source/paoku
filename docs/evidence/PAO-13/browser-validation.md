# PAO-13 browser validation protocol

Only PAO-13 is under test. No old test or game renderer/asset/UI file is changed.

Run from D:/worker/paoku-sessions/pao-13 after production source freezes:

```powershell
$env:PAO13_PHASE='final'
node docs/evidence/PAO-13/browser-runner.mjs
```

The runner invokes `npm run test:e2e -- --config docs/evidence/PAO-13/playwright.config.ts`, including all existing 25 checks and the new PAO-13 checks. The Vite server uses exclusive 127.0.0.1:5184, strictPort and no existing-server reuse. It compares the served raw production sources to the checkout, and hashes the entire src tree before/after the run.

The historical PAO-6/10/11/12 evidence and root screenshots are backed up byte-for-byte under ignored `.pao13-local/<phase>/history-backup/`. Any refreshed old output is mirrored under `.pao13-local/<phase>/regression-output/` and every original is restored and hash-verified in `runs/<phase>/history-restoration.json`. The local browser test-results, backups and regression mirror must remain ignored; no duplicate old screenshots are submitted. Interrupted runs leave a durable original backup for recovery.

New task logs, machine reports, source identity/stability and screenshot manifests live in `runs/<phase>/`. Only new task key screenshots are stored there. Parent Dispatcher reviews actual desktop and 390×844 portrait images before handoff.

Evidence grades:

- **N:** Production UI start, real keyboard/CDP touch, read-only sensors, no QA mode/setters. The reset check uses the real pause/restart button, compares first generated layout and versioned generation state for the same seed and new run ID, and checks the input log is cleared. Read-only rAF instrumentation only observes committed state.
- **F:** Browser-imported catalogue and validator run accepted physics on isolated fixed-speed witnesses while the application stays in MENU/tick0. Before running, a normal SFX preference-button click establishes browser user activation and suppresses witness sound bursts. Legacy physics facts still reach audio/application listeners; the menu guard prevents live action/mission updates, and the test verifies the application remains MENU/tick0. Samples every current single segment and ordered pair at 18/30/45m/s with 150m pre-entry spawn lead. This is finite coverage, not a proof of every seed, speed, input or random combination. Its trace is not presented as an actual rendered run.

The N reset comparison normalizes every run-dependent identifier recursively and excludes the generation state's observation tick. It samples the first rendered observation with a nonzero cursor, checks that cursor/RNG/nextZ agree, and compares static obstacle and reward layouts. Moving obstacle positions are excluded because display observation timing can differ. This is a runtime wiring/reset check; fixed-tick cross-cadence equality is verified separately by unit simulation tests.

Chromium uses Windows ANGLE D3D11. Portrait is desktop touch/viewport emulation, not a phone hardware/performance claim. The renderer is unchanged; old yellow ramp occlusion, side-lane framing, neon presentation and other previously recorded visual limits remain outside this task. No model loading or calibrated GLB proxy alignment is asserted.
