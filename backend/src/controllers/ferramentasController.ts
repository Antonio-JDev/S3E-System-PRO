import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/ferramentas
 * Lista todas as ferramentas
 */
export const listarFerramentas = async (req: Request, res: Response): Promise<void> => {
  try {
    const ferramentas = await prisma.ferramenta.findMany({
      orderBy: { nome: 'asc' }
    });

    res.json({
      success: true,
      data: ferramentas,
      count: ferramentas.length
    });
  } catch (error) {
    console.error('❌ Erro ao listar ferramentas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar ferramentas'
    });
  }
};

/**
 * GET /api/ferramentas/:id
 * Busca uma ferramenta específica
 */
export const buscarFerramenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const ferramenta = await prisma.ferramenta.findUnique({
      where: { id }
    });

    if (!ferramenta) {
      res.status(404).json({
        success: false,
        error: 'Ferramenta não encontrada'
      });
      return;
    }

    res.json({
      success: true,
      data: ferramenta
    });
  } catch (error) {
    console.error('❌ Erro ao buscar ferramenta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar ferramenta'
    });
  }
};

/**
 * POST /api/ferramentas
 * Cria uma nova ferramenta
 */
export const criarFerramenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const {
      nome,
      codigo,
      categoria,
      marca,
      modelo,
      descricao,
      valorCompra,
      quantidade,
      imagemUrl
    } = req.body;

    // Validações
    if (!nome || !codigo || !categoria) {
      res.status(400).json({
        success: false,
        error: 'Nome, código e categoria são obrigatórios'
      });
      return;
    }

    // Verificar se código já existe
    const codigoExiste = await prisma.ferramenta.findUnique({
      where: { codigo }
    });

    if (codigoExiste) {
      res.status(400).json({
        success: false,
        error: 'Já existe uma ferramenta com este código'
      });
      return;
    }

    // Criar ferramenta
    const ferramenta = await prisma.ferramenta.create({
      data: {
        nome,
        codigo,
        categoria,
        marca: marca || null,
        modelo: modelo || null,
        descricao: descricao || null,
        valorCompra: valorCompra ? parseFloat(valorCompra) : null,
        quantidade: quantidade !== undefined && quantidade !== null ? parseInt(quantidade) || 0 : 0,
        imagemUrl: imagemUrl || null,
        ativo: true
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'CREATE',
        entity: 'Ferramenta',
        entityId: ferramenta.id,
        description: `Ferramenta "${nome}" cadastrada`,
        metadata: { codigo, categoria }
      }
    });

    console.log(`✅ Ferramenta criada: ${ferramenta.nome} (${ferramenta.codigo})`);

    res.json({
      success: true,
      data: ferramenta,
      message: '✅ Ferramenta cadastrada com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao criar ferramenta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao cadastrar ferramenta'
    });
  }
};

/**
 * PUT /api/ferramentas/:id
 * Atualiza uma ferramenta
 */
export const atualizarFerramenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const {
      nome,
      codigo,
      categoria,
      marca,
      modelo,
      descricao,
      valorCompra,
      quantidade,
      imagemUrl
    } = req.body;

    const ferramenta = await prisma.ferramenta.findUnique({
      where: { id }
    });

    if (!ferramenta) {
      res.status(404).json({
        success: false,
        error: 'Ferramenta não encontrada'
      });
      return;
    }

    // Verificar se código já existe em outra ferramenta
    if (codigo && codigo !== ferramenta.codigo) {
      const codigoExiste = await prisma.ferramenta.findFirst({
        where: {
          codigo,
          id: { not: id }
        }
      });

      if (codigoExiste) {
        res.status(400).json({
          success: false,
          error: 'Já existe outra ferramenta com este código'
        });
        return;
      }
    }

    // Atualizar ferramenta
    const ferramentaAtualizada = await prisma.ferramenta.update({
      where: { id },
      data: {
        nome: nome || ferramenta.nome,
        codigo: codigo || ferramenta.codigo,
        categoria: categoria || ferramenta.categoria,
        marca: marca !== undefined ? marca : ferramenta.marca,
        modelo: modelo !== undefined ? modelo : ferramenta.modelo,
        descricao: descricao !== undefined ? descricao : ferramenta.descricao,
        valorCompra: valorCompra !== undefined ? (valorCompra ? parseFloat(valorCompra) : null) : ferramenta.valorCompra,
        quantidade: quantidade !== undefined ? parseInt(quantidade) || 0 : ferramenta.quantidade,
        imagemUrl: imagemUrl !== undefined ? imagemUrl : ferramenta.imagemUrl
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'UPDATE',
        entity: 'Ferramenta',
        entityId: id,
        description: `Ferramenta "${ferramentaAtualizada.nome}" atualizada`,
        metadata: req.body
      }
    });

    console.log(`✅ Ferramenta atualizada: ${ferramentaAtualizada.nome}`);

    res.json({
      success: true,
      data: ferramentaAtualizada,
      message: '✅ Ferramenta atualizada com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar ferramenta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar ferramenta'
    });
  }
};

