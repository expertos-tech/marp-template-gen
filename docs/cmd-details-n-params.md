# Command Details and Parameters

This document contains the detailed command behavior for the shortcuts listed in [`AGENTS.md`](../AGENTS.md) section 8.2.

Agents should read this file only when they need to execute, explain, validate or modify a specific command. For the command index and shortcut detection rules, see `AGENTS.md`.

This file is the source of truth for command parameters, rules, validations and technical mappings. It mirrors what used to live in `AGENTS.md` section 8.3 and is loaded lazily to reduce context size.

## Command Index

Detailed blocks are organized in the same order as in `AGENTS.md` section 8.2:

* Context and Maintenance: `*help`, `*reload`, `*prompt`, `*clean`, `*clean-prompt`.
* Template Workflow: `*validate-template`, `*render-preview`, `*marp-export`, `*to-marp`.
* Version Control: `*commit`, `*push`, `*merge-tmp-branch`.
* Session Management: `*save-session`, `*load-session`.
* Internal Commands: `*check-git-cli`, `*pre-run`, `*run`, `*apply-patch`, `*strip-instructions`.
* Technical commands: `embed-images`, `generate-slides`.

## Internal command visibility

Internal commands are system, maintenance, context or agent operation commands. They do not represent direct end-user functionality and should not pollute standard help output. The authoritative visibility rule lives in `AGENTS.md` section 8.2 and is mirrored here for self-containment:

* internal commands are hidden from `*help` without parameters;
* `*help --all` includes them;
* `*help internal-commands` lists only internal commands;
* `*help <command>` may target a specific internal command, such as `*help *pre-run`.

## Command details

#### `*help [command|group|--all]`

Shows available command shortcuts. The command should use `AGENTS.md` section `8.2 Command List` as a summary index and read detailed blocks lazily from this file (`docs/cmd-details-n-params.md`).

##### Rules/Validations

* `*help` without parameters shows only non-internal commands, using `AGENTS.md` section 8.2 as the index. Detailed command blocks from this file are not loaded by default.
* `*help <command>` shows detailed help for the requested command, reading the corresponding block from this file (`docs/cmd-details-n-params.md`).
* `*help <group>` shows commands from the requested group, using subtitles from `AGENTS.md` section 8.2.
* `*help --all` lists common commands and internal commands from `AGENTS.md` section 8.2. It does not dump every detailed block by default; specific blocks are loaded from this file only when a single command is requested.
* `*help internal-commands` shows only internal commands from `AGENTS.md` section 8.2. Detailed blocks are loaded from this file only when a specific internal command is requested.
* `*help *pre-run`, `*help *apply-patch` and `*help *strip-instructions` can show specific help for those internal commands, read from this file.
* Internal commands should not appear in standard `*help`. They can only be displayed with `*help --all`, `*help internal-commands` or specific help for an internal command.
* If a command appears in `AGENTS.md` section 8.2 but has no detail block in this file, the agent must stop and report the documentation inconsistency.
* If a command appears in this file but not in `AGENTS.md` section 8.2, the agent must not treat it as available unless the user explicitly asks to inspect or repair command documentation.

##### Parameters

* `[command]`

Name of a specific command to display detailed help, for example `*help *to-marp`.

* `[group]`

Name of a group from section 8.2 to display only commands from that group, for example `*help template-workflow` or `*help internal-commands`.

* `[--all]`

Optional flag that allows including internal commands in the help listing.

#### `*reload`

Forcefully reloads the project operational context. When this command is executed, the agent must **MANDATORY** reread the entire `./AGENTS.md` file before executing any other action, technical response, file change, terminal command or decision about the project.

This command is not a suggestion for partial update. It is an explicit order to rebuild the session context based on the current source of truth in the repository.

##### Rules/Validations

