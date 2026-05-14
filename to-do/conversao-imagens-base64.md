# TODO: Conversao de imagens para base-64 (Markdown Marp autossuficiente)

Contexto: o projeto exige que o Markdown Marp gerado seja autossuficiente. Isso inclui imagens, que nao devem apontar para arquivos externos. O formato alvo e `data:` URI com base-64.

## Objetivo

Adicionar uma etapa automatica para embutir imagens como base-64 no arquivo `.md` final gerado, evitando dependencia de `assets/` ou caminhos locais.

## Novo script (obrigatorio)

Criar um novo script Node em `scripts/`:

- arquivo: `scripts/embed-images.mjs`
- comando npm: adicionar em `scripts/package.json` como `embed-images`
- uso:

```bash
npm --prefix scripts run embed-images -- <source.md> [target.md]
```

## Regras de conversao

O script deve:

- Ler o Markdown (Marp ou comum).
- Encontrar referencias de imagem em Markdown:
  - `![alt](path)`
  - `![](path)`
- Encontrar imagens em HTML inline:
  - `<img src="path" ...>`
- Converter apenas caminhos locais (relativos ou absolutos) para `data:` URI base-64.
- Ignorar URLs remotas (`http://`, `https://`) sem alterar.
- Preservar `alt` e atributos do `img` (exceto `src`).
- Suportar ao menos:
  - `.png` -> `data:image/png;base64,...`
  - `.jpg` / `.jpeg` -> `data:image/jpeg;base64,...`
  - `.webp` -> `data:image/webp;base64,...`
  - `.svg` -> `data:image/svg+xml;base64,...` (base-64 do arquivo inteiro)
- Resolver caminhos relativos a partir do diretório do arquivo `source.md`.
- Se `target.md` nao for informado, sobrescrever o `source.md` de forma segura (escrever em arquivo temporario e renomear).

## Validacoes e falhas

- Se um caminho de imagem local nao existir, falhar com erro claro, indicando qual caminho nao foi encontrado.
- Se o arquivo de imagem for muito grande, o script deve avisar em stderr (sem falhar) com tamanho em bytes.
  - threshold sugerido: 2 MB por imagem.
- Nao alterar o arquivo se nenhuma imagem local for encontrada (saida deve ser identica).

## Integracao no fluxo

Quando a geracao do Markdown Marp final estiver implementada:

1. Preencher `model.md` + substituir placeholders.
2. Embutir CSS no bloco `<style>...</style>` (ja existe `{{EMBEDDED_MODEL_CSS}}`).
3. Executar limpeza de comentarios de instrucao (comando interno `strip-instructions`).
4. Executar `embed-images` para embutir imagens como base-64.
5. Exportar via `*marp-export <type> <source> [target]`.

## Teste rapido (manual)

Criar um arquivo de teste em `tmp/` com uma imagem local simples e validar:

- antes: `![x](./caminho/para/imagem.png)`
- depois: `![x](data:image/png;base64,...)`

Validar que o Marp renderiza sem `--allow-local-files` e sem acesso a `assets/`.