/**
 * DELETE /api/ferramentas/:id
 * Desativa uma ferramenta
 */
export const deletarFerramenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;

    const ferramenta = await prisma.ferramenta.findUnique({
      where: { id }
    });

    if (!ferramenta) {
      res.status(404).json({
        success: false,
        error: 'Ferramenta não encontrada'
      });
      return;
    }

    // Desativar (soft delete)
    await prisma.ferramenta.update({
      where: { id },
      data: { ativo: false }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'DELETE',
        entity: 'Ferramenta',
        entityId: id,
        description: `Ferramenta "${ferramenta.nome}" desativada`,
        metadata: { codigo: ferramenta.codigo }
      }
    });

    console.log(`✅ Ferramenta desativada: ${ferramenta.nome}`);

    res.json({
      success: true,
      message: '✅ Ferramenta desativada com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao deletar ferramenta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao desativar ferramenta'
    });
  }
};

/**
 * GET /api/ferramentas/estatisticas
 * Retorna estatísticas das ferramentas
 */
export const getEstatisticas = async (req: Request, res: Response): Promise<void> => {
  try {
    // Buscar todas as ferramentas
    const ferramentas = await prisma.ferramenta.findMany({
      where: { ativo: true }
    });

    // Buscar todos os kits ativos
    const kits = await prisma.kitFerramenta.findMany({
      where: { ativo: true },
      include: {
        itens: {
          include: {
            ferramenta: true
          }
        }
      }
    });

    // Calcular estatísticas
    const totalFerramentas = ferramentas.length;
    const totalEmEstoque = ferramentas.reduce((sum, f) => sum + (f.quantidade || 0), 0);
    const totalKits = kits.length;
    
    // Calcular ferramentas em uso (em kits)
    const ferramentasEmUso = new Set<string>();
    kits.forEach(kit => {
      kit.itens.forEach(item => {
        ferramentasEmUso.add(item.ferramentaId);
      });
    });
    const totalFerramentasEmUso = ferramentasEmUso.size;
    
    // Calcular valor total do estoque
    const valorTotalEstoque = ferramentas.reduce((sum, f) => {
      const quantidade = f.quantidade || 0;
      const valor = f.valorCompra || 0;
      return sum + (quantidade * valor);
    }, 0);

    // Ferramentas por categoria
    const porCategoria = ferramentas.reduce((acc, f) => {
      const categoria = f.categoria || 'Sem categoria';
      acc[categoria] = (acc[categoria] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Ferramentas com estoque baixo (menos de 5 unidades)
    const estoqueBaixo = ferramentas.filter(f => (f.quantidade || 0) < 5).length;

    const estatisticas = {
      totalFerramentas,
      totalEmEstoque,
      totalFerramentasEmUso,
      totalKits,
      valorTotalEstoque,
      estoqueBaixo,
      porCategoria
    };

    res.json({
      success: true,
      data: estatisticas
    });
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas de ferramentas'
    });
  }
};
