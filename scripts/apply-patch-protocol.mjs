import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  exists,
  fail,
  isDirectory,
  isFile,
  readText,
  repoRoot,
  resolveInputPath,
  writeText,
} from './lib.mjs';

const SUPPORTED_COMMANDS = new Set([
  'insert-before',
  'insert-after',
  'insert-after-line',
  'append-file',
  'create-file',
  'replace-block',
  'remove-block',
  'replace-text',
  'replace-regex',
]);

const COMMANDS_WITHOUT_CONTENT = new Set(['remove-block']);

class ProtocolError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProtocolError';
  }
}

function usage() {
  console.log(`Usage:
  npm --prefix scripts run apply-patch -- <file.md> [--dry-run] [--force]

Goal:
  Execute COFE Patch Protocol v1 with deterministic validations.

Flags:
  --dry-run  Simulate without writing files and without creating a temporary branch.
  --force    Ignore only the clean working tree validation.
  -h, --help Show this help.
`);
}

function parseCliArgs(rawArgs) {
  const args = [...rawArgs];
  const result = {
    dryRun: false,
    force: false,
    protocolArg: '',
  };

  for (const arg of args) {
    if (arg === '-h' || arg === '--help') {
      return { help: true };
    }

    if (arg === '--dry-run') {
      result.dryRun = true;
      continue;
    }

    if (arg === '--force') {
      result.force = true;
      continue;
    }

    if (arg.startsWith('-')) {
      throw new ProtocolError(`invalid flag: ${arg}`);
    }

    if (result.protocolArg) {
      throw new ProtocolError('provide exactly one .md protocol file');
    }

    result.protocolArg = arg;
  }

  if (!result.protocolArg) {
    throw new ProtocolError('provide exactly one .md protocol file');
  }

  if (!result.protocolArg.endsWith('.md')) {
    throw new ProtocolError(`protocol file must end with .md: ${result.protocolArg}`);
  }

  return result;
}

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    throw new ProtocolError(stderr || `failed to execute git ${args.join(' ')}`);
  }

  return result.stdout;
}

function getGitDir() {
  const gitDirOutput = runGit(['rev-parse', '--git-dir']).trim();
  return path.isAbsolute(gitDirOutput)
    ? gitDirOutput
    : path.resolve(repoRoot, gitDirOutput);
}

async function ensureNoUnsafeGitState() {
  const gitDir = getGitDir();
  const checks = [
    { file: 'MERGE_HEAD', message: 'merge in progress' },
    { file: 'CHERRY_PICK_HEAD', message: 'cherry-pick in progress' },
    { file: 'REVERT_HEAD', message: 'revert in progress' },
    { file: 'REBASE_HEAD', message: 'rebase in progress' },
  ];

  for (const check of checks) {
    if (await exists(path.join(gitDir, check.file))) {
      throw new ProtocolError(`unsafe Git state: ${check.message}`);
    }
  }

  if (await isDirectory(path.join(gitDir, 'rebase-merge'))) {
    throw new ProtocolError('unsafe Git state: rebase in progress');
  }

  if (await isDirectory(path.join(gitDir, 'rebase-apply'))) {
    throw new ProtocolError('unsafe Git state: rebase in progress');
  }

  const conflictOutput = runGit(['diff', '--name-only', '--diff-filter=U']).trim();
  if (conflictOutput) {
    throw new ProtocolError('unsafe Git state: unresolved conflicts');
  }
}

async function ensureCleanWorkingTreeUnlessForced(force) {
  if (force) {
    return;
  }

  const statusOutput = runGit(['status', '--porcelain']).trim();
  if (statusOutput) {
    throw new ProtocolError(
      'working tree must be clean, including untracked files. Use --force to bypass only this check.',
    );
  }
}

