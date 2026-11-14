# PAO-10 P2 review revision evidence

Base: `014b6f63b69ef31905f14e2189282af2c68d3feb`; same `feat/pao-10-sim-core` worktree. Linear comment `80289790-4112-4c0d-a5a7-9cdff7faa22d` is the review authority. Only PAO-10 revisions execute; upstream states and implementations remain untouched.

## Root cause and changes

Input's queue collection path had no active-run predicate, yet cancelled arrows/space before the queue could reject inactive inputs. Cancellation must follow queue acceptance and interactive-control targeting. A read-only acceptance query supplies the current lifecycle state; interactive controls retain native behavior. Inactive ordinary motion still reaches queue rejection diagnostics but cannot mutate simulation or become pending input.

Interpolation retained the final pair of movement snapshots after simulation stopped. Non-RUNNING snapshots must return their committed positions for every alpha; RUNNING same-run position interpolation and latest discrete state remain unchanged. No UI, renderer, physics, generator or gameplay parameter migration is included.

## TDD and acceptance

`core-red.log` records four real failing regression tests before production edits. These cover inactive native defaults, interactive targets, direct non-running snapshot interpolation and a tick that transitions to GAMEOVER. Existing running-interpolation and paused-input rejection assertions remain.

`core-green.log`: focused 22/22 passes after repair. `core-unit.log`: all 81/81 unit tests pass, retaining the previous 76 tests and adding five regressions. `core-build.log`: build exits 0, with the existing chunk-size warning. TypeScript and diff checks pass. These checks were rerun on November 1 after the interrupted revision resumed; the October 31 RED records remain the original failing evidence.

Production changes are limited to a read-only `InputQueue.isAccepting` getter, the keyboard default/control guard and a non-RUNNING phase guard in snapshot interpolation. No main, simulation, rendering, UI, physics or other implementation changes are needed. The input guard checks the composed event path, including control descendants. The snapshot guard precedes all interpolation and therefore applies to in-range, out-of-range and nonfinite alpha values. Independent read-only review found no actionable defect.

Earlier PAO-10 evidence remains historical evidence of the original implementation, not proof of these revisions. Fresh browser results and screenshot review follow below after execution.

## Browser verification

`browser-red.log` / `red-e2e.json`: three real browser regressions failed before repair. Native MENU slider ArrowRight stayed at 60; Start Space did not start; Resume Space stayed PAUSED; a focused gameplay button's ArrowLeft incorrectly changed lanes. The paused ordinary-motion rejection check already passed and is retained.

`browser-final.log` / `final-e2e.json`: full suite **16/16 passed**, 0 skipped, 0 flaky, exit 0. This retains all 13 previous E2E cases and adds three keyboard regression cases. The exact command is `npm run test:e2e -- --config docs/evidence/PAO-10/review-fixes/playwright.config.ts`; launch via `node docs/evidence/PAO-10/review-fixes/browser-runner.mjs` to copy current outputs to this revision and restore historical bytes. New regression traces `final-*.json` record no console warning/error, pageerror or failed request.

Browser is real Playwright Chromium with ANGLE/D3D11 on exclusive port5180. Server reuse is disabled, and the full served `/src/systems/input.ts?raw` response is compared with this worktree's file. Tests use native keyboard events: range ArrowRight, Start Space, paused ordinary movement, Resume Space and a focused HUD control's arrow. No UI or renderer writes are used. Portrait390×844 is desktop-browser emulation, not a mobile-device sign-off.

Both QA and Dispatcher actually viewed `screenshots/final-desktop-native-start.png`, `final-portrait-native-resume.png`, and `final-portrait-stable-paused.png`. The centered player and HUD are visible after native start/resume, and the stable pause panel controls fit the portrait viewport. No new obvious layout issue is visible in these captures. Previously disclosed neon styling, chase-character edge cropping, portrait side-lane clipping and unseeded legacy generation remain outside these two P2 repairs.

`history-restoration.json` reports no mismatches after restoring previous PAO-6, PAO-10 and root screenshot files; copied current-run outputs live under `regression-output/`. Git comparisons confirm PAO-6 and the prior PAO-10 screenshots/report are unchanged. Only the three production files, regression tests, revision plan and this evidence directory belong to the revision commit. Final commit/push and Linear handoff are recorded in the Linear comment.

For clean diff validation, trailing spaces and surplus blank EOF lines were removed from revision logs and generated RED error-context Markdown; recorded assertions and outcomes are unchanged.
