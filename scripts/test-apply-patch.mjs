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
    assertCondition(result.stdout.includes('Usage:'), 'expected help usage text in stdout');
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
      result.stdout.includes('insert-before (simulated)'),
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
      result.stdout.includes('insert-after (simulated)'),
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
      result.stdout.includes('insert-after-line (simulated)'),
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
      result.stdout.includes('append-file (simulated)'),
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
      result.stdout.includes('create-file (simulated)'),
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
      result.stdout.includes('anchor not found'),
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
      result.stdout.includes('anchor matches multiple occurrences'),
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
      result.stdout.includes('absolute path blocked'),
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
      result.stdout.includes("path containing '..' blocked"),
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
      result.stdout.includes('file already exists for create-file'),
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
        `<cmd:delete-file>
content:|
Nao entra
</cmd:delete-file>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 1, 'expected exit code 1');
    assertCondition(result.stdout.includes('status: failed'), 'expected failed status');
    assertCondition(
      result.stdout.includes('command not supported'),
      'expected unsupported command error',
    );
    assertCondition(typeof result.stderr === 'string', 'expected stderr string');
  }, state);

  await runTest('replace-block in --dry-run returns success', async () => {
    const caseDir = await setupCase('replace-block-success');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(targetFile, baseContent(), 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:replace-block>
anchor_start: Linha A
anchor_end: Linha C
content:|
Bloco novo
</cmd:replace-block>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 0, 'expected exit code 0');
    assertCondition(result.stdout.includes('status: success'), 'expected success status');
    assertCondition(
      result.stdout.includes('replace-block (simulated)'),
      'expected simulated replace-block operation',
    );
    assertCondition(
      result.stdout.includes('[lines '),
      'expected line range detail in report',
    );
  }, state);

  await runTest('replace-block with missing anchor_start fails', async () => {
    const caseDir = await setupCase('replace-block-missing-start');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(targetFile, baseContent(), 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:replace-block>
anchor_start: Linha Z
anchor_end: Linha C
content:|
Bloco novo
</cmd:replace-block>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 1, 'expected exit code 1');
    assertCondition(
      result.stdout.includes('anchor_start not found'),
      'expected anchor_start missing error',
    );
  }, state);

  await runTest('replace-block with duplicated anchor_start fails', async () => {
    const caseDir = await setupCase('replace-block-duplicate-start');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(targetFile, baseContent({ duplicateAnchor: true }), 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:replace-block>
anchor_start: Linha A
anchor_end: Linha B
content:|
Bloco novo
</cmd:replace-block>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 1, 'expected exit code 1');
    assertCondition(
      result.stdout.includes('anchor_start matches multiple occurrences'),
      'expected duplicate anchor_start error',
    );
  }, state);

  await runTest('replace-block with end before start fails', async () => {
    const caseDir = await setupCase('replace-block-end-before-start');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(targetFile, baseContent(), 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:replace-block>
anchor_start: Linha C
anchor_end: Linha A
content:|
Bloco novo
</cmd:replace-block>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 1, 'expected exit code 1');
    assertCondition(
      result.stdout.includes('anchor_end appears before anchor_start'),
      'expected end-before-start error',
    );
  }, state);

  await runTest('replace-block with empty content fails', async () => {
    const caseDir = await setupCase('replace-block-empty-content');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(targetFile, baseContent(), 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:replace-block>
anchor_start: Linha A
anchor_end: Linha C
content:|
</cmd:replace-block>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 1, 'expected exit code 1');
    assertCondition(
      result.stdout.includes('requires non-empty content'),
      'expected empty content error',
    );
  }, state);

  await runTest('remove-block with confirm true in --dry-run returns success', async () => {
    const caseDir = await setupCase('remove-block-success');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(targetFile, baseContent(), 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:remove-block>
anchor_start: Linha A
anchor_end: Linha C
confirm: true
</cmd:remove-block>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 0, 'expected exit code 0');
    assertCondition(result.stdout.includes('status: success'), 'expected success status');
    assertCondition(
      result.stdout.includes('remove-block (simulated)'),
      'expected simulated remove-block operation',
    );
    assertCondition(
      result.stdout.includes('removed '),
      'expected removed line count in detail',
    );
  }, state);

  await runTest('remove-block without confirm true fails', async () => {
    const caseDir = await setupCase('remove-block-no-confirm');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(targetFile, baseContent(), 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:remove-block>
anchor_start: Linha A
anchor_end: Linha C
</cmd:remove-block>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 1, 'expected exit code 1');
    assertCondition(
      result.stdout.includes("requires 'confirm: true'"),
      'expected confirm-required error',
    );
  }, state);

  await runTest('replace-text in --dry-run returns success', async () => {
    const caseDir = await setupCase('replace-text-success');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(targetFile, baseContent(), 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:replace-text>
anchor: Linha B
content:|
Linha B trocada
</cmd:replace-text>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 0, 'expected exit code 0');
    assertCondition(result.stdout.includes('status: success'), 'expected success status');
    assertCondition(
      result.stdout.includes('replace-text (simulated)'),
      'expected simulated replace-text operation',
    );
  }, state);

  await runTest('replace-text with multiple matches fails', async () => {
    const caseDir = await setupCase('replace-text-multiple');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(targetFile, baseContent({ duplicateAnchor: true }), 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:replace-text>
anchor: Linha A
content:|
Linha trocada
</cmd:replace-text>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 1, 'expected exit code 1');
    assertCondition(
      result.stdout.includes('anchor matches multiple occurrences'),
      'expected multiple anchor error',
    );
  }, state);

  await runTest('replace-regex in --dry-run returns success', async () => {
    const caseDir = await setupCase('replace-regex-success');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(targetFile, baseContent(), 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:replace-regex>
pattern: Linha B
content:|
Linha B regex
</cmd:replace-regex>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 0, 'expected exit code 0');
    assertCondition(result.stdout.includes('status: success'), 'expected success status');
    assertCondition(
      result.stdout.includes('replace-regex (simulated)'),
      'expected simulated replace-regex operation',
    );
  }, state);

  await runTest('replace-regex with invalid pattern fails', async () => {
    const caseDir = await setupCase('replace-regex-invalid');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(targetFile, baseContent(), 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:replace-regex>
pattern: [unterminated
content:|
nope
</cmd:replace-regex>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 1, 'expected exit code 1');
    assertCondition(
      result.stdout.includes('invalid regex pattern'),
      'expected invalid regex error',
    );
  }, state);

  await runTest('replace-regex with zero matches fails', async () => {
    const caseDir = await setupCase('replace-regex-zero');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(targetFile, baseContent(), 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:replace-regex>
pattern: Linha Z+
content:|
nope
</cmd:replace-regex>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 1, 'expected exit code 1');
    assertCondition(
      result.stdout.includes('regex pattern not found'),
      'expected zero-match error',
    );
  }, state);

  await runTest('replace-regex with multiple matches fails', async () => {
    const caseDir = await setupCase('replace-regex-multiple');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    await writeFile(targetFile, baseContent({ duplicateAnchor: true }), 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:replace-regex>
pattern: Linha A
content:|
nope
</cmd:replace-regex>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    assertCondition(result.status === 1, 'expected exit code 1');
    assertCondition(
      result.stdout.includes('regex pattern matches multiple occurrences'),
      'expected multiple-match error',
    );
  }, state);

  await runTest('failed edit operation does not partially write files', async () => {
    const caseDir = await setupCase('edit-partial-write');
    const targetFile = path.join(caseDir, 'target.md');
    const protocolFile = path.join(caseDir, 'protocol.md');
    const original = baseContent();
    await writeFile(targetFile, original, 'utf8');
    await writeFile(
      protocolFile,
      protocolFor(
        toRepoRelative(targetFile),
        `<cmd:replace-text>
anchor: Linha B
content:|
Trocado
</cmd:replace-text>

<cmd:replace-text>
anchor: Linha Z
content:|
Nao entra
</cmd:replace-text>`,
      ),
      'utf8',
    );

    const result = runApplyPatch([toRepoRelative(protocolFile), '--dry-run']);
    const after = await readFile(targetFile, 'utf8');
    assertCondition(result.status === 1, 'expected exit code 1');
    assertCondition(after === original, 'expected target file unchanged after failed run');
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
