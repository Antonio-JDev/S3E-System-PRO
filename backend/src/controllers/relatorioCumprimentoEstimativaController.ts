import { Request, Response } from 'express';
import { gerarRelatorioCumprimentoEstimativa } from '../services/relatorioCumprimentoEstimativa.service';

function canAccessRelatorio(req: Request): boolean {
  const user = (req as any).user;
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  return role === 'admin' || role === 'developer' || role === 'desenvolvedor' || user.isAdmin === true;
}

export async function getRelatorioCumprimentoEstimativa(req: Request, res: Response): Promise<void> {
  try {
    if (!canAccessRelatorio(req)) {
      res.status(403).json({ success: false, error: 'Acesso negado. Apenas Admin/Dev.' });
      return;
    }

    const statusParam = req.query.status;
    let status: ('EXECUCAO' | 'CONCLUIDO')[] | undefined;
    if (statusParam) {
      const raw = String(statusParam)
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      const valid = raw.filter((s): s is 'EXECUCAO' | 'CONCLUIDO' =>
        s === 'EXECUCAO' || s === 'CONCLUIDO'
      );
      if (valid.length > 0) status = valid;
    }

    const data = await gerarRelatorioCumprimentoEstimativa({ status });
    res.json({ success: true, data, total: data.length });
  } catch (error) {
    console.error('Erro ao gerar relatório de cumprimento de estimativa:', error);
    res.status(500).json({ success: false, error: 'Erro ao gerar relatório' });
  }
}
