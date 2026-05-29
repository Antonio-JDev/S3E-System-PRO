import { Request, Response } from 'express';
import {
  ContasReceberService,
  CriarContaReceberManualPayload,
  AtualizarContaReceberPayload
} from '../services/contasReceber.service';

export class ContasReceberController {
  /**
   * POST /api/contas-receber
   * Cria uma nova conta a receber manual (Entradas / Outras Receitas)
   */
  static async criar(req: Request, res: Response) {
    try {
      const body = req.body;
      const valorParcela = body.valorParcela ?? body.valor;
      let dataVencimento: Date | undefined;

      if (body.dataVencimento) {
        const raw = String(body.dataVencimento);
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
          const [y, m, d] = raw.split('-').map(Number);
          dataVencimento = new Date(y, m - 1, d, 12, 0, 0, 0);
        } else {
          dataVencimento = new Date(raw);
        }
      }

      const tipo = body.tipo === 'OUTRAS_RECEITAS' ? 'OUTRAS_RECEITAS' : 'ENTRADA';

      const payload: CriarContaReceberManualPayload = {
        tipo,
        pagadorNome: body.pagadorNome || body.pagador || undefined,
        descricao: body.descricao,
        valorParcela: typeof valorParcela === 'number' ? valorParcela : parseFloat(valorParcela),
        valorJuros: body.valorJuros != null ? Number(body.valorJuros) : undefined,
        valorDesconto: body.valorDesconto != null ? Number(body.valorDesconto) : undefined,
        dataVencimento: dataVencimento!,
        observacoes: body.observacoes
      };

      if (!payload.descricao || payload.valorParcela == null || !payload.dataVencimento) {
        return res.status(400).json({
          error: 'Dados obrigatórios: descricao, valorParcela (ou valor), dataVencimento'
        });
      }

      const conta = await ContasReceberService.criarContaReceberManual(payload);

      return res.status(201).json({
        success: true,
        message: 'Conta a receber criada com sucesso',
        data: conta
      });
    } catch (error) {
      console.error('Erro ao criar conta a receber:', error);
      return res.status(500).json({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * GET /api/contas-receber
   * Lista todas as contas a receber (vendas + manuais)
   */
  static async listar(req: Request, res: Response) {
    try {
      const contas = await ContasReceberService.listarTodas();
      return res.json({
        success: true,
        data: contas
      });
    } catch (error) {
      console.error('Erro ao listar contas a receber:', error);
      return res.status(500).json({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * GET /api/contas-receber/:id/historico
   * Histórico de recebimentos parciais da duplicata
   */
  static async historico(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'ID da conta a receber é obrigatório' });
      }
      const resultado = await ContasReceberService.historicoRecebimentos(id);
      if (!resultado) {
        return res.status(404).json({ error: 'Conta a receber não encontrada' });
      }
      return res.json({ success: true, data: resultado });
    } catch (error) {
      console.error('Erro ao buscar histórico de recebimentos:', error);
      return res.status(500).json({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * PUT /api/contas-receber/:id
   * Atualiza conta a receber manual
   */
  static async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'ID da conta a receber é obrigatório' });
      }

      const body = req.body || {};
      let dataVencimento: Date | undefined;
      if (body.dataVencimento) {
        const raw = String(body.dataVencimento);
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
          const [y, m, d] = raw.split('-').map(Number);
          dataVencimento = new Date(y, m - 1, d, 12, 0, 0, 0);
        } else {
          dataVencimento = new Date(raw);
        }
      }

      const payload: AtualizarContaReceberPayload = {
        tipo: body.tipo,
        pagadorNome: body.pagadorNome,
        descricao: body.descricao,
        valorParcela:
          body.valorParcela !== undefined
            ? (typeof body.valorParcela === 'number' ? body.valorParcela : parseFloat(body.valorParcela))
            : undefined,
        valorJuros: body.valorJuros !== undefined ? Number(body.valorJuros) : undefined,
        valorDesconto: body.valorDesconto !== undefined ? Number(body.valorDesconto) : undefined,
        dataVencimento,
        observacoes: body.observacoes
      };

      const conta = await ContasReceberService.atualizarContaReceber(id, payload);
      return res.json({
        success: true,
        message: 'Conta a receber atualizada com sucesso',
        data: conta
      });
    } catch (error) {
      console.error('Erro ao atualizar conta a receber:', error);
      return res.status(400).json({
        error: 'Erro ao atualizar conta a receber',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * DELETE /api/contas-receber/:id
   * Exclui conta a receber manual
   */
  static async excluir(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'ID da conta a receber é obrigatório' });
      }

      await ContasReceberService.excluirContaReceber(id);
      return res.json({
        success: true,
        message: 'Conta a receber excluída com sucesso'
      });
    } catch (error) {
      console.error('Erro ao excluir conta a receber:', error);
      return res.status(400).json({
        error: 'Erro ao excluir conta a receber',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}
