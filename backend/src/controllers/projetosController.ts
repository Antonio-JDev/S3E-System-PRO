import { Request, Response } from 'express';
import { ProjetoStatus } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { AuditoriaService } from '../services/auditoria.service';
import {
  projetosService,
  EstoqueInsuficienteError,
  validarCamposPlanejamentoOs,
  type CamposPlanejamentoOsInput,
} from '../services/projetos.service';
import { KitDisponibilidadeService } from '../services/kitDisponibilidade.service';
import { entrarNaFilaSeAplicavel } from '../services/vistoriaCelesc.service';

/** GET /api/projetos/busca?q=&limit=20 — busca OS para compra avulsa e vínculos */
export const buscarProjetos = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    if (q.length < 1) {
      res.json({ success: true, data: [] });
      return;
    }

    const projetos = await prisma.projeto.findMany({
      where: {
        status: { not: 'CANCELADO' },
        OR: [
          { titulo: { contains: q, mode: 'insensitive' } },
          { descricao: { contains: q, mode: 'insensitive' } },
          { cliente: { nome: { contains: q, mode: 'insensitive' } } },
        ],
      },
      take: limit * 3,
      select: {
        id: true,
        titulo: true,
        status: true,
        semObra: true,
        cliente: { select: { id: true, nome: true } },
        orcamento: { select: { numeroSequencial: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const qLower = q.toLowerCase();
    const filtrados = projetos
      .filter((p) => {
        const osNum = p.orcamento?.numeroSequencial
          ? `os-${p.orcamento.numeroSequencial}`.toLowerCase()
          : '';
        if (osNum.includes(qLower.replace(/\s/g, ''))) return true;
        return true;
      })
      .slice(0, limit);

    const ids = filtrados.map((p) => p.id);
    const obras = await prisma.obra.findMany({
      where: { projetoId: { in: ids } },
      select: { id: true, projetoId: true, nomeObra: true, status: true },
    });
    const obraPorProjeto = new Map(obras.map((o) => [o.projetoId!, o]));

    const data = filtrados.map((p) => {
      const obra = obraPorProjeto.get(p.id);
      return {
        id: p.id,
        titulo: p.titulo,
        status: p.status,
        semObra: p.semObra,
        numeroOs: p.orcamento?.numeroSequencial
          ? `OS-${p.orcamento.numeroSequencial}`
          : null,
        cliente: p.cliente,
        obra: obra
          ? { id: obra.id, nomeObra: obra.nomeObra, status: obra.status }
          : null,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Erro buscar projetos:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar ordens de serviço' });
  }
};

export const getKitDisponibilidadeBomItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projetoId, orcamentoItemId } = req.params;
    const result = await KitDisponibilidadeService.verificarItemOrcamentoProjeto(
      projetoId,
      orcamentoItemId,
    );
    if (!result) {
      res.status(404).json({ success: false, error: 'Item de kit não encontrado' });
      return;
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Erro kit-disponibilidade BOM:', error);
    res.status(500).json({ success: false, error: 'Erro ao verificar kit' });
  }
};

// Listar todos os projetos
export const getProjetos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, clienteId, dataInicio, dataFim } = req.query;
    
    const where: any = {};
    if (status) where.status = status;
    if (clienteId) where.clienteId = clienteId;
    
    if (dataInicio || dataFim) {
      where.dataInicio = {};
      if (dataInicio) where.dataInicio.gte = new Date(dataInicio as string);
      if (dataFim) where.dataInicio.lte = new Date(dataFim as string);
    }

    const projetos = await prisma.projeto.findMany({
      where,
      include: {
        cliente: {
          select: { id: true, nome: true, cpfCnpj: true }
        },
        orcamento: {
          select: { id: true, precoVenda: true, status: true, numeroSequencial: true, pedidoFaturado: true }
        },
        tasks: {
          select: { id: true, titulo: true, status: true, prioridade: true },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        alocacoes: {
          select: { 
            id: true, 
            dataInicio: true, 
            dataFimPrevisto: true, 
            status: true,
            equipe: { select: { nome: true, tipo: true } }
          },
          orderBy: { dataInicio: 'desc' }
        },
        vendas: {
          select: { id: true, valorTotal: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        responsavel: {
          select: { id: true, name: true, setor: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const data = projetos.map((p) => ({
      ...p,
      responsavel: p.responsavel
        ? { id: p.responsavel.id, nome: p.responsavel.name, setor: p.responsavel.setor, role: p.responsavel.role }
        : null,
    }));

    res.json({
      success: true,
      data,
      total: data.length
    });
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar projetos' 
    });
  }
};

// Buscar projeto por ID
export const getProjetoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const projeto = await prisma.projeto.findUnique({
      where: { id },
      include: {
        cliente: true,
        orcamento: {
          select: {
            id: true,
            precoVenda: true,
            status: true,
            numeroSequencial: true,
            titulo: true,
            pedidoFaturado: true,
            enderecoObra: true,
            cidade: true,
            responsavelObra: true,
            items: {
              include: {
                material: { select: { nome: true, sku: true } },
                kit: { select: { nome: true } }
              }
            }
          }
        },
        tasks: {
          include: {
            // responsavel: { select: { nome: true, email: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        alocacoes: {
          include: {
            equipe: { select: { nome: true, tipo: true, membros: true } }
          },
          orderBy: { dataInicio: 'desc' }
        },
        vendas: {
          include: {
            contasReceber: { select: { id: true, valorParcela: true, status: true, dataVencimento: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        notasFiscais: {
          orderBy: { dataEmissao: 'desc' }
        }
      }
    });

    if (!projeto) {
      res.status(404).json({ 
        success: false,
        error: 'Projeto não encontrado' 
      });
      return;
    }

    res.json({
      success: true,
      data: projeto
    });
  } catch (error) {
    console.error('Erro ao buscar projeto:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar projeto' 
    });
  }
};

// Criar projeto
export const createProjeto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orcamentoId, clienteId, titulo, descricao, tipo, responsavelId, dataInicio, dataPrevisao, horasEngenhariaOrcadas, diariasEquipeOrcadas, valorHoraEngenharia, valorDiariaEquipe, exigeVistoriaCelesc } = req.body;

    console.log('🏗️ Criando projeto/obra com dados:', {
      orcamentoId,
      clienteId,
      titulo,
      tipo,
      responsavelId,
      dataInicio,
      dataPrevisao
    });

    // Verificar se orçamento foi fornecido (obrigatório)
    if (!orcamentoId) {
      console.error('❌ Orçamento não fornecido');
      res.status(400).json({
        success: false,
        error: 'Orçamento é obrigatório para criar projeto/obra'
      });
      return;
    }

    // Ordem de serviço independe do pedido de venda (PV). Bloquear só orçamentos encerrados negativamente.
    console.log('🔍 Buscando orçamento:', orcamentoId);
    const orcamento = await prisma.orcamento.findUnique({
      where: { id: orcamentoId }
    });

    if (!orcamento) {
      console.error('❌ Orçamento não encontrado:', orcamentoId);
      res.status(404).json({
        success: false,
        error: 'Orçamento não encontrado'
      });
      return;
    }

    console.log('✅ Orçamento encontrado:', {
      id: orcamento.id,
      titulo: orcamento.titulo,
      status: orcamento.status
    });

    const statusBloqueiaOs = new Set(['Recusado', 'Declinado', 'Cancelado']);
    if (statusBloqueiaOs.has(orcamento.status)) {
      console.error('❌ Orçamento não permite criar OS. Status:', orcamento.status);
      res.status(400).json({
        success: false,
        error: `Não é possível criar ordem de serviço para orçamento com status "${orcamento.status}".`
      });
      return;
    }

    // Verificar se já existe projeto para este orçamento
    console.log('🔍 Verificando se já existe projeto para este orçamento...');
    const projetoExistente = await prisma.projeto.findUnique({
      where: { orcamentoId }
    });

    if (projetoExistente) {
      console.error('❌ Já existe projeto para este orçamento:', projetoExistente.id);
      res.status(400).json({
        success: false,
        error: `Já existe um projeto/obra vinculado a este orçamento: "${projetoExistente.titulo}"`
      });
      return;
    }

    // Usar o clienteId do orçamento (já validado acima)
    const clienteIdFinal = clienteId || orcamento.clienteId;

    // Verificar se responsável existe (se fornecido)
    if (responsavelId) {
      const responsavel = await prisma.user.findUnique({
        where: { id: responsavelId }
      });

      if (!responsavel) {
        res.status(404).json({
          success: false,
          error: 'Responsável não encontrado'
        });
        return;
      }
    }

    // Criar projeto (com scaffolding de tasks por tipo de workflow)
    const authUser = (req as AuthRequest).user;

    try {
      validarCamposPlanejamentoOs({
        responsavelId: responsavelId || null,
        dataInicio: dataInicio || new Date(),
        dataPrevisao: dataPrevisao || null,
        horasEngenhariaOrcadas: horasEngenhariaOrcadas ?? 0,
        diariasEquipeOrcadas: diariasEquipeOrcadas ?? 0,
      });
    } catch (validationError) {
      res.status(400).json({
        success: false,
        error: validationError instanceof Error ? validationError.message : 'Dados de planejamento inválidos',
      });
      return;
    }

    const projetoBase = await projetosService.criarProjeto({
      orcamentoId,
      clienteId: clienteIdFinal,
      responsavelId: responsavelId || null,
      titulo,
      descricao: descricao || '',
      tipo: tipo || 'Instalacao',
      dataInicio: dataInicio ? new Date(dataInicio) : new Date(),
      dataPrevisao: dataPrevisao ? new Date(dataPrevisao) : undefined,
      criadoPorId: authUser?.userId ?? null,
      horasEngenhariaOrcadas: horasEngenhariaOrcadas != null ? Number(horasEngenhariaOrcadas) : 0,
      diariasEquipeOrcadas: diariasEquipeOrcadas != null ? Number(diariasEquipeOrcadas) : 0,
      valorHoraEngenharia: valorHoraEngenharia != null ? Number(valorHoraEngenharia) : null,
      valorDiariaEquipe: valorDiariaEquipe != null ? Number(valorDiariaEquipe) : null,
      exigeVistoriaCelesc: Boolean(exigeVistoriaCelesc),
    });

    const projeto = await prisma.projeto.findUnique({
      where: { id: projetoBase.id },
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
          },
        },
        responsavel: {
          select: {
            id: true,
            name: true,
          },
        },
        orcamento: {
          select: {
            id: true,
            titulo: true,
            precoVenda: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: projeto,
      message: 'Projeto criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    const message = error instanceof Error ? error.message : 'Erro ao criar projeto';
    res.status(400).json({
      success: false,
      error: message,
    });
  }
};

// Atualizar projeto
export const updateProjeto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      titulo,
      descricao,
      valorTotal,
      tipo,
      responsavelId,
      dataInicio,
      dataPrevisao,
      dataFim,
      dataPrevistaInicio,
      dataPrevistaFim,
      semObra,
      justificativaSemObra,
      enderecoObra,
      cidade,
      estado,
      responsavelObra,
      horasEngenhariaOrcadas,
      diariasEquipeOrcadas,
      valorHoraEngenharia,
      valorDiariaEquipe,
      exigeVistoriaCelesc,
    } = req.body;

    const projetoExistente = await prisma.projeto.findUnique({
      where: { id }
    });

    if (!projetoExistente) {
      res.status(404).json({
        success: false,
        error: 'Projeto não encontrado'
      });
      return;
    }

    const isConcluido = projetoExistente.status === 'CONCLUIDO';
    const dataInicioPayload = dataInicio ?? dataPrevistaInicio;
    const dataPrevisaoPayload = dataPrevisao ?? dataPrevistaFim;

    if (typeof responsavelId !== 'undefined') {
      const responsavelIdFinal =
        responsavelId === '' || responsavelId === null ? null : String(responsavelId);

      if (responsavelIdFinal) {
        const responsavel = await prisma.user.findUnique({
          where: { id: responsavelIdFinal }
        });

        if (!responsavel) {
          res.status(404).json({
            success: false,
            error: 'Responsável não encontrado'
          });
          return;
        }
      }
    }

    const data: Record<string, unknown> = {};

    if (!isConcluido) {
      if (titulo !== undefined) data.titulo = titulo;
      if (descricao !== undefined) data.descricao = descricao;
      if (valorTotal !== undefined) data.valorTotal = valorTotal;
      if (tipo !== undefined) data.tipo = tipo;
      if (dataInicioPayload) data.dataInicio = new Date(dataInicioPayload);
      if (dataPrevisaoPayload) data.dataPrevisao = new Date(dataPrevisaoPayload);
      if (dataFim) data.dataFim = new Date(dataFim);
    }

    if (typeof responsavelId !== 'undefined') {
      data.responsavelId =
        responsavelId === '' || responsavelId === null ? null : String(responsavelId);
    }

    if (typeof enderecoObra !== 'undefined') data.enderecoObra = enderecoObra || null;
    if (typeof cidade !== 'undefined') data.cidade = cidade || null;
    if (typeof estado !== 'undefined') data.estado = estado || null;
    if (typeof responsavelObra !== 'undefined') data.responsavelObra = responsavelObra || null;

    if (typeof semObra !== 'undefined') data.semObra = Boolean(semObra);
    if (typeof justificativaSemObra !== 'undefined') {
      data.justificativaSemObra = justificativaSemObra || null;
    }
    if (typeof exigeVistoriaCelesc !== 'undefined') {
      data.exigeVistoriaCelesc = Boolean(exigeVistoriaCelesc);
      if (data.exigeVistoriaCelesc && !projetoExistente.statusVistoria) {
        // entrada na fila ocorre após update via entrarNaFilaSeAplicavel
      }
      if (!data.exigeVistoriaCelesc) {
        // Mantém histórico; limpa apenas status ativo da fila se desligar a flag
        if (
          projetoExistente.statusVistoria &&
          projetoExistente.statusVistoria !== 'VISTORIA_APROVADA'
        ) {
          data.statusVistoria = null;
          data.dataProtocoloVistoria = null;
        }
      }
    }

    if (!isConcluido) {
      if (horasEngenhariaOrcadas !== undefined) {
        data.horasEngenhariaOrcadas = Number(horasEngenhariaOrcadas) || 0;
      }
      if (diariasEquipeOrcadas !== undefined) {
        data.diariasEquipeOrcadas = Number(diariasEquipeOrcadas) || 0;
      }
      if (valorHoraEngenharia !== undefined) {
        data.valorHoraEngenharia =
          valorHoraEngenharia === '' || valorHoraEngenharia == null
            ? null
            : Number(valorHoraEngenharia);
      }
      if (valorDiariaEquipe !== undefined) {
        data.valorDiariaEquipe =
          valorDiariaEquipe === '' || valorDiariaEquipe == null
            ? null
            : Number(valorDiariaEquipe);
      }
    }

    if (!isConcluido && Object.keys(data).some((k) =>
      ['responsavelId', 'dataInicio', 'dataPrevisao', 'horasEngenhariaOrcadas', 'diariasEquipeOrcadas'].includes(k)
    )) {
      const merged: CamposPlanejamentoOsInput = {
        responsavelId:
          data.responsavelId !== undefined
            ? (data.responsavelId as string | null)
            : projetoExistente.responsavelId,
        dataInicio: (data.dataInicio as Date | undefined) ?? projetoExistente.dataInicio,
        dataPrevisao: (data.dataPrevisao as Date | undefined) ?? projetoExistente.dataPrevisao,
        horasEngenhariaOrcadas:
          (data.horasEngenhariaOrcadas as number | undefined) ??
          projetoExistente.horasEngenhariaOrcadas,
        diariasEquipeOrcadas:
          (data.diariasEquipeOrcadas as number | undefined) ??
          projetoExistente.diariasEquipeOrcadas,
      };
      validarCamposPlanejamentoOs(merged);
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({
        success: false,
        error: isConcluido
          ? 'Nenhum campo permitido para atualização em projeto concluído'
          : 'Nenhum campo para atualizar'
      });
      return;
    }

    const projeto = await prisma.projeto.update({
      where: { id },
      data,
      include: {
        cliente: { select: { id: true, nome: true } },
        orcamento: { select: { id: true, precoVenda: true, numeroSequencial: true } },
        responsavel: { select: { id: true, name: true } }
      }
    });

    if (Boolean(projeto.exigeVistoriaCelesc)) {
      await entrarNaFilaSeAplicavel(id);
    }

    const projetoFinal = await prisma.projeto.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nome: true } },
        orcamento: { select: { id: true, precoVenda: true, numeroSequencial: true } },
        responsavel: { select: { id: true, name: true } },
      },
    });

    res.json({
      success: true,
      data: {
        ...(projetoFinal ?? projeto),
        responsavel: (projetoFinal ?? projeto).responsavel
          ? { id: (projetoFinal ?? projeto).responsavel!.id, nome: (projetoFinal ?? projeto).responsavel!.name }
          : null
      },
      message: 'Projeto atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao atualizar projeto' 
    });
  }
};

