# Marp Template Gen

This project organizes reusable models to generate presentations with Marp from Markdown content.

The goal is to maintain a clear workflow to transform structured text into a presentation with consistent visual identity, using versioned templates, filling instructions and Node commands for rendering and export.

Templates can be modular, but generated Marp Markdown files must be self-contained: the final `.md` must include internally the styles and essential assets for basic rendering.

## Quick Start

This project uses a `*` prefix before short commands as a standard for instructions (for example: `*to-marp`), which can be used directly in the chat and work with most agents. These shortcuts automate complex tasks, validate paths and ensure that presentations follow the repository's quality standards.

#### 1. Convert Markdown to Slides
Transform common text into a Marp presentation (Model 01) in the temporary folder for review:

```bash
*to-marp 01 sample-data/apresentacao-exemplo.md ./tmp/
```
*The generated file will be `tmp/apresentacao-exemplo-slides.md`.*

#### 2. Export the Presentation
Generate final files from the validated Marp Markdown:

```bash
# Generate PDF
*marp-export pdf tmp/apresentacao-exemplo-slides.md

# Generate HTML
*marp-export html tmp/apresentacao-exemplo-slides.md

# Generate PowerPoint
*marp-export pptx tmp/apresentacao-exemplo-slides.md
```

## Project Structure

```text
.
├── README.md
├── sample-data/
│   └── apresentacao-exemplo.md
├── scripts/
│   ├── README.md
│   └── package.json
├── templates/
│   ├── README.md
│   └── model-01/
│       ├── assets/
│       ├── instructions.md
│       ├── model.md
│       └── theme.css
└── .gitignore
```

## Folder `sample-data/`

`sample-data/` stores versioned examples of common Markdown for conversion testing.

Usage difference:

- `sample-data/`: permanent and reusable examples.
- `tmp/`: temporary and disposable files for local validation.

## Folder `templates/`

The `templates/` folder contains general documentation of the models and the index of available templates.

Read [`templates/README.md`](./templates/README.md) for details about:

- conversion workflow;
- model conventions;
- expected Node commands;
- interactive validation by waves;
- index of available models.

## Model `model-01`

The first project model will be `templates/model-01/`.

It will consist of:

- `model.md`: Marp template with generic placeholders `{{...}}`;
- `instructions.md`: usage contract, slide types and conversion rules;
- `theme.css`: Marp visual theme;
- `assets/`: images and backgrounds used by the theme.

The file [`templates/model-01/instructions.md`](./templates/model-01/instructions.md) defines the planned slide types, such as `cover`, `section-cover`, `content`, `cards`, `timeline`, `quote` and `closing`.

## Tools

Generations, previews and exports should use Node tools, installed in the project or run via `npx`.

The expected pipeline covers:

- Common Markdown;
- Filled Marp Markdown;
- PDF;
- HTML;
- Preview PNG;
- PPTX, when supported by available Node tools.

Local utilities are in [`scripts/`](./scripts/README.md) and should be run via npm:

```bash
npm --prefix scripts install
npm --prefix scripts run pre-run
```