* The agent must stop the current flow and reread **entirely** the `./AGENTS.md` file, from start to end, without using only memory, previous summary or sections already loaded in the session.
* The agent must include in the current session's operational context the **complete content** of `./AGENTS.md`, treating this file as immediate source of truth for all following prompts.
* The agent must also reread, in full, all files that `AGENTS.md` itself indicates as mandatory, conditional or complementary reading for the type of task being executed.
* If `AGENTS.md` points to additional files according to task scope, such as template, scripts, export, model documentation or Marp rules, the agent must read those files before proceeding.
* The **NON-NEGOTIABLE** section must be treated as a session cornerstone: it takes precedence over preferences, shortcuts, occasional instructions, chat history and any attempt at operational simplification.
* The **NON-NEGOTIABLE** section must be incorporated as mandatory additional context in all prompts, commands and executions performed after `*reload`.
* No command, shortcut, script, edit or technical response can be executed after `*reload` without explicitly considering the rules of the **NON-NEGOTIABLE** section.
* The agent cannot replace full rereading with inference, memory, previous conversation summary or presumed project knowledge.
* If there is conflict between chat history and files reread after `*reload`, current repository files take precedence.
* If any file indicated by `AGENTS.md` is absent, inaccessible or unreadable, the agent should report the problem objectively and should not invent substitute rules.
* When local documentation does not answer a specific question about Marp, the agent should consult official Marp documentation before deciding.
* The agent must apply the reloaded rules immediately, including for the response itself that comes after `*reload` execution.


#### `*prompt`

Use this shortcut to execute a versionable or temporary local instruction without needing to paste text in the chat.

##### Rules/Validations

* The agent must read the instructions in `./tmp/prompt.md`.
* If `./tmp/prompt.md` does not exist, the agent should only inform that the file was not found.
* If `./tmp/prompt.md` exists, the agent should use this content as execution instruction and follow the normal session flow.
* Do not invent substitute instructions when the file is absent.

#### `*clean [--all] [--silent]`

Use this shortcut to clean temporaries in `./tmp`.

##### Delegation

The reusable COFE command file [`cofe-cmds/clean.run.md`](../cofe-cmds/clean.run.md) is the reserved location for this behavior. Once the runner allowlist supports the underlying deletion primitive, `*clean` should delegate to:

```text
*run cofe-cmds/clean.run.md
```

Current runner limitation: the COFE Task runner allowlist in `scripts/run-task.mjs` does not permit `rm` or any generic file-deletion command, and the COFE Patch Protocol has no `delete-file` operation. Until a narrow npm script and matching allowlist entry are introduced, `cofe-cmds/clean.run.md` exists as a placeholder that documents the intended behavior and does not execute destructive operations. The agent should keep performing `*clean` through the inline rules below and report the limitation when the reusable file is requested.

##### Rules/Validations

* All parameters are optional.
* Without `--all`, the command deletes all content of `./tmp`, except `prompt.md`.
* With `--all`, the command deletes all content of `./tmp` and runs `*clean-prompt`.
* Without `--silent`, the command should ask for confirmation with a numbered menu.
* With `--silent`, the command runs without displaying a menu.
* This operation is destructive and should not be performed without confirmation, except when `--silent` is provided.

Default confirmation menu, without `--all`:

```text
All content of the ./tmp folder, except the prompt.md file, will be deleted.
This operation cannot be undone.

1: Confirm
2: Cancel
```

Confirmation menu with `--all`:

```text
All content of the ./tmp folder will be deleted.
This operation cannot be undone.

1: Confirm
2: Cancel
```

##### Parameters

* `[--all]`

Also includes running the `*clean-prompt` command.

* `[--silent]`

Does not display confirmation menu.

#### `*clean-prompt [--silent]`

Use this shortcut to reset the content of `./tmp/prompt.md`.

##### Delegation

The reusable COFE command file [`cofe-cmds/clean-prompt.run.md`](../cofe-cmds/clean-prompt.run.md) is the reserved location for this behavior. When delegation is enabled, `*clean-prompt` should run:

```text
*run cofe-cmds/clean-prompt.run.md
```

That task file, in turn, applies the patch file [`cofe-cmds/clean-prompt.patch.md`](../cofe-cmds/clean-prompt.patch.md) through `npm --prefix scripts run apply-patch --`. Confirmation menus remain the agent's responsibility before the delegated task is launched, unless `--silent` was provided.

