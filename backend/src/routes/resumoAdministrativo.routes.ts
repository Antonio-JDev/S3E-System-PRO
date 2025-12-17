import { Router } from 'express';
import { ResumoAdministrativoController } from '../controllers/resumoAdministrativoController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Endpoints de Resumo Administrativo
router.get('/completo', ResumoAdministrativoController.getResumoCompleto);
router.get('/lucro-material', ResumoAdministrativoController.getLucroMaterial);
router.get('/lucro-servico', ResumoAdministrativoController.getLucroServico);
router.get('/bdi-orcamentos', ResumoAdministrativoController.getBDIOrcamentos);
router.get('/lucro-mao-de-obra', ResumoAdministrativoController.getLucroMaoDeObra);
router.get('/resumo-mensal', ResumoAdministrativoController.getResumoMensal);
router.get('/evolucao-financeira', ResumoAdministrativoController.getEvolucaoFinanceira);

export default router;
