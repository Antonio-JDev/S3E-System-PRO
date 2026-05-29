// Verificação TLS: padrão '1' (ativada). Usamos certs ICP-Brasil (certs/ca-bundle-br.pem).
// Só use NODE_TLS_REJECT_UNAUTHORIZED=0 em ambiente de teste se a SEFAZ falhar por CA (improvável).
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === undefined) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
}

import * as dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { prisma } from './lib/prisma';

// Routes
import authRoutes from './routes/auth';
import materiaisRoutes from './routes/materiais';
import comprasRoutes from './routes/compras';
import orcamentosRoutes from './routes/orcamentos';
import configFiscalRoutes from './routes/configFiscal';
import vendasRoutes from './routes/vendas.routes';
import contasPagarRoutes from './routes/contasPagar.routes';
import contasReceberRoutes from './routes/contasReceber.routes';
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
import { authenticate } from './middlewares/auth';
import { NFeController } from './controllers/nfeController';
import nfseRoutes from './routes/nfse.routes';
import empresasRoutes from './routes/empresas';
import dashboardRoutes from './routes/dashboard';
import quadrosRoutes from './routes/quadros.routes';
import kitsRoutes from './routes/kits.routes';
import configuracaoRoutes from './routes/configuracao.routes';
import obraRoutes from './routes/obra.routes';
import { obrasRoutes } from './routes/obras.routes';
import pdfCustomizationRoutes from './routes/pdfCustomization.routes';
import funcionariosRoutes from './routes/funcionarios.routes';
import recursosHumanosRoutes from './routes/recursosHumanos.routes';
import valesRoutes from './routes/vales.routes';
import beneficiosRoutes from './routes/beneficios.routes';
import rhRoutes from './routes/rh.routes';
import pontoRoutes from './routes/ponto.routes';
import veiculosRoutes from './routes/veiculos.routes';
import gastosVeiculoRoutes from './routes/gastosVeiculo.routes';
import planosRoutes from './routes/planos.routes';
import despesasFixasRoutes from './routes/despesasFixas.routes';
import logsRoutes from './routes/logs';
import tarefasObraRoutes from './routes/tarefasObra';
import tarefasInternasRoutes from './routes/tarefasInternas.routes';
import diagnosticoRoutes from './routes/diagnostico';
import ferramentasRoutes from './routes/ferramentas.routes';
import kitsFerramentaRoutes from './routes/kits-ferramenta.routes';
import biRoutes from './routes/bi.routes';
import resumoAdministrativoRoutes from './routes/resumoAdministrativo.routes';
import dreRoutes from './routes/dre.routes';
import fluxoCaixaRoutes from './routes/fluxoCaixa.routes';
import sincronizacaoDeployRoutes from './routes/sincronizacaoDeploy.routes';
import movimentacoesCaixaRoutes from './routes/movimentacoesCaixa.routes';
import receitaRoutes from './routes/receita.routes';
import notificacoesRoutes from './routes/notificacoes.routes';
import atendimentoCrmRoutes from './routes/atendimentoCrm.routes';
import brasilApiNcmRoutes from './routes/brasilApiNcm.routes';
import webhooksRoutes from './routes/webhooks.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import contatosS3eRoutes from './routes/contatosS3e.routes';
import { healthCheck } from './controllers/logsController';
import { setSocketServer } from './lib/socket';
import { verifyToken } from './services/jwt.service';

const app = express();
const PORT = process.env.PORT || 3001;

