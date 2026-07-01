import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { checkPermission } from '../middlewares/rbac';
import {
  listarEventosCalendario,
  buscarEquipeCalendario,
  buscarEquipesPreMontadasCalendario,
  resolverFuncionariosEquipeCalendario,
  buscarEventoCalendario,
  criarEventoCalendario,
  atualizarEventoCalendario,
  excluirEventoCalendario,
  obterCapacidadeCalendario,
} from '../controllers/eventosCalendarioController';

const router = Router();

router.use(authenticate);

router.get('/equipe/busca', checkPermission('view_projetos'), buscarEquipeCalendario);
router.get('/equipes/busca', checkPermission('view_projetos'), buscarEquipesPreMontadasCalendario);
router.get('/equipes/:equipeId/funcionarios', checkPermission('view_projetos'), resolverFuncionariosEquipeCalendario);
router.get('/capacidade', checkPermission('view_projetos'), obterCapacidadeCalendario);
router.get('/', checkPermission('view_projetos'), listarEventosCalendario);
router.get('/:id', checkPermission('view_projetos'), buscarEventoCalendario);
router.post('/', checkPermission('create_projeto'), criarEventoCalendario);
router.put('/:id', checkPermission('update_projeto'), atualizarEventoCalendario);
router.patch('/:id', checkPermission('update_projeto'), atualizarEventoCalendario);
router.delete('/:id', checkPermission('delete_projeto'), excluirEventoCalendario);

export default router;
