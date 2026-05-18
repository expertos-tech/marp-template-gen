# COFE TASK

id: cofe-cmd-clean-prompt
mode: read
log: tmp/cofe-cmds/clean-prompt.log

## GOAL

Placeholder reusable file for the `*clean-prompt` shortcut described in
[`docs/cmd-details-n-params.md`](../docs/cmd-details-n-params.md).

The intended behavior is to reset `tmp/prompt.md` to the canonical
prompt template, with a confirmation menu unless `--silent` is passed.
The full overwrite of an arbitrarily edited file is not safely
expressible through the COFE Patch Protocol today: `create-file` fails
when the target exists, and `replace-block`, `replace-text` and
`replace-regex` all require unique anchors against the actual current
content of `tmp/prompt.md`.

Because of that, this file currently runs only a read-only diagnostic.
When the prompt is already at the canonical template (or has been
trimmed to a unique anchor), the operator can apply the companion patch
file manually with:

```bash
npm --prefix scripts run apply-patch -- cofe-cmds/clean-prompt.patch.md
```

In the more general case the agent should fall back to the inline
behavior documented in
[`docs/cmd-details-n-params.md`](../docs/cmd-details-n-params.md) under
the `*clean-prompt` block, asking for confirmation per the numbered
menu before rewriting `tmp/prompt.md`.

The clean-prompt patch (`cofe-cmds/clean-prompt.patch.md`) is shipped
as a reviewable template; it is not invoked automatically by this task
because parameter passing (for example `--silent`) is not yet supported
by reusable COFE files and would require user confirmation anyway.

## ALLOWED_CHANGES

## READ

- AGENTS.md
- docs/cmd-details-n-params.md
- cofe-cmds/clean-prompt.patch.md

## RUN

- npm --prefix scripts run pre-run
- git status --short

## REPORT

- Confirm the scripts environment is installed.
- Report that this reusable file is a placeholder and that
  `*clean-prompt` has not been delegated automatically yet.
- Note whether `tmp/prompt.md` is present locally (via `git status`).
- Recommend the next implementation step: introduce parameter passing
  for reusable COFE files, or a dedicated npm script for prompt reset,
  and wire `*clean-prompt` to delegate accordingly.
