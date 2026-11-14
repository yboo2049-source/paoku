# PAO-10 implementation plan

Baseline: 84548e6f383c949bc3b901e6c998079b8e9d6bc0; worktree D:/worker/paoku-sessions/pao-10; branch feat/pao-10-sim-core. Initial status clean. Only PAO-10 executes.

## Authority and workflow

Approved overall design plus Dispatcher M1 clarification in architecture/workflow and consistency review govern this implementation. PAO-9 fixed blob ab8ab7202d291404ab1f3043976b55a6c3dc6cbe and PAO-8 fixed blob 5e40799dace090338ec112aa3c31006fea6ca2db match their external working files by git hash-object / git rev-parse. No cherry-pick or external write. Linear PAO-10 read (no comments), native blockedBy PAO-8/9; both delivery/review comments read; status set In Progress.

Skills located under C:/Users/Administrator/.workbuddy/plugins/marketplaces/codebuddy-plugins-official/external_plugins/superpowers/skills (documented ~/.workbuddy/skills location missing). executing-plans, test-driven-development, verification-before-completion read and applied. User authorizes autonomous execution of this approved task, including final normal commit/push; no new product choice.

## Requirements, algorithms and structures

- Fixed scheduler: stepSec=1/60 candidate (compatible with prior 60Hz integration); maxSteps=5 candidate. Accumulate finite nonnegative display deltas, run at most five fixed ticks, discard excess whole steps and retain substep remainder. Record invalid deltas and discarded seconds/steps. No unlimited catch-up. rAF renders once independently of number of steps. Pause/stop/background reset accumulator and clock; first resumed callback has no elapsed wall time. Test these values rather than derive tick from device FPS.
- InputCommand is the PAO-9 subset: runId/tick/sequence/action/source. Collection queues currentTick+1; ordered consumption on tick start; reject wrong run, late, duplicate/consumed sequence, invalid command and paused input with counters. Clear pending inputs and partial gestures on focus loss/pause/restart. Application Escape is separate from motion log. Keep standalone legacy InputSystem.init behavior for existing consumers/tests, production uses queue collector.
- Simulation owns one legacy Context during transition, never two mutable states. Fixed-step adapter invokes existing physics/spawner/mission delegates within the tick; keeps X right/Y up/Z forward, foot origin, speed 18 +0.25/s capped45 and distance*0.1*multiplier. Timers run only inside fixed ticks. Legacy PLAYER_ACTION emitted only on actual command application; no parallel new fact stream. Snapshot supplies metadata (run/tick/version/seed), deep frozen value state and last input sequence. Snapshot Map is copied and rejects mutation.
- Versioned injectable RNG: mulberry32-v1, uint32 seed/state and explicit config/simulation versions. Controlled tests use RNG-dependent fixture integration with actual input/physics. Production old spawner still Math.random (legacy); no whole-level replay claim.
- Previous/current same-run snapshots; only continuous player/entity positions interpolate, latest phase/ledger/pickup/action data. Clamp alpha; first/restart/explicit teleport uses current only. Legacy rendering reads snapshot via a typed compatibility boundary. Legacy UI receives read-only proxy whose known state/highScore/totalCoins writes are ignored (state already delivered by command events; persistence remains UI-owned pending PAO-14); no writes flow from presentation to simulation.
- Lifecycle: idempotent start/stop/dispose, one outstanding rAF; callbacks stopped from inside update cannot reschedule. Main visibility/blur pauses playing run, clears input, resets scheduler; hidden wall time is discarded. Listener teardown via dispose/HMR.

## Exact write scope

src/core/gameLoop.ts, src/systems/input.ts, src/main.ts; new src/types/contracts.ts, src/core/simulation.ts, src/core/inputQueue.ts, src/core/snapshot.ts; new tests/unit/{simulation,inputQueue,snapshot}.test.ts; tests/e2e/pao10-simulation.spec.ts; docs/evidence/PAO-10/**. src/types/index.ts only if a necessary compatibility export is required. No physics/spawner/UI/render implementation, dependencies, existing tests/configs or shared docs changed.

## Continuation checkpoint

On resuming this chat, HEAD remained 84548e6 on feat/pao-10-sim-core, but the implementation, focused tests and logs above were already uncommitted. The user explicitly authorized continuing these changes after that discrepancy was reported. The initial-clean statement above belongs to the earlier recorded execution, not this continuation. Existing RED/GREEN and failed build logs are preserved as prior evidence; fresh verification will be recorded separately. PAO-10 is In Progress; no upstream issue state is changed. Shared design/PROGRESS remain read-only per this task's explicit scope.

Dispatcher assigns isolated reviews of core/input, main compatibility wiring, and browser QA. Any discovered behavioral defect gets a new regression RED/GREEN pair before its fix. Production snapshot diagnostics may be exposed through the existing read-only sensor for browser assertions; no new production write control is authorized. Existing gameplay and PAO-6 tests retain their assertions. Final evidence distinguishes prior logs from newly executed results and documents compatibility limitations.

## Execution and acceptance

1. Write behavior tests before implementation. Bootstrap absent modules through test-side feature assertions (no unresolved-import RED). Save real failing output for specified three-file command. Tests cover cadence equality at tick600, input ordering/rejection/blur, lifecycle/rAF/negative/long frames, snapshot immutability/run reset/discrete interpolation.
2. Minimum implementation and production assembly; run focused tests to GREEN, build and full unit tests; repair within scope. Stop/report same failure after three repair attempts.
3. New Playwright tests with production keyboard/touch flow, separate explicitly F lifecycle/controlled-world fixtures. Exclusive port5180; config in this evidence folder includes all existing E2E plus new task tests (including existing PAO-6 fixtures). Record errors and screenshots desktop1440x900/mobile390x844; inspect real images. Never use teleport as natural input evidence.
4. Run npm run build, npm run test, npm run test:e2e -- --config docs/evidence/PAO-10/playwright.config.ts; save logs/exit codes. Restore only unrelated historical screenshot outputs generated by this execution; keep evidence copies here.
5. Review requirements, limitations and diff --check, stage only whitelist; normal commit hooks then git push -u origin HEAD; compare remote hash. Report actual commit/push status to PAO-10 and set In Review only upon successful delivery, never Done. No subsequent tasks.

## Main wiring review continuation

The continuation review adds read-only sensor accessors for committed snapshots,
accepted tick inputs and copied/frozen scheduler/input diagnostics. This makes the
production assembly observable without adding a production write capability.
Main-owned EventBus subscriptions are recorded as cleanup callbacks; an idempotent
`disposeGame` removes them together with input, focus/visibility listeners and rAF,
and is also the HMR cleanup entry. UI/render implementations remain unchanged.
Legacy UI state/highScore/totalCoins setters stay acknowledged only in its view:
its existing persistence still uses UI-owned saved values, never snapshot writes.
`tests/unit/pao10-main.test.ts` drives the actual entry/input/scheduler/simulation
with presentation-only test doubles. Actual RED is `main-red.log` (three failures
for absent new sensor/dispose capabilities); GREEN is recorded after wiring.

## Approved PAO-6 regression synchronization exception

The user approved exactly `proposed-pao6-tick-sync.patch` after full-suite attempt 2
exposed the old mobile test pausing before the queued ROLL's simulation tick.
The sole authorized existing-test edit splits that gesture line and waits with
`expect.poll` for `isRolling === true` before pausing. All prior assertions remain;
no gameplay code or historical PAO-6 evidence is changed. Apply this exception
before the final full 13-test browser run, retain the original failure log, and
restore historical screenshot/JSON outputs after copying this run's evidence.
