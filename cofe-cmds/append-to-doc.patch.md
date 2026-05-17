# COFE Patch Protocol

version: 1
target_repo: expertos-tech/marp-template-gen

Reusable template for appending content to the end of an existing
file. Replace the `[CHANGE-FILE: ...]` path with the real target and
edit the `content:|` body. The `append-file` operation creates the
target if it does not exist.

[CHANGE-FILE: tmp/existing-doc.md]

<cmd:append-file>
content:|

## New Section

Additional content appended to the existing document.
</cmd:append-file>

[VALIDATE]
npm --prefix scripts run pre-run
git status --short
