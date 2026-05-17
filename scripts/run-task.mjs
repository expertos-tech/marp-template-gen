#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(scriptPath);
const repoRoot = path.resolve(scriptsDir, "..");

const HELP = `
COFE Task Protocol runner

Usage:
  npm --prefix scripts run task -- [file.md] [--dry-run] [--explain]
  npm --prefix scripts run task -- --help

Description:
  Executes a declarative COFE Task Protocol file.
  The v1 runner supports READ, RUN, APPLY_PATCH and REPORT blocks.

Flags:
  --dry-run   Parse and validate the task. Skip RUN and APPLY_PATCH execution.
  --explain   Print planned operations as a tree. No execution, no logging.
  -h, --help  Show this help.

Supported blocks:
  ## GOAL
  ## ALLOWED_CHANGES
  ## READ
  ## RUN
  ## APPLY_PATCH
  ## REPORT

Safety:
  - Rejects absolute paths and paths containing "..".
  - Rejects paths outside the repository root.
  - Restricts log path to tmp/ or output/.
  - Executes RUN commands with shell: false, rejects shell metacharacters.
  - Enforces allowlist of command prefixes.
  - Rejects mode: read tasks that declare APPLY_PATCH.
  - Does not commit, push, install or delete files.
  - Logs incrementally to the configured log file.
`.trim();

const ALLOWED_RUN_PREFIXES = [
  "npm --prefix scripts run pre-run",
  "npm --prefix scripts run validate",
    "npm --prefix scripts run apply-patch",
  "npm --prefix scripts run bootstrap-template-theme",
  "git status --short",
  "git diff --",
];

const FORBIDDEN_METACHARS = [
  ";",
  "|",
  "&",
  "$",
  "(",
  ")",
  "<",
  ">",
  "`",
  '"',
  "'",
  "\\",
  "\n",
  "\r",
  "\t",
];

const ALLOWED_LOG_PREFIXES = ["tmp/", "output/"];

const KNOWN_BLOCKS = new Set([
  "GOAL",
  "ALLOWED_CHANGES",
  "READ",
  "RUN",
  "APPLY_PATCH",
  "REPORT",
]);

const REQUIRED_BLOCKS = ["GOAL", "REPORT"];

class TaskError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "TaskError";
    this.details = details;
  }
}

function normalizeSlashes(value) {
  return value.replaceAll("\\", "/");
}

function isUnsafeRelativePath(input) {
  if (!input || typeof input !== "string") return true;
  if (input.includes("\\")) return true;
  if (path.isAbsolute(input)) return true;

  const normalized = path.posix.normalize(input);
  if (normalized.startsWith("/")) return true;

  const parts = normalized.split("/");
  return parts.includes("..");
}

