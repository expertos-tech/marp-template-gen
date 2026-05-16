# MTG Patch Protocol - E2E Plan

## Objective

Create a protocol between ChatGPT Web and a local agent to apply changes to the Marp Template Gen project in a secure, reproducible, and auditable manner.

The flow should allow:

1. ChatGPT Web to generate structured instructions.
2. The user to copy instructions to the local agent.
3. The local agent to execute tasks in the repository.
4. Node scripts to validate and apply changes when necessary.
5. The local agent to return a complete report to ChatGPT Web.
6. ChatGPT Web to continue guidance based on the actual result.

## Project Context

Project: Marp Template Gen.

Project Objective:

- generate Marp presentations from Markdown;
- maintain versioned templates;
- use Node scripts;
- generate self-contained Marp Markdown;
- validate changes before completing;
- preserve repository security.

## Decisions already made

### Protocol name

MTG Patch Protocol.

### Planned chat command

`*apply-patch <file.md> [--dry-run] [--force]`

### Classification

Internal command.

It must not appear in standard `*help`.

It must appear only in:

- `*help --all`
- `*help internal-commands`
- `*help *apply-patch`

### Planned Node script

`scripts/apply-patch-protocol.mjs`

### Planned npm command

`npm --prefix scripts run apply-patch -- <file.md> [--dry-run] [--force]`

### Planned documentation

Create:

- `docs/mtg-patch-protocol.md`

Modify:

- `AGENTS.md`
- `scripts/README.md`

Do not modify in this step:

- `README.md`
- `scripts/package.json`

`README.md` should only be modified in the future if `*apply-patch` becomes a public flow for the user.

## Command behavior

### Default

Without flags, the command saves changes.

Before saving, it must:

1. validate protocol;
2. validate paths;
3. validate Git state;
4. require clean working tree;
5. block dangerous operations;
6. create temporary branch;
7. apply changes;
8. generate textual report.

### `--dry-run`

Serves to validate and simulate.

Rules:

- does not save files;
- does not mandatorily create a branch;
- validates syntax;
- validates paths;
- shows plan or predicted diff;
- lists recommended validation commands.

### `--force`

Ignores only the clean working tree validation.

Does not ignore:

- absolute path;
- path traversal with `..`;
- writing outside repository root;
- invalid protocol;
- unknown operation;
- conflict;
- merge in progress;
- rebase in progress;
- cherry-pick in progress;
- revert in progress;
- `create-file` trying to overwrite existing file.

With `--force`, the report must highlight that execution was forced.

## Git and security

### Clean Git rule

Without `--dry-run` and without `--force`, the executor must block if there is any pending issue in Git.

Block when there are:

- modified files;
- staged files;
- untracked files;
- deleted files;
- conflict;
- merge in progress;
- rebase in progress;
- cherry-pick in progress;
- revert in progress.

### Temporary branch

Every execution that saves changes must create a temporary branch before modifying files.

Suggested format:

`tmp/mtg-patch/<id>`

If the protocol has an `id`, use that sanitized identifier.

If it does not have one, generate a short identifier based on date/time.

## Executor security rules

The executor must:

- only accept paths relative to the repository;
- block absolute paths;
- block `..`;
- block writing outside project root;
- fail if target file does not exist, except in `create-file`;
- fail if `create-file` tries to overwrite existing file;
- not execute shell commands contained in protocol in v1;
- only list recommended validation commands;
- generate textual report to paste in chat.

Destructive operations are not in v1.

Do not implement in v1:

- delete-file;
- move-file;
- automatic shell commands;
- broad regex without boundary;
- changes outside repository.

## Planned operations for v1

- `insert-before`
- `insert-after`
- `insert-after-line`
- `append-file`
- `create-file`

Possible future operations:

- `replace-block`
- `replace-between-markers`

## General protocol format

Base example:

[CHANGE-FILE: relative/path.md]

```mtg-patch
operation: insert-after
anchor:
  existing text
content:
  new line
  another line
```

Recommended validations can be listed in the protocol, but must not be executed automatically in v1.

