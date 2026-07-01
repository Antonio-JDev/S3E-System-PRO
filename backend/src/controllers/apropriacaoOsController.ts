import { Request, Response } from 'express';
import { apropriacaoOsService } from '../services/apropriacaoOs.service';
import type { AuthRequest } from '../middlewares/auth';

export async function criarApontamentoOs(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { projetoId } = req.params;
    const authUser = (req as AuthRequest).user;
    if (!authUser?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }

    const { dataApontamento, observacoes, itens } = req.body;
    const resultado = await apropriacaoOsService.criarApontamento(
      projetoId,
      authUser.userId,
      { dataApontamento, observacoes, itens }
    );

    res.status(201).json({
      success: true,
      data: resultado.apontamento,
      resumoAtualizado: resultado.resumoAtualizado,
      message: 'Apontamento registrado com sucesso',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao registrar apontamento';
    res.status(400).json({ success: false, error: message });
  }
}

export async function listarApontamentosOs(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { projetoId } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const apontamentos = await apropriacaoOsService.listarApontamentos(
      projetoId,
      limit
    );
    res.json({ success: true, data: apontamentos });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao listar apontamentos';
    res.status(400).json({ success: false, error: message });
  }
}

export async function obterResumoApropriacaoOs(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { projetoId } = req.params;
    const resumo = await apropriacaoOsService.obterResumo(projetoId);
    res.json({ success: true, data: resumo });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao obter resumo de apropriação';
    res.status(400).json({ success: false, error: message });
  }
}
