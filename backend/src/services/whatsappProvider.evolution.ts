/**
 * Helpers e tipos específicos da Evolution API v2 (doc.evolution-api.com).
 * Mantidos em arquivo separado para não inflar demais o whatsappProvider.service.
 */

/** Evolution API v2 (Node) ou Evolution Go — ambos exceto `waha`. */
export function isEvolutionProviderKind(): boolean {
  const k = (process.env.WHATSAPP_PROVIDER_KIND || 'evolution').trim().toLowerCase();
  return k !== 'waha';
}

/** Evolution Go (REST diferente da v2); usado pelo bridge em `whatsappEvolutionGoBridge.ts`. */
export function isEvolutionGoKind(): boolean {
  return (process.env.WHATSAPP_PROVIDER_KIND || '').trim().toLowerCase() === 'evolution-go';
}

/** Converte JID (5511...@c.us ou grupo @g.us) para o campo `number` da Evolution. */
export function chatIdToEvolutionNumber(chatId: string): string {
  const raw = (chatId || '').trim();
  if (!raw) return raw;
  if (raw.includes('@')) return raw;
  const d = raw.replace(/\D/g, '');
  if (!d) return raw;
  if (d.length <= 11 && !d.startsWith('55')) {
    return `55${d}`;
  }
  return d;
}

export function evolutionMediaType(
  type: 'image' | 'voice' | 'video' | 'file'
): { mediatype: string; mimetype: string; fileName: string } {
  switch (type) {
    case 'image':
      return { mediatype: 'image', mimetype: 'image/jpeg', fileName: 'image.jpg' };
    case 'video':
      return { mediatype: 'video', mimetype: 'video/mp4', fileName: 'video.mp4' };
    case 'voice':
      // Voice = nota de voz (PTT). Para o WhatsApp do destinatário exibir a barra
      // de progresso + foto do perfil (não o ícone de "arquivo"), precisamos:
      //  - `mediatype: 'audio'` no body do sendMedia (NÃO 'document');
      //  - `mimetype: 'audio/ogg; codecs=opus'` — sem o `codecs=opus`, o iOS
      //    em particular não toca inline e cai em fallback de "arquivo";
      //  - `ptt: true` no body (adicionado em sendWhatsappProviderMediaRaw).
      return { mediatype: 'audio', mimetype: 'audio/ogg; codecs=opus', fileName: 'audio.ogg' };
    case 'file':
    default:
      return { mediatype: 'document', mimetype: 'application/octet-stream', fileName: 'file.bin' };
  }
}

/** Extrai o id da mensagem na resposta Evolution (sendText / sendMedia). */
export function parseEvolutionMessageId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const nested =
    o.data && typeof o.data === 'object' && !Array.isArray(o.data) ? (o.data as Record<string, unknown>) : null;
  const target = nested || o;
  const key = target.key;
  if (key && typeof key === 'object') {
    const id = (key as Record<string, unknown>).id;
    if (typeof id === 'string' && id.length > 0) return id;
    if (typeof id === 'number' && !Number.isNaN(id)) return String(id);
  }
  return parseEvolutionMessageIdFlat(target);
}

function parseEvolutionMessageIdFlat(o: Record<string, unknown>): string | null {
  if (typeof o.id === 'string' && o.id.length > 0) return o.id;
  if (typeof o.id === 'number' && !Number.isNaN(o.id)) return String(o.id);
  if (typeof o.messageId === 'string' && o.messageId.length > 0) return o.messageId;
  return null;
}