// Tentativa segura de garantir colunas/índices esperados pela migration "add_audit_logs".
// Não faz alterações destrutivas: apenas cria colunas/indexes se não existirem.
// Em ambientes onde o banco não está disponível, falha silenciosamente.
(async function ensureAuditLogsColumns() {
  try {
    // Executar cada statement individualmente para evitar erro de múltiplos comandos em prepared statement
    const statements = [
      `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,
      `ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS user_id uuid`,
      `ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS entity_id text`,
      `ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS chain_id text`,
      `ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS created_at timestamptz`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_entityid ON audit_logs(entity, entity_id)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_chain_id ON audit_logs(chain_id)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`
    ];

    for (const stmt of statements) {
      try {
        await prisma.$executeRawUnsafe(stmt);
      } catch {
        // Ignorar erros por statement — manter compatibilidade e não quebrar bootstrap
      }
    }

    console.log('🔧 Verificação audit_logs: tentativa concluída (não destrutiva).');
  } catch (err) {
    console.warn('⚠️ Não foi possível garantir colunas/índices audit_logs (possível ausência do DB neste momento):', err instanceof Error ? err.message : err);
  }
})();
// Determinar origens permitidas para CORS
// Inclui domínios padrão de desenvolvimento e o host de produção conhecido (TrueNAS Scale)
const defaultOrigins = [
  'http://localhost',
  'http://localhost:80',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://app.s3eengenharia.com.br:8080',
  'http://app.s3eengenharia.com.br',
  'http://app.s3eengenharia.com.br:3001',
  'https://app.s3eengenharia.com.br:8080',
  'https://app.s3eengenharia.com.br',
  'https://app.s3eengenharia.com.br:3001'
];
const envOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
  : [];
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

// Em desenvolvimento, permitir qualquer origem para facilitar testes (incluindo Tailscale)
const isDevelopment = process.env.NODE_ENV === 'development';

/** Mesma regra para Express CORS e Socket.io (evita handshake bloqueado em produção). */
function allowOriginForBrowser(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void {
  if (isDevelopment) {
    console.log(`✅ CORS permitido (dev mode) para origem: ${origin || 'undefined'}`);
    return callback(null, true);
  }
  if (!origin || allowedOrigins.includes(origin)) {
    return callback(null, true);
  }
  if (origin && /^https?:\/\/100\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin)) {
    console.log(`✅ CORS permitido para IP Tailscale: ${origin}`);
    return callback(null, true);
  }
  console.warn(`🚫 CORS bloqueado para origem: ${origin}`);
  console.warn(`   Origens permitidas: ${allowedOrigins.join(', ')}`);
  return callback(new Error('Not allowed by CORS'));
}

const corsOptions: CorsOptions = {
  origin: (origin, callback) => allowOriginForBrowser(origin, callback),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  // Permitir headers comuns usados por browsers e axios (ex: cache-control em preflight)
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'Expires',
    'If-Modified-Since',
    'If-None-Match',
    'X-Requested-With',
    'Accept'
  ]
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

// ROTA PÚBLICA: Buscar URL do portfólio (sem autenticação)
app.get('/api/configuracoes/public/portfolio-url', async (_req, res) => {
  const fallbackPortfolioUrl = 'https://antonio-jdev.github.io/portfolio-01/';
  try {
    const configuracaoServiceModule = await import('./services/configuracao.service');
    const configuracaoService = configuracaoServiceModule.default;
    const configuracoes = await configuracaoService.getConfiguracoes();
    const portfolioUrl = (configuracoes as any)?.portfolioUrl;
    res.status(200).json({
      success: true,
      data: {
        portfolioUrl: portfolioUrl || fallbackPortfolioUrl
      }
    });
  } catch (error: any) {
    console.error('Erro ao buscar URL de portfólio pública:', error);
    res.status(200).json({
      success: true,
      data: { portfolioUrl: fallbackPortfolioUrl }
    });
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Pragma, Expires, If-Modified-Since, If-None-Match, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

app.use('/uploads', express.static(uploadsPath));

// EXCEÇÃO: Não aplicar body parsers em rotas com upload de arquivos (multer)
// Lista de rotas que PODEM usar multipart/form-data
const uploadRoutes = [
  '/api/cotacoes/importar',
  '/api/configuracoes/upload-logo',
  '/api/obras/tarefas/resumo', // Rota de upload de fotos de tarefas
  '/api/projetos', // Rotas de upload de documentos de projetos
  '/api/atendimento-crm', // Upload conta de energia (contato-lead)
  '/api/ponto', // Importação .xls do relógio de ponto
  '/api/whatsapp/send-file', // Multipart envio WhatsApp (multer)
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

// Webhooks públicos (provedor WhatsApp → backend; opcional X-Webhook-Secret)
app.use('/api/webhooks', webhooksRoutes);

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
      rh: '/api/rh',
      ponto: '/api/ponto',
      beneficios: '/api/beneficios',
      vales: '/api/vales',
      veiculos: '/api/veiculos',
      gastosVeiculo: '/api/gastos-veiculo',
      planos: '/api/planos',
      despesasFixas: '/api/despesas-fixas',
      logs: '/api/logs',
      tarefasObra: '/api/obras/tarefas',
      bi: '/api/bi',
      dre: '/api/financeiro/dre',
      fluxoCaixa: '/api/financeiro/fluxo-caixa',
      movimentacoesCaixa: '/api/movimentacoes-caixa',
      atendimentoCrm: '/api/atendimento-crm',
      whatsapp: '/api/whatsapp',
      webhooksWhatsapp: '/api/webhooks/whatsapp'
    }
  });
});

