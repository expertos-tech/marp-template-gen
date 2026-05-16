# Instructions for `model-01`

`model-01` is a generic Marp model to convert common Markdown content into 16:9 editorial presentations. The visual design should be inspired by a reference presentation about informal work in Brazil: dark or blue background, strong typography, clean sections, cards and compositions with plenty of space.

## Model Files

| File | Function |
| --- | --- |
| `model.md` | Marp template with `{{...}}` placeholders and HTML guidance comments. |
| `theme.css` | Official Marp theme with `/* @theme model-01 */`. |
| `assets/` | Images and backgrounds used by the theme and slides. |
| `instructions.md` | This usage and conversion contract. |

Do not create `README.md` inside `model-01`. The general index is in `../README.md`.

The template can be modular, but the generated Marp Markdown file must be self-contained. When generating a final presentation, include in the `.md` itself the necessary styles from `theme.css`. If there is an essential image, include it as a data URI or replace it with an equivalent CSS composition.

## Conversion Principles

- Preserve the logical order of the original content.
- Transform common Markdown into short slides, with one main idea per slide.
- Use `cover` for opening, `section-cover` for block changes, `content` for explanation, `cards` for categories, `timeline` for historical sequences, `quote` for critical thesis and `closing` for conclusion.
- If a slide has too much text, divide it into more than one `content` slide.
- Remove unused placeholders before final rendering.
- Do not leave instruction comments in the final filled file, except if the file is still a template.
- Use `npm --prefix scripts run strip-instructions -- <file.md>` to remove instruction comments after filling.
- Do not include marks from external tools, such as "Made with Gamma".
- The final filled file should not necessarily depend on `theme.css`, `assets/` or `--allow-local-files` for basic rendering.

## Slide Types

### `embedded-style`

Use to embed necessary CSS in the final Marp file. This block appears at the beginning of `model.md` and does not represent a slide.

Placeholders:

| Placeholder | Expected Content |
| --- | --- |
| `{{EMBEDDED_MODEL_CSS}}` | CSS necessary to render the model without depending on `theme.css`. Use the effective CSS of the model, without `@theme` header and without `@import "default"`. |

### `cover`

Use for the first slide or strong opening.

Placeholders:

| Placeholder | Expected Content |
| --- | --- |
| `{{CONTENT_TITLE}}` | Main title of the presentation. |
| `{{CONTENT_SUBTITLE}}` | Subtitle, guiding question or short thesis. |
| `{{CONTENT_META}}` | Authorship, class, event or date. Optional. |
| `{{COVER_IMAGE}}` | Path of background image. Optional when the theme already defines a background. |

### `section-cover`

Use to separate thematic blocks.

Placeholders:

| Placeholder | Expected Content |
| --- | --- |
| `{{SECTION_LABEL}}` | Number, module or short marker. Optional. |
| `{{SECTION_TITLE}}` | Name of the section. |
| `{{SECTION_SUBTITLE}}` | Context phrase of the section. Optional. |

### `content`

Use for direct explanation with title and body.

Placeholders:

| Placeholder | Expected Content |
| --- | --- |
| `{{CONTENT_TITLE}}` | Title of the slide. |
| `{{CONTENT_BODY}}` | Short paragraph or Markdown list. |
| `{{CONTENT_NOTE}}` | Short note or final highlight. Optional. |

### `two-columns`

Use for comparison, cause and effect, before and after, or problem and response.

Placeholders:

| Placeholder | Expected Content |
| --- | --- |
| `{{CONTENT_TITLE}}` | Title of the slide. |
| `{{LEFT_TITLE}}` | Title of the left column. |
| `{{LEFT_BODY}}` | Text or list of the left column. |
| `{{RIGHT_TITLE}}` | Title of the right column. |
| `{{RIGHT_BODY}}` | Text or list of the right column. |

### `cards`

Use for 2 to 4 equivalent categories.

Placeholders:

| Placeholder | Expected Content |
| --- | --- |
| `{{CONTENT_TITLE}}` | Title of the card group. Optional if the layout is already self-explanatory. |
| `{{CARD_1_TITLE}}` to `{{CARD_4_TITLE}}` | Title of each card. |
| `{{CARD_1_BODY}}` to `{{CARD_4_BODY}}` | Short description of each card. |
| `{{CARD_1_ICON}}` to `{{CARD_4_ICON}}` | Icon name or path. Optional. |

### `timeline`

Use for historical sequences, processes or stages.

Placeholders:

| Placeholder | Expected Content |
| --- | --- |
| `{{CONTENT_TITLE}}` | Title of the timeline. |
| `{{TIMELINE_1_LABEL}}` to `{{TIMELINE_4_LABEL}}` | Period, number or landmark. |
| `{{TIMELINE_1_TITLE}}` to `{{TIMELINE_4_TITLE}}` | Title of the event. |
| `{{TIMELINE_1_BODY}}` to `{{TIMELINE_4_BODY}}` | Short description of the event. |

### `quote`

Use for a thesis, criticism, definition or argumentative turn.

Placeholders:

| Placeholder | Expected Content |
| --- | --- |
| `{{QUOTE_TEXT}}` | Central phrase of the slide. |
| `{{QUOTE_ATTRIBUTION}}` | Source, author or context. Optional. |

### `image-focus`

Use when the image is the main element.

Placeholders:

| Placeholder | Expected Content |
| --- | --- |
| `{{CONTENT_TITLE}}` | Short title. Optional. |
| `{{IMAGE_SRC}}` | Image path. |
| `{{IMAGE_ALT}}` | Alternative text or description. |
| `{{IMAGE_CAPTION}}` | Short caption. Optional. |

### `closing`

Use for closing, final question or call to action.

Placeholders:

| Placeholder | Expected Content |
| --- | --- |
| `{{CLOSING_TITLE}}` | Final message. |
| `{{CLOSING_SUBTITLE}}` | Addition, question or next step. Optional. |

## Rules for Creating `presentation-marp.md`

1. Start with the common Markdown input.
2. Identify the role of each block: opening, section, explanation, list, comparison, timeline, quote or conclusion.
3. Choose the corresponding slide type.
4. Copy the appropriate block from `model.md`.
5. Replace the `{{...}}` placeholders.
6. Remove empty optional placeholders.
7. Include in the final file a `<style>...</style>` block with necessary CSS from the model.
8. Include essential assets as data URI or replace with CSS when possible.
9. Run `npm --prefix scripts run strip-instructions -- <file.md>` on the filled Marp file.
10. Render with Marp CLI without depending on `--theme` for the final file.
11. Validate visually before exporting to PPTX.

## Quality Checklist

- The presentation renders in 16:9.
- Each slide has one main idea.
- No `{{...}}` placeholders remain in the final file.
- No instruction comments remain in the final file, except in templates.
- Marp class directives, such as `<!-- _class: cover -->`, were preserved.
- Necessary CSS is embedded in the final file.
- The final file renders without necessarily depending on `theme.css`.
- Text fits on the slide without overlap.
- Essential assets were included or replaced with CSS.
- PDF, HTML, PNG preview and PPTX are generated by Node tools.
