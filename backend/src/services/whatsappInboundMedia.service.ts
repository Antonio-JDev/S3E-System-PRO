/**
 * Persistência de mídia recebida via webhook quando o provedor entrega o
 * conteúdo binário inline (base64).
 *
 * Caso de uso principal: **Evolution Go** com `WEBHOOK_FILES=true` envia o
 * arquivo dentro do payload do webhook (campo `data.Message.base64`). Como a
 * `imageMessage.url` (e equivalentes) são endpoints criptografados do
 * WhatsApp, não há como buscar o arquivo depois — precisamos persistir agora.
 *
 * Estratégia: gravar em `/app/uploads/whatsapp-inbound/{messageId}.{ext}` e
 * marcar a `ChatMessage.mediaUrl` com o prefixo `local-inbound:` para que o
 * `getWhatsappMediaById` saiba servir do disco em vez de buscar no provedor.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

/** Diretório base onde os arquivos inbound são persistidos no disco. */
export const WHATSAPP_INBOUND_MEDIA_DIR = path.resolve(
  process.env.WHATSAPP_INBOUND_MEDIA_DIR || '/app/uploads/whatsapp-inbound'
);

/** Prefixo usado no campo `mediaUrl` para indicar que o conteúdo está em disco. */
export const LOCAL_INBOUND_URL_PREFIX = 'local-inbound:';

/**
 * Heurística rápida para extrair uma extensão segura a partir do
 * mimetype/filename do payload — evita confiar no filename do remetente
 * (proteção contra path-traversal e nomes maliciosos).
 */
function extensionFromHints(mimetype: string | undefined, filename: string | undefined): string {
  const cleanExt = (ext: string): string => ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 8);
  const mt = (mimetype || '').toLowerCase();
  if (mt.startsWith('image/')) {
    const sub = mt.split('/')[1] || 'jpg';
    if (sub === 'jpeg') return 'jpg';
    return cleanExt(sub) || 'jpg';
  }
  if (mt.startsWith('video/')) {
    const sub = mt.split('/')[1] || 'mp4';
    return cleanExt(sub) || 'mp4';
  }
  if (mt.startsWith('audio/')) {
    if (mt.includes('ogg')) return 'ogg';
    if (mt.includes('mpeg') || mt.includes('mp3')) return 'mp3';
    if (mt.includes('wav')) return 'wav';
    const sub = mt.split('/')[1] || 'ogg';
    return cleanExt(sub) || 'ogg';
  }
  if (mt === 'application/pdf') return 'pdf';
  if (mt.startsWith('application/')) {
    if (filename) {
      const fnExt = filename.split('.').pop();
      if (fnExt && fnExt.length <= 8) return cleanExt(fnExt) || 'bin';
    }
    return 'bin';
  }
  if (filename) {
    const fnExt = filename.split('.').pop();
    if (fnExt && fnExt.length <= 8) return cleanExt(fnExt) || 'bin';
  }
  return 'bin';
}

/** Garante que o diretório base existe. Idempotente. */
async function ensureInboundDir(): Promise<void> {
  await fs.mkdir(WHATSAPP_INBOUND_MEDIA_DIR, { recursive: true });
}

export interface SaveInboundMediaResult {
  /** Caminho absoluto do arquivo no disco. */
  filePath: string;
  /** Valor a gravar em `ChatMessage.mediaUrl` (ex.: `local-inbound:uuid.jpg`). */
  mediaUrl: string;
  /** Tamanho real gravado em bytes (útil para popular `fileSize`). */
  byteLength: number;
}

/**
 * Decodifica o base64 e grava no disco usando o `messageId` da
 * `ChatMessage` como nome (UUID v4 — seguro como filename).
 *
 * Retorna `null` quando:
 *  - base64 estiver vazio/ausente;
 *  - decodificação falhar (não loga; o caller decide o que fazer).
 */
export async function saveInboundMediaBase64ToDisk(
  messageId: string,
  base64: string,
  mimetype: string | undefined,
  filename: string | undefined
): Promise<SaveInboundMediaResult | null> {
  if (!messageId || !base64) return null;
  // Algumas variações do payload trazem o prefixo "data:image/jpeg;base64,";
  // o `Buffer.from(..., 'base64')` tolera, mas vamos remover por segurança.
  const cleanBase64 = base64.includes(',') ? base64.split(',').pop() || '' : base64;
  let buf: Buffer;
  try {
    buf = Buffer.from(cleanBase64, 'base64');
  } catch {
    return null;
  }
  if (buf.length === 0) return null;
  await ensureInboundDir();
  const ext = extensionFromHints(mimetype, filename);
  const safeName = `${messageId}.${ext}`;
  const filePath = path.join(WHATSAPP_INBOUND_MEDIA_DIR, safeName);
  await fs.writeFile(filePath, buf);
  return {
    filePath,
    mediaUrl: `${LOCAL_INBOUND_URL_PREFIX}${safeName}`,
    byteLength: buf.length
  };
}

/** Verifica se uma `mediaUrl` aponta para mídia inbound persistida localmente. */
export function isLocalInboundMediaUrl(mediaUrl: string | null | undefined): boolean {
  return typeof mediaUrl === 'string' && mediaUrl.startsWith(LOCAL_INBOUND_URL_PREFIX);
}

/**
 * Resolve uma `mediaUrl` no formato `local-inbound:{name}.{ext}` para o
 * caminho absoluto seguro no disco. Devolve `null` se a referência for
 * inválida ou tentar escapar do diretório base (path-traversal).
 */
export function resolveLocalInboundMediaPath(mediaUrl: string): string | null {
  if (!isLocalInboundMediaUrl(mediaUrl)) return null;
  const rel = mediaUrl.slice(LOCAL_INBOUND_URL_PREFIX.length).trim();
  if (!rel) return null;
  // Bloqueia separadores de path e referências relativas.
  if (rel.includes('/') || rel.includes('\\') || rel.includes('..')) return null;
  const abs = path.join(WHATSAPP_INBOUND_MEDIA_DIR, rel);
  if (!abs.startsWith(WHATSAPP_INBOUND_MEDIA_DIR)) return null;
  return abs;
}
