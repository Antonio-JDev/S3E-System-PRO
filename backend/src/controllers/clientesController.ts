import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Listar todos os clientes
export const getClientes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ativo, busca } = req.query;
    
    const where: any = {};
    if (ativo !== undefined) where.ativo = ativo === 'true';
    if (busca) {
      where.OR = [
        { nome: { contains: busca as string, mode: 'insensitive' } },
        { cpfCnpj: { contains: busca as string, mode: 'insensitive' } },
        { email: { contains: busca as string, mode: 'insensitive' } }
      ];
    }

    const clientes = await prisma.cliente.findMany({
      where,
      include: {
        orcamentos: {
          select: { id: true, precoVenda: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        projetos: {
          select: { id: true, titulo: true, status: true, valorTotal: true },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        vendas: {
          select: { id: true, valorTotal: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: { nome: 'asc' }
    });

    res.json({
      success: true,
      data: clientes,
      total: clientes.length
    });
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar clientes' 
    });
  }
};

// Buscar cliente por ID
export const getClienteById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        orcamentos: {
          include: {
            items: {
              include: {
                material: { select: { nome: true, sku: true } },
                kit: { select: { nome: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        projetos: {
          include: {
            orcamento: { select: { id: true, precoVenda: true } },
            tasks: { select: { id: true, titulo: true, status: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        vendas: {
          include: {
            contasReceber: { select: { id: true, valorParcela: true, status: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!cliente) {
      res.status(404).json({ 
        success: false,
        error: 'Cliente não encontrado' 
      });
      return;
    }

    res.json({
      success: true,
      data: cliente
    });
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar cliente' 
    });
  }
};

// Criar cliente
export const createCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nome, cpfCnpj, email, telefone, endereco, cidade, estado, cep } = req.body;

    // Verificar se CPF/CNPJ já existe
    const clienteExistente = await prisma.cliente.findUnique({
      where: { cpfCnpj }
    });

    if (clienteExistente) {
      res.status(400).json({
        success: false,
        error: 'Cliente com este CPF/CNPJ já existe'
      });
      return;
    }

    const cliente = await prisma.cliente.create({
      data: {
        nome,
        cpfCnpj,
        email,
        telefone,
        endereco,
        cidade,
        estado,
        cep
      }
    });

    res.status(201).json({
      success: true,
      data: cliente,
      message: 'Cliente criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao criar cliente' 
    });
  }
};

// Atualizar cliente
export const updateCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nome, cpfCnpj, email, telefone, endereco, cidade, estado, cep } = req.body;

    // Verificar se cliente existe
    const clienteExistente = await prisma.cliente.findUnique({
      where: { id }
    });

    if (!clienteExistente) {
      res.status(404).json({
        success: false,
        error: 'Cliente não encontrado'
      });
      return;
    }

    // Se CPF/CNPJ está sendo alterado, verificar se não existe outro cliente com o mesmo
    if (cpfCnpj && cpfCnpj !== clienteExistente.cpfCnpj) {
      const cpfCnpjExistente = await prisma.cliente.findUnique({
        where: { cpfCnpj }
      });

      if (cpfCnpjExistente) {
        res.status(400).json({
          success: false,
          error: 'Já existe outro cliente com este CPF/CNPJ'
        });
        return;
      }
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        nome,
        cpfCnpj,
        email,
        telefone,
        endereco,
        cidade,
        estado,
        cep
      }
    });

    res.json({
      success: true,
      data: cliente,
      message: 'Cliente atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao atualizar cliente' 
    });
  }
};

// Desativar ou excluir cliente permanentemente
export const deleteCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { permanent } = req.query; // ?permanent=true para exclusão permanente
    const userRole = (req as any).user?.role?.toLowerCase(); // Role do usuário autenticado

    // Verificar se cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id }
    });

    if (!cliente) {
      res.status(404).json({
        success: false,
        error: 'Cliente não encontrado'
      });
      return;
    }

    // EXCLUSÃO PERMANENTE (apenas Admin e Desenvolvedor)
    if (permanent === 'true') {
      // Verificar permissões: apenas Admin e Desenvolvedor podem excluir permanentemente
      if (!['admin', 'desenvolvedor', 'administrador'].includes(userRole)) {
        res.status(403).json({
          success: false,
          error: 'Acesso negado. Apenas Administradores e Desenvolvedores podem excluir clientes permanentemente.'
        });
        return;
      }

      // Exclusão permanente - deletar do banco
      await prisma.cliente.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Cliente excluído permanentemente do banco de dados'
      });
      return;
    }

    // SOFT DELETE (para outros usuários ou quando não especificado permanent)
    // Verificar se cliente tem orçamentos, projetos ou vendas ativos
    const orcamentosAtivos = await prisma.orcamento.count({
      where: { 
        clienteId: id,
        status: { not: 'Cancelado' }
      }
    });

    const projetosAtivos = await prisma.projeto.count({
      where: { 
        clienteId: id,
        status: { not: 'CANCELADO' }
      }
    });

    const vendasAtivas = await prisma.venda.count({
      where: { 
        clienteId: id,
        status: { not: 'Cancelada' }
      }
    });

    if (orcamentosAtivos > 0 || projetosAtivos > 0 || vendasAtivas > 0) {
      res.status(400).json({
        success: false,
        error: 'Não é possível desativar cliente com orçamentos, projetos ou vendas ativos'
      });
      return;
    }

    // Soft delete - marcar como inativo
    await prisma.cliente.update({
      where: { id },
      data: { ativo: false }
    });

    res.json({
      success: true,
      message: 'Cliente desativado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao desativar/excluir cliente:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao desativar/excluir cliente' 
    });
  }
};

// Reativar cliente
export const reativarCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Verificar se cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id }
    });

    if (!cliente) {
      res.status(404).json({
        success: false,
        error: 'Cliente não encontrado'
      });
      return;
    }

    if (cliente.ativo) {
      res.status(400).json({
        success: false,
        error: 'Cliente já está ativo'
      });
      return;
    }

    // Reativar cliente
    await prisma.cliente.update({
      where: { id },
      data: { ativo: true }
    });

    res.json({
      success: true,
      message: 'Cliente reativado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao reativar cliente:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao reativar cliente' 
    });
  }
};