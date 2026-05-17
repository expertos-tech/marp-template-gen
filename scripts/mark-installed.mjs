import { writeText, scriptsDir } from './lib.mjs';
import path from 'node:path';

const marker = path.join(scriptsDir, '.npm-installed');
const content = [
  'installed=true',
  `node=${process.version}`,
  `date=${new Date().toISOString()}`,
  '',
].join('\n');

await writeText(marker, content);
console.log(`marker created: ${marker}`);