// Atualizar status do projeto
export const updateProjetoStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, ignorarEstoque } = req.body as {
      status: ProjetoStatus;
      ignorarEstoque?: boolean;
    };
    const authUser = (req as AuthRequest).user;

    if (!['PROPOSTA','APROVADO','EXECUCAO','CONCLUIDO','CANCELADO'].includes(String(status))) {
      // VALIDADO ainda aceito por compatibilidade, mapeado como APROVADO
      if (String(status) === 'VALIDADO') {
        // fall through to map below
      } else {
        res.status(400).json({ success: false, error: 'Status inválido. Use: PROPOSTA (pendente), APROVADO, EXECUCAO, CONCLUIDO, CANCELADO' });
        return;
      }
    }

    const statusEfetivo = (String(status) === 'VALIDADO' ? 'APROVADO' : status) as ProjetoStatus;

    const atualizado = await projetosService.atualizarStatus(id, statusEfetivo, {
      ignorarEstoque: Boolean(ignorarEstoque),
      userId: authUser?.userId,
    });

    res.json({ success: true, data: atualizado, message: `Status atualizado para ${statusEfetivo}` });
  } catch (error) {
    console.error('Erro ao atualizar status do projeto:', error);
    if (error instanceof EstoqueInsuficienteError) {
      res.status(409).json({
        success: false,
        error: error.message,
        code: error.code,
        materiaisFaltantes: error.materiaisFaltantes,
      });
      return;
    }
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Erro ao atualizar status do projeto';
    const bloqueioNegocio =
      message.includes('não pode ser concluída') ||
      message.includes('Não é possível concluir') ||
      message.includes('projeto de engenharia') ||
      message.includes('Organização Final') ||
      message.includes('BLOQUEADA');
    res.status(bloqueioNegocio ? 400 : 500).json({
      success: false,
      error: message,
    });
  }
};

