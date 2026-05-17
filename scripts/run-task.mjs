#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(scriptPath);
const repoRoot = path.resolve(scriptsDir, "..");

const HELP = `
MTG Task Protocol runner

Usage:
  npm --prefix scripts run task -- <prompt.md>
  npm --prefix scripts run task -- --help

Description:
  Executes a declarative MTG Task Protocol file.
  The v1 runner supports READ, RUN, APPLY_PATCH and REPORT blocks.

Supported blocks:
  ## GOAL
  ## ALLOWED_CHANGES
  ## READ
  ## RUN
  ## APPLY_PATCH
  ## REPORT

Safety:
  - Rejects absolute paths.
  - Rejects paths containing "..".
  - Rejects paths outside the repository root.
  - Executes only allowlisted commands.
  - Does not commit.
  - Does not push.
  - Does not install dependencies.
  - Does not delete files.
  - Logs incrementally to the configured log file.
`.trim();

const ALLOWED_RUN_PREFIXES = [
  "npm --prefix scripts run pre-run",
  "npm --prefix scripts run validate",
  "npm --prefix scripts run apply-patch",
  "npm --prefix scripts run task",
  "git status --short",
  "git diff --",
];

function fail(message, details = []) {
  const lines = ["MTG TASK ERROR", "", message];

  if (details.length > 0) {
    lines.push("", "Details:");
    for (const detail of details) {
      lines.push(`- ${detail}`);
    }
  }

  console.error(lines.join("\n"));
  process.exit(1);
}

function normalizeSlashes(value) {
  return value.replaceAll("\\", "/");
}

function isUnsafeRelativePath(input) {
  if (!input || typeof input !== "string") return true;
  if (path.isAbsolute(input)) return true;

  const normalized = normalizeSlashes(input);
  const parts = normalized.split("/");

  return parts.includes("..");
}

function resolveRepoPath(input, label = "path") {
  const trimmed = String(input || "").trim();

  if (isUnsafeRelativePath(trimmed)) {
    fail(`Unsafe ${label}: ${trimmed}`, [
      "Path must be relative to the repository root.",
      "Path must not be absolute.",
      "Path must not contain '..'.",
    ]);
  }

  const resolved = path.resolve(repoRoot, trimmed);
  const relative = path.relative(repoRoot, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    fail(`Path escapes repository root: ${trimmed}`);
  }

  return resolved;
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function appendLog(logPath, content) {
  ensureParentDir(logPath);
  fs.appendFileSync(logPath, `${content.trimEnd()}\n\n`, "utf8");
}

function nowIso() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  const args = [...argv];

  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  if (args.length > 1) {
    fail("Expected zero or one task markdown file.", [
      "Default: npm --prefix scripts run task",
      "Explicit: npm --prefix scripts run task -- tmp/prompt.md",
    ]);
  }

  return {
    taskFile: args[0] || "tmp/prompt.md",
  };
}

function parseMetadata(raw) {
  const beforeFirstBlock = raw.split(/^##\s+/m)[0];
  const metadata = {};

  for (const line of beforeFirstBlock.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;

    const key = match[1].trim();
    const value = match[2].trim();
    metadata[key] = value;
  }

  return metadata;
}

function parseBlocks(raw) {
  const blocks = new Map();
  const regex = /^##\s+([A-Za-z0-9_-]+)\s*$/gm;
  const matches = [...raw.matchAll(regex)];

  for (let i = 0; i < matches.length; i += 1) {
    const name = matches[i][1].trim().toUpperCase();
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
    const content = raw.slice(start, end).trim();
    blocks.set(name, content);
  }

  return blocks;
}

function parseListBlock(content) {
  if (!content) return [];

  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\-\s*/, "").trim())
    .filter((line) => !/^-{2,}$/.test(line))
    .filter(Boolean);
}

