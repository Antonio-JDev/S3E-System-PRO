const BRASIL_API_NCM_BASE = 'https://brasilapi.com.br/api/ncm/v1';
const DEFAULT_TIMEOUT_MS = 15_000;

export type BrasilApiNcmItem = {
  codigo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  tipo_ato: string;
  numero_ato: string;
  ano_ato: string;
};

async function fetchBrasilApiJson(url: string, timeoutMs: number): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        body = { raw: text };
      }
    }
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

export async function searchNcmBrasilApi(searchTerm: string): Promise<{ status: number; body: unknown }> {
  const url = `${BRASIL_API_NCM_BASE}?search=${encodeURIComponent(searchTerm)}`;
  try {
    return await fetchBrasilApiJson(url, DEFAULT_TIMEOUT_MS);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { status: 504, body: { error: 'Tempo esgotado ao consultar Brasil API (NCM).' } };
    }
    return { status: 502, body: { error: 'Falha de rede ao consultar Brasil API (NCM).' } };
  }
}

export async function getNcmByCodeBrasilApi(code: string): Promise<{ status: number; body: unknown }> {
  const pathSegment = encodeURIComponent(code.trim());
  const url = `${BRASIL_API_NCM_BASE}/${pathSegment}`;
  try {
    return await fetchBrasilApiJson(url, DEFAULT_TIMEOUT_MS);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { status: 504, body: { error: 'Tempo esgotado ao consultar Brasil API (NCM).' } };
    }
    return { status: 502, body: { error: 'Falha de rede ao consultar Brasil API (NCM).' } };
  }
}