/** Rollback de status da OS (admin): pode remover obra e estornar estoque. */
export const reverterProjetoStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: string };
    const user = (req as any).user;
    const role = String(user?.role || '').toLowerCase();
    const isAdminUser = user?.isAdmin === true;

    if (role !== 'desenvolvedor' && role !== 'admin' && role !== 'administrador' && !isAdminUser) {
      res.status(403).json({
        success: false,
        error: 'Apenas administradores podem reverter o status da ordem de serviço.',
      });
      return;
    }

    if (!['PROPOSTA', 'APROVADO'].includes(String(status))) {
      res.status(400).json({
        success: false,
        error: 'Status de destino inválido. Use: PROPOSTA (pendente) ou APROVADO',
      });
      return;
    }

    const atualizado = await projetosService.reverterStatus(
      id,
      status as 'PROPOSTA' | 'APROVADO',
    );

    res.json({
      success: true,
      data: atualizado,
      message: `Status revertido para ${status}`,
    });
  } catch (error: any) {
    console.error('Erro ao reverter status do projeto:', error);
    const msg = error?.message || 'Erro ao reverter status do projeto';
    const statusCode = msg.includes('inválido') || msg.includes('anterior') || msg.includes('cancelada')
      ? 400
      : 500;
    res.status(statusCode).json({ success: false, error: msg });
  }
};