function resolveRepoPath(input, label = "path") {
  const trimmed = String(input || "").trim();

  if (isUnsafeRelativePath(trimmed)) {
    throw new TaskError(`Unsafe ${label}`, [
      "Path must be relative to the repository root.",
      "Path must not be absolute.",
      "Path must not contain '..' segments.",
      "Path must not contain backslashes.",
    ]);
  }

  const resolved = path.resolve(repoRoot, trimmed);
  const relative = path.relative(repoRoot, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new TaskError(`Path escapes repository root: ${trimmed}`);
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

  const flags = { dryRun: false, explain: false };
  const positional = [];

  for (const arg of args) {
    if (arg === "--dry-run") {
      flags.dryRun = true;
      continue;
    }
    if (arg === "--explain") {
      flags.explain = true;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new TaskError(`Unknown flag: ${arg}`);
    }
    positional.push(arg);
  }

  if (positional.length > 1) {
    throw new TaskError("Expected zero or one task markdown file.", [
      "Default: npm --prefix scripts run task",
      "Explicit: npm --prefix scripts run task -- tmp/prompt.md",
    ]);
  }

  return {
    taskFile: positional[0] || "tmp/prompt.md",
    dryRun: flags.dryRun,
    explain: flags.explain,
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

    if (Object.prototype.hasOwnProperty.call(metadata, key)) {
      throw new TaskError(`Duplicate metadata key: ${key}`);
    }

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

    if (blocks.has(name)) {
      throw new TaskError(`Duplicate block: ## ${name}`);
    }

    if (!KNOWN_BLOCKS.has(name)) {
      throw new TaskError(`Unknown block: ## ${name}`, [
        `Known blocks: ${[...KNOWN_BLOCKS].join(", ")}`,
      ]);
    }

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
    .map((line) => line.replace(/^[-*+]\s*/, "").trim())
    .filter((line) => !/^-{2,}$/.test(line))
    .filter(Boolean);
}

function parseBoolean(value, fieldName) {
  if (value === "true") return true;
  if (value === "false") return false;

  throw new TaskError(`Invalid boolean value for ${fieldName}`, [
    "Expected true or false.",
    `Received: ${value}`,
  ]);
}

function parseApplyPatchBlock(content) {
  if (!content) return [];

  const ALLOWED_KEYS = new Set(["file", "dry_run", "dryRun", "force"]);
  const entries = [];
  const lines = content.split(/\r?\n/);

  let current = null;

  function pushCurrent() {
    if (!current) return;
    if (!current.file) {
      throw new TaskError("Malformed APPLY_PATCH entry", [
        "Missing required field: file",
      ]);
    }

    entries.push({
      file: current.file,
      dryRun: parseBoolean(
        current.dry_run ?? current.dryRun ?? "false",
        "dry_run",
      ),
      force: parseBoolean(current.force ?? "false", "force"),
    });
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      throw new TaskError("Malformed APPLY_PATCH line", [`Line: ${rawLine}`]);
    }

    const key = match[1].trim();
    const value = match[2].trim();

    if (!ALLOWED_KEYS.has(key)) {
      throw new TaskError(`Unknown APPLY_PATCH field: ${key}`, [
        `Allowed fields: file, dry_run, force`,
        `Line: ${rawLine}`,
      ]);
    }

    if (key === "file") {
      pushCurrent();
      current = { file: value };
      continue;
    }

    if (!current) {
      throw new TaskError("Malformed APPLY_PATCH block", [
        "The first field of each entry must be 'file'.",
        `Line: ${rawLine}`,
      ]);
    }

    if (Object.prototype.hasOwnProperty.call(current, key)) {
      throw new TaskError(`Duplicate APPLY_PATCH field: ${key}`, [
        `Line: ${rawLine}`,
      ]);
    }

    current[key] = value;
  }

  pushCurrent();

  return entries;
}

function validateRequiredTaskShape(raw, metadata, blocks) {
  if (!raw.trimStart().startsWith("# COFE TASK")) {
    throw new TaskError("Invalid task file", [
      "Expected first heading: # COFE TASK",
    ]);
  }

  for (const requiredKey of ["id", "mode", "log"]) {
    const value = metadata[requiredKey];
    if (value === undefined || value === "") {
      throw new TaskError(
        `Task metadata is missing or empty: ${requiredKey}`,
      );
    }
  }

  if (!["read", "write"].includes(metadata.mode)) {
    throw new TaskError("Invalid task mode", [
      "Expected: read or write",
      `Received: ${metadata.mode}`,
    ]);
  }

  for (const requiredBlock of REQUIRED_BLOCKS) {
    if (!blocks.has(requiredBlock)) {
      throw new TaskError(`Task is missing required block: ## ${requiredBlock}`);
    }
  }

  if (metadata.mode === "read" && blocks.has("APPLY_PATCH")) {
    const content = blocks.get("APPLY_PATCH") || "";
    if (content.trim().length > 0) {
      throw new TaskError(
        "Task with mode: read cannot contain APPLY_PATCH operations",
        [
          "Set mode: write or remove the APPLY_PATCH block.",
        ],
      );
    }
  }
}

function validateLogPath(logRelative) {
  const normalized = normalizeSlashes(logRelative);
  const allowed = ALLOWED_LOG_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix),
  );
  if (!allowed) {
    throw new TaskError(`Log path must live under tmp/ or output/`, [
      `Received: ${normalized}`,
    ]);
  }
}

function validateAllowedChanges(paths, logRelativePath) {
  const allowedSet = new Set();

  for (const allowedPath of paths) {
    resolveRepoPath(allowedPath, "allowed change path");
    allowedSet.add(normalizeSlashes(path.posix.normalize(allowedPath)));
  }

  allowedSet.add(normalizeSlashes(path.posix.normalize(logRelativePath)));

  return allowedSet;
}

function ensurePathAllowed(relativePath, allowedSet, label) {
  const normalized = normalizeSlashes(path.posix.normalize(relativePath));

  if (!allowedSet.has(normalized)) {
    throw new TaskError(`${label} is not listed in ALLOWED_CHANGES`, [
      `Path: ${normalized}`,
      "Add the path to ALLOWED_CHANGES or remove the operation.",
    ]);
  }
}

