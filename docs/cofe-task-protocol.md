# COFE Task Protocol

## 1. Protocol Objective

The COFE Task Protocol defines a reviewable Markdown format to describe and execute a constrained set of operations against the repository. The focus is to let an agent (in chat or locally) declare a task as a single Markdown file, validated and executed by a dedicated Node runner with deterministic behavior.

## 2. Flow chat -> local agent -> Node runner -> report

1. The agent writes a Markdown task file (default location: `tmp/prompt.md`).
2. The file is reviewed locally before execution.
3. The local agent calls:
   `npm --prefix scripts run task -- <file.md>`.
4. The runner validates structure, security, modes and allowlists.
5. The runner executes `READ`, `RUN` and `APPLY_PATCH` blocks, logging incrementally.
6. The runner prints a `COFE TASK REPORT` ready to paste into chat.

## 3. File shape

```md
# COFE TASK

id: <identifier>
mode: read | write
log: tmp/<file>.log

## GOAL

Free text describing the task purpose.

## ALLOWED_CHANGES

- relative/path/one.md
- relative/path/two.md

## READ

- relative/path/to/file.md

## RUN

- npm --prefix scripts run pre-run
- git status --short

## APPLY_PATCH

file: relative/path/to/protocol.md
dry_run: true
force: false

## REPORT

- One bullet per requested report item.
```

Parse rules:

- First heading must be `# COFE TASK`.
- Metadata lines appear before the first `## BLOCK`. Each line uses `key: value`.
- Blocks are introduced by `## NAME`. Names are case-insensitive but canonical names are uppercase.
- Duplicate blocks are rejected.
- `GOAL` and `REPORT` blocks are required.
- `READ`, `RUN` and `ALLOWED_CHANGES` blocks are bullet lists (`- value`).
- `APPLY_PATCH` is a list of entries. Each entry starts with `file: <path>` and optionally adds `dry_run: true|false` plus `force: true|false`, before the next `file:`.
- Unknown fields inside `APPLY_PATCH` entries cause the task to fail.
- `REPORT` is a bullet list copied verbatim into the final report.

Compatibility note: `scripts/run-task.mjs` also accepts `dryRun` for legacy files, but new files should use `dry_run`.

## 4. Required metadata

- `id` (non-empty): stable identifier for the task.
- `mode` (`read` or `write`): declares intent.
- `log` (non-empty, must live under `tmp/` or `output/`): path of the incremental log file.

Empty or missing required metadata fails fast.

## 5. Mode semantics

- `mode: read`: only `READ` and read-only `RUN` commands are allowed. `APPLY_PATCH` entries are rejected.
- `mode: write`: all supported blocks are allowed within their own rules.

## 6. RUN allowlist and blocklist

### 6.1 RUN semantics policy

COFE RUN is, by design, an **allowlist-bounded** execution channel. This is the default and only supported semantics in v1.

- **Default (Option A, safe allowlist):** the runner accepts only commands whose prefix appears in the allowlist defined below, with no shell interpolation. This is the recommended semantics for any consumer of COFE, including planned MCP integrations.
- **Deferred (Option B, general reviewable commands):** running arbitrary, human-reviewed shell commands protected by a temporary branch is intentionally **out of scope for v1**. If introduced in a future version, it must be an explicit opt-in mode (for example `mode: command`, `trust: reviewed`, or `unsafe_run: true`) and never the default. The current runner must reject such modes if encountered.

The rationale is to keep the protocol safe by default for Web UI LLM <> Local CLI Agent bridging, and to make any expansion of execution power a deliberate, named choice rather than a silent capability.

### 6.2 Allowlist and blocklist

Commands are tokenized by whitespace, the binary plus its first argument(s) are compared against an allowlist of prefixes, and metacharacters are rejected.

Allowed prefixes (v1):

- `npm --prefix scripts run pre-run`
- `npm --prefix scripts run validate`
- `npm --prefix scripts run apply-patch`
- `git status --short`
- `git diff --`

Rejected unconditionally:

- any metacharacter from `; | & $ ( ) < > \` `` ` `` `"` `'` `\` newline tab;
- any form of `rm`, `npm install`, `npm i`, `git commit`, `git push`;
- arguments containing `..` segments are not rejected by RUN itself, but `APPLY_PATCH` paths reject them.

Special case:

- commands beginning with `npm --prefix scripts run task` are skipped with a warning to avoid recursion.

Commands execute with `shell: false`. There is no shell interpolation.

## 7. APPLY_PATCH safety

For each `APPLY_PATCH` entry, the runner:

1. Validates that the protocol file path is safe and inside the repository.
2. Confirms the protocol file path appears in `ALLOWED_CHANGES`.
3. Extracts every `[CHANGE-FILE: ...]` from the protocol, normalizes the path, and confirms each target also appears in `ALLOWED_CHANGES`.
4. Builds the command `npm --prefix scripts run apply-patch -- <file> [--dry-run] [--force]` and executes it through the allowlisted channel.

The actual write semantics, branch creation and Git safety are owned by `docs/cofe-patch-protocol.md`.

## 8. ALLOWED_CHANGES

- Every path must be relative to the repository root.
- Absolute paths and `..` segments are rejected.
- Paths are normalized before comparison.
- The `log:` path is automatically added to the allowed set.

## 9. Logging

- The runner appends incrementally to `metadata.log`.
- The log path must be under `tmp/` or `output/`. Other locations are rejected.
- On failure, the log gets a final block `## TASK FAILED` with the reason, and the runner exits with non-zero status.

## 10. Output

The runner always prints a `COFE TASK REPORT` block to stdout, with:

- `status`: `success` or `failed`;
- `task_file`, `id`, `mode`, `log`;
- `files_read`, `run_commands`, `apply_patch`, `warnings`;
- `requested_report_items` (copied from `## REPORT`);
- `web_ui_handoff` (mechanical handoff guidance for paste-back);
- `finished_at` (UTC ISO timestamp).

Notes:

- The report is intended to be pasted back into the chat as-is. It is not a prompt to infer unreported actions.
- `requested_report_items` are copied verbatim from the task file and are not answers produced by the runner.

## 11. Flags

- `--dry-run`: parses and validates the task file but skips every `RUN` and `APPLY_PATCH` execution. The final report still prints, marked as `dry_run: true`.
- `--explain`: prints the planned operations as a tree and exits with status `0`. No execution, no logging.
- `--help`, `-h`: prints usage and exits.

## 12. Exit codes

- `0`: task completed successfully (including dry-run and explain).
- `1`: parse error, validation error, security error, or any `RUN` / `APPLY_PATCH` failure.

## 13. v1 limitations

- No conditional blocks.
- No environment variable interpolation.
- No shell pipelines or redirections.
- No parallel execution.
- No automatic retry.
- No installation of dependencies.
- No `git commit` or `git push`.

## 14. Examples

See:

- `docs/examples/task-read-only.md`
- `docs/examples/task-apply-patch.md`
- Reusable templates: [`cofe-cmds/`](../../cofe-cmds/README.md)

## Chat command and planned npm command

- Chat name: `*run [file.md]`
- npm command: `npm --prefix scripts run task -- <file.md>`
- Default file when omitted: `tmp/prompt.md`
- Runner implementation: `scripts/run-task.mjs`
