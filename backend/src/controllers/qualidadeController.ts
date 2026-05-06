import { Request, Response } from 'express';
import * as qualidadeService from '../services/qualidade.service';

/**
 * GET /api/projetos/:projetoId/qualidade
 * Retorna dados da aba Qualidade (visita técnica, checklist, inspeções, fotos).
 */
export async function getQualidade(req: Request, res: Response): Promise<void> {
  try {
    const { projetoId } = req.params;
    if (!projetoId) {
      res.status(400).json({ success: false, error: 'projetoId é obrigatório' });
      return;
    }
    const data = await qualidadeService.getQualidadeByProjeto(projetoId);
    if (!data) {
      res.status(404).json({ success: false, error: 'Projeto não encontrado' });
      return;
    }
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Erro ao buscar qualidade do projeto:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro ao buscar qualidade' });
  }
}

/**
 * PUT /api/projetos/:projetoId/qualidade
 * Cria ou atualiza visita técnica, checklist e observações.
 * Body: { statusVisita?, dataVisita?, responsavel?, checklist?, observacoes? }
 */
export async function putQualidade(req: Request, res: Response): Promise<void> {
  try {
    const { projetoId } = req.params;
    if (!projetoId) {
      res.status(400).json({ success: false, error: 'projetoId é obrigatório' });
      return;
    }
    const { statusVisita, dataVisita, responsavel, checklist, observacoes } = req.body;
    const data = await qualidadeService.upsertQualidade(projetoId, {
      statusVisita,
      dataVisita: dataVisita || null,
      responsavel: responsavel ?? null,
      checklist: Array.isArray(checklist) ? checklist : undefined,
      observacoes: observacoes ?? null
    });
    if (!data) {
      res.status(404).json({ success: false, error: 'Projeto não encontrado' });
      return;
    }
    const full = await qualidadeService.getQualidadeByProjeto(projetoId);
    res.json({ success: true, data: full, message: 'Visita técnica salva com sucesso' });
  } catch (error: any) {
    console.error('Erro ao salvar qualidade:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro ao salvar qualidade' });
  }
}

/**
 * POST /api/projetos/:projetoId/qualidade/inspecoes/:tipo/aprovar
 * Marca uma inspeção como aprovada.
 * Body: { aprovadoPor? } (opcional; pode usar nome do usuário logado)
 */
export async function aprovarInspecao(req: Request, res: Response): Promise<void> {
  try {
    const { projetoId, tipo } = req.params;
    const { aprovadoPor } = req.body;
    if (!projetoId || !tipo) {
      res.status(400).json({ success: false, error: 'projetoId e tipo são obrigatórios' });
      return;
    }
    const nome = (aprovadoPor && String(aprovadoPor).trim()) || (req as any).user?.name || 'Sistema';
    const data = await qualidadeService.aprovarInspecao(projetoId, tipo, nome);
    if (!data) {
      res.status(404).json({ success: false, error: 'Projeto não encontrado' });
      return;
    }
    const full = await qualidadeService.getQualidadeByProjeto(projetoId);
    res.json({ success: true, data: full, message: 'Inspeção aprovada' });
  } catch (error: any) {
    console.error('Erro ao aprovar inspeção:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro ao aprovar inspeção' });
  }
}
