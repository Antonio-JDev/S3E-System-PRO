import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';


// Routes
import authRoutes from './routes/auth';
import materiaisRoutes from './routes/materiais';
import comprasRoutes from './routes/compras';
import orcamentosRoutes from './routes/orcamentos';
import configFiscalRoutes from './routes/configFiscal';
import vendasRoutes from './routes/vendas.routes';
import contasPagarRoutes from './routes/contasPagar.routes';
import relatoriosRoutes from './routes/relatorios.routes';
import protectedRoutes from './routes/protected.routes';
import alocacaoRoutes from './routes/alocacao.routes';
import equipesRoutes from './routes/equipes.routes';
import alocacoesEquipeRoutes from './routes/alocacoes';
import clientesRoutes from './routes/clientes';
import fornecedoresRoutes from './routes/fornecedores';
import projetosRoutes from './routes/projetos';
import cotacoesRoutes from './routes/cotacoes.routes';
import pessoasRoutes from './routes/pessoa.routes';
import servicosRoutes from './routes/servicos';
import movimentacoesRoutes from './routes/movimentacoes';
import historicoRoutes from './routes/historico';
import nfeRoutes from './routes/nfe';
import empresasRoutes from './routes/empresas';
import dashboardRoutes from './routes/dashboard';
import quadrosRoutes from './routes/quadros.routes';
import kitsRoutes from './routes/kits.routes';
import configuracaoRoutes from './routes/configuracao.routes';
import obraRoutes from './routes/obra.routes';
import pdfCustomizationRoutes from './routes/pdfCustomization.routes';
import funcionariosRoutes from './routes/funcionarios.routes';
import valesRoutes from './routes/vales.routes';
import veiculosRoutes from './routes/veiculos.routes';
import gastosVeiculoRoutes from './routes/gastosVeiculo.routes';
import planosRoutes from './routes/planos.routes';
import despesasFixasRoutes from './routes/despesasFixas.routes';
import logsRoutes from './routes/logs';
import tarefasObraRoutes from './routes/tarefasObra';
import diagnosticoRoutes from './routes/diagnostico';
import ferramentasRoutes from './routes/ferramentas.routes';
import kitsFerramentaRoutes from './routes/kits-ferramenta.routes';
import biRoutes from './routes/bi.routes';
import resumoAdministrativoRoutes from './routes/resumoAdministrativo.routes';
import { healthCheck } from './controllers/logsController';

const app = express();
const PORT = process.env.PORT || 3001;

// Determinar origens permitidas para CORS
const defaultOrigins = ['http://localhost', 'http://localhost:80', 'http://localhost:5173'];
const envOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
  : [];
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

