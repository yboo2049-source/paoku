# PAO-13 core wiring and independent logic review

Reviewed 2026-11-01 (Asia/Shanghai). Reviewer owns the minimal main/simulation/contracts integration and reviewed the separately implemented track/spawner/data logic read-only. No rendering, UI, asset, input, scoring, physics/contact/surface algorithm or dependency edits.

## Core implementation and evidence

- Simulation supplies one authoritative runId/seed/RNG/tick/speed frame to the existing afterStep callback; existing three-argument callbacks remain compatible. Main forwards it as the optional fifth spawner argument, preserving the four-argument QA replacement boundary.
- Optional generation lifecycle callbacks reset before initial/restart commit. Committed snapshots carry immutable generation state and its content revision. Standalone simulations and the old mocked-spawner tests retain their previous compatibility path.
- Actual START clears world arrays and restarts the owner. Menu/shop cleanup retains the current owner identity while clearing generator cursor/world arrays. Generic Simulation.restart without a replacement context retains its existing context semantics: callers are responsible for clearing world state; the production main path does so.
- Three initial assertions failed before implementation: missing owned callback frame, missing generation reset and missing committed metadata (`core-red.log`). Actual-spawner and production-main cases independently failed while their new generator API was absent (`core-spawner-red.log`, `core-main-red.log`). The actual-spawner and actual-main integration then passed 5/5 (`core-real-green.log`).
- All five core cases now reside only in `tests/unit/trackSegments.test.ts`. Earlier evidence-directory test paths in RED logs record their initial location, not additional final tests. A consolidation attempt failed because the local python executable pointed at an unavailable WindowsApps launcher; the five cases were restored directly from their saved source, then targeted acceptance passed. No production changes were lost. `core-consolidated-green.log` is the verified restored 23-test run before two further logic regressions were added.
- Core tests use real Simulation/GameLoop/updatePhysics/spawner. One production-main assembly test replaces presentation and unrelated audio/mission services only. It verifies menu/shop identities, clean world arrays, deterministic restart layout and no synthetic witness PLAYER_ACTION/COIN/POWERUP/COLLISION facts during generation. This is unit assembly evidence, not a browser/rendering claim.
- `core-all-unit-final.log` and `core-types-final.log` are the final independent full-unit and TypeScript checks. Parent owns the build/browser/source-freeze acceptance and final totals.

## Independent track review

The real witness uses accepted input and PAO-12 updatePhysics at 1/60s. It carries the same player/contact/effects/world state across adjacent segments. It never enables godMode or initial immunity; if a generated HOVERBOARD is consumed by a collision, the resulting protection timer causes witness rejection rather than rescuing an invalid route. Missing actions produce an actual collision failure. Rewards must be collected by the witness; static embedding and moving-train occupancy are checked.

The runtime spawner does not execute synthetic physical witnesses. This matters because the accepted physics/input functions publish legacy global facts, which could otherwise affect the production app. Runtime admission is bounded structural validation of the finite, frozen catalogue; physical certification is performed by tests/tooling. New content still requires fresh physical matrix validation before being released.

The generator consumes the simulation stream when supplied; its compatibility RNG has the same explicit mulberry32-v1 algorithm. Versioned IDs use run/content/cursor/local identity. Cursor reset and array cleanup are checked independently, and committed state does not expose a mutable generation authority. The fixed asset commit resolves locally to `622e7daa2262015f34e511e59628a3653273994d`; explicit carriage/ramp-truck mappings match the GLB report. Logic does not use raw GLB bounds, rotations or uncalibrated transforms.

Runtime work has an explicit two-segment generation cap and finite catalogue/layout bounds. Passed obstacles are reclaimed by their entire extent, while active segment metadata is filtered after the segment exits. Offline witness steps and sequence length are bounded. Moving obstacles are advanced during the spawn-lead interval and continuously through pair witnesses, rather than being treated as static endpoint geometry.

## Findings resolved by the logic owner

1. Eight variants initially selected only three power-up kinds. The mapping now spans all four accepted types; a physical effect-carrying pair matrix protects the change.
2. Initial physical tests covered variants 0/1 only. The matrix now exercises all eight finite variants, all four singles and all sixteen ordered definition pairs at 18/30/45m/s. Additional pair coverage includes carried effects.
3. Malformed groups could create duplicate visual roots. Group cardinality/orphan validation now requires exactly one logical ramp and one static roof; children share one stable group/root and common endpoint. Regressions reject duplicates and orphan children.
4. Structural guards now reject malformed content arrays, unknown definitions and substituted raw dimensions; moving reward occupancy has a negative regression.
5. The potential synthetic event leak was avoided by keeping physical witnesses out of the production generation path and is protected by the actual-main integration test.

No remaining blocker was found in the reviewed final scope. The existing physics/rendering limitations are not inferred to be solved by these tests.

## Coverage limits

- Finite 18/30/45m/s witnesses are sampling, not a proof for every intermediate speed, every acceleration history, arbitrary input, all long histories or future content. Pair tests carry real state but use one selected variant across each pair; they are not an exhaustive 8×8 mixed-variant cross product. Additional generated-seed tests check repeatable selection and bounded metadata, not whole-run player survival.
- Witnesses instantiate the tested sequence before the lead interval; future members can therefore have a longer pre-entry motion history than production's progressive lookahead. The current moving hazards stay off the certified central route, and moving occupancy/relative-speed checks remain explicit. This is not a general certification of arbitrary moving layouts or cross-lane routes.
- The catalogue uses ground center entry/exit ports and bounded candidate pacing. It does not establish a rich branching-route system or freeze product pacing/target devices.
- Fixed seed/version/input determinism is not old-save replay or complete checkpoint restoration. GLB bindings remain UNCALIBRATED with legacy presentation fallback, not runtime asset import or proxy alignment evidence.
