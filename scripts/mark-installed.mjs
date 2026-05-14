import { writeText, scriptsDir } from './lib.mjs';
import path from 'node:path';

const marker = path.join(scriptsDir, '.npm-installed');
const content = [
  'instalado=true',
  `node=${process.version}`,
  `data=${new Date().toISOString()}`,
  '',
].join('\n');

await writeText(marker, content);
console.log(`marcador criado: ${marker}`);
