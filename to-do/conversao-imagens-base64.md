# TODO: Convert Images to Base-64 (Self-Contained Marp Markdown)

Context: the project requires generated Marp Markdown to be self-contained. This includes images, which should not point to external files. The target format is `data:` URI with base-64.

## Goal

Add an automatic step to embed images as base-64 in the final generated `.md` file, avoiding dependency on `assets/` or local paths.

## New Script (Required)

Create a new Node script in `scripts/`:

- file: `scripts/embed-images.mjs`
- npm command: add in `scripts/package.json` as `embed-images`
- use:

```bash
npm --prefix scripts run embed-images -- <source.md> [target.md]
```

## Conversion Rules

The script should:

- Read the Markdown (Marp or common).
- Find image references in Markdown:
  - `![alt](path)`
  - `![](path)`
- Find images in inline HTML:
  - `<img src="path" ...>`
- Convert only local paths (relative or absolute) to `data:` URI base-64.
- Ignore remote URLs (`http://`, `https://`) without changing.
- Preserve `alt` and `img` attributes (except `src`).
- Support at least:
  - `.png` -> `data:image/png;base64,...`
  - `.jpg` / `.jpeg` -> `data:image/jpeg;base64,...`
  - `.webp` -> `data:image/webp;base64,...`
  - `.svg` -> `data:image/svg+xml;base64,...` (base-64 of whole file)
- Resolve relative paths from the directory of `source.md`.
- If `target.md` is not provided, overwrite `source.md` safely (write to temporary file and rename).

## Validations and Failures

- If a local image path does not exist, fail with clear error, showing which path was not found.
- If the image file is too large, the script should warn on stderr (without failing) with size in bytes.
  - suggested threshold: 2 MB per image.
- Do not change the file if no local image is found (output should be identical).

## Integration in Workflow

When generation of final Marp Markdown is implemented:

1. Fill `model.md` and replace placeholders.
2. Embed CSS in the `<style>...</style>` block (placeholder `{{EMBEDDED_MODEL_CSS}}` already exists).
3. Run instruction comment cleaning (internal command `strip-instructions`).
4. Run `embed-images` to embed images as base-64.
5. Export via `*marp-export <type> <source> [target]`.

## Quick Test (Manual)

Create a test file in `tmp/` with a simple local image and validate:

- before: `![x](./path/to/image.png)`
- after: `![x](data:image/png;base64,...)`

Validate that Marp renders without `--allow-local-files` and without access to `assets/`.
