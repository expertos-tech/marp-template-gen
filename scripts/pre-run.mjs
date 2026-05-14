import path from 'node:path';
import { exists, fail, scriptsDir } from './lib.mjs';

const packageJson = path.join(scriptsDir, 'package.json');
const marker = path.join(scriptsDir, '.npm-installed');

if (!(await exists(packageJson))) {
  fail('scripts/package.json nao encontrado.');
}

if (!(await exists(marker))) {
  fail('npm install ainda nao foi executado em scripts/. Rode: npm --prefix scripts install');
}

console.log('PRE_RUN=ok');
