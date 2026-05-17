import path from 'node:path';
import {
  ensureMarkdownPath,
  fail,
  isDirectory,
  isFile,
  readText,
  resolveInputPath,
  writeText,
} from './lib.mjs';

function usage() {
  console.log(`Usage:
  npm --prefix scripts run strip-instructions -- <source.md> [target.md]

Goal:
  Remove instruction HTML comments from a generated Markdown/Marp file.

Rules:
  - Removes block HTML comments: <!-- ... -->
  - Preserves Marp class directives: <!-- _class: ... -->
  - Removes single-line HTML comments, except Marp class directives
  - If target is not provided, overwrites source safely
  - If target is provided, writes the result to the indicated file

Limitations:
  - Inline comments mid-line (text <!-- note --> text) are NOT removed in v1.
    Place instruction comments on their own line for removal.`);
}

function stripInstructionComments(content) {
  const lines = content.split(/\r?\n/);
  const output = [];
  let inComment = false;

  for (const line of lines) {
    if (/^\s*<!--\s*_class:/.test(line)) {
      output.push(line);
      continue;
    }

    if (/^\s*<!--/.test(line)) {
      if (!/-->/.test(line)) {
        inComment = true;
      }
      continue;
    }

    if (inComment) {
      if (/-->/.test(line)) {
        inComment = false;
      }
      continue;
    }

    output.push(line);
  }

  return output.join('\n');
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '-h' || args[0] === '--help') {
    usage();
    return;
  }

  if (args.length < 1 || args.length > 2) {
    usage();
    process.exit(1);
  }

  const [rawSource, rawTarget] = args;
  ensureMarkdownPath('source', rawSource);

  const source = resolveInputPath(rawSource);
  if (!(await isFile(source))) {
    fail(`source does not exist or is not a file: ${rawSource}`);
  }

  const target = rawTarget ? resolveInputPath(rawTarget) : source;
  ensureMarkdownPath('target', target);

  const targetDir = path.dirname(target);
  if (!(await isDirectory(targetDir))) {
    fail(`target directory does not exist: ${targetDir}`);
  }

  const cleaned = stripInstructionComments(await readText(source));
  await writeText(target, cleaned);
  console.log(`CLEANED=${target}`);
}

await main();
