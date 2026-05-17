import path from 'node:path';
import { exists, fail, scriptsDir } from './lib.mjs';

const packageJson = path.join(scriptsDir, 'package.json');
const marker = path.join(scriptsDir, '.npm-installed');

if (!(await exists(packageJson))) {
  fail('scripts/package.json not found.');
}

if (!(await exists(marker))) {
  fail('npm install was not yet executed in scripts/. Run: npm --prefix scripts install');
}

console.log('PRE_RUN=ok');