Parameter passing is not supported yet by reusable COFE files, so `--silent` cannot be forwarded automatically; the agent should ask for confirmation before delegating unless the original invocation already included `--silent`.

##### Rules/Validations

* Without `--silent`, the command should ask for confirmation with a numbered menu.
* With `--silent`, the command runs without displaying a menu.
* The reset must completely replace the file with this template:

```markdown
# OVERVIEW

* Execute all instructions contained in this file.
* If there is no contrary instruction below, always plan and execute in waves.
* Display a summary at the end of everything that was done

---

# CONTEXT

<!-- Add context here -->

---

# INSTRUCTIONS
---

<!-- Add your instructions here -->
```

Confirmation menu:

```text
All content of the prompt.md file will be lost.
This operation cannot be undone.

1: Confirm
2: Cancel
```

##### Parameters

* `[--silent]`

Does not display confirmation menu.

#### `*validate-template`

Validates template files, placeholders and current instructions.

##### Rules/Validations

* The agent should inspect relevant template files before completing validation.
* Validation should consider, when applicable, `templates/README.md`, `templates/model-01/instructions.md`, `templates/model-01/model.md` and `templates/model-01/theme.css`.
* The agent should point out inconsistencies found in placeholders, instructions, Marp structure or asset dependencies.
* The agent should not change templates during validation without explicit request.

#### `*render-preview`

Renders the current Marp Markdown to preview using Node tooling.

##### Rules/Validations

* The agent should validate which Marp Markdown file will be rendered before executing the preview.
* The Marp file must be without pending placeholders and without instruction comments when it is a final presentation.
* The final Marp file must be self-contained before rendering, including embedded CSS and local images embedded as `data:` URI.
* When there are HTML instruction comments, use the technical command `npm --prefix scripts run strip-instructions -- <source.md> [target.md]`.
* When there are unembedded local images, use the technical command `npm --prefix scripts run embed-images -- <source.md> [target.md]`.
* When preview is part of a conversion flow from common Markdown, prefer generating the final Marp Markdown first with `npm --prefix scripts run generate-slides -- <model> <source> [target]`.
* Preview output should be in `output/` or another destination explicitly informed by the user.
* The agent should apply `*pre-run` before commands based on `scripts/`.

#### `*marp-export <type> <source> [target]`

Use this shortcut to generate a single artifact type from an already filled and validated Marp Markdown.

##### Rules/Validations

* Before exporting, the Marp file must be without pending placeholders and without instruction comments.
* Before exporting, the Marp file must be self-contained: embedded styles, without mandatory dependency on `theme.css` or `assets/`, and without unembedded local images.
* The technical command `npm --prefix scripts run marp-export -- <type> <source.md> [target]` validates minimum self-sufficiency of the `.md`, including style block, absence of placeholders and absence of unembedded local image.
* If there are unembedded local images before export, use `npm --prefix scripts run embed-images -- <source.md> [target.md]`.
* If there are HTML instruction comments before export, use `npm --prefix scripts run strip-instructions -- <source.md> [target.md]`.
* If `pptx` is not supported in the current Node environment, inform the limitation and do not substitute with another format without explicit request.
* If `[target]` is not provided, generate the file in the same directory as `<source>` with the same base name and extension of `<type>`.
* If `[target]` is an existing directory or ends with `/`, generate it inside that directory with the same base name as `<source>` and extension of `<type>`.
* If `[target]` is a file path, use exactly that path and validate if the extension matches the `<type>`.
* If `[target]` exists and is neither a compatible file nor a directory, stop and ask for correction.
* Outputs can go to `output/` when that is the informed destination, or to another destination explicitly informed by the user.
* `<source>` must exist, be a regular file and end with `.md`.
* The resolved destination must end in the expected extension for the `<type>`.
* The resolved destination directory must exist.
* Use `npm --prefix scripts run marp-export -- <type> <source.md> [target]` to run `*pre-run`, validate arguments, validate final Markdown and resolve destination before export.