function ensureSafeRelativePath(rawPath) {
  const target = rawPath.trim();
  if (!target) {
    throw new ProtocolError('empty file path in [CHANGE-FILE]');
  }

  if (path.isAbsolute(target)) {
    throw new ProtocolError(`absolute path blocked: ${target}`);
  }

  const segments = target.split(/[\\/]+/);
  if (segments.includes('..')) {
    throw new ProtocolError(`path containing '..' blocked: ${target}`);
  }

  const absolute = path.resolve(repoRoot, target);
  const relative = path.relative(repoRoot, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new ProtocolError(`path outside repository root blocked: ${target}`);
  }

  return {
    relative: relative || '.',
    absolute,
  };
}

function parseLineField(line, fieldName) {
  const prefix = `${fieldName}:`;
  if (!line.trim().startsWith(prefix)) {
    return null;
  }

  return line.trim().slice(prefix.length).trimStart();
}

function parseCommandBlock(lines, startLineIndex, commandName, filePath) {
  const closeTag = `</cmd:${commandName}>`;
  let closeIndex = -1;

  for (let i = startLineIndex + 1; i < lines.length; i += 1) {
    if (lines[i].trim() === closeTag) {
      closeIndex = i;
      break;
    }
  }

  if (closeIndex === -1) {
    throw new ProtocolError(
      `line ${startLineIndex + 1}: missing closing tag for <cmd:${commandName}>`,
    );
  }

  if (!SUPPORTED_COMMANDS.has(commandName)) {
    throw new ProtocolError(`line ${startLineIndex + 1}: command not supported: ${commandName}`);
  }

  const bodyLines = lines.slice(startLineIndex + 1, closeIndex);
  const requiresContent = !COMMANDS_WITHOUT_CONTENT.has(commandName);
  const contentMarkerIndex = bodyLines.findIndex((line) => line.trim() === 'content:|');

  if (requiresContent && contentMarkerIndex === -1) {
    throw new ProtocolError(
      `line ${startLineIndex + 1}: <cmd:${commandName}> missing content:|`,
    );
  }

  if (!requiresContent && contentMarkerIndex !== -1) {
    throw new ProtocolError(
      `line ${startLineIndex + 1}: <cmd:${commandName}> does not accept content:|`,
    );
  }

  const metadataLines =
    contentMarkerIndex === -1 ? bodyLines : bodyLines.slice(0, contentMarkerIndex);
  const contentLines =
    contentMarkerIndex === -1 ? [] : bodyLines.slice(contentMarkerIndex + 1);
  const content = contentLines.join('\n');
  let anchor = null;
  let anchorStart = null;
  let anchorEnd = null;
  let pattern = null;
  let confirm = null;
  let lineNumber = null;

  for (const metadataLine of metadataLines) {
    const trimmed = metadataLine.trim();
    if (!trimmed) {
      continue;
    }

    const anchorValue = parseLineField(metadataLine, 'anchor');
    if (anchorValue !== null) {
      if (anchor !== null) {
        throw new ProtocolError(
          `line ${startLineIndex + 1}: anchor field repeated in <cmd:${commandName}>`,
        );
      }
      if (!anchorValue) {
        throw new ProtocolError(
          `line ${startLineIndex + 1}: empty anchor field in <cmd:${commandName}>`,
        );
      }
      anchor = anchorValue;
      continue;
    }

    const anchorStartValue = parseLineField(metadataLine, 'anchor_start');
    if (anchorStartValue !== null) {
      if (anchorStart !== null) {
        throw new ProtocolError(
          `line ${startLineIndex + 1}: anchor_start field repeated in <cmd:${commandName}>`,
        );
      }
      if (!anchorStartValue) {
        throw new ProtocolError(
          `line ${startLineIndex + 1}: empty anchor_start field in <cmd:${commandName}>`,
        );
      }
      anchorStart = anchorStartValue;
      continue;
    }

    const anchorEndValue = parseLineField(metadataLine, 'anchor_end');
    if (anchorEndValue !== null) {
      if (anchorEnd !== null) {
        throw new ProtocolError(
          `line ${startLineIndex + 1}: anchor_end field repeated in <cmd:${commandName}>`,
        );
      }
      if (!anchorEndValue) {
        throw new ProtocolError(
          `line ${startLineIndex + 1}: empty anchor_end field in <cmd:${commandName}>`,
        );
      }
      anchorEnd = anchorEndValue;
      continue;
    }

    const patternValue = parseLineField(metadataLine, 'pattern');
    if (patternValue !== null) {
      if (pattern !== null) {
        throw new ProtocolError(
          `line ${startLineIndex + 1}: pattern field repeated in <cmd:${commandName}>`,
        );
      }
      if (!patternValue) {
        throw new ProtocolError(
          `line ${startLineIndex + 1}: empty pattern field in <cmd:${commandName}>`,
        );
      }
      pattern = patternValue;
      continue;
    }

    const confirmValue = parseLineField(metadataLine, 'confirm');
    if (confirmValue !== null) {
      if (confirm !== null) {
        throw new ProtocolError(
          `line ${startLineIndex + 1}: confirm field repeated in <cmd:${commandName}>`,
        );
      }
      if (confirmValue !== 'true' && confirmValue !== 'false') {
        throw new ProtocolError(
          `line ${startLineIndex + 1}: confirm field must be 'true' or 'false' in <cmd:${commandName}>`,
        );
      }
      confirm = confirmValue === 'true';
      continue;
    }

    const lineValue = parseLineField(metadataLine, 'line');
    if (lineValue !== null) {
      if (lineNumber !== null) {
        throw new ProtocolError(
          `line ${startLineIndex + 1}: line field repeated in <cmd:${commandName}>`,
        );
      }

      if (!/^-?\d+$/.test(lineValue)) {
        throw new ProtocolError(
          `line ${startLineIndex + 1}: invalid line field in <cmd:${commandName}>`,
        );
      }
      const parsedLine = Number.parseInt(lineValue, 10);
      lineNumber = parsedLine;
      continue;
    }

    throw new ProtocolError(
      `line ${startLineIndex + 1}: unknown field in <cmd:${commandName}>: ${trimmed}`,
    );
  }

  if ((commandName === 'insert-before' || commandName === 'insert-after') && anchor === null) {
    throw new ProtocolError(
      `line ${startLineIndex + 1}: <cmd:${commandName}> requires anchor field`,
    );
  }

  if (commandName === 'insert-after-line' && lineNumber === null) {
    throw new ProtocolError(
      `line ${startLineIndex + 1}: <cmd:insert-after-line> requires line field`,
    );
  }

  if (commandName === 'insert-after-line' && anchor !== null) {
    throw new ProtocolError(
      `line ${startLineIndex + 1}: <cmd:insert-after-line> does not accept anchor field`,
    );
  }

  if ((commandName === 'append-file' || commandName === 'create-file') && (anchor !== null || lineNumber !== null)) {
    throw new ProtocolError(
      `line ${startLineIndex + 1}: <cmd:${commandName}> does not accept anchor or line fields`,
    );
  }

  if (commandName === 'replace-block' || commandName === 'remove-block') {
    if (anchorStart === null) {
      throw new ProtocolError(
        `line ${startLineIndex + 1}: <cmd:${commandName}> requires anchor_start field`,
      );
    }
    if (anchorEnd === null) {
      throw new ProtocolError(
        `line ${startLineIndex + 1}: <cmd:${commandName}> requires anchor_end field`,
      );
    }
    if (anchor !== null || lineNumber !== null || pattern !== null) {
      throw new ProtocolError(
        `line ${startLineIndex + 1}: <cmd:${commandName}> does not accept anchor, line or pattern fields`,
      );
    }
  }

  if (commandName === 'replace-block') {
    if (confirm !== null) {
      throw new ProtocolError(
        `line ${startLineIndex + 1}: <cmd:replace-block> does not accept confirm field`,
      );
    }
    if (content.length === 0) {
      throw new ProtocolError(
        `line ${startLineIndex + 1}: <cmd:replace-block> requires non-empty content; use <cmd:remove-block> to remove a range`,
      );
    }
  }

  if (commandName === 'remove-block') {
    if (confirm !== true) {
      throw new ProtocolError(
        `line ${startLineIndex + 1}: <cmd:remove-block> requires 'confirm: true'`,
      );
    }
  }

  if (commandName === 'replace-text') {
    if (anchor === null) {
      throw new ProtocolError(
        `line ${startLineIndex + 1}: <cmd:replace-text> requires anchor field`,
      );
    }
    if (anchorStart !== null || anchorEnd !== null || lineNumber !== null || pattern !== null || confirm !== null) {
      throw new ProtocolError(
        `line ${startLineIndex + 1}: <cmd:replace-text> only accepts anchor field`,
      );
    }
  }

  if (commandName === 'replace-regex') {
    if (pattern === null) {
      throw new ProtocolError(
        `line ${startLineIndex + 1}: <cmd:replace-regex> requires pattern field`,
      );
    }
    if (anchor !== null || anchorStart !== null || anchorEnd !== null || lineNumber !== null || confirm !== null) {
      throw new ProtocolError(
        `line ${startLineIndex + 1}: <cmd:replace-regex> only accepts pattern field`,
      );
    }
  }

  return {
    nextLineIndex: closeIndex,
    operation: {
      type: commandName,
      filePath,
      anchor,
      anchorStart,
      anchorEnd,
      pattern,
      confirm,
      lineNumber,
      content,
      line: startLineIndex + 1,
    },
  };
}

