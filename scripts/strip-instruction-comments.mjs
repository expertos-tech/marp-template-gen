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
  console.log(`Uso:
  npm --prefix scripts run strip-instructions -- <source.md> [target.md]

Objetivo:
  Remover comentarios HTML de instrucao de um arquivo Markdown/Marp gerado.

Regras:
  - Remove comentarios HTML de bloco: <!-- ... -->
  - Preserva diretivas Marp de classe: <!-- _class: ... -->
  - Remove comentarios HTML de linha unica, exceto diretivas Marp de classe
  - Se target nao for informado, sobrescreve o source de forma segura
  - Se target for informado, grava o resultado no arquivo indicado`);
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
    fail(`source nao existe ou nao e arquivo: ${rawSource}`);
  }

  const target = rawTarget ? resolveInputPath(rawTarget) : source;
  ensureMarkdownPath('target', target);

  const targetDir = path.dirname(target);
  if (!(await isDirectory(targetDir))) {
    fail(`diretorio do target nao existe: ${targetDir}`);
  }

  const cleaned = stripInstructionComments(await readText(source));
  await writeText(target, cleaned);
  console.log(`CLEANED=${target}`);
}

await main();
