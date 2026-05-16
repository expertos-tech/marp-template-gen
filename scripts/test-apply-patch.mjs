import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDir, '..');
const fixturesRoot = path.join(repoRoot, 'tmp', 'apply-patch-tests');

function toRepoRelative(targetPath) {
  return path.relative(repoRoot, targetPath).split(path.sep).join('/');
}

function runApplyPatch(args) {
  return spawnSync(
    'npm',
    ['--prefix', 'scripts', 'run', 'apply-patch', '--', ...args],
    {
      cwd: repoRoot,
      encoding: 'utf8',
    },
  );
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function fileExists(targetPath) {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function setupCase(caseName) {
  const caseDir = path.join(fixturesRoot, caseName);
  await mkdir(caseDir, { recursive: true });
  return caseDir;
}

function protocolFor(changeFilePath, commandBlock, validateLines = []) {
  const lines = [
    `[CHANGE-FILE: ${changeFilePath}]`,
    '',
    commandBlock.trimEnd(),
  ];

  if (validateLines.length > 0) {
    lines.push('', '[VALIDATE]', ...validateLines);
  }

  return `${lines.join('\n')}\n`;
}

function baseContent({ duplicateAnchor = false } = {}) {
  if (duplicateAnchor) {
    return '# Test\n\nLinha A\nLinha A\nLinha B\n';
  }

  return '# Test\n\nLinha A\nLinha B\nLinha C\n';
}

async function runTest(name, testFn, state) {
  try {
    await testFn();
    state.passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    state.failed += 1;
    const message = error instanceof Error ? error.message : String(error);
    state.failures.push({ name, message });
    console.error(`FAIL ${name}: ${message}`);
  }
}

async function main() {
  await rm(fixturesRoot, { recursive: true, force: true });
  await mkdir(fixturesRoot, { recursive: true });

  const state = { passed: 0, failed: 0, failures: [] };

  await runTest('--help returns success', async () => {
    const result = runApplyPatch(['--help']);
    assertCondition(result.status === 0, 'expected exit code 0 for --help');
    assertCondition(result.stdout.includes('Uso:'), 'expected help usage text in stdout');
    assertCondition(typeof result.stderr === 'string', 'expected stderr string');
  }, state);

  await runTest('insert-before in --dry-run returns success', async () => {
    const caseDir = await setupCase('insert-before');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(targetFile, baseContent(), 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:insert-before>
anchor: Linha B
content:|
Inserido antes
</cmd:insert-before>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 0, 'expected exit code 0');
    assertCondition(result.stdout.includes('status: success'), 'expected success status');
    assertCondition(
      result.stdout.includes('insert-before (simulada)'),
      'expected simulated insert-before operation',
    );
    assertCondition(typeof result.stderr === 'string', 'expected stderr string');
  }, state);

  await runTest('insert-after in --dry-run returns success', async () => {
    const caseDir = await setupCase('insert-after');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(targetFile, baseContent(), 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:insert-after>
anchor: Linha B
content:|
Inserido depois
</cmd:insert-after>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 0, 'expected exit code 0');
    assertCondition(result.stdout.includes('status: success'), 'expected success status');
    assertCondition(
      result.stdout.includes('insert-after (simulada)'),
      'expected simulated insert-after operation',
    );
    assertCondition(typeof result.stderr === 'string', 'expected stderr string');
  }, state);

  await runTest('insert-after-line in --dry-run returns success', async () => {
    const caseDir = await setupCase('insert-after-line');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(targetFile, baseContent(), 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:insert-after-line>
line: 1
content:|
Inserido apos linha 1
</cmd:insert-after-line>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 0, 'expected exit code 0');
    assertCondition(result.stdout.includes('status: success'), 'expected success status');
    assertCondition(
      result.stdout.includes('insert-after-line (simulada)'),
      'expected simulated insert-after-line operation',
    );
    assertCondition(typeof result.stderr === 'string', 'expected stderr string');
  }, state);

  await runTest('append-file in --dry-run returns success', async () => {
    const caseDir = await setupCase('append-file');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(targetFile, baseContent(), 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:append-file>
content:|
Anexo
</cmd:append-file>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 0, 'expected exit code 0');
    assertCondition(result.stdout.includes('status: success'), 'expected success status');
    assertCondition(
      result.stdout.includes('append-file (simulada)'),
      'expected simulated append-file operation',
    );
    assertCondition(typeof result.stderr === 'string', 'expected stderr string');
  }, state);

  await runTest('create-file in --dry-run returns success', async () => {
    const caseDir = await setupCase('create-file-success');
    const targetFile = path.join(caseDir, 'new-file.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:create-file>
content:|
Novo arquivo
</cmd:create-file>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 0, 'expected exit code 0');
    assertCondition(result.stdout.includes('status: success'), 'expected success status');
    assertCondition(
      result.stdout.includes('create-file (simulada)'),
      'expected simulated create-file operation',
    );
    assertCondition(typeof result.stderr === 'string', 'expected stderr string');
  }, state);

  await runTest('[VALIDATE] appears in report and is not executed', async () => {
    const caseDir = await setupCase('validate-section');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    const shouldNotRunFile = path.join(caseDir, 'should-not-run.flag');
    await writeFile(targetFile, baseContent(), 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:append-file>
content:|
No-op check
</cmd:append-file>`,
        [`touch ${toRepoRelative(shouldNotRunFile)}`],
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 0, 'expected exit code 0');
    assertCondition(
      result.stdout.includes('validation_commands_found:'),
      'expected validation section in report',
    );
    assertCondition(
      result.stdout.includes(`touch ${toRepoRelative(shouldNotRunFile)}`),
      'expected listed validation command',
    );
    assertCondition(
      !(await fileExists(shouldNotRunFile)),
      'expected validation command to not execute',
    );
    assertCondition(typeof result.stderr === 'string', 'expected stderr string');
  }, state);

  await runTest('--dry-run does not change target file', async () => {
    const caseDir = await setupCase('dry-run-no-write');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    const original = baseContent();
    await writeFile(targetFile, original, 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:insert-before>
anchor: Linha B
content:|
Inserido antes
</cmd:insert-before>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    const after = await readFile(targetFile, 'utf8');
    assertCondition(result.status === 0, 'expected exit code 0');
    assertCondition(after === original, 'expected target file unchanged after dry-run');
    assertCondition(typeof result.stderr === 'string', 'expected stderr string');
  }, state);

  await runTest('missing anchor fails', async () => {
    const caseDir = await setupCase('anchor-missing');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(targetFile, baseContent(), 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:insert-before>
anchor: Linha Z
content:|
Nao entra
</cmd:insert-before>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 1, 'expected exit code 1');
    assertCondition(result.stdout.includes('status: failed'), 'expected failed status');
    assertCondition(
      result.stdout.includes('anchor nao encontrado'),
      'expected missing anchor error',
    );
    assertCondition(typeof result.stderr === 'string', 'expected stderr string');
  }, state);

  await runTest('duplicate anchor fails', async () => {
    const caseDir = await setupCase('anchor-duplicate');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(targetFile, baseContent({ duplicateAnchor: true }), 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:insert-after>
anchor: Linha A
content:|
Nao entra
</cmd:insert-after>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 1, 'expected exit code 1');
    assertCondition(result.stdout.includes('status: failed'), 'expected failed status');
    assertCondition(
      result.stdout.includes('anchor com multiplas ocorrencias'),
      'expected duplicate anchor error',
    );
    assertCondition(typeof result.stderr === 'string', 'expected stderr string');
  }, state);

  await runTest('absolute path fails', async () => {
    const caseDir = await setupCase('absolute-path');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(
      protocolFile,
      protocolFor(
        '/tmp/forbidden.md',
        `<cmd:append-file>
content:|
Nao entra
</cmd:append-file>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 1, 'expected exit code 1');
    assertCondition(result.stdout.includes('status: failed'), 'expected failed status');
    assertCondition(
      result.stdout.includes('caminho absoluto bloqueado'),
      'expected absolute path error',
    );
    assertCondition(typeof result.stderr === 'string', 'expected stderr string');
  }, state);

  await runTest('path with .. fails', async () => {
    const caseDir = await setupCase('dot-dot-path');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(
      protocolFile,
      protocolFor(
        '../outside.md',
        `<cmd:append-file>
content:|
Nao entra
</cmd:append-file>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 1, 'expected exit code 1');
    assertCondition(result.stdout.includes('status: failed'), 'expected failed status');
    assertCondition(
      result.stdout.includes("caminho com '..' bloqueado"),
      'expected dot-dot path error',
    );
    assertCondition(typeof result.stderr === 'string', 'expected stderr string');
  }, state);

  await runTest('create-file fails when target already exists', async () => {
    const caseDir = await setupCase('create-file-existing');
    const targetFile = path.join(caseDir, 'existing.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(targetFile, '# Existing\n', 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:create-file>
content:|
Novo conteudo
</cmd:create-file>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 1, 'expected exit code 1');
    assertCondition(result.stdout.includes('status: failed'), 'expected failed status');
    assertCondition(
      result.stdout.includes('arquivo ja existe para create-file'),
      'expected create-file existing error',
    );
    assertCondition(typeof result.stderr === 'string', 'expected stderr string');
  }, state);

  await runTest('unsupported command fails', async () => {
    const caseDir = await setupCase('unsupported-command');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(targetFile, baseContent(), 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:replace-block>
content:|
Nao entra
</cmd:replace-block>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 1, 'expected exit code 1');
    assertCondition(result.stdout.includes('status: failed'), 'expected failed status');
    assertCondition(
      result.stdout.includes('comando nao suportado na v1'),
      'expected unsupported command error',
    );
    assertCondition(typeof result.stderr === 'string', 'expected stderr string');
  }, state);

  console.log('');
  console.log('TEST SUMMARY');
  console.log(`passed: ${state.passed}`);
  console.log(`failed: ${state.failed}`);

  if (state.failed > 0) {
    console.log('failed_tests:');
    for (const failure of state.failures) {
      console.log(`- ${failure.name}: ${failure.message}`);
    }
    process.exit(1);
  }
}

await main();
