# COFE Protocol

**Command Orchestration and File Editing Protocol**

## 1. Overview

COFE Protocol is a generic, Web UI LLM <> Local CLI Agent communication protocol based on reviewable Markdown files. The protocol enables deterministic, auditable workflows for command orchestration and file editing across projects.

### 1.1 Design Principles

- **Reviewable:** All instructions are written in plain Markdown, human-readable before execution.
- **Deterministic:** Each execution follows the same logic path; side effects are minimal and logged.
- **Auditable:** All operations, validations, and results are recorded in text-based reports.
- **Secure:** Restrictive allowlists, path validation, and Git safety checks prevent unintended changes.

### 1.2 Protocol Layers

COFE is composed of two complementary layers:

#### Command Orchestration (Task Layer)

Responsible for:
- Parsing declarative task files (Markdown-based).
- Validating file paths and security constraints.
- Executing `READ`, `RUN`, and `APPLY_PATCH` blocks in sequence.
- Coordinating Git operations and branch safety.
- Logging execution and generating text reports.

**Reference:** [COFE Task Protocol](./cofe-task-protocol.md)

#### File Editing (Patch Layer)

Responsible for:
- Parsing reviewable patch files (anchors, insert/replace/delete operations).
- Applying deterministic text changes to files using exact text or regex anchors.
- Simulating changes (dry-run) or applying them with automatic branch creation.
- Validating Git state and rolling back on errors.
- Generating textual reports describing what was changed.

**Reference:** [COFE Patch Protocol](./cofe-patch-protocol.md)

## 2. Project Adoption

The **Marp Template Gen** project is the first adopter and reference implementation of the COFE Protocol. All task and patch files in this repository follow the COFE specification:

| Layer | Specification | Implementation |
|-------|---------------|----------------|
| COFE Task Protocol | [docs/cofe-task-protocol.md](./cofe-task-protocol.md) | `scripts/run-task.mjs` |
| COFE Patch Protocol | [docs/cofe-patch-protocol.md](./cofe-patch-protocol.md) | `scripts/apply-patch-protocol.mjs` |

Tasks are identified by the heading `# COFE TASK`. Patches are described using block markers `[CHANGE-FILE: ...]` and operation tags `<cmd:...>...</cmd:...>`. Temporary branches created by the patch executor follow the format `tmp/cofe-patch/YYYYMMDD-HHMMSS`.

## 3. Use Cases

### 3.1 Within Marp Template Gen

The COFE Protocol powers:
- `*run` command: Executes COFE Task files from agents.
- `*apply-patch` command: Applies COFE Patch files with Git safety.
- Web UI automation: Chat agents generate COFE Markdown instructions; the local CLI executes and reports back.

**Reusable command templates:**
See [`cofe-cmds/`](../cofe-cmds/README.md) for a catalog of ready-to-run task and patch templates covering common scenarios such as validation, diagnostics, file creation, and block replacement.

### 3.2 Extraction to MCP / Standalone Integration

The COFE Protocol is designed to be extracted and reused in other projects:
- As a standalone Node package or CLI tool.
- As an MCP (Model Context Protocol) integration for Web UI LLMs.
- As a bridge between chat/Web UI and local development environments.
- For automating file-based operations in CI/CD or automation workflows.

## 4. Execution Flow

### 4.1 Task Execution Flow

1. **Write:** Agent (Web UI or local) authors a COFE Task file in Markdown.
2. **Review:** Human or automated reviewer inspects the file before execution.
3. **Execute:** Local runner parses, validates, and executes the file:
   - Validates file paths, mode, and security constraints.
   - Executes `READ` blocks (file inspection).
   - Executes `RUN` blocks (safe shell commands).
   - Coordinates `APPLY_PATCH` blocks (if in `write` mode).
4. **Report:** Runner generates a COFE TASK REPORT ready to paste back into chat.
   - The report includes a `web_ui_handoff` section with mechanical paste-back guidance and log location.

### 4.2 Patch Execution Flow

1. **Write:** Agent generates a COFE Patch file describing target files and operations.
2. **Review:** Human inspects changes before dry-run or execution.
3. **Simulate:** Optional dry-run validates the patch without writing.
4. **Execute:** Patch executor:
   - Validates Git state and target files.
   - Creates a temporary branch `tmp/cofe-patch/YYYYMMDD-HHMMSS`.
   - Applies all operations atomically (all-or-nothing).
   - Reports success or rolls back on error.
5. **Report:** Executor generates a COFE PATCH REPORT describing the changes.

## 5. Reusable Commands

Reusable COFE command files are located in `cofe-cmds/`:

- `*.run.md`: Reusable COFE Task files for common operations.
- `*.patch.md`: Reusable COFE Patch templates for common file edits.

These can be instantiated and customized by agents and workflows.

## 6. Security Model

Both COFE Task and COFE Patch protocols enforce:

- **Path Validation:** Reject absolute paths, `..` traversal, and paths outside the repository.
- **Allowlist Enforcement:** For `write` mode tasks, declare `ALLOWED_CHANGES` to whitelist modifiable files.
- **Command Allowlist:** Restrict `RUN` commands to safe prefixes (e.g., `npm --prefix scripts run`). COFE RUN is allowlist-bounded by design (Option A). Executing general reviewable commands (Option B) is deferred to a future opt-in mode and is not part of the v1 default. See [COFE Task Protocol §6.1](./cofe-task-protocol.md#61-run-semantics-policy).
- **Git Safety:** Verify clean working tree before patch execution; create temporary branches.
- **No Destructive Operations:** Runners do not commit, push, install, or delete files without explicit user action.

## 7. References

- [COFE Task Protocol Specification](./cofe-task-protocol.md)
- [COFE Patch Protocol Specification](./cofe-patch-protocol.md)
- [Scripts README](../scripts/README.md) — Implementation details and CLI examples.
- [AGENTS.md](../AGENTS.md) — `*run` and `*apply-patch` command documentation.