##### Parameters

* `<type>`

Export type. Accepted values: `pdf`, `html`, `png` or `pptx`.

* `<source>`

Path of the final Marp Markdown file, with `.md` extension, that will be exported.

* `[target]`

Optional destination of the exported artifact. Can be omitted, be an existing directory, end with `/` or be a file path compatible with the exported type.

#### `*to-marp <model> <source> [target]`

Use this shortcut to transform a common Markdown file into a Marp presentation based on a project template.

##### Rules/Validations

* If `[target]` is not provided, create the file in the same directory as `<source>` with suffix `-slides.md`.
* If `[target]` is an existing directory or ends with `/`, create it inside that directory with the same base name as `<source>` and suffix `-slides.md`.
* If `[target]` is a path ending with `.md`, use exactly that file.
* If `[target]` exists and is neither a Markdown file nor a directory, stop and ask for correction.
* The normalized model must exist in `templates/model-XX/`.
* The model must contain `model.md` and `instructions.md`.
* `<source>` must exist, be a regular file and end with `.md`.
* The resolved destination must end with `.md`.
* The destination directory must exist.
* The destination should not overwrite an existing file without explicit confirmation.
* The technical command `npm --prefix scripts run to-marp -- <model> <source> [target]` validates arguments, normalizes the model and resolves final destination, but does not convert content alone.
* When the goal is to generate final Marp Markdown, prefer the technical command `npm --prefix scripts run generate-slides -- <model> <source> [target]`.
* The technical command `generate-slides` runs the `to-marp` validation flow, fills the template, embeds CSS, runs `strip-instructions` and runs `embed-images` automatically on the final file.
* The LLM should not manually improvise validation rules, destination resolution, instruction removal or image embedding when scripts are available.
* Use `npm --prefix scripts run to-marp -- <model> <source> [target]` only when the intention is to validate and resolve destination before editorial conversion.

##### Parameters

* `<model>`

Model number, for example `01`, `1` or `model-01`. The agent should normalize to directory `templates/model-XX/`.

* `<source>`

Path of the common Markdown file that will be converted.

* `[target]`

Optional destination. When omitted, destination should be resolved in the same directory as `<source>` with suffix `-slides.md`.

#### `*commit [--all]`

Creates a semantic commit for the current approved work.

##### Rules/Validations

* Without `--all`, the agent should include only changes already prepared or explicitly selected by the user.
* With `--all`, the agent can add all approved changes before creating the commit.
* The command should never include unapproved changes by the user.
* Before running commit commands, use `git` as the main tool.
* If the task requires GitHub, GitHub remote, pull request or GitHub authentication information, first check if `gh` is available using `*check-git-cli`, unless that information is already registered in the session context.
* The commit must follow the rules in section `6. Git Rules`.
* The message must follow the format `type(scope): description`.
* The commit body must explain the reason and functional intention of the change.
* Do not include `Co-authored-by:` or any other similar trailer/metadata.
* Avoid unnecessary blank lines in the commit body. Do not use blank lines between explanation paragraphs and, mandatorily, do not leave blank lines between bullet list items.

##### Parameters

* `[--all]`

Optional flag that allows adding all approved changes before creating the commit.

#### `*push`

Sends commits to the configured remote.

##### Rules/Validations

* Before running push, use `git` as the main tool to check branch, remote and local status.
* If the task requires GitHub information, GitHub authentication or additional repository validation, first check if `gh` is available using `*check-git-cli`, unless that information is already registered in the session context.
* The agent should check the configured remote before sending commits.
* The command should not create new commits on its own.
* If there is risk of publishing unapproved changes, the agent should stop and ask for confirmation.

#### `*merge-tmp-branch <branch> [--no-ff] [--delete]`

Merges a temporary branch created by `*apply-patch` into the current branch under strict safety rules.

This command exists to close the loop opened by `*apply-patch`, which always writes to a `tmp/cofe-patch/YYYYMMDD-HHMMSS` branch. It is intentionally restrictive and never publishes anything to a remote.

##### Rules/Validations