function tokenizeCommand(command) {
  const trimmed = command.trim();

  for (const meta of FORBIDDEN_METACHARS) {
    if (trimmed.includes(meta)) {
      const printable = meta === "\n" ? "\\n" : meta === "\t" ? "\\t" : meta;
      throw new TaskError("RUN command contains forbidden metacharacter", [
        `Character: ${printable}`,
        `Command: ${trimmed}`,
      ]);
    }
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    throw new TaskError("Empty RUN command");
  }

  return tokens;
}

function isRecursiveTaskCommand(trimmed) {
  return trimmed.startsWith("npm --prefix scripts run task");
}

function validateRunCommand(command) {
  const trimmed = command.trim();
  const tokens = tokenizeCommand(trimmed);

  if (isRecursiveTaskCommand(trimmed)) {
    return {
      command: trimmed,
      tokens,
      skip: true,
      skipReason: "Skipped recursive task invocation.",
    };
  }

  const allowed = ALLOWED_RUN_PREFIXES.some((prefix) => {
    const prefixTokens = prefix.split(/\s+/);
    if (tokens.length < prefixTokens.length) return false;
    return prefixTokens.every((part, i) => tokens[i] === part);
  });

  if (!allowed) {
    throw new TaskError("RUN command is not allowlisted", [
      `Command: ${trimmed}`,
      "Allowed prefixes:",
      ...ALLOWED_RUN_PREFIXES,
    ]);
  }

  if (tokens[0] === "rm") {
    throw new TaskError("RUN command contains forbidden delete operation", [
      `Command: ${trimmed}`,
    ]);
  }

  if (
    tokens[0] === "npm" &&
    (tokens.includes("install") || tokens.includes("i"))
  ) {
    throw new TaskError("RUN command contains forbidden install operation", [
      `Command: ${trimmed}`,
    ]);
  }

  if (tokens[0] === "git" && (tokens[1] === "commit" || tokens[1] === "push")) {
    throw new TaskError(
      "RUN command contains forbidden git commit/push operation",
      [`Command: ${trimmed}`],
    );
  }

  return { command: trimmed, tokens, skip: false, skipReason: "" };
}

function shell(tokens) {
  const [binary, ...rest] = tokens;
  return spawnSync(binary, rest, {
    cwd: repoRoot,
    shell: false,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 10,
  });
}

function summarizeOutput(output, maxLines = 40) {
  const lines = String(output || "").split(/\r?\n/);

  if (lines.length <= maxLines * 2) return lines.join("\n");

  return [
    ...lines.slice(0, maxLines),
    `... output truncated, ${lines.length - maxLines * 2} more lines ...`,
    ...lines.slice(-maxLines),
  ].join("\n");
}

function describeSpawnError(result) {
  if (result.error) {
    return `${result.error.code || "ERROR"}: ${result.error.message}`;
  }
  if (result.status === null && result.signal) {
    return `Process terminated by signal: ${result.signal}`;
  }
  return null;
}

function extractPatchTargets(protocolRelativePath) {
  const protocolPath = resolveRepoPath(
    protocolRelativePath,
    "apply-patch protocol path",
  );

  if (!fs.existsSync(protocolPath)) {
    throw new TaskError("APPLY_PATCH protocol file does not exist", [
      `Path: ${protocolRelativePath}`,
    ]);
  }

  const raw = readText(protocolPath);
  const seen = new Set();
  const targets = [];

  const regex = /^\[CHANGE-FILE:\s*([^\]]+?)\s*\]\s*$/gm;
  for (const match of raw.matchAll(regex)) {
    const normalized = normalizeSlashes(path.posix.normalize(match[1].trim()));
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    targets.push(normalized);
  }

  return targets;
}

function runApplyPatch(entry, allowedChanges, logPath) {
  resolveRepoPath(entry.file, "apply-patch protocol file");

  ensurePathAllowed(entry.file, allowedChanges, "APPLY_PATCH protocol file");

  const patchTargets = extractPatchTargets(entry.file);

  for (const target of patchTargets) {
    resolveRepoPath(target, "apply-patch target path");
    ensurePathAllowed(target, allowedChanges, "APPLY_PATCH target file");
  }

  const tokens = ["npm", "--prefix", "scripts", "run", "apply-patch", "--", entry.file];
  if (entry.dryRun) tokens.push("--dry-run");
  if (entry.force) tokens.push("--force");
  const commandStr = tokens.join(" ");

  appendLog(logPath, `## APPLY_PATCH\ncommand: ${commandStr}`);

  const result = shell(tokens);

  const spawnError = describeSpawnError(result);
  if (spawnError) {
    appendLog(
      logPath,
      `## APPLY_PATCH ERROR\ncommand: ${commandStr}\nerror: ${spawnError}`,
    );
    throw new TaskError("APPLY_PATCH command failed to spawn", [
      `Command: ${commandStr}`,
      spawnError,
    ]);
  }

  const logLines = [
    "## APPLY_PATCH RESULT",
    `command: ${commandStr}`,
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
    throw new TaskError("APPLY_PATCH command exited with non-zero status", [
      `Command: ${commandStr}`,
      `Exit code: ${result.status}`,
    ]);
  }

  return {
    command: commandStr,
    exitCode: result.status,
  };
}

