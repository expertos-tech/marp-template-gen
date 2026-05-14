# Instrucoes do `model-01`

`model-01` e um modelo Marp generico para converter conteudo Markdown comum em apresentacoes editoriais 16:9. O visual deve ser inspirado na apresentacao de referencia sobre trabalho informal no Brasil: fundo escuro/azul, tipografia forte, secoes limpas, cards e composicoes com bastante respiro.

## Arquivos do modelo

| Arquivo | Funcao |
| --- | --- |
| `model.md` | Template Marp com placeholders `{{...}}` e comentarios HTML de orientacao. |
| `theme.css` | Tema Marp oficial com `/* @theme model-01 */`. |
| `assets/` | Imagens e fundos usados pelo tema e pelos slides. |
| `instructions.md` | Este contrato de uso e conversao. |

Nao crie `README.md` dentro de `model-01`. O indice geral fica em `../README.md`.

O template pode ser modular, mas o arquivo Markdown Marp gerado deve ser autossuficiente. Ao gerar uma apresentacao final, incorpore no proprio `.md` os estilos necessarios derivados de `theme.css`. Se houver imagem essencial, incorpore como data URI ou substitua por uma composicao CSS equivalente.

## Principios de conversao

- Preserve a ordem argumentativa do conteudo original.
- Transforme Markdown comum em slides curtos, com uma ideia principal por slide.
- Use `cover` para abertura, `section-cover` para mudancas de bloco, `content` para explicacao, `cards` para categorias, `timeline` para sequencias historicas, `quote` para tese critica e `closing` para conclusao.
- Se um slide tiver texto demais, divida em mais de um slide `content`.
- Remova placeholders nao usados antes da renderizacao final.
- Nao deixe comentarios de instrucao no arquivo final preenchido, exceto se o arquivo ainda for um template.
- Use `npm --prefix scripts run strip-instructions -- <arquivo.md>` para remover comentarios de instrucao depois do preenchimento.
- Nao inclua marcas de ferramenta externa, como "Feito com Gamma".
- O arquivo final preenchido nao deve depender obrigatoriamente de `theme.css`, `assets/` ou `--allow-local-files` para renderizacao basica.

## Tipos de slides

### `embedded-style`

Use para embutir o CSS necessario no arquivo Marp final. Este bloco aparece no inicio de `model.md` e nao representa um slide.

Placeholders:

| Placeholder | Conteudo esperado |
| --- | --- |
| `{{EMBEDDED_MODEL_CSS}}` | CSS necessario para renderizar o modelo sem depender de `theme.css`. Use o CSS efetivo do modelo, sem cabecalho `@theme` e sem `@import "default"`. |

### `cover`

Use para o primeiro slide ou abertura forte.

Placeholders:

| Placeholder | Conteudo esperado |
| --- | --- |
| `{{CONTENT_TITLE}}` | Titulo principal da apresentacao. |
| `{{CONTENT_SUBTITLE}}` | Subtitulo, pergunta-guia ou tese curta. |
| `{{CONTENT_META}}` | Autoria, turma, evento ou data. Opcional. |
| `{{COVER_IMAGE}}` | Caminho de imagem de fundo. Opcional quando o tema ja define fundo. |

### `section-cover`

Use para separar blocos tematicos.

Placeholders:

| Placeholder | Conteudo esperado |
| --- | --- |
| `{{SECTION_LABEL}}` | Numero, modulo ou marcador curto. Opcional. |
| `{{SECTION_TITLE}}` | Nome da secao. |
| `{{SECTION_SUBTITLE}}` | Frase de contexto da secao. Opcional. |

### `content`

Use para explicacao direta com titulo e corpo.

Placeholders:

| Placeholder | Conteudo esperado |
| --- | --- |
| `{{CONTENT_TITLE}}` | Titulo do slide. |
| `{{CONTENT_BODY}}` | Paragrafo curto ou lista Markdown. |
| `{{CONTENT_NOTE}}` | Observacao curta ou destaque final. Opcional. |

### `two-columns`

Use para comparacao, causa/efeito, antes/depois ou problema/resposta.

Placeholders:

