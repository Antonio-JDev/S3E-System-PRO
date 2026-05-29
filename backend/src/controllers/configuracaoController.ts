import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { AuditoriaService } from '../services/auditoria.service';
import configuracaoService from '../services/configuracao.service';
import { isProtectedAccount, isProtectedAccountBlockedForEditor } from '../utils/userProtection.util';

// Configuração do multer para upload de imagem
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Em Docker, o CWD é /app e o volume está mapeado em /app/uploads
    // Em desenvolvimento local, pode estar em backend/ ou na raiz
    const cwd = process.cwd();
    let uploadDir: string;
    
    if (cwd.endsWith('backend')) {
      // Desenvolvimento local rodando de dentro da pasta backend
      uploadDir = path.join(cwd, 'uploads', 'logos');
    } else {
      // Docker ou raiz do projeto - usar /app/uploads diretamente
      uploadDir = path.join(cwd, 'uploads', 'logos');
    }
    
    console.log('📁 CWD:', cwd);
    console.log('📁 Upload directory:', uploadDir);
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      console.log('📁 Criando diretório:', uploadDir);
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'logo-' + uniqueSuffix + path.extname(file.originalname);
    console.log('📷 Nome do arquivo:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|svg|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens (JPEG, PNG, SVG, WEBP) são permitidas'));
    }
  }
});

export const uploadLogo = upload.single('logo');
const MAX_SETOR_LENGTH = 80;
const DEV_ROLE = 'desenvolvedor';

function sanitizeSetorInput(raw: unknown): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  const setor = String(raw).trim();
  if (!setor) return null;
  return setor;
}

