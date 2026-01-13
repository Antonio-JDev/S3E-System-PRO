import React, { useState, useMemo, useEffect, useRef, useContext } from 'react';
import { toast } from 'sonner';
import ModalVizualizacaoProjeto from './ModalVizualizacaoProjeto';
import TeamManagerModal from './TeamManagerModal';
import { projetosService, type Projeto, type CreateProjetoData, type UpdateProjetoData } from '../services/projetosService';
import { clientesService, type Cliente } from '../services/clientesService';
import { orcamentosService, type Orcamento } from '../services/orcamentosService';
import { axiosApiService } from '../services/axiosApi';
import { ENDPOINTS } from '../config/api';
import { AuthContext } from '../contexts/AuthContext';
import ViewToggle from './ui/ViewToggle';
import { loadViewMode, saveViewMode } from '../utils/viewModeStorage';

import { useEscapeKey } from '../hooks/useEscapeKey';

// ==================== ICONS ====================
const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);
const MagnifyingGlassIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);
const EllipsisVerticalIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
    </svg>
);
const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.038-2.124H9.038c-1.128 0-2.038.944-2.038 2.124v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);
const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
);
const ClipboardIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
);
const DocumentIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);
const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const XCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);
const PaperClipIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
    </svg>
);
const CubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
);

// ==================== INTERFACES ====================
interface Material {
    id: string;
    nome: string;
    quantidade: number;
    status: 'Pendente' | 'Alocado' | 'Em Falta';
}

interface Etapa {
    id: string;
    titulo: string;
    descricao: string;
    status: 'A Fazer' | 'Em Andamento' | 'Concluído';
    prazo: string;
}

interface QualityCheck {
    id: string;
    item: string;
    status: 'Pendente' | 'Aprovado' | 'Reprovado';
    observacoes?: string;
}

interface Anexo {
    id: string;
    nome: string;
    url: string;
    tipo: string;
    tamanho: number;
    dataUpload: string;
}

interface Usuario {
    id: string;
    nome: string;
    email: string;
    funcao: string;
    role?: string;
}

interface ProjetosProps {
    toggleSidebar: () => void;
    onNavigate: (view: string, ...args: any[]) => void;
    onViewBudget: (budgetId: string) => void;
    onViewSale?: (saleId: string) => void;
    onViewClient?: (clientId: string) => void;
    onViewObra?: (obraId: string) => void;
}

type ViewModalTab = 'geral' | 'materiais' | 'etapas' | 'qualidade';