// Cancelar/desativar projeto
export const deleteProjeto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { permanent } = req.query; // ?permanent=true para exclusão permanente
    const userRole = (req as any).user?.role; // Role do usuário autenticado
    const userId = (req as any).user?.userId; // ID do usuário autenticado

    // Verificar se projeto existe
    const projeto = await prisma.projeto.findUnique({
      where: { id },
      include: {
        cliente: { select: { nome: true } },
        orcamento: { select: { titulo: true } }
      }
    });

    if (!projeto) {
      res.status(404).json({
        success: false,
        error: 'Projeto não encontrado'
      });
      return;
    }

    // EXCLUSÃO PERMANENTE (apenas Admin e Desenvolvedor)
    if (permanent === 'true') {
      // Verificar permissões: apenas Admin e Desenvolvedor podem excluir permanentemente
      if (!['admin', 'desenvolvedor'].includes(userRole?.toLowerCase())) {
        res.status(403).json({
          success: false,
          error: '🚫 Acesso negado. Apenas Administradores e Desenvolvedores podem excluir projetos permanentemente.'
        });
        return;
      }


      // ✅ Verificar se há obra vinculada ao projeto
      const obraVinculada = await prisma.obra.findUnique({
        where: { projetoId: id },
        include: {
          tarefas: { select: { id: true } }
        }
      });

      // Log de auditoria antes de excluir
      console.log('═══════════════════════════════════════════════════════════');
      console.log('⚠️  EXCLUSÃO PERMANENTE DE PROJETO');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`📋 Projeto: ${projeto.titulo} (ID: ${projeto.id})`);
      console.log(`👤 Cliente: ${projeto.cliente?.nome || 'N/A'}`);
      console.log(`💰 Valor: R$ ${projeto.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      console.log(`📅 Criado em: ${projeto.createdAt.toLocaleString('pt-BR')}`);
      console.log(`🔑 Usuário: ${userId} (Role: ${userRole})`);
      console.log(`⏰ Data/Hora: ${new Date().toLocaleString('pt-BR')}`);

      if (obraVinculada) {
        console.log(`🏗️  Obra vinculada: ${obraVinculada.nomeObra} (ID: ${obraVinculada.id}, Status: ${obraVinculada.status}, Tarefas: ${obraVinculada.tarefas.length})`);
        console.log(`⚠️  A obra vinculada será EXCLUÍDA PERMANENTEMENTE junto com o projeto`);
      }
      console.log('═══════════════════════════════════════════════════════════');

      // ⚠️ ATENÇÃO: Isso vai excluir permanentemente o projeto e todas as relações em cascata
      // O onDelete: Cascade no schema já cuida da exclusão da obra, mas vamos fazer explicitamente
      // para ter logs melhores e garantir que todas as relações sejam tratadas corretamente
      if (obraVinculada) {
        console.log(`🗑️  Excluindo obra vinculada: ${obraVinculada.nomeObra} (ID: ${obraVinculada.id})`);
        await prisma.obra.delete({
          where: { id: obraVinculada.id }
        });
        console.log(`✅ Obra excluída permanentemente: ${obraVinculada.id}`);
      }

      await prisma.projeto.delete({
        where: { id }
      });

      // Registrar no audit log
      try {
        await AuditoriaService.registrarEvento({
          userId,
          userName: (req as any).user?.name,
          userRole,
          action: 'DELETE_PERMANENT',
          entity: 'Projeto',
          entityId: id,
          description: obraVinculada 
            ? `Excluiu permanentemente o projeto "${projeto.titulo}" e a obra vinculada "${obraVinculada.nomeObra}"`
            : `Excluiu permanentemente o projeto "${projeto.titulo}"`,
          metadata: {
            projectTitle: projeto.titulo,
            clientName: projeto.cliente?.nome,
            valorTotal: projeto.valorTotal,
            status: projeto.status,
            obraExcluida: obraVinculada ? {
              obraId: obraVinculada.id,
              obraNome: obraVinculada.nomeObra,
              obraStatus: obraVinculada.status,
              totalTarefas: obraVinculada.tarefas.length
            } : null
          }
        });
      } catch (logError) {
        console.error('Erro ao registrar audit log (stub):', logError);
      }

      res.json({
        success: true,

        message: obraVinculada 
          ? `⚠️ Projeto "${projeto.titulo}" e obra vinculada "${obraVinculada.nomeObra}" excluídos PERMANENTEMENTE do banco de dados`
          : '⚠️ Projeto excluído PERMANENTEMENTE do banco de dados',
        audit: {
          action: 'DELETE_PERMANENT',
          projectId: id,
          projectTitle: projeto.titulo,
          deletedBy: userId,
          deletedByRole: userRole,

          timestamp: new Date().toISOString(),
          obraExcluida: obraVinculada ? {
            obraId: obraVinculada.id,
            obraNome: obraVinculada.nomeObra,
            obraStatus: obraVinculada.status
          } : null
        }
      });
      return;
    }

    // SOFT DELETE (comportamento padrão)

    // ✅ Verificar se há obra vinculada ao projeto
    const obraVinculada = await prisma.obra.findUnique({
      where: { projetoId: id },
      include: {
        tarefas: { select: { id: true } },
        projeto: { select: { id: true, titulo: true } }
      }
    });

    // Verificar se projeto tem alocações ativas
    const alocacoesAtivas = await prisma.alocacaoObra.count({
      where: { 
        projetoId: id,
        status: { in: ['Planejada', 'EmAndamento'] }
      }
    });

    if (alocacoesAtivas > 0) {
      res.status(400).json({
        success: false,
        error: 'Não é possível cancelar projeto com alocações ativas'
      });
      return;
    }

    // ✅ Excluir obra vinculada antes de cancelar o projeto
    if (obraVinculada) {
      console.log(`🗑️  Excluindo obra vinculada ao projeto: ${obraVinculada.nomeObra} (ID: ${obraVinculada.id}, Status: ${obraVinculada.status})`);
      
      // Verificar se a obra tem tarefas em andamento
      const tarefasEmAndamento = obraVinculada.tarefas.length;
      
      if (tarefasEmAndamento > 0 && obraVinculada.status === 'ANDAMENTO') {
        console.log(`⚠️  Obra possui ${tarefasEmAndamento} tarefa(s) e está em andamento`);
      }

      // Excluir obra permanentemente (ou soft delete se preferir)
      // Como a obra está vinculada ao projeto, vamos excluir permanentemente
      await prisma.obra.delete({
        where: { id: obraVinculada.id }
      });
      
      console.log(`✅ Obra excluída: ${obraVinculada.id}`);
    }

    // Cancelar projeto
    await prisma.projeto.update({
      where: { id },
      data: { 
        status: 'CANCELADO',
        dataFim: new Date()
      }
    });

    // Registrar no audit log
    try {
      await AuditoriaService.registrarEvento({
        userId,
        userName: (req as any).user?.name,
        userRole,
        action: 'UPDATE',
        entity: 'Projeto',
        entityId: id,
        description: obraVinculada 
          ? `Cancelou o projeto "${projeto.titulo}" e excluiu a obra vinculada "${obraVinculada.nomeObra}"`
          : `Cancelou o projeto "${projeto.titulo}"`,
        metadata: {
          projectTitle: projeto.titulo,
          oldStatus: projeto.status,
          newStatus: 'CANCELADO',
          obraExcluida: obraVinculada ? {
            obraId: obraVinculada.id,
            obraNome: obraVinculada.nomeObra,
            obraStatus: obraVinculada.status,
            totalTarefas: obraVinculada.tarefas.length
          } : null
        }
      });
    } catch (logError) {
      console.error('Erro ao registrar audit log (stub):', logError);
    }

    res.json({
      success: true,
      message: obraVinculada 
        ? `Projeto "${projeto.titulo}" cancelado e obra vinculada "${obraVinculada.nomeObra}" excluída com sucesso`
        : 'Projeto cancelado com sucesso',
      obraExcluida: obraVinculada ? {
        id: obraVinculada.id,
        nome: obraVinculada.nomeObra,
        status: obraVinculada.status
      } : null
    });
  } catch (error) {
    console.error('Erro ao cancelar projeto:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao cancelar projeto' 
    });
  }
};

// Criar projeto a partir de orçamento
export const criarProjetoDeOrcamento = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orcamentoId, tipo } = req.body as { orcamentoId: string; tipo?: string };
    if (!orcamentoId) {
      res.status(400).json({ success: false, error: 'orcamentoId é obrigatório' });
      return;
    }
    const authUser = (req as AuthRequest).user;
    const projeto = await projetosService.criarProjetoAPartirDoOrcamento(orcamentoId, {
      tipo,
      criadoPorId: authUser?.userId ?? null,
    });
    res.status(201).json({ success: true, data: projeto, message: 'Projeto criado a partir do orçamento' });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Erro ao criar projeto do orçamento' });
  }
};

// Listar projetos com suporte a modo kanban
export const listarProjetosAvancado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { view } = req.query as { view?: 'kanban' | 'lista' };
    const data = await projetosService.listarProjetos(req.query, view === 'kanban' ? 'kanban' : 'lista');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao listar projetos' });
  }
};

/**
 * GET /api/projetos/ids-com-minhas-tarefas
 * Retorna IDs dos projetos (OS) em que o usuário logado tem tarefas no Kanban
 * com status "A Fazer" (ToDo) ou "Em Andamento" (Doing).
 * Usado para destacar cards e filtrar "Somente OS com minhas tarefas".
 */
export const getProjetosIdsComMinhasTarefas = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId ?? (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Usuário não autenticado' });
      return;
    }

    const tasks = await prisma.task.findMany({
      where: {
        status: { in: ['ToDo', 'Doing'] }
      },
      select: { projetoId: true, responsavel: true, responsaveisIds: true }
    });

    const ids = new Set<string>();
    for (const t of tasks) {
      const ehResponsavel = String(t.responsavel || '') === String(userId);
      const raw = t.responsaveisIds;
      const idsArr = Array.isArray(raw) ? raw : (raw != null ? Object.values(raw as Record<string, unknown>) : []);
      const estaAtribuido = idsArr.some((id: unknown) => String(id) === String(userId));
      if (ehResponsavel || estaAtribuido) ids.add(t.projetoId);
    }

    res.json({ success: true, data: Array.from(ids) });
  } catch (error) {
    console.error('Erro ao buscar projetos com tarefas do usuário:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar projetos com minhas tarefas' });
  }
};

/**
 * GET /api/projetos/ids-com-minhas-tarefas-atrasadas
 * Retorna IDs dos projetos (OS) em que o usuário logado tem tarefas no Kanban
 * com status "A Fazer" (ToDo) ou "Em Andamento" (Doing) e cujo prazo já expirou.
 * Usado para destacar visualmente OS com tarefas atrasadas (borda vermelha e flag).
 */
export const getProjetosIdsComMinhasTarefasAtrasadas = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId ?? (req as any).user?.id;
    const userRole = String((req as any).user?.role || '');
    if (!userId) {
      res.status(401).json({ success: false, error: 'Usuário não autenticado' });
      return;
    }

    const roleLower = userRole.toLowerCase();
    const isPrivileged = roleLower === 'admin' || roleLower === 'administrador' || roleLower === 'desenvolvedor';

    const now = new Date();
    const tasks = await prisma.task.findMany({
      where: {
        status: { in: ['ToDo', 'Doing'] },
        prazo: { not: null, lt: now }
      },
      select: { projetoId: true, responsavel: true, responsaveisIds: true }
    });

    const ids = new Set<string>();
    for (const t of tasks) {
      if (isPrivileged) {
        ids.add(t.projetoId);
        continue;
      }
      const ehResponsavel = String(t.responsavel || '') === String(userId);
      const raw = t.responsaveisIds;
      const idsArr = Array.isArray(raw) ? raw : (raw != null ? Object.values(raw as Record<string, unknown>) : []);
      const estaAtribuido = idsArr.some((id: unknown) => String(id) === String(userId));
      if (ehResponsavel || estaAtribuido) ids.add(t.projetoId);
    }

    res.json({ success: true, data: Array.from(ids) });
  } catch (error) {
    console.error('Erro ao buscar projetos com tarefas atrasadas do usuário:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar projetos com minhas tarefas atrasadas' });
  }
};

function toStartOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function toEndOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function safeHoursDiff(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return ms / (1000 * 60 * 60);
}

/** Relatórios de tempo do Kanban (OS): apenas Admin, Dev ou usuário com flag isAdmin no token. */
function canAccessKanbanRelatorio(req: Request): boolean {
  const u = (req as AuthRequest).user;
  if (!u) return false;
  if (u.isAdmin === true) return true;
  const role = String(u.role || '').toLowerCase();
  return role === 'admin' || role === 'desenvolvedor';
}

/**
 * GET /api/projetos/relatorios/kanban-usuarios
 * Relatório por usuário (Admin/Dev) no período:
 * - tempo médio para concluir tasks (createdAt -> updatedAt para status Done)
 * - tempo total/médio/máximo em atraso (prazo -> conclusão ou agora)
 */
export const getRelatorioKanbanUsuarios = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!canAccessKanbanRelatorio(req)) {
      res.status(403).json({ success: false, error: 'Acesso negado. Apenas Admin/Dev.' });
      return;
    }

    const { start, end } = req.query as { start?: string; end?: string };
    const now = new Date();
    const startDate = start ? toStartOfDay(new Date(start)) : toStartOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30));
    const endDate = end ? toEndOfDay(new Date(end)) : toEndOfDay(now);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      res.status(400).json({ success: false, error: 'Datas inválidas. Use start/end no formato YYYY-MM-DD.' });
      return;
    }

    const [users, tasks] = await Promise.all([
      prisma.user.findMany({
        where: { active: true },
        select: { id: true, name: true, email: true, role: true }
      }),
      prisma.task.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        },
        select: {
          id: true,
          titulo: true,
          status: true,
          prazo: true,
          responsavel: true,
          responsaveisIds: true,
          createdAt: true,
          updatedAt: true
        }
      })
    ]);

    const userMap = new Map(users.map(u => [u.id, u]));
    const metrics: Record<string, {
      userId: string;
      name: string;
      email: string;
      role: string;
      totalAtribuidas: number;
      todo: number;
      doing: number;
      done: number;
      concluidasComTempo: number;
      somaHorasConclusao: number;
      atrasadas: number;
      somaHorasAtraso: number;
      maxHorasAtraso: number;
    }> = {};

    const ensure = (uid: string) => {
      const u = userMap.get(uid);
      if (!u) return null;
      if (!metrics[uid]) {
        metrics[uid] = {
          userId: uid,
          name: u.name,
          email: u.email,
          role: u.role,
          totalAtribuidas: 0,
          todo: 0,
          doing: 0,
          done: 0,
          concluidasComTempo: 0,
          somaHorasConclusao: 0,
          atrasadas: 0,
          somaHorasAtraso: 0,
          maxHorasAtraso: 0
        };
      }
      return metrics[uid];
    };

    const getAssignedUserIds = (t: { responsavel: string | null; responsaveisIds: any }): string[] => {
      const raw = t.responsaveisIds;
      const idsArr = Array.isArray(raw) ? raw : (raw != null ? Object.values(raw as Record<string, unknown>) : []);
      const merged = new Set<string>();
      for (const v of idsArr) if (v) merged.add(String(v));
      if (t.responsavel) merged.add(String(t.responsavel));
      return Array.from(merged);
    };

    for (const t of tasks) {
      const assigned = getAssignedUserIds({ responsavel: t.responsavel ?? null, responsaveisIds: t.responsaveisIds });
      if (!assigned.length) continue;

      const statusLower = String(t.status || '').toLowerCase();
      const isDone = statusLower === 'done';
      const isDoing = statusLower === 'doing';
      const isTodo = statusLower === 'todo';

      // Datas para métricas
      const prazo = t.prazo ? new Date(t.prazo) : null;
      const fim = isDone ? new Date(t.updatedAt) : now;

      for (const uid of assigned) {
        const m = ensure(uid);
        if (!m) continue;

        m.totalAtribuidas += 1;
        if (isDone) m.done += 1;
        else if (isDoing) m.doing += 1;
        else if (isTodo) m.todo += 1;

        if (isDone) {
          const horas = safeHoursDiff(new Date(t.updatedAt), new Date(t.createdAt));
          if (Number.isFinite(horas) && horas >= 0) {
            m.concluidasComTempo += 1;
            m.somaHorasConclusao += horas;
          }
        }

        if (prazo) {
          const atrasoHoras = safeHoursDiff(fim, prazo);
          if (Number.isFinite(atrasoHoras) && atrasoHoras > 0) {
            m.atrasadas += 1;
            m.somaHorasAtraso += atrasoHoras;
            if (atrasoHoras > m.maxHorasAtraso) m.maxHorasAtraso = atrasoHoras;
          }
        }
      }
    }

    const data = Object.values(metrics).map(m => ({
      userId: m.userId,
      name: m.name,
      email: m.email,
      role: m.role,
      totalAtribuidas: m.totalAtribuidas,
      todo: m.todo,
      doing: m.doing,
      done: m.done,
      avgHorasConclusao: m.concluidasComTempo ? (m.somaHorasConclusao / m.concluidasComTempo) : 0,
      atrasadas: m.atrasadas,
      atrasoPercent: m.totalAtribuidas ? (m.atrasadas / m.totalAtribuidas) * 100 : 0,
      totalHorasAtraso: m.somaHorasAtraso,
      avgHorasAtraso: m.atrasadas ? (m.somaHorasAtraso / m.atrasadas) : 0,
      maxHorasAtraso: m.maxHorasAtraso
    })).sort((a, b) => (b.totalHorasAtraso - a.totalHorasAtraso) || (b.atrasadas - a.atrasadas));

    res.json({
      success: true,
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
      data
    });
  } catch (error) {
    console.error('Erro ao gerar relatório kanban usuários:', error);
    res.status(500).json({ success: false, error: 'Erro ao gerar relatório' });
  }
};

/**
 * GET /api/projetos/relatorios/kanban-usuarios/:userId/atrasadas
 * Lista tasks atrasadas atribuídas a um usuário no período (Admin/Dev).
 * Período aplicado pelo createdAt da task.
 */
export const getRelatorioKanbanUsuarioAtrasadas = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!canAccessKanbanRelatorio(req)) {
      res.status(403).json({ success: false, error: 'Acesso negado. Apenas Admin/Dev.' });
      return;
    }

    const { userId } = req.params as { userId: string };
    const { start, end } = req.query as { start?: string; end?: string };
    const now = new Date();
    const startDate = start ? toStartOfDay(new Date(start)) : toStartOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30));
    const endDate = end ? toEndOfDay(new Date(end)) : toEndOfDay(now);

    if (!userId) {
      res.status(400).json({ success: false, error: 'userId é obrigatório' });
      return;
    }
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      res.status(400).json({ success: false, error: 'Datas inválidas. Use start/end no formato YYYY-MM-DD.' });
      return;
    }

    const tasks = await prisma.task.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        prazo: { not: null },
        status: { in: ['ToDo', 'Doing', 'Done'] }
      },
      select: {
        id: true,
        projetoId: true,
        titulo: true,
        status: true,
        prazo: true,
        responsavel: true,
        responsaveisIds: true,
        createdAt: true,
        updatedAt: true,
        projeto: { select: { titulo: true, orcamento: { select: { numeroSequencial: true } } } }
      }
    });

    const getAssignedUserIds = (t: { responsavel: string | null; responsaveisIds: any }): string[] => {
      const raw = t.responsaveisIds;
      const idsArr = Array.isArray(raw) ? raw : (raw != null ? Object.values(raw as Record<string, unknown>) : []);
      const merged = new Set<string>();
      for (const v of idsArr) if (v) merged.add(String(v));
      if (t.responsavel) merged.add(String(t.responsavel));
      return Array.from(merged);
    };

    const rows = tasks
      .filter(t => getAssignedUserIds({ responsavel: t.responsavel ?? null, responsaveisIds: t.responsaveisIds }).some(id => String(id) === String(userId)))
      .map(t => {
        const statusLower = String(t.status || '').toLowerCase();
        const isDone = statusLower === 'done';
        const prazo = t.prazo ? new Date(t.prazo) : null;
        const fim = isDone ? new Date(t.updatedAt) : now;
        const atrasoHoras = prazo ? safeHoursDiff(fim, prazo) : 0;
        const orcNum = (t as any).projeto?.orcamento?.numeroSequencial;
        return {
          taskId: t.id,
          projetoId: t.projetoId,
          projetoTitulo: (t as any).projeto?.titulo ?? null,
          numeroOs: orcNum != null ? `OS-${orcNum}` : null,
          titulo: t.titulo,
          status: t.status,
          prazo: prazo ? prazo.toISOString() : null,
          createdAt: new Date(t.createdAt).toISOString(),
          updatedAt: new Date(t.updatedAt).toISOString(),
          atrasoHoras: atrasoHoras > 0 ? atrasoHoras : 0,
          atrasada: atrasoHoras > 0
        };
      })
      .filter(r => r.atrasada)
      .sort((a, b) => b.atrasoHoras - a.atrasoHoras);

    res.json({
      success: true,
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
      data: rows
    });
  } catch (error) {
    console.error('Erro ao gerar drilldown de tarefas atrasadas:', error);
    res.status(500).json({ success: false, error: 'Erro ao gerar relatório detalhado' });
  }
};

// GET /api/projetos/progresso?ids=id1,id2,id3
export const getProjetosProgresso = async (req: Request, res: Response): Promise<void> => {
  try {
    const idsParam = String(req.query.ids || '');
    if (!idsParam) {
      res.status(400).json({ success: false, error: 'Parâmetro ids é obrigatório (ex: ?ids=id1,id2)' });
      return;
    }

    const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) {
      res.status(400).json({ success: false, error: 'ids inválido' });
      return;
    }

    // Buscar projetos básicos (status + semObra)
    const projetos = await prisma.projeto.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true, semObra: true }
    });

    // Agregar tasks por projeto/status
    const groups = await prisma.task.groupBy({
      by: ['projetoId', 'status'],
      where: { projetoId: { in: ids } },
      _count: { id: true }
    });

    // Montar mapa de contagens por projeto
    const map: Record<string, { tasksTotal: number; tasksConcluidas: number; obrasTotal: number; obrasConcluidas: number; percentual: number }> = {};

    // Inicializar
    projetos.forEach(p => {
      map[p.id] = { tasksTotal: 0, tasksConcluidas: 0, obrasTotal: 0, obrasConcluidas: 0, percentual: 0 };
    });

    groups.forEach(g => {
      const pid = (g.projetoId as string);
      const count = (g._count && g._count.id) ? g._count.id : 0;
      map[pid] = map[pid] || { tasksTotal: 0, tasksConcluidas: 0, obrasTotal: 0, obrasConcluidas: 0, percentual: 0 };
      map[pid].tasksTotal += count;
      // Considerar status concluído quando status == 'Done' (case-insensitive) ou 'Concluído' por compatibilidade
      const statusStr = String(g.status || '').toLowerCase();
      if (statusStr === 'done' || statusStr === 'concluído' || statusStr === 'concluido' || statusStr === 'concluded') {
        map[pid].tasksConcluidas += count;
      }
    });

    // Calcular obras e percentuais
    projetos.forEach(p => {
      const entry = map[p.id] || { tasksTotal: 0, tasksConcluidas: 0, obrasTotal: 0, obrasConcluidas: 0, percentual: 0 };
      const obrasTotal = p.semObra ? 0 : (p.status === 'EXECUCAO' || p.status === 'CONCLUIDO' ? 1 : 0);
      const obrasConcluidas = p.semObra ? 0 : (p.status === 'CONCLUIDO' ? 1 : 0);
      entry.obrasTotal = obrasTotal;
      entry.obrasConcluidas = obrasConcluidas;

      // Percentual (mesma regra do frontend/modal)
      let percentual = 0;
      if (p.semObra) {
        if (p.status === 'CONCLUIDO') percentual = 100; // OS sem obra marcada como concluída = 100%
        else if (entry.tasksTotal === 0) percentual = 0;
        else {
          percentual = Math.round((entry.tasksConcluidas / entry.tasksTotal) * 100);
          if (entry.tasksConcluidas === entry.tasksTotal) percentual = 100; // Todas as tarefas do Kanban = 100%
        }
      } else {
        const totalItens = entry.tasksTotal + entry.obrasTotal;
        const totalConcluidos = entry.tasksConcluidas + entry.obrasConcluidas;
        percentual = totalItens > 0 ? Math.round((totalConcluidos / totalItens) * 100) : 0;
      }
      entry.percentual = percentual;
      map[p.id] = entry;
    });

    res.json({ success: true, data: map });
  } catch (error) {
    console.error('Erro ao calcular progresso em lote:', error);
    res.status(500).json({ success: false, error: 'Erro ao calcular progresso' });
  }
};

// GET /api/projetos/cockpit-resumo?ids=id1,id2,id3
export const getProjetosCockpitResumo = async (req: Request, res: Response): Promise<void> => {
  try {
    const idsParam = String(req.query.ids || '');
    if (!idsParam) {
      res.status(400).json({ success: false, error: 'Parâmetro ids é obrigatório (ex: ?ids=id1,id2)' });
      return;
    }

    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) {
      res.status(400).json({ success: false, error: 'ids inválido' });
      return;
    }

    const { apropriacaoOsService } = await import('../services/apropriacaoOs.service');
    const data = await apropriacaoOsService.obterCockpitResumoBatch(ids);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao buscar cockpit-resumo em lote:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar resumo do cockpit' });
  }
};
