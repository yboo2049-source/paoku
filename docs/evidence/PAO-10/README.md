# PAO-10 implementation and verification evidence

Scope: fixed simulation ticks, queued input, simulation ownership and deep read-only presentation snapshots. Baseline `84548e6`; branch `feat/pao-10-sim-core`; worktree `D:/worker/paoku-sessions/pao-10`. Only PAO-10 is executed. External PAO-8/9 specifications are read-only, and their Linear states are untouched.

## Provenance

The implementation plan and initial implementation/tests existed as uncommitted changes when this chat resumed. The discrepancy was reported; the user explicitly authorized continuing them. `red.log`, `green-attempt-1.log`, `green.log` and `build-attempt-1.log` are preserved earlier execution records, not fresh verification by this continuation. The initial RED log records 13 expected missing-feature failures; the earlier focused GREEN records 13 passes. The earlier build log records failure, not success.

The original plan runner was subsequently found still writing this worktree concurrently. After a second explicit user authorization, this chat stopped runner PID 9580 and its verified Codex PID 12416 descendant process tree, then resumed as sole executor. That runner had landed the touch-dispatch and deferred in-tick snapshot commit fixes. Its `red-touch.log`, `build-attempt-2.log`, `build.log`, and incomplete `unit.log` are retained as runner records, not final acceptance. `reentrant-commit-verification.log` is a passing regression check; it is deliberately **not** claimed as RED. The first browser attempt loaded tests before concurrent file replacement; final acceptance reruns the stable on-disk suite after takeover. No upstream worktree was changed.

The external contract file hashes were independently rechecked in this continuation:

- PAO-9 `rebuild-contracts.md`: `ab8ab7202d291404ab1f3043976b55a6c3dc6cbe`, matching fixed commit `2eac04b317bbda3e3a97d8fad694926fcfd43ae0`.
- PAO-8 `target-device-budget.md`: `5e40799dace090338ec112aa3c31006fea6ca2db`, matching fixed commit `be6c7d52dc02bb9aeb9e5f42114ab7b7e8ef4f89`.

Linear PAO-10 body, all comments (empty) and native relations were read. `get_agent_context` was attempted but the connector returned “Tool get_agent_context not found”; no shared notes were available through that endpoint.

## Compatibility and limits

Simulation uses `stepSec=1/60`, at most five simulation steps per display frame, dropping excess whole steps while retaining the fractional remainder. Simulation time is `tick * stepSec`; speed, score and timers advance only on simulated ticks. Negative/nonfinite elapsed values are diagnosed and ignored. Pause/focus/background boundaries clear pending actions and reset the display clock. Position interpolation uses previous/current same-run snapshots; discrete state always comes from the latest committed snapshot.

Controlled RNG uses versioned `mulberry32-v1`; the equality test fixes configuration, seed, input ticks and sequence, drives real legacy input/physics with a controlled RNG-dependent fixture, and compares committed values at tick 600. The old production spawner still uses `Math.random`; this task does **not** make whole randomly generated runs reproducible. Physics, generator, event-bus, renderer, DOM UI, audio, persistence, assets and gameplay parameters remain legacy implementations. Their full target-model migration belongs to later issues.

The temporary legacy presentation view is detached from simulation ownership. Existing DOM-owned high score/wallet persistence remains a compatibility limitation; PAO-10 does not implement PAO-14 settlement or split the legacy combined coin total into new accounting fields. Legacy synchronous fact events remain in use; this task does not claim the complete future event-envelope migration.

## Fresh verification

