import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class ObrasController {
  static async getMateriaisObra(req: Request, res: Response) {
    try {
      const { obraId } = req.params;
      if (!obraId) return res.status(400).json({ success: false, error: 'ID da obra é obrigatório' });
      const obra = await prisma.obra.findUnique({ where: { id: obraId } });
      if (!obra) return res.status(404).json({ success: false, error: 'Obra não encontrada' });
      const movimentacoes = await prisma.movimentacaoEstoque.findMany({
        where: {
          tipo: 'SAIDA',
          referencia: obraId,
          OR: [
            { motivo: 'OBRA' },
            { motivo: { contains: 'Alocação para obra' } }
          ]
        },
        include: { material: { include: { fornecedor: { select: { nome: true, cnpj: true } } } } },
        orderBy: { data: 'desc' }
      });
      const materiaisAgrupados = new Map<string, {
        material: typeof movimentacoes[0]['material'];
        quantidadeTotal: number;
        isItemNovo: boolean;
        movimentacoes: Array<{ id: string; quantidade: number; data: Date; observacoes: string | null; isItemNovo: boolean }>;
      }>();
      for (const mov of movimentacoes) {
        const materialId = mov.materialId;
        const isItemNovo = mov.observacoes?.includes('Item novo adicionado') || false;
        if (materiaisAgrupados.has(materialId)) {
          const existing = materiaisAgrupados.get(materialId)!;
          existing.quantidadeTotal += mov.quantidade;
          existing.movimentacoes.push({ id: mov.id, quantidade: mov.quantidade, data: mov.data, observacoes: mov.observacoes, isItemNovo });
        } else {
          materiaisAgrupados.set(materialId, {
            material: mov.material,
            quantidadeTotal: mov.quantidade,
            isItemNovo,
            movimentacoes: [{ id: mov.id, quantidade: mov.quantidade, data: mov.data, observacoes: mov.observacoes, isItemNovo }]
          });
        }
      }
      const materiaisArray = Array.from(materiaisAgrupados.values()).map(item => ({
        materialId: item.material.id,
        nome: item.material.nome,
        sku: item.material.sku,
        categoria: item.material.categoria,
        ncm: item.material.ncm,
        unidadeMedida: item.material.unidadeMedida,
        preco: item.material.preco,
        valorVenda: item.material.valorVenda,
        descricao: item.material.descricao,
        imagemUrl: item.material.imagemUrl,
        quantidadeTotal: item.quantidadeTotal,
        isItemNovo: item.isItemNovo,
        fornecedor: item.material.fornecedor,
        movimentacoes: item.movimentacoes
      }));
      return res.status(200).json({
        success: true,
        data: { obraId, obraNome: obra.nomeObra, materiais: materiaisArray, totalMateriais: materiaisArray.length, totalMovimentacoes: movimentacoes.length }
      });
    } catch (error) {
      console.error('Erro ao buscar materiais da obra:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor ao buscar materiais da obra' });
    }
  }

  static async getComprasAvulsasObra(req: Request, res: Response) {
    try {
      const { obraId } = req.params;
      if (!obraId) return res.status(400).json({ success: false, error: 'ID da obra é obrigatório' });
      const comprasAvulsas = await prisma.compra.findMany({
        where: { obraId },
        include: {
          fornecedor: { select: { nome: true, cnpj: true } },
          items: { include: { material: { select: { nome: true, sku: true, categoria: true, unidadeMedida: true } } } }
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json({ success: true, data: comprasAvulsas });
    } catch (error) {
      console.error('Erro ao buscar compras avulsas da obra:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor ao buscar compras avulsas da obra' });
    }
  }
}
