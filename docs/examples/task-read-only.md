# COFE TASK

id: example-read-only
mode: read
log: tmp/example-read-only.log

## GOAL

Read a few project files and run two safe diagnostics commands.
This example does not change any file.

## ALLOWED_CHANGES

## READ

- AGENTS.md
- README.md
- scripts/run-task.mjs

## RUN

- npm --prefix scripts run pre-run
- git status --short

## REPORT

- Confirm that the runner read the listed files.
- Confirm that diagnostics commands exited with code zero.
