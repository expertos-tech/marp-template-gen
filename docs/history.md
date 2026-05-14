# Historico do Projeto (Marp Template Gen)

Este arquivo registra o plano completo aprovado e um historico detalhado do que foi implementado na sessao.

## Objetivo do projeto

Criar um fluxo repetivel para converter conteudo Markdown comum em apresentacoes Marp usando templates versionados.

Requisitos centrais:

- O template pode ser modular (CSS e assets separados).
- O Markdown Marp final gerado deve ser autossuficiente:
  - CSS embutido no proprio `.md` (bloco `<style>...</style>`).
  - Imagens essenciais embutidas como `data:` URI (base-64), sem depender de arquivos externos.
  - Nao depender de `--theme` para renderizacao basica do arquivo final.
- Geracoes/validacoes/exportacoes devem usar ferramentas Node.
- Execucao por ondas, com checkpoints de validacao.

## Plano aprovado (ondas)

1. **Onda 1 - Documentacao base**
   - Criar `README.md` raiz e `templates/README.md`.
   - Criar `templates/model-01/instructions.md` com taxonomia de slides e placeholders.
   - Ignorar `tmp/` no Git.

2. **Onda 2 - Template Markdown**
   - Criar `templates/model-01/model.md` com placeholders `{{...}}` e classes Marp por tipo de slide.
   - Incluir comentarios HTML de instrucao no template, para orientar preenchimento.
   - Introduzir bloco obrigatorio de CSS embutido no arquivo final (`{{EMBEDDED_MODEL_CSS}}`) e usar `theme: default`.

3. **Onda 3 - Scripts Node**
   - Criar utilitarios deterministas em `scripts/` para:
     - `pre-run` (garantir que `npm install` foi executado em `scripts/`).
     - `to-marp` (validar modelo/source/target e resolver destino).
     - `strip-instructions` (limpar comentarios HTML de instrucao, preservando `<!-- _class: ... -->`).
   - Documentar convencoes em `scripts/README.md`.
   - Atualizar `.gitignore` para `scripts/node_modules/`, marcador local e artefatos.

4. **Onda 4 - Tema visual**
   - Criar `templates/model-01/theme.css` cobrindo as classes do `model.md`.
   - Criar `templates/model-01/assets/` como fonte modular (vazio por enquanto).
   - Smoke test de renderizacao com Marp CLI via Node/npx usando arquivo em `tmp/`.

5. **Onda futura - Conteudo de teste em `tmp/`**
   - O conteudo extraido do PDF sera usado apenas como teste e deve ficar em `tmp/apresentacao.md` (Markdown comum, sem Marp).

6. **Onda futura - Implementar a conversao**
   - Implementar a conversao de Markdown comum para Marp final baseado em `templates/model-01/model.md`:
     - preencher placeholders;
     - embutir CSS no bloco `<style>...</style>`;
     - executar `strip-instructions` automaticamente.
   - Depois de implementado, rodar `to-marp` com `tmp/apresentacao.md` como teste de ponta a ponta.

7. **Onda futura - Imagens base-64 (autossuficiencia total)**
   - Implementar script Node `scripts/embed-images.mjs` e integrar no fluxo.
   - Durante a implementacao, avaliar se surgem novos passos repetitivos que merecem virarem scripts deterministas (para reduzir dependencia da LLM em tarefas mecanicas).

## O que foi implementado (historico detalhado)

### Estrutura e documentacao

- Criado `README.md` com objetivo e estrutura do projeto.
- Criado `templates/README.md` como indice e fluxo operacional.
- Criado `templates/model-01/instructions.md` com:
  - tipos de slide: `cover`, `section-cover`, `content`, `two-columns`, `cards`, `timeline`, `quote`, `image-focus`, `closing`.
  - placeholder adicional: `{{EMBEDDED_MODEL_CSS}}` para CSS embutido no arquivo final.
  - checklist de qualidade e regras de conversao.
- Criado `docs/history.md` (este arquivo).

### Regras do repositorio (AGENTS.md)

- Criado e evoluido `AGENTS.md` para pt-BR com:
  - regras nao negociaveis e de seguranca.
  - persona especializada em Markdown/Marp.
  - leitura obrigatoria (inclui `scripts/README.md` quando envolver utilitarios Node).
  - comandos publicos vs comandos internos:
    - publicos: `*help`, `*reload`, `*to-marp`, `*marp-export <type> <source> [target]`, `*save-session`, `*load-session`, comandos de git.
    - internos: `*pre-run`, `*strip-instructions`.
  - regra: comandos internos nao aparecem no help padrao, exceto via `*help --all` ou pedido especifico.
  - regra: `strip-instructions` deve rodar automaticamente depois de gerar o Markdown Marp e antes de exportar.
  - regra: Markdown Marp final deve ser autossuficiente (CSS e assets essenciais embutidos).

