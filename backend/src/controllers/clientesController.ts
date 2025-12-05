import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import fs from 'fs';

const prisma = new PrismaClient();

// Configurar multer para upload de JSON
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp/');
  },
  filename: (req, file, cb) => {
    cb(null, `clientes-${Date.now()}-${file.originalname}`);
  }
});

export const uploadJSON = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos JSON são permitidos'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

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
    const { nome, cpfCnpj, email, telefone, endereco, cidade, estado, cep, tipo } = req.body;

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
        cep,
        tipo: tipo || 'PJ'
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

// Criar cliente rápido (apenas nome e tipo)
export const createClienteRapido = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nome, tipo } = req.body;

    // Validação
    if (!nome || nome.trim().length < 3) {
      res.status(400).json({
        success: false,
        error: 'Nome do cliente deve ter pelo menos 3 caracteres'
      });
      return;
    }

    if (!tipo || !['PF', 'PJ'].includes(tipo)) {
      res.status(400).json({
        success: false,
        error: 'Tipo deve ser PF ou PJ'
      });
      return;
    }

    // Criar cliente com CPF/CNPJ placeholder
    const cliente = await prisma.cliente.create({
      data: {
        nome: nome.trim(),
        tipo,
        cpfCnpj: `TEMP-${Date.now()}`, // Temporário, será atualizado após criar
        ativo: true
      }
    });

    // Atualizar CPF/CNPJ com ID do cliente
    const clienteAtualizado = await prisma.cliente.update({
      where: { id: cliente.id },
      data: {
        cpfCnpj: `N/A-${cliente.id}`
      }
    });

    res.status(201).json({
      success: true,
      data: clienteAtualizado,
      message: 'Cliente criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar cliente rápido:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao criar cliente rápido' 
    });
  }
};

// Atualizar cliente
export const updateCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nome, cpfCnpj, email, telefone, endereco, cidade, estado, cep, tipo } = req.body;

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
        cep,
        tipo: tipo || clienteExistente.tipo || 'PJ'
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

// Preview de importação (validação antes de salvar)
export const previewImportacao = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        error: 'Nenhum arquivo foi enviado'
      });
      return;
    }

    console.log('📥 Preview de importação do arquivo:', file.path);

    // Ler arquivo JSON
    const jsonContent = fs.readFileSync(file.path, 'utf-8');
    let jsonData = JSON.parse(jsonContent);

    // Remover wrapper se existir
    if (jsonData.success && jsonData.data) {
      jsonData = jsonData.data;
    }

    if (!jsonData.clientes || !Array.isArray(jsonData.clientes)) {
      res.status(400).json({
        success: false,
        error: 'Formato JSON inválido. Deve conter array "clientes"'
      });
      return;
    }

    // Buscar todos os clientes existentes para comparação
    const clientesExistentes = await prisma.cliente.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        cpfCnpj: true,
        email: true
      }
    });

    // Criar mapa para busca rápida (cpfCnpj como chave)
    const mapaExistentes = new Map<string, typeof clientesExistentes[0]>();
    clientesExistentes.forEach(c => {
      mapaExistentes.set(c.cpfCnpj, c);
    });

    // Processar clientes para preview com informações de comparação
    const clientesPreview = jsonData.clientes.map((cliente: any, index: number) => {
      const clienteExistente = mapaExistentes.get(cliente.cpfCnpj);
      const status = clienteExistente ? 'atualizar' : 'criar';
      
      return {
        linha: index + 1,
        nome: cliente.nome,
        cpfCnpj: cliente.cpfCnpj,
        email: cliente.email,
        telefone: cliente.telefone,
        endereco: cliente.endereco || '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        cep: cliente.cep || '',
        tipo: cliente.tipo || 'PJ',
        ativo: cliente.ativo !== false,
        status,
        clienteExistenteId: clienteExistente?.id,
        clienteExistenteNome: clienteExistente?.nome,
        avisos: []
      };
    });

    // Limpar arquivo temporário
    fs.unlinkSync(file.path);

    res.json({
      success: true,
      data: {
        totalClientes: clientesPreview.length,
        criar: clientesPreview.filter((c: any) => c.status === 'criar').length,
        atualizar: clientesPreview.filter((c: any) => c.status === 'atualizar').length,
        clientes: clientesPreview
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao fazer preview de importação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao fazer preview de importação'
    });
  }
};

