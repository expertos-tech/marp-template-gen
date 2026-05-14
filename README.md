# Marp Template Gen

Este projeto organiza modelos reutilizaveis para gerar apresentacoes com Marp a partir de conteudo Markdown.

O objetivo e manter um fluxo claro para transformar texto estruturado em uma apresentacao com identidade visual consistente, usando templates versionados, instrucoes de preenchimento e comandos Node para renderizacao/exportacao.

Os templates podem ser modulares, mas os arquivos Markdown Marp gerados devem ser autossuficientes: o `.md` final deve conter internamente os estilos e assets essenciais para renderizacao basica.

## Estrutura do projeto

```text
.
├── README.md
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

## Pasta `templates/`

A pasta `templates/` contem a documentacao geral dos modelos e o indice dos templates disponiveis.

Leia [`templates/README.md`](./templates/README.md) para detalhes sobre:

- fluxo de conversao;
- convencoes dos modelos;
- comandos Node esperados;
- validacao interativa por ondas;
- indice dos modelos disponiveis.

## Modelo `model-01`

O primeiro modelo do projeto sera `templates/model-01/`.

Ele sera composto por:

- `model.md`: template Marp com placeholders genericos `{{...}}`;
- `instructions.md`: contrato de uso, tipos de slides e regras de conversao;
- `theme.css`: tema visual Marp;
- `assets/`: imagens e fundos usados pelo tema.

O arquivo [`templates/model-01/instructions.md`](./templates/model-01/instructions.md) define os tipos de slides planejados, como `cover`, `section-cover`, `content`, `cards`, `timeline`, `quote` e `closing`.

## Ferramentas

As geracoes, previews e exportacoes devem usar ferramentas Node, instaladas no projeto ou executadas via `npx`.

O pipeline esperado cobre:

- Markdown comum;
- Markdown Marp preenchido;
- PDF;
- HTML;
- PNG de preview;
- PPTX, quando suportado pelas ferramentas Node disponiveis.

Os utilitarios locais ficam em [`scripts/`](./scripts/README.md) e devem ser executados via npm:

```bash
npm --prefix scripts install
npm --prefix scripts run pre-run
```

# marp-template-gen
