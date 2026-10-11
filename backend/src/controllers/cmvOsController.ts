import { Request, Response } from 'express';
import { obterCmvOs } from '../services/cmvOs.service';

export async function obterCmvOsHandler(req: Request, res: Response): Promise<void> {
    try {
        const projetoId = req.params.id || req.params.projetoId;
        if (!projetoId) {
            res.status(400).json({ success: false, error: 'Projeto não informado' });
            return;
        }
        const data = await obterCmvOs(projetoId);
        res.json({ success: true, data });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao calcular CMV da OS';
        res.status(400).json({ success: false, error: message });
    }
}