function parseApplyPatchBlock(content) {
  if (!content) return [];

  const entries = [];
  const lines = content.split(/\r?\n/);

  let current = null;

  function pushCurrent() {
    if (!current) return;
    if (!current.file) {
      fail("Malformed APPLY_PATCH entry.", ["Missing required field: file"]);
    }

    entries.push({
      file: current.file,
      dryRun: parseBoolean(current.dry_run ?? current.dryRun ?? "false", "dry_run"),
      force: parseBoolean(current.force ?? "false", "force"),
    });
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      fail("Malformed APPLY_PATCH line.", [`Line: ${rawLine}`]);
    }

    const key = match[1].trim();
    const value = match[2].trim();

    if (key === "file") {
      pushCurrent();
      current = { file: value };
      continue;
    }

    if (!current) {
      fail("Malformed APPLY_PATCH block.", [
        "The first field of each entry must be file.",
        `Line: ${rawLine}`,
      ]);
    }

    current[key] = value;
  }

  pushCurrent();

  return entries;
}

function parseBoolean(value, fieldName) {
  if (value === "true") return true;
  if (value === "false") return false;

  fail(`Invalid boolean value for ${fieldName}.`, [
    "Expected true or false.",
    `Received: ${value}`,
  ]);
}

function validateRequiredTaskShape(raw, metadata, blocks) {
  if (!raw.trimStart().startsWith("# MTG TASK")) {
    fail("Invalid task file.", ["Expected first heading: # MTG TASK"]);
  }

  if (!metadata.id) {
    fail("Task metadata is missing required field: id");
  }

  if (!metadata.mode) {
    fail("Task metadata is missing required field: mode");
  }

  if (!["read", "write"].includes(metadata.mode)) {
    fail("Invalid task mode.", ["Expected: read or write", `Received: ${metadata.mode}`]);
  }

  if (!metadata.log) {
    fail("Task metadata is missing required field: log");
  }

  if (!blocks.has("GOAL")) {
    fail("Task is missing required block: ## GOAL");
  }

  if (!blocks.has("REPORT")) {
    fail("Task is missing required block: ## REPORT");
  }
}

function validateAllowedChanges(paths, logRelativePath) {
  const allowedSet = new Set(paths);
  allowedSet.add(logRelativePath);

  for (const allowedPath of allowedSet) {
    resolveRepoPath(allowedPath, "allowed change path");
  }

  return allowedSet;
}

function ensurePathAllowed(relativePath, allowedSet, label) {
  const normalized = normalizeSlashes(relativePath);

  if (!allowedSet.has(normalized)) {
    fail(`${label} is not listed in ALLOWED_CHANGES.`, [
      `Path: ${normalized}`,
      "Add the path to ALLOWED_CHANGES or remove the operation.",
    ]);
  }
}

function validateRunCommand(command, taskFileRelative) {
  const trimmed = command.trim();

  const allowed = ALLOWED_RUN_PREFIXES.some((prefix) => trimmed.startsWith(prefix));

  if (!allowed) {
    fail("RUN command is not allowlisted.", [
      `Command: ${trimmed}`,
      "Allowed prefixes:",
      ...ALLOWED_RUN_PREFIXES,
    ]);
  }

  if (/\brm\s+-/.test(trimmed) || /\brm\s/.test(trimmed)) {
    fail("RUN command contains forbidden delete operation.", [`Command: ${trimmed}`]);
  }

  if (/\bnpm\s+install\b/.test(trimmed) || /\bnpm\s+i\b/.test(trimmed)) {
    fail("RUN command contains forbidden install operation.", [`Command: ${trimmed}`]);
  }

  if (/\bgit\s+commit\b/.test(trimmed)) {
    fail("RUN command contains forbidden commit operation.", [`Command: ${trimmed}`]);
  }

  if (/\bgit\s+push\b/.test(trimmed)) {
    fail("RUN command contains forbidden push operation.", [`Command: ${trimmed}`]);
  }

  const selfRun = trimmed === `npm --prefix scripts run task -- ${taskFileRelative}`;

  return {
    command: trimmed,
    skip: selfRun,
    skipReason: selfRun
      ? "Skipped self invocation to avoid recursive task execution."
      : "",
  };
}

function shell(command) {
  return spawnSync(command, {
    cwd: repoRoot,
    shell: true,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 10,
  });
}

