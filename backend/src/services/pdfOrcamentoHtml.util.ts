/** Remove <p> dentro de <li> preservando atributos do li (ex.: margin-left do recuo). */
export function normalizeListItemsForPdf(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<li([^>]*)>\s*<p[^>]*>/gi, '<li$1>')
    .replace(/<\/p>\s*<\/li>/gi, '</li>');
}

/** Preserva ENTER ENTER no PDF: TipTap salva parágrafos vazios como <p></p> / <p><br></p>. */
export function normalizeEmptyParagraphsForPdf(html: string | null | undefined): string {
  if (!html) return '';
  let out = html;
  out = out.replace(/<p([^>]*)>\s*<\/p>/gi, '<p$1 class="tiptap-empty-paragraph">&nbsp;</p>');
  out = out.replace(
    /<p([^>]*)>\s*<br\s*\/?>\s*<\/p>/gi,
    '<p$1 class="tiptap-empty-paragraph">&nbsp;</p>'
  );
  return out;
}

export function formatCurrencyBR(value: number): string {
  return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function escapeHtmlAttr(value: string): string {
  return value.replace(/"/g, '&quot;');
}
