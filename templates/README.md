# Templates Marp

Este diretorio concentra modelos reutilizaveis para transformar conteudo Markdown comum em apresentacoes Marp.

## Modelos disponiveis

| Modelo | Uso principal | Instrucoes |
| --- | --- | --- |
| `model-01` | Apresentacoes editoriais em 16:9 com capa visual, secoes, conteudo, cards, linha do tempo, imagem e fechamento | [`model-01/instructions.md`](./model-01/instructions.md) |

## Fluxo de conversao

O fluxo padrao tem quatro arquivos conceituais:

1. Markdown comum de entrada, sem diretivas Marp.
2. `model.md`, que define a estrutura generica com placeholders `{{...}}`.
3. Markdown Marp preenchido, por exemplo `apresentacao-marp.md`.
4. Artefatos exportados: PDF, HTML, PNG de preview e PPTX.

O `model.md` nao substitui placeholders automaticamente. Ele e um contrato de preenchimento: cada `{{CHAVE}}` deve ser trocada pelo conteudo final, e os comentarios HTML explicam o papel de cada chave.

O Markdown Marp final deve ser autossuficiente. O template pode usar `theme.css` e `assets/` como fontes de organizacao, mas o arquivo gerado deve embutir os estilos necessarios no proprio `.md`, preferencialmente em um bloco `<style>...</style>`, e nao depender de arquivos externos para renderizacao basica.

Depois do preenchimento, remova os comentarios de instrucao com o script deterministicamente:

```bash
npm --prefix scripts run strip-instructions -- apresentacao-marp.md
```

Esse script preserva diretivas Marp essenciais, como `<!-- _class: cover -->`, e remove comentarios HTML de orientacao que nao devem ir para o arquivo final.

## Ferramentas Node

Todas as geracoes e exportacoes devem usar ferramentas Node instaladas no projeto ou executadas via `npx`.

Antes de usar os scripts locais, instale a pasta `scripts/`:

```bash
npm --prefix scripts install
```

Antes de conversoes e validacoes, rode o preflight:

```bash
npm --prefix scripts run pre-run
```

Comandos esperados apos a criacao do `package.json`:

```bash
npm run render:pdf -- templates/model-01/apresentacao-marp.md
npm run render:html -- templates/model-01/apresentacao-marp.md
npm run render:preview -- templates/model-01/apresentacao-marp.md
npm run render:pptx -- templates/model-01/apresentacao-marp.md
```

Para validar o template modular diretamente, o comando base do Marp CLI pode registrar o tema local:

```bash
npx marp --theme ./templates/model-01/theme.css arquivo.md -o arquivo.pdf
```

Para arquivos Marp finais gerados, prefira renderizar sem `--theme`, pois o CSS necessario deve estar embutido no proprio Markdown.

## Convencoes

- Todo modelo deve ter um `model.md` com placeholders genericos.
- Todo modelo deve ter um `instructions.md` documentando tipos de slides, placeholders e regras de conversao.
- A raiz `templates/README.md` e o unico README da area de templates.
- Modelos individuais nao devem ter `README.md`; use `instructions.md`.
- Assets devem ficar dentro da pasta do proprio modelo.
- Arquivos Marp finais gerados devem ser autossuficientes: CSS embutido e assets essenciais incorporados ou substituidos.
- Saidas geradas devem ficar em uma pasta `output/` do modelo ou em caminho temporario combinado na etapa de validacao.

## Validacao interativa

A implementacao deste projeto deve seguir ondas:

1. Validar documentacao e taxonomia do modelo.
2. Validar `model.md`.
3. Validar scripts Node, `pre-run` e limpeza de comentarios de instrucao no Markdown preenchido.
4. Validar tema visual e assets.
5. Validar conversao de conteudo real para Marp.
6. Validar exportacoes PDF, HTML, PNG e PPTX.

Cada onda deve apresentar arquivos alterados, comandos usados, resultados observados e pendencias antes de seguir para a proxima.