## Expected report

Format:

```text
MTG PATCH REPORT

status: dry-run-ok | write-ok | write-ok-forced | blocked | failed
protocol: path/to/protocol.md
branch: branch-name-or-n/a
tasks: number
files_changed: number
files_created: number
blocked: number

changes:
- file
  - operation
  - summary

warnings:
- warning when existing

validation_commands:
- recommended command

notes:
- observations
```

## Default prompt for local agents

All prompts must use the structure:

```markdown
# OVERVIEW

* Execute all instructions contained in this file.
* If there is no contrary instruction below, always plan and execute in waves.
* Execute only what is explicitly requested.
* Display a summary at the end of everything that was done.

---

# CONTEXT

<!-- context -->

---

# INSTRUCTIONS

<!-- instructions -->
```

## Mandatory log rule

Every operational prompt must include:

```text
* MANDATORY: Every discovery, decision, warning, error, executed command, relevant command output, and partial result must be displayed on screen and also immediately registered in `./tmp/exec-log.md`.
* The log must be incremental: append content to the end of the file, without deleting previous records of the same execution.
* If `./tmp/exec-log.md` does not exist, create the file.
* Do not register secrets, tokens, credentials, `.env` content, or sensitive information.
* Do not dump huge logs unnecessarily: register summarized outputs, relevant excerpts, and file paths.
* At the end, generate a complete summary based on the log, display this summary on screen, and append the same summary to the end of `./tmp/exec-log.md`.
```

## Files always allowed in operational prompts

* `tmp/exec-log.md`
* `tmp/**`

## Expected permissions for local agents

The CLI can:

* execute read commands inside the project when necessary;
* edit, create, and update files inside `tmp/`;
* modify files outside `tmp/` only when listed in "Files allowed for modification".

The CLI cannot:

* delete files;
* execute destructive commands;
* execute commands outside the allowed list;
* modify files outside the allowed list.

## Copilot CLI

Copilot CLI is preferable to Gemini CLI for this task.

Practical decision:

* use shorter and more objective prompts;
* keep allowed files;
* keep allowed commands;
* keep mandatory log;
* do not depend on global configuration yet;
* review `git diff` at the end.

Permissions can be handled later.

## Prompt 1, already executed

Result of Prompt 1:

* `*apply-patch` must be documented in `AGENTS.md`, sections 8.2 and 8.3;
* if internal command, adjust visibility rule in `*help`;
* `scripts/README.md` must document npm command;
* `README.md` only enters if command becomes public use;
* current Node scripts use entry via `scripts/package.json` pointing to `.mjs`;
* each command has its own script;
* `scripts/lib.mjs` has reusable helpers;
* `validate-target.mjs` can be reference for validation;
* no change was made.

## Prompt 2, next step

Objective:

* create `docs/mtg-patch-protocol.md`;
* document `*apply-patch` in `AGENTS.md` as internal command;
* document planned npm command in `scripts/README.md`;
* create/update `tmp/exec-log.md`;
* do not implement Node script;
* do not modify `package.json`;
* do not modify `README.md`.

## To-do / Pending

1. Execute Prompt 2 in Copilot.
2. Review diff.
3. Adjust documentation if necessary.
4. Only then create Prompt 3 to implement `scripts/apply-patch-protocol.mjs`.
5. Then test in `tmp/`.

## Validation result

Status: validated E2E.

Validated on branch: developer

Implementation commit:

- `3b8d56ec7675b230bc9aec718e56a94e0ffcab9b`
  - `feat(scripts): implement mtg patch protocol v1 executor`

Checks completed:

- `npm --prefix scripts run pre-run`
- `npm --prefix scripts run apply-patch -- --help`
- controlled `--dry-run` test in `tmp/`
- real write test in `tmp/` without `--force`
- temporary branch creation confirmed
- `[VALIDATE]` commands listed but not executed
- returned to `developer`
- final Git status clean

Known note:

- Test files were kept under `tmp/`, so they did not leave tracked repository changes.
