# Scripts

Esta pasta contem utilitarios Node para validar e preparar conversoes Markdown/Marp.

## Convencoes

- Use Node ESM com `"type": "module"` no `package.json`.
- Prefira `.mjs` para scripts executaveis.
- Use apenas APIs nativas do Node enquanto nao houver necessidade real de dependencia externa.
- Execute scripts via npm, usando `npm --prefix scripts run <script> -- <args>`.
- Mantenha validacoes deterministicas nos scripts, nao na LLM.
- Reuse validacoes de caminho e destino com utilitarios compartilhados (ex.: `validate-target.mjs`) para evitar divergencia entre comandos.
- Escreva mensagens de erro claras e acione `process.exitCode = 1` ou finalize com codigo diferente de zero.
- Use `tmp/` para entradas e saidas temporarias de teste.
- Nao grave artefatos gerados fora de `tmp/`, `output/` ou outro destino explicitamente informado.

## Instalacao

Antes de usar os comandos, rode:

```bash
npm --prefix scripts install
```

O `postinstall` cria `scripts/.npm-installed`, usado pelo `pre-run` como marcador local de instalacao.

## Comandos

```bash
npm --prefix scripts run pre-run
npm --prefix scripts run to-marp -- <model> <source> [target]
npm --prefix scripts run generate-slides -- <model> <source> [target]
npm --prefix scripts run embed-images -- <source.md> [target.md]
npm --prefix scripts run marp-export -- <type> <source.md> [target]
npm --prefix scripts run strip-instructions -- <source.md> [target.md]
```

## `pre-run`

Verifica se `npm install` ja foi executado dentro de `scripts/`.

Se o marcador `scripts/.npm-installed` nao existir, o comando falha e orienta executar:

```bash
npm --prefix scripts install
```

## `to-marp`

Valida argumentos do atalho `*to-marp`, normaliza o modelo e resolve o destino final.

Este comando ainda nao converte conteudo sozinho. Ele prepara uma saida deterministica para a etapa de conversao editorial feita pelo agente:

```text
MODEL=model-01
MODEL_DIR=/caminho/templates/model-01
SOURCE=/caminho/origem.md
TARGET=/caminho/origem-slides.md
```

## `generate-slides`

Gera um arquivo Marp final a partir de `model.md` e de um Markdown comum:

- executa o fluxo de validacao do `to-marp`;
- preenche placeholders para capa, conteudo e fechamento;
- embute CSS efetivo no bloco `<style>{{EMBEDDED_MODEL_CSS}}</style>`;
- executa `strip-instructions` automaticamente no arquivo final.
- executa `embed-images` automaticamente no arquivo final.

Comando:

```bash
npm --prefix scripts run generate-slides -- <model> <source> [target]
```

## `embed-images`

Converte imagens locais em `data:` URI base-64 em um arquivo Markdown:

- converte `![alt](path)` e `<img src="path" ...>`;
- ignora referencias `http://`, `https://` e `data:`;
- suporta `.png`, `.jpg`, `.jpeg`, `.webp` e `.svg`;
- se `target` nao for informado, sobrescreve o source com escrita segura.

Comando:

```bash
npm --prefix scripts run embed-images -- <source.md> [target.md]
```

## `marp-export`

Exporta um Markdown Marp final para artefatos via Marp CLI:

- tipos suportados: `pdf`, `html`, `png`, `pptx`;
- valida autossuficiencia minima do `.md` (bloco `<style>`, sem placeholders e sem imagem local nao embutida);
- resolve destino com as mesmas convencoes de path do fluxo `to-marp`, sem sufixo extra.

Regras de destino:

- sem `[target]`: gera no mesmo diretorio de `<source>` com extensao do tipo (`.pdf`, `.html`, `.png`, `.pptx`);
- `[target]` como diretorio existente ou terminado em `/`: gera dentro desse diretorio com mesmo nome base de `<source>`;
- `[target]` como arquivo: usa exatamente esse caminho e valida extensao compativel com o `<type>`.

Comando:

```bash
npm --prefix scripts run marp-export -- <type> <source.md> [target]
```

## `strip-instructions`

Remove comentarios HTML de instrucao de um Markdown Marp preenchido, preservando diretivas Marp de classe, como:

```markdown
<!-- _class: cover -->
```
