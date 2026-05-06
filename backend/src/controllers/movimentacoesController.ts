import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { QuadrosService } from '../services/quadros.service';

export class MovimentacoesController {
  static async listarMovimentacoes(req: Request, res: Response): Promise<void> {
    try {
      const { tipo, materialId, dataInicio, dataFim } = req.query;
      const where: any = {};
      
      if (tipo) where.tipo = tipo;
      if (materialId) where.materialId = materialId;
      
      if (dataInicio || dataFim) {
        where.data = {};
        // Se for YYYY-MM-DD, parsear para início/fim do dia local
        if (dataInicio) {
          const s = String(dataInicio);
          if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const [y, m, d] = s.split('-').map(Number);
            where.data.gte = new Date(y, m - 1, d, 0, 0, 0, 0);
          } else {
            where.data.gte = new Date(s);
          }
        }
        if (dataFim) {
          const s = String(dataFim);
          if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const [y, m, d] = s.split('-').map(Number);
            where.data.lte = new Date(y, m - 1, d, 23, 59, 59, 999);
          } else {
            where.data.lte = new Date(s);
          }
        }
      }

      const movimentacoes = await prisma.movimentacaoEstoque.findMany({
        where,
        include: {
          material: {
            select: { id: true, nome: true, sku: true, estoque: true }
          }
        },
        orderBy: { data: 'desc' }
      });

