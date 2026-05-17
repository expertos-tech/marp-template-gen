# COFE TASK

id: cofe-cmd-status-check
mode: read
log: tmp/cofe-cmds/status-check.log

## GOAL

Quick read-only diagnostic of the local repository state. Runs the
scripts pre-run guard and prints a short `git status`. Useful before
starting a new work session or before generating a COFE Patch file.

## ALLOWED_CHANGES

## READ

- AGENTS.md

## RUN

- npm --prefix scripts run pre-run
- git status --short

## REPORT

- Confirm the scripts environment is installed.
- List any local modifications reported by git status.
