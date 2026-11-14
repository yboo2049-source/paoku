# PAO-13 Seeded Track Implementation Plan

Date: 2026-11-01 (Asia/Shanghai). Baseline: 6efdd1f. Branch: feat/pao-13-seeded-tracks.

**Goal:** Deliver reproducible, versioned segment generation in the real simulation, with physical route witnesses, connected ports, safe rewards and explicit uncalibrated model bindings.

**Architecture:** Keep the accepted Y-up/Z-forward physics, dimensions, 18→45m/s acceleration 0.25, legacy entity arrays and QA replacement boundary. Use a finite data catalogue and bounded seeded variants, ground entry/exit ports, grouped ramp/roof geometry and deterministic instance IDs. Validate candidate routes by executing accepted input and PAO-12 updatePhysics at fixed steps; cache only finite validated template/variant/speed results, use a known simple fallback rather than unbounded search. Sim owns run/seed/RNG/tick and publishes generation metadata. No model loading.

**Tech stack:** Existing TypeScript, Vitest, Playwright Chromium/D3D11. No dependencies.

## Authority and design decision

Read PAO-13 description and dispatch 2ecd4603, GLB supplement cf88ead8 and report notice 9baf833c; AGENTS/CONTRIBUTING; PRD/architecture/workflow/test/Harness specifications; PAO-10/11/12 evidence; read-only PAO-9 contracts, PAO-8 target budget, and GLB review at D:/worker/paoku/docs/assets/2026-11-01-glb-handoff-review.md. User explicitly instructed implementation of this bounded dispatch and supplement. This plan records that authorized design; it does not request a new worktree or reapprove existing scope. Shared master docs and PROGRESS are read-only per the task dispatch; progress/design updates live here and in task evidence.

Alternatives considered: arbitrary procedural search has unpredictable cost; geometry-only checks miss real contacts and motion; a finite catalogue with bounded physical witnesses is selected. Coverage is sampled, not a universal proof. Rhythm stages are candidate content pacing, not frozen product/target-device budgets.

## Data and algorithms

- Segment definitions: stable definition/revision, length, entry/exit lane/height/surface, legal speed range, obstacle placements, reward placements referencing candidate route IDs, bounded variants and stage.
- Instances: run/segment cursor/local IDs, world offset, definition/revision, selected variant, common ramp-to-roof endpoint; one group instance ID and one visual root for each ramp truck, with separately owned logical ramp and train children.
- Binding registry: logical definition → explicit prefab, fixed asset commit 622e7da, model path. Ordinary carriage → train_ramp_or_car.glb; combined ramp truck → train_metro.glb. Status UNCALIBRATED, legacy presentation fallback. Raw bounds/rotation/scale never supply collision or traversal parameters. Only four accepted PowerUpType values; unsupported kinds rejected.
- Generator state: runId/seed/contentRevision/RNG version/state/cursor/next world offset and bounded diagnostics. Reset drops previous-run state. Stable content version and valid inputs give the same layout independent of rendering cadence. No Math.random/Date.now in authoritative generation.
- Validator: finite step/route budget, structured failure with seed/definition pair/speed/commands/reason. Validate ports and common endpoints; execute real movement, relative moving-train collision and pickups. Check reward volume against solids/support height and witness collection. Validate both individual and adjacent segments at 18, 30, 45m/s; relative-speed reaction windows must include incoming train velocity. Invalid definitions/speeds fail or use explicit simple validated fallback.
- Runtime: finite lookahead and per-update generation cap; recycle only fully passed obstacle extents, remove pickups behind player; no unbounded history or object pool retaining run IDs. Document allocation/cache limits and measured validation work. Moving objects must account for their pre-entry movement when checking routes and rewards; do not assume spawn time equals segment entry.

## Isolated implementation tasks (RED → GREEN)