function isDeveloperRole(role?: string | null): boolean {
  return String(role || '').toLowerCase() === DEV_ROLE;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export class ConfiguracaoController {
  /**
   * GET /api/configuracoes
   * Busca as configurações do sistema
   */
  static async getConfiguracoes(req: Request, res: Response): Promise<void> {
    try {
      const configuracoes = await configuracaoService.getConfiguracoes();
      res.status(200).json({ success: true, data: configuracoes });
    } catch (error: any) {
      console.error('Erro ao buscar configurações:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar configurações', 
        error: error.message 
      });
    }
  }

  /**
   * PUT /api/configuracoes/portfolio-url
   * Atualiza a URL pública do portfólio exibida no login.
   * Requer: desenvolvedor
   */
  static async salvarPortfolioUrl(req: Request, res: Response): Promise<void> {
    try {
      const { portfolioUrl } = req.body as { portfolioUrl?: string };
      const sanitized = String(portfolioUrl || '').trim();

      if (!sanitized) {
        res.status(400).json({
          success: false,
          message: 'URL do portfólio é obrigatória'
        });
        return;
      }

      if (!isValidHttpUrl(sanitized)) {
        res.status(400).json({
          success: false,
          message: 'Informe uma URL válida (http/https)'
        });
        return;
      }

      const configuracoes = await configuracaoService.salvarConfiguracoes({
        portfolioUrl: sanitized
      });

      res.status(200).json({
        success: true,
        data: { portfolioUrl: (configuracoes as any).portfolioUrl },
        message: 'URL do portfólio atualizada com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao salvar URL do portfólio:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao salvar URL do portfólio',
        error: error.message
      });
    }
  }

  /**
   * GET /api/configuracoes/meta-vendas?mes=YYYY-MM
   * Meta mensal global (leitura para qualquer usuário autenticado)
   */
  static async getMetaVendas(req: Request, res: Response): Promise<void> {
    try {
      const mes = typeof req.query.mes === 'string' ? req.query.mes.trim() : undefined;
      const data = await configuracaoService.getMetaVendas(mes && /^\d{4}-\d{2}$/.test(mes) ? mes : undefined);
      res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao buscar meta de vendas';
      console.error('Erro getMetaVendas:', error);
      res.status(500).json({ success: false, message, error: message });
    }
  }

  /**
   * PUT /api/configuracoes/meta-vendas
   * Body: { mes?: string (YYYY-MM), valor: number, atualizarMetaPadrao?: boolean }
   * Requer: admin ou desenvolvedor
   */
  static async salvarMetaVendas(req: Request, res: Response): Promise<void> {
    try {
      const { mes, valor, atualizarMetaPadrao } = req.body as {
        mes?: string;
        valor?: number;
        atualizarMetaPadrao?: boolean;
      };
      const valorNum = Number(valor);
      if (!Number.isFinite(valorNum) || valorNum < 0) {
        res.status(400).json({ success: false, message: 'Informe um valor numérico válido (≥ 0)' });
        return;
      }
      const data = await configuracaoService.salvarMetaVendas({
        mes: typeof mes === 'string' ? mes : undefined,
        valor: valorNum,
        atualizarPadrao: Boolean(atualizarMetaPadrao)
      });
      res.status(200).json({ success: true, data, message: 'Meta de vendas atualizada' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar meta de vendas';
      const status = message.includes('inválid') ? 400 : 500;
      console.error('Erro salvarMetaVendas:', error);
      res.status(status).json({ success: false, message, error: message });
    }
  }

  /**
   * PUT /api/configuracoes
   * Salva/atualiza as configurações do sistema
   * Requer: Admin
   */
  static async salvarConfiguracoes(req: Request, res: Response): Promise<void> {
    try {
      const {
        temaPreferido,
        logoUrl,
        logoLoginUrl,
        logoDanfeUrl,
        nomeEmpresa,
        emailContato,
        telefoneContato,
        portfolioUrl,
        multiplicadorVenda,
        percentualImpostoPadrao,
        aliquotaImpostoPadrao,
        markupFabricante,
        markupRevendedor
      } = req.body;

      // Validação básica
      if (temaPreferido && !['light', 'dark', 'system'].includes(temaPreferido)) {
        res.status(400).json({ 
          success: false, 
          message: 'Tema inválido. Use: light, dark ou system' 
        });
        return;
      }

      // Segurança: URL de portfólio só pode ser alterada por rota específica de DEV.
      if (portfolioUrl !== undefined) {
        const userRole = String((req as any).user?.role || '').toLowerCase();
        if (userRole !== DEV_ROLE) {
          res.status(403).json({
            success: false,
            message: 'Somente desenvolvedor pode alterar a URL de portfólio'
          });
          return;
        }
      }

      const configuracoes = await configuracaoService.salvarConfiguracoes({
        temaPreferido,
        logoUrl,
        logoLoginUrl,
        logoDanfeUrl,
        nomeEmpresa,
        emailContato,
        telefoneContato,
        portfolioUrl,
        multiplicadorVenda: multiplicadorVenda != null ? Number(multiplicadorVenda) : undefined,
        percentualImpostoPadrao: percentualImpostoPadrao != null ? Number(percentualImpostoPadrao) : undefined,
        aliquotaImpostoPadrao: aliquotaImpostoPadrao != null ? Number(aliquotaImpostoPadrao) : undefined,
        markupFabricante: markupFabricante != null ? Number(markupFabricante) : undefined,
        markupRevendedor: markupRevendedor != null ? Number(markupRevendedor) : undefined
      });

      res.status(200).json({ 
        success: true, 
        data: configuracoes,
        message: 'Configurações salvas com sucesso' 
      });
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao salvar configurações', 
        error: error.message 
      });
    }
  }

  /**
   * POST /api/configuracoes/upload-logo
   * Upload de logo da empresa
   * Requer: Admin
   */
  static async uploadLogo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Nenhum arquivo foi enviado'
        });
        return;
      }

      // Construir URL do arquivo
      const logoUrl = `/uploads/logos/${req.file.filename}`;
      
      // Salvar URL no banco de dados
      const configuracoes = await configuracaoService.salvarConfiguracoes({ logoUrl });

      res.status(200).json({
        success: true,
        data: {
          logoUrl,
          configuracoes
        },
        message: 'Logo enviado com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao fazer upload do logo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao fazer upload do logo',
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/configuracoes/logo/:filename
   * Deleta uma logo do servidor
   * Requer: Admin
   */
  static async deletarLogo(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;
      
      console.log('🗑️  Deletar logo chamado:', filename);

      if (!filename) {
        res.status(400).json({
          success: false,
          message: 'Nome do arquivo é obrigatório'
        });
        return;
      }

      // Determinar caminho do arquivo
      const cwd = process.cwd();
      let logosDir: string;
      
      if (cwd.endsWith('backend')) {
        logosDir = path.join(cwd, 'uploads', 'logos');
      } else {
        // Docker: usar /app/uploads diretamente
        logosDir = path.join(cwd, 'uploads', 'logos');
      }
      
      const logoPath = path.join(logosDir, filename);

      // Verificar se arquivo existe
      if (!fs.existsSync(logoPath)) {
        res.status(404).json({
          success: false,
          message: 'Logo não encontrada'
        });
        return;
      }

      // Verificar se a logo está sendo usada
      const logoUrl = `/uploads/logos/${filename}`;
      const configuracoes = await configuracaoService.getConfiguracoes();
      
      // Se a logo estiver sendo usada como logoUrl ou logoLoginUrl, remover a referência
      if (configuracoes.logoUrl === logoUrl) {
        await configuracaoService.salvarConfiguracoes({ logoUrl: undefined });
        console.log('⚠️ Logo removida da configuração logoUrl');
      }

      if (configuracoes.logoLoginUrl === logoUrl) {
        await configuracaoService.salvarConfiguracoes({ logoLoginUrl: undefined });
        console.log('⚠️ Logo removida da configuração logoLoginUrl');
      }

      if ((configuracoes as any).logoDanfeUrl === logoUrl) {
        await configuracaoService.salvarConfiguracoes({ logoDanfeUrl: undefined } as any);
        console.log('⚠️ Logo removida da configuração logoDanfeUrl');
      }

      // Deletar arquivo
      fs.unlinkSync(logoPath);
      console.log('✅ Logo deletada:', filename);

      res.status(200).json({
        success: true,
        message: 'Logo deletada com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao deletar logo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao deletar logo',
        error: error.message
      });
    }
  }

  /**
   * GET /api/configuracoes/logos
   * Lista todas as logos disponíveis na pasta uploads/logos
   * Requer: Admin
   */
  static async listarLogos(req: Request, res: Response): Promise<void> {
    try {
      const cwd = process.cwd();
      const isBackendFolder = cwd.endsWith('backend');
      let logosDir: string;
      
      if (isBackendFolder) {
        logosDir = path.join(cwd, 'uploads', 'logos');
      } else {
        // Docker: usar /app/uploads diretamente
        logosDir = path.join(cwd, 'uploads', 'logos');
      }
      
      // Criar diretório se não existir
      if (!fs.existsSync(logosDir)) {
        fs.mkdirSync(logosDir, { recursive: true });
        res.status(200).json({ success: true, data: [] });
        return;
      }

      // Ler arquivos do diretório
      const files = fs.readdirSync(logosDir);
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.svg', '.webp', '.gif'];
      
      const logos = files
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return imageExtensions.includes(ext);
        })
        .map(file => ({
          filename: file,
          url: `/uploads/logos/${file}`,
          path: path.join(logosDir, file)
        }));

      res.status(200).json({ 
        success: true, 
        data: logos 
      });
    } catch (error: any) {
      console.error('Erro ao listar logos:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao listar logos', 
        error: error.message 
      });
    }
  }

  /**
   * PUT /api/configuracoes/logo
   * Atualiza a logo da empresa selecionando uma logo existente
   * Requer: Admin
   */
  static async atualizarLogo(req: Request, res: Response): Promise<void> {
    try {
      const { logoUrl } = req.body;

      if (!logoUrl) {
        res.status(400).json({
          success: false,
          message: 'URL da logo é obrigatória'
        });
        return;
      }

      // Validar se a logo existe
      const cwd = process.cwd();
      const isBackendFolder = cwd.endsWith('backend');
      let logosDir: string;
      
      if (isBackendFolder) {
        logosDir = path.join(cwd, 'uploads', 'logos');
      } else {
        // Docker: usar /app/uploads diretamente
        logosDir = path.join(cwd, 'uploads', 'logos');
      }
      
      const filename = path.basename(logoUrl);
      const logoPath = path.join(logosDir, filename);

      if (!fs.existsSync(logoPath)) {
        res.status(404).json({
          success: false,
          message: 'Logo não encontrada'
        });
        return;
      }

      // Salvar URL no banco de dados
      const configuracoes = await configuracaoService.salvarConfiguracoes({ logoUrl });

      res.status(200).json({
        success: true,
        data: configuracoes,
        message: 'Logo atualizada com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao atualizar logo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar logo',
        error: error.message
      });
    }
  }

  /**
   * PUT /api/configuracoes/logo-login
   * Atualiza a logo da página de login selecionando uma logo existente
   * Requer: Admin
   */
  static async atualizarLogoLogin(req: Request, res: Response): Promise<void> {
    try {
      const { logoUrl } = req.body;

      // Se logoUrl for vazio, remover a logo (usar fallback)
      if (logoUrl === '' || logoUrl === null || logoUrl === undefined) {
        const configuracoes = await configuracaoService.salvarConfiguracoes({ logoLoginUrl: undefined });
        res.status(200).json({
          success: true,
          data: configuracoes,
          message: 'Logo da página de login removida. O fallback será exibido.'
        });
        return;
      }

      // Validar se a logo existe
      const cwd = process.cwd();
      const isBackendFolder = cwd.endsWith('backend');
      let logosDir: string;
      
      if (isBackendFolder) {
        logosDir = path.join(cwd, 'uploads', 'logos');
      } else {
        // Docker: usar /app/uploads diretamente
        logosDir = path.join(cwd, 'uploads', 'logos');
      }
      
      const filename = path.basename(logoUrl);
      const logoPath = path.join(logosDir, filename);

      if (!fs.existsSync(logoPath)) {
        res.status(404).json({
          success: false,
          message: 'Logo não encontrada'
        });
        return;
      }

      // Salvar URL no banco de dados
      const configuracoes = await configuracaoService.salvarConfiguracoes({ logoLoginUrl: logoUrl });

      res.status(200).json({
        success: true,
        data: configuracoes,
        message: 'Logo da página de login atualizada com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao atualizar logo da página de login:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar logo da página de login',
        error: error.message
      });
    }
  }

  /**
   * PUT /api/configuracoes/logo-danfe
   * Atualiza a logo utilizada na DANFE selecionando uma logo existente
   * Requer: Admin
   */
  static async atualizarLogoDanfe(req: Request, res: Response): Promise<void> {
    try {
      const { logoUrl } = req.body;

      // Se logoUrl for vazio, remover a logo específica da DANFE (usar logo geral como fallback)
      if (logoUrl === '' || logoUrl === null || logoUrl === undefined) {
        const configuracoes = await configuracaoService.salvarConfiguracoes({ logoDanfeUrl: undefined });
        res.status(200).json({
          success: true,
          data: configuracoes,
          message: 'Logo da DANFE removida. A logo geral será utilizada como fallback.'
        });
        return;
      }

      // Validar se a logo existe fisicamente
      const cwd = process.cwd();
      const isBackendFolder = cwd.endsWith('backend');
      let logosDir: string;

      if (isBackendFolder) {
        logosDir = path.join(cwd, 'uploads', 'logos');
      } else {
        // Docker: usar /app/uploads diretamente
        logosDir = path.join(cwd, 'uploads', 'logos');
      }

      const filename = path.basename(logoUrl);
      const logoPath = path.join(logosDir, filename);

      if (!fs.existsSync(logoPath)) {
        res.status(404).json({
          success: false,
          message: 'Logo não encontrada'
        });
        return;
      }

      // Salvar URL no banco de dados
      const configuracoes = await configuracaoService.salvarConfiguracoes({ logoDanfeUrl: logoUrl });

      res.status(200).json({
        success: true,
        data: configuracoes,
        message: 'Logo da DANFE atualizada com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao atualizar logo da DANFE:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar logo da DANFE',
        error: error.message
      });
    }
  }

  /**
   * GET /api/configuracoes/logo/:filename
   * Serve a imagem do logo com headers corretos
   * NÃO requer autenticação (para funcionar na página de login)
   */
  static async servirLogo(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;

      if (!filename) {
        res.status(400).json({
          success: false,
          message: 'Nome do arquivo é obrigatório'
        });
        return;
      }

      // Determinar caminho do arquivo
      const cwd = process.cwd();
      const isBackendFolder = cwd.endsWith('backend');
      
      // Em Docker, o CWD é /app e uploads está em /app/uploads
      // Em desenvolvimento local, pode estar em backend/ ou na raiz
      let logosDir: string;
      // Usar apenas uploads (não backend/uploads)
      logosDir = path.join(cwd, 'uploads', 'logos');
      
      // Criar diretório se não existir
      if (!fs.existsSync(logosDir)) {
        console.log('📁 Criando diretório de logos:', logosDir);
        fs.mkdirSync(logosDir, { recursive: true });
      }
      
      const logoPath = path.join(logosDir, filename);

      console.log('🔍 Tentando servir logo:', {
        filename,
        cwd,
        isBackendFolder,
        logosDir,
        logoPath,
        exists: fs.existsSync(logoPath)
      });

      // Verificar se arquivo existe
      if (!fs.existsSync(logoPath)) {
        console.error('❌ Logo não encontrada:', logoPath);
        
        // Listar arquivos disponíveis no diretório para debug
        let arquivosDisponiveis: string[] = [];
        try {
          if (fs.existsSync(logosDir)) {
            arquivosDisponiveis = fs.readdirSync(logosDir);
            console.log('📁 Arquivos disponíveis em', logosDir, ':', arquivosDisponiveis);
          } else {
            console.error('❌ Diretório de logos não existe:', logosDir);
          }
        } catch (err: any) {
          console.error('❌ Erro ao listar arquivos:', err.message);
        }
        
        res.status(404).json({
          success: false,
          message: 'Logo não encontrada',
          path: logoPath,
          logosDir,
          arquivosDisponiveis: arquivosDisponiveis.slice(0, 10) // Limitar a 10 para não sobrecarregar
        });
        return;
      }

      // Determinar Content-Type baseado na extensão
      const ext = path.extname(filename).toLowerCase();
      const contentTypes: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
        '.gif': 'image/gif'
      };

      const contentType = contentTypes[ext] || 'application/octet-stream';

      // Configurar headers CORS e Content-Type
      // IMPORTANTE: Permitir todas as origens para funcionar tanto em localhost quanto em produção (IP ou domínio)
      // Isso é necessário porque a rota de logo é pública e pode ser acessada de qualquer origem
      const origin = req.headers.origin;
      
      // Sempre permitir qualquer origem para logos (público)
      // Isso funciona tanto para localhost quanto para IPs em produção (ex: https://192.168.100.228:3001)
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache por 1 ano

      console.log('✅ Servindo logo:', filename, 'Content-Type:', contentType, 'Origin:', origin || 'undefined (permitindo todas)');

      // Enviar arquivo usando path absoluto
      const absolutePath = path.resolve(logoPath);
      res.sendFile(absolutePath, (err) => {
        if (err) {
          console.error('❌ Erro ao enviar arquivo:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Erro ao enviar arquivo',
              error: err.message
            });
          }
        }
      });
    } catch (error: any) {
      console.error('❌ Erro ao servir logo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao servir logo',
        error: error.message
      });
    }
  }

  /**
   * GET /api/configuracoes/usuarios
   * Lista todos os usuários (sem senha) - para atribuição em tarefas/kanban (Obras, Ordem de serviço, Tarefas internas).
   * Acesso: qualquer usuário autenticado.
   */
  static async listarUsuarios(req: Request, res: Response): Promise<void> {
    try {
      const { search, role, active } = req.query;

      const filtros = {
        search: search as string | undefined,
        role: role as string | undefined,
        active: active === 'true' ? true : active === 'false' ? false : undefined
      };

      const usuarios = await configuracaoService.listarUsuarios(filtros);
      
      res.status(200).json({ success: true, data: usuarios });
    } catch (error: any) {
      console.error('Erro ao listar usuários:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao listar usuários', 
        error: error.message 
      });
    }
  }

  /**
   * PUT /api/configuracoes/usuarios/:id/role
   * Atualiza o role de um usuário
   * Requer: Admin
   */
  static async atualizarUsuarioRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role) {
        res.status(400).json({ 
          success: false, 
          message: 'Role é obrigatório' 
        });
        return;
      }

      const usuarioAtual = await prisma.user.findUnique({ where: { id } });
      if (!usuarioAtual) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      if (isProtectedAccount(usuarioAtual)) {
        res.status(403).json({
          success: false,
          message: 'Conta protegida do sistema — função não pode ser alterada'
        });
        return;
      }

      const usuario = await configuracaoService.atualizarUsuarioRole(id, role);
      
      res.status(200).json({ 
        success: true, 
        data: usuario,
        message: `Role atualizado para: ${role}` 
      });
    } catch (error: any) {
      console.error('Erro ao atualizar role:', error);
      res.status(400).json({ 
        success: false, 
        message: error.message || 'Erro ao atualizar role do usuário'
      });
    }
  }

  /**
   * PUT /api/configuracoes/usuarios/:id/status
   * Ativa/desativa um usuário
   * Requer: Admin
   */
  static async toggleUsuarioStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { active } = req.body;

      if (active === undefined) {
        res.status(400).json({ 
          success: false, 
          message: 'Status (active) é obrigatório' 
        });
        return;
      }

      const usuarioAtual = await prisma.user.findUnique({ where: { id } });
      if (!usuarioAtual) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      if (isProtectedAccount(usuarioAtual)) {
        res.status(403).json({
          success: false,
          message: 'Conta protegida do sistema — status não pode ser alterado por terceiros'
        });
        return;
      }

      const usuario = await configuracaoService.toggleUsuarioStatus(id, active);
      
      res.status(200).json({ 
        success: true, 
        data: usuario,
        message: `Usuário ${active ? 'ativado' : 'desativado'} com sucesso` 
      });
    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao alterar status do usuário', 
        error: error.message 
      });
    }
  }

  /**
   * POST /api/configuracoes/usuarios/criar
   * Cria um novo usuário (apenas Admin)
   * Requer: Admin
   */
  static async criarUsuario(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name, role, setor } = req.body;
      const setorNormalizado = sanitizeSetorInput(setor);

      // Validação dos campos obrigatórios
      if (!email || !password || !name || !role) {
        res.status(400).json({
          success: false,
          message: 'Email, senha, nome e função são obrigatórios'
        });
        return;
      }

      // Validação do role (novos + antigos para compatibilidade)
      const rolesPermitidos = ['admin', 'gerente', 'desenvolvedor', 'financeiro_faturamento', 'desenhista_industrial', 'engenheiro_eletricista', 'engenheiro', 'eletricista', 'orcamentista', 'compras', 'user'];
      if (!rolesPermitidos.includes(role)) {
        res.status(400).json({
          success: false,
          message: `Role inválido. Permitidos: ${rolesPermitidos.join(', ')}`
        });
        return;
      }

      // Validação da senha
      if (password.length < 6) {
        res.status(400).json({
          success: false,
          message: 'A senha deve ter pelo menos 6 caracteres'
        });
        return;
      }

      if (setorNormalizado && setorNormalizado.length > MAX_SETOR_LENGTH) {
        res.status(400).json({
          success: false,
          message: `Setor deve ter no máximo ${MAX_SETOR_LENGTH} caracteres`
        });
        return;
      }

      const usuario = await configuracaoService.criarUsuario({
        email,
        password,
        name,
        role,
        setor: setorNormalizado
      });

      res.status(201).json({
        success: true,
        data: usuario,
        message: 'Usuário criado com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      
      if (error.message === 'Email já cadastrado') {
        res.status(400).json({
          success: false,
          message: 'Email já cadastrado no sistema'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao criar usuário',
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/configuracoes/usuarios/:id
   * Exclui um usuário permanentemente
   * Requer: Admin
   */
  static async excluirUsuario(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validação básica
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID do usuário é obrigatório'
        });
        return;
      }

      // Proteção: não permitir que o admin exclua a si mesmo
      const userId = (req as any).userId; // userId do token JWT
      if (userId === id) {
        res.status(400).json({
          success: false,
          message: 'Você não pode excluir sua própria conta'
        });
        return;
      }

      const alvo = await prisma.user.findUnique({ where: { id } });
      if (!alvo) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      if (isProtectedAccount(alvo)) {
        res.status(403).json({
          success: false,
          message: 'Conta protegida do sistema — não pode ser excluída'
        });
        return;
      }

      const result = await configuracaoService.excluirUsuario(id);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);

      if (error.message === 'Usuário não encontrado') {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao excluir usuário',
        error: error.message
      });
    }
  }

  /**
   * PUT /api/configuracoes/usuarios/:id/perfil
   * Atualiza o perfil do próprio usuário (nome e senha)
   */
  static async atualizarPerfil(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, senhaAtual, senhaNova } = req.body;
      const userId = (req as any).user?.userId;
      
      // Apenas o próprio usuário pode atualizar o próprio perfil
      if (userId !== id) {
        res.status(403).json({
          success: false,
          error: '🚫 Você só pode atualizar seu próprio perfil'
        });
        return;
      }
      
      const usuario = await prisma.user.findUnique({
        where: { id }
      });
      
      if (!usuario) {
        res.status(404).json({
          success: false,
          error: 'Usuário não encontrado'
        });
        return;
      }
      
      const dadosAtualizacao: any = {};
      
      // Atualizar nome
      if (name) {
        dadosAtualizacao.name = name;
      }
      
      // Atualizar senha (se fornecida)
      if (senhaNova) {
        if (!senhaAtual) {
          res.status(400).json({
            success: false,
            error: 'Senha atual é obrigatória para alterar a senha'
          });
          return;
        }
        
        // Verificar senha atual
        const bcrypt = (await import('bcryptjs')).default;
        const senhaValida = await bcrypt.compare(senhaAtual, usuario.password);
        
        if (!senhaValida) {
          res.status(400).json({
            success: false,
            error: 'Senha atual incorreta'
          });
          return;
        }
        
        // Hash da nova senha
        dadosAtualizacao.password = await bcrypt.hash(senhaNova, 10);
      }
      
      // Atualizar usuário
      const usuarioAtualizado = await prisma.user.update({
        where: { id },
        data: dadosAtualizacao,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true
        }
      });
      
      // Audit log (desativado) — usa stub de auditoria
      try {
        await AuditoriaService.registrarEvento({
          userId: userId,
          action: 'UPDATE_PROFILE',
          entity: 'User',
          entityId: id,
          description: `Usuário ${name ? 'atualizou nome' : ''}${name && senhaNova ? ' e ' : ''}${senhaNova ? 'alterou senha' : ''}`,
          metadata: {
            nomeAlterado: !!name,
            senhaAlterada: !!senhaNova
          }
        });
      } catch (err) {
        console.error('Erro ao registrar audit (stub):', err);
      }
      
      console.log(`✅ Perfil atualizado: ${usuarioAtualizado.email}`);
      
      res.json({
        success: true,
        data: usuarioAtualizado,
        message: '✅ Perfil atualizado com sucesso!'
      });
    } catch (error: any) {
      console.error('❌ Erro ao atualizar perfil:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao atualizar perfil'
      });
    }
  }

  /**
   * PUT /api/configuracoes/usuarios/:id
   * Atualiza email e senha de um usuário
   * Requer: Gerente, Admin ou Desenvolvedor
   */
  static async atualizarUsuario(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { email, senhaNova, name, isAdmin, setor } = req.body;
      const userRole = (req as any).user?.role?.toLowerCase();
      const editorUserId = (req as any).user?.userId as string | undefined;
      const isSelfEdit = editorUserId === id;

      const usuario = await prisma.user.findUnique({
        where: { id }
      });
      
      if (!usuario) {
        res.status(404).json({
          success: false,
          error: 'Usuário não encontrado'
        });
        return;
      }

      // Verificar permissão: gerente, admin ou desenvolvedor — ou titular editando conta protegida
      const rolesPermitidos = ['gerente', 'admin', 'desenvolvedor'];
      if (!rolesPermitidos.includes(userRole) && !(isSelfEdit && isProtectedAccount(usuario))) {
        res.status(403).json({
          success: false,
          error: '🚫 Você não tem permissão para editar usuários'
        });
        return;
      }

      if (isProtectedAccountBlockedForEditor(usuario, editorUserId)) {
        res.status(403).json({
          success: false,
          error: '🚫 Conta protegida do sistema — cadastro não pode ser editado por terceiros'
        });
        return;
      }
      
      const dadosAtualizacao: any = {};
      
      // Atualizar email (se fornecido)
      if (email && email !== usuario.email) {
        // Verificar se o email já existe
        const emailExistente = await prisma.user.findUnique({
          where: { email }
        });
        
        if (emailExistente && emailExistente.id !== id) {
          res.status(400).json({
            success: false,
            error: 'Este email já está em uso por outro usuário'
          });
          return;
        }
        
        dadosAtualizacao.email = email;
      }
      
      // Atualizar nome (se fornecido)
      if (name) {
        dadosAtualizacao.name = name;
      }

      if (setor !== undefined) {
        const setorNormalizado = sanitizeSetorInput(setor);
        if (setorNormalizado && setorNormalizado.length > MAX_SETOR_LENGTH) {
          res.status(400).json({
            success: false,
            error: `Setor deve ter no máximo ${MAX_SETOR_LENGTH} caracteres`
          });
          return;
        }
        if (setorNormalizado !== (usuario.setor ?? null)) {
          dadosAtualizacao.setor = setorNormalizado;
        }
      }
      
      // Conta protegida: isAdmin nunca pode ser alterado (nem pelo titular)
      if (typeof isAdmin === 'boolean') {
        if (isProtectedAccount(usuario)) {
          res.status(403).json({
            success: false,
            error: '🚫 Conta protegida do sistema — permissão de admin não pode ser alterada'
          });
          return;
        }
        dadosAtualizacao.isAdmin = isAdmin;
      }
      
      // Atualizar senha (se fornecida) - sem precisar da senha atual para admin/gerente/desenvolvedor
      if (senhaNova) {
        if (senhaNova.length < 6) {
          res.status(400).json({
            success: false,
            error: 'A senha deve ter no mínimo 6 caracteres'
          });
          return;
        }
        
        const bcrypt = (await import('bcryptjs')).default;
        dadosAtualizacao.password = await bcrypt.hash(senhaNova, 10);
      }
      
      // Se não houver nada para atualizar
      if (Object.keys(dadosAtualizacao).length === 0) {
        res.status(400).json({
          success: false,
          error: 'Nenhum dado fornecido para atualização'
        });
        return;
      }
      
      // Atualizar usuário
      const usuarioAtualizado = await prisma.user.update({
        where: { id },
        data: dadosAtualizacao,
        select: {
          id: true,
          name: true,
          setor: true,
          email: true,
          role: true,
          isAdmin: true,
          active: true
        }
      });
      
      // Audit log (desativado) — usa stub de auditoria
      try {
        const userId = (req as any).user?.userId;
        await AuditoriaService.registrarEvento({
          userId: userId,
          action: 'UPDATE_USER',
          entity: 'User',
          entityId: id,
          description: `Usuário atualizado: ${email ? 'email' : ''}${email && senhaNova ? ' e ' : ''}${senhaNova ? 'senha' : ''}${name ? ' e nome' : ''}`,
          metadata: {
            emailAlterado: !!email,
            senhaAlterada: !!senhaNova,
            nomeAlterado: !!name
          }
        });
      } catch (err) {
        console.error('Erro ao registrar audit (stub):', err);
      }
      
      console.log(`✅ Usuário atualizado: ${usuarioAtualizado.email}`);
      
      res.json({
        success: true,
        data: usuarioAtualizado,
        message: '✅ Usuário atualizado com sucesso!'
      });
    } catch (error: any) {
      console.error('❌ Erro ao atualizar usuário:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao atualizar usuário'
      });
    }
  }

  /**
   * GET /api/configuracoes/usuarios/me/preferencias
   * Retorna as preferências do usuário logado (ex: orcamentoInsercaoModo)
   * @access Authenticated (próprio usuário)
   */
  static async getPreferencias(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Usuário não autenticado' });
        return;
      }
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true }
      });
      const prefs = (user?.preferences as Record<string, unknown>) || {};
      const orcamentoInsercaoModo = (prefs.orcamentoInsercaoModo === 'ocultar' ? 'ocultar' : 'check') as 'check' | 'ocultar';
      res.status(200).json({
        success: true,
        data: { orcamentoInsercaoModo }
      });
    } catch (error: any) {
      console.error('Erro ao buscar preferências:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao buscar preferências'
      });
    }
  }

  /**
   * PUT /api/configuracoes/usuarios/me/preferencias
   * Atualiza as preferências do usuário logado
   * @access Authenticated (próprio usuário)
   */
  static async salvarPreferencias(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Usuário não autenticado' });
        return;
      }
      const { orcamentoInsercaoModo } = req.body;
      if (orcamentoInsercaoModo !== undefined && orcamentoInsercaoModo !== 'check' && orcamentoInsercaoModo !== 'ocultar') {
        res.status(400).json({
          success: false,
          error: 'orcamentoInsercaoModo deve ser "check" ou "ocultar"'
        });
        return;
      }
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true }
      });
      const current = (user?.preferences as Record<string, unknown>) || {};
      const newPrefs = {
        ...current,
        ...(orcamentoInsercaoModo !== undefined ? { orcamentoInsercaoModo } : {})
      };
      await prisma.user.update({
        where: { id: userId },
        data: { preferences: newPrefs }
      });
      res.status(200).json({
        success: true,
        data: { orcamentoInsercaoModo: newPrefs.orcamentoInsercaoModo === 'ocultar' ? 'ocultar' : 'check' }
      });
    } catch (error: any) {
      console.error('Erro ao salvar preferências:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao salvar preferências'
      });
    }
  }
}

export default new ConfiguracaoController();

