import * as fs from 'fs';
import * as path from 'path';

const logFile = path.join(__dirname, '../logs/runtime_metrics.jsonl');

if (!fs.existsSync(logFile)) {
  console.error('Log file not found:', logFile);
  process.exit(1);
}

const lines = fs.readFileSync(logFile, 'utf-8').split('\n').filter(Boolean);
const metrics = lines.map(line => {
  try {
    return JSON.parse(line);
  } catch (e) {
    return null;
  }
}).filter(Boolean);

let totalFps = 0;
let fpsCount = 0;
let hasPlayerCrash = false;

metrics.forEach(m => {
  // Support both m.event === 'fps' and { fps: value } format
  if (m.event === 'fps' && typeof m.value === 'number') {
    totalFps += m.value;
    fpsCount++;
  } else if (typeof m.fps === 'number') {
    totalFps += m.fps;
    fpsCount++;
  }
  
  if (m.event === 'player_crash' || m.type === 'player_crash') {
    hasPlayerCrash = true;
  }
});

const avgFps = fpsCount > 0 ? totalFps / fpsCount : 0;

console.log(`Analyzed ${metrics.length} telemetry events.`);
console.log(`Average FPS: ${avgFps.toFixed(2)}`);

let passed = true;

if (avgFps <= 30) {
  console.error('Assert 1 Failed: Average FPS should be > 30');
  passed = false;
}

if (hasPlayerCrash) {
  console.error('Assert 2 Failed: There should be NO event named player_crash');
  passed = false;
}

if (!passed) {
  process.exit(1);
}

console.log('All telemetry assertions passed!');
process.exit(0);
