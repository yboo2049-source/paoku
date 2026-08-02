import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 [Harness] 初始化 paoku 运行环境...\n');

try {
  // 1. Install dependencies
  console.log('📦 正在安装依赖...');
  execSync('npm install', { stdio: 'inherit' });

  // 2. Init Husky
  console.log('\n🐶 正在初始化 Git 护栏 (Husky)...');
  const huskyDir = path.join(__dirname, '..', '.husky');
  if (!fs.existsSync(huskyDir)) {
    execSync('npx husky init', { stdio: 'inherit' });
    console.log('✅ Husky 初始化完成。');
  } else {
    console.log('✅ Husky 已存在。');
  }

  // 3. Print verification info
  console.log('\n==================================================');
  console.log('🎯 Harness 环境检查完毕。当前生效的校验规则如下：');
  console.log('1. 类型检查 (tsc): `npm run build`');
  console.log('2. 单元测试 (vitest): `npm run test`');
  console.log('3. E2E测试 (playwright): `npm run test:e2e`');
  console.log('--------------------------------------------------');
  console.log('⚠️ 注意：所有的 Git Commit 都必须在本地通过类型检查与单测！');
  console.log('==================================================\n');

} catch (error) {
  console.error('❌ 初始化失败:', error.message);
  process.exit(1);
}
