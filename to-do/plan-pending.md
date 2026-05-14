# Plano pendente (passo a passo)

Este arquivo descreve o passo a passo para concluir o plano original do projeto, considerando os ajustes mais recentes.

## 1) Preparar conteudo de teste (tmp)

1. Criar `tmp/apresentacao.md` como Markdown comum (sem Marp).
2. Usar o PDF apenas como referencia para montar esse texto, sem compromisso de fidelidade total.
3. Manter o arquivo enxuto e bem estruturado:
   - titulos (H1/H2)
   - listas
   - pequenos blocos de texto (para virar slides)

Criterio de aceite:

- `tmp/apresentacao.md` existe e pode ser lido como Markdown comum.

## 2) Implementar conversao de Markdown comum para Marp final

Objetivo: gerar um arquivo Marp final autossuficiente a partir de `templates/model-01/model.md`.

2.1. Criar um novo script Node em `scripts/` para gerar slides:

- arquivo sugerido: `scripts/generate-slides.mjs`
- adicionar comando npm em `scripts/package.json` como `generate-slides`

Uso sugerido:

```bash
npm --prefix scripts run generate-slides -- <model> <source> [target]
```

Regras minimas:

- Deve executar `pre-run` internamente.
- Deve reutilizar a logica de `to-marp` para resolver `MODEL_DIR`, `SOURCE` e `TARGET` (ou importar funcoes comuns para nao duplicar).
- Deve ler `templates/model-XX/model.md` e produzir um arquivo final com:
  - placeholders substituidos;
  - bloco `<style>{{EMBEDDED_MODEL_CSS}}</style>` preenchido com CSS efetivo (derivado de `templates/model-XX/theme.css`, sem `@theme` e sem `@import`).
- Deve executar `strip-instructions` automaticamente no arquivo gerado antes de sair.

Observacao:

- Nesta fase, a conversao pode ser simples: mapear secoes do Markdown comum para slides `content` e inserir `cover` e `closing` padroes.
- O objetivo inicial e um pipeline funcional, nao uma conversao perfeita.

Criterio de aceite:

- Gerar um arquivo `*-slides.md` que renderize sem `--theme` (CSS embutido).

## 3) Rodar teste ponta a ponta com o arquivo de teste

1. Rodar:

```bash
npm --prefix scripts run to-marp -- 01 tmp/apresentacao.md
```

2. Usar o destino calculado (TARGET) no gerador de slides:

```bash
npm --prefix scripts run generate-slides -- 01 tmp/apresentacao.md
```

3. Validar que o arquivo gerado:

- nao tem placeholders `{{...}}`;
- nao tem comentarios de instrucao;
- tem CSS embutido em `<style>...</style>`.

Criterio de aceite:

- `tmp/apresentacao-slides.md` existe e esta autossuficiente.

## 4) Embutir imagens como base-64

Objetivo: garantir autossuficiencia total quando houver imagens.

1. Implementar `scripts/embed-images.mjs` (ver `to-do/conversao-imagens-base64.md`).
2. Adicionar comando npm `embed-images` em `scripts/package.json`.
3. Integrar no gerador:
   - depois do `strip-instructions`, rodar `embed-images` automaticamente.

Criterio de aceite:

- imagens locais no `.md` final aparecem como `data:image/...;base64,...`.

## 5) Implementar exportacao pratica

Objetivo: dar suporte ao comando documentado `*marp-export <type> <source> [target]`.

5.1. Definir um wrapper Node (recomendado) para exportar via Marp CLI:

- arquivo sugerido: `scripts/export.mjs`
- comando npm: `marp-export`

Uso sugerido:

```bash
npm --prefix scripts run marp-export -- <type> <source.md> [target]
```

Tipos:

- `pdf`
- `html`
- `png`
- `pptx` (se suportado)

Regras:

- Validar que o arquivo e autossuficiente (CSS embutido e sem dependencias externas).
- Escrever saidas em `output/` por padrao, ou no `outdir` informado.

Criterio de aceite:

- exportacao para pelo menos `pdf` e `html` funciona com um `.md` final autossuficiente.

## 6) Evoluir com scripts deterministas (reduzir trabalho manual da LLM)

Durante as etapas acima, sempre que surgir uma tarefa mecanica repetitiva, preferir criar um script em `scripts/` em vez de deixar para a LLM:

- validacao de placeholders pendentes
- validacao de ausencia de comentarios
- extracao e normalizacao de CSS para embutir no `.md`
- relatorio de tamanho de imagens base-64
- checagens de consistencia de classes por tipo de slide

Criterio de aceite:

- o fluxo principal depende mais de scripts e menos de operacoes manuais.
