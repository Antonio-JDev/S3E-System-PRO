export function formatWhatsappListTime(iso: string, now = new Date()): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yest.getDate() &&
      d.getMonth() === yest.getMonth() &&
      d.getFullYear() === yest.getFullYear();
    if (isYesterday) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return '';
  }
}

export type WhatsappListPreviewKind = 'text' | 'audio' | 'image' | 'video' | 'sticker' | 'document';

export function classifyWhatsappListPreview(raw: string): {
  kind: WhatsappListPreviewKind;
  text: string;
} {
  const text = (raw || '').replace(/\s+/g, ' ').trim();
  const lower = text.toLowerCase();
  if (!text) return { kind: 'text', text: '' };
  if (lower.includes('🎤') || /(^|\s)áudio(\s|$)/i.test(text) || lower.startsWith('audio')) {
    return { kind: 'audio', text: text.replace(/^🎤\s*/, '') || 'Áudio' };
  }
  if (lower.includes('📷') || lower.startsWith('imagem') || lower === 'image') {
    return { kind: 'image', text: 'Foto' };
  }
  if (lower.includes('🎥') || lower.startsWith('vídeo') || lower.startsWith('video')) {
    return { kind: 'video', text: 'Vídeo' };
  }
  if (lower.includes('figurinha') || lower.includes('🟩')) {
    return { kind: 'sticker', text: 'Figurinha' };
  }
  if (lower.includes('📄') || lower.startsWith('documento')) {
    return { kind: 'document', text: text.replace(/^📄\s*/, '') || 'Documento' };
  }
  return { kind: 'text', text };
}

export function truncateWhatsappPreview(text: string, max = 52): string {
  const t = (text || '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trimEnd()}…`;
}