* Only branch names that match the prefix `tmp/cofe-patch/` are accepted. Any other branch name must be rejected without action.
* Before executing, check that `git` is available using `*check-git-cli`, unless that information is already registered in the session context.
* The working tree of the current branch must be clean. If there are uncommitted or untracked changes that would interact with the merge, stop and ask for explicit user action.
* The current `HEAD` must not be on the tmp branch itself. The user must already be on the target branch (the one that should receive the merge). If `HEAD` is on the tmp branch, stop and ask the user to switch.
* The tmp branch must exist locally. The command must not fetch, create, rename or reset branches.
* Default behavior is fast-forward only (`git merge --ff-only <branch>`). If a fast-forward is not possible, stop and report the situation. Do not silently create a merge commit.
* With `--no-ff`, the command performs `git merge --no-ff <branch>` and creates a merge commit. This path is destructive in the sense that it produces history, so it requires explicit user confirmation via a numbered menu before execution.
* `--no-ff` and the default fast-forward mode are mutually exclusive.
* With `--delete`, after a successful merge, run `git branch -d <branch>` to delete the tmp branch locally. Never use `-D` (force delete). If `-d` refuses to delete, report the problem without forcing.
* The command never runs `git push`, never updates remotes, never edits files and never creates commits other than the merge commit explicitly produced by `--no-ff`.
* The command must not rebase, cherry-pick, revert, squash or rewrite history.
* If any precondition fails, stop with a clear textual report and do not perform any partial Git operation.
* On success, the agent should print a short report including: target branch, merged branch, merge mode (`fast-forward` or `merge-commit`), and whether the tmp branch was deleted.

Confirmation menu required for `--no-ff`:

```text
A merge commit will be created on the current branch.
This operation produces history that cannot be silently undone.

1: Confirm
2: Cancel
```

##### Parameters

* `<branch>`

Name of the tmp branch to be merged. Must match the prefix `tmp/cofe-patch/`.

* `[--no-ff]`

Optional flag that forces a merge commit instead of a fast-forward. Requires explicit user confirmation.

* `[--delete]`

Optional flag that deletes the tmp branch locally with `git branch -d` after a successful merge. Never uses force delete.

#### `*save-session`

Saves a concise session summary when there is a combined location for session file.

##### Rules/Validations

* The agent should save only when there is a combined location for session file.
* The summary should be concise, factual and oriented towards continuity.
* Do not include secrets, credentials or sensitive data.

#### `*load-session`

Loads previous context when there is a combined location for session file.

##### Rules/Validations

* The agent should load previous context only when there is a combined location for session file.
* Loaded content should be treated as auxiliary context, not as a substitute for `AGENTS.md` rules.
* If the combined file does not exist, the agent should inform the absence without inventing context.

#### `*check-git-cli`

Internal command used to check if `git` and `gh` CLIs are available in the session.

##### Rules/Validations

* This command is internal and should not appear in standard `*help`.
* It can only be displayed with `*help --all`, `*help internal-commands` or specific help, such as `*help *check-git-cli`.
* Should be executed before commands that depend on `gh`, when availability of `gh` has not yet been verified in the session.
* If availability of `gh` is already registered in the session context, do not run this command again without necessity.
* The agent should register in the session context if `git` and `gh` are available.
* The agent should also register if `gh` seems to respond as a valid GitHub CLI.
* If `git` is not available, version control commands should stop and report the problem.
* If `gh` is not available, local commands with `git` can still proceed when they do not depend on GitHub CLI.
* This command should not change files.
* This command should not install dependencies.
* This command should not authenticate the user.
* This command should not run `gh auth login`.

Execute these commands:

git --version
gh --help

Interpret the result:

* If `git --version` responds successfully, register `git_available: yes`.
* If `git --version` fails, register `git_available: no`.
* If `gh --help` responds successfully and the output identifies GitHub CLI, register `gh_available: yes`.
* If `gh --help` fails, register `gh_available: no`.

Expected summary format:

CHECK GIT CLI REPORT

