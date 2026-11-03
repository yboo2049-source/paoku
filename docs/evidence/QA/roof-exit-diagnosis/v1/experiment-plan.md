# Pre-registered experiments (before new runtime runs)
Fixed source 614179d245d2a87a2a2aa3d61fde2a8de68eb7c1; 2026-11-03 Asia/Shanghai.
Hypotheses: H1 finite-foot support and swept top/rear transition can lose departure; H2 screenshot wall time changes accepted JUMP tick and selects boundary; H3 normal legal impact expected to damage.
B: npm ci; npm run build; npm run test. Preserve exits/logs.
F-original: exactly 3 independent original ramp-roof-jump-land runs, output-only mirrors, 1440x900, worker1, retries0. All outcomes retained; no retry-until-green.
F-observed: exactly 1 additional same fixture/control flow with passive in-memory Simulation.step wrapper and keyboard observation; wrapper calls original once and records snapshots; no source/timing/collider/assertion changes. Not an output-only mirror.
F-fixed: use unmodified exported Simulation/updatePhysics modules in Vite's server module runner, no rendering; 1/60 sec, seed1, base speed18, same ramp/train. Jump tick integer 85..115 inclusive plus no jump and one intentional front impact. Full ticks retained. Also replay observed initial fixture context and actual accepted tick once, if available. No clock override.
Compare original inherited trace with fixed trajectories; note original trace lacks command identity/tick and cannot imply exact replay.
Inspect 3 new local screenshots (roof-contact/jump/exit). No full E2E rerun claimed; no production repair.

## Bounded follow-up registered after scan
Initial scans found only tick97 failure among 85..115. One inherited reconstruction uses the inherited approach speed18.020833333333332, same zero position and jump97 (inferred, not original logged identity), to test numerical match. Exactly one observation replay uses run4 first two-obstacle/z0 pre-step context and its actual JUMP105, offsetting initial absolute tick. Preserve mismatch as evidence; no further sample search.
