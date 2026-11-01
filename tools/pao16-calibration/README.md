# PAO-16 technical calibration tools

Run from the task tree with the existing Node 24 runtime and installed lockfile dependencies:

```powershell
node --experimental-strip-types tools/pao16-calibration/measure.ts
npx tsc -p tools/pao16-calibration/tsconfig.json
npm run test -- tests/unit/pao16-calibration.test.ts
node tools/pao16-calibration/server.mjs
```

The server owns `http://127.0.0.1:5186/tools/pao16-calibration/preview.html` with strictPort. Stop this owned server before Playwright (its webServer must start afresh). Select `?asset=train_metro.glb`, `train_ramp_or_car.glb`, `obstacle_hurdle_barrier.glb` or `obstacle_slide_barrier.glb` only. The measurement command verifies four originals against the fixed external manifest before copying unchanged bytes to ignored `.pao16-local/inputs`; output is diagnostic JSON and technical TODO only.

`core.ts` uses column-major matrices / column vectors, complete scene node transforms and actual indexed triangle intersections. Unsupported sparse/normalized accessors fail rather than silently measuring incorrect coordinates. It is a four-input Spike parser, not a general glTF validator or runtime loader.

`measure.ts` keeps geometric ray samples distinct from semantic endpoints. Interior samples mapped to assumed endpoints produce **provisional** rigid and uniform residuals; those residuals do not establish that all possible endpoint fits are impossible. Scene bounds only diagnose proportions and choose display scale. Unknown exact boundaries/contact lines remain null. Classifications flag investigation priorities, not production acceptance.

The preview uses a right-handed scene so glTF geometry matches offline coordinates without a left-handed wrapper; it then applies the candidate chain once. This does not certify a future left-handed game import. Cyan is the logical target/proxy, orange actual geometric samples, red provisional correspondence residuals. The engineering GLB has exactly one visual owner with two logical debug targets. No game module imports these tools.

Dedicated Playwright entry: `tests/e2e/pao16-calibration.spec.ts`. This task's ignored `.pao16-local/preview.config.ts` starts the independent server with reuse disabled and Windows ANGLE D3D11; full old regression uses `.pao16-local/regression.config.ts`. Neither changes shared configuration or original test assertions.
