import { Request, Response } from 'express';
import * as MovimentacoesCaixaService from '../services/movimentacoesCaixa.service';

export class MovimentacoesCaixaController {
  /**
   * Lista movimentações de caixa (extrato: entradas = contas a receber pagas, saídas = contas a pagar pagas)
   * Query: dataInicio, dataFim (YYYY-MM-DD), categoria, busca
   */
  static async listar(req: Request, res: Response) {
    try {
      const { dataInicio, dataFim, categoria, busca } = req.query;
      const resultado = await MovimentacoesCaixaService.listarMovimentacoes({
        dataInicio: dataInicio as string,
        dataFim: dataFim as string,
        categoria: categoria as string,
        busca: busca as string
      });
      res.json({
        success: true,
        data: resultado
      });
    } catch (error) {
      console.error('Erro ao listar movimentações de caixa:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Atualiza uma movimentação (conta já paga) para conciliação bancária.
   * PUT /api/movimentacoes-caixa/:id
   * Body: dataPagamento?, descricao?, categoria?, valor?, valorJuros?, valorDesconto?, meioPagamento?
   */
  static async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, message: 'ID da movimentação é obrigatório' });
      }
      const payload = req.body;
      const resultado = await MovimentacoesCaixaService.atualizarMovimentacao(id, payload);
      res.json({
        success: true,
        message: 'Movimentação atualizada com sucesso',
        data: resultado
      });
    } catch (error: any) {
      console.error('Erro ao atualizar movimentação:', error);
      res.status(400).json({
        success: false,
        message: error?.message || 'Erro ao atualizar movimentação'
      });
    }
  }

  /**
   * Desfaz/Remove um pagamento registrado (conta a receber ou conta a pagar)
   * Método: DELETE /api/movimentacoes-caixa/:id
   * Requer permissão administrativa/financeira
   */
  static async removerPagamento(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, message: 'ID da conta é obrigatório' });
      }

      // Pegar usuário do request para auditoria
      const authReq = req as any;
      const user = authReq.user || { userId: '', role: '', name: '' };
      const motivo = req.body?.motivo ?? req.query?.motivo ?? '';

      const resultado = await MovimentacoesCaixaService.desfazerPagamento(id, {
        userId: user.userId || '',
        userName: (user.name || user.userId) as string,
        motivo: String(motivo || '')
      });

      res.json({
        success: true,
        message: 'Movimentação desfeita com sucesso',
        data: resultado
      });
    } catch (error: any) {
      console.error('Erro ao desfazer pagamento:', error);
      res.status(400).json({
        success: false,
        message: error?.message || 'Erro ao desfazer pagamento'
      });
    }
  }
}
