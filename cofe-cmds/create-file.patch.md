# COFE Patch Protocol

version: 1
target_repo: expertos-tech/marp-template-gen

Reusable template for creating a brand new file. Replace the
`[CHANGE-FILE: ...]` path with the real destination and edit the
`content:|` body. The `create-file` operation fails if the target
already exists; use `append-to-doc.patch.md` to add to existing files.

[CHANGE-FILE: tmp/new-file.md]

<cmd:create-file>
content:|
# Title

Initial content for the new file.
</cmd:create-file>

[VALIDATE]
npm --prefix scripts run pre-run
git status --short
