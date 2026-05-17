import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDir, '..');
const fixturesRoot = path.join(repoRoot, 'tmp', 'run-task-tests');

function runTask(args) {
  return spawnSync(
    'npm',
    ['--prefix', 'scripts', 'run', '--silent', 'task', '--', ...args],
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

function toRepoRelative(absolutePath) {
  return path.relative(repoRoot, absolutePath).split(path.sep).join('/');
}

async function setupCase(caseName) {
  const caseDir = path.join(fixturesRoot, caseName);
  await mkdir(caseDir, { recursive: true });
  return caseDir;
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

async function buildTaskFile(caseDir, body) {
  const taskPath = path.join(caseDir, 'task.md');
  await writeFile(taskPath, body, 'utf8');
  return taskPath;
}

function defaultMetadata(caseDir, mode = 'read') {
  const logRelative = `${toRepoRelative(path.join(caseDir, 'task.log'))}`;
  return { mode, logRelative };
}

function baseValidTask(caseDir, { mode = 'read', extra = '' } = {}) {
  const { logRelative } = defaultMetadata(caseDir, mode);
  return `# COFE TASK

id: test-${path.basename(caseDir)}
mode: ${mode}
log: ${logRelative}

## GOAL

Test goal.

## ALLOWED_CHANGES

- ${logRelative}

## READ

- AGENTS.md

${extra}

## REPORT

- check
`;
}

async function testHelpReturnsSuccess() {
  const result = runTask(['--help']);
  assertCondition(
    result.status === 0,
    `--help should exit 0, got ${result.status}. stderr=${result.stderr}`,
  );
  assertCondition(
    result.stdout.includes('COFE Task Protocol runner'),
    'help output should include header',
  );
}

async function testValidReadModeSucceeds() {
  const caseDir = await setupCase('valid-read');
  const task = baseValidTask(caseDir, {
    mode: 'read',
    extra: '## RUN\n\n- git status --short\n',
  });
  await buildTaskFile(caseDir, task);

  const result = runTask([toRepoRelative(path.join(caseDir, 'task.md'))]);
  assertCondition(
    result.status === 0,
    `expected exit 0, got ${result.status}\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
  assertCondition(
    result.stdout.includes('status: success'),
    'expected status: success in stdout',
  );
}

async function testDryRunSkipsExecution() {
  const caseDir = await setupCase('dry-run');
  const task = baseValidTask(caseDir, {
    mode: 'read',
    extra: '## RUN\n\n- git status --short\n',
  });
  await buildTaskFile(caseDir, task);

  const result = runTask([
    toRepoRelative(path.join(caseDir, 'task.md')),
    '--dry-run',
  ]);
  assertCondition(result.status === 0, `dry-run should succeed, got ${result.status}`);
  assertCondition(
    result.stdout.includes('Dry-run: skipped RUN git status --short'),
    'expected dry-run skip warning',
  );
  assertCondition(
    result.stdout.includes('dry_run: true'),
    'expected dry_run: true in report',
  );
}

async function testExplainOnlyPrintsPlan() {
  const caseDir = await setupCase('explain');
  const task = baseValidTask(caseDir);
  await buildTaskFile(caseDir, task);

  const result = runTask([
    toRepoRelative(path.join(caseDir, 'task.md')),
    '--explain',
  ]);
  assertCondition(result.status === 0, `explain should succeed, got ${result.status}`);
  assertCondition(
    result.stdout.includes('# COFE TASK PLAN (explain)'),
    'expected explain header',
  );
  assertCondition(
    !result.stdout.includes('COFE TASK REPORT'),
    'explain must not run the task or print final report',
  );
}

async function testMissingTaskFileFails() {
  const result = runTask(['tmp/run-task-tests/does-not-exist.md']);
  assertCondition(result.status === 1, `expected exit 1, got ${result.status}`);
  assertCondition(
    result.stderr.includes('Task file does not exist') ||
      result.stdout.includes('Task file does not exist'),
    'expected task missing message',
  );
}

async function testInvalidHeadingFails() {
  const caseDir = await setupCase('invalid-heading');
  const task = '# Not a task\n\nid: x\nmode: read\nlog: tmp/x.log\n\n## GOAL\n\nx\n\n## REPORT\n\n- x\n';
  await buildTaskFile(caseDir, task);
  const result = runTask([toRepoRelative(path.join(caseDir, 'task.md'))]);
  assertCondition(result.status === 1, `expected exit 1, got ${result.status}`);
  assertCondition(
    (result.stdout + result.stderr).includes('Expected first heading'),
    'expected first heading error',
  );
}

async function testEmptyMetadataFails() {
  const caseDir = await setupCase('empty-metadata');
  const task = '# COFE TASK\n\nid:\nmode: read\nlog: tmp/x.log\n\n## GOAL\n\nx\n\n## REPORT\n\n- x\n';
  await buildTaskFile(caseDir, task);
  const result = runTask([toRepoRelative(path.join(caseDir, 'task.md'))]);
  assertCondition(result.status === 1, `expected exit 1, got ${result.status}`);
  assertCondition(
    (result.stdout + result.stderr).includes('missing or empty: id'),
    'expected missing id error',
  );
}

async function testDuplicateBlockFails() {
  const caseDir = await setupCase('duplicate-block');
  const { logRelative } = defaultMetadata(caseDir);
  const task = `# COFE TASK\n\nid: dup\nmode: read\nlog: ${logRelative}\n\n## GOAL\n\nx\n\n## READ\n\n- AGENTS.md\n\n## READ\n\n- README.md\n\n## REPORT\n\n- x\n`;
  await buildTaskFile(caseDir, task);
  const result = runTask([toRepoRelative(path.join(caseDir, 'task.md'))]);
  assertCondition(result.status === 1, `expected exit 1, got ${result.status}`);
  assertCondition(
    (result.stdout + result.stderr).includes('Duplicate block'),
    'expected duplicate block error',
  );
}

async function testUnknownBlockFails() {
  const caseDir = await setupCase('unknown-block');
  const { logRelative } = defaultMetadata(caseDir);
  const task = `# COFE TASK\n\nid: u\nmode: read\nlog: ${logRelative}\n\n## GOAL\n\nx\n\n## STRANGE\n\n- x\n\n## REPORT\n\n- x\n`;
  await buildTaskFile(caseDir, task);
  const result = runTask([toRepoRelative(path.join(caseDir, 'task.md'))]);
  assertCondition(result.status === 1, `expected exit 1, got ${result.status}`);
  assertCondition(
    (result.stdout + result.stderr).includes('Unknown block'),
    'expected unknown block error',
  );
}

async function testReadModeBlocksApplyPatch() {
  const caseDir = await setupCase('read-mode-blocks-patch');
  const { logRelative } = defaultMetadata(caseDir);
  const task = `# COFE TASK\n\nid: r\nmode: read\nlog: ${logRelative}\n\n## GOAL\n\nx\n\n## APPLY_PATCH\n\nfile: tmp/some-patch.md\ndry_run: true\nforce: false\n\n## REPORT\n\n- x\n`;
  await buildTaskFile(caseDir, task);
  const result = runTask([toRepoRelative(path.join(caseDir, 'task.md'))]);
  assertCondition(result.status === 1, `expected exit 1, got ${result.status}`);
  assertCondition(
    (result.stdout + result.stderr).includes('mode: read cannot contain APPLY_PATCH'),
    'expected mode read block',
  );
}

async function testAllowlistDenied() {
  const caseDir = await setupCase('allowlist-denied');
  const { logRelative } = defaultMetadata(caseDir);
  const task = `# COFE TASK\n\nid: x\nmode: read\nlog: ${logRelative}\n\n## GOAL\n\nx\n\n## RUN\n\n- echo hello\n\n## REPORT\n\n- x\n`;
  await buildTaskFile(caseDir, task);
  const result = runTask([toRepoRelative(path.join(caseDir, 'task.md'))]);
  assertCondition(result.status === 1, `expected exit 1, got ${result.status}`);
  assertCondition(
    (result.stdout + result.stderr).includes('not allowlisted'),
    'expected allowlist denial',
  );
}

async function testMetacharRejected() {
  const caseDir = await setupCase('metachar-rejected');
  const { logRelative } = defaultMetadata(caseDir);
  const task = `# COFE TASK\n\nid: x\nmode: read\nlog: ${logRelative}\n\n## GOAL\n\nx\n\n## RUN\n\n- git status --short ; ls\n\n## REPORT\n\n- x\n`;
  await buildTaskFile(caseDir, task);
  const result = runTask([toRepoRelative(path.join(caseDir, 'task.md'))]);
  assertCondition(result.status === 1, `expected exit 1, got ${result.status}`);
  assertCondition(
    (result.stdout + result.stderr).includes('forbidden metacharacter'),
    'expected metacharacter rejection',
  );
}

async function testUnsafeAbsolutePathRejected() {
  const caseDir = await setupCase('unsafe-path');
  const { logRelative } = defaultMetadata(caseDir);
  const task = `# COFE TASK\n\nid: x\nmode: read\nlog: ${logRelative}\n\n## GOAL\n\nx\n\n## READ\n\n- /etc/passwd\n\n## REPORT\n\n- x\n`;
  await buildTaskFile(caseDir, task);
  const result = runTask([toRepoRelative(path.join(caseDir, 'task.md'))]);
  assertCondition(result.status === 1, `expected exit 1, got ${result.status}`);
  assertCondition(
    (result.stdout + result.stderr).includes('Unsafe'),
    'expected unsafe path rejection',
  );
}

async function testDotDotPathRejected() {
  const caseDir = await setupCase('dotdot-path');
  const { logRelative } = defaultMetadata(caseDir);
  const task = `# COFE TASK\n\nid: x\nmode: read\nlog: ${logRelative}\n\n## GOAL\n\nx\n\n## READ\n\n- ../etc/passwd\n\n## REPORT\n\n- x\n`;
  await buildTaskFile(caseDir, task);
  const result = runTask([toRepoRelative(path.join(caseDir, 'task.md'))]);
  assertCondition(result.status === 1, `expected exit 1, got ${result.status}`);
  assertCondition(
    (result.stdout + result.stderr).includes('Unsafe'),
    'expected dotdot rejection',
  );
}

async function testLogOutsideAllowedDirectoryRejected() {
  const caseDir = await setupCase('bad-log-path');
  const task = `# COFE TASK\n\nid: x\nmode: read\nlog: docs/should-not-be-here.log\n\n## GOAL\n\nx\n\n## REPORT\n\n- x\n`;
  await buildTaskFile(caseDir, task);
  const result = runTask([toRepoRelative(path.join(caseDir, 'task.md'))]);
  assertCondition(result.status === 1, `expected exit 1, got ${result.status}`);
  assertCondition(
    (result.stdout + result.stderr).includes('Log path must live under tmp/ or output/'),
    'expected log path restriction',
  );
}

async function testRecursiveTaskInvocationSkipped() {
  const caseDir = await setupCase('recursive-task');
  const { logRelative } = defaultMetadata(caseDir);
  const task = `# COFE TASK\n\nid: x\nmode: read\nlog: ${logRelative}\n\n## GOAL\n\nx\n\n## RUN\n\n- npm --prefix scripts run task -- tmp/whatever.md\n\n## REPORT\n\n- x\n`;
  await buildTaskFile(caseDir, task);
  const result = runTask([toRepoRelative(path.join(caseDir, 'task.md'))]);
  assertCondition(result.status === 0, `recursion skip should succeed, got ${result.status}`);
  assertCondition(
    result.stdout.includes('Skipped recursive task invocation'),
    'expected recursion skip warning',
  );
}

async function testUnknownApplyPatchFieldRejected() {
  const caseDir = await setupCase('unknown-apply-field');
  const { logRelative } = defaultMetadata(caseDir);
  const task = `# COFE TASK\n\nid: x\nmode: write\nlog: ${logRelative}\n\n## GOAL\n\nx\n\n## ALLOWED_CHANGES\n\n- ${logRelative}\n\n## APPLY_PATCH\n\nfile: tmp/p.md\nunknown_field: yes\n\n## REPORT\n\n- x\n`;
  await buildTaskFile(caseDir, task);
  const result = runTask([toRepoRelative(path.join(caseDir, 'task.md'))]);
  assertCondition(result.status === 1, `expected exit 1, got ${result.status}`);
  assertCondition(
    (result.stdout + result.stderr).includes('Unknown APPLY_PATCH field'),
    'expected unknown field rejection',
  );
}

async function testRunNonZeroExitFails() {
  const caseDir = await setupCase('run-fail');
  const { logRelative } = defaultMetadata(caseDir);
  // apply-patch fails when the protocol file does not exist; this exercises
  // the non-zero exit path through an allowlisted command.
  const task = `# COFE TASK\n\nid: x\nmode: read\nlog: ${logRelative}\n\n## GOAL\n\nx\n\n## RUN\n\n- npm --prefix scripts run apply-patch -- tmp/run-task-tests/missing-protocol.md --dry-run\n\n## REPORT\n\n- x\n`;
  await buildTaskFile(caseDir, task);
  const result = runTask([toRepoRelative(path.join(caseDir, 'task.md'))]);
  assertCondition(result.status === 1, `expected exit 1, got ${result.status}`);
  assertCondition(
    (result.stdout + result.stderr).includes('non-zero status'),
    `expected non-zero status message in output. stdout=${result.stdout} stderr=${result.stderr}`,
  );
}

async function main() {
  await rm(fixturesRoot, { recursive: true, force: true });
  await mkdir(fixturesRoot, { recursive: true });

  const state = { passed: 0, failed: 0, failures: [] };

  const tests = [
    ['--help returns success', testHelpReturnsSuccess],
    ['valid read-mode task succeeds', testValidReadModeSucceeds],
    ['--dry-run skips RUN execution', testDryRunSkipsExecution],
    ['--explain only prints plan', testExplainOnlyPrintsPlan],
    ['missing task file fails', testMissingTaskFileFails],
    ['invalid first heading fails', testInvalidHeadingFails],
    ['empty metadata fails', testEmptyMetadataFails],
    ['duplicate block fails', testDuplicateBlockFails],
    ['unknown block fails', testUnknownBlockFails],
    ['mode: read blocks APPLY_PATCH', testReadModeBlocksApplyPatch],
    ['allowlist denies unknown commands', testAllowlistDenied],
    ['metacharacters rejected in RUN', testMetacharRejected],
    ['unsafe absolute path rejected', testUnsafeAbsolutePathRejected],
    ['unsafe .. path rejected', testDotDotPathRejected],
    ['log path outside tmp/output rejected', testLogOutsideAllowedDirectoryRejected],
    ['recursive task invocation skipped', testRecursiveTaskInvocationSkipped],
    ['unknown APPLY_PATCH field rejected', testUnknownApplyPatchFieldRejected],
    ['RUN non-zero exit fails', testRunNonZeroExitFails],
  ];

  for (const [name, fn] of tests) {
    await runTest(name, fn, state);
  }

  console.log('');
  console.log('TEST SUMMARY');
  console.log(`passed: ${state.passed}`);
  console.log(`failed: ${state.failed}`);

  if (state.failed > 0) {
    for (const failure of state.failures) {
      console.error(`- ${failure.name}: ${failure.message}`);
    }
    process.exit(1);
  }
}

await main();
