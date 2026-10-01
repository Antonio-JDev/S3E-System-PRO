import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import {
  gerarESalvarChaveMcp,
  lerConfigDevMcp,
  normalizarBaseUrl,
  salvarChaveMcp,
  salvarGemini,
} from '../services/configuracaoDevMcp.service';

function baseUrlDaQuery(req: Request): string {
  const bruto = req.query.baseUrl;
  return normalizarBaseUrl(typeof bruto === 'string' ? bruto : undefined);
}

function baseUrlDoBody(req: Request, fallback: string): string {
  const bruto = req.body?.baseUrl;
  if (typeof bruto === 'string' && bruto.trim()) return normalizarBaseUrl(bruto);
  return fallback;
}

export async function getConfigDevMcp(req: Request, res: Response): Promise<void> {
  try {
    const data = await lerConfigDevMcp(baseUrlDaQuery(req));
    res.json({ success: true, data });
  } catch (err) {
    console.error('Erro ao ler configuração DEV MCP:', err instanceof Error ? err.message : err);
    res.status(500).json({
      success: false,
      error: 'Não foi possível ler a configuração. Confira se o banco está no ar e se a migration foi aplicada.',
    });
  }
}

export async function putChaveMcp(req: Request, res: Response): Promise<void> {
  try {
    const chave = typeof req.body?.mcpApiKey === 'string' ? req.body.mcpApiKey : '';
    const resultado = await salvarChaveMcp(chave, baseUrlDoBody(req, baseUrlDaQuery(req)));
    if (!resultado.ok) {
      res.status(400).json({ success: false, error: resultado.error });
      return;
    }
    res.json({ success: true, data: resultado.data });
  } catch (err) {
    console.error('Erro ao salvar chave MCP:', err instanceof Error ? err.message : err);
    res.status(500).json({ success: false, error: 'Não foi possível salvar a chave do MCP.' });
  }
}

export async function postGerarChaveMcp(req: Request, res: Response): Promise<void> {
  try {
    const resultado = await gerarESalvarChaveMcp(baseUrlDoBody(req, baseUrlDaQuery(req)));
    if (!resultado.ok) {
      res.status(400).json({ success: false, error: resultado.error });
      return;
    }
    res.json({ success: true, data: resultado.data });
  } catch (err) {
    console.error('Erro ao gerar chave MCP:', err instanceof Error ? err.message : err);
    res.status(500).json({ success: false, error: 'Não foi possível gerar uma nova chave do MCP.' });
  }
}

export async function putGemini(req: Request, res: Response): Promise<void> {
  try {
    const resultado = await salvarGemini({
      geminiApiKey: typeof req.body?.geminiApiKey === 'string' ? req.body.geminiApiKey : undefined,
      usarGemini: typeof req.body?.usarGemini === 'boolean' ? req.body.usarGemini : undefined,
      limpar: req.body?.limpar === true,
      baseUrl: baseUrlDoBody(req, baseUrlDaQuery(req)),
    });
    if (!resultado.ok) {
      res.status(400).json({ success: false, error: resultado.error });
      return;
    }
    res.json({ success: true, data: resultado.data });
  } catch (err) {
    console.error('Erro ao salvar chave Gemini:', err instanceof Error ? err.message : err);
    res.status(500).json({ success: false, error: 'Não foi possível salvar a chave Gemini.' });
  }
}

export function exigirDevOuAdmin(req: Request, res: Response, next: () => void): void {
  const user = (req as AuthRequest).user;
  const role = user?.role?.toLowerCase();
  const permitido =
    role === 'desenvolvedor' ||
    role === 'admin' ||
    role === 'administrador' ||
    user?.isAdmin === true;
  if (!permitido) {
    res.status(403).json({
      success: false,
      error: 'Acesso restrito a desenvolvedor ou administrador.',
    });
    return;
  }
  next();
}
