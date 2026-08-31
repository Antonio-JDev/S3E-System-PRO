import { Router } from 'express';
import { RhController } from '../controllers/rhController';
import { LancamentoFolhaController } from '../controllers/lancamentoFolhaController';
import { ConfiguracaoPontoController } from '../controllers/configuracaoPontoController';
import { authenticate, authorize } from '../middlewares/auth';
import { uploadFaltaJustificadaDocumento } from '../middlewares/rhFaltaUpload.middleware';

const router = Router();

router.use(authenticate);

router.get('/folha/:mes/exportar-contabilidade', RhController.exportarFolhaContabilidade);
router.get(
  '/exportacao-contabilidade/config',
  authorize('admin', 'desenvolvedor', 'financeiro'),
  RhController.obterConfigExportacaoContabilidade,
);
router.put(
  '/exportacao-contabilidade/config',
  authorize('admin', 'desenvolvedor', 'financeiro'),
  RhController.salvarConfigExportacaoContabilidade,
);

router.get('/folha/:funcionarioId/:mes', RhController.folhaMes);
router.get('/folha/:funcionarioId/:mes/pdf', RhController.folhaPdf);
router.post('/folha/:funcionarioId/:mes/recalcular-ponto', RhController.recalcularPontoMes);
router.get('/folha/:funcionarioId/:mes/comparar-contratos', RhController.compararContratos);
router.post('/sincronizar-parcela', RhController.sincronizarParcela);
router.get('/registro-ponto', RhController.buscarRegistroPontoDia);
router.post('/registro-ponto/manual', RhController.criarRegistroPontoManual);
router.put('/registro-ponto/:id', RhController.atualizarRegistroPonto);
router.put('/registro-ponto/:id/intervalo-almoco', RhController.atualizarIntervaloAlmoco);
router.post('/banco-horas/converter-folga', RhController.converterFolga);
router.post('/banco-horas/incluir-folha', RhController.incluirBancoFolha);
router.post('/banco-horas/faturar', RhController.faturarBancoHoras);
router.post('/banco-horas/zerar', RhController.zerarBancoHoras);
router.get('/work-shifts', RhController.listarWorkShifts);
router.post('/work-shifts', RhController.criarWorkShift);
router.post(
  '/falta-justificada',
  uploadFaltaJustificadaDocumento.single('documento'),
  RhController.registrarFaltaJustificada,
);
router.put(
  '/falta-justificada/:id',
  uploadFaltaJustificadaDocumento.single('documento'),
  RhController.atualizarFaltaJustificada,
);
router.delete('/falta-justificada/:id', RhController.excluirFaltaJustificada);
router.delete('/falta-justificada/:id/anexo', RhController.deletarAnexoFaltaJustificada);
router.post(
  '/justificativa-parcial',
  uploadFaltaJustificadaDocumento.single('documento'),
  RhController.registrarJustificativaParcial,
);
router.put(
  '/justificativa-parcial/:id',
  uploadFaltaJustificadaDocumento.single('documento'),
  RhController.atualizarJustificativaParcial,
);
router.delete('/justificativa-parcial/:id', RhController.excluirJustificativaParcial);
router.put('/conferencia-ponto/comentario', RhController.salvarComentarioConferencia);
router.put('/conferencia-ponto/avaliacao', RhController.salvarAvaliacaoConferencia);
router.put(
  '/feriado-override',
  authorize('admin', 'desenvolvedor'),
  RhController.salvarFeriadoOverride,
);
router.post('/divida-horas/propor', RhController.proporDividaHoras);
router.get('/divida-horas/:funcionarioId/:mes', RhController.listarDividaHoras);
router.post('/divida-horas/dia/:diaId/aprovar', RhController.aprovarDiaDivida);

router.get('/config-ponto/:funcionarioId', ConfiguracaoPontoController.buscar);
router.put('/config-ponto/:funcionarioId', ConfiguracaoPontoController.salvar);

router.get('/lancamentos', LancamentoFolhaController.listar);
router.post('/lancamentos', LancamentoFolhaController.criar);
router.delete('/lancamentos/:id', LancamentoFolhaController.excluir);

export default router;

