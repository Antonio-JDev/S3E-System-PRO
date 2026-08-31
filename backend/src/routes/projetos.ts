import { Router } from 'express';
import {
  getProjetos,
  getProjetoById,
  createProjeto,
  updateProjeto,
  updateProjetoStatus,
  reverterProjetoStatus,
  deleteProjeto,
  criarProjetoDeOrcamento,
  listarProjetosAvancado,
  getProjetosProgresso,
  getProjetosIdsComMinhasTarefas,
  getProjetosIdsComMinhasTarefasAtrasadas,
  getRelatorioKanbanUsuarios,
  getRelatorioKanbanUsuarioAtrasadas,
  buscarProjetos,
  getKitDisponibilidadeBomItem,
  getProjetosCockpitResumo,
  getAlocacaoPontoOs,
  getHorasCustoContabilCsv,
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
import {
  listarVistoriasCelesc,
  protocolarVistoria,
  reprovarVistoria,
  aprovarVistoria,
} from '../controllers/vistoriaCelescController';
import {
  listarEngenharia,
  listarResumoTarefasEngenharia,
  getInfoAtribuicaoEngenharia,
  patchEngenharia,
  atribuirEngenharia,
} from '../controllers/projetosEngenhariaController';
import {
  listarDocumentosReferencia,
  criarDocumentoReferencia,
  visualizarDocumentoReferencia,
  deletarDocumentoReferencia,
  uploadDocumentoReferencia,
} from '../controllers/engenhariaDocumentosReferenciaController';
import {
  criarApontamentoOs,
  listarApontamentosOs,
  atualizarApontamentoOs,
  obterResumoApropriacaoOs,
} from '../controllers/apropriacaoOsController';
import { getRelatorioCumprimentoEstimativa } from '../controllers/relatorioCumprimentoEstimativaController';
import { authenticate } from '../middlewares/auth';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

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
// endpoint para retornar progresso de múltiplos projetos em uma chamada
router.get('/progresso', getProjetosProgresso);
// resumo cockpit (prazo, custo tempo, estouro) em lote
router.get('/cockpit-resumo', getProjetosCockpitResumo);
// IDs dos projetos (OS) em que o usuário tem tarefas pendentes/em andamento no Kanban
router.get('/ids-com-minhas-tarefas', getProjetosIdsComMinhasTarefas);
// IDs dos projetos (OS) em que o usuário tem tarefas pendentes/em andamento atrasadas no Kanban
router.get('/ids-com-minhas-tarefas-atrasadas', getProjetosIdsComMinhasTarefasAtrasadas);
// Relatório por usuário (Admin/Dev): tempo de conclusão e atraso no Kanban
router.get('/relatorios/kanban-usuarios', getRelatorioKanbanUsuarios);
// Drilldown: tasks atrasadas por usuário no período (Admin/Dev)
router.get('/relatorios/kanban-usuarios/:userId/atrasadas', getRelatorioKanbanUsuarioAtrasadas);
// Relatório global de cumprimento de estimativa de prazo (Admin/Dev)
router.get('/relatorios/cumprimento-estimativa', getRelatorioCumprimentoEstimativa);
router.get('/relatorios/horas-custo-contabil.csv', getHorasCustoContabilCsv);
router.get('/busca', buscarProjetos);

/**
 * @route GET /api/projetos/vistorias-celesc
 * @desc Fila de vistorias CELESC (pendente protocolo, aguardando, reprovado)
 */
router.get('/vistorias-celesc', listarVistoriasCelesc);

/**
 * @route GET /api/projetos/engenharia
 * @desc Listagem da aba Projetos de Engenharia
 */
router.get('/engenharia', listarEngenharia);
router.get('/engenharia/info-atribuicao', getInfoAtribuicaoEngenharia);
router.get('/engenharia/resumo-tarefas', listarResumoTarefasEngenharia);
router.get('/engenharia/documentos-referencia', listarDocumentosReferencia);
router.post('/engenharia/documentos-referencia', uploadDocumentoReferencia, criarDocumentoReferencia);
router.get('/engenharia/documentos-referencia/:documentoId/visualizar', visualizarDocumentoReferencia);
router.delete('/engenharia/documentos-referencia/:documentoId', deletarDocumentoReferencia);

/**
 * @route PATCH /api/projetos/:id/engenharia
 * @desc Atualiza metadados Notion da engenharia
 */
router.patch('/:id/engenharia', patchEngenharia);

/**
 * @route PATCH /api/projetos/:id/engenharia/atribuir
 * @desc Atribui OS manualmente ao setor de engenharia
 */
router.patch('/:id/engenharia/atribuir', atribuirEngenharia);

/**
 * @route GET /api/projetos/:projetoId/apropriacao/resumo
 * @desc Resumo orçado vs realizado e resultado financeiro da OS
 */
router.get('/:id/alocacao-ponto', getAlocacaoPontoOs);
router.get('/:projetoId/apropriacao/resumo', obterResumoApropriacaoOs);

/**
 * @route GET/POST /api/projetos/:projetoId/apontamentos
 * @desc Listar e criar apontamentos rápidos (F1)
 */
router.get('/:projetoId/apontamentos', listarApontamentosOs);
router.post('/:projetoId/apontamentos', criarApontamentoOs);
router.patch('/:projetoId/apontamentos/:apontamentoId', atualizarApontamentoOs);

/**
 * @route GET /api/projetos/:id
 * @desc Buscar projeto específico com relacionamentos
 * @access Private
 */
router.get('/:projetoId/bom/itens/:orcamentoItemId/kit-disponibilidade', getKitDisponibilidadeBomItem);
router.get('/:id', getProjetoById);

/**
 * @route POST /api/projetos
 * @desc Criar novo projeto (OS) vinculado ao orçamento; não exige PV nem status Aprovado (exceto Recusado/Declinado/Cancelado)
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
 * @route PUT /api/projetos/:id/reverter-status
 * @desc Reverte status da OS (admin) — remove obra se necessário
 */
router.put('/:id/reverter-status', reverterProjetoStatus);

/**
 * @route PATCH /api/projetos/:id/protocolar-vistoria
 * @desc Confirma protocolo da vistoria CELESC
 */
router.patch('/:id/protocolar-vistoria', protocolarVistoria);

/**
 * @route POST /api/projetos/:id/reprovar-vistoria
 * @desc Registra reprovação CELESC no histórico
 */
router.post('/:id/reprovar-vistoria', reprovarVistoria);

/**
 * @route PATCH /api/projetos/:id/aprovar-vistoria
 * @desc Marca vistoria CELESC como aprovada
 */
router.patch('/:id/aprovar-vistoria', aprovarVistoria);

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

/**
 * @route POST /api/projetos/:projetoId/pdf-itens-faltantes
 * @desc Gerar PDF "Solicitação de Compra" com materiais de estoque insuficiente
 * @body { itens: Array<{ id, nome, quantidade, estoqueDisponivel?, sku?, ncm? }>, numeroOS, userName, userRole }
 * @access Private
 */
router.post('/:projetoId/pdf-itens-faltantes', async (req, res) => {
  try {
    const { projetoId } = req.params;
    const { itens, numeroOS, userName, userRole } = req.body;

    if (!itens || !Array.isArray(itens)) {
      return res.status(400).json({
        success: false,
        error: 'Lista de itens é obrigatória'
      });
    }

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });

    res.setHeader('Content-Type', 'application/pdf');
    const nomeArquivoPdf = `PDF ordem de servico N° ${numeroOS || projetoId}.pdf`;
    res.setHeader('Content-Disposition', `inline; filename="${nomeArquivoPdf}"`);

    doc.pipe(res);

    const margin = 50;
    const topMargin = 22;
    const pageWidth = 595;
    const now = new Date();
    const dataHora = now.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const nomeSistema = 'S3E - Sistema de Gestão';

    // Logo (canto esquerdo): tentar imagem da pasta uploads/logos
    let logoPath: string | null = null;
    const possibleLogoDirs = [
      path.join(process.cwd(), 'uploads', 'logos'),
      path.join(__dirname, '..', '..', 'uploads', 'logos')
    ];
    const preferredLogo = 'logo-1762806916991-250633582.png';
    const fallbackLogos = ['logo-nome-azul.png', 'logo-branca.png'];
    for (const dir of possibleLogoDirs) {
      if (fs.existsSync(dir)) {
        const fullPreferred = path.join(dir, preferredLogo);
        if (fs.existsSync(fullPreferred)) {
          logoPath = fullPreferred;
          break;
        }
        for (const name of fallbackLogos) {
          const full = path.join(dir, name);
          if (fs.existsSync(full)) {
            logoPath = full;
            break;
          }
        }
        if (!logoPath) {
          const files = fs.readdirSync(dir).filter((f: string) => /\.(png|jpg|jpeg)$/i.test(f));
          if (files.length > 0) logoPath = path.join(dir, files[0]);
        }
        if (logoPath) break;
      }
    }
    if (logoPath) {
      try {
        doc.image(logoPath, margin, topMargin, { width: 62 });
        doc.y = topMargin + 62 + 6;
      } catch (_) {
        // ignora se não conseguir carregar a imagem
      }
    } else {
      doc.y = topMargin;
    }
    doc.font('Helvetica').fillColor('black');

    // Título (bem no topo)
    doc.fontSize(22).font('Helvetica-Bold').text('Solicitação de Compra', { align: 'center', width: pageWidth - 2 * margin });
    doc.moveDown(0.25);

    // Frase menor logo abaixo do título
    doc.fontSize(10).font('Helvetica').fillColor('#374151');
    doc.text(`Materiais referentes à Ordem de Serviço N° ${numeroOS ?? projetoId}`, { align: 'center' });
    doc.moveDown(0.8);

    // Tabela: NOME | QUANTIDADE (quantidade = a comprar)
    const tableTop = doc.y;
    const colNomeW = pageWidth - 2 * margin - 90;
    const colQtdX = margin + colNomeW + 10;
    const rowH = 22;
    const headerH = 28;

    // Cabeçalho da tabela
    doc.rect(margin, tableTop, colNomeW + 90, headerH).fillAndStroke('#1e40af', '#1e40af');
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('NOME', margin + 8, tableTop + 8, { width: colNomeW - 16 });
    doc.text('QUANTIDADE', colQtdX, tableTop + 8, { width: 80, align: 'right' });
    doc.fillColor('black').font('Helvetica');

    let yPos = tableTop + headerH;
    let contador = 1;
    for (const item of itens) {
      const nome = item.nome || 'Item sem identificação';
      const qtdNecessaria = Number(item.quantidade ?? 0);
      const estoque = Number(item.estoqueDisponivel ?? 0);
      const aComprar = Math.max(0, qtdNecessaria - estoque);

      // Desenhar fundo alternado ANTES do stroke
      if (contador % 2 === 0) {
        doc.rect(margin, yPos, colNomeW + 90, rowH).fill('#f9fafb');
      }
      
      // Desenhar borda da linha
      doc.rect(margin, yPos, colNomeW + 90, rowH).stroke('#e5e7eb');
      
      // Configurar cor do texto
      doc.fontSize(10).fillColor('#000000');
      
      // Adicionar conteúdo de texto
      const nomeExibir = `${contador}. ${nome}`;
      const nomeLinha = nomeExibir.length > 72 ? nomeExibir.substring(0, 69) + '...' : nomeExibir;
      doc.text(nomeLinha, margin + 8, yPos + 6, { width: colNomeW - 16 });
      doc.text(String(aComprar), colQtdX, yPos + 6, { width: 80, align: 'right' });

      yPos += rowH;
      contador++;
    }

    doc.y = yPos;

    // Rodapé: sempre ao final do conteúdo, fora da tabela, centralizado (evita quebra em coluna)
    const footerWidth = pageWidth - 2 * margin;
    doc.moveDown(2);
    doc.fontSize(9).fillColor('#4b5563');
    doc.text(`Data e hora: ${dataHora}`, { align: 'center', width: footerWidth });
    doc.moveDown(0.35);
    doc.text(nomeSistema, { align: 'center', width: footerWidth });
    doc.moveDown(0.35);
    const linhaGeradoPor = `Gerado por: ${userName || 'Usuário'}${userRole ? ` - ${userRole}` : ''}`;
    doc.text(linhaGeradoPor, { align: 'center', width: footerWidth });
    doc.fillColor('black');

    doc.end();
  } catch (error: any) {
    console.error('Erro ao gerar PDF de itens faltantes:', error);

    if (res.headersSent) {
      return res.end();
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao gerar PDF'
    });
  }
});

export default router;