1. **Track/physics owner:** only src/systems/spawner.ts, new src/systems/track.ts, src/data/trackSegments.ts, src/data/modelBindings.ts; track-only additions to src/types/index.ts; tests/unit/trackSegments.test.ts (coordinate with core owner for append). Read physics/surfaces/contacts/input and applicable specs only as needed. First fail tests for deterministic generation/reset/IDs, ports and speed windows, bad rewards/routes, unique binding roots and rejected unknown content. Implement the finite catalogue, physical witnesses and array-compatible spawner. Save RED/GREEN logs and failing-seed regressions under this directory.
2. **Core owner:** only src/main.ts, src/core/simulation.ts, track-generation additions to src/types/contracts.ts, append clearly separated integration tests in tests/unit/trackSegments.test.ts after coordinating. Pass authoritative run/seed/RNG/tick/speed, generation snapshot and reset. Preserve old callbacks, physics order, QA freeze/array replacement. No input, clock, score, mission, audio, UI or rendering behavior changes. First show a failing integration test.
3. **QA owner:** only new tests/e2e/pao13-track.spec.ts and this evidence directory. Verify real runtime seeded metadata, reset, natural desktop/portrait input (N), separately labelled fixed physical witness (F), screenshots and no new browser errors. Add independent review of logic once stable. Do not edit old tests or assert GLBs loaded.

Interface agreement before implementation: SpawnerSystem.reset(runId?, seed?) resets deterministic state; update(playerZ, obstacles, coins, powerUps, frame?) keeps four-argument compatibility, frame carries runId/seed/rng/tick/speed. A read-only generation state accessor supplies snapshot metadata. Core and track owners agree exact exported types before writing.

## Verification and evidence

1. Run RED tests before production implementation; retain command/output and expected failure. Run tsc/unit tests immediately after implementation; fix within scope.
2. Run npm run build and npm run test in full. Record finite catalogue size, seed/variant/pair/speed counts and budget bounds; store any discovered failure seed and exact reproduction command.
3. Freeze production sources; run complete npm run test:e2e through task-local config on exclusive 5184, strictPort, reuseExistingServer false. All prior 25 tests plus new tests, no skipped/weakened assertions. Check raw served source against checkout and before/after hashes.
4. Byte-backup historical evidence/root screenshots, retain durable backup and full regression mirror in local ignored directory, restore and hash-verify all originals. Commit only task logs/summaries/key screenshots/manifest, not duplicate historical screenshots.
5. Personally inspect desktop and 390×844 portrait screenshots. Existing yellow ramp occlusion/camera limitations remain rendering handoff items. Emulator is not mobile hardware. N and F evidence reported separately.
6. Review only task diff; git diff --check; normal commit/hooks; push current branch, verify remote hash. Write evidence, limitations and commit to PAO-13, then set In Review. Never Done, no other task, branch switches or merges.

## Progress

- Context/dispatch/GLB review read; clean baseline and prepared branch confirmed; Linear set In Progress.
- At initial plan creation, implementation had not started. Rendering/assets/UI/shared docs remain outside the write scope.

### Implementation checkpoints

- Core RED: missing generation frame, reset and snapshot metadata (3 assertions), then real-spawner and actual-main assembly RED. Minimal callbacks preserve existing fixed-step/physics order and QA replacement boundary.
- Track RED: initial 13 missing deterministic/physical/binding behaviors; later variant/immutability and malformed combination/dynamic reward checks added before their fixes.
- Review adjustment: physical witnesses execute only in tests/tooling because accepted physics emits legacy global facts. Production admits a finite frozen catalogue with structural checks; no runtime witness search or event suppression is introduced.
- Saved failure seed 13: calm → under-over, 45m/s with inherited SUPER_SNEAKERS could miss the ground reward at local Z90. Remove that unverified reward placement, retaining obstacle geometry and accepted physics/action constants. Regression still executes the effect-carrying pair and verifies every remaining reward is collected.
- Main lifecycle resets preserve the current run identity for podium/menu/shop and use the new owner identity on restart. Existing generic Simulation.restart callers remain responsible for supplying/resetting their world context; this task does not add checkpoint restoration.
- Credit interruption stopped two isolated workers after their initial files landed. Continuation retained this worktree and all RED records. No branch/worktree or baseline replacement occurred.