function parseProtocol(protocolContent) {
  const lines = protocolContent.split(/\r?\n/);
  const operations = [];
  const validationCommands = [];

  let currentFile = null;
  let mode = 'none';

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    const changeFileMatch = /^\[CHANGE-FILE:\s*(.+?)\s*\]$/.exec(trimmed);
    if (changeFileMatch) {
      currentFile = changeFileMatch[1];
      mode = 'change-file';
      continue;
    }

    if (trimmed === '[VALIDATE]') {
      currentFile = null;
      mode = 'validate';
      continue;
    }

    if (mode === 'validate') {
      if (/^\[.+\]$/.test(trimmed)) {
        throw new ProtocolError(`line ${i + 1}: invalid section after [VALIDATE]: ${trimmed}`);
      }
      if (trimmed) {
        validationCommands.push(rawLine);
      }
      continue;
    }

    if (mode === 'change-file') {
      if (!trimmed) {
        continue;
      }

      const openCommandMatch = /^<cmd:([a-z-]+)>$/.exec(trimmed);
      if (!openCommandMatch) {
        throw new ProtocolError(
          `line ${i + 1}: expected <cmd:...> inside [CHANGE-FILE: ${currentFile}]`,
        );
      }

      const { nextLineIndex, operation } = parseCommandBlock(
        lines,
        i,
        openCommandMatch[1],
        currentFile,
      );
      operations.push(operation);
      i = nextLineIndex;
      continue;
    }
  }

  return { operations, validationCommands };
}

