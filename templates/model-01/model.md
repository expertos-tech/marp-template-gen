---
marp: true
theme: default
size: 16:9
paginate: false
---

<!--
Tipo: embedded-style
Uso: tornar o Markdown Marp final autossuficiente.
Instrucao: substitua EMBEDDED_MODEL_CSS pelo CSS necessario do modelo antes da renderizacao final.
Obrigatorio: arquivos Marp gerados devem manter este bloco <style> preenchido para nao depender de theme.css.
-->
<style>
{{EMBEDDED_MODEL_CSS}}
</style>

<!--
Tipo: cover
Uso: abertura principal da apresentacao.
Instrucao: substitua CONTENT_TITLE pelo titulo central e CONTENT_SUBTITLE por uma pergunta-guia ou tese curta.
Opcional: remova CONTENT_META se nao houver autoria, data, turma ou evento.
Opcional: COVER_IMAGE pode apontar para uma imagem de fundo quando o tema nao definir uma imagem padrao.
-->
<!-- _class: cover -->
<!-- COVER_IMAGE: {{COVER_IMAGE}} -->

# {{CONTENT_TITLE}}

## {{CONTENT_SUBTITLE}}

{{CONTENT_META}}

---

<!--
Tipo: section-cover
Uso: abertura de bloco tematico ou mudanca de assunto.
Instrucao: SECTION_TITLE deve nomear a secao. SECTION_LABEL pode ser numero, modulo ou marcador curto.
Opcional: remova SECTION_LABEL e SECTION_SUBTITLE se nao forem necessarios.
-->
<!-- _class: section-cover -->

{{SECTION_LABEL}}

# {{SECTION_TITLE}}

{{SECTION_SUBTITLE}}

---

<!--
Tipo: content
Uso: explicacao direta com titulo e corpo.
Instrucao: CONTENT_BODY aceita paragrafo curto ou lista Markdown.
Opcional: CONTENT_NOTE deve ser usado apenas para um destaque final curto.
-->
<!-- _class: content -->

# {{CONTENT_TITLE}}

{{CONTENT_BODY}}

{{CONTENT_NOTE}}

---

<!--
Tipo: two-columns
Uso: comparacao, causa e efeito, antes e depois, problema e resposta.
Instrucao: mantenha as duas colunas equilibradas em volume de texto.
-->
<!-- _class: two-columns -->

# {{CONTENT_TITLE}}

<div class="columns">
<div>

## {{LEFT_TITLE}}

{{LEFT_BODY}}

</div>
<div>

## {{RIGHT_TITLE}}

{{RIGHT_BODY}}

</div>
</div>

---

<!--
Tipo: cards
Uso: conjunto de 2 a 4 categorias equivalentes.
Instrucao: remova cards nao usados. Cada card deve ter titulo curto e descricao objetiva.
Opcional: CARD_X_ICON pode ser texto, nome de icone ou caminho de asset, conforme o tema suportar.
-->
<!-- _class: cards -->

# {{CONTENT_TITLE}}

<div class="cards-grid">
<article>

{{CARD_1_ICON}}

## {{CARD_1_TITLE}}

{{CARD_1_BODY}}

</article>
<article>

{{CARD_2_ICON}}

## {{CARD_2_TITLE}}

{{CARD_2_BODY}}

</article>
<article>

{{CARD_3_ICON}}

## {{CARD_3_TITLE}}

{{CARD_3_BODY}}

</article>
<article>

{{CARD_4_ICON}}

## {{CARD_4_TITLE}}

{{CARD_4_BODY}}

</article>
</div>

---

<!--
Tipo: timeline
Uso: sequencia historica, processo ou etapas numeradas.
Instrucao: use LABEL para periodo ou numero, TITLE para o marco e BODY para a explicacao.
Opcional: remova itens nao usados.
-->
<!-- _class: timeline -->

# {{CONTENT_TITLE}}

<ol class="timeline-list">
<li>

<span>{{TIMELINE_1_LABEL}}</span>

## {{TIMELINE_1_TITLE}}

{{TIMELINE_1_BODY}}

</li>
<li>

<span>{{TIMELINE_2_LABEL}}</span>

## {{TIMELINE_2_TITLE}}

{{TIMELINE_2_BODY}}

</li>
<li>

<span>{{TIMELINE_3_LABEL}}</span>

## {{TIMELINE_3_TITLE}}

{{TIMELINE_3_BODY}}

</li>
<li>

<span>{{TIMELINE_4_LABEL}}</span>

## {{TIMELINE_4_TITLE}}

{{TIMELINE_4_BODY}}

</li>
</ol>

---

<!--
Tipo: quote
Uso: tese, critica, definicao, insight ou virada argumentativa.
Instrucao: QUOTE_TEXT deve ser uma frase forte e curta o bastante para leitura em tela.
Opcional: remova QUOTE_ATTRIBUTION se nao houver fonte, autoria ou contexto.
-->
<!-- _class: quote -->

> {{QUOTE_TEXT}}

{{QUOTE_ATTRIBUTION}}

---

<!--
Tipo: image-focus
Uso: slide em que a imagem e o elemento principal.
Instrucao: IMAGE_SRC deve ser caminho local ou URL autorizada. IMAGE_ALT descreve a imagem.
Opcional: CONTENT_TITLE e IMAGE_CAPTION podem ser removidos quando a imagem for autoexplicativa.
-->
<!-- _class: image-focus -->

# {{CONTENT_TITLE}}

![{{IMAGE_ALT}}]({{IMAGE_SRC}})

{{IMAGE_CAPTION}}

---

<!--
Tipo: closing
Uso: encerramento, pergunta final ou chamada de acao.
Instrucao: CLOSING_TITLE deve ser a mensagem final. CLOSING_SUBTITLE complementa ou aponta o proximo passo.
Opcional: remova CLOSING_SUBTITLE quando o encerramento for apenas uma frase.
-->
<!-- _class: closing -->

# {{CLOSING_TITLE}}

## {{CLOSING_SUBTITLE}}