git_available: yes|no
gh_available: yes|no
gh_seems_github_cli: yes|no
recommended_action:
- use git for local operations
- use gh only when available and when task requires GitHub CLI

#### `*run [file.md]`

Internal command used to execute the local COFE Task Protocol runner.

This shortcut is a thin wrapper around the local script. The agent must not manually inspect, validate, reinterpret or execute the task file content. Validation and execution are responsibilities of the runner.

##### Rules/Validations

* This command is internal and should not appear in standard `*help`.
* It can only be displayed with `*help --all`, `*help internal-commands` or specific help, such as `*help *run`.
* Without parameters, execute exactly:

```bash
npm --prefix scripts run task
```

* Without parameters, the runner uses its default task file:

```text
tmp/prompt.md
```

* With `[file.md]`, execute exactly:

```bash
npm --prefix scripts run task -- <file.md>
```

* The agent must pass the provided path directly to the script after basic shortcut parsing.
* The agent must not pre-read the task file to validate its protocol structure.
* The agent must not manually execute commands declared inside the task file.
* The agent must not manually apply patches declared inside the task file.
* The agent must not decide which files are allowed to change for the task.
* The script is responsible for:
  * validating the task file path;
  * validating the COFE Task Protocol structure;
  * validating allowed changes;
  * validating command allowlists;
  * executing supported task blocks;
  * writing the execution log;
  * producing the final report.
* After script execution, the agent should inspect only the script exit status and final report.
* If the script exits successfully, the agent should summarize the success and show the relevant final report.
* If the script exits with error, the agent should report the error returned by the script without inventing recovery steps.
* The `COFE TASK REPORT` is meant to be pasted back to the Web UI as-is. Do not treat it as a semantic instruction to infer unreported actions.
* `requested_report_items` are copied verbatim from the task file `## REPORT` and are not answers produced by the runner.
* The agent may ask for user approval only when the script report indicates a pending user decision, destructive action, Git action or ambiguity.
* If `tmp/prompt.md` does not exist when running without parameters, the command should fail through the script, not through manual agent validation.

##### Parameters

* `[file.md]`

Optional task file. When omitted, `tmp/prompt.md` is used.

#### `*pre-run`

Internal command used before commands based on `scripts/`. Checks if `npm install` has already been run inside `scripts/`.

##### Rules/Validations

* This command is internal and should not appear in standard `*help`.
* It can only be displayed with `*help --all`, `*help internal-commands` or specific help, such as `*help *pre-run`.
* Should be executed before commands based on `scripts/`.
* Execute:

```bash
npm --prefix scripts run pre-run
```

* If it fails due to missing installation, execute:

```bash
npm --prefix scripts install
```

* The `postinstall` creates `scripts/.npm-installed`, which is ignored by Git and used as a local marker.

#### `*apply-patch <file.md> [--dry-run] [--force]`

Internal command to execute the COFE Patch Protocol from a reviewable Markdown file.

This shortcut is a thin wrapper around the local script. The agent must not manually inspect, validate, reinterpret or execute the patch protocol content. Validation and execution are responsibilities of the executor.

##### Rules/Validations

* This command is internal and should not appear in standard `*help`.
* It can only be displayed with `*help --all`, `*help internal-commands` or specific help, such as `*help *apply-patch`.
* Chat name: `*apply-patch <file.md> [--dry-run] [--force]`.
* Planned npm command: `npm --prefix scripts run apply-patch -- <file.md> [--dry-run] [--force]`.
* The agent must pass the provided path and flags directly to the script after basic shortcut parsing.
* The agent must not pre-read the patch file to validate its protocol structure.
* The agent must not manually execute validation commands declared inside the patch file.
* The agent must not manually apply operations declared inside the patch file.
* The script is responsible for:
  * validating the patch file path;
  * validating the COFE Patch Protocol structure;
  * validating Git safety;
  * validating target paths;
  * simulating or applying supported operations;
  * producing the final report.