// Importar clientes de JSON
export const importarClientes = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    const clientes = req.body?.clientes;

    if (!file && !clientes) {
      res.status(400).json({
        success: false,
        error: 'Nenhum arquivo ou dados foram enviados'
      });
      return;
    }

    let clientesParaImportar: any[] = [];

    if (clientes && Array.isArray(clientes)) {
      // Se vier do modal de preview, usar os dados já processados
      clientesParaImportar = clientes;
    } else if (file) {
      // Se vier direto do arquivo, processar normalmente
      console.log('📥 Importando clientes do arquivo:', file.filename);

      const jsonContent = fs.readFileSync(file.path, 'utf-8');
      let jsonData = JSON.parse(jsonContent);

      if (jsonData.success && jsonData.data) {
        jsonData = jsonData.data;
      }

      if (!jsonData.clientes || !Array.isArray(jsonData.clientes)) {
        res.status(400).json({
          success: false,
          error: 'Formato JSON inválido. Deve conter array "clientes"'
        });
        return;
      }

      clientesParaImportar = jsonData.clientes;
    }

    // Processar clientes
    const resultados = {
      criados: 0,
      atualizados: 0,
      erros: 0,
      detalhes: [] as Array<{
        nome: string;
        cpfCnpj: string;
        status: 'criado' | 'atualizado' | 'erro';
        erro?: string;
      }>
    };

    for (const clienteData of clientesParaImportar) {
      try {
        // Validar campos obrigatórios
        if (!clienteData.nome || !clienteData.cpfCnpj || !clienteData.email || !clienteData.telefone) {
          resultados.erros++;
          resultados.detalhes.push({
            nome: clienteData.nome || 'Sem nome',
            cpfCnpj: clienteData.cpfCnpj || 'Sem CPF/CNPJ',
            status: 'erro',
            erro: 'Campos obrigatórios faltando (nome, cpfCnpj, email, telefone)'
          });
          continue;
        }

        // Verificar se cliente já existe
        const clienteExistente = await prisma.cliente.findUnique({
          where: { cpfCnpj: clienteData.cpfCnpj }
        });

        if (clienteExistente) {
          // Atualizar cliente existente
          await prisma.cliente.update({
            where: { id: clienteExistente.id },
            data: {
              nome: clienteData.nome,
              email: clienteData.email,
              telefone: clienteData.telefone,
              endereco: clienteData.endereco || clienteExistente.endereco,
              cidade: clienteData.cidade || clienteExistente.cidade,
              estado: clienteData.estado || clienteExistente.estado,
              cep: clienteData.cep || clienteExistente.cep,
              tipo: clienteData.tipo || clienteExistente.tipo,
              ativo: clienteData.ativo !== false
            }
          });

          resultados.atualizados++;
          resultados.detalhes.push({
            nome: clienteData.nome,
            cpfCnpj: clienteData.cpfCnpj,
            status: 'atualizado'
          });

          console.log(`✅ Cliente atualizado: ${clienteData.nome}`);
        } else {
          // Criar novo cliente
          await prisma.cliente.create({
            data: {
              nome: clienteData.nome,
              cpfCnpj: clienteData.cpfCnpj,
              email: clienteData.email,
              telefone: clienteData.telefone,
              endereco: clienteData.endereco || '',
              cidade: clienteData.cidade || '',
              estado: clienteData.estado || '',
              cep: clienteData.cep || '',
              tipo: clienteData.tipo || 'PJ',
              ativo: clienteData.ativo !== false
            }
          });

          resultados.criados++;
          resultados.detalhes.push({
            nome: clienteData.nome,
            cpfCnpj: clienteData.cpfCnpj,
            status: 'criado'
          });

          console.log(`✅ Cliente criado: ${clienteData.nome}`);
        }
      } catch (error: any) {
        console.error(`❌ Erro ao processar cliente ${clienteData.nome}:`, error);
        resultados.erros++;
        resultados.detalhes.push({
          nome: clienteData.nome || 'Sem nome',
          cpfCnpj: clienteData.cpfCnpj || 'Sem CPF/CNPJ',
          status: 'erro',
          erro: error.message || 'Erro desconhecido'
        });
      }
    }

    // Limpar arquivo temporário se existir
    if (file) {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.warn('Aviso: não foi possível deletar arquivo temporário');
      }
    }

    console.log('📊 Resultado da importação:', resultados);

    res.json({
      success: true,
      data: resultados,
      message: `Importação concluída: ${resultados.criados} criados, ${resultados.atualizados} atualizados, ${resultados.erros} erros`
    });
  } catch (error: any) {
    console.error('❌ Erro ao importar clientes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao importar clientes'
    });
  }
};

// Exportar template de clientes
export const exportarTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const template = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      instrucoes: 'Preencha os campos abaixo com os dados dos clientes. Campos obrigatórios: nome, cpfCnpj, email, telefone. O tipo deve ser "PF" (Pessoa Física) ou "PJ" (Pessoa Jurídica).',
      clientes: [
        {
          nome: 'EMPRESA EXEMPLO LTDA',
          cpfCnpj: '12.345.678/0001-90',
          email: 'contato@empresaexemplo.com.br',
          telefone: '(47) 3333-4444',
          endereco: 'Rua Exemplo, 123',
          cidade: 'Itajaí',
          estado: 'SC',
          cep: '88300-000',
          tipo: 'PJ',
          ativo: true
        },
        {
          nome: 'João da Silva',
          cpfCnpj: '123.456.789-00',
          email: 'joao.silva@email.com',
          telefone: '(47) 99999-8888',
          endereco: 'Avenida Principal, 456',
          cidade: 'Florianópolis',
          estado: 'SC',
          cep: '88000-000',
          tipo: 'PF',
          ativo: true
        }
      ]
    };

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Erro ao exportar template:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao exportar template'
    });
  }
};

// Exportar clientes existentes
export const exportarClientes = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientes = await prisma.cliente.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' }
    });

    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      totalClientes: clientes.length,
      clientes: clientes.map(c => ({
        nome: c.nome,
        cpfCnpj: c.cpfCnpj,
        email: c.email,
        telefone: c.telefone,
        endereco: c.endereco,
        cidade: c.cidade,
        estado: c.estado,
        cep: c.cep,
        tipo: c.tipo,
        ativo: c.ativo
      }))
    };

    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    console.error('Erro ao exportar clientes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao exportar clientes'
    });
  }
};