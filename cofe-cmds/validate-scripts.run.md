# COFE TASK

id: cofe-cmd-validate-scripts
mode: read
log: tmp/cofe-cmds/validate-scripts.log

## GOAL

Run the full `scripts/` validation suite to confirm that the Node tooling
is healthy. Executes `pre-run`, `apply-patch --help`, `test:apply-patch`
and `test:run-task` in sequence. This task is read-only and does not
modify any file.

## ALLOWED_CHANGES

## READ

- scripts/package.json

## RUN

- npm --prefix scripts run validate

## REPORT

- Confirm that all four validation steps exited with code zero.
- Confirm the total number of passing tests reported by the suite.