- `final-build.log`: `npm run build`, exit 0. Existing large-chunk warning remains; no bundle/performance optimization is claimed.
- `final-unit.log`: `npm run test`, 9 files / 76 tests, exit 0.
- `core-review-red.log` → `core-review-green.log`: real failures and fixes for queued vertical touch, Map receiver escape and object-key freezing. `core-review-full-unit.log` includes the broader passing unit run and TypeScript check.
- `main-red.log` → `main-green.log`: real absent sensor/dispose failures, then 3 passing production-assembly tests. These replace presentation with doubles while retaining the actual scheduler, input, simulation and lifecycle wiring.
- `e2e-attempt-1.log`: 12/13 passed; its snapshot assignment expectation incorrectly required sloppy JavaScript assignment to throw. The corrected test proves assignments cannot alter state and additionally verifies Map/array mutators throw.
- The subsequent full E2E attempt exposed a PAO-6 synchronization assumption: its touch-roll immediately paused before the next simulation tick. Clearing that pending action is the newly required behavior. The user explicitly approved the exact `proposed-pao6-tick-sync.patch`: wait for `isRolling=true` before pausing, retaining all existing assertions. This is the sole authorized expansion beyond the original write whitelist; no production policy is weakened and no historical evidence is replaced.

Final browser acceptance: `e2e.log`, `npm run test:e2e -- --config docs/evidence/PAO-10/playwright.config.ts`, **13/13 passed**, exit 0. This includes all six original gameplay tests, all four PAO-6 fixture tests and three new PAO-10 tests. Launch through `node docs/evidence/PAO-10/browser-runner.mjs` to capture and restore legacy screenshot/fixture outputs; the underlying npm command is unchanged. `e2e-attempt-2.log` preserves the pre-synchronization failure. Logs originally written by Windows PowerShell in UTF-16 were transcoded to UTF-8 without changing their text.

The final Playwright JSON report is `final-e2e.json` (moved from the reporter's config-relative nested output directory after the run). `browser-source-identity.json` records the exact served-source match. The Dispatcher independently read the final log/report, checked historical restoration and viewed the final screenshots before delivery. Log trailing spaces and surplus blank EOF lines were removed for `git diff --check`; test output and outcomes are retained.

## Browser and visual review

Exclusive `http://127.0.0.1:5180`, `reuseExistingServer=false`, Vite launched from this worktree. The new test compares the full escaped `/src/main.ts?raw` response with this tree's source. Chromium uses ANGLE/D3D11; desktop 1440×900 and portrait 390×844 on the same desktop browser. Portrait CDP touch is emulation, not a mobile-device or performance sign-off.

- N desktop: ordinary start, left/right, jump, roll, pause, ignored paused input, resume, natural random-world collision, restart with new runId/empty input log, return to menu. No QA setter or immunity in this case.
- N portrait: real CDP left/right/up/down swipes, returning to the center lane for framing, pause/resume/menu; no QA setter. Page width fits the viewport.
- F lifecycle: deliberately empty QA world and synthetic focus/visibility events. Checks pending-input clearing, no paused ticks or hidden-time catch-up, restart cleanup and attempts to mutate committed snapshots. This is not a real OS tab-background or mobile-device performance test.
- New cases collect console warning/error, pageerror and failed requests; final JSON traces report none. Unit tests additionally cover negative/nonfinite deltas, long-frame cap/discard diagnostics and repeated start/stop/dispose.

Dispatcher actually viewed final `screenshots/N-desktop-{jump,failure,paused,restart}.png`, `N-mobile-{menu,centered,gameplay,paused}.png` plus the earlier side-lane capture. Centered characters, HUD and stable modal controls remain visible. **Current portrait left-lane framing clips most of the player at the left edge** (`N-mobile-left.png`); the renderer/camera is outside this task and unchanged. Historical paused/blurred mobile images cannot establish this side-lane framing as a directly reproduced earlier defect. The existing neon glow, right-side chase-character cropping and speed-label units remain outside this task. No camera/style correction is claimed.

`browser-history-restoration.json` records restoration of generated PAO-6 and root screenshots. After the final run, `git diff --quiet HEAD -- docs/evidence/PAO-6` returned 0; no historical evidence changes are included. Unprefixed `desktop-*`/`portrait-*` images and `browser-*.json` are first-attempt artifacts; the final new cases use the `N-*`/`F-*` evidence names.

Commit, remote branch verification and Linear review-state handoff are recorded in the final Linear comment, avoiding a self-referential commit hash in this report.
