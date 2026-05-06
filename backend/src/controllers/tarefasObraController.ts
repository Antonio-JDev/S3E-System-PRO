import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AuditoriaService } from '../services/auditoria.service';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// No CommonJS, __dirname já está disponível automaticamente

// Configuração do Multer para upload de imagens
// Usar process.cwd() para ficar alinhado ao express.static (app.ts): em Docker cwd=/app, volume em /app/uploads
const getTarefasObraUploadDir = () => path.join(process.cwd(), 'uploads', 'tarefas-obra');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = getTarefasObraUploadDir();
    
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
    console.log(`\n🔍 [verificarSeUsuarioEstaNaEquipe] Verificando se usuário ${userId} está na equipe ${equipeId}`);
    
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
    
    // Log detalhado para debug
    console.log(`📋 [verificarSeUsuarioEstaNaEquipe] Equipe: "${equipe.nome}"`);
    console.log(`👥 [verificarSeUsuarioEstaNaEquipe] Membros da equipe (${equipe.membros.length}):`, equipe.membros);
    console.log(`🔍 [verificarSeUsuarioEstaNaEquipe] Comparando com userId: "${userId}" (tipo: ${typeof userId})`);
    
    // Verificar cada membro (comparação segura como string)
    equipe.membros.forEach((membroId, index) => {
      const match = String(membroId) === String(userId);
      console.log(`  ${index + 1}. Membro: "${membroId}" (tipo: ${typeof membroId}) ${match ? '✅ MATCH!' : '❌ diferente'}`);
    });

    // Comparação resiliente (String)
    const isMember = equipe.membros.some(m => String(m) === String(userId));
    console.log(`\n${isMember ? '✅' : '❌'} [verificarSeUsuarioEstaNaEquipe] RESULTADO: Usuário ${userId} ${isMember ? 'É' : 'NÃO É'} membro da equipe ${equipeId}\n`);
    
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
            take: 1,
            include: {
              usuario: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              }
            }
          }
        },
        orderBy: { dataPrevista: 'asc' }
      });
    } else {
      // ELETRICISTA: Mostrar TODAS as tarefas de obras EM ANDAMENTO
      // Isso permite que ele veja o trabalho disponível e possa reportar progresso
      
      console.log(`\n========== 🔍 DEBUG TAREFAS ELETRICISTA ==========`);
      console.log(`Usuário ID: ${userId}`);
      console.log(`Role: ${userRole}`);
      
      // Buscar todas as tarefas de obras que estão em andamento ou a fazer
      tarefas = await prisma.tarefaObra.findMany({
        where: {
          obra: {
            status: {
              in: ['ANDAMENTO', 'A_FAZER'] // Obras em andamento ou a fazer
            }
          }
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
            take: 1,
            include: {
              usuario: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              }
            }
          }
        },
        orderBy: { dataPrevista: 'asc' }
      });
      
      // Categorizar tarefas
      const tarefasMinhas = tarefas.filter(t => t.atribuidoA === userId);
      const tarefasDisponiveis = tarefas.filter(t => !t.atribuidoA && !t.equipeId);
      const tarefasOutros = tarefas.filter(t => t.atribuidoA && t.atribuidoA !== userId);
      
      console.log(`\n📊 RESULTADO DA BUSCA:`);
      console.log(`Total de tarefas em obras ativas: ${tarefas.length}`);
      console.log(`  - Minhas tarefas: ${tarefasMinhas.length}`);
      console.log(`  - Tarefas disponíveis: ${tarefasDisponiveis.length}`);
      console.log(`  - Tarefas de outros: ${tarefasOutros.length}`);
      
      if (tarefas.length > 0) {
        console.log(`\n📋 LISTA DE TAREFAS (primeiras 10):`);
        tarefas.slice(0, 10).forEach((t, index) => {
          console.log(`  ${index + 1}. "${t.descricao}" (ID: ${t.id})`);
          console.log(`     - Obra: ${t.obra.nomeObra} (${t.obra.status})`);
          console.log(`     - AtribuidoA: ${t.atribuidoA || 'Nenhum'}`);
          console.log(`     - EquipeId: ${t.equipeId || 'Nenhuma'}`);
          console.log(`     - Progresso: ${t.progresso}%`);
        });
      } else {
        console.log(`⚠️ Nenhuma tarefa encontrada em obras com status ANDAMENTO ou A_FAZER`);
      }
      console.log(`========== FIM DEBUG ==========\n`);
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
            nomeObra: true,
            status: true // ✅ Incluir status da obra para verificação de permissão
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
    
    // Verificar permissões para eletricistas e usuários com privilégios especiais.
    // Permitimos também desenhista_industrial e engenheiro_eletricista como editores com privilégios.
    if (!['desenvolvedor','gerente','engenheiro','desenhista_industrial','engenheiro_eletricista'].includes(userRole)) {
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
      
      // Verificar se a tarefa está disponível (sem atribuição específica)
      const tarefaDisponivel = !tarefa.atribuidoA && !tarefa.equipeId;
      console.log(`🔍 [salvarResumoTarefa] Tarefa disponível (sem atribuição): ${tarefaDisponivel}`);
      
      // Verificar se a obra está em andamento (permite que qualquer eletricista registre atividades)
      const obraEmAndamento = tarefa.obra && ['ANDAMENTO', 'A_FAZER'].includes(tarefa.obra.status);
      console.log(`🔍 [salvarResumoTarefa] Obra em andamento: ${obraEmAndamento}`);
      
      // Permitir registro se:
      // 1. Tarefa atribuída diretamente ao usuário, OU
      // 2. Tarefa atribuída a uma equipe onde o usuário é membro, OU
      // 3. Tarefa disponível (sem atribuição) e obra em andamento, OU
      // 4. Tarefa atribuída apenas a equipe (sem pessoa específica) e obra em andamento (permite colaboração)
      //    IMPORTANTE: Permite que qualquer eletricista registre atividades em tarefas de obras em andamento,
      //    desde que a tarefa não esteja atribuída a outra pessoa específica (atribuidoA = null)
      const temPermissao = 
        tarefaAtribuidaDiretamente || 
        tarefaDeEquipeDoUsuario || 
        (tarefaDisponivel && obraEmAndamento) ||
        (obraEmAndamento && !tarefa.atribuidoA); // Permite se obra está em andamento e não está atribuída a pessoa específica (mesmo que tenha equipe)
      
      if (!temPermissao) {
        console.error(`❌ [salvarResumoTarefa] Acesso negado: Usuário ${userId} não tem permissão para registrar atividades na tarefa ${tarefaId}`);
        console.error(`   - Tarefa atribuída diretamente: ${tarefaAtribuidaDiretamente}`);
        console.error(`   - Tarefa de equipe do usuário: ${tarefaDeEquipeDoUsuario}`);
        console.error(`   - Tarefa disponível: ${tarefaDisponivel}`);
        console.error(`   - Obra em andamento: ${obraEmAndamento}`);
        res.status(403).json({ 
          success: false, 
          error: '🚫 Você não tem permissão para registrar atividades nesta tarefa. A tarefa deve estar atribuída a você, a uma equipe da qual você faz parte, ou estar disponível em uma obra em andamento.' 
        });
        return;
      }
      
      console.log(`✅ [salvarResumoTarefa] Permissão concedida para usuário ${userId}`);
    } else {
      console.log(`✅ [salvarResumoTarefa] Desenvolvedor/Gerente/Engenheiro - Acesso universal concedido`);
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
        usuarioId: userId, // ✅ Salvar quem fez o registro
        descricaoAtividade: descricaoAtividade,
        horasTrabalhadas: horas,
        observacoes: observacoes || null,
        imagens: imagensUrls,
        dataRegistro: new Date()
      },
      include: {
        usuario: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
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
    
    // Audit log (desativado) — usa stub de auditoria
    try {
      await AuditoriaService.registrarEvento({
        userId: userId,
        action: 'REGISTRO_TAREFA',
        entity: 'TarefaObra',
        entityId: tarefaId,
        description: `Eletricista registrou atividades do dia na tarefa`,
        metadata: {
          imagens: imagensUrls.length,
          concluida: concluida === 'true'
        }
      });
    } catch (err) {
      console.error('Erro ao registrar audit (stub):', err);
    }
    
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
          orderBy: { dataRegistro: 'desc' },
          include: {
            usuario: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
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
function parseAtribuidosIds(body: { atribuidoA?: string; atribuidosIds?: string[] }): string[] {
  const arr = Array.isArray(body.atribuidosIds) ? body.atribuidosIds : [];
  if (arr.length) return arr.filter(Boolean);
  if (body.atribuidoA) return [body.atribuidoA];
  return [];
}

export const criarTarefa = async (req: Request, res: Response): Promise<void> => {
  try {
    const { obraId, descricao, atribuidoA, atribuidosIds, equipeId, dataPrevista, dataPrevistaFim, observacoes } = req.body;
    const userId = (req as any).user?.userId;
    const ids = parseAtribuidosIds({ atribuidoA, atribuidosIds });
    const primeiro = ids[0] || atribuidoA || null;
    
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
    
    // Validar usuários atribuídos (se houver)
    let eletricista: { id: string; name: string; role: string } | null = null;
    if (primeiro) {
      const usuarioEncontrado = await prisma.user.findUnique({
        where: { id: primeiro }
      });
      if (!usuarioEncontrado) {
        res.status(404).json({ success: false, error: 'Usuário atribuído não encontrado' });
        return;
      }
      eletricista = { id: usuarioEncontrado.id, name: usuarioEncontrado.name, role: usuarioEncontrado.role };
    }

    // Verificar se equipe existe (se fornecida)
    let equipe: { id: string; nome: string; membros: string[]; ativa: boolean } | null = null;
    if (equipeId) {
      const equipeEncontrada = await prisma.equipe.findUnique({
        where: { id: equipeId },
        include: { alocacoes: false } // Apenas dados básicos
      });
      
      if (!equipeEncontrada) {
        res.status(404).json({ 
          success: false, 
          error: 'Equipe não encontrada' 
        });
        return;
      }
      
      equipe = {
        id: equipeEncontrada.id,
        nome: equipeEncontrada.nome,
        membros: equipeEncontrada.membros,
        ativa: equipeEncontrada.ativa
      };
      
      console.log(`\n👥 [criarTarefa] Equipe selecionada: "${equipe.nome}" (${equipe.id})`);
      console.log(`   Membros da equipe (${equipe.membros.length}):`, equipe.membros);
      console.log(`   Ativa: ${equipe.ativa}`);
    }
    
    console.log(`\n📝 [criarTarefa] Criando tarefa com:`);
    console.log(`   - Descrição: "${descricao}"`);
    console.log(`   - Obra ID: ${obraId}`);
    console.log(`   - Atribuído a (individual): ${atribuidoA || 'Nenhum'}`);
    console.log(`   - Equipe ID: ${equipeId || 'Nenhuma'}`);
    
    // Criar tarefa
    const tarefa = await prisma.tarefaObra.create({
      data: {
        obraId,
        descricao,
        atribuidoA: primeiro,
        atribuidosIds: ids.length ? (ids as Prisma.InputJsonValue) : Prisma.DbNull,
        equipeId: equipeId || null,
        // Parsear datas no formato YYYY-MM-DD para evitar problema de timezone
        dataPrevista: dataPrevista ? (typeof dataPrevista === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataPrevista) ? ((): Date => {
            const [y, m, d] = (dataPrevista as string).split('-').map(Number);
            return new Date(y, m - 1, d, 12, 0, 0, 0);
        })() : new Date(dataPrevista)) : null,
        dataPrevistaFim: dataPrevistaFim ? (typeof dataPrevistaFim === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataPrevistaFim) ? ((): Date => {
            const [y, m, d] = (dataPrevistaFim as string).split('-').map(Number);
            return new Date(y, m - 1, d, 12, 0, 0, 0);
        })() : new Date(dataPrevistaFim)) : null,
        observacoes: observacoes || null,
        progresso: 0
      },
      include: {
        obra: true,
        registrosAtividade: true
      }
    });
    
    console.log(`✅ [criarTarefa] Tarefa criada com ID: ${tarefa.id}`);
    console.log(`   - AtribuidoA salvo: ${tarefa.atribuidoA || 'Nenhum'}`);
    console.log(`   - EquipeId salvo: ${tarefa.equipeId || 'Nenhuma'}\n`);
    
    // Audit log
    let descricaoLog = 'Nova tarefa criada';
    if (equipe) {
      descricaoLog += ` e atribuída à equipe ${equipe.nome}`;
    } else if (eletricista) {
      descricaoLog += ` e atribuída ao eletricista ${eletricista.name}`;
    } else {
      descricaoLog += ' sem atribuição';
    }
    
    // Audit log (desativado) — usa stub de auditoria
    try {
      await AuditoriaService.registrarEvento({
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
      });
    } catch (err) {
      console.error('Erro ao registrar audit (stub):', err);
    }
    
    for (const uid of ids) {
      try {
        const { notificarAtribuicaoKanbanObras } = await import('../services/notificacoes.service');
        await notificarAtribuicaoKanbanObras(uid, obraId, tarefa.id, descricao || 'Nova tarefa', true);
      } catch (err) {
        console.error('Erro ao criar notificação de tarefa obra:', err);
      }
    }

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
    const { descricao, atribuidoA, atribuidosIds, equipeId, dataPrevista, dataPrevistaFim, progresso, observacoes } = req.body;
    const userId = (req as any).user?.userId;
    const ids = atribuidosIds !== undefined ? parseAtribuidosIds({ atribuidoA, atribuidosIds }) : undefined;
    const primeiro = ids !== undefined ? (ids[0] || null) : undefined;
    
    const tarefa = await prisma.tarefaObra.findUnique({
      where: { id }
    });
    
    if (!tarefa) {
      res.status(404).json({ success: false, error: 'Tarefa não encontrada' });
      return;
    }
    
    const dataToUpdate: any = {};
    if (descricao !== undefined) dataToUpdate.descricao = descricao;
    if (observacoes !== undefined) dataToUpdate.observacoes = observacoes;
    if (progresso !== undefined) dataToUpdate.progresso = parseInt(progresso);
    if (ids !== undefined) {
      dataToUpdate.atribuidoA = ids[0] || null;
      dataToUpdate.atribuidosIds = ids.length ? (ids as unknown as object) : null;
    } else if (atribuidoA !== undefined) {
      dataToUpdate.atribuidoA = atribuidoA || null;
      dataToUpdate.atribuidosIds = atribuidoA ? ([atribuidoA] as unknown as object) : null;
    }
    if (equipeId !== undefined) {
      dataToUpdate.equipeId = equipeId || null;
    }
    if (dataPrevista !== undefined) {
      if (dataPrevista) {
        if (typeof dataPrevista === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataPrevista)) {
          const [y, m, d] = dataPrevista.split('-').map(Number);
          dataToUpdate.dataPrevista = new Date(y, m - 1, d, 12, 0, 0, 0);
        } else {
          dataToUpdate.dataPrevista = new Date(dataPrevista);
        }
      } else {
        dataToUpdate.dataPrevista = null;
      }
    }
    if (dataPrevistaFim !== undefined) {
      if (dataPrevistaFim) {
        if (typeof dataPrevistaFim === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataPrevistaFim)) {
          const [y, m, d] = dataPrevistaFim.split('-').map(Number);
          dataToUpdate.dataPrevistaFim = new Date(y, m - 1, d, 12, 0, 0, 0);
        } else {
          dataToUpdate.dataPrevistaFim = new Date(dataPrevistaFim);
        }
      } else {
        dataToUpdate.dataPrevistaFim = null;
      }
    }
    
    // Atualizar tarefa
    const tarefaAtualizada = await prisma.tarefaObra.update({
      where: { id },
      data: dataToUpdate,
      include: {
        obra: true,
        registrosAtividade: {
          orderBy: { dataRegistro: 'desc' },
          include: {
            usuario: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }
      }
    });
    
    if (ids?.length) {
      for (const uid of ids) {
        try {
          const { notificarAtribuicaoKanbanObras } = await import('../services/notificacoes.service');
          await notificarAtribuicaoKanbanObras(uid, tarefa.obraId, id, tarefaAtualizada.descricao || 'Tarefa', true);
        } catch (err) {
          console.error('Erro ao criar notificação de tarefa obra:', err);
        }
      }
    }
    
    // Audit log (desativado) — usa stub de auditoria
    try {
      await AuditoriaService.registrarEvento({
        userId: userId,
        action: 'UPDATE',
        entity: 'TarefaObra',
        entityId: id,
        description: `Tarefa atualizada`,
        metadata: req.body
      });
    } catch (err) {
      console.error('Erro ao registrar audit (stub):', err);
    }
    
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
    
    // Audit log (desativado) — usa stub de auditoria
    try {
      await AuditoriaService.registrarEvento({
        userId: userId,
        action: 'DELETE',
        entity: 'TarefaObra',
        entityId: id,
        description: `Tarefa excluída`,
        metadata: {
          obraId: tarefa.obraId
        }
      });
    } catch (err) {
      console.error('Erro ao registrar audit (stub):', err);
    }
    
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
          orderBy: { dataRegistro: 'desc' },
          include: {
            usuario: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }
      },
      orderBy: { dataPrevista: 'asc' }
    });

    // Buscar informações dos eletricistas e equipes para cada tarefa
    const tarefasComNomes = await Promise.all(
      tarefas.map(async (tarefa) => {
        let atribuidoNome: string | null = null;
        let equipeNome: string | null = null;
        
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
      orderBy: { dataRegistro: 'desc' },
      include: {
        usuario: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
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

