import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('Telemetry logging', async ({ page }) => {
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  const logFile = path.join(logsDir, 'runtime_metrics.jsonl');
  
  // clear file if it exists
  if (fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, '');
  }

  const telemetryLogs: any[] = [];

  page.on('console', msg => {
    const text = msg.text();
    if (text.startsWith('[TELEMETRY]')) {
      try {
        const jsonStr = text.replace('[TELEMETRY]', '').trim();
        const data = JSON.parse(jsonStr);
        telemetryLogs.push(data);
        fs.appendFileSync(logFile, JSON.stringify(data) + '\n');
      } catch (e) {
        console.error('Failed to parse telemetry log:', text);
      }
    }
  });

  await page.goto('/?bot=true');

  // Wait for 45 seconds to let the bot play a long game
  await page.waitForTimeout(45000);
});
