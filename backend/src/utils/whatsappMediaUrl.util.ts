/**
 * Converte URLs de mídia do provedor WhatsApp (públicas, localhost, path /api/files/…) em URL interna do backend → provedor.
 * Evita bloquear o proxy quando o webhook manda http://localhost:3333/… e WHATSAPP_PROVIDER_BASE_URL é http://whatsapp-provider:8080.
 */
function allowedExternalMediaHosts(): string[] {
  const raw = process.env.WHATSAPP_MEDIA_ALLOWED_HOSTS || '';
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

function isPrivateOrLocalHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h === '0.0.0.0' || h === '127.0.0.1' || h === '::1') return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(h)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(h)) return true;
  if (/^169\.254\.\d+\.\d+$/.test(h)) return true;
  const m172 = h.match(/^172\.(\d+)\.\d+\.\d+$/);
  if (m172) {
    const second = Number(m172[1]);
    if (Number.isFinite(second) && second >= 16 && second <= 31) return true;
  }
  return false;
}

function hostMatchesAllowed(host: string, allowed: string): boolean {
  if (!allowed) return false;
  if (allowed.startsWith('*.')) {
    const suffix = allowed.slice(1);
    return host.endsWith(suffix);
  }
  return host === allowed;
}

export function resolveWhatsappProviderInternalFetchUrl(rawUrl: string): string | null {
  const u = rawUrl.trim();
  if (!u) return null;

  const providerBase = (process.env.WHATSAPP_PROVIDER_BASE_URL || 'http://whatsapp-provider:8080').replace(/\/$/, '');
  const pub = process.env.WHATSAPP_PROVIDER_PUBLIC_URL?.trim().replace(/\/$/, '');

  if (pub && u.startsWith(pub)) {
    return providerBase + u.slice(pub.length);
  }
  if (u.startsWith(providerBase)) {
    return u;
  }

  let parsed: URL;
  try {
    parsed = new URL(u);
  } catch {
    return null;
  }

  const pathWithQuery = parsed.pathname + parsed.search;
  const p = pathWithQuery.toLowerCase();

  const looksLikeProviderMediaPath =
    p.includes('/api/files/') ||
    p.includes('/api/files?') ||
    /\/api\/[^/]*files/i.test(pathWithQuery);

  if (looksLikeProviderMediaPath) {
    return `${providerBase}${pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`}`;
  }

  const host = parsed.hostname.toLowerCase();
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
  if (isLocal && pathWithQuery.startsWith('/api/')) {
    return `${providerBase}${pathWithQuery}`;
  }

  if (parsed.protocol !== 'https:') {
    return null;
  }
  if (isPrivateOrLocalHost(host)) {
    return null;
  }
  const allowedHosts = allowedExternalMediaHosts();
  if (!allowedHosts.some((allowed) => hostMatchesAllowed(host, allowed))) {
    return null;
  }

  return parsed.toString();
}

export function sanitizeDownloadFilename(name: string | undefined, fallback: string): string {
  const base = (name || fallback || 'arquivo').trim() || 'arquivo';
  return base.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 180);
}

/** PDF, planilhas e documentos Office: melhor como download do que abrir JSON de erro no navegador. */
export function shouldUseAttachmentDisposition(contentType: string | null | undefined): boolean {
  const c = (contentType || '').toLowerCase();
  if (!c) return false;
  if (c.includes('pdf')) return true;
  if (c.includes('spreadsheetml.sheet') || c.includes('ms-excel') || c.includes('spreadsheet')) return true;
  if (c.includes('wordprocessingml.document') || c.includes('msword')) return true;
  if (c === 'application/zip' || c.startsWith('application/zip')) return true;
  return false;
}

export function parseFilenameFromMediaUrl(urlStr: string): string | undefined {
  try {
    const u = new URL(urlStr);
    const last = u.pathname.split('/').filter(Boolean).pop();
    if (last && last.length > 0 && last.length < 220) {
      return decodeURIComponent(last);
    }
  } catch {
    /* ignore */
  }
  return undefined;
}