function getAnchorOccurrence(text, anchor, lineNumber) {
  if (!anchor) {
    throw new ProtocolError(`line ${lineNumber}: empty anchor`);
  }

  const firstIndex = text.indexOf(anchor);
  if (firstIndex === -1) {
    throw new ProtocolError(`line ${lineNumber}: anchor not found`);
  }

  const secondIndex = text.indexOf(anchor, firstIndex + anchor.length);
  if (secondIndex !== -1) {
    throw new ProtocolError(`line ${lineNumber}: anchor matches multiple occurrences`);
  }

  return firstIndex;
}

function getNamedAnchorOccurrence(text, anchor, fieldName, lineNumber) {
  if (!anchor) {
    throw new ProtocolError(`line ${lineNumber}: empty ${fieldName}`);
  }

  const firstIndex = text.indexOf(anchor);
  if (firstIndex === -1) {
    throw new ProtocolError(`line ${lineNumber}: ${fieldName} not found`);
  }

  const secondIndex = text.indexOf(anchor, firstIndex + anchor.length);
  if (secondIndex !== -1) {
    throw new ProtocolError(
      `line ${lineNumber}: ${fieldName} matches multiple occurrences`,
    );
  }

  return firstIndex;
}

function lineNumberAtIndex(text, index) {
  if (index <= 0) {
    return 1;
  }
  let count = 1;
  for (let i = 0; i < index && i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) {
      count += 1;
    }
  }
  return count;
}

