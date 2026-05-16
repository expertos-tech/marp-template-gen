# Marp Templates

This directory brings together reusable models to transform common Markdown content into Marp presentations.

## Available Models

| Model | Main Use | Instructions |
| --- | --- | --- |
| `model-01` | Editorial presentations in 16:9 with visual cover, sections, content, cards, timeline, image and closing | [`model-01/instructions.md`](./model-01/instructions.md) |

## Conversion Workflow

The standard workflow has four conceptual files:

1. Common Markdown input, without Marp directives.
2. `model.md`, which defines the generic structure with placeholders `{{...}}`.
3. Filled Marp Markdown, for example `presentation-marp.md`.
4. Exported artifacts: PDF, HTML, preview PNG and PPTX.

The `model.md` does not replace placeholders automatically. It is a filling contract: each `{{KEY}}` must be replaced with the final content, and the HTML comments explain the role of each key.

The final Marp Markdown must be self-contained. The template can use `theme.css` and `assets/` as organization sources, but the generated file must embed the necessary styles into the `.md` itself, preferably in a `<style>...</style>` block, and not depend on external files for basic rendering.

After filling, remove the instruction comments deterministically:

```bash
npm --prefix scripts run strip-instructions -- presentation-marp.md
```

This script preserves essential Marp directives, such as `<!-- _class: cover -->`, and removes HTML guidance comments that should not go into the final file.

## Node Tools

All generations and exports should use Node tools installed in the project or run via `npx`.

Before using local scripts, install the `scripts/` folder:

```bash
npm --prefix scripts install
```

Before conversions and validations, run the preflight:

```bash
npm --prefix scripts run pre-run
```

Expected commands after creating `package.json`:

```bash
npm run render:pdf -- templates/model-01/presentation-marp.md
npm run render:html -- templates/model-01/presentation-marp.md
npm run render:preview -- templates/model-01/presentation-marp.md
npm run render:pptx -- templates/model-01/presentation-marp.md
```

To validate the modular template directly, the base Marp CLI command can register the local theme:

```bash
npx marp --theme ./templates/model-01/theme.css file.md -o file.pdf
```

For generated final Marp files, prefer rendering without `--theme`, since the necessary CSS must be embedded in the Markdown itself.

## Conventions

- Every model must have a `model.md` with generic placeholders.
- Every model must have an `instructions.md` documenting slide types, placeholders and conversion rules.
- The root `templates/README.md` is the only README in the templates area.
- Individual models should not have `README.md`; use `instructions.md`.
- Assets should be inside the model's own folder.
- Generated final Marp files must be self-contained: embedded CSS and essential assets built in or replaced.
- Generated outputs should be in an `output/` folder of the model or in temporary path combined in the validation step.

## Interactive Validation

The implementation of this project should follow waves:

1. Validate model documentation and taxonomy.
2. Validate `model.md`.
3. Validate Node scripts, `pre-run` and instruction comment cleaning in filled Markdown.
4. Validate visual theme and assets.
5. Validate conversion of real content to Marp.
6. Validate PDF, HTML, PNG and PPTX exports.

Each wave should present changed files, used commands, observed results and pending items before moving to the next.
