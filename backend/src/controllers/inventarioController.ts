import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { InventarioService } from '../services/inventario.service';

export class InventarioController {
  static async listarMateriais(req: AuthRequest, res: Response): Promise<void> {
    try {
      const busca = typeof req.query.busca === 'string' ? req.query.busca : undefined;
      const data = await InventarioService.listarMateriaisParaContagem(busca);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('Erro ao listar materiais para inventário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar materiais para inventário',
        error: error.message,
      });
    }
  }

  static async aplicarAjuste(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { materialId, quantidadeContada, observacoes } = req.body;
      const resultado = await InventarioService.aplicarAjusteAbsoluto(
        { materialId, quantidadeContada, observacoes },
        { userId: req.user?.userId, name: req.user?.name }
      );

      res.status(resultado.semAlteracao ? 200 : 201).json({
        success: true,
        data: resultado,
        message: resultado.message,
      });
    } catch (error: any) {
      const status = error.statusCode || 500;
      console.error('Erro ao aplicar ajuste de inventário:', error);
      res.status(status).json({
        success: false,
        message: error.message || 'Erro ao aplicar ajuste de inventário',
      });
    }
  }

  static async aplicarAjustesLote(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { itens } = req.body;
      const lote = await InventarioService.aplicarAjustesEmLote(itens, {
        userId: req.user?.userId,
        name: req.user?.name,
      });

      res.status(200).json({
        success: true,
        data: lote,
        message: `${lote.aplicados} ajuste(s) aplicado(s), ${lote.semAlteracao} sem alteração, ${lote.erros} erro(s)`,
      });
    } catch (error: any) {
      const status = error.statusCode || 500;
      console.error('Erro ao aplicar ajustes em lote:', error);
      res.status(status).json({
        success: false,
        message: error.message || 'Erro ao aplicar ajustes em lote',
      });
    }
  }
}
