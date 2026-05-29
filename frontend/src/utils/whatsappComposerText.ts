import type { Editor } from '@tiptap/react';

/** Serializa o documento TipTap para texto plano com marcadores do WhatsApp (*bold*, _italic_). */
export function editorToWhatsappPlainText(editor: Editor): string {
  const doc = editor.state.doc;
  const blocks: string[] = [];

  doc.forEach((node) => {
    if (node.type.name === 'bulletList' || node.type.name === 'orderedList') {
      blocks.push(serializeListBlock(node));
      return;
    }
    if (node.type.name === 'paragraph') {
      blocks.push(serializeInlineContent(node));
    }
  });

  return blocks.join('\n').replace(/\n+$/, '');
}

function serializeListBlock(listNode: { type: { name: string }; forEach: (fn: (item: unknown, _i: number, index: number) => void) => void }): string {
  const ordered = listNode.type.name === 'orderedList';
  const lines: string[] = [];
  let index = 0;
  listNode.forEach((item) => {
    index += 1;
    const prefix = ordered ? `${index}. ` : '- ';
    const line = serializeListItem(item as { forEach: (fn: (n: unknown) => void) => void });
    lines.push(`${prefix}${line}`);
  });
  return lines.join('\n');
}

function serializeListItem(itemNode: { forEach: (fn: (n: { type: { name: string }; forEach?: (fn: (x: unknown) => void) => void; textContent?: string }) => void) => void }): string {
  let text = '';
  itemNode.forEach((child) => {
    if (child.type.name === 'paragraph') {
      text += serializeInlineContent(child as Parameters<typeof serializeInlineContent>[0]);
    }
  });
  return text;
}

type InlineContainer = {
  forEach: (fn: (child: { type: { name: string }; text?: string; marks?: { type: { name: string } }[] }) => void) => void;
};

function serializeInlineContent(container: InlineContainer): string {
  let out = '';
  container.forEach((child) => {
    if (child.type.name === 'hardBreak') {
      out += '\n';
      return;
    }
    if (child.type.name !== 'text' || !child.text) return;
    let chunk = child.text;
    const marks = child.marks ?? [];
    if (marks.some((m) => m.type.name === 'bold')) chunk = `*${chunk}*`;
    if (marks.some((m) => m.type.name === 'italic')) chunk = `_${chunk}_`;
    out += chunk;
  });
  return out;
}

/** Converte texto plano (restaurado após erro de envio) em conteúdo TipTap. */
export function plainTextToTiptapDoc(text: string): { type: 'doc'; content: { type: 'paragraph'; content?: { type: 'text'; text: string }[] }[] } {
  const lines = (text || '').split('\n');
  return {
    type: 'doc',
    content: lines.map((line) => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : undefined,
    })),
  };
}
