# COFE Patch Protocol

version: 1
target_repo: expertos-tech/marp-template-gen

Reusable template for replacing a contiguous block delimited by two
exact anchors. Both `anchor_start` and `anchor_end` must each occur
exactly once in the target file, and `anchor_end` must appear after
`anchor_start`. The replaced range includes both anchors. Use this
template for section-level rewrites where line numbers are unstable.

[CHANGE-FILE: tmp/existing-doc.md]

<cmd:replace-block>
anchor_start: ## Old Section Title
anchor_end: <!-- end old section -->
content:|
## New Section Title

Replacement content for the section. Preserve any closing marker the
file uses to keep `anchor_end` semantics consistent.

<!-- end new section -->
</cmd:replace-block>

[VALIDATE]
npm --prefix scripts run pre-run
git status --short