// Registrar rotas
app.use('/api/auth', authRoutes);
app.use('/api/protected', protectedRoutes);
app.use('/api/materiais', materiaisRoutes);
app.use('/api/brasil-api', brasilApiNcmRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/orcamentos', orcamentosRoutes);
app.use('/api/vendas', vendasRoutes);
app.use('/api/contas-pagar', contasPagarRoutes);
app.use('/api/contas-receber', contasReceberRoutes);
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

// Rotas compatíveis utilizadas pelo frontend (eventos / reprocessar / enviar-email / xml por nota)
// Comentadas temporariamente em produção para evitar problemas de bootstrap/crash.
// Reabilitar quando o controller e import circular forem validados.
/*
app.get('/api/nfe/notas/:id/eventos', authenticate, (req, res, next) => {
  try {
    const { NFeController } = require('./controllers/nfeController');
    return NFeController.listarEventosNota(req, res);
  } catch (err) {
    next(err);
  }
});
app.post('/api/nfe/notas/:id/reprocessar', authenticate, (req, res, next) => {
  try {
    const { NFeController } = require('./controllers/nfeController');
    return NFeController.reprocessarNota(req, res);
  } catch (err) {
    next(err);
  }
});
app.post('/api/nfe/notas/:id/enviar-email', authenticate, (req, res, next) => {
  try {
    const { NFeController } = require('./controllers/nfeController');
    return NFeController.enviarEmailNota(req, res);
  } catch (err) {
    next(err);
  }
});
app.get('/api/nfe/notas/:id/xml', authenticate, (req, res, next) => {
  try {
    const { NFeController } = require('./controllers/nfeController');
    return NFeController.getXmlNota(req, res);
  } catch (err) {
    next(err);
  }
});
*/
app.use('/api/nfe', nfeRoutes);
app.use('/api/nfse', nfseRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/quadros', quadrosRoutes);
app.use('/api/kits', kitsRoutes);
app.use('/api/configuracoes', configuracaoRoutes);
app.use('/api/notificacoes', notificacoesRoutes);
app.use('/api/atendimento-crm', atendimentoCrmRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/contatos-s3e', contatosS3eRoutes);
app.use('/api/obras', tarefasObraRoutes); // Rotas de tarefas (prefixo /api/obras) - DEVE VIR ANTES!
app.use('/api/obras', obrasRoutes); // Rotas de materiais e compras avulsas (getMateriaisObra, getComprasAvulsasObra)
app.use('/api/obras', obraRoutes);
app.use('/api/tarefas-internas', tarefasInternasRoutes);
app.use('/api/pdf-customization', pdfCustomizationRoutes);
app.use('/api/funcionarios', funcionariosRoutes);
app.use('/api/recursos-humanos', recursosHumanosRoutes);
app.use('/api/vales', valesRoutes);
app.use('/api/beneficios', beneficiosRoutes);
app.use('/api/rh', rhRoutes);
app.use('/api/ponto', pontoRoutes);
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
app.use('/api/financeiro/dre', dreRoutes);
app.use('/api/financeiro/fluxo-caixa', fluxoCaixaRoutes);
app.use('/api/sistema', sincronizacaoDeployRoutes);
app.use('/api/movimentacoes-caixa', movimentacoesCaixaRoutes);
// Proxy para consultas de CNPJ (resolve problema de CORS do receitaws)
app.use('/api/external/receita', receitaRoutes);

// Error handling middleware
app.use((err: Error & { type?: string; status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack || err);
  if (err.type === 'entity.too.large' || err.status === 413) {
    res.status(413).json({
      success: false,
      error: 'Corpo da requisição muito grande. Para PDF no WhatsApp, o arquivo é gerado no servidor — não envie base64 pelo navegador.'
    });
    return;
  }
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => allowOriginForBrowser(origin, callback),
    credentials: true,
    methods: ['GET', 'POST']
  },
  // Mantém conexões vivas através de NAT/LB e reduz quedas silenciosas.
  // Valores conservadores (boa compatibilidade com proxies).
  pingInterval: 25_000,
  pingTimeout: 20_000
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== 'string') {
      return next(new Error('unauthorized'));
    }
    const payload = verifyToken(token);
    // Anexa o `userId` decodificado no socket para usar no `connection`.
    (socket.data as Record<string, unknown>).userId = payload.userId;
    return next();
  } catch {
    return next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  // Coloca o socket em uma room dedicada ao usuário. Permite emitir
  // notificações 1-para-1 (sino, mensagens privadas) sem broadcast.
  // Eventos públicos do WhatsApp CRM continuam usando `io.emit(...)` para
  // alcançar todos os operadores conectados.
  const userId = (socket.data as Record<string, unknown> | undefined)?.userId;
  if (typeof userId === 'string' && userId.trim()) {
    socket.join(`user:${userId.trim()}`);
  }
});

setSocketServer(io);

httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor Rodando na porta ${PORT} por favor acesse: http://localhost:${PORT}`);
  console.log(`📝 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log('📡 Socket.io ativo (WhatsApp CRM)');

  // Job diário: notificar financeiro sobre contas a pagar vencendo hoje
  const runContasVencendoHoje = () => {
    import('./services/notificacoes.service')
      .then((m) => m.notificarContasAPagarVencendoHoje())
      .then(() => console.log('✅ Job contas a pagar vencendo hoje executado'))
      .catch((err) => console.error('❌ Job contas a pagar vencendo hoje:', err));
  };
  setTimeout(runContasVencendoHoje, 8000); // primeira execução 8s após subir
  setInterval(runContasVencendoHoje, 24 * 60 * 60 * 1000); // depois a cada 24h

  // Backfill leve de metadata de grupos: nomes e fotos para conversas
  // antigas que nunca passaram pelo `contact-meta`. Roda 1× após 15s e
  // depois a cada 6h, com throttle interno (até 30 grupos por ciclo).
  const runGroupMetadataBackfill = () => {
    import('./services/whatsappChat.service')
      .then((m) => m.backfillGroupMetadataCache(30))
      .then(({ processed }) => {
        if (processed > 0) {
          console.log(`✅ Group metadata backfill: ${processed} grupos sincronizados`);
        }
      })
      .catch((err) => console.warn('⚠ Group metadata backfill falhou:', err));
  };
  setTimeout(runGroupMetadataBackfill, 15_000);
  setInterval(runGroupMetadataBackfill, 6 * 60 * 60 * 1000);
});

export default app;
