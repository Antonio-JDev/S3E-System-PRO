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
