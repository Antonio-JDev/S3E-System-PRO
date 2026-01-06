import React, { useState, useEffect, useMemo, useContext } from 'react';
import { configuracoesService, type ConfiguracaoSistema, type Usuario } from '../services/configuracoesService';
import { ThemeContext } from '../contexts/ThemeContext';
import { AuthContext } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { API_CONFIG, getUploadUrl, getBackendUrl } from '../config/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

// ==================== ICONS ====================
const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

const PaintBrushIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
);

const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
);

const BuildingOfficeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
);

const MagnifyingGlassIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

const PhotoIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

const SunIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
);

const MoonIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
);

const ComputerDesktopIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
    </svg>
);

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

interface ConfiguracoesProps {
    toggleSidebar: () => void;
}

type TabType = 'perfil' | 'usuarios' | 'empresa' | 'fiscal';

const Configuracoes: React.FC<ConfiguracoesProps> = ({ toggleSidebar }) => {
    const themeContext = useContext(ThemeContext);
    const authContext = useContext(AuthContext);
    const user = authContext?.user;
    const isEletricista = user?.role?.toLowerCase() === 'eletricista';
    
    const [abaAtiva, setAbaAtiva] = useState<TabType>('perfil');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Estados para alteração de perfil (nome e senha)
    const [perfilNome, setPerfilNome] = useState(user?.name || '');
    const [perfilSenhaAtual, setPerfilSenhaAtual] = useState('');
    const [perfilSenhaNova, setPerfilSenhaNova] = useState('');
    const [perfilSenhaConfirma, setPerfilSenhaConfirma] = useState('');
    
    // Estados de Configuração da Empresa
    const [config, setConfig] = useState<ConfiguracaoSistema | null>(null);
    const [formConfig, setFormConfig] = useState({
        nomeEmpresa: 'S3E Engenharia',
        emailContato: '',
        telefoneContato: ''
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string>('');
    const [logosDisponiveis, setLogosDisponiveis] = useState<Array<{ filename: string; url: string }>>([]);
    const [logoSelecionada, setLogoSelecionada] = useState<string>('');
    const [loadingLogos, setLoadingLogos] = useState(false);
    
    // Estados para Logo da Página de Login
    const [logoLoginFile, setLogoLoginFile] = useState<File | null>(null);
    const [logoLoginPreview, setLogoLoginPreview] = useState<string>('');
    const [logoLoginSelecionada, setLogoLoginSelecionada] = useState<string>('');
    
    // Estados de Configuração Fiscal
    const [certificadoPFX, setCertificadoPFX] = useState<string>('');
    const [certificadoPFXFile, setCertificadoPFXFile] = useState<File | null>(null);
    const [senhaCertificado, setSenhaCertificado] = useState('');
    const [ambienteFiscal, setAmbienteFiscal] = useState<'1' | '2'>('2'); // 1=Produção, 2=Homologação

    // Estados de Usuários
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [searchUsuarios, setSearchUsuarios] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('Todos');
    const [loadingUsuarios, setLoadingUsuarios] = useState(false);
    
    // Estados do Modal de Criar Usuário
    const [isModalUsuarioOpen, setIsModalUsuarioOpen] = useState(false);
    const [isModalEditarUsuarioOpen, setIsModalEditarUsuarioOpen] = useState(false);
    const [usuarioParaEditar, setUsuarioParaEditar] = useState<Usuario | null>(null);
    const [editarUsuarioForm, setEditarUsuarioForm] = useState({
        email: '',
        name: '',
        senhaNova: ''
    });
    const [novoUsuario, setNovoUsuario] = useState({
        email: '',
        password: '',
        name: '',
        role: 'user'
    });
    const [creatingUser, setCreatingUser] = useState(false);

    // Estados do Modal de Excluir Usuário
    const [isModalExcluirOpen, setIsModalExcluirOpen] = useState(false);
    const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<Usuario | null>(null);
    const [excluindoUsuario, setExcluindoUsuario] = useState(false);

    useEffect(() => {
        // Apenas carregar configurações se não for eletricista
        if (!isEletricista) {
            loadConfiguracoes();
        } else {
            setLoading(false);
        }
        
        if (abaAtiva === 'usuarios') {
            loadUsuarios();
        }
        
        // Carregar logos quando a aba empresa for ativada e usuário for admin
        if (abaAtiva === 'empresa' && user?.role?.toLowerCase() === 'admin') {
            loadLogos();
            // Carregar logo atual se existir
            if (config?.logoUrl) {
                setLogoSelecionada(config.logoUrl);
                setLogoPreview(config.logoUrl);
            }
            // Carregar logo da página de login se existir
            if (config?.logoLoginUrl) {
                setLogoLoginSelecionada(config.logoLoginUrl);
                setLogoLoginPreview(config.logoLoginUrl);
            }
        }
    }, [abaAtiva, isEletricista, config?.logoUrl, user?.role]);

    const loadConfiguracoes = async () => {
        try {
            setLoading(true);
            const response = await configuracoesService.getConfiguracoes();
            
            if (response.success && response.data) {
                setConfig(response.data);
                setFormConfig({
                    nomeEmpresa: response.data.nomeEmpresa,
                    emailContato: response.data.emailContato || '',
                    telefoneContato: response.data.telefoneContato || ''
                });
                // NÃO aplicar tema ao carregar - deixar o tema atual do usuário
                // O tema é controlado apenas pelo botão na sidebar
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            toast.error('❌ Erro ao carregar configurações');
        } finally {
            setLoading(false);
        }
    };

    const loadUsuarios = async () => {
        try {
            setLoadingUsuarios(true);
            const response = await configuracoesService.listarUsuarios();
            
            if (response.success && response.data) {
                // Garantir que sempre seja um array
                const usuariosArray = Array.isArray(response.data) ? response.data : [];
                setUsuarios(usuariosArray);
            } else {
                setUsuarios([]);
            }
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            setUsuarios([]);
            toast.error('❌ Erro ao carregar usuários');
        } finally {
            setLoadingUsuarios(false);
        }
    };

    const loadLogos = async () => {
        try {
            setLoadingLogos(true);
            const response = await configuracoesService.listarLogos();
            
            if (response.success && response.data) {
                setLogosDisponiveis(Array.isArray(response.data) ? response.data : []);
            } else {
                setLogosDisponiveis([]);
            }
        } catch (error) {
            console.error('Erro ao carregar logos:', error);
            setLogosDisponiveis([]);
            toast.error('❌ Erro ao carregar logos disponíveis');
        } finally {
            setLoadingLogos(false);
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            // Criar preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleLogoLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoLoginFile(file);
            // Criar preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoLoginPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSalvarConfiguracoes = async () => {
        try {
            setSaving(true);
            
            // Se houver logo selecionada, atualizar primeiro
            if (logoSelecionada && user?.role?.toLowerCase() === 'admin') {
                await configuracoesService.atualizarLogo(logoSelecionada);
            }
            
            // Se houver logo da página de login selecionada, atualizar
            if (logoLoginSelecionada && user?.role?.toLowerCase() === 'admin') {
                await configuracoesService.atualizarLogoLogin(logoLoginSelecionada);
            }
            
            const response = await configuracoesService.salvarConfiguracoes(formConfig);
            
            if (response.success) {
                toast.success('✅ Configurações salvas com sucesso!');
                await loadConfiguracoes();
            } else {
                toast.error(`❌ ${response.error || 'Erro ao salvar configurações'}`);
            }
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            toast.error('❌ Erro ao salvar configurações');
        } finally {
            setSaving(false);
        }
    };

    const handleAtualizarLogoLogin = async (logoUrl: string) => {
        try {
            setSaving(true);
            const response = await configuracoesService.atualizarLogoLogin(logoUrl);
            
            if (response.success) {
                setLogoLoginSelecionada(logoUrl);
                setLogoLoginPreview(logoUrl);
                toast.success('✅ Logo da página de login atualizada com sucesso!');
                await loadConfiguracoes();
            } else {
                toast.error(`❌ ${response.error || 'Erro ao atualizar logo da página de login'}`);
            }
        } catch (error: any) {
            console.error('Erro ao atualizar logo da página de login:', error);
            toast.error('❌ Erro ao atualizar logo da página de login');
        } finally {
            setSaving(false);
        }
    };

    const handleAtualizarLogo = async (logoUrl: string) => {
        try {
            setSaving(true);
            const response = await configuracoesService.atualizarLogo(logoUrl);
            
            if (response.success) {
                setLogoSelecionada(logoUrl);
                setLogoPreview(logoUrl);
                
                // Salvar no localStorage para que todos os usuários vejam
                const fullLogoUrl = getUploadUrl(logoUrl);
                localStorage.setItem('companyLogo', fullLogoUrl);
                
                // Disparar evento customizado para atualizar outros componentes
                window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { logoUrl: fullLogoUrl } }));
                
                toast.success('✅ Logo atualizada com sucesso!');
                await loadConfiguracoes();
            } else {
                toast.error(`❌ ${response.error || 'Erro ao atualizar logo'}`);
            }
        } catch (error: any) {
            console.error('Erro ao atualizar logo:', error);
            toast.error(error?.response?.data?.error || '❌ Erro ao atualizar logo');
        } finally {
            setSaving(false);
        }
    };

    const handleAtualizarRole = async (userId: string, newRole: string) => {
        try {
            const response = await configuracoesService.atualizarUsuarioRole(userId, newRole);
            
            if (response.success) {
                toast.success('✅ Permissão atualizada com sucesso!');
                await loadUsuarios();
            } else {
                toast.error(`❌ ${response.error || 'Erro ao atualizar permissão'}`);
            }
        } catch (error) {
            console.error('Erro ao atualizar role:', error);
            toast.error('❌ Erro ao atualizar permissão');
        }
    };

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        try {
            const newStatus = !currentStatus;
            const response = await configuracoesService.toggleUsuarioStatus(userId, newStatus);
            
            if (response.success) {
                toast.success(`✅ Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso!`);
                await loadUsuarios();
            } else {
                toast.error(`❌ ${response.error || 'Erro ao alterar status'}`);
            }
        } catch (error) {
            console.error('Erro ao alterar status:', error);
            toast.error('❌ Erro ao alterar status do usuário');
        }
    };

    const handleOpenModalUsuario = () => {
        setNovoUsuario({
            email: '',
            password: '',
            name: '',
            role: 'user'
        });
        setIsModalUsuarioOpen(true);
    };

    const handleCloseModalUsuario = () => {
        setIsModalUsuarioOpen(false);
        setNovoUsuario({
            email: '',
            password: '',
            name: '',
            role: 'user'
        });
    };

    const handleCriarUsuario = async () => {
        try {
            // Validações
            if (!novoUsuario.email || !novoUsuario.password || !novoUsuario.name || !novoUsuario.role) {
                toast.error('❌ Todos os campos são obrigatórios');
                return;
            }

            if (novoUsuario.password.length < 6) {
                toast.error('❌ A senha deve ter pelo menos 6 caracteres');
                return;
            }

            setCreatingUser(true);
            const response = await configuracoesService.criarUsuario(novoUsuario);

            if (response.success) {
                toast.success('✅ Usuário criado com sucesso!');
                handleCloseModalUsuario();
                await loadUsuarios();
            } else {
                toast.error(`❌ ${response.error || 'Erro ao criar usuário'}`);
            }
        } catch (error) {
            console.error('❌ Erro ao criar usuário:', error);
            toast.error('❌ Erro ao criar usuário');
        } finally {
            setCreatingUser(false);
        }
    };

    const handleOpenModalEditar = (usuario: Usuario) => {
        // Verificar se o usuário tem permissão (gerente, admin ou desenvolvedor)
        const userRole = user?.role?.toLowerCase();
        const rolesPermitidos = ['gerente', 'admin', 'desenvolvedor'];
        
        if (!rolesPermitidos.includes(userRole || '')) {
            toast.error('🚫 Você não tem permissão para editar usuários');
            return;
        }
        
        setUsuarioParaEditar(usuario);
        setEditarUsuarioForm({
            email: usuario.email,
            name: usuario.name,
            senhaNova: ''
        });
        setIsModalEditarUsuarioOpen(true);
    };

    const handleCloseModalEditar = () => {
        setIsModalEditarUsuarioOpen(false);
        setUsuarioParaEditar(null);
        setEditarUsuarioForm({
            email: '',
            name: '',
            senhaNova: ''
        });
    };

    const handleSalvarEdicaoUsuario = async () => {
        if (!usuarioParaEditar) return;
        
        try {
            setSaving(true);
            
            const dadosAtualizacao: any = {};
            if (editarUsuarioForm.email !== usuarioParaEditar.email) {
                dadosAtualizacao.email = editarUsuarioForm.email;
            }
            if (editarUsuarioForm.name !== usuarioParaEditar.name) {
                dadosAtualizacao.name = editarUsuarioForm.name;
            }
            if (editarUsuarioForm.senhaNova && editarUsuarioForm.senhaNova.length >= 6) {
                dadosAtualizacao.senhaNova = editarUsuarioForm.senhaNova;
            }
            
            if (Object.keys(dadosAtualizacao).length === 0) {
                toast.info('Nenhuma alteração detectada');
                return;
            }
            
            const response = await configuracoesService.atualizarUsuario(usuarioParaEditar.id, dadosAtualizacao);
            
            if (response.success) {
                toast.success('✅ Usuário atualizado com sucesso!');
                handleCloseModalEditar();
                await loadUsuarios();
            } else {
                toast.error(`❌ ${response.error || 'Erro ao atualizar usuário'}`);
            }
        } catch (error: any) {
            console.error('Erro ao atualizar usuário:', error);
            toast.error(error?.response?.data?.error || '❌ Erro ao atualizar usuário');
        } finally {
            setSaving(false);
        }
    };

    const handleOpenModalExcluir = (usuario: Usuario) => {
        setUsuarioParaExcluir(usuario);
        setIsModalExcluirOpen(true);
    };

    const handleCloseModalExcluir = () => {
        setIsModalExcluirOpen(false);
        setUsuarioParaExcluir(null);
    };

    const handleExcluirUsuario = async () => {
        if (!usuarioParaExcluir) return;

        try {
            setExcluindoUsuario(true);
            const response = await configuracoesService.excluirUsuario(usuarioParaExcluir.id);

            if (response.success) {
                toast.success('✅ Usuário excluído com sucesso!');
                handleCloseModalExcluir();
                await loadUsuarios();
            } else {
                toast.error(`❌ ${response.error || 'Erro ao excluir usuário'}`);
            }
        } catch (error: any) {
            console.error('❌ Erro ao excluir usuário:', error);
            if (error.response?.data?.message) {
                toast.error(`❌ ${error.response.data.message}`);
            } else {
                toast.error('❌ Erro ao excluir usuário');
            }
        } finally {
            setExcluindoUsuario(false);
        }
    };

    const usuariosFiltrados = useMemo(() => {
        return usuarios.filter(u => {
            const matchesSearch = !searchUsuarios || 
                u.name.toLowerCase().includes(searchUsuarios.toLowerCase()) ||
                u.email.toLowerCase().includes(searchUsuarios.toLowerCase());
            
            const matchesRole = roleFilter === 'Todos' || u.role === roleFilter;
            
            return matchesSearch && matchesRole;
        });
    }, [usuarios, searchUsuarios, roleFilter]);

    const getRoleBadgeClass = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-800 ring-1 ring-purple-200';
            case 'gerente': return 'bg-blue-100 text-blue-800 ring-1 ring-blue-200';
            case 'orcamentista': return 'bg-green-100 text-green-800 ring-1 ring-green-200';
            case 'compras': return 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200';
            case 'engenheiro': return 'bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200';
            case 'eletricista': return 'bg-orange-100 text-orange-800 ring-1 ring-orange-200';
            default: return 'bg-gray-100 text-gray-800 ring-1 ring-gray-200';
        }
    };

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = {
            'admin': 'Administrador',
            'gerente': 'Gerente',
            'orcamentista': 'Orçamentista',
            'compras': 'Compras',
            'engenheiro': 'Engenheiro Elétrico',
            'eletricista': 'Eletricista',
            'user': 'Usuário'
        };
        return labels[role] || role;
    };

    // Função para atualizar perfil (nome e senha) - ADMIN e ELETRICISTA
    const handleAtualizarPerfil = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!perfilNome.trim()) {
            toast.error('Por favor, preencha seu nome');
            return;
        }
        
        // Se estiver alterando senha, validar
        if (perfilSenhaNova) {
            if (!perfilSenhaAtual) {
                toast.error('Por favor, informe sua senha atual');
                return;
            }
            if (perfilSenhaNova.length < 6) {
                toast.error('A nova senha deve ter pelo menos 6 caracteres');
                return;
            }
            if (perfilSenhaNova !== perfilSenhaConfirma) {
                toast.error('As senhas não coincidem');
                return;
            }
        }
        
        try {
            setSaving(true);
            
            const dadosAtualizacao: any = {
                name: perfilNome
            };
            
            if (perfilSenhaNova) {
                dadosAtualizacao.senhaAtual = perfilSenhaAtual;
                dadosAtualizacao.senhaNova = perfilSenhaNova;
            }
            
            const response = await configuracoesService.atualizarPerfil(user!.id, dadosAtualizacao);
            
            if (response.success) {
                toast.success('✅ Dados atualizados com sucesso!');
                // Limpar campos de senha
                setPerfilSenhaAtual('');
                setPerfilSenhaNova('');
                setPerfilSenhaConfirma('');
                
                // Atualizar contexto se necessário
                if (authContext?.updateUser) {
                    authContext.updateUser({ ...user!, name: perfilNome });
                }
            }
        } catch (error: any) {
            console.error('Erro ao atualizar perfil:', error);
            toast.error(error?.response?.data?.error || 'Erro ao atualizar dados');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Carregando configurações...</p>
                </div>
            </div>
        );
    }

    // Versão simplificada para ELETRICISTA
    if (isEletricista) {
        return (
            <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
                {/* Header */}
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-white dark:hover:bg-dark-card hover:shadow-md transition-all">
                            <Bars3Icon className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">⚙️ Meu Perfil</h1>
                            <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">Atualize seus dados pessoais</p>
                        </div>
                    </div>
                </header>

                {/* Card de Perfil do Eletricista */}
                <div className="max-w-2xl mx-auto">
                    <div className="card-primary rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border p-8">
                        {/* Info do Usuário */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-blue-600 dark:bg-blue-700 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                                    {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'EL'}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text">{user?.name}</h3>
                                    <p className="text-sm text-blue-700 dark:text-blue-400 font-semibold">⚡ Eletricista</p>
                                    <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
                                        Email: <span className="font-mono">{user?.email}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Formulário */}
                        <form onSubmit={handleAtualizarPerfil} className="space-y-6">
                            {/* Nome */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                    Nome Completo *
                                </label>
                                <input
                                    type="text"
                                    value={perfilNome}
                                    onChange={(e) => setPerfilNome(e.target.value)}
                                    className="input-field"
                                    placeholder="Seu nome completo"
                                    required
                                />
                            </div>

                            {/* Email (readonly) */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                    Email (não pode ser alterado)
                                </label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="input-field opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-800"
                                />
                                <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                    ℹ️ O email é seu identificador único no sistema
                                </p>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-gray-200 dark:border-dark-border pt-6">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-4">🔒 Alterar Senha</h3>
                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                                    Deixe em branco se não quiser alterar a senha
                                </p>
                            </div>

                            {/* Senha Atual */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                    Senha Atual
                                </label>
                                <input
                                    type="password"
                                    value={perfilSenhaAtual}
                                    onChange={(e) => setPerfilSenhaAtual(e.target.value)}
                                    className="input-field"
                                    placeholder="Digite sua senha atual"
                                />
                            </div>

                            {/* Nova Senha */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                    Nova Senha
                                </label>
                                <input
                                    type="password"
                                    value={perfilSenhaNova}
                                    onChange={(e) => setPerfilSenhaNova(e.target.value)}
                                    className="input-field"
                                    placeholder="Digite a nova senha (mínimo 6 caracteres)"
                                    minLength={6}
                                />
                            </div>

                            {/* Confirmar Nova Senha */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                    Confirmar Nova Senha
                                </label>
                                <input
                                    type="password"
                                    value={perfilSenhaConfirma}
                                    onChange={(e) => setPerfilSenhaConfirma(e.target.value)}
                                    className="input-field"
                                    placeholder="Confirme a nova senha"
                                />
                            </div>

                            {/* Botões */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPerfilNome(user?.name || '');
                                        setPerfilSenhaAtual('');
                                        setPerfilSenhaNova('');
                                        setPerfilSenhaConfirma('');
                                    }}
                                    className="btn-secondary flex-1"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <CheckIcon className="w-5 h-5" />
                                            Salvar Alterações
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        {/* Informações Adicionais */}
                        <div className="mt-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <span className="text-orange-600 dark:text-orange-400 text-xl">⚠️</span>
                                <div>
                                    <p className="text-sm font-semibold text-orange-900 dark:text-orange-300">Segurança</p>
                                    <p className="text-xs text-orange-800 dark:text-orange-400 mt-1">
                                        Use uma senha forte com pelo menos 6 caracteres. Não compartilhe sua senha com outras pessoas.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-white dark:hover:bg-dark-card hover:shadow-md transition-all">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">Configurações</h1>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">Personalize o sistema e gerencie usuários</p>
                    </div>
                </div>
            </header>

            {/* Navegação por Tabs */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-md border border-gray-200 dark:border-dark-border mb-6">
                <div className="flex border-b border-gray-200 dark:border-dark-border">
                    <button
                        onClick={() => setAbaAtiva('perfil')}
                        className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${
                            abaAtiva === 'perfil'
                                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-bg'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Meu Perfil
                    </button>
                    <button
                        onClick={() => setAbaAtiva('usuarios')}
                        className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${
                            abaAtiva === 'usuarios'
                                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-bg'
                        }`}
                    >
                        <UsersIcon className="w-5 h-5" />
                        Gerenciamento de Usuários
                    </button>
                    <button
                        onClick={() => setAbaAtiva('empresa')}
                        className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${
                            abaAtiva === 'empresa'
                                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-bg'
                        }`}
                    >
                        <BuildingOfficeIcon className="w-5 h-5" />
                        Informações da Empresa
                    </button>
                    <button
                        onClick={() => setAbaAtiva('fiscal')}
                        className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${
                            abaAtiva === 'fiscal'
                                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-bg'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Config. Fiscal NF-e
                    </button>
                </div>

                {/* Conteúdo das Abas */}
                <div className="p-8">
                    {/* ABA 1: MEU PERFIL (ALTERAR NOME E SENHA) */}
                    {abaAtiva === 'perfil' && (
                        <div className="space-y-8 animate-fade-in">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">Meu Perfil</h2>
                                <p className="text-gray-600 dark:text-dark-text-secondary">Atualize suas informações pessoais e senha</p>
                            </div>

                            {/* Info do Usuário */}
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-6 mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-indigo-600 dark:bg-indigo-700 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                                        {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'AD'}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text">{user?.name}</h3>
                                        <p className="text-sm text-indigo-700 dark:text-indigo-400 font-semibold">
                                            {user?.role === 'admin' && '👑 Administrador'}
                                            {user?.role === 'gerente' && '📊 Gerente'}
                                            {user?.role === 'desenvolvedor' && '💻 Desenvolvedor'}
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
                                            Email: <span className="font-mono">{user?.email}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Formulário de Atualização */}
                            <form onSubmit={handleAtualizarPerfil} className="space-y-6">
                                {/* Nome */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Nome Completo *
                                    </label>
                                    <input
                                        type="text"
                                        value={perfilNome}
                                        onChange={(e) => setPerfilNome(e.target.value)}
                                        className="input-field"
                                        placeholder="Seu nome completo"
                                        required
                                    />
                                </div>

                                {/* Email (readonly) */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Email (não pode ser alterado)
                                    </label>
                                    <input
                                        type="email"
                                        value={user?.email || ''}
                                        disabled
                                        className="input-field opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-800"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                        ℹ️ O email é seu identificador único no sistema
                                    </p>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-gray-200 dark:border-dark-border pt-6">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-4">🔒 Alterar Senha</h3>
                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                                        Deixe em branco se não quiser alterar a senha
                                    </p>
                                </div>

                                {/* Senha Atual */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Senha Atual
                                    </label>
                                    <input
                                        type="password"
                                        value={perfilSenhaAtual}
                                        onChange={(e) => setPerfilSenhaAtual(e.target.value)}
                                        className="input-field"
                                        placeholder="Digite sua senha atual"
                                    />
                                </div>

                                {/* Nova Senha */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Nova Senha
                                    </label>
                                    <input
                                        type="password"
                                        value={perfilSenhaNova}
                                        onChange={(e) => setPerfilSenhaNova(e.target.value)}
                                        className="input-field"
                                        placeholder="Digite a nova senha (mínimo 6 caracteres)"
                                        minLength={6}
                                    />
                                </div>

                                {/* Confirmar Nova Senha */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Confirmar Nova Senha
                                    </label>
                                    <input
                                        type="password"
                                        value={perfilSenhaConfirma}
                                        onChange={(e) => setPerfilSenhaConfirma(e.target.value)}
                                        className="input-field"
                                        placeholder="Confirme a nova senha"
                                    />
                                </div>

                                {/* Botões */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPerfilNome(user?.name || '');
                                            setPerfilSenhaAtual('');
                                            setPerfilSenhaNova('');
                                            setPerfilSenhaConfirma('');
                                        }}
                                        className="btn-secondary flex-1"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                                    >
                                        {saving ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Salvando...
                                            </>
                                        ) : (
                                            <>
                                                <CheckIcon className="w-5 h-5" />
                                                Salvar Alterações
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>

                            {/* Alerta de Tema */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mt-6">
                                <div className="flex items-start gap-3">
                                    <span className="text-blue-600 dark:text-blue-400 text-xl">💡</span>
                                    <div>
                                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Alteração de Tema</p>
                                        <p className="text-xs text-blue-800 dark:text-blue-400 mt-1">
                                            Para alterar entre tema claro e escuro, use o botão de sol/lua na sidebar inferior. A alteração é aplicada instantaneamente.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ABA 2: GERENCIAMENTO DE USUÁRIOS */}
                    {abaAtiva === 'usuarios' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Gerenciamento de Usuários</h2>
                                    <p className="text-gray-600">Gerencie permissões e acessos dos usuários do sistema</p>
                                </div>
                                <button
                                    onClick={handleOpenModalUsuario}
                                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-600 transition-all shadow-lg font-semibold flex items-center gap-2"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    Criar Novo Usuário
                                </button>
                            </div>

                            {/* Filtros */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nome ou email..."
                                        value={searchUsuarios}
                                        onChange={(e) => setSearchUsuarios(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text"
                                >
                                    <option value="Todos">Todas as Funções</option>
                                    <option value="admin">Administrador</option>
                                    <option value="gerente">Gerente</option>
                                    <option value="engenheiro">Engenheiro Elétrico</option>
                                    <option value="orcamentista">Orçamentista</option>
                                    <option value="compras">Compras</option>
                                    <option value="eletricista">Eletricista</option>
                                    <option value="user">Usuário</option>
                                </select>
                            </div>

                            {/* Tabela de Usuários */}
                            {loadingUsuarios ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600">Carregando usuários...</p>
                                </div>
                            ) : usuariosFiltrados.length === 0 ? (
                                <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-16 text-center">
                                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <UsersIcon className="w-10 h-10 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">Nenhum usuário encontrado</h3>
                                    <p className="text-gray-500">
                                        {searchUsuarios || roleFilter !== 'Todos'
                                            ? 'Tente ajustar os filtros de busca'
                                            : 'Nenhum usuário cadastrado no sistema'}
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Usuário</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Email</th>
                                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Função</th>
                                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {usuariosFiltrados.map((usuario) => (
                                                    <tr key={usuario.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="font-semibold text-gray-900">{usuario.name}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-600">{usuario.email}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                                            <select
                                                                value={usuario.role}
                                                                onChange={(e) => handleAtualizarRole(usuario.id, e.target.value)}
                                                                className={`px-3 py-1.5 text-xs font-bold rounded-lg ${getRoleBadgeClass(usuario.role)} border-0 cursor-pointer`}
                                                            >
                                                                <option value="admin">Administrador</option>
                                                                <option value="gerente">Gerente</option>
                                                                <option value="engenheiro">Engenheiro Elétrico</option>
                                                                <option value="orcamentista">Orçamentista</option>
                                                                <option value="compras">Compras</option>
                                                                <option value="eletricista">Eletricista</option>
                                                                <option value="user">Usuário</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                                            <button
                                                                onClick={() => handleToggleStatus(usuario.id, usuario.active)}
                                                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                                                                    usuario.active
                                                                        ? 'bg-green-100 text-green-800 ring-1 ring-green-200 hover:bg-green-200'
                                                                        : 'bg-red-100 text-red-800 ring-1 ring-red-200 hover:bg-red-200'
                                                                }`}
                                                            >
                                                                {usuario.active ? '✅ Ativo' : '❌ Inativo'}
                                                            </button>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {/* Botão Editar - Apenas para gerente, admin e desenvolvedor */}
                                                                {(user?.role?.toLowerCase() === 'gerente' || 
                                                                  user?.role?.toLowerCase() === 'admin' || 
                                                                  user?.role?.toLowerCase() === 'desenvolvedor') && (
                                                                    <button
                                                                        onClick={() => handleOpenModalEditar(usuario)}
                                                                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-100 text-blue-800 ring-1 ring-blue-200 hover:bg-blue-200 transition-colors"
                                                                        title="Editar usuário"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                        </svg>
                                                                        Editar
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleOpenModalExcluir(usuario)}
                                                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-100 text-red-800 ring-1 ring-red-200 hover:bg-red-200 transition-colors"
                                                                    title="Excluir usuário"
                                                                >
                                                                    <TrashIcon className="w-4 h-4" />
                                                                    Excluir
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    {/* Contador */}
                                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                                        <p className="text-sm text-gray-600">
                                            Exibindo <span className="font-bold text-gray-900">{usuariosFiltrados.length}</span> de <span className="font-bold text-gray-900">{usuarios.length}</span> usuários
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ABA 3: CONFIGURAÇÃO FISCAL NF-E */}
                    {abaAtiva === 'fiscal' && (
                        <div className="space-y-8 animate-fade-in">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">Configuração Fiscal para NF-e</h2>
                                <p className="text-gray-600 dark:text-dark-text-secondary">Configure certificado digital e ambiente de emissão</p>
                            </div>

                            {/* Ambiente Fiscal */}
                            <div className="bg-gray-50 dark:bg-dark-bg p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                                <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-4">
                                    Ambiente de Emissão
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setAmbienteFiscal('2')}
                                        className={`relative flex flex-col items-center p-6 rounded-xl border-2 transition-all ${
                                            ambienteFiscal === '2'
                                                ? 'border-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 ring-2 ring-yellow-200 dark:ring-yellow-800'
                                                : 'border-gray-300 dark:border-dark-border hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-dark-card'
                                        }`}
                                    >
                                        {ambienteFiscal === '2' && (
                                            <div className="absolute top-2 right-2">
                                                <CheckIcon className="w-5 h-5 text-yellow-600" />
                                            </div>
                                        )}
                                        <div className="w-16 h-16 mb-3 bg-yellow-100 dark:bg-yellow-900/40 rounded-full flex items-center justify-center shadow-md">
                                            <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                        </div>
                                        <span className="font-bold text-gray-900 dark:text-dark-text">Homologação</span>
                                        <span className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">Ambiente de testes</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setAmbienteFiscal('1')}
                                        className={`relative flex flex-col items-center p-6 rounded-xl border-2 transition-all ${
                                            ambienteFiscal === '1'
                                                ? 'border-green-600 bg-green-50 dark:bg-green-900/30 ring-2 ring-green-200 dark:ring-green-800'
                                                : 'border-gray-300 dark:border-dark-border hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-dark-card'
                                        }`}
                                    >
                                        {ambienteFiscal === '1' && (
                                            <div className="absolute top-2 right-2">
                                                <CheckIcon className="w-5 h-5 text-green-600" />
                                            </div>
                                        )}
                                        <div className="w-16 h-16 mb-3 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center shadow-md">
                                            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <span className="font-bold text-gray-900 dark:text-dark-text">Produção</span>
                                        <span className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">Ambiente oficial</span>
                                    </button>
                                </div>
                                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-400">
                                        <strong>⚠️ Atenção:</strong> Use "Homologação" para testes. Apenas mude para "Produção" quando estiver pronto para emitir NF-es oficiais.
                                    </p>
                                </div>
                            </div>

                            {/* Certificado Digital PFX */}
                            <div className="bg-gray-50 dark:bg-dark-bg p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                                <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-3">
                                    Certificado Digital A1 (.pfx ou .p12)
                                </label>
                                <div className="space-y-4">
                                    {/* Upload de Certificado */}
                                    <div>
                                        <input
                                            type="file"
                                            id="pfx-upload"
                                            accept=".pfx,.p12"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setCertificadoPFXFile(file);
                                                }
                                            }}
                                            className="hidden"
                                        />
                                        <label
                                            htmlFor="pfx-upload"
                                            className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-dark-border rounded-xl hover:border-indigo-500 cursor-pointer transition-colors bg-white dark:bg-dark-card"
                                        >
                                            <div className="text-center">
                                                <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <p className="text-sm font-medium text-gray-700 dark:text-dark-text">
                                                    {certificadoPFXFile ? certificadoPFXFile.name : 'Clique para selecionar certificado PFX'}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                                    Formato: .pfx ou .p12 (máx. 5MB)
                                                </p>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Senha do Certificado */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">
                                            Senha do Certificado
                                        </label>
                                        <input
                                            type="password"
                                            value={senhaCertificado}
                                            onChange={(e) => setSenhaCertificado(e.target.value)}
                                            placeholder="Digite a senha do certificado"
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text"
                                        />
                                    </div>

                                    {/* Informação de Segurança */}
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                        <h4 className="font-bold text-blue-800 dark:text-blue-400 mb-2 text-sm">🔒 Segurança do Certificado</h4>
                                        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                            <li>• O certificado será armazenado de forma segura no servidor</li>
                                            <li>• A senha será criptografada antes do armazenamento</li>
                                            <li>• Apenas administradores podem gerenciar certificados</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Botão de Salvar */}
                            <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-dark-border">
                                <button
                                    onClick={handleSalvarConfiguracoes}
                                    disabled={saving}
                                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-600 transition-all shadow-lg font-semibold disabled:opacity-50"
                                >
                                    {saving ? 'Salvando...' : 'Salvar Configurações Fiscais'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ABA 4: INFORMAÇÕES DA EMPRESA */}
                    {abaAtiva === 'empresa' && (
                        <div className="space-y-8 animate-fade-in">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Informações da Empresa</h2>
                                <p className="text-gray-600">Dados básicos de contato e identificação</p>
                            </div>

                            {/* Logo da Empresa - Apenas Admin */}
                            {user?.role?.toLowerCase() === 'admin' && (
                                <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Logo da Empresa</h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Selecione uma logo da pasta de uploads ou faça upload de uma nova. A logo será exibida para todos os usuários.
                                    </p>
                                    
                                    {/* Preview da Logo Atual */}
                                    {logoPreview && (
                                        <div className="mb-4">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Logo Atual:</label>
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <img 
                                                        src={getUploadUrl(logoPreview)} 
                                                        alt="Logo da empresa" 
                                                        className="h-20 w-auto object-contain border border-gray-200 dark:border-dark-border rounded-lg p-2 bg-gray-50 dark:bg-dark-bg"
                                                        crossOrigin="anonymous"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            const originalSrc = target.src;
                                                            console.error('❌ Erro ao carregar logo:', originalSrc);
                                                            
                                                            // Tentar URL alternativa usando endpoint específico
                                                            const filename = logoPreview.split('/').pop() || logoPreview;
                                                            // ✅ CORREÇÃO: Garantir que sempre usa porta 3001 (backend)
                                                            const baseUrl = getBackendUrl();
                                                            const alternativeUrl = baseUrl 
                                                                ? `${baseUrl}/api/configuracoes/logo/${filename}`
                                                                : `/api/configuracoes/logo/${filename}`;
                                                            
                                                            if (!target.src.includes('/api/configuracoes/logo/')) {
                                                                console.log('🔄 Tentando URL alternativa:', alternativeUrl);
                                                                target.src = alternativeUrl;
                                                            } else {
                                                                // Se ainda falhar, mostrar placeholder
                                                                console.error('❌ Falha ao carregar logo mesmo com URL alternativa');
                                                                target.style.display = 'none';
                                                                const placeholder = target.nextElementSibling as HTMLElement;
                                                                if (placeholder) placeholder.style.display = 'flex';
                                                            }
                                                        }}
                                                        onLoad={() => {
                                                            console.log('✅ Logo carregada com sucesso:', getUploadUrl(logoPreview));
                                                            // Esconder placeholder quando imagem carregar
                                                            const placeholder = document.querySelector(`[data-logo-placeholder="${logoPreview}"]`) as HTMLElement;
                                                            if (placeholder) placeholder.style.display = 'none';
                                                        }}
                                                    />
                                                    <div 
                                                        data-logo-placeholder={logoPreview}
                                                        className="h-20 w-20 flex items-center justify-center border border-gray-200 dark:border-dark-border rounded-lg p-2 bg-gray-50 dark:bg-dark-bg text-gray-400 text-xs text-center"
                                                        style={{ display: 'none' }}
                                                    >
                                                        Erro ao carregar imagem
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Logo selecionada</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 break-all max-w-xs">{logoSelecionada}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Seleção de Logo Existente */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Selecionar Logo Existente:
                                        </label>
                                        {loadingLogos ? (
                                            <div className="text-center py-4">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                                <p className="text-sm text-gray-500 mt-2">Carregando logos...</p>
                                            </div>
                                        ) : logosDisponiveis.length === 0 ? (
                                            <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                                <p className="text-sm text-gray-500">Nenhuma logo encontrada na pasta uploads/logos</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-64 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
                                                {logosDisponiveis.map((logo) => (
                                                    <div
                                                        key={logo.filename}
                                                        className="relative"
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setLogoSelecionada(logo.url);
                                                                setLogoPreview(logo.url);
                                                                handleAtualizarLogo(logo.url);
                                                            }}
                                                            className={`relative w-full p-2 border-2 rounded-lg transition-all ${
                                                                logoSelecionada === logo.url
                                                                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                                                                    : 'border-gray-200 hover:border-indigo-300 bg-white'
                                                            }`}
                                                        >
                                                            <img 
                                                                src={getUploadUrl(logo.url)}
                                                                alt={logo.filename}
                                                                className="w-full h-16 object-contain"
                                                                crossOrigin="anonymous"
                                                                onError={(e) => {
                                                                    const target = e.target as HTMLImageElement;
                                                                    const originalSrc = target.src;
                                                                    console.error('❌ Erro ao carregar logo na lista:', originalSrc);
                                                                    
                                                                    // Tentar endpoint específico
                                                                    const filename = logo.url.split('/').pop() || logo.filename;
                                                                    // ✅ CORREÇÃO: Garantir que sempre usa porta 3001 (backend)
                                                                    const baseUrl = getBackendUrl();
                                                                    const alternativeUrl = baseUrl 
                                                                        ? `${baseUrl}/api/configuracoes/logo/${filename}`
                                                                        : `/api/configuracoes/logo/${filename}`;
                                                                    
                                                                    if (!target.src.includes('/api/configuracoes/logo/')) {
                                                                        console.log('🔄 Tentando URL alternativa na lista:', alternativeUrl);
                                                                        target.src = alternativeUrl;
                                                                    }
                                                                }}
                                                            />
                                                            {logoSelecionada === logo.url && (
                                                                <div className="absolute top-1 right-1 bg-indigo-500 text-white rounded-full p-1">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                        </button>
                                                        {/* Botão de Excluir */}
                                                        <button
                                                            type="button"
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (window.confirm(`Tem certeza que deseja excluir a logo "${logo.filename}"?`)) {
                                                                    try {
                                                                        setSaving(true);
                                                                        const response = await configuracoesService.deletarLogo(logo.filename);
                                                                        if (response.success) {
                                                                            toast.success('✅ Logo excluída com sucesso!');
                                                                            // Remover da lista
                                                                            setLogosDisponiveis(logosDisponiveis.filter(l => l.filename !== logo.filename));
                                                                            // Se a logo excluída estava selecionada, limpar seleção
                                                                            if (logoSelecionada === logo.url) {
                                                                                setLogoSelecionada('');
                                                                                setLogoPreview('');
                                                                            }
                                                                            if (logoLoginSelecionada === logo.url) {
                                                                                setLogoLoginSelecionada('');
                                                                                setLogoLoginPreview('');
                                                                            }
                                                                        } else {
                                                                            toast.error(`❌ ${response.error || 'Erro ao excluir logo'}`);
                                                                        }
                                                                    } catch (error: any) {
                                                                        console.error('Erro ao excluir logo:', error);
                                                                        toast.error('❌ Erro ao excluir logo');
                                                                    } finally {
                                                                        setSaving(false);
                                                                    }
                                                                }
                                                            }}
                                                            disabled={saving}
                                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="Excluir logo"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Upload de Nova Logo */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Ou fazer upload de nova logo:
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                                        />
                                        {logoFile && (
                                            <div className="mt-2">
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        try {
                                                            setSaving(true);
                                                            const response = await configuracoesService.uploadLogo(logoFile);
                                                            if (response.success && response.data) {
                                                                const logoUrl = response.data.logoUrl;
                                                                setLogoSelecionada(logoUrl);
                                                                setLogoPreview(logoUrl);
                                                                
                                                                // Salvar no localStorage para que todos os usuários vejam
                                                                const fullLogoUrl = getUploadUrl(logoUrl);
                                                                localStorage.setItem('companyLogo', fullLogoUrl);
                                                                
                                                                // Disparar evento customizado para atualizar outros componentes
                                                                window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { logoUrl: fullLogoUrl } }));
                                                                
                                                                toast.success('✅ Logo enviada com sucesso!');
                                                                await loadLogos();
                                                                await loadConfiguracoes();
                                                            }
                                                        } catch (error: any) {
                                                            toast.error(error?.response?.data?.error || '❌ Erro ao enviar logo');
                                                        } finally {
                                                            setSaving(false);
                                                        }
                                                    }}
                                                    disabled={saving}
                                                    className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                                >
                                                    {saving ? 'Enviando...' : 'Enviar Logo'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Logo da Página de Login - Apenas Admin */}
                            {user?.role?.toLowerCase() === 'admin' && (
                                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-md border border-gray-200 dark:border-dark-border p-6">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-4">Logo da Página de Login</h3>
                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                                        Selecione uma logo específica para aparecer na página de login. Se nenhuma logo for selecionada, será exibido o texto "S3E ENGENHARIA" como fallback.
                                    </p>
                                    
                                    {/* Preview da Logo Atual */}
                                    {logoLoginPreview && (
                                        <div className="mb-4">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Logo Atual da Página de Login:</label>
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <img 
                                                        src={getUploadUrl(logoLoginPreview)} 
                                                        alt="Logo da página de login" 
                                                        className="h-20 w-auto object-contain border border-gray-200 dark:border-dark-border rounded-lg p-2 bg-gray-50 dark:bg-dark-bg"
                                                        crossOrigin="anonymous"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            const filename = logoLoginPreview.split('/').pop() || logoLoginPreview;
                                                            // ✅ CORREÇÃO: Garantir que sempre usa porta 3001 (backend)
                                                            const baseUrl = getBackendUrl();
                                                            const alternativeUrl = `${baseUrl}/api/configuracoes/logo/${filename}`;
                                                            if (target.src !== alternativeUrl) {
                                                                target.src = alternativeUrl;
                                                            } else {
                                                                target.style.display = 'none';
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Logo selecionada</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 break-all max-w-xs">{logoLoginSelecionada}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Seleção de Logo Existente */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                            Selecionar Logo Existente:
                                        </label>
                                        {loadingLogos ? (
                                            <div className="text-center py-4">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                                <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-2">Carregando logos...</p>
                                            </div>
                                        ) : logosDisponiveis.length === 0 ? (
                                            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Nenhuma logo disponível. Faça upload de uma nova logo.</p>
                                        ) : (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-64 overflow-y-auto">
                                                {logosDisponiveis.map((logo) => (
                                                    <div
                                                        key={logo.filename}
                                                        className="relative"
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setLogoLoginPreview(logo.url);
                                                                handleAtualizarLogoLogin(logo.url);
                                                            }}
                                                            className={`relative w-full p-2 border-2 rounded-lg transition-all ${
                                                                logoLoginSelecionada === logo.url
                                                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-200 dark:ring-indigo-800'
                                                                    : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600'
                                                            }`}
                                                        >
                                                            <img 
                                                                src={getUploadUrl(logo.url)}
                                                                alt={logo.filename}
                                                                className="w-full h-16 object-contain"
                                                                onError={(e) => {
                                                                    const target = e.target as HTMLImageElement;
                                                                    const filename = logo.url.split('/').pop() || logo.url;
                                                                    // ✅ CORREÇÃO: Garantir que sempre usa porta 3001 (backend)
                                                                    const baseUrl = getBackendUrl();
                                                                    target.src = `${baseUrl}/api/configuracoes/logo/${filename}`;
                                                                }}
                                                            />
                                                            {logoLoginSelecionada === logo.url && (
                                                                <div className="absolute top-1 right-1 bg-indigo-500 text-white rounded-full p-1">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                        </button>
                                                        {/* Botão de Excluir */}
                                                        <button
                                                            type="button"
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (window.confirm(`Tem certeza que deseja excluir a logo "${logo.filename}"?`)) {
                                                                    try {
                                                                        setSaving(true);
                                                                        const response = await configuracoesService.deletarLogo(logo.filename);
                                                                        if (response.success) {
                                                                            toast.success('✅ Logo excluída com sucesso!');
                                                                            // Remover da lista
                                                                            setLogosDisponiveis(logosDisponiveis.filter(l => l.filename !== logo.filename));
                                                                            // Se a logo excluída estava selecionada, limpar seleção
                                                                            if (logoSelecionada === logo.url) {
                                                                                setLogoSelecionada('');
                                                                                setLogoPreview('');
                                                                            }
                                                                            if (logoLoginSelecionada === logo.url) {
                                                                                setLogoLoginSelecionada('');
                                                                                setLogoLoginPreview('');
                                                                            }
                                                                        } else {
                                                                            toast.error(`❌ ${response.error || 'Erro ao excluir logo'}`);
                                                                        }
                                                                    } catch (error: any) {
                                                                        console.error('Erro ao excluir logo:', error);
                                                                        toast.error('❌ Erro ao excluir logo');
                                                                    } finally {
                                                                        setSaving(false);
                                                                    }
                                                                }
                                                            }}
                                                            disabled={saving}
                                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="Excluir logo"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Upload de Nova Logo */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                            Ou fazer upload de nova logo:
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoLoginChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text"
                                        />
                                        {logoLoginFile && (
                                            <div className="mt-2">
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        try {
                                                            setSaving(true);
                                                            const response = await configuracoesService.uploadLogo(logoLoginFile);
                                                            if (response.success && response.data) {
                                                                const logoUrl = response.data.logoUrl;
                                                                setLogoLoginSelecionada(logoUrl);
                                                                setLogoLoginPreview(logoUrl);
                                                                await handleAtualizarLogoLogin(logoUrl);
                                                                await loadLogos();
                                                                await loadConfiguracoes();
                                                            }
                                                        } catch (error: any) {
                                                            toast.error(error?.response?.data?.error || '❌ Erro ao enviar logo');
                                                        } finally {
                                                            setSaving(false);
                                                        }
                                                    }}
                                                    disabled={saving}
                                                    className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                                >
                                                    {saving ? 'Enviando...' : 'Enviar Logo'}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Botão para Remover Logo */}
                                    {logoLoginSelecionada && (
                                        <div className="mt-4">
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        setSaving(true);
                                                        const response = await configuracoesService.atualizarLogoLogin('');
                                                        if (response.success) {
                                                            setLogoLoginSelecionada('');
                                                            setLogoLoginPreview('');
                                                            toast.success('✅ Logo da página de login removida. O fallback será exibido.');
                                                            await loadConfiguracoes();
                                                        }
                                                    } catch (error: any) {
                                                        toast.error('❌ Erro ao remover logo');
                                                    } finally {
                                                        setSaving(false);
                                                    }
                                                }}
                                                disabled={saving}
                                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 text-sm font-semibold"
                                            >
                                                Remover Logo (Usar Fallback)
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Nome da Empresa *
                                    </label>
                                    <input
                                        type="text"
                                        value={formConfig.nomeEmpresa}
                                        onChange={(e) => setFormConfig({...formConfig, nomeEmpresa: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                                        placeholder="S3E Engenharia"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Email de Contato
                                    </label>
                                    <input
                                        type="email"
                                        value={formConfig.emailContato}
                                        onChange={(e) => setFormConfig({...formConfig, emailContato: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                                        placeholder="contato@s3e.com.br"
                                    />
                                </div>

                                <div className="lg:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Telefone de Contato
                                    </label>
                                    <input
                                        type="tel"
                                        value={formConfig.telefoneContato}
                                        onChange={(e) => setFormConfig({...formConfig, telefoneContato: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                                        placeholder="(11) 98765-4321"
                                    />
                                </div>
                            </div>

                            {/* Botão de Salvar */}
                            <div className="flex justify-end pt-6 border-t border-gray-200">
                                <button
                                    onClick={handleSalvarConfiguracoes}
                                    disabled={saving}
                                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-600 transition-all shadow-lg font-semibold disabled:opacity-50"
                                >
                                    {saving ? 'Salvando...' : 'Salvar Informações'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL DE CRIAR USUÁRIO */}
            {isModalUsuarioOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b border-gray-200">
                            <h3 className="text-2xl font-bold text-gray-900">Criar Novo Usuário</h3>
                            <button
                                onClick={handleCloseModalUsuario}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <XMarkIcon className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            {/* Nome */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Nome Completo *
                                </label>
                                <input
                                    type="text"
                                    value={novoUsuario.name}
                                    onChange={(e) => setNovoUsuario({...novoUsuario, name: e.target.value})}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                                    placeholder="João da Silva"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={novoUsuario.email}
                                    onChange={(e) => setNovoUsuario({...novoUsuario, email: e.target.value})}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                                    placeholder="joao@s3e.com"
                                />
                            </div>

                            {/* Senha */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Senha *
                                </label>
                                <input
                                    type="password"
                                    value={novoUsuario.password}
                                    onChange={(e) => setNovoUsuario({...novoUsuario, password: e.target.value})}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                                    placeholder="••••••••"
                                />
                                <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
                            </div>

                            {/* Role */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Função/Nível de Acesso *
                                </label>
                                <select
                                    value={novoUsuario.role}
                                    onChange={(e) => setNovoUsuario({...novoUsuario, role: e.target.value})}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text"
                                >
                                    <option value="user">Usuário</option>
                                    <option value="eletricista">Eletricista</option>
                                    <option value="compras">Compras</option>
                                    <option value="orcamentista">Orçamentista</option>
                                    <option value="engenheiro">Engenheiro Elétrico</option>
                                    <option value="gerente">Gerente</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 p-6 border-t border-gray-200">
                            <button
                                onClick={handleCloseModalUsuario}
                                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCriarUsuario}
                                disabled={creatingUser}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-600 transition-all shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {creatingUser ? (
                                    <>
                                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Criando...
                                    </>
                                ) : (
                                    <>
                                        <CheckIcon className="w-5 h-5 inline mr-2" />
                                        Criar Usuário
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE EDITAR USUÁRIO */}
            {isModalEditarUsuarioOpen && usuarioParaEditar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b border-gray-200">
                            <h3 className="text-2xl font-bold text-gray-900">Editar Usuário</h3>
                            <button
                                onClick={handleCloseModalEditar}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <XMarkIcon className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            {/* Nome */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Nome Completo *
                                </label>
                                <input
                                    type="text"
                                    value={editarUsuarioForm.name}
                                    onChange={(e) => setEditarUsuarioForm({...editarUsuarioForm, name: e.target.value})}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                                    placeholder="João da Silva"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={editarUsuarioForm.email}
                                    onChange={(e) => setEditarUsuarioForm({...editarUsuarioForm, email: e.target.value})}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                                    placeholder="joao@s3e.com"
                                />
                            </div>

                            {/* Nova Senha */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Nova Senha
                                </label>
                                <input
                                    type="password"
                                    value={editarUsuarioForm.senhaNova}
                                    onChange={(e) => setEditarUsuarioForm({...editarUsuarioForm, senhaNova: e.target.value})}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Deixe em branco para não alterar (mínimo 6 caracteres)"
                                    minLength={6}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Deixe em branco se não quiser alterar a senha
                                </p>
                            </div>

                            {/* Informação */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-xs text-blue-800">
                                    💡 <strong>Nota:</strong> Apenas gerente, admin e desenvolvedor podem editar usuários. 
                                    Você pode alterar o email e a senha sem precisar da senha atual.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 p-6 border-t border-gray-200">
                            <button
                                onClick={handleCloseModalEditar}
                                disabled={saving}
                                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSalvarEdicaoUsuario}
                                disabled={saving || !editarUsuarioForm.name.trim() || !editarUsuarioForm.email.trim()}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-600 transition-all shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <CheckIcon className="w-5 h-5" />
                                        Salvar Alterações
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
            <Dialog open={isModalExcluirOpen} onOpenChange={setIsModalExcluirOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <TrashIcon className="w-6 h-6" />
                            Confirmar Exclusão
                        </DialogTitle>
                        <DialogDescription className="pt-4">
                            Tem certeza que deseja excluir o usuário{' '}
                            <span className="font-bold text-gray-900 dark:text-dark-text">
                                {usuarioParaExcluir?.name}
                            </span>{' '}
                            ({usuarioParaExcluir?.email})?
                            <br />
                            <br />
                            <span className="text-red-600 font-semibold">
                                ⚠️ Esta ação é irreversível e todos os dados do usuário serão permanentemente excluídos.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-3 sm:gap-2">
                        <button
                            onClick={handleCloseModalExcluir}
                            disabled={excluindoUsuario}
                            className="px-4 py-2.5 border-2 border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors font-semibold disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleExcluirUsuario}
                            disabled={excluindoUsuario}
                            className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {excluindoUsuario ? (
                                <>
                                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Excluindo...
                                </>
                            ) : (
                                <>
                                    <TrashIcon className="w-4 h-4" />
                                    Excluir Permanentemente
                                </>
                            )}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Configuracoes;

