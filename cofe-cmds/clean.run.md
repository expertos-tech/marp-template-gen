# COFE TASK

id: cofe-cmd-clean
mode: read
log: tmp/cofe-cmds/clean.log

## GOAL

Placeholder reusable file for the `*clean` shortcut described in
[`docs/cmd-details-n-params.md`](../docs/cmd-details-n-params.md).

The intended behavior is to delete every file inside `tmp/`, optionally
preserving `tmp/prompt.md`, with a confirmation menu unless `--silent`
is passed. That behavior is not safely expressible through the current
COFE Task runner: the allowlist in `scripts/run-task.mjs` does not
permit `rm` or any generic file-deletion command, and the COFE Patch
Protocol has no `delete-file` operation.

Until a narrow npm script (for example `npm --prefix scripts run
clean-tmp`) and a matching allowlist entry are introduced, this file
runs only a read-only diagnostic so that the slot is reserved and the
limitation is reviewable. The actual destructive cleanup must keep
following the inline rules documented in
[`docs/cmd-details-n-params.md`](../docs/cmd-details-n-params.md) under
the `*clean` block, with the agent asking for confirmation per the
numbered menu.

## ALLOWED_CHANGES

## READ

- AGENTS.md
- docs/cmd-details-n-params.md

## RUN

- npm --prefix scripts run pre-run
- git status --short

## REPORT

- Confirm the scripts environment is installed.
- Report that this reusable file is a placeholder and that the
  destructive `*clean` behavior has not been delegated yet.
- List any local modifications reported by `git status --short` so the
  caller can decide whether running `*clean` manually is safe.
- Recommend the next implementation step: add a dedicated npm script
  for tmp cleanup and extend the runner allowlist accordingly.
