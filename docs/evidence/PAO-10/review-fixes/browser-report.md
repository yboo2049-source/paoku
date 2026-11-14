# PAO-10 P2 browser review evidence

Final validation: 2026-11-01 (Asia/Shanghai), Chromium via Playwright, ANGLE/D3D11,
desktop 1440×900 and portrait 390×844. Portrait is desktop viewport emulation,
not mobile hardware or performance acceptance.

## RED and GREEN

- `browser-red.log` / `red-e2e.json`: three real-browser regressions failed on
  the unfixed source. MENU volume ArrowRight stayed 60; focused START Space
  left the run ABANDONED; focused RESUME Space left it PAUSED; focused HUD
  button ArrowLeft moved the player from lane 1 to lane 0. The paused
  noninteractive movement rejection assertion passed before the repair.
- `browser-green.log` / `final-e2e.json`: all 16 tests passed, zero skipped,
  unexpected or flaky tests. This includes every prior 13 E2E and the three
  new regressions. Actual command: `npm run test:e2e -- --config
  docs/evidence/PAO-10/review-fixes/playwright.config.ts`.
- The new tests use actual Playwright keyboard input, native range/button
  controls and read-only sensors. They do not enable QA mode or inject
  gameplay state. START/RESUME Space also verifies no unintended jump.
- New regression listeners collected zero console warning/error,
  pageerror or requestfailed entries; per-case `final-*.json` retains them.

## Server identity and preservation

The config starts exclusive port 5180 with `--strictPort` and
`reuseExistingServer: false` from this worktree. `final-source-identity.json`
records exact full raw-source equality with the local input module and its
SHA-256, plus the worktree cwd. No other task's server is reused.

Use `node docs/evidence/PAO-10/review-fixes/browser-runner.mjs` for repeat runs
that preserve history. `history-restoration.json` records 152 pre-existing
files checked, 52 changed test outputs copied into `regression-output/`, and
zero byte mismatches after restoration. PAO-6 and prior PAO-10 screenshots,
JSON, logs and root screenshots remain unchanged. This revision changed no
existing E2E source or prior config. The absolute JSON reporter output path
avoids the earlier nested-report issue.

## Images actually viewed

- `screenshots/final-desktop-native-start.png`: centered runner and intact HUD
  after native Space activation.
- `screenshots/final-desktop-interactive-arrow.png`: focused pause button is
  visible; the runner remains in the center lane after ArrowLeft.
- `screenshots/final-portrait-native-resume.png`: full runner visible in center
  lane, main HUD controls accessible.
- `screenshots/final-portrait-stable-paused.png`: opaque stable pause panel,
  readable text and all three buttons inside the viewport.
- Current rerun's desktop failure screenshot in
  `regression-output/docs/evidence/PAO-10/screenshots/N-desktop-failure.png`:
  readable stable settlement with accessible restart/menu buttons.

No new obvious visual regression was observed in these images. The already
disclosed portrait left-lane framing limitation remains outside this repair.
Terminal interpolation is covered by the core unit regression; these still
images do not independently prove absence of frame-to-frame motion jitter.
The old random generator remains unseeded and no whole-run replay claim is made.
