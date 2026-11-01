import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const files = new Set(['train_metro.glb', 'train_ramp_or_car.glb', 'obstacle_hurdle_barrier.glb', 'obstacle_slide_barrier.glb']);
const server = await createServer({
  configFile: false, publicDir: false,
  server: { host: '127.0.0.1', port: 5186, strictPort: true },
  plugins: [{ name: 'pao16-readonly-inputs', configureServer(vite) {
    vite.middlewares.use((req, res, next) => {
      if (!req.url?.startsWith('/inputs/')) return next();
      const name = req.url.slice('/inputs/'.length).split('?')[0];
      if (!files.has(name)) { res.statusCode = 404; return res.end(); }
      try { res.setHeader('Content-Type', 'model/gltf-binary'); res.end(readFileSync(resolve('.pao16-local/inputs', name))); }
      catch { res.statusCode = 404; res.end('Input unavailable'); }
    });
  } }],
});
await server.listen();
console.log('PAO16 independent preview http://127.0.0.1:5186/tools/pao16-calibration/preview.html');
