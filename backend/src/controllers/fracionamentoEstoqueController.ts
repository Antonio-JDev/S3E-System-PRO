import { Request, Response } from 'express';
import { FracionamentoEstoqueService } from '../services/fracionamentoEstoque.service';

export class FracionamentoEstoqueController {
    /**
     * Processa atualizações de fracionamento pendentes
     */
    static async processarAtualizacoes(req: Request, res: Response): Promise<void> {
        try {
            const resultado = await FracionamentoEstoqueService.processarAtualizacoesFracionamento();
            
            res.json({
                success: true,
                ...resultado
            });
        } catch (error: any) {
            console.error('❌ Erro ao processar atualizações de fracionamento:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Erro ao processar atualizações de fracionamento'
            });
        }
    }

    /**
     * Busca compras com fracionamento pendente
     */
    static async buscarComprasPendentes(req: Request, res: Response): Promise<void> {
        try {
            const compras = await FracionamentoEstoqueService.buscarComprasComFracionamentoPendente();
            
            res.json({
                success: true,
                data: compras
            });
        } catch (error: any) {
            console.error('❌ Erro ao buscar compras pendentes:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Erro ao buscar compras pendentes'
            });
        }
    }
}
