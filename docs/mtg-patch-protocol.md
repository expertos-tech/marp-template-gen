# MTG Patch Protocol

## 1. Protocol Objective

The MTG Patch Protocol defines a reviewable textual format to describe local changes to the repository. The focus is to allow instructions generated in ChatGPT Web to be saved in Markdown, reviewed by a human, simulated and applied locally by a dedicated Node script.

## 2. Flow ChatGPT Web -> local agent -> Node script -> report

1. User or agent generates a Markdown protocol file.
2. The file is reviewed locally before execution.
3. The local agent calls the planned command:
   `npm --prefix scripts run apply-patch -- <file.md> [--dry-run] [--force]`.
4. The executor validates security, Git state and operations.
5. The executor simulates or applies changes.
6. The executor generates a textual report ready to paste in the chat.

## 3. General format of a protocol file

A protocol file must contain:

- minimal execution metadata;
- ordered list of operations;
- file targets and change content;
- optional sections for recommended validation.

Recommended format:

```md
# MTG Patch Protocol

version: 1
target_repo: owner/repo

## operations

- op: insert-after
  file: path/target.md
  match: "anchor text"
  content: |
    new block
```

## 4. Planned v1 operations

- `insert-before`
- `insert-after`
- `insert-after-line`
- `append-file`
- `create-file`

## 5. Security rules

- Block absolute path.
- Block use of `..` in the path.
- Block writing outside the repository root.
- Block invalid protocol.
- Block application when there is an unsafe Git state that is not covered by `--force`.

## 6. Clean Git rule

On execution with saving, the default behavior requires a clean working tree. If there are local changes, the execution must fail with clear guidance.

## 7. Temporary branch rule

Every execution with saving must create a temporary branch before applying changes. The name can follow the protocol's technical prefix and include a unique identifier.

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

## 11. Expected report format

The textual report must include at least:

- protocol file used;
- execution mode (`dry-run` or `apply`);
- validation summary;
- list of processed operations;
- list of affected files;
- errors and blocks, when they exist;
- recommended next steps.

## 12. v1 limitations

- Does not execute shell embedded in the protocol.
- Does not implement semantic merge strategies.
- Does not resolve conflicts automatically.
- Does not apply operations outside the supported v1 list.

## 13. Simple protocol example

```md
# MTG Patch Protocol

version: 1
target_repo: expertos-tech/marp-template-gen

## operations

- op: create-file
  file: docs/example.md
  content: |
    # Example
    Initial content.

- op: append-file
  file: docs/example.md
  content: |
    Additional line.
```

## Chat command and planned npm command

- Chat name: `*apply-patch <file.md> [--dry-run] [--force]`
- Planned npm command: `npm --prefix scripts run apply-patch -- <file.md> [--dry-run] [--force]`
- Executor implementation: later step (`scripts/apply-patch-protocol.mjs`)