function countLines(content) {
  if (content.length === 0) {
    return 0;
  }
  return content.split('\n').length;
}

function applyOperationToContent(operation, currentContent) {
  if (operation.type === 'insert-before') {
    const anchorIndex = getAnchorOccurrence(currentContent, operation.anchor, operation.line);
    return {
      content:
        currentContent.slice(0, anchorIndex) +
        operation.content +
        currentContent.slice(anchorIndex),
      detail: '',
    };
  }

  if (operation.type === 'insert-after') {
    const anchorIndex = getAnchorOccurrence(currentContent, operation.anchor, operation.line);
    const insertIndex = anchorIndex + operation.anchor.length;
    return {
      content:
        currentContent.slice(0, insertIndex) +
        operation.content +
        currentContent.slice(insertIndex),
      detail: '',
    };
  }

  if (operation.type === 'insert-after-line') {
    const totalLines = countLines(currentContent);
    if (totalLines === 0) {
      throw new ProtocolError(
        `line ${operation.line}: insert-after-line cannot run on empty file. Use create-file or append-file.`,
      );
    }
    if (operation.lineNumber < 1 || operation.lineNumber > totalLines) {
      throw new ProtocolError(
        `line ${operation.line}: invalid line in insert-after-line. Expected 1..${totalLines}, received ${operation.lineNumber}`,
      );
    }

    const lines = currentContent.split('\n');
    const before = lines.slice(0, operation.lineNumber);
    const after = lines.slice(operation.lineNumber);
    return {
      content: [...before, operation.content, ...after].join('\n'),
      detail: '',
    };
  }

  if (operation.type === 'append-file') {
    return { content: currentContent + operation.content, detail: '' };
  }

  if (operation.type === 'create-file') {
    return { content: operation.content, detail: '' };
  }

  if (operation.type === 'replace-block' || operation.type === 'remove-block') {
    const startIndex = getNamedAnchorOccurrence(
      currentContent,
      operation.anchorStart,
      'anchor_start',
      operation.line,
    );
    const endIndex = getNamedAnchorOccurrence(
      currentContent,
      operation.anchorEnd,
      'anchor_end',
      operation.line,
    );

    if (endIndex < startIndex) {
      throw new ProtocolError(
        `line ${operation.line}: anchor_end appears before anchor_start`,
      );
    }

    const endExclusive = endIndex + operation.anchorEnd.length;
    const removedSlice = currentContent.slice(startIndex, endExclusive);
    const startLine = lineNumberAtIndex(currentContent, startIndex);
    const endLine = lineNumberAtIndex(currentContent, endExclusive - 1);

    if (operation.type === 'replace-block') {
      return {
        content:
          currentContent.slice(0, startIndex) +
          operation.content +
          currentContent.slice(endExclusive),
        detail: `lines ${startLine}-${endLine}`,
      };
    }

    let newContent =
      currentContent.slice(0, startIndex) + currentContent.slice(endExclusive);

    if (
      startIndex > 0 &&
      currentContent.charCodeAt(startIndex - 1) === 10 &&
      newContent.charCodeAt(startIndex) === 10
    ) {
      newContent = newContent.slice(0, startIndex) + newContent.slice(startIndex + 1);
    }

    const removedLines = countLines(removedSlice);
    return {
      content: newContent,
      detail: `removed ${removedLines} line${removedLines === 1 ? '' : 's'} (lines ${startLine}-${endLine})`,
    };
  }

  if (operation.type === 'replace-text') {
    const anchorIndex = getAnchorOccurrence(currentContent, operation.anchor, operation.line);
    const startLine = lineNumberAtIndex(currentContent, anchorIndex);
    return {
      content:
        currentContent.slice(0, anchorIndex) +
        operation.content +
        currentContent.slice(anchorIndex + operation.anchor.length),
      detail: `line ${startLine}`,
    };
  }

  if (operation.type === 'replace-regex') {
    let regex;
    try {
      regex = new RegExp(operation.pattern);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ProtocolError(`line ${operation.line}: invalid regex pattern: ${message}`);
    }

    const firstMatch = regex.exec(currentContent);
    if (firstMatch === null) {
      throw new ProtocolError(`line ${operation.line}: regex pattern not found`);
    }
    const firstIndex = firstMatch.index;
    const firstLength = firstMatch[0].length;

    const tail = currentContent.slice(firstIndex + Math.max(firstLength, 1));
    const secondMatch = new RegExp(operation.pattern).exec(tail);
    if (secondMatch !== null) {
      throw new ProtocolError(
        `line ${operation.line}: regex pattern matches multiple occurrences`,
      );
    }

    const startLine = lineNumberAtIndex(currentContent, firstIndex);
    return {
      content:
        currentContent.slice(0, firstIndex) +
        operation.content +
        currentContent.slice(firstIndex + firstLength),
      detail: `line ${startLine}`,
    };
  }

  throw new ProtocolError(`operation not supported: ${operation.type}`);
}

