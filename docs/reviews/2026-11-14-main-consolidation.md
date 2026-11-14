# 2026-11-14 main consolidation

## Authorization and scope

The user requested consolidating all local/remote task branches into main and removing retired branches, worktrees and Codex project entries. On 2026-11-14 the user explicitly approved recording existing E2E failures and merging this checkpoint before repairs. This is a consolidation checkpoint, not a claim that all QA gates pass or PAO tasks are Done. Normal build/unit hooks remain enabled.

Production source: `codex/pao-26-final-delivery@f3ed1972b7adf503577c1d80a0781bf079331cb4`. Remote main base: `7a2fb2963deae061d15deae4019910a15f0dfbcf`. The runner add/add conflict retains the final-delivery optimized GLB. Existing runtime files must retain the final-delivery version when historical branches are reconciled. Historical assets/tools, documentation and evidence are retained; these do not certify production rig/animation acceptance.

## Independent verification of the production source

Evidence directory: `D:/worker/paoku-diagnostics/main-merge-20261114` (outside the Vite watch tree).

- Build passed. Unit default scheduling: 398/399, one 5000ms track-segment test timeout. Serial file scheduling at the same timeout: 399/399. Normal hooks use Vitest's supported `VITEST_MAX_WORKERS=1`; no hook or assertion is bypassed.
- Complete E2E: 101/108 passed, 7 failed, retries=0, skipped=0; Windows D3D11, one worker, 60000ms original budget. Assertion-preserving test mirrors redirect outputs outside the watched tree; reversal/hash manifest retained. Original run and failures are not overwritten.
- Two fact-bridge tests requested historical hard-coded port 5198 rather than this run's 5214; those are harness failures. A bounded corrected-port follow-up will be recorded separately.
- Existing recorded ramp/roof fixture timed out; no physics fix or assertion change is included.
- Mobile Q1 resource check: 114 visible meshes, 100 budget; withinBudget=false. The 65-second vertical-slice witness itself passed.
- Mobile maximal HUD/final projection, warm-host stability and loaded-menu clearance assertions also failed; traces and screenshots retained. These remain follow-up items, not accepted fixes.
- Desktop menu/gameplay and mobile HUD screenshots inspected. The additional failed mobile-menu screenshot was inspected. No visual acceptance of the failed assertions is claimed.
- Incoming historical raw logs contain whitespace findings in `git diff --check`; they remain byte-identical evidence. The resolved production merge has no diff against the production source and introduces no new whitespace relative to that source.

## Preservation and cleanup rules

A complete-history Git bundle and exact refs inventory were created and verified before cleanup: `branches-before-cleanup.bundle` and `refs-before-cleanup.txt` in the evidence directory. Branch deletion requires every saved branch tip to be an ancestor of the pushed main. No force push or rewritten remote history.

The root worktree's pre-existing extra blank line in `docs/reviews/2026-11-07-pao20-pao26-final-delivery-review.md` must remain uncommitted and byte-identical. The roof-diagnosis worktree's uncommitted physics/test/diagnostic WIP must remain untouched; it may be detached after its committed history is merged. Diagnostic directories must be archived before retired worktrees are removed. Shared dependencies must be relocated before their owning old worktree is removed. Codex project cleanup must preserve conversations and the active main project.

Final merge, supplemental checks and cleanup results will be appended below.

## Completed consolidation checks

All local and fetched remote branch tips were proved ancestors of the consolidated history (`branch-ancestry-before-push.json`). Historical UI reconciliation retained the final-delivery `src/main.ts` and PAO-6 test; all production source, public models/fonts, HTML and dependency manifests remain identical to f3ed197. New files are historical documentation, asset sources, isolated tools and their dedicated tests.

Supplemental E2E: 7/7 passed (two corrected-port fact-bridge cases plus five historical asset-tool cases). Per-tool original budgets are retained: motion 120s, rig 90s, calibration 180s; no assertion was relaxed. The first supplemental attempt failed during harness configuration before any test ran, and its original log is retained separately. The complete initial 101/108 result remains unchanged; the remaining five runtime/legacy assertions are deferred under the user's checkpoint approval.

Normal Husky build/unit hooks passed after the asset, dispatcher-document and UI merges: 44 unit files / 440 tests. The new worktree initially lacked generated Husky entry scripts; these were installed before subsequent commits, whose checks cover the consolidated source. No hooks were disabled.

Cleanup follows the successful main push: delete only tips already proved included, archive task-local evidence, reuse the root's identical installed dependency lock, preserve the original GLB reference worktree and the detached roof WIP worktree. Remove retired Codex project entries through the local first-party project API; preserve and reassign their historical chats to the main project and set future working directories to the retained root. The final observed cleanup inventory will be retained beside the external evidence as `cleanup-result.json` and `codex-cleanup-result.json`.
