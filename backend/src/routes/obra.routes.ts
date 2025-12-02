import { Router } from 'express';
import { ObraController } from '../controllers/obraController';
import { AlocacaoMateriaisController } from '../controllers/alocacaoMateriaisController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

/**
 * @route POST /api/obras/gerar
 * @desc Gera uma obra a partir de um projeto aprovado
 * @access Admin/Gerente
 */
router.post('/gerar', authorize('admin', 'gerente'), ObraController.gerarObra);

/**
 * @route POST /api/obras/manutencao
 * @desc Cria uma obra de manutenção (sem projeto)
 * @access Admin/Gerente
 */
router.post('/manutencao', authorize('admin', 'gerente'), ObraController.criarObraManutencao);

/**
 * @route GET /api/obras/kanban
 * @desc Lista obras agrupadas por status (Kanban)
 * @access Authenticated
 */
router.get('/kanban', ObraController.getObrasKanban);

/**
 * @route GET /api/obras/projeto/:projetoId
 * @desc Busca obra associada a um projeto
 * @access Authenticated
 */
router.get('/projeto/:projetoId', ObraController.getObraPorProjeto);

/**

 * @route GET /api/obras/verificar-estoque/:projetoId
 * @desc Verifica disponibilidade de estoque antes de criar obra
 * @access Authenticated
 */
router.get('/verificar-estoque/:projetoId', ObraController.verificarEstoque);

/**
 * @route POST /api/obras/:obraId/materiais/alocar
 * @desc Aloca um material do estoque para uma obra
 * @access Authenticated
 * IMPORTANTE: Esta rota deve vir ANTES de /:id para evitar conflito de roteamento
 */
router.post('/:obraId/materiais/alocar', AlocacaoMateriaisController.alocarMaterialParaObra);

/**
 * @route GET /api/obras/:obraId/materiais
 * @desc Lista todos os materiais alocados para uma obra
 * @access Authenticated
 * IMPORTANTE: Esta rota deve vir ANTES de /:id para evitar conflito de roteamento
 */
router.get('/:obraId/materiais', AlocacaoMateriaisController.listarMateriaisObra);

/**
 * @route GET /api/obras/:id
 * @desc Busca uma obra específica por ID
 * @access Authenticated
 */
router.get('/:id', ObraController.getObraPorId);

/**
 * @route PUT /api/obras/:id/status
 * @desc Atualiza status da obra (move no Kanban)
 * @access Admin/Gerente
 */
router.put('/:id/status', authorize('admin', 'gerente'), ObraController.updateObraStatus);

/**
 * @route PUT /api/obras/:id/iniciar-execucao
 * @desc Permite que eletricistas iniciem a execução de uma obra (mover de A_FAZER para ANDAMENTO)
 * @access Authenticated (eletricista com tarefa atribuída ou admin/gerente)
 */
router.put('/:id/iniciar-execucao', ObraController.iniciarExecucao);

/**
 * @route GET /api/obras/alocacao
 * @desc Busca alocação de equipes (calendário)
 * @access Authenticated
 */
router.get('/alocacao', ObraController.getAlocacaoEquipes);

/**
 * @route DELETE /api/obras/:id
 * @desc Deleta uma obra (apenas admin e desenvolvedor)
 * @access Admin/Desenvolvedor
 */
router.delete('/:id', authorize('admin', 'desenvolvedor'), ObraController.deleteObra);

export default router;

