# MTG TASK

id: example-apply-patch
mode: write
log: tmp/example-apply-patch.log

## GOAL

Apply a reviewable MTG Patch Protocol file in dry-run mode.
The patch protocol lives under `tmp/example-patch.md` and only
touches files declared below.

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
