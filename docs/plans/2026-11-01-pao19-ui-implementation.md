# PAO-19 UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver approved responsive UI A and minimal I-01/I-02 without changing application authority.
**Architecture:** UIManager remains the public facade; pure projection/notification models in views, DOM consumes readApp and immutable context. A is verified before main lifecycle wiring B.
**Tech Stack:** TypeScript, DOM/CSS, Vitest, Playwright, existing Babylon canvas.

## Fixed inputs and scope
Working tree codex/pao-19-ui@943aad1, clean at entry; includes M1 19aa314. Dispatcher authorization, preparation review, PRD, architecture, workflow, test plan and PROGRESS all last changed at 38b4f34e392ace80a67342e28147ea92f52f5126 in D:/worker/paoku (read only). Approved UI spec/design at 943aad1. No merge/reset. Current user explicitly approves serial same-chat A→B; no agent handoff or additional approval.

## A1 projection, queue, receipt receivers (RED then GREEN)
Files: create src/ui/views/models.ts; tests/unit/pao19-ui.test.ts; modify src/ui/dom.ts.
1. Write assertions: speed18/45→18.0/45.0 m/s; four readable powerups ceil seconds; hoverboard active without timer says protection; null summary never takes ctx coins; frozen inputs unchanged.
2. Write assertions for bounded queue total≤4 / visible1, dedup2s, drop oldest waiting, no executable text; pause elapsed time on hidden, clear on run/page change.
3. Receipt assertions: pending duplicate id once; 300ms/5s neutral feedback; success/error clears matching id only; stale run never clears new pending; duplicate result ignored; failed operation retries same identity, modified operation gets new identity; never auto resend.
Run `npm run test -- tests/unit/pao19-ui.test.ts` (RED: missing models module); implement pure models and rerun PASS. `npm run build` and `npm run test` immediately after batch.

## A2 DOM/views/style and I-02
Files: src/ui/dom.ts, src/ui/views/models.ts, src/style.css, index.html (lang/viewport only), tests/e2e/rebuild-ui.spec.ts.
1. Add browser assertions for 中文 start / m/s / readonly summary / bounded safe text Toast / receipt methods / 48px / viewport and focus containment; run RED with isolated local config.
2. Keep facade + existing ids, split projection from commands, shallow entity cards with approved tokens and responsive desktop side/mobile bottom card. Four powerup SVG/name/time. Modal inert+focus trap; preserve native ranges and existing shop/audio intentions. Persistent errors and settlement status; pending delay display only, no timers resend.
3. All four button states, safe insets via CSS variables env fallback, dvh, long values/text reflow, reduced motion, touch/pointer interception on UI controls only. I-02 only zh-CN/viewport-fit=cover.
4. Full `npm run build`, `npm run test`, `npm run test:e2e -- --config .pao19.playwright.config.ts`. Config locally ignored, all old specs retained, 5189 strictPort/reuseExistingServer=false/D3D11. Capture raw source identity and hashes. Record actual A checkpoint and inspect real screenshots before touching main.

## B main minimal lifecycle (serial, after A checkpoint)
Files: src/main.ts, tests/unit/pao19-ui.test.ts, tests/e2e/rebuild-ui.spec.ts; UI necessary adjustments only.
1. Add failing integration assertions lifecycle notify before dispatch, both outcomes, same identity, deferred terminal command notified once and error not double Toast; exercise existing PAO-14 tests.
2. Add pending/result calls using captured command metadata. Deferred dispatch gets one final pending notification; keep summary/pause barrier/projection order and initialization fallback behavior. Preserve TOGGLE_AUDIO supplied identity when mapping to field intention. Unknown outcome retry uses original payload and commandId, no regenerated summary/audio operation. No changes application/types/schema.
3. Run build/test/full E2E again. Natural N keyboard and CDP touch full flow; F delayed/failed saves, old run/audio/unknown commit; R01–R09 and viewport matrix 1440×900,390×844,320×568,844×390,200% font,long values,insets,reduced motion. Record screenshot/rects and actual limits; no claim of real phone coverage.

## Delivery
Check source identity/hash before/after browser, restore historical evidence byte-for-byte, whitelist staging/diff --check. Normal hooks build/test (process PATH npm.cmd adapter only if needed), git push existing upstream and verify remote. Only after complete validation send Linear In Review; never Done. No other tasks/branches.

## 新增单行测试授权
2026-11-01用户明确批准“这一个测试行修改”：tests/e2e/pao6-baseline.spec.ts在roof-jump前增加 await reach(page,31)，其余断言不变。该额外白名单仅限这行夹具触发，不开放物理/模拟或其他旧测试。独立19aa314旧UI/CSS对照3次有1次同样失败；提案3次全通过，见pao6-proof.log与pao6-fixture-proposal.patch。以本次明确授权为准，不重复请求设计或同范围批准。
