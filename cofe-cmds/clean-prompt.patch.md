# COFE Patch Protocol

version: 1
target_repo: expertos-tech/marp-template-gen

Reusable patch template that resets `tmp/prompt.md` to the canonical
prompt template documented for `*clean-prompt` in
[`docs/cmd-details-n-params.md`](../docs/cmd-details-n-params.md).

Important limitation:

The COFE Patch Protocol does not currently expose a `delete-file` or
unconditional `overwrite-file` operation, and `create-file` rejects
targets that already exist. This template therefore uses
`replace-regex` with a wildcard pattern over the whole file, which is
only valid in two cases:

1. `tmp/prompt.md` already matches the canonical template byte-for-byte
   (the wildcard pattern then matches the whole file as a single match).
2. The operator has manually reduced `tmp/prompt.md` to a single
   contiguous block that the `[\s\S]+` pattern will match exactly once
   (for example by removing everything except one paragraph). Verifying
   this requires a dry-run; if the executor reports zero or multiple
   matches the patch is refused.

In any other situation, the patch executor will refuse to apply this
file because `replace-regex` requires exactly one match. When that
happens, the operator must either inline the desired final content in a
disposable patch under `tmp/` or fall back to the inline `*clean-prompt`
behavior in `docs/cmd-details-n-params.md`.

Always dry-run this patch first:

```bash
npm --prefix scripts run apply-patch -- cofe-cmds/clean-prompt.patch.md --dry-run
```

[CHANGE-FILE: tmp/prompt.md]

<cmd:replace-regex>
pattern: [\s\S]+
content:|
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
</cmd:replace-regex>

[VALIDATE]
npm --prefix scripts run pre-run
git status --short
git diff -- tmp/prompt.md
