# COFE Patch Protocol

## 1. Protocol Objective

The COFE Patch Protocol defines a reviewable textual format to describe local changes to the repository. The focus is to allow instructions generated in ChatGPT Web to be saved in Markdown, reviewed by a human, simulated and applied locally by a dedicated Node script.

## 2. Flow ChatGPT Web -> local agent -> Node script -> report

1. User or agent generates a Markdown protocol file.
2. The file is reviewed locally before execution.
3. The local agent calls:
   `npm --prefix scripts run apply-patch -- <file.md> [--dry-run] [--force]`.
4. The executor validates security, Git state and operations.
5. The executor simulates or applies changes.
6. The executor generates a textual report ready to paste in the chat.

## 3. Minimal accepted format for v1

v1 parser is block-based. The executor reads:

- `[CHANGE-FILE: relative/path.md]` to open a file block;
- `<cmd:...> ... </cmd:...>` operations inside the current file block;
- `[VALIDATE]` to collect textual validation commands (listed in report, never executed).

Accepted commands in a file block:

```md
[CHANGE-FILE: path/relative.md]

<cmd:insert-before>
anchor: exact text
content:|
new block
</cmd:insert-before>

<cmd:insert-after>
anchor: exact text
content:|
new block
</cmd:insert-after>

<cmd:insert-after-line>
line: 10
content:|
new block
</cmd:insert-after-line>

<cmd:append-file>
content:|
new block
</cmd:append-file>

<cmd:create-file>
content:|
new block
</cmd:create-file>

<cmd:replace-block>
anchor_start: exact start anchor
anchor_end: exact end anchor
content:|
new block content
</cmd:replace-block>

<cmd:remove-block>
anchor_start: exact start anchor
anchor_end: exact end anchor
confirm: true
</cmd:remove-block>

<cmd:replace-text>
anchor: exact old text
content:|
new text
</cmd:replace-text>

<cmd:replace-regex>
pattern: regex pattern
content:|
replacement text
</cmd:replace-regex>

[VALIDATE]
npm --prefix scripts run pre-run
```

Parse rules:

- each `[CHANGE-FILE: ...]` opens a file block;
- following commands belong to current file block until a new `[CHANGE-FILE: ...]`, `[VALIDATE]`, or end of file;
- `content:|` preserves line breaks exactly as written;
- malformed command blocks fail with explicit line reference.

## 4. Supported operations

v1 operations (additive):

- `insert-before`
- `insert-after`
- `insert-after-line`
- `append-file`
- `create-file`

v1.1 operations (precise edits):

- `replace-block`
- `remove-block`
- `replace-text`
- `replace-regex`

### 4.1 `replace-block`

Format:

```md
<cmd:replace-block>
anchor_start: exact start anchor
anchor_end: exact end anchor
content:|
new block content
</cmd:replace-block>
```

Rules:

- `anchor_start` must occur exactly once in the file.
- `anchor_end` must occur exactly once in the file.
- `anchor_end` must appear after `anchor_start`.
- The replaced range includes both anchors.
- `content:|` preserves line breaks exactly as written.
- Empty replacement content is rejected; use `remove-block` to remove a range.
- The operation fails if the resolved range is invalid (anchor missing, duplicated, or end before start).
- The operation report includes the affected 1-based line range when possible.

### 4.2 `remove-block`

Format:

```md
<cmd:remove-block>
anchor_start: exact start anchor
anchor_end: exact end anchor
confirm: true
</cmd:remove-block>
```

Rules:

- `anchor_start` must occur exactly once in the file.
- `anchor_end` must occur exactly once in the file.
- `anchor_end` must appear after `anchor_start`.
- The removed range includes both anchors.
- `confirm: true` is required. The operation fails without it.
- The operation fails if the resolved range is invalid.
- The operation report includes how many lines were removed.
- The `content:|` marker is not used by this command.

### 4.3 `replace-text`

Format:

```md
<cmd:replace-text>
anchor: exact old text
content:|
new text
</cmd:replace-text>
```

Rules:

- `anchor` must occur exactly once in the file.
- The exact anchor text is replaced by `content`.
- `content:|` preserves line breaks exactly as written.
- This operation is intended for small, exact replacements.
- The operation fails on zero or multiple matches.

### 4.4 `replace-regex`

Format:

```md
<cmd:replace-regex>
pattern: regex pattern
content:|
replacement text
</cmd:replace-regex>
```

