# COFE Commands Directory

This directory contains reusable command templates for the COFE Protocol (Command Orchestration and File Editing Protocol).

COFE is a generic Web UI LLM <> Local CLI Agent communication protocol based on reviewable Markdown files.

## Purpose

Commands in this directory are:
- Task files (`.run.md`) that follow the COFE Task Protocol and are executed by `npm --prefix scripts run task -- <file>`.
- Patch files (`.patch.md`) that follow the COFE Patch Protocol and are applied by `npm --prefix scripts run apply-patch -- <file>`.

These are meant to be referenced and instantiated by agents and Web UI workflows to automate common operations.

## Available Templates

### Task templates (`.run.md`)

| File | Mode | Purpose | Ready to run as-is |
|------|------|---------|--------------------|
| [`validate-scripts.run.md`](./validate-scripts.run.md) | read | Run the full `scripts/` validation suite (pre-run + apply-patch help + both test files). | Yes |
| [`status-check.run.md`](./status-check.run.md) | read | Quick local diagnostic: `pre-run` plus `git status --short`. | Yes |
| [`apply-patch-dry-run.run.md`](./apply-patch-dry-run.run.md) | write | Wrapper to validate and simulate a COFE Patch file. Edit `ALLOWED_CHANGES` and `APPLY_PATCH` blocks before running. | No (template) |

### Patch templates (`.patch.md`)

| File | Operation | Purpose |
|------|-----------|---------|
| [`create-file.patch.md`](./create-file.patch.md) | `create-file` | Create a brand new file. Fails if the target already exists. |
| [`append-to-doc.patch.md`](./append-to-doc.patch.md) | `append-file` | Append content to the end of an existing file. Creates the target when missing. |
| [`replace-block-in-doc.patch.md`](./replace-block-in-doc.patch.md) | `replace-block` | Replace a contiguous range between two unique anchors. |

## How to Use

### Run a task template directly

```bash
npm --prefix scripts run task -- cofe-cmds/validate-scripts.run.md
```

The runner validates structure, executes the allowed `RUN` commands and prints a `COFE TASK REPORT`.

### Apply a patch template

Patch templates are starting points: copy the file, edit `[CHANGE-FILE: ...]` paths and operation bodies, then run:

```bash
# Always simulate first.
npm --prefix scripts run apply-patch -- tmp/my-patch.patch.md --dry-run

# Apply once the dry-run report looks correct.
npm --prefix scripts run apply-patch -- tmp/my-patch.patch.md
```

The executor requires a clean working tree by default and creates a temporary branch (`tmp/cofe-patch/YYYYMMDD-HHMMSS`) before writing.

### Combine task + patch

Use `apply-patch-dry-run.run.md` as a wrapper to drive an entire patch through the Task Protocol, with declarative `ALLOWED_CHANGES` enforcement on top of the patch executor's own safety checks.

## Reference

- [COFE Protocol Overview](../docs/cofe-protocol.md)
- [COFE Task Protocol](../docs/cofe-task-protocol.md)
- [COFE Patch Protocol](../docs/cofe-patch-protocol.md)
