import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  listarCotacoes,
  buscarCotacao,
  criarCotacao,
  atualizarCotacao,
  deletarCotacao,
  importarCotacoes,
  previewImportacao,
  gerarTemplate,
  exportarCotacoes,
  deletarCotacoesEmLote
} from '../controllers/cotacoesController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Criar diretório se não existir (igual aos outros controllers)
    const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `cotacoes-${uniqueSuffix}.json`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos JSON são permitidos'));
    }
  }
});

// Rotas de template e exportação
router.get('/template', gerarTemplate);
router.get('/exportar', exportarCotacoes);

// Rotas de importação
// Preview aceita apenas arquivo
router.post('/preview-importacao', upload.single('arquivo'), previewImportacao);
// Importar aceita arquivo OU JSON no body (quando vem do preview)
// Multer permite que o arquivo seja opcional quando vem JSON no body
router.post('/importar', upload.single('arquivo'), importarCotacoes);

// Rotas CRUD
// IMPORTANTE: Rotas específicas (como /bulk) devem vir ANTES de rotas com parâmetros (/:id)
router.get('/', listarCotacoes);
router.post('/', authenticate, authorize('admin', 'gerente', 'engenheiro', 'orcamentista', 'desenvolvedor'), criarCotacao);
router.delete('/bulk', authenticate, authorize('admin', 'gerente', 'engenheiro', 'orcamentista', 'desenvolvedor'), deletarCotacoesEmLote);
router.get('/:id', buscarCotacao);
router.put('/:id', authenticate, authorize('admin', 'gerente', 'engenheiro', 'orcamentista', 'desenvolvedor'), atualizarCotacao);
router.delete('/:id', authenticate, authorize('admin', 'gerente', 'engenheiro', 'orcamentista', 'desenvolvedor'), deletarCotacao);

export default router;

