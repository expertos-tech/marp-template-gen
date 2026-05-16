---
marp: true
theme: default
size: 16:9
paginate: false
---

<!--
Type: embedded-style
Use: make the final Marp Markdown self-contained.
Instruction: replace EMBEDDED_MODEL_CSS with necessary CSS of the model before final rendering.
Required: generated Marp files must keep this filled <style> block to not depend on theme.css.
-->
<style>
{{EMBEDDED_MODEL_CSS}}
</style>

<!--
Type: cover
Use: main opening of the presentation.
Instruction: replace CONTENT_TITLE with the central title and CONTENT_SUBTITLE with a guiding question or short thesis.
Optional: remove CONTENT_META if there is no authorship, date, class or event.
Optional: COVER_IMAGE can point to a background image when the theme does not define a default image.
-->
<!-- _class: cover -->
<!-- COVER_IMAGE: {{COVER_IMAGE}} -->

# {{CONTENT_TITLE}}

## {{CONTENT_SUBTITLE}}

{{CONTENT_META}}

---

<!--
Type: section-cover
Use: opening of thematic block or change of subject.
Instruction: SECTION_TITLE must name the section. SECTION_LABEL can be a number, module or short marker.
Optional: remove SECTION_LABEL and SECTION_SUBTITLE if they are not necessary.
-->
<!-- _class: section-cover -->

{{SECTION_LABEL}}

# {{SECTION_TITLE}}

{{SECTION_SUBTITLE}}

---

<!--
Type: content
Use: direct explanation with title and body.
Instruction: CONTENT_BODY accepts short paragraph or Markdown list.
Optional: CONTENT_NOTE should be used only for a short final highlight.
-->
<!-- _class: content -->

# {{CONTENT_TITLE}}

{{CONTENT_BODY}}

{{CONTENT_NOTE}}

---

<!--
Type: two-columns
Use: comparison, cause and effect, before and after, problem and response.
Instruction: keep the two columns balanced in text volume.
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
Type: cards
Use: set of 2 to 4 equivalent categories.
Instruction: remove unused cards. Each card should have a short title and objective description.
Optional: CARD_X_ICON can be text, icon name or asset path, depending on what the theme supports.
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
Type: timeline
Use: historical sequence, process or numbered stages.
Instruction: use LABEL for period or number, TITLE for the landmark and BODY for the explanation.
Optional: remove unused items.
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
Type: quote
Use: thesis, criticism, definition, insight or argumentative turn.
Instruction: QUOTE_TEXT should be a strong phrase and short enough for screen reading.
Optional: remove QUOTE_ATTRIBUTION if there is no source, authorship or context.
-->
<!-- _class: quote -->

> {{QUOTE_TEXT}}

{{QUOTE_ATTRIBUTION}}

---

<!--
Type: image-focus
Use: slide where the image is the main element.
Instruction: IMAGE_SRC should be a local path or authorized URL. IMAGE_ALT describes the image.
Optional: CONTENT_TITLE and IMAGE_CAPTION can be removed when the image is self-explanatory.
-->
<!-- _class: image-focus -->

# {{CONTENT_TITLE}}

![{{IMAGE_ALT}}]({{IMAGE_SRC}})

{{IMAGE_CAPTION}}

---

<!--
Type: closing
Use: closing, final question or call to action.
Instruction: CLOSING_TITLE should be the final message. CLOSING_SUBTITLE complements or points to the next step.
Optional: remove CLOSING_SUBTITLE when the closing is just one phrase.
-->
<!-- _class: closing -->

# {{CLOSING_TITLE}}

## {{CLOSING_SUBTITLE}}