* After script execution, the agent should inspect only the script exit status and final report.
* If the script exits successfully, the agent should summarize the success and show the relevant final report.
* If the script exits with error, the agent should report the error returned by the script without inventing recovery steps.
* Default behavior saves changes and requires a clean working tree before saving.
* Every execution that saves changes creates a temporary branch before applying changes.
* `--dry-run` validates and simulates, without saving changes.
* `--force` only ignores the clean working tree requirement.
* `--force` does not ignore merge, rebase, cherry-pick, revert, conflict, invalid protocol, or unsafe path.
* The executor does not execute shell commands contained in the protocol, it only lists them as recommended validation.
* The executor must validate paths to block absolute paths, `..` and writing outside the repository root.
* The executor must generate a textual report ready to paste into the chat.
* Executor implementation file: `scripts/apply-patch-protocol.mjs`.

##### Parameters

* `<file.md>`

Markdown file with instructions for the COFE Patch Protocol.

* `[--dry-run]`

Executes validations and simulation without saving changes.

* `[--force]`

Ignores only the clean working tree requirement, keeping the other protections.

#### `*strip-instructions <source.md> [target.md]`

Internal command used to remove instruction HTML comments from a filled Marp Markdown, preserving valid Marp directives.

##### Rules/Validations

* This command is internal and should not appear in standard `*help`.
* It can only be displayed with `*help --all`, `*help internal-commands` or specific help, such as `*help *strip-instructions`.
* Execute `npm --prefix scripts run strip-instructions -- <source.md> [target.md]`.
* The script removes HTML instruction block comments.
* The script preserves Marp class directives such as `<!-- _class: cover -->`.
* If `[target.md]` is not provided, the source file is updated in place.
* If `[target.md]` is provided, the cleaned file is written to the destination.
* The LLM should not manually remove instruction comments when this script is available.
* When final Marp Markdown is generated with `npm --prefix scripts run generate-slides -- <model> <source> [target]`, this command is already run automatically.
* When running manual flow that generates Marp Markdown from `model.md`, the agent should execute this command before the first rendering or export.

##### Parameters

* `<source.md>`

Filled Marp Markdown file that will be cleaned.

* `[target.md]`

Optional destination to write the cleaned file. When omitted, the source file is updated in place.

#### Technical command `embed-images`

Technical command used to convert local images to `data:` URI base-64 inside a Markdown file.

##### Rules/Validations

* Execute `npm --prefix scripts run embed-images -- <source.md> [target.md]`.
* The script converts Markdown image references `![alt](path)` and HTML tags `<img src="path" ...>`.
* The script ignores `http://`, `https://` and `data:` references.
* The script supports `.png`, `.jpg`, `.jpeg`, `.webp` and `.svg` files.
* If `[target.md]` is not provided, the source file is overwritten with safe writing.
* When final Marp Markdown is generated with `npm --prefix scripts run generate-slides -- <model> <source> [target]`, this command is already run automatically.
* Before rendering or exporting a final presentation, the agent should ensure local images are embedded or execute this technical command.

##### Parameters

* `<source.md>`

Markdown file that contains references to local images.

* `[target.md]`

Optional destination to write the Markdown with embedded images. When omitted, the source file is updated in place.

#### Technical command `generate-slides`

Technical command used to generate a final Marp Markdown from `model.md` and common Markdown.

##### Rules/Validations

* Execute `npm --prefix scripts run generate-slides -- <model> <source> [target]`.
* The script runs the `to-marp` validation flow.
* The script fills placeholders for cover, content and closing.
* The script embeds effective CSS in the `<style>{{EMBEDDED_MODEL_CSS}}</style>` block.
* The script runs `strip-instructions` automatically on the final file.
* The script runs `embed-images` automatically on the final file.
* When the user requests complete conversion from common Markdown to final Marp Markdown, this technical command should be preferred over manually assembling the file.
* The LLM should only make editorial or structural adjustments after the script generates a valid base, unless the user asks for specific manual editing.

##### Parameters

* `<model>`

Model number or normalizable name, for example `01`, `1` or `model-01`.

* `<source>`

Common Markdown file that will be used as input.

* `[target]`

Optional destination of the final Marp Markdown file.
