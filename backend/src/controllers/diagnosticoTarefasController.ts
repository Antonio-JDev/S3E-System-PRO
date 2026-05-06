import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

/**
 * GET /api/diagnostico/tarefas-usuario
 * Diagnostica por que as tarefas não aparecem para um usuário
 */
export const diagnosticarTarefasUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role?.toLowerCase();
    
    if (!userId) {
      res.status(401).json({ success: false, error: 'Usuário não autenticado' });
      return;
    }
    
    console.log('\n======= 🔍 DIAGNÓSTICO DE TAREFAS =======');
    console.log(`Usuário: ${userId}`);
    console.log(`Role: ${userRole}`);
    
    // 1. Buscar dados do usuário
    const usuario = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true }
    });
    
    console.log('\n1️⃣ DADOS DO USUÁRIO:');
    console.log(JSON.stringify(usuario, null, 2));
    
    // 2. Buscar todas as equipes
    const todasEquipes = await prisma.equipe.findMany({
      select: {
        id: true,
        nome: true,
        tipo: true,
        membros: true,
        ativa: true
      }
    });
    
    console.log(`\n2️⃣ TODAS AS EQUIPES (${todasEquipes.length}):`);
    todasEquipes.forEach(equipe => {
      console.log(`  - ${equipe.nome} (${equipe.id})`);
      console.log(`    Tipo: ${equipe.tipo}, Ativa: ${equipe.ativa}`);
      console.log(`    Membros (${equipe.membros.length}):`, equipe.membros);
      const usuarioNaEquipe = equipe.membros.includes(userId);
      console.log(`    ✓ Usuário ${userId} está na equipe? ${usuarioNaEquipe ? '✅ SIM' : '❌ NÃO'}`);
    });
    
    // 3. Filtrar equipes onde o usuário é membro
    const equipesDoUsuario = todasEquipes.filter(e => e.membros.includes(userId) && e.ativa);
    const equipeIds = equipesDoUsuario.map(e => e.id);
    
    console.log(`\n3️⃣ EQUIPES DO USUÁRIO (${equipesDoUsuario.length}):`);
    equipesDoUsuario.forEach(equipe => {
      console.log(`  ✅ ${equipe.nome} (${equipe.id})`);
    });
    
    // 4. Buscar todas as tarefas
    const todasTarefas = await prisma.tarefaObra.findMany({
      include: {
        obra: {
          select: {
            id: true,
            nomeObra: true,
            status: true
          }
        }
      }
    });
    
    console.log(`\n4️⃣ TODAS AS TAREFAS (${todasTarefas.length}):`);
    todasTarefas.forEach(tarefa => {
      console.log(`  - Tarefa: "${tarefa.descricao}" (${tarefa.id})`);
      console.log(`    Obra: ${tarefa.obra.nomeObra}`);
      console.log(`    AtribuidoA: ${tarefa.atribuidoA || 'Nenhum'}`);
      console.log(`    EquipeId: ${tarefa.equipeId || 'Nenhuma'}`);
      
      // Verificar se o usuário deveria ver esta tarefa
      const tarefaDireta = tarefa.atribuidoA === userId;
      const tarefaDeEquipe = tarefa.equipeId && equipeIds.includes(tarefa.equipeId);
      const deveriaVer = tarefaDireta || tarefaDeEquipe;
      
      console.log(`    ✓ Atribuída diretamente ao usuário? ${tarefaDireta ? '✅ SIM' : '❌ NÃO'}`);
      console.log(`    ✓ Atribuída a equipe do usuário? ${tarefaDeEquipe ? '✅ SIM' : '❌ NÃO'}`);
      console.log(`    ✓ Usuário DEVERIA ver? ${deveriaVer ? '✅ SIM' : '❌ NÃO'}`);
    });
    
    // 5. Buscar tarefas que o usuário DEVERIA ver
    const tarefasQueDeveriaVer = todasTarefas.filter(t => 
      t.atribuidoA === userId || (t.equipeId && equipeIds.includes(t.equipeId))
    );
    
    console.log(`\n5️⃣ TAREFAS QUE O USUÁRIO DEVERIA VER (${tarefasQueDeveriaVer.length}):`);
    tarefasQueDeveriaVer.forEach(tarefa => {
      console.log(`  ✅ ${tarefa.descricao} - Obra: ${tarefa.obra.nomeObra}`);
    });
    
    // 6. Simular a query do getTarefasEletricista
    const condicoesOR: any[] = [
      { atribuidoA: userId }
    ];
    
    if (equipeIds.length > 0) {
      condicoesOR.push({ equipeId: { in: equipeIds } });
    }
    
    const tarefasQuery = await prisma.tarefaObra.findMany({
      where: {
        OR: condicoesOR
      },
      include: {
        obra: {
          select: {
            id: true,
            nomeObra: true,
            status: true
          }
        }
      }
    });
    
    console.log(`\n6️⃣ RESULTADO DA QUERY (${tarefasQuery.length}):`);
    tarefasQuery.forEach(tarefa => {
      console.log(`  ✅ ${tarefa.descricao} - Obra: ${tarefa.obra.nomeObra}`);
    });
    
    console.log('\n======= FIM DO DIAGNÓSTICO =======\n');
    
    // Retornar resultado
    res.json({
      success: true,
      diagnostico: {
        usuario: {
          id: usuario?.id,
          name: usuario?.name,
          email: usuario?.email,
          role: usuario?.role
        },
        todasEquipes: todasEquipes.map(e => ({
          id: e.id,
          nome: e.nome,
          tipo: e.tipo,
          ativa: e.ativa,
          membros: e.membros,
          usuarioNaEquipe: e.membros.includes(userId)
        })),
        equipesDoUsuario: equipesDoUsuario.map(e => ({
          id: e.id,
          nome: e.nome,
          membros: e.membros
        })),
        todasTarefas: todasTarefas.map(t => ({
          id: t.id,
          descricao: t.descricao,
          obra: t.obra.nomeObra,
          atribuidoA: t.atribuidoA,
          equipeId: t.equipeId,
          tarefaDireta: t.atribuidoA === userId,
          tarefaDeEquipe: t.equipeId && equipeIds.includes(t.equipeId),
          deveriaVer: t.atribuidoA === userId || (t.equipeId && equipeIds.includes(t.equipeId))
        })),
        tarefasQueDeveriaVer: tarefasQueDeveriaVer.length,
        tarefasRetornadasPelaQuery: tarefasQuery.length,
        problema: tarefasQueDeveriaVer.length !== tarefasQuery.length ? 
          '⚠️ A query não está retornando todas as tarefas esperadas!' :
          tarefasQuery.length === 0 ?
          '⚠️ Nenhuma tarefa encontrada - verifique se o usuário está nas equipes corretas' :
          '✅ Tudo OK!'
      }
    });
    
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao executar diagnóstico' 
    });
  }
};