### Template do modelo

- Criado `templates/model-01/model.md` com:
  - frontmatter `marp: true`, `theme: default`, `size: 16:9`, `paginate: false`.
  - bloco obrigatorio `<style>{{EMBEDDED_MODEL_CSS}}</style>`.
  - blocos por tipo de slide com:
    - `<!-- _class: ... -->` por slide.
    - placeholders `{{...}}`.
    - comentarios HTML de instrucao (para remover no arquivo final).

### Tema visual

- Criado `templates/model-01/theme.css` com `@theme model-01` e estilos para:
  - `section.cover`, `section.section-cover`, `section.content`, `section.two-columns`, `section.cards`,
    `section.timeline`, `section.quote`, `section.image-focus`, `section.closing`.
  - classes auxiliares esperadas pelo template: `.columns`, `.cards-grid`, `.timeline-list`.
- Criado `templates/model-01/assets/.gitkeep` como placeholder de assets.
- Smoke test (nao versionado) em `tmp/theme-smoke.md` e PDF gerado via `npx @marp-team/marp-cli`.

### Scripts Node (scripts/)

- Criado pacote Node em `scripts/`:
  - `scripts/package.json` com ESM (`type: module`) e comandos:
    - `pre-run`
    - `to-marp`
    - `strip-instructions`
  - `scripts/README.md` com convencoes e uso.
  - `scripts/pre-run.mjs`: verifica marcador local `scripts/.npm-installed`.
  - `scripts/mark-installed.mjs`: cria `scripts/.npm-installed` no `postinstall`.
  - `scripts/to-marp.mjs`: normaliza modelo, valida entradas e resolve destino.
  - `scripts/strip-instruction-comments.mjs`: remove comentarios de instrucao e preserva `<!-- _class: ... -->`.
  - `scripts/lib.mjs`: utilitarios comuns, incluindo resolucao de paths via `INIT_CWD` do npm.
- Ajuste importante: paths relativos em scripts executados via `npm --prefix scripts` sao resolvidos com base em `INIT_CWD` (diretorio de chamada), nao em `scripts/`.
- Removidos scripts `.sh` antigos depois da migracao para Node.

### Gitignore e temporarios

- `.gitignore` inclui:
  - `tmp/`
  - `scripts/node_modules/`
  - `scripts/.npm-installed`
  - `scripts/npm-debug.log*`
  - `scripts/.cache/`
  - `scripts/output/`

### TODOs pendentes (registrados)

- Criado `to-do/conversao-imagens-base64.md` descrevendo:
  - novo script Node `scripts/embed-images.mjs`.
  - regras para detectar e converter imagens Markdown e HTML para `data:` URI base-64.
  - integracao no fluxo: preencher template, embutir CSS, strip-instructions, embed-images, export.
  - nota: durante a implementacao, identificar validacoes/transformacoes repetitivas e preferir scripts deterministas em `scripts/`.

## Estado atual (arquivos principais)

- `README.md`
- `AGENTS.md`
- `templates/README.md`
- `templates/model-01/instructions.md`
- `templates/model-01/model.md`
- `templates/model-01/theme.css`
- `scripts/README.md`
- `scripts/package.json`
- `scripts/pre-run.mjs`
- `scripts/to-marp.mjs`
- `scripts/strip-instruction-comments.mjs`
- `to-do/conversao-imagens-base64.md`

## Proximos passos recomendados

1. Criar `tmp/apresentacao.md` como Markdown comum de teste (conteudo do PDF e apenas teste).
2. Implementar a geracao real de um `.md` final a partir de `templates/model-01/model.md` (substituicao de placeholders), incluindo:
   - preenchimento de `{{EMBEDDED_MODEL_CSS}}` com CSS efetivo do modelo;
   - execucao automatica de `strip-instructions` no arquivo gerado.
3. Rodar `npm --prefix scripts run to-marp -- 01 tmp/apresentacao.md` para validar o fluxo de ponta a ponta.
4. Implementar `scripts/embed-images.mjs` e integrar no fluxo para embutir imagens base-64.
5. Definir o comando `*marp-export <type> <source> [target]` na pratica (scripts npm na raiz ou um wrapper Node), garantindo que o arquivo final nao dependa de `--theme`.
6. Durante as implementacoes, avaliar oportunidades de novos scripts deterministas em `scripts/` para tarefas mecanicas (validacoes, substituicoes repetitivas, relatorios), reduzindo trabalho manual da LLM.