Rules:

- `pattern` must be a valid JavaScript regular expression body.
- Regex flags are not allowed in v1.1. The pattern is compiled without flags.
- The regex must match exactly once. The operation fails on zero or multiple matches.
- `content` is inserted literally. Backreference tokens such as `$&`, `$1` or `$<name>` are not interpolated.
- Replacement functions, shell interpolation, environment interpolation and any runtime evaluation are not supported.
- Invalid regex syntax produces a clear validation error and the protocol fails as a whole.
- Escape regex metacharacters in `pattern` using standard JavaScript regex escaping (`\.`, `\(`, `\\`, etc.).
- This command is powerful and should be used only when exact anchors are not practical.

## 5. Security rules

- Block absolute path.
- Block use of `..` in the path.
- Block writing outside the repository root.
- Block invalid protocol.
- Block application when there is an unsafe Git state that is not covered by `--force`.

## 6. Clean Git rule

On execution with saving, the default behavior requires a clean working tree, including untracked files. If there are local changes, the execution must fail with clear guidance.

## 7. Temporary branch rule

Every execution with saving must create a temporary branch before applying changes, using format:

`tmp/mtg-patch/YYYYMMDD-HHMMSS`

## 8. `--dry-run` rule

`--dry-run` validates input, resolves targets and simulates operations without saving files and without creating a temporary branch.

## 9. `--force` rule

`--force` only ignores the clean working tree validation.

`--force` does not ignore:

- merge in progress;
- rebase in progress;
- cherry-pick in progress;
- revert in progress;
- conflicts;
- invalid protocol;
- unsafe path.

## 10. Rule of not executing protocol shell commands

In v1, the executor must not execute shell commands contained in the protocol. These commands can only be listed in the report as recommended validation.

## 11. Operational decisions

- Text anchor with zero occurrences fails.
- Text anchor with multiple occurrences fails.
- `insert-after-line` uses 1-based numbering.
- `insert-after-line` fails if line is less than 1 or greater than total lines in file.
- `append-file` creates file when target does not exist.
- `create-file` fails if target already exists.
- `replace-block` and `remove-block` require both anchors to occur exactly once and `anchor_end` to appear after `anchor_start`.
- `remove-block` requires `confirm: true`.
- `replace-text` requires the anchor to occur exactly once.
- `replace-regex` compiles the pattern without flags, requires exactly one match and treats `content` as a literal string.
- The v1.1 edit operations (`replace-block`, `remove-block`, `replace-text`, `replace-regex`) keep the same security model as v1: unsafe paths are blocked, absolute paths are blocked, `..` segments are blocked, operations remain all-or-nothing, `--dry-run` simulates without saving, real apply requires Git safety checks, and `[VALIDATE]` commands are reported but not executed.
- Execution is all-or-nothing for operation failures. If any operation fails, no file is saved.
- `--force` ignores only clean working tree validation.
- `--force` does not ignore merge, rebase, cherry-pick, revert, conflicts, invalid protocol, or unsafe path.
- Execution with saving creates temporary branch before writing.

## 12. Expected report format

The textual report must include at least:

- protocol file used;
- execution mode (`dry-run` or `apply`);
- validation summary;
- list of processed operations;
- list of affected files;
- list of found validation commands from `[VALIDATE]`, without execution;
- errors and blocks, when they exist;
- recommended next steps.

## 13. v1.1 limitations

- Does not execute shell embedded in the protocol.
- Does not implement semantic merge strategies.
- Does not resolve conflicts automatically.
- Does not apply operations outside the supported list (v1 + v1.1).
- Does not accept regex flags in `replace-regex`.
- Does not interpolate backreferences in replacement content.
- Does not support replacement functions or any runtime evaluation.

## 14. Simple protocol example

```md
# COFE Patch Protocol

version: 1
target_repo: expertos-tech/marp-template-gen

[CHANGE-FILE: docs/example.md]

<cmd:create-file>
content:|
# Example
Initial content.
</cmd:create-file>

<cmd:append-file>
content:|
Additional line.
</cmd:append-file>

[VALIDATE]
npm --prefix scripts run pre-run
```

## Chat command and planned npm command

- Chat name: `*apply-patch <file.md> [--dry-run] [--force]`
- npm command: `npm --prefix scripts run apply-patch -- <file.md> [--dry-run] [--force]`
- Executor implementation: `scripts/apply-patch-protocol.mjs`
