import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { EstoqueService } from '../services/estoque.service';

const prisma = new PrismaClient();

export class AlocacaoMateriaisController {
  /**
   * POST /api/obras/:obraId/materiais/alocar
   * Aloca um material do estoque para uma obra
   */
  static async alocarMaterialParaObra(req: Request, res: Response): Promise<void> {
    try {
      const { obraId } = req.params;
      const { materialId, quantidade, projetoId } = req.body;

      // Validações básicas
      if (!materialId || !quantidade || quantidade <= 0) {
        res.status(400).json({
          success: false,
          message: 'Material ID e quantidade são obrigatórios e quantidade deve ser maior que zero'
        });
        return;
      }

      // Verificar se a obra existe
      const obra = await prisma.obra.findUnique({
        where: { id: obraId },
        include: {
          projeto: true
        }
      });

      if (!obra) {
        res.status(404).json({
          success: false,
          message: 'Obra não encontrada'
        });
        return;
      }

      // Se projetoId foi fornecido, validar que a obra está vinculada ao projeto
      if (projetoId && obra.projetoId !== projetoId) {
        res.status(409).json({
          success: false,
          message: 'A obra não está vinculada ao projeto especificado'
        });
        return;
      }

      // Verificar se o material existe e tem estoque suficiente
      const material = await prisma.material.findUnique({
        where: { id: materialId }
      });

      if (!material) {
        res.status(404).json({
          success: false,
          message: 'Material não encontrado'
        });
        return;
      }

      if (material.estoque < quantidade) {
        res.status(409).json({
          success: false,
          message: `Estoque insuficiente para ${material.nome}. Disponível: ${material.estoque}, Necessário: ${quantidade}`
        });
        return;
      }

      // Verificar se o material já foi alocado para esta obra
      const alocacaoExistente = await prisma.movimentacaoEstoque.findFirst({
        where: {
          materialId: materialId,
          referencia: obraId,
          tipo: 'SAIDA',
          motivo: {
            contains: 'Alocação para obra'
          }
        }
      });

      if (alocacaoExistente) {
        res.status(409).json({
          success: false,
          message: `O material "${material.nome}" já foi alocado para esta obra. Não é possível alocar o mesmo material múltiplas vezes.`
        });
        return;
      }

      // Preparar observações para a movimentação
      const observacoes = projetoId && obra.projeto
        ? `Alocação para obra "${obra.nomeObra}" do projeto "${obra.projeto.titulo}"`
        : `Alocação para obra "${obra.nomeObra}"`;

      // Dar baixa no estoque usando o EstoqueService
      // Retorna [materialAtualizado, movimentacao]
      const [materialAtualizado, movimentacao] = await EstoqueService.darBaixaMaterial(
        materialId,
        quantidade,
        'Alocação para obra',
        obraId,
        observacoes
      );

      // Buscar a movimentação com os dados do material para retornar
      const movimentacaoCompleta = await prisma.movimentacaoEstoque.findUnique({
        where: { id: movimentacao.id },
        include: {
          material: {
            select: {
              id: true,
              nome: true,
              sku: true,
              unidadeMedida: true,
              estoque: true
            }
          }
        }
      });

      res.status(200).json({
        success: true,
        data: movimentacaoCompleta,
        message: `Material ${material.nome} alocado com sucesso para a obra ${obra.nomeObra}`
      });
    } catch (error: any) {
      console.error('Erro ao alocar material para obra:', error);
      
      // Se o erro já foi tratado pelo EstoqueService, retornar mensagem específica
      if (error.message && error.message.includes('Estoque insuficiente')) {
        res.status(409).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao alocar material para obra',
        error: error.message
      });
    }
  }

  /**
   * GET /api/obras/:obraId/materiais
   * Lista todos os materiais alocados para uma obra
   */
  static async listarMateriaisObra(req: Request, res: Response): Promise<void> {
    try {
      const { obraId } = req.params;

      // Verificar se a obra existe
      const obra = await prisma.obra.findUnique({
        where: { id: obraId }
      });

      if (!obra) {
        res.status(404).json({
          success: false,
          message: 'Obra não encontrada'
        });
        return;
      }

      // Buscar todas as movimentações de saída vinculadas a esta obra
      const movimentacoes = await prisma.movimentacaoEstoque.findMany({
        where: {
          referencia: obraId,
          tipo: 'SAIDA',
          motivo: {
            contains: 'Alocação para obra'
          }
        },
        include: {
          material: {
            select: {
              id: true,
              nome: true,
              sku: true,
              unidadeMedida: true,
              categoria: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.status(200).json({
        success: true,
        data: movimentacoes,
        message: `${movimentacoes.length} material(is) encontrado(s) para esta obra`
      });
    } catch (error: any) {
      console.error('Erro ao listar materiais da obra:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar materiais da obra',
        error: error.message
      });
    }
  }
}

