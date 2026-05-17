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
  console.log(`Usage:
  npm --prefix scripts run to-marp -- <model> <source> [target]

Goal:
  Validate the *to-marp shortcut arguments and resolve the final path of
  the Marp Markdown that will be created. This script does not convert content.

Parameters:
  <model>   Model number or name: 01, 1, model-01.
  <source>  Input common Markdown file.
  [target]  Optional destination: directory or .md file.

Output:
  Prints MODEL_DIR, SOURCE and TARGET in key=value format.`);
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
    fail(stderr || 'pre-run failed.');
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
    fail(`model not found: templates/${model}`);
  }

  const modelFile = path.join(modelDir, 'model.md');
  const instructionsFile = path.join(modelDir, 'instructions.md');

  if (!(await isFile(modelFile))) {
    fail(`model missing model.md: templates/${model}/model.md`);
  }

  if (!(await isFile(instructionsFile))) {
    fail(`model missing instructions.md: templates/${model}/instructions.md`);
  }

  ensureMarkdownPath('source', rawSource);

  const source = resolveInputPath(rawSource);
  if (!(await isFile(source))) {
    fail(`source does not exist or is not a file: ${rawSource}`);
  }

  const target = await resolveTargetFromSource({
    sourcePath: source,
    rawTarget,
    extension: '.md',
    suffix: '-slides',
    failIfExists: true,
  });
  ensureMarkdownPath('resolved target', target);

  console.log(`MODEL=${model}`);
  console.log(`MODEL_DIR=${modelDir}`);
  console.log(`SOURCE=${source}`);
  console.log(`TARGET=${target}`);
}

await main();
