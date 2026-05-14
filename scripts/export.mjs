import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  ensureMarkdownPath,
  fail,
  invocationCwd,
  isFile,
  readText,
  resolveInputPath,
  scriptsDir,
} from './lib.mjs';
import { resolveTargetFromSource } from './validate-target.mjs';

const SUPPORTED_TYPES = new Set(['pdf', 'html', 'png', 'pptx']);

function usage() {
  console.log(`Uso:
  npm --prefix scripts run marp-export -- <type> <source.md> [target]

Tipos:
  pdf | html | png | pptx

Exemplos:
  npm --prefix scripts run marp-export -- pdf tmp/apresentacao-slides.md
  npm --prefix scripts run marp-export -- html tmp/apresentacao-slides.md output/
  npm --prefix scripts run marp-export -- png tmp/apresentacao-slides.md output/apresentacao.png
`);
}

function runNodeScript(scriptName, args = []) {
  const result = spawnSync(process.execPath, [path.join(scriptsDir, scriptName), ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.stdout.trim()) {
    console.log(result.stdout.trim());
  }

  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    fail(stderr || `${scriptName} falhou.`);
  }
}

function validateSelfContained(content, sourcePath) {
  if (!/<style>[\s\S]*<\/style>/m.test(content)) {
    fail(`arquivo sem bloco <style> embutido: ${sourcePath}`);
  }

  if (/\{\{[A-Z0-9_]+\}\}/.test(content)) {
    fail(`arquivo possui placeholders pendentes: ${sourcePath}`);
  }

  const markdownLocalImage = /!\[[^\]]*\]\((?!https?:\/\/|data:)[^)]+\)/i;
  if (markdownLocalImage.test(content)) {
    fail(`arquivo possui referencia de imagem local nao embutida: ${sourcePath}`);
  }

  const htmlLocalImage = /<img\b[^>]*\bsrc\s*=\s*(['"])(?!https?:\/\/|data:).*?\1/i;
  if (htmlLocalImage.test(content)) {
    fail(`arquivo possui <img src> local nao embutido: ${sourcePath}`);
  }
}

function extensionFor(type) {
  if (type === 'png') return 'png';
  return type;
}

function marpTypeArgs(type) {
  if (type === 'pdf') return ['--pdf'];
  if (type === 'html') return ['--html'];
  if (type === 'png') return ['--images', 'png'];
  return ['--pptx'];
}

function runMarp(type, sourcePath, targetPath) {
  const args = ['--yes', '@marp-team/marp-cli', sourcePath, ...marpTypeArgs(type), '-o', targetPath];
  const result = spawnSync('npx', args, {
    cwd: invocationCwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    fail(stderr || `falha ao exportar ${type} com Marp CLI.`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '-h' || args[0] === '--help') {
    usage();
    return;
  }

  if (args.length < 2 || args.length > 3) {
    usage();
    process.exit(1);
  }

  runNodeScript('pre-run.mjs');

  const [rawType, rawSource, rawTarget] = args;
  const type = rawType.toLowerCase();

  if (!SUPPORTED_TYPES.has(type)) {
    fail(`tipo de exportacao invalido: ${rawType}`);
  }

  ensureMarkdownPath('source', rawSource);
  const sourcePath = resolveInputPath(rawSource);
  if (!(await isFile(sourcePath))) {
    fail(`source nao existe ou nao e arquivo: ${rawSource}`);
  }

  const sourceContent = await readText(sourcePath);
  validateSelfContained(sourceContent, sourcePath);

  const targetPath = await resolveTargetFromSource({
    sourcePath,
    rawTarget,
    extension: `.${extensionFor(type)}`,
    failIfExists: false,
  });

  runMarp(type, sourcePath, targetPath);

  console.log(`TYPE=${type}`);
  console.log(`SOURCE=${sourcePath}`);
  console.log(`TARGET=${targetPath}`);
}

await main();
