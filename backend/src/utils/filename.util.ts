/**
 * Nomes de arquivo em anexos WhatsApp / downloads: UTF-8, NFC e correção de mojibake
 * (UTF-8 lido como Latin-1), sem perder acentos no envio à Evolution nem no JSON da API.
 */

function repairUtf8MojibakeLatin1Chunk(chunk: string): string {
  if (!chunk) return chunk;
  try {
    const bytes = new Uint8Array(chunk.length);
    for (let i = 0; i < chunk.length; i += 1) {
      bytes[i] = chunk.charCodeAt(i) & 0xff;
    }
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return decoded !== chunk ? decoded : chunk;
  } catch {
    return chunk;
  }
}

/** UTF-8 interpretado como Latin-1, inclusive após emoji / travessão (trechos U+00FF). */
export function repairUtf8Mojibake(s: string): string {
  if (!s || typeof s !== 'string') return s;
  let out = '';
  let i = 0;
  while (i < s.length) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      const c2 = s.charCodeAt(i + 1);
      if (c2 >= 0xdc00 && c2 <= 0xdfff) {
        out += s.slice(i, i + 2);
        i += 2;
        continue;
      }
    }
    if (c > 0xff) {
      out += s[i];
      i += 1;
      continue;
    }
    let j = i + 1;
    while (j < s.length) {
      const cc = s.charCodeAt(j);
      if (cc >= 0xd800 && cc <= 0xdbff && j + 1 < s.length) {
        const c2 = s.charCodeAt(j + 1);
        if (c2 >= 0xdc00 && c2 <= 0xdfff) break;
      }
      if (cc > 0xff) break;
      j += 1;
    }
    out += repairUtf8MojibakeLatin1Chunk(s.slice(i, j));
    i = j;
  }
  return out;
}

function tryDecodeURIComponentOnce(name: string): string {
  if (!/%[0-9a-fA-F]{2}/.test(name)) return name;
  try {
    const d = decodeURIComponent(name);
    if (d && d !== name) return d;
  } catch {
    /* ignore */
  }
  return name;
}

/**
 * Nome seguro para gravar no BD / enviar ao provedor: trim, decode acidental de URL,
 * mojibake, NFC, sem path separators.
 */
export function normalizeUserFilename(raw: string | undefined | null, maxLen = 255): string {
  let s = (raw || '').trim();
  if (!s) return '';
  s = tryDecodeURIComponentOnce(s);
  s = repairUtf8Mojibake(s);
  try {
    s = s.normalize('NFC');
  } catch {
    /* ignore */
  }
  s = s.replace(/[/\\]/g, '_').slice(0, maxLen).trim();
  return s;
}

export function normalizeUserFilenameOrFallback(raw: string | undefined | null, fallback: string, maxLen = 255): string {
  const n = normalizeUserFilename(raw, maxLen);
  if (n) return n;
  const f = normalizeUserFilename(fallback, maxLen);
  return f || 'arquivo';
}

export function normalizeStoredMediaFilename(raw: string | undefined | null): string | undefined {
  const n = normalizeUserFilename(raw, 255);
  return n || undefined;
}

/** Fallback ASCII para o parâmetro `filename=` legado (RFC 2616). */
export function asciiDispositionFallback(name: string, hardFallback: string): string {
  const base = normalizeUserFilenameOrFallback(name, hardFallback, 200);
  let s = base;
  try {
    s = base.normalize('NFD').replace(/\p{M}/gu, '');
  } catch {
    s = base;
  }
  s = s.replace(/[^\x20-\x7E]/g, '_').replace(/[/\\?%*:|"<>]/g, '_');
  s = s.replace(/"/g, '_').trim();
  return (s.slice(0, 120) || 'arquivo').replace(/\s+/g, ' ');
}

export function buildContentDisposition(
  kind: 'attachment' | 'inline',
  filename: string,
  fallback = 'arquivo'
): string {
  const name = normalizeUserFilenameOrFallback(filename, fallback, 200);
  const ascii = asciiDispositionFallback(name, fallback).replace(/\\/g, '_');
  const star = encodeURIComponent(name);
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${star}`;
}

/** Alias semântico: “sanitizar” = normalizar (NFC, mojibake, path) — acentos são preservados. */
export { normalizeUserFilename as sanitizeFilename };