function summarizeOutput(output, maxLines = 40) {
  const lines = String(output || "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length <= maxLines) return lines.join("\n");

  return [
    ...lines.slice(0, maxLines),
    `... output truncated, ${lines.length - maxLines} more lines`,
  ].join("\n");
}

function extractPatchTargets(protocolRelativePath) {
  const protocolPath = resolveRepoPath(protocolRelativePath, "apply-patch protocol path");

  if (!fs.existsSync(protocolPath)) {
    fail("APPLY_PATCH protocol file does not exist.", [`Path: ${protocolRelativePath}`]);
  }

  const raw = readText(protocolPath);
  const targets = [];

  const regex = /^\[CHANGE-FILE:\s*([^\]]+?)\s*\]\s*$/gm;
  for (const match of raw.matchAll(regex)) {
    targets.push(normalizeSlashes(match[1].trim()));
  }

  return targets;
}

function runApplyPatch(entry, allowedChanges, taskLog) {
  resolveRepoPath(entry.file, "apply-patch protocol file");

  ensurePathAllowed(normalizeSlashes(entry.file), allowedChanges, "APPLY_PATCH protocol file");

  const patchTargets = extractPatchTargets(entry.file);

  for (const target of patchTargets) {
    resolveRepoPath(target, "apply-patch target path");
    ensurePathAllowed(target, allowedChanges, "APPLY_PATCH target file");
  }

  const flags = [];
  if (entry.dryRun) flags.push("--dry-run");
  if (entry.force) flags.push("--force");

  const command = [
    "npm --prefix scripts run apply-patch --",
    entry.file,
    ...flags,
  ].join(" ");

  taskLog.push(`Executing APPLY_PATCH: ${command}`);

  const result = shell(command);

  taskLog.push(`APPLY_PATCH exit code: ${result.status ?? "unknown"}`);

  if (result.stdout) {
    taskLog.push("APPLY_PATCH stdout:");
    taskLog.push(summarizeOutput(result.stdout));
  }

  if (result.stderr) {
    taskLog.push("APPLY_PATCH stderr:");
    taskLog.push(summarizeOutput(result.stderr));
  }

  if (result.status !== 0) {
    fail("APPLY_PATCH command failed.", [
      `Command: ${command}`,
      `Exit code: ${result.status}`,
    ]);
  }

  return {
    command,
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function main() {
  const { taskFile } = parseArgs(process.argv.slice(2));

  if (!taskFile.endsWith(".md")) {
    fail("Task file must end with .md", [`Received: ${taskFile}`]);
  }

  const taskPath = resolveRepoPath(taskFile, "task file");

  if (!fs.existsSync(taskPath)) {
    fail("Task file does not exist.", [`Path: ${taskFile}`]);
  }

  const taskFileRelative = normalizeSlashes(path.relative(repoRoot, taskPath));
  const raw = readText(taskPath);
  const metadata = parseMetadata(raw);
  const blocks = parseBlocks(raw);

  validateRequiredTaskShape(raw, metadata, blocks);

  const logPath = resolveRepoPath(metadata.log, "log path");
  const logRelative = normalizeSlashes(path.relative(repoRoot, logPath));

  const allowedChanges = parseListBlock(blocks.get("ALLOWED_CHANGES") || "");
  const allowedSet = validateAllowedChanges(allowedChanges, logRelative);

  const readFiles = parseListBlock(blocks.get("READ") || "");
  const runCommands = parseListBlock(blocks.get("RUN") || "");
  const applyPatchEntries = parseApplyPatchBlock(blocks.get("APPLY_PATCH") || "");
  const reportItems = parseListBlock(blocks.get("REPORT") || "");

  const taskLog = [];
  const summary = {
    taskFile: taskFileRelative,
    id: metadata.id,
    mode: metadata.mode,
    log: logRelative,
    filesRead: [],
    runCommands: [],
    applyPatch: [],
    warnings: [],
  };

  taskLog.push("# MTG TASK EXEC LOG");
  taskLog.push(`started_at: ${nowIso()}`);
  taskLog.push(`task_file: ${taskFileRelative}`);
  taskLog.push(`id: ${metadata.id}`);
  taskLog.push(`mode: ${metadata.mode}`);
  taskLog.push(`log: ${logRelative}`);

  appendLog(logPath, taskLog.join("\n"));

  for (const readFile of readFiles) {
    const readPath = resolveRepoPath(readFile, "READ file");

    if (!fs.existsSync(readPath)) {
      fail("READ file does not exist.", [`Path: ${readFile}`]);
    }

    const stat = fs.statSync(readPath);

    if (!stat.isFile()) {
      fail("READ path is not a file.", [`Path: ${readFile}`]);
    }

    summary.filesRead.push(normalizeSlashes(readFile));

    appendLog(
      logPath,
      [
        "## READ",
        `file: ${readFile}`,
        `size_bytes: ${stat.size}`,
      ].join("\n"),
    );
  }

  for (const command of runCommands) {
    const validation = validateRunCommand(command, taskFileRelative);

    if (validation.skip) {
      summary.warnings.push(validation.skipReason);
      appendLog(
        logPath,
        [
          "## RUN SKIPPED",
          `command: ${validation.command}`,
          `reason: ${validation.skipReason}`,
        ].join("\n"),
      );
      continue;
    }

    appendLog(logPath, ["## RUN", `command: ${validation.command}`].join("\n"));

    const result = shell(validation.command);

    const runRecord = {
      command: validation.command,
      exitCode: result.status,
    };

    summary.runCommands.push(runRecord);

    const logLines = [
      "## RUN RESULT",
      `command: ${validation.command}`,
      `exit_code: ${result.status ?? "unknown"}`,
    ];

    if (result.stdout) {
      logLines.push("stdout:");
      logLines.push(summarizeOutput(result.stdout));
    }

    if (result.stderr) {
      logLines.push("stderr:");
      logLines.push(summarizeOutput(result.stderr));
    }

    appendLog(logPath, logLines.join("\n"));

    if (result.status !== 0) {
      fail("RUN command failed.", [
        `Command: ${validation.command}`,
        `Exit code: ${result.status}`,
      ]);
    }
  }

  for (const entry of applyPatchEntries) {
    const result = runApplyPatch(entry, allowedSet, taskLog);
    summary.applyPatch.push({
      file: entry.file,
      dryRun: entry.dryRun,
      force: entry.force,
      exitCode: result.exitCode,
    });

    appendLog(
      logPath,
      [
        "## APPLY_PATCH RESULT",
        `file: ${entry.file}`,
        `dry_run: ${entry.dryRun ? "true" : "false"}`,
        `force: ${entry.force ? "true" : "false"}`,
        `exit_code: ${result.exitCode}`,
      ].join("\n"),
    );
  }

  const finalReport = [
    "# MTG TASK REPORT",
    "",
    `status: success`,
    `task_file: ${summary.taskFile}`,
    `id: ${summary.id}`,
    `mode: ${summary.mode}`,
    `log: ${summary.log}`,
    "",
    "files_read:",
    ...(summary.filesRead.length
      ? summary.filesRead.map((file) => `- ${file}`)
      : ["- none"]),
    "",
    "run_commands:",
    ...(summary.runCommands.length
      ? summary.runCommands.map(
          (item) => `- ${item.command} -> exit ${item.exitCode}`,
        )
      : ["- none"]),
    "",
    "apply_patch:",
    ...(summary.applyPatch.length
      ? summary.applyPatch.map(
          (item) =>
            `- ${item.file} dry_run=${item.dryRun ? "true" : "false"} force=${
              item.force ? "true" : "false"
            } -> exit ${item.exitCode}`,
        )
      : ["- none"]),
    "",
    "warnings:",
    ...(summary.warnings.length
      ? summary.warnings.map((warning) => `- ${warning}`)
      : ["- none"]),
    "",
    "requested_report_items:",
    ...(reportItems.length ? reportItems.map((item) => `- ${item}`) : ["- none"]),
    "",
    `finished_at: ${nowIso()}`,
  ].join("\n");

  appendLog(logPath, finalReport);
  console.log(finalReport);
}

main();