async function resolveCurrentContent(absolutePath, operationType) {
  if (await isFile(absolutePath)) {
    return readText(absolutePath);
  }

  if (await exists(absolutePath)) {
    throw new ProtocolError(`target is not a regular file: ${path.relative(repoRoot, absolutePath)}`);
  }

  if (
    operationType === 'insert-before' ||
    operationType === 'insert-after' ||
    operationType === 'insert-after-line' ||
    operationType === 'replace-block' ||
    operationType === 'remove-block' ||
    operationType === 'replace-text' ||
    operationType === 'replace-regex'
  ) {
    throw new ProtocolError(`target file does not exist for ${operationType}: ${path.relative(repoRoot, absolutePath)}`);
  }

  const parentDir = path.dirname(absolutePath);
  if (!(await isDirectory(parentDir))) {
    throw new ProtocolError(`target directory does not exist: ${path.relative(repoRoot, parentDir)}`);
  }

  return null;
}

function buildBranchName() {
  const now = new Date();
  const pad2 = (value) => String(value).padStart(2, '0');
  const stamp =
    `${now.getUTCFullYear()}` +
    `${pad2(now.getUTCMonth() + 1)}` +
    `${pad2(now.getUTCDate())}-` +
    `${pad2(now.getUTCHours())}` +
    `${pad2(now.getUTCMinutes())}` +
    `${pad2(now.getUTCSeconds())}`;
  return `tmp/cofe-patch/${stamp}`;
}