      res.status(200).json({ success: true, data: movimentacoes });
    } catch (error: any) {
      console.error('Erro ao listar movimentações:', error);
      res.status(500).json({ success: false, message: 'Erro ao listar movimentações', error: error.message });
    }
  }

  static async buscarMovimentacao(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const movimentacao = await prisma.movimentacaoEstoque.findUnique({
        where: { id },
        include: {
          material: true
        }
      });

      if (!movimentacao) {
        res.status(404).json({ success: false, message: 'Movimentação não encontrada' });
        return;
      }

      res.status(200).json({ success: true, data: movimentacao });
    } catch (error: any) {
      console.error('Erro ao buscar movimentação:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar movimentação', error: error.message });
    }
  }

  static async criarMovimentacao(req: Request, res: Response): Promise<void> {
    try {
      const { materialId, tipo, quantidade, motivo, referencia, observacoes } = req.body;

      // Validação básica
      if (!materialId || !tipo || !quantidade || !motivo) {
        res.status(400).json({ 
          success: false, 
          message: 'Material, tipo, quantidade e motivo são obrigatórios' 
        });
        return;
      }

      // Verificar se material existe
      const material = await prisma.material.findUnique({
        where: { id: materialId }
      });

      if (!material) {
        res.status(404).json({ success: false, message: 'Material não encontrado' });
        return;
      }

      // Calcular novo estoque
      let novoEstoque = material.estoque;
      if (tipo === 'ENTRADA') {
        novoEstoque += quantidade;
      } else if (tipo === 'SAIDA') {
        novoEstoque -= quantidade;
        if (novoEstoque < 0) {
          res.status(400).json({ 
            success: false, 
            message: 'Estoque insuficiente para esta movimentação' 
          });
          return;
        }
      } else if (tipo === 'AJUSTE') {
        novoEstoque = quantidade;
      }

      // Criar movimentação e atualizar estoque em transação
      const resultado = await prisma.$transaction(async (tx) => {
        const movimentacao = await tx.movimentacaoEstoque.create({
          data: {
            materialId,
            tipo,
            quantidade,
            motivo,
            referencia,
            observacoes
          }
        });

        await tx.material.update({
          where: { id: materialId },
          data: { estoque: novoEstoque }
        });

        return movimentacao;
      });

      // Se for ENTRADA, revalidar quadros que usam este material
      if (tipo === 'ENTRADA') {
        this.revalidarQuadrosComMaterial(materialId).catch(err => {
          console.error('Erro ao revalidar quadros:', err);
        });
      }

      res.status(201).json({ success: true, data: resultado });
    } catch (error: any) {
      console.error('Erro ao criar movimentação:', error);
      res.status(500).json({ success: false, message: 'Erro ao criar movimentação', error: error.message });
    }
  }

  static async atualizarMovimentacao(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { quantidade, motivo, observacoes } = req.body;

      // Buscar movimentação existente
      const movimentacaoExistente = await prisma.movimentacaoEstoque.findUnique({
        where: { id },
        include: { material: true }
      });

      if (!movimentacaoExistente) {
        res.status(404).json({ success: false, message: 'Movimentação não encontrada' });
        return;
      }

      // Se mudou a quantidade, recalcular estoque
      if (quantidade !== undefined && quantidade !== movimentacaoExistente.quantidade) {
        const diferenca = quantidade - movimentacaoExistente.quantidade;
        let novoEstoque = movimentacaoExistente.material.estoque;

        if (movimentacaoExistente.tipo === 'ENTRADA') {
          novoEstoque += diferenca;
        } else if (movimentacaoExistente.tipo === 'SAIDA') {
          novoEstoque -= diferenca;
          if (novoEstoque < 0) {
            res.status(400).json({ 
              success: false, 
              message: 'Estoque insuficiente para esta atualização' 
            });
          }
        } else if (movimentacaoExistente.tipo === 'AJUSTE') {
          novoEstoque = quantidade;
        }

        // Atualizar em transação
        const resultado = await prisma.$transaction(async (tx) => {
          const movimentacao = await tx.movimentacaoEstoque.update({
            where: { id },
            data: { quantidade, motivo, observacoes }
          });

          await tx.material.update({
            where: { id: movimentacaoExistente.materialId },
            data: { estoque: novoEstoque }
          });

          return movimentacao;
        });

        res.status(200).json({ success: true, data: resultado });
      } else {
        // Apenas atualizar dados sem recalcular estoque
        const movimentacaoAtualizada = await prisma.movimentacaoEstoque.update({
          where: { id },
          data: { motivo, observacoes }
        });

        res.status(200).json({ success: true, data: movimentacaoAtualizada });
      }
    } catch (error: any) {
      console.error('Erro ao atualizar movimentação:', error);
      res.status(500).json({ success: false, message: 'Erro ao atualizar movimentação', error: error.message });
    }
  }

  static async deletarMovimentacao(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Buscar movimentação para reverter estoque
      const movimentacao = await prisma.movimentacaoEstoque.findUnique({
        where: { id },
        include: { material: true }
      });

      if (!movimentacao) {
        res.status(404).json({ success: false, message: 'Movimentação não encontrada' });
        return;
      }

      // Reverter estoque e deletar movimentação em transação
      await prisma.$transaction(async (tx) => {
        let novoEstoque = movimentacao.material.estoque;
        
        if (movimentacao.tipo === 'ENTRADA') {
          novoEstoque -= movimentacao.quantidade;
        } else if (movimentacao.tipo === 'SAIDA') {
          novoEstoque += movimentacao.quantidade;
        } else if (movimentacao.tipo === 'AJUSTE') {
          // Para ajuste, restaurar estoque anterior (não temos histórico, então usar 0)
          novoEstoque = 0;
        }

        await tx.material.update({
          where: { id: movimentacao.materialId },
          data: { estoque: Math.max(0, novoEstoque) }
        });

        await tx.movimentacaoEstoque.delete({
          where: { id }
        });
      });

      res.status(200).json({ success: true, message: 'Movimentação deletada e estoque revertido' });
    } catch (error: any) {
      console.error('Erro ao deletar movimentação:', error);
      res.status(500).json({ success: false, message: 'Erro ao deletar movimentação', error: error.message });
    }
  }

  // Revalidar quadros que usam um material específico
  private static async revalidarQuadrosComMaterial(materialId: string) {
    try {
      console.log(`🔄 Revalidando quadros que usam material: ${materialId}`);
      
      // Buscar todos os quadros ativos que usam este material
      const kitsComMaterial = await prisma.kitItem.findMany({
        where: { materialId },
        select: { kitId: true }
      });
      
      const kitIds = [...new Set(kitsComMaterial.map(ki => ki.kitId))];
      
      if (kitIds.length === 0) {
        console.log('ℹ️ Nenhum quadro usa este material');
        return;
      }
      
      console.log(`📦 Revalidando ${kitIds.length} quadro(s)...`);
      
      // Revalidar cada quadro
      const resultados = await Promise.allSettled(
        kitIds.map(kitId => QuadrosService.revalidarEstoque(kitId))
      );
      
      const sucessos = resultados.filter(r => r.status === 'fulfilled').length;
      console.log(`✅ ${sucessos}/${kitIds.length} quadros revalidados com sucesso`);
      
    } catch (error) {
      console.error('❌ Erro ao revalidar quadros:', error);
    }
  }
}
