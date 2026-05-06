import express from 'express';

const router = express.Router();

// Simple in-memory cache to reduce requests to receitaws (TTL in ms)
const cache = new Map<string, { expiresAt: number; data: any }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

router.get('/cnpj/:cnpj', async (req, res) => {
  try {
    const rawCnpj = (req.params.cnpj || '').replace(/\D/g, '');
    if (!rawCnpj || rawCnpj.length !== 14) {
      return res.status(400).json({ success: false, error: 'CNPJ inválido. Deve conter 14 dígitos.' });
    }

    // Check cache
    const cached = cache.get(rawCnpj);
    if (cached && cached.expiresAt > Date.now()) {
      return res.status(200).json({ success: true, data: cached.data, cached: true });
    }

    const endpoint = `https://receitaws.com.br/v1/cnpj/${rawCnpj}`;
    // Use global fetch (Node 18+). Set timeout via AbortController
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    let response;
    try {
      response = await fetch(endpoint, { signal: controller.signal });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return res.status(504).json({ success: false, error: 'Timeout ao consultar Receita (504)' });
      }
      console.error('Erro fetch receitaws:', err);
      return res.status(502).json({ success: false, error: 'Erro ao consultar serviço externo' });
    } finally {
      clearTimeout(timeout);
    }

    const status = response.status;
    if (status === 429) {
      return res.status(429).json({ success: false, error: 'Limite de consultas atingido (429)' });
    }
    if (status === 504) {
      return res.status(504).json({ success: false, error: 'Timeout na API externa (504)' });
    }

    const json = await response.json().catch(() => null);
    // Cache successful responses
    if (response.ok && json) {
      cache.set(rawCnpj, { data: json, expiresAt: Date.now() + CACHE_TTL });
      // Forward useful rate-limit headers for frontend telemetry
      const headers = {
        'x-ratelimit-limit': response.headers.get('x-ratelimit-limit') || null,
        'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining') || null
      };
      return res.status(200).json({ success: true, data: json, headers });
    }

    // Propagate status and message
    // Try to include rate limit headers on error responses as well
    const errHeaders = {
      'x-ratelimit-limit': response.headers.get('x-ratelimit-limit') || null,
      'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining') || null
    };
    return res.status(status).json({ success: false, status, error: json || 'Erro na API externa', headers: errHeaders });
  } catch (error: any) {
    console.error('Erro na rota /api/external/receita/cnpj:', error);
    return res.status(500).json({ success: false, error: error.message || 'Erro interno' });
  }
});

export default router;

