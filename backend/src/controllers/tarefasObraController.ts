import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// No CommonJS, __dirname já está disponível automaticamente

// Configuração do Multer para upload de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/tarefas-obra');
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `tarefa-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

export const uploadTarefaImages = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB por arquivo
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas (jpg, png, gif, webp)'));
    }
  }
}).array('imagens', 10); // Máximo 10 imagens por vez

/**
 * Verifica se um usuário é membro de uma equipe
 */
async function verificarSeUsuarioEstaNaEquipe(userId: string, equipeId: string): Promise<boolean> {
  try {
    console.log(`🔍 [verificarSeUsuarioEstaNaEquipe] Verificando se usuário ${userId} está na equipe ${equipeId}`);
    
    const equipe = await prisma.equipe.findUnique({
      where: { id: equipeId },
      select: { membros: true, ativa: true, nome: true }
    });
    
    if (!equipe) {
      console.log(`❌ [verificarSeUsuarioEstaNaEquipe] Equipe ${equipeId} não encontrada`);
      return false;
    }
    
    if (!equipe.ativa) {
      console.log(`❌ [verificarSeUsuarioEstaNaEquipe] Equipe ${equipe.nome} (${equipeId}) não está ativa`);
      return false;
    }
    
    const isMember = equipe.membros.includes(userId);
    console.log(`🔍 [verificarSeUsuarioEstaNaEquipe] Equipe "${equipe.nome}" tem ${equipe.membros.length} membros:`, equipe.membros);
    console.log(`${isMember ? '✅' : '❌'} [verificarSeUsuarioEstaNaEquipe] Usuário ${userId} ${isMember ? 'É' : 'NÃO É'} membro da equipe ${equipeId}`);
    
    return isMember;
  } catch (error) {
    console.error('❌ [verificarSeUsuarioEstaNaEquipe] Erro ao verificar membro da equipe:', error);
    return false;
  }
}

/**
 * GET /api/obras/tarefas
 * Lista tarefas do eletricista logado
 */
export const getTarefasEletricista = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role?.toLowerCase();
    
    if (!userId) {
      res.status(401).json({ success: false, error: 'Usuário não autenticado' });
      return;
    }
    
    // Se for desenvolvedor, mostrar TODAS as tarefas
    let tarefas;
    if (userRole === 'desenvolvedor') {
      tarefas = await prisma.tarefaObra.findMany({
        include: {
          obra: {
            include: {
              projeto: {
                include: {
                  cliente: true
                }
              },
              cliente: true
            }
          },
          registrosAtividade: {
            orderBy: { dataRegistro: 'desc' },
            take: 1
          }
        },
        orderBy: { dataPrevista: 'asc' }
      });
    } else {
      // Eletricista: tarefas atribuídas diretamente a ele OU tarefas de equipes onde ele é membro
      // Primeiro, buscar todas as equipes onde o usuário é membro
      const equipesDoUsuario = await prisma.equipe.findMany({
        where: {
          membros: {
            has: userId // Verifica se userId está no array membros
          },
          ativa: true
        },
        select: {
          id: true,
          nome: true
        }
      });
      
      const equipeIds = equipesDoUsuario.map(e => e.id);
      
      console.log(`🔍 Eletricista ${userId} está em ${equipeIds.length} equipe(s):`, equipesDoUsuario.map(e => e.nome));
      
      // Construir condições OR
      const condicoesOR: any[] = [
        // Tarefas atribuídas diretamente ao eletricista
        { atribuidoA: userId }
      ];
      
      // Adicionar condição de equipes se o usuário estiver em alguma equipe
      if (equipeIds.length > 0) {
        condicoesOR.push({ equipeId: { in: equipeIds } });
      }
      
      // Buscar tarefas: atribuídas diretamente OU atribuídas a equipes do usuário
      tarefas = await prisma.tarefaObra.findMany({
        where: {
          OR: condicoesOR
        },
        include: {
          obra: {
            include: {
              projeto: {
                include: {
                  cliente: true
                }
              },
              cliente: true
            }
          },
          registrosAtividade: {
            orderBy: { dataRegistro: 'desc' },
            take: 1
          }
        },
        orderBy: { dataPrevista: 'asc' }
      });
      
      console.log(`✅ Encontradas ${tarefas.length} tarefa(s) para o eletricista (${tarefas.filter(t => t.atribuidoA === userId).length} diretas, ${tarefas.filter(t => t.equipeId && equipeIds.includes(t.equipeId)).length} de equipes)`);
    }
    
    // Formatar resposta para o frontend
    const tarefasFormatadas = tarefas.map(tarefa => {
      const cliente = tarefa.obra.projeto?.cliente || tarefa.obra.cliente;
      
      return {
        ...tarefa,
        obra: {
          id: tarefa.obra.id,
          nomeObra: tarefa.obra.nomeObra,
          status: tarefa.obra.status, // ✅ IMPORTANTE: Incluir status da obra
          endereco: tarefa.obra.endereco || '',
          clienteNome: cliente?.nome || 'Cliente não informado'
        }
      };
    });
    
    console.log(`✅ Tarefas carregadas para ${userRole}: ${tarefasFormatadas.length}`);
    
    res.json({ 
      success: true, 
      data: tarefasFormatadas,
      count: tarefasFormatadas.length
    });
  } catch (error) {
    console.error('❌ Erro ao buscar tarefas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao buscar tarefas da obra' 
    });
  }
};

/**
 * POST /api/obras/tarefas/resumo
 * Salva resumo do dia com fotos
 */
export const salvarResumoTarefa = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { tarefaId, descricaoAtividade, horasTrabalhadas, observacoes, concluida } = req.body;
    const files = req.files as Express.Multer.File[];
    
    if (!userId) {
      res.status(401).json({ success: false, error: 'Usuário não autenticado' });
      return;
    }
    
    if (!tarefaId || !descricaoAtividade) {
      res.status(400).json({ 
        success: false, 
        error: 'TarefaId e descricaoAtividade são obrigatórios' 
      });
      return;
    }
    
    // Verificar se a tarefa existe e pertence ao usuário
    const tarefa = await prisma.tarefaObra.findUnique({
      where: { id: tarefaId },
      include: {
        obra: {
          select: {
            id: true,
            nomeObra: true
          }
        }
      }
    });
    
    if (!tarefa) {
      console.error(`❌ [salvarResumoTarefa] Tarefa ${tarefaId} não encontrada`);
      res.status(404).json({ success: false, error: 'Tarefa não encontrada' });
      return;
    }
    
    console.log(`✅ [salvarResumoTarefa] Tarefa encontrada: ${tarefa.descricao}`);
    console.log(`   - Obra: ${tarefa.obra?.nomeObra || 'N/A'} (${tarefa.obraId})`);
    console.log(`   - Atribuída a: ${tarefa.atribuidoA || 'Nenhum'}`);
    console.log(`   - Equipe: ${tarefa.equipeId || 'Nenhuma'}`);
    
    const userRole = (req as any).user?.role?.toLowerCase();
    
    console.log(`🔍 [salvarResumoTarefa] Usuário: ${userId}, Role: ${userRole}`);
    console.log(`🔍 [salvarResumoTarefa] Tarefa ID: ${tarefaId}`);
    console.log(`🔍 [salvarResumoTarefa] Tarefa atribuída a: ${tarefa.atribuidoA || 'Nenhum'}, Equipe: ${tarefa.equipeId || 'Nenhuma'}`);
    
    // Apenas eletricista atribuído, membro da equipe ou desenvolvedor podem registrar
    if (userRole !== 'desenvolvedor') {
      // Verificar se é tarefa atribuída diretamente ao usuário
      const tarefaAtribuidaDiretamente = tarefa.atribuidoA === userId;
      console.log(`🔍 [salvarResumoTarefa] Tarefa atribuída diretamente ao usuário: ${tarefaAtribuidaDiretamente}`);
      
      // Verificar se é tarefa de uma equipe onde o usuário é membro
      let tarefaDeEquipeDoUsuario = false;
      if (tarefa.equipeId) {
        console.log(`🔍 [salvarResumoTarefa] Verificando se usuário é membro da equipe ${tarefa.equipeId}...`);
        tarefaDeEquipeDoUsuario = await verificarSeUsuarioEstaNaEquipe(userId, tarefa.equipeId);
        console.log(`🔍 [salvarResumoTarefa] Usuário é membro da equipe: ${tarefaDeEquipeDoUsuario}`);
      } else {
        console.log(`🔍 [salvarResumoTarefa] Tarefa não tem equipeId`);
      }
      
      if (!tarefaAtribuidaDiretamente && !tarefaDeEquipeDoUsuario) {
        console.error(`❌ [salvarResumoTarefa] Acesso negado: Usuário ${userId} não tem permissão para registrar atividades na tarefa ${tarefaId}`);
        console.error(`   - Tarefa atribuída diretamente: ${tarefaAtribuidaDiretamente}`);
        console.error(`   - Tarefa de equipe do usuário: ${tarefaDeEquipeDoUsuario}`);
        res.status(403).json({ 
          success: false, 
          error: '🚫 Você não tem permissão para registrar atividades nesta tarefa. A tarefa deve estar atribuída a você ou a uma equipe da qual você faz parte.' 
        });
        return;
      }
      
      console.log(`✅ [salvarResumoTarefa] Permissão concedida para usuário ${userId}`);
    } else {
      console.log(`✅ [salvarResumoTarefa] Desenvolvedor - Acesso universal concedido`);
    }
    
    // Processar URLs das imagens
    const imagensUrls = files ? files.map(file => `/uploads/tarefas-obra/${file.filename}`) : [];
    
    // Validar horas trabalhadas
    const horas = parseFloat(horasTrabalhadas) || 8;
    if (horas <= 0 || horas > 24) {
      res.status(400).json({ 
        success: false, 
        error: 'Horas trabalhadas deve ser entre 0.5 e 24' 
      });
      return;
    }
    
    // Criar registro de atividade
    const registro = await prisma.registroAtividade.create({
      data: {
        tarefaId: tarefaId,
        descricaoAtividade: descricaoAtividade,
        horasTrabalhadas: horas,
        observacoes: observacoes || null,
        imagens: imagensUrls,
        dataRegistro: new Date()
      }
    });
    
    // Atualizar progresso da tarefa se marcada como concluída
    if (concluida === 'true' || concluida === true) {
      await prisma.tarefaObra.update({
        where: { id: tarefaId },
        data: { 
          progresso: 100,
          dataConclusaoReal: new Date()
        }
      });
    }
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'REGISTRO_TAREFA',
        entity: 'TarefaObra',
        entityId: tarefaId,
        description: `Eletricista registrou atividades do dia na tarefa`,
        metadata: {
          imagens: imagensUrls.length,
          concluida: concluida === 'true'
        }
      }
    });
    
    console.log(`✅ Resumo salvo para tarefa ${tarefaId} - ${imagensUrls.length} imagens`);
    
    res.json({ 
      success: true, 
      data: registro,
      message: '✅ Resumo do dia salvo com sucesso!',
      imagensCount: imagensUrls.length
    });
  } catch (error) {
    console.error('❌ Erro ao salvar resumo:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao salvar resumo da tarefa' 
    });
  }
};

/**
 * GET /api/obras/tarefas/:id
 * Busca uma tarefa específica com todos os registros
 */
export const getTarefaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role?.toLowerCase();
    
    const tarefa = await prisma.tarefaObra.findUnique({
      where: { id },
      include: {
        obra: {
          include: {
            projeto: {
              include: {
                cliente: true
              }
            },
            cliente: true
          }
        },
        registrosAtividade: {
          orderBy: { dataRegistro: 'desc' }
        }
      }
    });
    
    if (!tarefa) {
      res.status(404).json({ success: false, error: 'Tarefa não encontrada' });
      return;
    }
    
    // Verificar permissão (eletricista só vê suas próprias tarefas ou tarefas de suas equipes)
    if (userRole === 'eletricista') {
      const podeVer = 
        tarefa.atribuidoA === userId || // Tarefa atribuída diretamente a ele
        (tarefa.equipeId && await verificarSeUsuarioEstaNaEquipe(userId, tarefa.equipeId)); // Tarefa de uma equipe onde ele é membro
      
      if (!podeVer) {
        res.status(403).json({ 
          success: false, 
          error: '🚫 Você não tem permissão para visualizar esta tarefa' 
        });
        return;
      }
    }
    
    res.json({ success: true, data: tarefa });
  } catch (error) {
    console.error('❌ Erro ao buscar tarefa:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao buscar tarefa' 
    });
  }
};

/**
 * POST /api/obras/tarefas
 * Criar nova tarefa (apenas gerente/engenheiro/admin/desenvolvedor)
 */
export const criarTarefa = async (req: Request, res: Response): Promise<void> => {
  try {
    const { obraId, descricao, atribuidoA, equipeId, dataPrevista, dataPrevistaFim, observacoes } = req.body;
    const userId = (req as any).user?.userId;
    
    if (!obraId || !descricao) {
      res.status(400).json({ 
        success: false, 
        error: 'ObraId e descricao são obrigatórios' 
      });
      return;
    }
    
    // Verificar se a obra existe
    const obra = await prisma.obra.findUnique({
      where: { id: obraId }
    });
    
    if (!obra) {
      res.status(404).json({ success: false, error: 'Obra não encontrada' });
      return;
    }
    
    // Verificar se o usuário atribuído é eletricista (se fornecido)
    let eletricista = null;
    if (atribuidoA) {
      eletricista = await prisma.user.findUnique({
        where: { id: atribuidoA }
      });
      
      if (!eletricista || eletricista.role.toLowerCase() !== 'eletricista') {
        res.status(400).json({ 
          success: false, 
          error: 'Tarefas só podem ser atribuídas a eletricistas' 
        });
        return;
      }
    }

    // Verificar se equipe existe (se fornecida)
    let equipe = null;
    if (equipeId) {
      equipe = await prisma.equipe.findUnique({
        where: { id: equipeId }
      });
      
      if (!equipe) {
        res.status(404).json({ 
          success: false, 
          error: 'Equipe não encontrada' 
        });
        return;
      }
    }
    
    // Criar tarefa
    const tarefa = await prisma.tarefaObra.create({
      data: {
        obraId,
        descricao,
        atribuidoA: atribuidoA || null,
        equipeId: equipeId || null,
        dataPrevista: dataPrevista ? new Date(dataPrevista) : null,
        dataPrevistaFim: dataPrevistaFim ? new Date(dataPrevistaFim) : null,
        observacoes: observacoes || null,
        progresso: 0
      },
      include: {
        obra: true,
        registrosAtividade: true
      }
    });
    
    // Audit log
    let descricaoLog = 'Nova tarefa criada';
    if (equipe) {
      descricaoLog += ` e atribuída à equipe ${equipe.nome}`;
    } else if (eletricista) {
      descricaoLog += ` e atribuída ao eletricista ${eletricista.name}`;
    } else {
      descricaoLog += ' sem atribuição';
    }
    
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'CREATE',
        entity: 'TarefaObra',
        entityId: tarefa.id,
        description: descricaoLog,
        metadata: {
          obraId,
          eletricistaId: atribuidoA || null,
          equipeId: equipeId || null
        }
      }
    });
    
    console.log(`✅ Tarefa criada: ${tarefa.id} ${equipe ? `- Atribuída à equipe ${equipe.nome}` : eletricista ? `- Atribuída a ${eletricista.name}` : '- Sem atribuição'}`);
    
    res.json({ 
      success: true, 
      data: tarefa,
      message: '✅ Tarefa criada com sucesso!' 
    });
  } catch (error) {
    console.error('❌ Erro ao criar tarefa:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao criar tarefa da obra' 
    });
  }
};

/**
 * PUT /api/obras/tarefas/:id
 * Atualizar tarefa (apenas gerente/engenheiro/admin/desenvolvedor)
 */
export const atualizarTarefa = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { descricao, atribuidoA, equipeId, dataPrevista, dataPrevistaFim, progresso, observacoes } = req.body;
    const userId = (req as any).user?.userId;
    
    const tarefa = await prisma.tarefaObra.findUnique({
      where: { id }
    });
    
    if (!tarefa) {
      res.status(404).json({ success: false, error: 'Tarefa não encontrada' });
      return;
    }
    
    // Preparar dados para atualização
    const dataToUpdate: any = {};
    
    if (descricao !== undefined) dataToUpdate.descricao = descricao;
    if (observacoes !== undefined) dataToUpdate.observacoes = observacoes;
    if (progresso !== undefined) dataToUpdate.progresso = parseInt(progresso);
    
    // Campos que podem ser null
    if (atribuidoA !== undefined) {
      dataToUpdate.atribuidoA = atribuidoA || null;
    }
    if (equipeId !== undefined) {
      dataToUpdate.equipeId = equipeId || null;
    }
    if (dataPrevista !== undefined) {
      dataToUpdate.dataPrevista = dataPrevista ? new Date(dataPrevista) : null;
    }
    if (dataPrevistaFim !== undefined) {
      dataToUpdate.dataPrevistaFim = dataPrevistaFim ? new Date(dataPrevistaFim) : null;
    }
    
    // Atualizar tarefa
    const tarefaAtualizada = await prisma.tarefaObra.update({
      where: { id },
      data: dataToUpdate,
      include: {
        obra: true,
        registrosAtividade: {
          orderBy: { dataRegistro: 'desc' }
        }
      }
    });
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'UPDATE',
        entity: 'TarefaObra',
        entityId: id,
        description: `Tarefa atualizada`,
        metadata: req.body
      }
    });
    
    console.log(`✅ Tarefa atualizada: ${id}`);
    
    res.json({ 
      success: true, 
      data: tarefaAtualizada,
      message: '✅ Tarefa atualizada com sucesso!' 
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar tarefa:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao atualizar tarefa' 
    });
  }
};

/**
 * DELETE /api/obras/tarefas/:id
 * Deletar tarefa (apenas desenvolvedor/admin/gerente)
 */
export const deletarTarefa = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;
    
    const tarefa = await prisma.tarefaObra.findUnique({
      where: { id }
    });
    
    if (!tarefa) {
      res.status(404).json({ success: false, error: 'Tarefa não encontrada' });
      return;
    }
    
    // Deletar tarefa (cascade deleta registros de atividade)
    await prisma.tarefaObra.delete({
      where: { id }
    });
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'DELETE',
        entity: 'TarefaObra',
        entityId: id,
        description: `Tarefa excluída`,
        metadata: {
          obraId: tarefa.obraId
        }
      }
    });
    
    console.log(`✅ Tarefa deletada: ${id}`);
    
    res.json({ 
      success: true,
      message: '✅ Tarefa excluída com sucesso!' 
    });
  } catch (error) {
    console.error('❌ Erro ao deletar tarefa:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao deletar tarefa' 
    });
  }
};

/**
 * GET /api/obras/:obraId/tarefas
 * Lista todas as tarefas de uma obra específica
 */
export const getTarefasPorObra = async (req: Request, res: Response): Promise<void> => {
  try {
    const { obraId } = req.params;
    
    const tarefas = await prisma.tarefaObra.findMany({
      where: { obraId },
      include: {
        registrosAtividade: {
          orderBy: { dataRegistro: 'desc' }
        }
      },
      orderBy: { dataPrevista: 'asc' }
    });

    // Buscar informações dos eletricistas e equipes para cada tarefa
    const tarefasComNomes = await Promise.all(
      tarefas.map(async (tarefa) => {
        let atribuidoNome = null;
        let equipeNome = null;
        
        if (tarefa.atribuidoA) {
          const usuario = await prisma.user.findUnique({
            where: { id: tarefa.atribuidoA },
            select: { name: true }
          });
          atribuidoNome = usuario?.name || null;
        }

        if (tarefa.equipeId) {
          const equipe = await prisma.equipe.findUnique({
            where: { id: tarefa.equipeId },
            select: { nome: true }
          });
          equipeNome = equipe?.nome || null;
        }

        return {
          ...tarefa,
          atribuidoNome,
          equipeNome
        };
      })
    );
    
    console.log(`✅ Tarefas da obra ${obraId}: ${tarefasComNomes.length}`);
    
    res.json({ 
      success: true, 
      data: tarefasComNomes,
      count: tarefasComNomes.length
    });
  } catch (error) {
    console.error('❌ Erro ao buscar tarefas da obra:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao buscar tarefas da obra' 
    });
  }
};

/**
 * GET /api/obras/tarefas/registros/:tarefaId
 * Lista todos os registros de atividade de uma tarefa
 */
export const getRegistrosAtividade = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tarefaId } = req.params;
    
    const registros = await prisma.registroAtividade.findMany({
      where: { tarefaId },
      orderBy: { dataRegistro: 'desc' }
    });
    
    res.json({ 
      success: true, 
      data: registros,
      count: registros.length
    });
  } catch (error) {
    console.error('❌ Erro ao buscar registros:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao buscar registros de atividade' 
    });
  }
};

