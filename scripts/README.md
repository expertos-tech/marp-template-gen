# Scripts

This folder contains Node utilities to validate and prepare Markdown and Marp conversions.

## Conventions

- Use Node ESM with `"type": "module"` in `package.json`.
- Prefer `.mjs` for executable scripts.
- Use only native Node APIs while there is no real need for external dependencies.
- Run scripts via npm, using `npm --prefix scripts run <script> -- <args>`.
- Keep validations deterministic in scripts, not in the LLM.
- Reuse path and target validations with shared utilities (example: `validate-target.mjs`) to avoid differences between commands.
- Write clear error messages and set `process.exitCode = 1` or finish with non-zero code.
- Use `tmp/` for temporary test inputs and outputs.
- Do not save generated artifacts outside `tmp/`, `output/` or another explicitly informed destination.

## Installation

Before using the commands, run:

```bash
npm --prefix scripts install
```

The `postinstall` creates `scripts/.npm-installed`, used by `pre-run` as a local installation marker.

## Commands

```bash
npm --prefix scripts run pre-run
npm --prefix scripts run to-marp -- <model> <source> [target]
npm --prefix scripts run generate-slides -- <model> <source> [target]
npm --prefix scripts run embed-images -- <source.md> [target.md]
npm --prefix scripts run marp-export -- <type> <source.md> [target]
npm --prefix scripts run strip-instructions -- <source.md> [target.md]
npm --prefix scripts run apply-patch -- <file.md> [--dry-run] [--force]
npm --prefix scripts run task -- [file.md] [--dry-run] [--explain]
npm --prefix scripts run test:apply-patch
npm --prefix scripts run test:run-task
npm --prefix scripts run validate
```

## `pre-run`

Checks if `npm install` has already been run inside `scripts/`.

If the marker `scripts/.npm-installed` does not exist, the command fails and instructs to run:

```bash
npm --prefix scripts install
```

## `to-marp`

Validates arguments of the `*to-marp` shortcut, normalizes the model and resolves the final destination.

This command does not yet convert content alone. It prepares a deterministic output for the editorial conversion step done by the agent:

```text
MODEL=model-01
MODEL_DIR=/path/templates/model-01
SOURCE=/path/source.md
TARGET=/path/source-slides.md
```

## `generate-slides`

Generates a final Marp file from `model.md` and common Markdown:

- runs the `to-marp` validation flow;
- fills placeholders for cover, content and closing;
- embeds effective CSS in the `<style>{{EMBEDDED_MODEL_CSS}}</style>` block;
- runs `strip-instructions` automatically on the final file.
- runs `embed-images` automatically on the final file.

Command:

```bash
npm --prefix scripts run generate-slides -- <model> <source> [target]
```

## `embed-images`

Converts local images to `data:` URI base-64 in a Markdown file:

- converts `![alt](path)` and `<img src="path" ...>`;
- ignores `http://`, `https://` and `data:` references;
- supports `.png`, `.jpg`, `.jpeg`, `.webp` and `.svg`;
- if `target` is not provided, overwrites the source with safe writing.

Command:

```bash
npm --prefix scripts run embed-images -- <source.md> [target.md]
```

## `marp-export`

Exports a final Marp Markdown to artifacts via Marp CLI:

- supported types: `pdf`, `html`, `png`, `pptx`;
- validates minimum self-sufficiency of the `.md` (style block, no placeholders and no unembedded local image);
- resolves destination with the same path conventions as the `to-marp` flow, without extra suffix.

Destination rules:

- without `[target]`: generates in the same directory as `<source>` with the type extension (`.pdf`, `.html`, `.png`, `.pptx`);
- `[target]` as existing directory or ending with `/`: generates inside that directory with same base name as `<source>`;
- `[target]` as file: uses exactly that path and validates extension compatible with the `<type>`.

Command:

```bash
npm --prefix scripts run marp-export -- <type> <source.md> [target]
```

## `strip-instructions`

Removes instruction HTML comments from a filled Marp Markdown, preserving Marp class directives, such as:

```markdown
<!-- _class: cover -->
```

## `apply-patch`

Executes the MTG Patch Protocol v1 with deterministic validations of security and Git state:

```bash
npm --prefix scripts run apply-patch -- <file.md> [--dry-run] [--force]
```

Implemented scope:

- parse protocol blocks `[CHANGE-FILE: ...]` with `<cmd:...>`;
- support `insert-before`, `insert-after`, `insert-after-line`, `append-file`, `create-file` (v1);
- support `replace-block`, `remove-block`, `replace-text`, `replace-regex` (v1.1);
- validate paths and block writing outside the repository root;
- fail when text anchors have zero or multiple matches;
- use 1-based line numbers for `insert-after-line` and fail out of range;
- create file on `append-file` when target does not exist;
- fail on `create-file` when target already exists;
- require `confirm: true` for `remove-block`;
- reject regex flags and reject `replace-regex` patterns that do not match exactly once;
- apply all operations in memory first (all-or-nothing for operation failures);
- require a clean working tree by default for execution with saving, including untracked files;
- create temporary branch `tmp/mtg-patch/YYYYMMDD-HHMMSS` on execution with saving;
- simulate without saving when `--dry-run` is provided;
- accept `--force` only to ignore the clean working tree validation;
- do not execute shell commands declared in the protocol, only report them.

The reference documentation for the protocol is in `docs/mtg-patch-protocol.md`.

## `task`

Executes a declarative MTG Task Protocol file:

```bash
npm --prefix scripts run task -- <file.md>
```

Default file is `tmp/prompt.md` when no argument is provided.

Supported blocks: `## GOAL`, `## ALLOWED_CHANGES`, `## READ`, `## RUN`, `## APPLY_PATCH`, `## REPORT`.

Flags:

- `--dry-run`: parse and validate, skip every `RUN` and `APPLY_PATCH` execution.
- `--explain`: print the planned operations as a tree and exit. No execution.
- `--help`, `-h`: print usage.

The reference documentation for the protocol is in `docs/mtg-task-protocol.md`.
Sample tasks are available in `docs/examples/`.

## `test:apply-patch`

Runs a non-destructive automated test suite for the `apply-patch` executor:

- uses fixtures only in `tmp/apply-patch-tests/`;
- runs protocol executions only with `--dry-run`;
- validates expected success and failure scenarios;
- fails with non-zero code when any test assertion fails.

## `validate`

Runs the quick validation chain for scripts in this order:

1. `npm run pre-run`
2. `npm run apply-patch -- --help`
3. `npm run test:apply-patch`
