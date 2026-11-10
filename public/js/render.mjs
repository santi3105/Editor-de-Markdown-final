// ============================================================
// render.mjs — Markdown -> HTML seguro (marked + DOMPurify)
// Las dos librerías se cargan como <script> en index.html y
// quedan como variables globales (marked, DOMPurify).
// ============================================================

marked.setOptions({ breaks: true, gfm: true });

/**
 * Convierte Markdown en HTML ya sanitizado. DOMPurify elimina scripts y
 * atributos peligrosos (onerror, onclick...) que alguien pudiera escribir
 * dentro del texto: esta es la defensa contra XSS, porque el resultado
 * se inserta con innerHTML.
 */
export function renderMarkdown(textoMarkdown) {
  return DOMPurify.sanitize(marked.parse(textoMarkdown));
}