function buildReport(summary, reportItems, status, errorMessage = null) {
  const lines = [
    "# COFE TASK REPORT",
    "",
    `status: ${status}`,
    `task_file: ${summary.taskFile}`,
    `id: ${summary.id}`,
    `mode: ${summary.mode}`,
    `log: ${summary.log}`,
    `dry_run: ${summary.dryRun ? "true" : "false"}`,
  ];

  if (errorMessage) {
    lines.push("", `error: ${errorMessage}`);
  }

  lines.push(
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
    ...(reportItems.length
      ? reportItems.map((item) => `- ${item}`)
      : ["- none"]),
    "",
    `finished_at: ${nowIso()}`,
  );

  return lines.join("\n");
}

function explainPlan(metadata, blocks, parsed) {
  const lines = [];
  lines.push("# COFE TASK PLAN (explain)");
  lines.push("");
  lines.push(`task_file: ${parsed.taskFileRelative}`);
  lines.push(`id: ${metadata.id}`);
  lines.push(`mode: ${metadata.mode}`);
  lines.push(`log: ${parsed.logRelative}`);
  lines.push("");
  lines.push("allowed_changes:");
  if (parsed.allowedChanges.length === 0) {
    lines.push("  - none");
  } else {
    for (const entry of parsed.allowedChanges) lines.push(`  - ${entry}`);
  }
  lines.push("");
  lines.push("read:");
  if (parsed.readFiles.length === 0) {
    lines.push("  - none");
  } else {
    for (const entry of parsed.readFiles) lines.push(`  - ${entry}`);
  }
  lines.push("");
  lines.push("run:");
  if (parsed.runCommands.length === 0) {
    lines.push("  - none");
  } else {
    for (const entry of parsed.runCommands) lines.push(`  - ${entry}`);
  }
  lines.push("");
  lines.push("apply_patch:");
  if (parsed.applyPatchEntries.length === 0) {
    lines.push("  - none");
  } else {
    for (const entry of parsed.applyPatchEntries) {
      lines.push(
        `  - file=${entry.file} dry_run=${entry.dryRun} force=${entry.force}`,
      );
    }
  }
  lines.push("");
  lines.push("requested_report_items:");
  if (parsed.reportItems.length === 0) {
    lines.push("  - none");
  } else {
    for (const entry of parsed.reportItems) lines.push(`  - ${entry}`);
  }

  return lines.join("\n");
}

function emitFailure(summary, reportItems, error, logPath) {
  const message = error instanceof Error ? error.message : String(error);
  const details = error instanceof TaskError ? error.details : [];

  const failureBlock = [
    "## TASK FAILED",
    `error: ${message}`,
    ...(details.length ? ["details:", ...details.map((d) => `- ${d}`)] : []),
    `finished_at: ${nowIso()}`,
  ].join("\n");

  if (logPath) {
    try {
      appendLog(logPath, failureBlock);
    } catch {
      // ignore logging failure on top of the original error
    }
  }

  const report = buildReport(summary, reportItems, "failed", message);
  console.error(report);
  if (details.length > 0) {
    console.error("");
    console.error("details:");
    for (const detail of details) console.error(`- ${detail}`);
  }
  process.exit(1);
}