| Placeholder | Conteudo esperado |
| --- | --- |
| `{{CONTENT_TITLE}}` | Titulo do slide. |
| `{{LEFT_TITLE}}` | Titulo da coluna esquerda. |
| `{{LEFT_BODY}}` | Texto ou lista da coluna esquerda. |
| `{{RIGHT_TITLE}}` | Titulo da coluna direita. |
| `{{RIGHT_BODY}}` | Texto ou lista da coluna direita. |

### `cards`

Use para 2 a 4 categorias equivalentes.

Placeholders:

| Placeholder | Conteudo esperado |
| --- | --- |
| `{{CONTENT_TITLE}}` | Titulo do grupo de cards. Opcional se o layout ja for autoexplicativo. |
| `{{CARD_1_TITLE}}` a `{{CARD_4_TITLE}}` | Titulo de cada card. |
| `{{CARD_1_BODY}}` a `{{CARD_4_BODY}}` | Descricao curta de cada card. |
| `{{CARD_1_ICON}}` a `{{CARD_4_ICON}}` | Nome ou caminho de icone. Opcional. |

### `timeline`

Use para sequencias historicas, processos ou etapas.

Placeholders:

| Placeholder | Conteudo esperado |
| --- | --- |
| `{{CONTENT_TITLE}}` | Titulo da linha do tempo. |
| `{{TIMELINE_1_LABEL}}` a `{{TIMELINE_4_LABEL}}` | Periodo, numero ou marco. |
| `{{TIMELINE_1_TITLE}}` a `{{TIMELINE_4_TITLE}}` | Titulo do evento. |
| `{{TIMELINE_1_BODY}}` a `{{TIMELINE_4_BODY}}` | Descricao curta do evento. |

### `quote`

Use para uma tese, critica, definicao ou virada argumentativa.

Placeholders:

| Placeholder | Conteudo esperado |
| --- | --- |
| `{{QUOTE_TEXT}}` | Frase central do slide. |
| `{{QUOTE_ATTRIBUTION}}` | Fonte, autor ou contexto. Opcional. |

### `image-focus`

Use quando a imagem for o elemento principal.

Placeholders:

| Placeholder | Conteudo esperado |
| --- | --- |
| `{{CONTENT_TITLE}}` | Titulo curto. Opcional. |
| `{{IMAGE_SRC}}` | Caminho da imagem. |
| `{{IMAGE_ALT}}` | Texto alternativo ou descricao. |
| `{{IMAGE_CAPTION}}` | Legenda curta. Opcional. |

### `closing`

Use para encerramento, pergunta final ou chamada de acao.

Placeholders:

| Placeholder | Conteudo esperado |
| --- | --- |
| `{{CLOSING_TITLE}}` | Mensagem final. |
| `{{CLOSING_SUBTITLE}}` | Complemento, pergunta ou proximo passo. Opcional. |

## Regras para criar `apresentacao-marp.md`

1. Comece pelo Markdown comum de entrada.
2. Identifique o papel de cada bloco: abertura, secao, explicacao, lista, comparacao, timeline, citacao ou conclusao.
3. Escolha o tipo de slide correspondente.
4. Copie o bloco apropriado de `model.md`.
5. Substitua os placeholders `{{...}}`.
6. Remova placeholders opcionais vazios.
7. Incorpore no arquivo final um bloco `<style>...</style>` com o CSS necessario do modelo.
8. Incorpore assets essenciais como data URI ou substitua por CSS quando possivel.
9. Execute `npm --prefix scripts run strip-instructions -- <arquivo.md>` no arquivo Marp preenchido.
10. Renderize com Marp CLI sem depender de `--theme` para o arquivo final.
11. Valide visualmente antes de exportar para PPTX.

## Checklist de qualidade

- A apresentacao renderiza em 16:9.
- Cada slide tem uma ideia principal.
- Nenhum placeholder `{{...}}` sobrou no arquivo final.
- Nenhum comentario de instrucao sobrou no arquivo final, salvo em templates.
- Diretivas Marp de classe, como `<!-- _class: cover -->`, foram preservadas.
- O CSS necessario esta embutido no arquivo final.
- O arquivo final renderiza sem depender obrigatoriamente de `theme.css`.
- O texto cabe no slide sem sobreposicao.
- Assets essenciais foram incorporados ou substituidos por CSS.
- PDF, HTML, PNG preview e PPTX sao gerados por ferramentas Node.
