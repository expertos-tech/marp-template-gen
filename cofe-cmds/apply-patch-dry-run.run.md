# COFE TASK

id: cofe-cmd-apply-patch-dry-run
mode: write
log: tmp/cofe-cmds/apply-patch-dry-run.log

## GOAL

Reusable wrapper to validate and simulate a COFE Patch Protocol file
without saving any change to disk. Before running this template, edit
the `ALLOWED_CHANGES` block to list every file touched by the patch
and update the `APPLY_PATCH` block with the patch file path.

## ALLOWED_CHANGES

- tmp/example-patch.md
- tmp/example-target.md

## READ

- tmp/example-patch.md

## RUN

- npm --prefix scripts run pre-run

## APPLY_PATCH

file: tmp/example-patch.md
dry_run: true
force: false

## REPORT

- Confirm that the patch protocol parsed without errors.
- Confirm that the dry-run did not modify any file.
- List every operation that the patch would apply on a real run.
