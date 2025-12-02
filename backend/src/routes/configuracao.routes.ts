import { Router } from 'express';
import { ConfiguracaoController, uploadLogo } from '../controllers/configuracaoController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// NOTA: A rota /logo/:filename está definida diretamente no app.ts como pública
// para garantir que funcione sem autenticação (necessário para página de login)

// Todas as rotas requerem autenticação
router.use(authenticate);

/**
 * @route GET /api/configuracoes
 * @desc Busca configurações do sistema
 * @access Authenticated
 */
router.get('/', ConfiguracaoController.getConfiguracoes);

/**
 * @route PUT /api/configuracoes
 * @desc Salva/atualiza configurações do sistema
 * @access Admin only
 */
router.put('/', authorize('admin'), ConfiguracaoController.salvarConfiguracoes);

/**
 * @route POST /api/configuracoes/upload-logo
 * @desc Upload de logo da empresa
 * @access Admin only
 */
router.post('/upload-logo', authorize('admin'), uploadLogo, ConfiguracaoController.uploadLogo);

/**
 * @route GET /api/configuracoes/logos
 * @desc Lista todas as logos disponíveis na pasta uploads/logos
 * @access Admin only
 */
router.get('/logos', authorize('admin'), ConfiguracaoController.listarLogos);

// NOTA: A rota DELETE /logo/:filename está definida diretamente no app.ts
// ANTES da rota GET pública para ter prioridade e garantir que funcione corretamente

/**
 * @route PUT /api/configuracoes/logo
 * @desc Atualiza a logo da empresa selecionando uma logo existente
 * @access Admin only
 */
router.put('/logo', authorize('admin'), ConfiguracaoController.atualizarLogo);

/**
 * @route PUT /api/configuracoes/logo-login
 * @desc Atualiza a logo da página de login selecionando uma logo existente
 * @access Admin only
 */
router.put('/logo-login', authorize('admin'), ConfiguracaoController.atualizarLogoLogin);

/**
 * @route GET /api/configuracoes/usuarios
 * @desc Lista todos os usuários
 * @access Admin only
 */
router.get('/usuarios', authorize('admin'), ConfiguracaoController.listarUsuarios);

/**
 * @route PUT /api/configuracoes/usuarios/:id/role
 * @desc Atualiza o role de um usuário
 * @access Admin only
 */
router.put('/usuarios/:id/role', authorize('admin'), ConfiguracaoController.atualizarUsuarioRole);

/**
 * @route PUT /api/configuracoes/usuarios/:id/status
 * @desc Ativa/desativa um usuário
 * @access Admin only
 */
router.put('/usuarios/:id/status', authorize('admin'), ConfiguracaoController.toggleUsuarioStatus);

/**
 * @route POST /api/configuracoes/usuarios/criar
 * @desc Cria um novo usuário
 * @access Admin only
 */
router.post('/usuarios/criar', authorize('admin'), ConfiguracaoController.criarUsuario);

/**
 * @route DELETE /api/configuracoes/usuarios/:id
 * @desc Exclui um usuário
 * @access Admin only
 */
router.delete('/usuarios/:id', authorize('admin'), ConfiguracaoController.excluirUsuario);

/**
 * @route PUT /api/configuracoes/usuarios/:id/perfil
 * @desc Atualiza o perfil do próprio usuário (nome e senha)
 * @access Authenticated (próprio usuário ou desenvolvedor)
 */
router.put('/usuarios/:id/perfil', ConfiguracaoController.atualizarPerfil);

/**
 * @route PUT /api/configuracoes/usuarios/:id
 * @desc Atualiza email e senha de um usuário
 * @access Gerente, Admin ou Desenvolvedor
 */
router.put('/usuarios/:id', authorize('admin', 'gerente', 'desenvolvedor'), ConfiguracaoController.atualizarUsuario);

export default router;