function renderReport(report) {
  const formatYesNo = (value) => (value ? 'yes' : 'no');
  const lines = [];

  lines.push('COFE PATCH REPORT');
  lines.push('');
  lines.push(`status: ${report.status}`);
  lines.push(`protocol_file: ${report.protocolFile}`);
  lines.push(`dry_run: ${formatYesNo(report.dryRun)}`);
  lines.push(`force: ${formatYesNo(report.force)}`);
  lines.push(`branch_created: ${report.branchCreated || 'n/a'}`);
  lines.push('');
  lines.push('files_changed:');
  if (report.filesChanged.length === 0) {
    lines.push('- none');
  } else {
    for (const file of report.filesChanged) {
      lines.push(`- ${file}`);
    }
  }
  lines.push('');
  lines.push('operations:');
  if (report.operations.length === 0) {
    lines.push('- none');
  } else {
    for (const operation of report.operations) {
      lines.push(`- ${operation}`);
    }
  }
  lines.push('');
  lines.push('validation_commands_found:');
  if (report.validationCommands.length === 0) {
    lines.push('- none');
  } else {
    for (const command of report.validationCommands) {
      lines.push(`- ${command}`);
    }
  }
  lines.push('');
  lines.push('warnings:');
  if (report.warnings.length === 0) {
    lines.push('- none');
  } else {
    for (const warning of report.warnings) {
      lines.push(`- ${warning}`);
    }
  }
  lines.push('');
  lines.push('errors:');
  if (report.errors.length === 0) {
    lines.push('- none');
  } else {
    for (const error of report.errors) {
      lines.push(`- ${error}`);
    }
  }

  return lines.join('\n');
}

async function main() {
  const cli = parseCliArgs(process.argv.slice(2));
  if (cli.help) {
    usage();
    return;
  }

  const protocolFile = resolveInputPath(cli.protocolArg);
  const report = {
    status: 'failed',
    protocolFile,
    dryRun: cli.dryRun,
    force: cli.force,
    branchCreated: '',
    filesChanged: [],
    operations: [],
    validationCommands: [],
    warnings: [],
    errors: [],
  };

  try {
    if (!(await isFile(protocolFile))) {
      throw new ProtocolError(`protocol file does not exist or is not a file: ${cli.protocolArg}`);
    }

    const protocolContent = await readText(protocolFile);
    const parsed = parseProtocol(protocolContent);
    report.validationCommands = parsed.validationCommands;

    const plannedWrites = new Map();
    const operationsByFile = new Map();

    for (const operation of parsed.operations) {
      const safePath = ensureSafeRelativePath(operation.filePath);
      const fileKey = safePath.absolute;

      if (!operationsByFile.has(fileKey)) {
        operationsByFile.set(fileKey, {
          relative: safePath.relative,
          absolute: safePath.absolute,
          operations: [],
        });
      }

      operationsByFile.get(fileKey).operations.push(operation);
    }

    for (const fileEntry of operationsByFile.values()) {
      let currentContent = await resolveCurrentContent(
        fileEntry.absolute,
        fileEntry.operations[0].type,
      );

      for (const operation of fileEntry.operations) {
        if (operation.type === 'create-file' && currentContent !== null) {
          throw new ProtocolError(`file already exists for create-file: ${fileEntry.relative}`);
        }

        if (operation.type !== 'create-file' && currentContent === null) {
          currentContent = '';
        }

        const result = applyOperationToContent(operation, currentContent ?? '');
        currentContent = result.content;
        const detailSuffix = result.detail ? ` [${result.detail}]` : '';
        report.operations.push(
          `${operation.type} ${cli.dryRun ? '(simulated)' : '(applied)'} -> ${fileEntry.relative}${detailSuffix}`,
        );
      }

      plannedWrites.set(fileEntry.absolute, {
        relative: fileEntry.relative,
        content: currentContent ?? '',
      });
    }

    report.filesChanged = [...plannedWrites.values()].map((entry) => entry.relative);

    if (!cli.dryRun) {
      await ensureNoUnsafeGitState();
      await ensureCleanWorkingTreeUnlessForced(cli.force);
      const branchName = buildBranchName();
      runGit(['checkout', '-b', branchName]);
      report.branchCreated = branchName;

      for (const writeEntry of plannedWrites.values()) {
        await writeText(path.resolve(repoRoot, writeEntry.relative), writeEntry.content);
      }
    }

    report.status = 'success';
  } catch (error) {
    report.errors.push(error instanceof Error ? error.message : String(error));
  }

  console.log(renderReport(report));

  if (report.status !== 'success') {
    process.exit(1);
  }
}

await main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
