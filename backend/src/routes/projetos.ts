import { Router } from 'express';
import {
  getProjetos,
  getProjetoById,
  createProjeto,
  updateProjeto,
  updateProjetoStatus,
  deleteProjeto,
  criarProjetoDeOrcamento,
  listarProjetosAvancado
} from '../controllers/projetosController';
import {
  getTasksByProjeto,
  createTask,
  updateTask,
  deleteTask
} from '../controllers/tasksController';
import {
  criarDocumento,
  listarDocumentos,
  deletarDocumento,
  visualizarDocumento,
  uploadDocumento
} from '../controllers/projetoDocumentosController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Middleware de autenticação para todas as rotas
router.use(authenticate);

/**
 * @route GET /api/projetos
 * @desc Listar todos os projetos com filtros opcionais
 * @query ?status=EmAndamento&clienteId=xxx&dataInicio=2024-01-01&dataFim=2024-12-31
 * @access Private
 */
router.get('/', getProjetos);
// endpoint com agregação/kanban opcional (?view=kanban)
router.get('/_avancado', listarProjetosAvancado);

/**
 * @route GET /api/projetos/:id
 * @desc Buscar projeto específico com relacionamentos
 * @access Private
 */
router.get('/:id', getProjetoById);

/**
 * @route POST /api/projetos
 * @desc Criar novo projeto vinculado a orçamento aprovado
 * @access Private
 */
router.post('/', createProjeto);
// criar projeto a partir de orçamento
router.post('/criar-de-orcamento', criarProjetoDeOrcamento);

/**
 * @route PUT /api/projetos/:id
 * @desc Atualizar dados do projeto
 * @access Private
 */
router.put('/:id', updateProjeto);

/**
 * @route PATCH /api/projetos/:id/status
 * @desc Atualizar status do projeto (EmAndamento, Concluido, Cancelado)
 * @access Private
 */
router.put('/:id/status', updateProjetoStatus);

/**
 * @route DELETE /api/projetos/:id
 * @desc Cancelar projeto (soft delete)
 * @access Private
 */
router.delete('/:id', deleteProjeto);

/**
 * @route GET /api/projetos/:projetoId/tasks
 * @desc Listar tasks de um projeto
 * @access Private
 */
router.get('/:projetoId/tasks', getTasksByProjeto);

/**
 * @route POST /api/projetos/:projetoId/tasks
 * @desc Criar nova task para um projeto
 * @access Private
 */
router.post('/:projetoId/tasks', createTask);

/**
 * @route PUT /api/projetos/:projetoId/tasks/:taskId
 * @desc Atualizar task
 * @access Private
 */
router.put('/:projetoId/tasks/:taskId', updateTask);

/**
 * @route DELETE /api/projetos/:projetoId/tasks/:taskId
 * @desc Excluir task
 * @access Private
 */
router.delete('/:projetoId/tasks/:taskId', deleteTask);

/**
 * @route POST /api/projetos/:projetoId/documentos
 * @desc Upload de documento para um projeto
 * @access Private
 */
router.post('/:projetoId/documentos', uploadDocumento, criarDocumento);

/**
 * @route GET /api/projetos/:projetoId/documentos
 * @desc Listar documentos de um projeto
 * @access Private
 */
router.get('/:projetoId/documentos', listarDocumentos);

/**
 * @route GET /api/projetos/:projetoId/documentos/:documentoId/visualizar
 * @desc Visualizar documento de um projeto
 * @access Private
 */
router.get('/:projetoId/documentos/:documentoId/visualizar', visualizarDocumento);

/**
 * @route DELETE /api/projetos/:projetoId/documentos/:documentoId
 * @desc Deletar documento de um projeto
 * @access Private
 */
router.delete('/:projetoId/documentos/:documentoId', deletarDocumento);

export default router;
