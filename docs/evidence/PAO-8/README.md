# PAO-8 performance probe

Plan authorized by PAO-8: sample the existing game at isolated port 5178 without editing game code. Use desktop Chromium ANGLE D3D11, 1440x900 DPR1 and 390x844 desktop viewport emulation. Record fresh-context and warm-reload navigation, a disclosed dense runtime fixture, twenty forced collision/restart cycles, and a 180-second god-mode run with the production random spawner.

The probe records requestAnimationFrame intervals (not GPU duration), CDP JS heap, navigation/resource timing, scene resource counts where accessible, browser errors and screenshots. Dev-server localhost loading and desktop viewport emulation do not establish shipping loading budgets or phone performance. Heap samples without forced GC do not prove leaks. No audio listening validation is included.

## Reproduce and interpret

From repository root, start `npm run dev -- --host 127.0.0.1 --port 5178 --strictPort`, then run `node docs/evidence/PAO-8/probe.mjs`. The main probe takes about seven minutes. To collect a separate dense fixture near the original environment, set `PAO8_ORIGIN=1` and run the same script; unset it afterward. Run `node docs/evidence/PAO-8/verify.mjs` to check complete samples and create compact summary/validation JSON.

Loading readiness means `__GAME_SENSOR__` exists and START RUN is visible. It is not a check that every model/first-run resource has completed loading. New context uses a fresh browser storage/cache context, but the Vite optimizer and OS file cache are warm. No network throttling, production compression or mobile CPU/GPU simulation is used. Menu screenshot follows the warm reload. Resource timing includes the development module graph and must not be compared with a release transfer-size budget.

The 180-second scenario uses existing QA god mode, random production generation and no player input. Six consecutive 30-second rAF windows are captured; JSON statistics are sampled between windows. Screenshots are taken outside these windows. Terrain/track scenery is absent at the distant long-run coordinates in the screenshots, so the later windows and subsequent dense fixture do not represent sustained full-environment rendering. A separate `dense-origin.json` and `*-dense-origin.png` capture the same dense fixture close to the start with normal environment visible. Neither fixture proves normal route reachability or the final sample's worst simultaneous load.

The dense fixture temporarily replaces the spawner update in browser memory and maintains 60 static trains and 180 coins ahead of the player; god mode remains enabled. It is artificial pressure, not a seed from normal generation. Counts are scene total meshes/triangles/materials/textures/texture pixels, not draw calls, submitted visible triangles or VRAM. `activeMeshes` is the engine's active-mesh list and is not a rendered-triangle counter. Particle counts sum the existing scene systems; this probe does not trigger every effect combination.

Restart cycles freeze normal generation through a temporary browser-memory spawner replacement, disable god mode, clear invulnerability and put one low obstacle in the center lane. After a real collision reaches GAMEOVER, Playwright clicks the real RESTART button, waits for PLAYING and samples state/resources. There is no whole-page reload between the twenty cycles. Reported restart delay includes Playwright actionability/CSS transition waits and Node polling, so it is not input-to-photon latency.

## Harness refinement

The first desktop attempt completed loading, long run and dense sampling, then timed out waiting for GAMEOVER from an immediately adjacent static-train fixture. The mobile first attempt also completed loading, long run and dense sampling before the collision wait timed out; its long-run screenshot shows a retained hoverboard, which makes an immediate fatal-hit assumption unsafe. These timeouts are harness observations, not diagnosed game defects. The fixture was changed to LOW_OBSTACLE and each viewport's twenty restarts were collected in a fresh browser context while preserving the completed loading/long-run/dense data. `PAO8_RESUME=1` is the recovery mode used; `restartContext` in measurements.json discloses the split. The final script additionally initializes a new run through the existing START_GAME event before the restart stage, removing retained buffs. Do not compare pre-restart heap with the previous context's dense heap.

The browser uses ANGLE D3D11 on the GTX1650 desktop. A 390x844 viewport does not test phone hardware, thermal behavior, Safari, physical touch or high-DPR load. `environment.json` records the Windows/CPU/GPU configuration. The evidence contains no listening validation or recorded audio.

## Visual observations (existing game, no repair in PAO-8)

Desktop menu actions and audio controls are fully visible. The central menu card obscures the background runner as in PAO-6. Long-run screenshots visibly lack track/roadside scenery at the distant coordinates, while trains, coins, runner and HUD continue; this limits late-run performance representativeness. On the 390x844 long-run screenshot, HOVERBOARD ACTIVE overlaps the bottom speed panel, and the pursuer is partially outside the frame. The mobile menu's main buttons remain visible with no horizontal document overflow, but that does not mean all gameplay layouts pass. These are records for subsequent layout/environment tasks; PAO-8 changes no game behavior or visuals.

## Completed probe results

Chromium 151.0.7922.34, Windows 11 10.0.26300, i5-12400, GTX1650, DPR1. All times below are observations of this development probe, not budget acceptance.

| Observation | Desktop 1440x900 | Desktop-emulated 390x844 |
| -- | -- | -- |
| Fresh-context / warm visible-menu observation | 1899 / 678 ms | 1652 / 722 ms |
| Six long-run windows total wall duration | 180278 ms | 180338 ms |
| Long-run rAF p95 across windows | 16.7–16.8 ms | 16.7–16.8 ms |
| Long-run heap at 30 / 180 sec, no forced GC | 120.8 / 143.2 MiB | 130.5 / 144.1 MiB |
| Long-run final scene material / texture counts | 52 / 8 | 52 / 8 |
| Dense-origin samples / p95 / p99 | 601 / 16.7 / 16.8 ms | 594 / 16.7 / 33.3 ms |
| Dense-origin scene meshes / total triangles | 705 / 452374 | 705 / 452374 |
| Twenty restart observations min–max | 386–936 ms | 389–988 ms |
| Fresh restart-context heap before / after 20 cycles | 109.6 / 105.0 MiB | 123.5 / 113.9 MiB |

No sampled rAF interval exceeded 50 ms in these runs. The 390x844 long-run maximum equals 50 ms; `over50ms` intentionally means strictly greater than 50. Main-probe browser warning/error/pageerror/requestfailed logs are empty. Supplemental dense-origin captures pageerror only and logged none; do not infer full request/console coverage for that supplemental probe.

`measurements.json` contains raw main-run rAF arrays, per-snapshot resources and restart states; `dense-origin.json` contains the supplemental near-start samples; `summary.json` is mechanically derived; `validation.json` records verification of complete states/counts and screenshots. Ten PNGs cover menu, long run, distant dense fixture, twentieth restart, and near-start dense fixture for both viewports. Node syntax checks and `verify.mjs` exited zero. Existing product regression checks are recorded separately by the Dispatcher.

## Dispatcher validation

`npm run build` exited 0, retaining the existing >500kB chunk warning. `npm run test` passed 56/56 tests in 5 files. `npm run test:e2e -- --config docs/evidence/PAO-8/regression.config.ts` passed the six existing gameplay tests at isolated port 5178 using D3D11; see build.log, unit.log, e2e.log and regression-results.json. The six root screenshots produced by that existing suite were copied to regression-screenshots, inspected, then restored in the repository root. Shop and pause stills capture CSS entry transitions and are not stable-panel readability evidence. No shared test configuration or gameplay implementation was edited.

SHA256SUMS.txt covers the evidence files other than itself. Text (.md/.json/.mjs/.ts/.log) is normalized from CRLF to LF before hashing, matching the PAO-6 evidence convention. Images are hashed as raw bytes. Re-running the probe or verifier changes generated evidence and requires regenerating the manifest.