const ProjetosModerno: React.FC<ProjetosProps> = ({ toggleSidebar, onNavigate, onViewBudget, onViewSale, onViewClient, onViewObra }) => {
    // ==================== AUTH ====================
    const authContext = useContext(AuthContext);
    const user = authContext?.user;
    
    // Verificar se usuário tem permissão para exclusão permanente
    const canDeletePermanently = useMemo(() => {
        const userRole = user?.role?.toLowerCase();
        return userRole === 'admin' || userRole === 'desenvolvedor';
    }, [user?.role]);
    
    // ==================== ESTADOS ====================
    const [projetos, setProjetos] = useState<Projeto[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('Todos');
    const [responsavelFilter, setResponsavelFilter] = useState<string>('Todos');
    const [mostrarCancelados, setMostrarCancelados] = useState(false);
    const [mostrarApenasOSRecentes, setMostrarApenasOSRecentes] = useState(true); // ✅ NOVO: Filtrar apenas OS >= 2155 por padrão
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(loadViewMode('Ordem De Serviços'));
    
    // Salvar viewMode no localStorage quando mudar
    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        saveViewMode('Ordem De Serviços', mode);
    };

    // Modais
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    
    const [projetoToEdit, setProjetoToEdit] = useState<Projeto | null>(null);
    const [projetoToView, setProjetoToView] = useState<Projeto | null>(null);
    const [projetoToDelete, setProjetoToDelete] = useState<Projeto | null>(null);
    
    // Estados do modal de visualização
    const [viewModalActiveTab, setViewModalActiveTab] = useState<ViewModalTab>('geral');
    const [materiais, setMateriais] = useState<Material[]>([]);
    const [etapas, setEtapas] = useState<Etapa[]>([]);
    const [qualityChecks, setQualityChecks] = useState<QualityCheck[]>([]);
    const [anexos, setAnexos] = useState<Anexo[]>([]);
    
    // Estado para extensão de prazo
    const [extendPrazoModalOpen, setExtendPrazoModalOpen] = useState(false);
    const [extendFormState, setExtendFormState] = useState({
        novaData: '',
        motivo: ''
    });
    
    // Drag and Drop Kanban
    const [draggingTask, setDraggingTask] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    
    // Gestão de tarefas
    const [taskToEdit, setTaskToEdit] = useState<Etapa | null>(null);
    const [taskFormState, setTaskFormState] = useState({
        titulo: '',
        descricao: '',
        status: 'A Fazer' as 'A Fazer' | 'Em Andamento' | 'Concluído',
        prazo: ''
    });
    
    // Gestão de equipe
    const [teamManagementMode, setTeamManagementMode] = useState<'view' | 'add' | 'edit'>('view');
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [usuarioToEdit, setUsuarioToEdit] = useState<Usuario | null>(null);
    const [memberToDelete, setMemberToDelete] = useState<Usuario | null>(null);
    const [usuarioFormState, setUsuarioFormState] = useState({
        nome: '',
        email: '',
        funcao: ''
    });

    // Ref para upload de arquivos
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state para criar/editar projeto
    const [formState, setFormState] = useState<CreateProjetoData>({
        titulo: '',
        descricao: '',
        tipo: 'Instalacao',
        clienteId: '',
        responsavelId: '',
        dataInicio: '',
        dataPrevisao: '',
        orcamentoId: ''
    });

    // Dropdown menu state
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    // ==================== CARREGAMENTO DE DADOS ====================
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [projetosRes, clientesRes, orcamentosRes, usuariosRes] = await Promise.all([
                projetosService.listar(),
                clientesService.listar(),
                orcamentosService.listar({ status: 'Aprovado' }),
                axiosApiService.get<any[]>('/api/configuracoes/usuarios')
            ]);

            if (projetosRes.success && projetosRes.data) {
                // Garantir que sempre seja um array
                const projetosArray = Array.isArray(projetosRes.data) ? projetosRes.data : [];
                setProjetos(projetosArray);
            } else {
                setProjetos([]);
            }

            if (clientesRes.success && clientesRes.data) {
                // Garantir que sempre seja um array
                const clientesArray = Array.isArray(clientesRes.data) ? clientesRes.data : [];
                setClientes(clientesArray);
            } else {
                setClientes([]);
            }

            if (orcamentosRes.success && orcamentosRes.data) {
                // Garantir que sempre seja um array
                const orcamentosArray = Array.isArray(orcamentosRes.data) ? orcamentosRes.data : [];
                setOrcamentos(orcamentosArray);
            } else {
                setOrcamentos([]);
            }

            if (usuariosRes.success && usuariosRes.data) {
                // Filtrar apenas roles técnicas: engenheiro, tecnico, orcamentista, compras, gerente
                const usuariosArray = Array.isArray(usuariosRes.data) ? usuariosRes.data : [];
                const usuariosFiltrados = usuariosArray
                    .filter((u: any) => 
                        ['engenheiro', 'tecnico', 'técnico', 'orcamentista', 'compras', 'gerente'].includes(u.role?.toLowerCase())
                    )
                    .map((u: any) => ({
                        id: u.id,
                        nome: u.name || u.nome || '',
                        email: u.email || '',
                        funcao: u.role || u.funcao || '',
                        role: u.role || ''
                    }));
                setUsuarios(usuariosFiltrados);
            } else {
                setUsuarios([]);
            }

        } catch (err) {
            setError('Erro ao carregar dados');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ==================== FILTROS ====================
    const filteredProjetos = useMemo(() => {
        // Garantir que projetos seja sempre um array
        if (!Array.isArray(projetos)) {
            return [];
        }
        
        return projetos.filter(projeto => {
            // Ocultar cancelados por padrão (a menos que o usuário queira ver)
            if (!mostrarCancelados && projeto.status === 'CANCELADO') {
                return false;
            }
            
            // ✅ NOVO: Filtrar apenas OS >= 2155 se o filtro estiver ativo
            if (mostrarApenasOSRecentes) {
                // Extrair número da OS diretamente
                let numeroOS: number | null = null;
                
                // Prioridade: usar numeroSequencial do orçamento vinculado
                if (projeto.orcamento?.numeroSequencial) {
                    numeroOS = projeto.orcamento.numeroSequencial;
                } else if (projeto.orcamentoId && orcamentos.length > 0) {
                    // Fallback: buscar no array de orçamentos
                    const orcamentoVinculado = orcamentos.find(o => o.id === projeto.orcamentoId);
                    if (orcamentoVinculado?.numeroSequencial) {
                        numeroOS = orcamentoVinculado.numeroSequencial;
                    }
                }
                
                // Se não encontrou número do orçamento, considera como OS antiga (< 2155)
                if (numeroOS === null || numeroOS < 2155) {
                    return false;
                }
            }
            
            const matchesSearch = 
                projeto.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                projeto.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                projeto.cliente?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                projeto.id.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === 'Todos' || projeto.status === statusFilter;
            const matchesResponsavel = responsavelFilter === 'Todos' || projeto.responsavelId === responsavelFilter;
            
            return matchesSearch && matchesStatus && matchesResponsavel;
        });
    }, [projetos, searchTerm, statusFilter, responsavelFilter, mostrarCancelados, mostrarApenasOSRecentes, orcamentos]);

    // Função para gerar número OS baseado no número do orçamento vinculado
    const gerarNumeroOS = (projeto: Projeto): string => {
        // Prioridade: usar numeroSequencial do orçamento vinculado
        if (projeto.orcamento?.numeroSequencial) {
            return `OS-${projeto.orcamento.numeroSequencial}`;
        }
        
        // Fallback: se não tiver orçamento vinculado, tentar buscar no array de orçamentos
        if (projeto.orcamentoId && orcamentos.length > 0) {
            const orcamentoVinculado = orcamentos.find(o => o.id === projeto.orcamentoId);
            if (orcamentoVinculado?.numeroSequencial) {
                return `OS-${orcamentoVinculado.numeroSequencial}`;
            }
        }
        
        // Último fallback: usar índice (para projetos antigos sem orçamento)
        const projetosOrdenados = [...projetos].sort((a, b) => {
            const dataA = new Date(a.createdAt || a.dataInicio || 0).getTime();
            const dataB = new Date(b.createdAt || b.dataInicio || 0).getTime();
            return dataA - dataB;
        });
        
        const index = projetosOrdenados.findIndex(p => p.id === projeto.id);
        const numero = index >= 0 ? index + 1 : projetosOrdenados.length + 1;
        const numeroValido = isNaN(numero) ? 1 : numero;
        
        return `OS-${numeroValido.toString().padStart(3, '0')}`;
    };

    // ✅ NOVO: Função para extrair o número da OS (sem o prefixo "OS-")
    const extrairNumeroOS = (projeto: Projeto): number | null => {
        const numeroOS = gerarNumeroOS(projeto);
        // Remove "OS-" e tenta converter para número
        const numero = numeroOS.replace(/^OS-/, '');
        const numeroInt = parseInt(numero, 10);
        return isNaN(numeroInt) ? null : numeroInt;
    };

    // ==================== HANDLERS ====================
    const handleOpenCreateModal = (projeto: Projeto | null = null) => {
        if (projeto) {
            setProjetoToEdit(projeto);
            setFormState({
                titulo: projeto.titulo,
                descricao: projeto.descricao,
                tipo: projeto.tipo,
                clienteId: projeto.clienteId,
                responsavelId: projeto.responsavelId,
                dataInicio: projeto.dataInicio,
                dataPrevisao: projeto.dataPrevisao,
                orcamentoId: projeto.orcamentoId || ''
            });
        } else {
            setProjetoToEdit(null);
            setFormState({
                titulo: '',
                descricao: '',
                tipo: 'Instalacao',
                clienteId: '',
                responsavelId: '',
                dataInicio: '',
                dataPrevisao: '',
                orcamentoId: ''
            });
        }
        setIsCreateModalOpen(true);
    };

    const handleOpenViewModal = async (projeto: Projeto) => {
        setProjetoToView(projeto);
        setViewModalActiveTab('geral');
        
        
        // Inicializar dados mockados para demonstração
        setMateriais([
            { id: '1', nome: 'Cabo Flexível 2.5mm²', quantidade: 100, status: 'Pendente' },
            { id: '2', nome: 'Disjuntor 20A', quantidade: 10, status: 'Alocado' },
            { id: '3', nome: 'Tomada 10A', quantidade: 50, status: 'Em Falta' }
        ]);
        
        setEtapas([
            { id: '1', titulo: 'Levantamento de requisitos', descricao: 'Análise inicial', status: 'Concluído', prazo: '2025-11-05' },
            { id: '2', titulo: 'Elaboração do projeto', descricao: 'Desenho técnico', status: 'Em Andamento', prazo: '2025-11-15' },
            { id: '3', titulo: 'Aprovação do cliente', descricao: 'Validação final', status: 'A Fazer', prazo: '2025-11-20' }
        ]);
        
        setQualityChecks([
            { id: '1', item: 'Conformidade com normas NBR 5410', status: 'Pendente' },
            { id: '2', item: 'Dimensionamento de condutores', status: 'Aprovado', observacoes: 'OK' },
            { id: '3', item: 'Proteção contra sobrecorrente', status: 'Pendente' }
        ]);
        
        setAnexos([]);
        
        setIsViewModalOpen(true);
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            if (projetoToEdit) {
                const response = await projetosService.atualizar(projetoToEdit.id, formState);
                if (response.success && response.data) {
                    setProjetos(prev => prev.map(p => p.id === projetoToEdit.id ? response.data! : p));
                    setIsCreateModalOpen(false);
                    setProjetoToEdit(null);
                }
            } else {
                const response = await projetosService.criar(formState);
                if (response.success && response.data) {
                    setProjetos(prev => [response.data!, ...prev]);
                    setIsCreateModalOpen(false);
                }
            }
        } catch (err) {
            toast.error('Erro ao salvar ordem de serviço');
        }
    };


    // Fechar modais com ESC
    useEscapeKey(isCreateModalOpen, () => setIsCreateModalOpen(false));
    useEscapeKey(isViewModalOpen, () => {
        setIsViewModalOpen(false);
        setProjetoToView(null);
    });
    useEscapeKey(isTeamModalOpen, () => setIsTeamModalOpen(false));
    useEscapeKey(isTaskModalOpen, () => setIsTaskModalOpen(false));
    useEscapeKey(extendPrazoModalOpen, () => setExtendPrazoModalOpen(false));

    const handleDelete = async (permanent = false) => {
        if (!projetoToDelete) return;
        
        // Verificar permissão antes de tentar exclusão permanente
        if (permanent && !canDeletePermanently) {
            toast.error('🚫 Acesso negado', {
                description: 'Apenas Administradores e Desenvolvedores podem excluir ordens de serviço permanentemente.'
            });
            return;
        }
        
        try {
            if (permanent) {
                // Exclusão permanente do banco de dados
                const response = await projetosService.excluirPermanentemente(projetoToDelete.id);
                
                toast.success('⚠️ Ordem de serviço excluída permanentemente!', {
                    description: `"${projetoToDelete.titulo}" foi removida do banco de dados.`
                });
            } else {
                // Soft delete (marca como CANCELADO)
                await projetosService.desativar(projetoToDelete.id);
                toast.success('Ordem de serviço cancelada', {
                    description: `"${projetoToDelete.titulo}" foi marcada como CANCELADA.`
                });
            }
            setProjetos(prev => prev.filter(p => p.id !== projetoToDelete.id));
            setProjetoToDelete(null);
        } catch (err: any) {
            const errorMessage = err?.response?.data?.error || err?.message || 'Erro ao excluir ordem de serviço';
            toast.error('Erro ao excluir ordem de serviço', {
                description: errorMessage
            });
        }
    };

    // Upload de anexos
    const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !projetoToView) return;

        Array.from(files).forEach(file => {
            const newAnexo: Anexo = {
                id: Date.now().toString(),
                nome: file.name,
                url: URL.createObjectURL(file),
                tipo: file.type,
                tamanho: file.size,
                dataUpload: new Date().toISOString()
            };
            setAnexos(prev => [...prev, newAnexo]);
        });
    };

    const handleDeleteAnexo = (anexoId: string) => {
        setAnexos(prev => prev.filter(a => a.id !== anexoId));
    };

    // Alocar material
    const handleAlocarMaterial = (materialId: string) => {
        setMateriais(prev => prev.map(m => {
            if (m.id === materialId) {
                // Simular verificação de estoque
                const hasStock = Math.random() > 0.3;
                return { ...m, status: hasStock ? 'Alocado' : 'Em Falta' };
            }
            return m;
        }));
    };

    // Drag and Drop para Kanban
    const handleDragStart = (taskId: string) => {
        setDraggingTask(taskId);
    };

    const handleDragOver = (e: React.DragEvent, column: 'A Fazer' | 'Em Andamento' | 'Concluído') => {
        e.preventDefault();
        setDragOverColumn(column);
    };

    const handleDrop = (e: React.DragEvent, newStatus: 'A Fazer' | 'Em Andamento' | 'Concluído') => {
        e.preventDefault();
        if (!draggingTask) return;

        setEtapas(prev => prev.map(etapa => 
            etapa.id === draggingTask ? { ...etapa, status: newStatus } : etapa
        ));

        setDraggingTask(null);
        setDragOverColumn(null);
    };

    // Gerenciar tarefas/etapas
    const handleOpenTaskModal = (etapa: Etapa | null = null) => {
        if (etapa) {
            setTaskToEdit(etapa);
            setTaskFormState({
                titulo: etapa.titulo,
                descricao: etapa.descricao,
                status: etapa.status,
                prazo: etapa.prazo
            });
        } else {
            setTaskToEdit(null);
            setTaskFormState({
                titulo: '',
                descricao: '',
                status: 'A Fazer',
                prazo: ''
            });
        }
        setIsTaskModalOpen(true);
    };

    const handleSubmitTask = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (taskToEdit) {
            setEtapas(prev => prev.map(et => 
                et.id === taskToEdit.id ? { ...et, ...taskFormState } : et
            ));
        } else {
            const newEtapa: Etapa = {
                id: Date.now().toString(),
                ...taskFormState
            };
            setEtapas(prev => [...prev, newEtapa]);
        }
        
        setIsTaskModalOpen(false);
        setTaskToEdit(null);
    };

    // Quality Check
    const handleUpdateQualityCheck = (checkId: string, newStatus: 'Aprovado' | 'Reprovado') => {
        setQualityChecks(prev => prev.map(qc => 
            qc.id === checkId ? { ...qc, status: newStatus } : qc
        ));
    };

    // Gerar Obra
    const handleGerarObra = async () => {
        if (!projetoToView) return;
        
        toast(`Gerar obra a partir do projeto "${projetoToView.titulo}"?`, {
            action: {
                label: 'Gerar Obra',
                onClick: async () => {
            try {
                const response = await projetosService.atualizar(projetoToView.id, {
                    status: 'Em Execução'
                });
                
                if (response.success) {
                    toast.success('Obra gerada com sucesso!', {
                        description: 'Você pode acessá-la na página de Obras'
                    });
                    setProjetos(prev => prev.map(p => 
                        p.id === projetoToView.id ? { ...p, status: 'Em Execução' } : p
                    ));
                    setIsViewModalOpen(false);
                    onNavigate('Obras');
                }
            } catch (err) {
                    toast.error('Erro ao gerar obra');
                }
            }
        },
    })};

    // Gestão de Equipe/Usuários
    const handleOpenTeamModal = () => {
        console.log('👥 Abrindo modal de equipe. Usuários disponíveis:', usuarios.length);
        setTeamManagementMode('view');
        setIsTeamModalOpen(true);
    };

    const handleSubmitUsuario = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (usuarioToEdit) {
            setUsuarios(prev => prev.map(u => 
                u.id === usuarioToEdit.id ? { ...u, ...usuarioFormState } : u
            ));
        } else {
            const newUsuario: Usuario = {
                id: Date.now().toString(),
                ...usuarioFormState
            };
            setUsuarios(prev => [...prev, newUsuario]);
        }
        
        setTeamManagementMode('view');
        setUsuarioToEdit(null);
        setUsuarioFormState({ nome: '', email: '', funcao: '' });
    };

    const handleDeleteUsuario = () => {
        if (!memberToDelete) return;
        setUsuarios(prev => prev.filter(u => u.id !== memberToDelete.id));
        setMemberToDelete(null);
    };

    // Helpers
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PROPOSTA':
            case 'Pendente':
            case 'Planejamento':
                return 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'VALIDADO':
                return 'bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400';
            case 'APROVADO':
                return 'bg-green-100 text-green-800 ring-1 ring-green-200 dark:bg-green-900/30 dark:text-green-400';
            case 'EXECUCAO':
            case 'Ativo':
            case 'Em Execução':
                return 'bg-blue-100 text-blue-800 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-400';
            case 'CONCLUIDO':
            case 'Concluído':
                return 'bg-purple-100 text-purple-800 ring-1 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-400';
            case 'CANCELADO':
            case 'Cancelado':
                return 'bg-red-100 text-red-800 ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-800 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const calcularProgressoProjeto = (projeto: Projeto): number => {
        // Este é um cálculo simplificado para os cards
        // O cálculo real completo é feito no modal quando o projeto é aberto
        // Aqui usamos uma estimativa baseada no status do projeto
        
        switch (projeto.status) {
            case 'PROPOSTA':
                return 10; // Proposta inicial
            case 'VALIDADO':
                return 25; // Validado tecnicamente
            case 'APROVADO':
                return 40; // Aprovado pelo cliente
            case 'EXECUCAO':
                return 60; // Em execução (valor médio, será calculado precisamente no modal)
            case 'CONCLUIDO':
                return 100; // Concluído
            case 'CANCELADO':
                return 0; // Cancelado
            default:
                return 0;
        }
    };

    // ==================== RENDER ====================
    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando projetos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 rounded-xl hover:bg-white hover:shadow-soft">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight">Ordem De Serviços</h1>
                        <p className="text-sm sm:text-base text-gray-500 mt-1">Hub central de gerenciamento de ordens de serviço</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleOpenTeamModal}
                        className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold shadow-soft"
                    >
                        <UsersIcon className="w-5 h-5" />
                        Gerenciar Equipe
                    </button>
                    <button
                        onClick={() => handleOpenCreateModal()}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Nova Ordem De Serviço
                    </button>
                </div>
            </header>

            {/* Filtros e Busca */}
            <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Busca */}
                    <div className="md:col-span-2">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nome, cliente ou ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Filtro por Status */}
                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        >
                            <option value="Todos">Todos os Status</option>
                            <option value="PROPOSTA">📋 Proposta</option>
                            <option value="VALIDADO">✅ Validado</option>
                            <option value="APROVADO">🎉 Aprovado</option>
                            <option value="EXECUCAO">🏗️ Em Execução</option>
                            <option value="CONCLUIDO">🎊 Concluído</option>
                            <option value="CANCELADO">❌ Cancelado</option>
                        </select>
                    </div>

                    {/* Filtro por Responsável */}
                    <div>
                        <select
                            value={responsavelFilter}
                            onChange={(e) => setResponsavelFilter(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        >
                            <option value="Todos">Todos Responsáveis</option>
                            {/* opções de responsáveis poderão ser carregadas via API futura */}
                        </select>
                    </div>
                </div>

                {/* Resultado da Busca */}
                <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm text-gray-600">
                        Exibindo <span className="font-bold text-gray-900">{filteredProjetos.length}</span> de <span className="font-bold text-gray-900">{projetos.length}</span> ordens de serviço
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                        <ViewToggle view={viewMode} onViewChange={handleViewModeChange} />
                        
                        {/* ✅ NOVO: Botão para mostrar todas as OS ou apenas >= 2155 */}
                        <button
                            onClick={() => setMostrarApenasOSRecentes(!mostrarApenasOSRecentes)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                mostrarApenasOSRecentes
                                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                            }`}
                            title={mostrarApenasOSRecentes ? 'Mostrar apenas OS a partir de 2155' : 'Mostrar todas as OS'}
                        >
                            {mostrarApenasOSRecentes ? (
                                <span className="inline-flex items-center gap-1">
                                    <span>📋 OS {'>='} 2155</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1">
                                    <span>📚 Todas as OS</span>
                                </span>
                            )}
                        </button>
                        
                        {/* Toggle Mostrar Cancelados */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={mostrarCancelados}
                                onChange={(e) => setMostrarCancelados(e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-600">Mostrar cancelados</span>
                        </label>
                        
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Limpar busca
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Grid de Ordens de Serviço */}
            {filteredProjetos.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-16 text-center">
                    <ClipboardIcon className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Nenhuma ordem de serviço encontrada</h3>
                    <p className="text-gray-500 mb-6">
                        {searchTerm || statusFilter !== 'Todos' || responsavelFilter !== 'Todos'
                            ? 'Tente ajustar os filtros de busca'
                            : 'Comece criando sua primeira ordem de serviço'}
                    </p>
                    {!searchTerm && statusFilter === 'Todos' && responsavelFilter === 'Todos' && (
                        <button
                            onClick={() => handleOpenCreateModal()}
                            className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold"
                        >
                            <PlusIcon className="w-5 h-5 inline mr-2" />
                            Criar Primeira Ordem De Serviço
                        </button>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjetos.map((projeto) => {
                        // Calcular progresso real do projeto (mesmo cálculo do modal)
                        const progresso = calcularProgressoProjeto(projeto);
                        const numeroOS = gerarNumeroOS(projeto);
                        
                        return (
                            <div key={projeto.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all duration-200 hover:border-blue-300 relative group">
                                {/* Menu de Ações */}
                                <div className="absolute top-4 right-4">
                                    <button
                                        onClick={() => setActiveDropdown(activeDropdown === projeto.id ? null : projeto.id)}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <EllipsisVerticalIcon className="w-5 h-5" />
                                    </button>
                                    
                                    {activeDropdown === projeto.id && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-strong border border-gray-200 py-1 z-10">
                                            <button
                                                onClick={() => {
                                                    handleOpenViewModal(projeto);
                                                    setActiveDropdown(null);
                                                }}
                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <EyeIcon className="w-4 h-4" />
                                                Visualizar
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleOpenCreateModal(projeto);
                                                    setActiveDropdown(null);
                                                }}
                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setProjetoToDelete(projeto);
                                                    setActiveDropdown(null);
                                                }}
                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                                Excluir
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Conteúdo do Card */}
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                                            {numeroOS}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-900 mb-2 pr-8">{projeto.titulo}</h3>
                                    <p className="text-sm text-gray-600 line-clamp-2">{projeto.descricao}</p>
                                </div>

                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">Cliente:</span>
                                        <span className="text-sm font-semibold text-gray-900">{projeto.cliente?.nome || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">Responsável:</span>
                                        <span className="text-sm font-medium text-gray-700">
                                            {projeto.responsavel?.nome || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">Status:</span>
                                        <span className={`px-3 py-1 text-xs font-bold rounded-lg ${getStatusColor(projeto.status)}`}>
                                            {projeto.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-gray-600">Progresso</span>
                                        <span className="text-xs font-bold text-blue-600">{Math.round(progresso)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden shadow-inner">
                                        <div 
                                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500"
                                            style={{ width: `${progresso}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Datas */}
                                <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
                                    <span>Início: {new Date(projeto.dataInicio).toLocaleDateString('pt-BR')}</span>
                                    <span>Previsão: {new Date(projeto.dataPrevisao).toLocaleDateString('pt-BR')}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ): (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-soft">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Ordem De Serviço</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Cliente</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredProjetos.map((projeto) => {
                                const numeroOS = gerarNumeroOS(projeto);
                                return (
                                <tr key={projeto.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                                                {numeroOS}
                                            </span>
                                        </div>
                                        <p className="font-semibold text-gray-900">{projeto.titulo}</p>
                                        <p className="text-xs text-gray-500">{projeto.descricao || 'Sem descrição'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-gray-700">{projeto.cliente?.nome || 'N/A'}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className="text-lg font-bold text-blue-700">
                                            R$ {(projeto.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <p className="text-sm text-gray-700">
                                            {new Date(projeto.dataInicio).toLocaleDateString('pt-BR')}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-lg ${getStatusColor(projeto.status)}`}>
                                            {projeto.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => handleOpenViewModal(projeto)}
                                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            <EyeIcon className="w-4 h-4 inline mr-2" />
                                            Visualizar
                                        </button>
                                    </td>
                                </tr>
                            );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-strong max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-in-up">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {projetoToEdit ? 'Editar Ordem De Serviço' : 'Nova Ordem De Serviço'}
                            </h2>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Título da Ordem De Serviço *
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.titulo}
                                        onChange={(e) => setFormState({...formState, titulo: e.target.value})}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Ex: Instalação Elétrica Ed. Phoenix"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Descrição
                                    </label>
                                    <textarea
                                        value={formState.descricao}
                                        onChange={(e) => setFormState({...formState, descricao: e.target.value})}
                                        rows={3}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Descreva a ordem de serviço..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Cliente
                                    </label>
                                    <select
                                        value={formState.clienteId}
                                        onChange={(e) => setFormState({...formState, clienteId: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Selecione o cliente</option>
                                        {clientes.map(cliente => (
                                            <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Responsável Técnico
                                    </label>
                                    <select
                                        value={formState.responsavelId}
                                        onChange={(e) => setFormState({...formState, responsavelId: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Selecione o responsável</option>
                                        {usuarios.map(usuario => (
                                            <option key={usuario.id} value={usuario.id}>
                                                {usuario.nome} - {usuario.role}
                                            </option>
                                        ))}
                                    </select>
                                    {usuarios.length === 0 && (
                                        <p className="text-xs text-orange-600 mt-1">
                                            ⚠️ Nenhum usuário técnico encontrado.
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Tipo de Projeto
                                    </label>
                                    <select
                                        value={formState.tipo}
                                        onChange={(e) => setFormState({...formState, tipo: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="Instalacao">Instalação</option>
                                        <option value="Manutencao">Manutenção</option>
                                        <option value="Retrofit">Retrofit</option>
                                        <option value="Automacao">Automação</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Orçamento *
                                    </label>
                                    <select
                                        value={formState.orcamentoId}
                                        onChange={(e) => setFormState({...formState, orcamentoId: e.target.value})}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Selecione um orçamento aprovado</option>
                                        {orcamentos.map(orcamento => (
                                            <option key={orcamento.id} value={orcamento.id}>
                                                {orcamento.titulo} - Cliente: {orcamento.cliente?.nome} - R$ {orcamento.precoVenda?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </option>
                                        ))}
                                    </select>
                                    {orcamentos.length === 0 && (
                                        <p className="text-xs text-orange-600 mt-1">
                                            ⚠️ Nenhum orçamento aprovado encontrado. Crie e aprove um orçamento primeiro.
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Data de Início
                                    </label>
                                    <input
                                        type="date"
                                        value={formState.dataInicio}
                                        onChange={(e) => setFormState({...formState, dataInicio: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Data de Previsão
                                    </label>
                                    <input
                                        type="date"
                                        value={formState.dataPrevisao}
                                        onChange={(e) => setFormState({...formState, dataPrevisao: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold"
                                >
                                    {projetoToEdit ? 'Atualizar' : 'Criar'} Projeto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* MODAL DE VISUALIZAÇÃO DE PROJETO (Hub Completo) */}
            {isViewModalOpen && projetoToView && (
                <ModalVizualizacaoProjeto
                    projeto={projetoToView as any}
                    isOpen={isViewModalOpen}
                    onClose={() => setIsViewModalOpen(false)}
                    onRefresh={loadData}
                    onViewBudget={onViewBudget}
                    onViewSale={onViewSale}
                    onViewClient={onViewClient}
                    onViewObra={onViewObra}
                    onNavigate={onNavigate}
                    initialTab={
                        viewModalActiveTab === 'geral' ? 'Visão Geral' :
                        viewModalActiveTab === 'materiais' ? 'Materiais' :
                        viewModalActiveTab === 'etapas' ? 'Kanban' : 'Qualidade'
                    }
                />
            )}

            {/* MODAL DE TAREFA/ETAPA */}
            {isTaskModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-strong max-w-2xl w-full">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900">
                                {taskToEdit ? 'Editar Tarefa' : 'Nova Tarefa'}
                            </h3>
                        </div>
                        
                        <form onSubmit={handleSubmitTask} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Título *</label>
                                <input
                                    type="text"
                                    value={taskFormState.titulo}
                                    onChange={(e) => setTaskFormState({...taskFormState, titulo: e.target.value})}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    placeholder="Título da tarefa"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Descrição</label>
                                <textarea
                                    value={taskFormState.descricao}
                                    onChange={(e) => setTaskFormState({...taskFormState, descricao: e.target.value})}
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    placeholder="Descrição da tarefa"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                    <select
                                        value={taskFormState.status}
                                        onChange={(e) => setTaskFormState({...taskFormState, status: e.target.value as any})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="A Fazer">A Fazer</option>
                                        <option value="Em Andamento">Em Andamento</option>
                                        <option value="Concluído">Concluído</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Prazo *</label>
                                    <input
                                        type="date"
                                        value={taskFormState.prazo}
                                        onChange={(e) => setTaskFormState({...taskFormState, prazo: e.target.value})}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsTaskModalOpen(false)}
                                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all font-semibold"
                                >
                                    {taskToEdit ? 'Atualizar' : 'Criar'} Tarefa
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: GERENCIAR EQUIPE */}
            {isTeamModalOpen && (
                <TeamManagerModal
                    isOpen={isTeamModalOpen}
                    onClose={() => setIsTeamModalOpen(false)}
                    usuarios={Array.isArray(usuarios) ? usuarios : []}
                    onAddUsuario={(usuario) => {
                        setUsuarios(prev => [...prev, usuario]);
                    }}
                    onUpdateUsuario={(usuario) => {
                        setUsuarios(prev => prev.map(u => u.id === usuario.id ? usuario : u));
                    }}
                    onDeleteUsuario={(usuarioId) => {
                        setUsuarios(prev => prev.filter(u => u.id !== usuarioId));
                    }}
                />
            )}

            {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
            {projetoToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-strong max-w-lg w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Confirmar Exclusão</h3>
                        <p className="text-gray-600 mb-4">
                            Tem certeza que deseja excluir a ordem de serviço <strong>"{projetoToDelete.titulo}"</strong>?
                        </p>
                        
                        {/* Opções de Exclusão */}
                        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
                            <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <span className="text-yellow-600">⚠️</span>
                                <div>
                                    <p className="text-sm font-semibold text-yellow-900">Cancelar Ordem De Serviço (Recomendado)</p>
                                    <p className="text-xs text-yellow-700 mt-1">
                                        Marca a ordem de serviço como CANCELADA. Os dados permanecem no banco.
                                    </p>
                                </div>
                            </div>
                            
                            {/* Mostrar opção de exclusão permanente apenas para Admin e Desenvolvedor */}
                            {canDeletePermanently && (
                                <div className="flex items-start gap-3 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                                    <span className="text-red-600">🗑️</span>
                                    <div>
                                        <p className="text-sm font-semibold text-red-900 flex items-center gap-2">
                                            Excluir Permanentemente
                                            <span className="px-2 py-0.5 bg-red-200 text-red-800 text-xs rounded-full font-bold">
                                                Admin/Dev
                                            </span>
                                        </p>
                                        <p className="text-xs text-red-700 mt-1">
                                            Remove permanentemente do banco de dados. ⚠️ Não pode ser desfeito!
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            {/* Aviso para usuários sem permissão */}
                            {!canDeletePermanently && (
                                <div className="flex items-start gap-3 p-3 bg-gray-100 border border-gray-300 rounded-lg">
                                    <span className="text-gray-500">🔒</span>
                                    <div>
                                        <p className="text-xs text-gray-600">
                                            Exclusão permanente disponível apenas para Administradores e Desenvolvedores.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => setProjetoToDelete(null)}
                                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-semibold"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={() => handleDelete(false)}
                                className="flex-1 px-4 py-3 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 font-semibold"
                            >
                                ⚠️ Cancelar
                            </button>
                            {canDeletePermanently && (
                                <button
                                    onClick={() => handleDelete(true)}
                                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold"
                                >
                                    🗑️ Excluir
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE MEMBRO */}
            {memberToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-strong max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Confirmar Exclusão</h3>
                        <p className="text-gray-600 mb-6">
                            Tem certeza que deseja remover <strong>{memberToDelete.nome}</strong> da equipe?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setMemberToDelete(null)}
                                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-semibold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteUsuario}
                                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold"
                            >
                                Remover
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE EXTENSÃO DE PRAZO */}
            {extendPrazoModalOpen && etapaToExtend && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-2xl shadow-strong max-w-2xl w-full p-6">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Estender Prazo da Etapa</h3>
                        <p className="text-gray-600 mb-6">
                            Etapa: <strong>{etapaToExtend.nome}</strong>
                        </p>

                        <form onSubmit={handleSubmitExtendPrazo} className="space-y-6">
                            {/* Informações Atuais */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <h4 className="font-semibold text-gray-900 mb-3">Informações Atuais</h4>
                                <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <dt className="text-gray-600">Prazo Atual:</dt>
                                        <dd className="font-semibold text-gray-900">
                                            {new Date(etapaToExtend.dataPrevista).toLocaleString('pt-BR')}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-gray-600">Horas Restantes:</dt>
                                        <dd className={`font-semibold ${etapaToExtend.atrasada ? 'text-red-600' : 'text-gray-900'}`}>
                                            {etapaToExtend.atrasada ? 'Vencido' : `${Math.abs(etapaToExtend.horasRestantes)}h`}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-gray-600">Status:</dt>
                                        <dd className={`font-semibold ${etapaToExtend.atrasada ? 'text-red-600' : 'text-green-600'}`}>
                                            {etapaToExtend.atrasada ? '⚠️ Atrasada' : '✓ No Prazo'}
                                        </dd>
                                    </div>
                                </dl>
                            </div>

                            {/* Nova Data */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Nova Data de Vencimento *
                                </label>
                                <input
                                    type="datetime-local"
                                    value={extendFormState.novaData}
                                    onChange={(e) => setExtendFormState({ ...extendFormState, novaData: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Justificativa */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Justificativa * (mínimo 10 caracteres)
                                </label>
                                <textarea
                                    value={extendFormState.motivo}
                                    onChange={(e) => setExtendFormState({ ...extendFormState, motivo: e.target.value })}
                                    required
                                    rows={4}
                                    minLength={10}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Explique o motivo da extensão do prazo (ex: aguardando documentação do cliente, necessidade de revisão adicional, etc.)"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {extendFormState.motivo.length}/10 caracteres
                                </p>
                            </div>

                            {/* Alerta */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                <p className="text-sm text-yellow-800">
                                    <strong>⚠️ Atenção:</strong> A extensão de prazo ficará registrada no histórico da etapa e será visível para toda a equipe.
                                </p>
                            </div>

                            {/* Botões */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setExtendPrazoModalOpen(false);
                                        setEtapaToExtend(null);
                                    }}
                                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold"
                                >
                                    Confirmar Extensão
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'PROPOSTA': return '📋';
        case 'VALIDADO': return '✅';
        case 'APROVADO': return '🎉';
        case 'EXECUCAO': return '🏗️';
        case 'CONCLUIDO': return '🎊';
        case 'CANCELADO': return '❌';
        default: return '';
    }
};

export default ProjetosModerno;
