import express from 'express';
import { authenticate } from '../middlewares/auth';
import { checkPermission, checkEletricista, checkDeletePermission } from '../middlewares/rbac';
import {
  getTarefasEletricista,
  salvarResumoTarefa,
  getTarefaById,
  criarTarefa,
  atualizarTarefa,
  deletarTarefa,
  getTarefasPorObra,
  getRegistrosAtividade,
  uploadTarefaImages
} from '../controllers/tarefasObraController';

const router = express.Router();

/**
 * Rotas de Tarefas da Obra
 * 
 * Permissões:
 * - Eletricista: Visualizar suas tarefas, registrar atividades
 * - Desenvolvedor: Acesso completo
 * - Gerente/Engenheiro/Admin: Criar e gerenciar tarefas
 */

// GET /api/obras/tarefas - Listar tarefas do usuário (eletricista ou desenvolvedor)
router.get(
  '/tarefas',
  authenticate,
  checkPermission('view_tarefas_obra'),
  getTarefasEletricista
);

// POST /api/obras/tarefas/resumo - Salvar resumo do dia com fotos (eletricista ou desenvolvedor)
// ✅ Qualquer usuário autenticado pode registrar atividades (especialmente eletricistas)
router.post(
  '/tarefas/resumo',
  authenticate, // Apenas precisa estar autenticado
  (req, res, next) => {
    uploadTarefaImages(req, res, (err) => {
      if (err) {
        console.error('❌ Erro no upload:', err);
        return res.status(400).json({ 
          success: false, 
          error: err.message || 'Erro ao fazer upload das imagens' 
        });
      }
      next();
    });
  },
  salvarResumoTarefa
);

// GET /api/obras/tarefas/:id - Buscar tarefa específica
// ✅ Qualquer usuário autenticado pode visualizar detalhes da tarefa
router.get(
  '/tarefas/:id',
  authenticate,
  getTarefaById
);

// POST /api/obras/tarefas - Criar nova tarefa (gerente/engenheiro/admin/desenvolvedor)
router.post(
  '/tarefas',
  authenticate,
  checkPermission('create_obra', 'update_obra'),
  criarTarefa
);

// PUT /api/obras/tarefas/:id - Atualizar tarefa (gerente/engenheiro/admin/desenvolvedor)
router.put(
  '/tarefas/:id',
  authenticate,
  checkPermission('update_obra'),
  atualizarTarefa
);

// DELETE /api/obras/tarefas/:id - Deletar tarefa (desenvolvedor/admin/gerente)
router.delete(
  '/tarefas/:id',
  authenticate,
  checkDeletePermission('obra'),
  deletarTarefa
);

// GET /api/obras/:obraId/tarefas - Listar tarefas de uma obra específica
router.get(
  '/:obraId/tarefas',
  authenticate,
  checkPermission('view_obras', 'view_tarefas_obra'),
  getTarefasPorObra
);

// GET /api/obras/tarefas/registros/:tarefaId - Listar registros de atividade
// ✅ Qualquer usuário autenticado pode visualizar registros
router.get(
  '/tarefas/registros/:tarefaId',
  authenticate,
  getRegistrosAtividade
);

export default router;

