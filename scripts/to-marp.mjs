import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  ensureMarkdownPath,
  fail,
  isDirectory,
  isFile,
  normalizeModel,
  repoRoot,
  resolveInputPath,
  scriptsDir,
} from './lib.mjs';
import { resolveTargetFromSource } from './validate-target.mjs';

function usage() {
  console.log(`Uso:
  npm --prefix scripts run to-marp -- <model> <source> [target]

Objetivo:
  Validar os argumentos do atalho *to-marp e resolver o caminho final do
  Markdown Marp que sera criado. Este script nao converte conteudo.

Parametros:
  <model>   Numero ou nome do modelo: 01, 1, model-01.
  <source>  Arquivo Markdown comum de entrada.
  [target]  Destino opcional: diretorio ou arquivo .md.

Saida:
  Imprime MODEL_DIR, SOURCE e TARGET resolvidos em formato chave=valor.`);
}

function runPreRun() {
  const result = spawnSync(process.execPath, [path.join(scriptsDir, 'pre-run.mjs')], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.stdout.trim()) {
    console.log(result.stdout.trim());
  }

  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    fail(stderr || 'pre-run falhou.');
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

  runPreRun();

  const [rawModel, rawSource, rawTarget] = args;
  const model = normalizeModel(rawModel);
  const modelDir = path.join(repoRoot, 'templates', model);

  if (!(await isDirectory(modelDir))) {
    fail(`modelo nao encontrado: templates/${model}`);
  }

  const modelFile = path.join(modelDir, 'model.md');
  const instructionsFile = path.join(modelDir, 'instructions.md');

  if (!(await isFile(modelFile))) {
    fail(`modelo sem model.md: templates/${model}/model.md`);
  }

  if (!(await isFile(instructionsFile))) {
    fail(`modelo sem instructions.md: templates/${model}/instructions.md`);
  }

  ensureMarkdownPath('source', rawSource);

  const source = resolveInputPath(rawSource);
  if (!(await isFile(source))) {
    fail(`source nao existe ou nao e arquivo: ${rawSource}`);
  }

  const target = await resolveTargetFromSource({
    sourcePath: source,
    rawTarget,
    extension: '.md',
    suffix: '-slides',
    failIfExists: true,
  });
  ensureMarkdownPath('destino resolvido', target);

  console.log(`MODEL=${model}`);
  console.log(`MODEL_DIR=${modelDir}`);
  console.log(`SOURCE=${source}`);
  console.log(`TARGET=${target}`);
}

await main();