// Em desenvolvimento, permitir qualquer origem para facilitar testes (incluindo Tailscale)
const isDevelopment = process.env.NODE_ENV === 'development';

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Em desenvolvimento, permitir qualquer origem (útil para Tailscale e testes locais)
    if (isDevelopment) {
      console.log(`✅ CORS permitido (dev mode) para origem: ${origin || 'undefined'}`);
      return callback(null, true);
    }
    
    // Browsers podem enviar origin undefined em requests como curl ou same-origin
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Verificar se é um IP do Tailscale (formato: http://100.x.x.x ou https://100.x.x.x)
    if (origin && /^https?:\/\/100\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin)) {
      console.log(`✅ CORS permitido para IP Tailscale: ${origin}`);
      return callback(null, true);
    }
    
    console.warn(`🚫 CORS bloqueado para origem: ${origin}`);
    console.warn(`   Origens permitidas: ${allowedOrigins.join(', ')}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors(corsOptions));
app.use(morgan('dev'));

// ROTA DELETE: Deletar logos (DEVE VIR ANTES da rota GET para ter prioridade)
// Esta rota requer autenticação de admin
app.delete('/api/configuracoes/logo/:filename', async (req, res) => {
  console.log('🗑️  Rota DELETE de logo chamada:', req.params.filename);
  try {
    // Importar middlewares de autenticação
    const { authenticate, authorize } = await import('./middlewares/auth');
    
    // Aplicar autenticação primeiro
    authenticate(req, res, () => {
      // Depois aplicar autorização de admin
      authorize('admin')(req, res, async () => {
        try {
          const { ConfiguracaoController } = await import('./controllers/configuracaoController');
          await ConfiguracaoController.deletarLogo(req, res);
        } catch (error: any) {
          console.error('❌ Erro ao deletar logo:', error);
          if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Erro ao deletar logo', error: error.message });
          }
        }
      });
    });
  } catch (error: any) {
    console.error('❌ Erro ao processar delete logo:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Erro ao processar requisição', error: error.message });
    }
  }
});

// ROTA PÚBLICA: Servir logos (DEVE VIR DEPOIS da rota DELETE)
// Esta rota é pública para funcionar na página de login e em outros contextos sem autenticação
// IMPORTANTE: Esta rota funciona tanto em localhost quanto em produção (IP ou domínio)
app.get('/api/configuracoes/logo/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { ConfiguracaoController } = await import('./controllers/configuracaoController');
    await ConfiguracaoController.servirLogo(req, res);
  } catch (error: any) {
    console.error('Erro ao servir logo:', error);
    res.status(500).json({ success: false, message: 'Erro ao servir logo', error: error.message });
  }
});

// ROTA PÚBLICA: Servir imagens de materiais
app.get('/api/materiais/imagem/:filename', async (req, res) => {
  try {
    const { servirImagemMaterial } = await import('./controllers/materiaisController');
    await servirImagemMaterial(req, res);
  } catch (error: any) {
    console.error('Erro ao servir imagem de material:', error);
    res.status(500).json({ success: false, message: 'Erro ao servir imagem', error: error.message });
  }
});

// ROTA PÚBLICA: Buscar logo de login (sem autenticação)
app.get('/api/configuracoes/public/logo-login', async (req, res) => {
  try {
    const configuracaoServiceModule = await import('./services/configuracao.service');
    const configuracaoService = configuracaoServiceModule.default;
    const configuracoes = await configuracaoService.getConfiguracoes();
    res.status(200).json({ 
      success: true, 
      data: { 
        logoLoginUrl: configuracoes.logoLoginUrl,
        logoUrl: configuracoes.logoUrl // fallback
      } 
    });
  } catch (error: any) {
    console.error('Erro ao buscar logo de login:', error);
    res.status(200).json({ success: true, data: { logoLoginUrl: null, logoUrl: null } });
  }
});

// Servir arquivos estáticos (uploads) com CORS habilitado
// Em produção (Docker), process.cwd() será /app e o volume está mapeado em /app/uploads
// Em desenvolvimento local, usamos apenas uploads (não backend/uploads)
const cwd = process.cwd();
let uploadsPath: string;

if (cwd.endsWith('backend')) {
  // Ambiente de desenvolvimento: backend/ é o CWD
  uploadsPath = path.join(cwd, 'uploads');
} else {
  // Ambiente Docker: usar /app/uploads (volume mapeado)
  uploadsPath = path.join(cwd, 'uploads');
}

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

console.log('📁 Servindo uploads de:', uploadsPath);

// Middleware para adicionar headers CORS aos arquivos estáticos
// IMPORTANTE: Permitir qualquer origem para uploads (incluindo IPs em produção)
app.use('/uploads', (req, res, next) => {
  const origin = req.headers.origin;
  // Permitir qualquer origem para uploads (funciona com IPs em produção)
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

app.use('/uploads', express.static(uploadsPath));

// EXCEÇÃO: Não aplicar body parsers em rotas com upload de arquivos (multer)
// Lista de rotas que PODEM usar multipart/form-data
const uploadRoutes = [
  '/api/materiais/preview-importacao',
  '/api/materiais/importar-precos',
  '/api/cotacoes/importar',
  '/api/configuracoes/upload-logo',
  '/api/obras/tarefas/resumo', // Rota de upload de fotos de tarefas
  '/api/projetos' // Rotas de upload de documentos de projetos
];

// Body parsers COM EXCEÇÃO para rotas de upload (apenas se for multipart/form-data)
app.use((req, res, next) => {
  // Verificar se a rota está na lista de uploads
  const isUploadRoute = uploadRoutes.some(route => req.url.includes(route.split('/api')[1]));
  
  // Se for rota de upload E o Content-Type for multipart/form-data, pula body parsers
  // Caso contrário, aplica body parsers normalmente (para JSON, etc)
  const contentType = req.headers['content-type'] || '';
  if (isUploadRoute && contentType.includes('multipart/form-data')) {
    console.log(`⚠️  PULANDO body parsers para rota de upload (multipart): ${req.url}`);
    return next();
  }
  
  // Aplica body parsers normalmente (para JSON e outros tipos)
  express.json({ limit: '50mb' })(req, res, (err) => {
    if (err) return next(err);
    express.urlencoded({ extended: true, limit: '50mb' })(req, res, next);
  });
});

// Health check
app.get('/api/health', healthCheck);
app.get('/health', healthCheck);

// API routes
app.get('/api', (_req, res) => {
  res.json({
    message: 'S3E System API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      protected: '/api/protected',
      materiais: '/api/materiais',
      compras: '/api/compras',
      orcamentos: '/api/orcamentos',
      vendas: '/api/vendas',
      contasPagar: '/api/contas-pagar',
      relatorios: '/api/relatorios',
      configFiscal: '/api/configuracoes-fiscais',
      obras: '/api/obras',
      atualizacaoPrecos: '/api/materiais/template-importacao',
      equipes: '/api/equipes',
      pdfCustomization: '/api/pdf-customization',
      clientes: '/api/clientes',
      fornecedores: '/api/fornecedores',
      projetos: '/api/projetos',
      servicos: '/api/servicos',
      movimentacoes: '/api/movimentacoes',
      historico: '/api/historico',
      nfe: '/api/nfe',
      empresas: '/api/empresas',
      dashboard: '/api/dashboard',
      quadros: '/api/quadros',
      configuracoes: '/api/configuracoes',
      funcionarios: '/api/funcionarios',
      vales: '/api/vales',
      veiculos: '/api/veiculos',
      gastosVeiculo: '/api/gastos-veiculo',
      planos: '/api/planos',
      despesasFixas: '/api/despesas-fixas',
      logs: '/api/logs',
      tarefasObra: '/api/obras/tarefas',
      bi: '/api/bi'
    }
  });
});

// Registrar rotas
app.use('/api/auth', authRoutes);
app.use('/api/protected', protectedRoutes);
app.use('/api/materiais', materiaisRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/orcamentos', orcamentosRoutes);
app.use('/api/vendas', vendasRoutes);
app.use('/api/contas-pagar', contasPagarRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/configuracoes-fiscais', configFiscalRoutes);
app.use('/api/obras', alocacaoRoutes);
app.use('/api/equipes', equipesRoutes);
app.use('/api/alocacoes', alocacoesEquipeRoutes);
app.use('/api/pessoas', pessoasRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/fornecedores', fornecedoresRoutes);
app.use('/api/projetos', projetosRoutes);
app.use('/api/cotacoes', cotacoesRoutes);
app.use('/api/servicos', servicosRoutes);
app.use('/api/movimentacoes', movimentacoesRoutes);
app.use('/api/historico', historicoRoutes);
app.use('/api/nfe', nfeRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/quadros', quadrosRoutes);
app.use('/api/kits', kitsRoutes);
app.use('/api/configuracoes', configuracaoRoutes);
app.use('/api/obras', tarefasObraRoutes); // Rotas de tarefas (prefixo /api/obras) - DEVE VIR ANTES!
app.use('/api/obras', obraRoutes);
app.use('/api/pdf-customization', pdfCustomizationRoutes);
app.use('/api/funcionarios', funcionariosRoutes);
app.use('/api/vales', valesRoutes);
app.use('/api/veiculos', veiculosRoutes);
app.use('/api/gastos-veiculo', gastosVeiculoRoutes);
app.use('/api/planos', planosRoutes);
app.use('/api/despesas-fixas', despesasFixasRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/diagnostico', diagnosticoRoutes);
app.use('/api/ferramentas', ferramentasRoutes);
app.use('/api/kits-ferramenta', kitsFerramentaRoutes);
app.use('/api/bi', biRoutes);
app.use('/api/resumo-administrativo', resumoAdministrativoRoutes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Servidor Rodando na porta ${PORT} por favor acesse: http://localhost:${PORT}`);
  console.log(`📝 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