function main() {
  let summary = {
    taskFile: "",
    id: "",
    mode: "",
    log: "",
    dryRun: false,
    filesRead: [],
    runCommands: [],
    applyPatch: [],
    warnings: [],
  };
  let reportItems = [];
  let logPath = null;

  try {
    const { taskFile, dryRun, explain } = parseArgs(process.argv.slice(2));

    if (!taskFile.endsWith(".md")) {
      throw new TaskError("Task file must end with .md", [
        `Received: ${taskFile}`,
      ]);
    }

    const taskPath = resolveRepoPath(taskFile, "task file");

    if (!fs.existsSync(taskPath)) {
      throw new TaskError("Task file does not exist", [`Path: ${taskFile}`]);
    }

    const taskFileRelative = normalizeSlashes(path.relative(repoRoot, taskPath));
    const raw = readText(taskPath);
    const metadata = parseMetadata(raw);
    const blocks = parseBlocks(raw);

    validateRequiredTaskShape(raw, metadata, blocks);

    const logResolved = resolveRepoPath(metadata.log, "log path");
    const logRelative = normalizeSlashes(path.relative(repoRoot, logResolved));
    validateLogPath(logRelative);

    const allowedChanges = parseListBlock(blocks.get("ALLOWED_CHANGES") || "");
    const allowedSet = validateAllowedChanges(allowedChanges, logRelative);

    const readFiles = parseListBlock(blocks.get("READ") || "");
    const runCommands = parseListBlock(blocks.get("RUN") || "");
    const applyPatchEntries = parseApplyPatchBlock(
      blocks.get("APPLY_PATCH") || "",
    );
    reportItems = parseListBlock(blocks.get("REPORT") || "");

    summary = {
      taskFile: taskFileRelative,
      id: metadata.id,
      mode: metadata.mode,
      log: logRelative,
      dryRun,
      filesRead: [],
      runCommands: [],
      applyPatch: [],
      warnings: [],
    };

    if (explain) {
      console.log(
        explainPlan(metadata, blocks, {
          taskFileRelative,
          logRelative,
          allowedChanges,
          readFiles,
          runCommands,
          applyPatchEntries,
          reportItems,
        }),
      );
      return;
    }

    logPath = logResolved;

    const startBlock = [
      "# COFE TASK EXEC LOG",
      `started_at: ${nowIso()}`,
      `task_file: ${taskFileRelative}`,
      `id: ${metadata.id}`,
      `mode: ${metadata.mode}`,
      `log: ${logRelative}`,
      `dry_run: ${dryRun ? "true" : "false"}`,
    ].join("\n");
    appendLog(logPath, startBlock);

    for (const readFile of readFiles) {
      const readPath = resolveRepoPath(readFile, "READ file");

      if (!fs.existsSync(readPath)) {
        throw new TaskError("READ file does not exist", [`Path: ${readFile}`]);
      }

      const stat = fs.statSync(readPath);

      if (!stat.isFile()) {
        throw new TaskError("READ path is not a file", [`Path: ${readFile}`]);
      }

      summary.filesRead.push(normalizeSlashes(readFile));

      appendLog(
        logPath,
        ["## READ", `file: ${readFile}`, `size_bytes: ${stat.size}`].join("\n"),
      );
    }

    for (const command of runCommands) {
      const validation = validateRunCommand(command);

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

      if (dryRun) {
        summary.warnings.push(`Dry-run: skipped RUN ${validation.command}`);
        appendLog(
          logPath,
          [
            "## RUN SKIPPED (dry-run)",
            `command: ${validation.command}`,
          ].join("\n"),
        );
        continue;
      }

      appendLog(
        logPath,
        ["## RUN", `command: ${validation.command}`].join("\n"),
      );

      const result = shell(validation.tokens);

      const spawnError = describeSpawnError(result);
      if (spawnError) {
        appendLog(
          logPath,
          [
            "## RUN ERROR",
            `command: ${validation.command}`,
            `error: ${spawnError}`,
          ].join("\n"),
        );
        throw new TaskError("RUN command failed to spawn", [
          `Command: ${validation.command}`,
          spawnError,
        ]);
      }

      summary.runCommands.push({
        command: validation.command,
        exitCode: result.status,
      });

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
        throw new TaskError("RUN command exited with non-zero status", [
          `Command: ${validation.command}`,
          `Exit code: ${result.status}`,
        ]);
      }
    }

    for (const entry of applyPatchEntries) {
      if (dryRun) {
        summary.warnings.push(`Dry-run: skipped APPLY_PATCH ${entry.file}`);
        appendLog(
          logPath,
          [
            "## APPLY_PATCH SKIPPED (dry-run)",
            `file: ${entry.file}`,
          ].join("\n"),
        );
        continue;
      }

      const result = runApplyPatch(entry, allowedSet, logPath);
      summary.applyPatch.push({
        file: entry.file,
        dryRun: entry.dryRun,
        force: entry.force,
        exitCode: result.exitCode,
      });
    }

    const finalReport = buildReport(summary, reportItems, "success");
    appendLog(logPath, finalReport);
    console.log(finalReport);
  } catch (error) {
    emitFailure(summary, reportItems, error, logPath);
  }
}

main();
