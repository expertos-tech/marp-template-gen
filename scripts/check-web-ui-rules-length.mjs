import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDir, '..');
const targetPath = path.join(repoRoot, 'docs', 'web-ui-rules.md');

if (!fs.existsSync(targetPath)) {
  console.error(`docs/web-ui-rules.md not found at: ${targetPath}`);
  process.exit(1);
}

const text = fs.readFileSync(targetPath, 'utf8');
const length = text.length;
const limit = 8000;

console.log(`docs/web-ui-rules.md length: ${length}`);

if (length > limit) {
  console.error(`docs/web-ui-rules.md exceeds ${limit} characters`);
  process.exit(1);
}
