import React, { useState, useMemo, useEffect, useRef, useContext, useCallback } from 'react';
import { toast } from 'sonner';
import ModalVizualizacaoProjeto from './ModalVizualizacaoProjeto';
import ProjetosEngenhariaTable from './ProjetosEngenhariaTable';
import OsEquipeAnalyticsModal from './OsEquipeAnalyticsModal';
import { isAdmin, isDeveloper } from '../utils/permissions';
import { projetosService, type Projeto, type CreateProjetoData, type UpdateProjetoData } from '../services/projetosService';
import { projetosEngenhariaService, type InfoAtribuicaoOs } from '../services/projetosEngenhariaService';
import { VistoriasCelescPanel } from './os/VistoriasCelescPanel';
import { clientesService, type Cliente } from '../services/clientesService';
import { orcamentosService, type Orcamento } from '../services/orcamentosService';
import { axiosApiService } from '../services/axiosApi';
import { ENDPOINTS } from '../config/api';
import { AuthContext } from '../contexts/AuthContext';
import ViewToggle from './ui/ViewToggle';
import ActionsDropdown from './ui/ActionsDropdown';
import { loadViewMode, saveViewMode } from '../utils/viewModeStorage';
import { calcularHomemHoraTotal, formatMoeda } from '../utils/apropriacaoOs';
import {
  calcularCustoTempoOrcado,
  calcularDiasEstimadosTexto,
  type CockpitResumoItem,
} from '../utils/osCockpit.util';
import { getProjetoEngenhariaActionLabel } from '../utils/projetoEngenhariaUi';

import { useEscapeKey } from '../hooks/useEscapeKey';
import { serverDateToInput, formatDateDisplay } from '../utils/date';

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

interface OrdemServicosHubProps {
    toggleSidebar: () => void;
    onNavigate: (view: string, ...args: any[]) => void;
    onViewBudget: (budgetId: string) => void;
    onViewSale?: (saleId: string) => void;
    onViewClient?: (clientId: string) => void;
    onViewObra?: (obraId: string) => void;
    initialProjectId?: string | null;
    initialProjectTab?: ViewModalTab;
    onClearInitialProject?: () => void;
}

type ViewModalTab = 'geral' | 'materiais' | 'etapas' | 'qualidade';

const OrdemServicosHub: React.FC<OrdemServicosHubProps> = ({ toggleSidebar, onNavigate, onViewBudget, onViewSale, onViewClient, onViewObra, initialProjectId, initialProjectTab = 'geral', onClearInitialProject }) => {
    // ==================== AUTH ====================
    const authContext = useContext(AuthContext);
    const user = authContext?.user;
    
    // Verificar se usuário tem permissão para exclusão permanente
    const canDeletePermanently = useMemo(() => {
        const userRole = user?.role?.toLowerCase();
        return userRole === 'admin' || userRole === 'desenvolvedor';
    }, [user?.role]);

    const canViewKanbanTempoRelatorio = useMemo(
        () => isAdmin(user as any) || isDeveloper(user as any),
        [user]
    );
    
    // ==================== ESTADOS ====================
    const [projetos, setProjetos] = useState<Projeto[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [projectProgressMap, setProjectProgressMap] = useState<Record<string, {
        percentual: number;
        tasksTotal: number;
        tasksConcluidas: number;
        obrasTotal: number;
        obrasConcluidas: number;
    }>>({});
    const [cockpitResumoMap, setCockpitResumoMap] = useState<Record<string, CockpitResumoItem>>({});

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('Todos');
    const [responsavelFilter, setResponsavelFilter] = useState<string>('Todos');
    const [mostrarCancelados, setMostrarCancelados] = useState(false);
    const [minhasTarefasFilter, setMinhasTarefasFilter] = useState(false);
    const [projetoIdsComMinhasTarefas, setProjetoIdsComMinhasTarefas] = useState<Set<string>>(new Set());
    const [projetoIdsComMinhasTarefasAtrasadas, setProjetoIdsComMinhasTarefasAtrasadas] = useState<Set<string>>(new Set());
    const [abaAtiva, setAbaAtiva] = useState<'listagem' | 'concluidos' | 'projetos' | 'vistorias'>('listagem');
    const [contagemEngenharia, setContagemEngenharia] = useState(0);
    const [contagemVistorias, setContagemVistorias] = useState(0);
    const [engenhariaRefreshKey, setEngenhariaRefreshKey] = useState(0);
    const [vistoriasRefreshKey, setVistoriasRefreshKey] = useState(0);
    const [engInfoMap, setEngInfoMap] = useState<Record<string, InfoAtribuicaoOs>>({});
    const [atribuirEngModalOpen, setAtribuirEngModalOpen] = useState(false);
    const [projetoAtribuirEng, setProjetoAtribuirEng] = useState<Projeto | null>(null);
    const [responsavelEngSelecionado, setResponsavelEngSelecionado] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(loadViewMode('Ordem De Serviços'));
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
    const [responsavelAtribuindoId, setResponsavelAtribuindoId] = useState<string | null>(null);
    const [usuarioToEdit, setUsuarioToEdit] = useState<Usuario | null>(null);
    const [memberToDelete, setMemberToDelete] = useState<Usuario | null>(null);
    const [usuarioFormState, setUsuarioFormState] = useState({
        nome: '',
        email: '',
        funcao: ''
    });

    const usuariosOs = useMemo(
        () => usuarios.filter((u) => (u.role || u.funcao || '').toLowerCase() !== 'eletricista'),
        [usuarios]
    );

    const responsaveisOsFiltro = useMemo(() => {
        const idsAtribuidos = new Set(
            projetos.map((p) => p.responsavelId).filter((id): id is string => Boolean(id))
        );
        return usuariosOs.filter((u) => idsAtribuidos.has(u.id));
    }, [projetos, usuariosOs]);

    // Ref para upload de arquivos
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state para criar/editar projeto
    const [formState, setFormState] = useState<CreateProjetoData>({
        titulo: '',
        descricao: '',
        tipo: 'PROJETOS_ELETRICOS',
        clienteId: '',
        responsavelId: '',
        dataInicio: '',
        dataPrevisao: '',
        orcamentoId: '',
        horasEngenhariaOrcadas: 0,
        diariasEquipeOrcadas: 0,
        valorHoraEngenharia: null,
        valorDiariaEquipe: null,
        exigeVistoriaCelesc: false,
    });

    // Search input state para Cliente e Orçamento (filtrar ao digitar)
    const [buscaCliente, setBuscaCliente] = useState('');
    const [buscaOrcamento, setBuscaOrcamento] = useState('');
    const [openDropdownCliente, setOpenDropdownCliente] = useState(false);
    const [openDropdownOrcamento, setOpenDropdownOrcamento] = useState(false);

    const homemHoraReservado = useMemo(() => {
        const h = Number(formState.horasEngenhariaOrcadas) || 0;
        const d = Number(formState.diariasEquipeOrcadas) || 0;
        return calcularHomemHoraTotal(h, d);
    }, [formState.horasEngenhariaOrcadas, formState.diariasEquipeOrcadas]);

    // ==================== CARREGAMENTO DE DADOS ====================
    useEffect(() => {
        loadData();
    }, []);

    // Recalcular progresso quando a lista de projetos mudar (após loadData)
    useEffect(() => {
        if (projetos && projetos.length > 0) {
            fetchProgressForProjects(projetos);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projetos]);

    // Abrir modal de detalhes quando veio de notificação (botão IR) com projeto e aba Kanban
    useEffect(() => {
        if (!initialProjectId || !onClearInitialProject || projetos.length === 0) return;
        const projeto = projetos.find((p) => p.id === initialProjectId);
        if (projeto) {
            setProjetoToView(projeto);
            setViewModalActiveTab(initialProjectTab);
            setIsViewModalOpen(true);
            onClearInitialProject();
        }
    }, [initialProjectId, initialProjectTab, onClearInitialProject, projetos]);

    // Listas filtradas para search input (Cliente e Orçamento) — filtram a cada caractere digitado
    const clientesFiltrados = useMemo(() => {
        const termo = (buscaCliente || '').trim().toLowerCase();
        if (!termo) return clientes;
        return clientes.filter(c => (c.nome || '').toLowerCase().includes(termo) || (c.documento || '').toString().toLowerCase().includes(termo));
    }, [clientes, buscaCliente]);

    const orcamentosFiltrados = useMemo(() => {
        const termo = (buscaOrcamento || '').trim().toLowerCase();
        if (!termo) return orcamentos;
        return orcamentos.filter(o =>
            (o.titulo || '').toLowerCase().includes(termo) ||
            (o.cliente?.nome || '').toLowerCase().includes(termo) ||
            (o.numeroSequencial != null && String(o.numeroSequencial).includes(termo))
        );
    }, [orcamentos, buscaOrcamento]);

    const loadEngInfo = async (ids: string[]) => {
        if (ids.length === 0) {
            setEngInfoMap({});
            return;
        }
        try {
            const res = await projetosEngenhariaService.infoAtribuicao(ids);
            if (res.success && Array.isArray(res.data)) {
                setEngInfoMap((prev) => {
                    const next = { ...prev };
                    for (const row of res.data!) {
                        next[row.projetoId] = row;
                    }
                    return next;
                });
            }
        } catch {
            /* mantém cache anterior em falha parcial */
        }
    };

    const refreshEngInfoForProjeto = async (projetoId: string) => {
        try {
            const res = await projetosEngenhariaService.infoAtribuicao([projetoId]);
            if (res.success && Array.isArray(res.data) && res.data[0]) {
                setEngInfoMap((prev) => ({ ...prev, [projetoId]: res.data![0] }));
            }
        } catch {
            /* mantém cache anterior */
        }
    };

    const loadData = async (opts?: { silent?: boolean }) => {
        try {
            if (!opts?.silent) setLoading(true);
            setError(null);

            const [projetosRes, clientesRes, orcamentosRes, usuariosRes] = await Promise.all([
                projetosService.listar(),
                clientesService.listar(),
                orcamentosService.listar({ status: 'Aprovado' }),
                axiosApiService.get<any[]>('/api/configuracoes/usuarios')
            ]);

            if (projetosRes.success && projetosRes.data) {
                const projetosArray = Array.isArray(projetosRes.data) ? projetosRes.data : [];
                const usuariosArray = usuariosRes.success && Array.isArray(usuariosRes.data)
                    ? usuariosRes.data.map((u: any) => ({
                        id: u.id,
                        nome: u.name || u.nome || '',
                        email: u.email || '',
                        funcao: u.role || u.funcao || '',
                        role: u.role || '',
                    }))
                    : [];
                const enriched = projetosArray.map((p) => {
                    if (p.responsavel?.nome) return p;
                    const u = usuariosArray.find((x) => x.id === p.responsavelId);
                    return u ? { ...p, responsavel: { id: u.id, nome: u.nome } } : p;
                });
                setProjetos(enriched);
                void loadEngInfo(enriched.map((p) => p.id));
                if (opts?.silent) {
                    setProjetoToView((prev) => {
                        if (!prev) return prev;
                        return enriched.find((p) => p.id === prev.id) ?? prev;
                    });
                }
            } else {
                setProjetos([]);
                setEngInfoMap({});
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
                // Permitir que todos os usuários possam ser selecionados/visíveis (não apenas roles técnicas)
                const usuariosArray = Array.isArray(usuariosRes.data) ? usuariosRes.data : [];
                const usuariosMap = usuariosArray.map((u: any) => ({
                    id: u.id,
                    nome: u.name || u.nome || '',
                    email: u.email || '',
                    funcao: u.role || u.funcao || '',
                    role: u.role || ''
                }));
                setUsuarios(usuariosMap);
            } else {
                setUsuarios([]);
            }

            // Após carregar projetos, buscar tasks para calcular progresso real
            if (projetosRes.success && projetosRes.data) {
                fetchProgressForProjects(Array.isArray(projetosRes.data) ? projetosRes.data : []);
            }

            // Atualizar lista de OS com minhas tarefas (a fazer / em andamento)
            try {
                const resMinhas = await axiosApiService.get<{ success: boolean; data: string[] }>('/api/projetos/ids-com-minhas-tarefas');
                if (resMinhas.success && Array.isArray(resMinhas.data)) {
                    setProjetoIdsComMinhasTarefas(new Set(resMinhas.data));
                }
            } catch {
                setProjetoIdsComMinhasTarefas(new Set());
            }

            // Atualizar lista de OS com minhas tarefas atrasadas (prazo expirado)
            try {
                const resAtrasadas = await axiosApiService.get<{ success: boolean; data: string[] }>('/api/projetos/ids-com-minhas-tarefas-atrasadas');
                if (resAtrasadas.success && Array.isArray(resAtrasadas.data)) {
                    setProjetoIdsComMinhasTarefasAtrasadas(new Set(resAtrasadas.data));
                }
            } catch {
                setProjetoIdsComMinhasTarefasAtrasadas(new Set());
            }

            try {
                const resEng = await projetosEngenhariaService.listar();
                if (resEng.success && Array.isArray(resEng.data)) {
                    const ativos = resEng.data.filter(
                        (r: { engenharia?: { statusEngenharia?: string | null } | null }) =>
                            (r.engenharia?.statusEngenharia ?? 'A fazer') !== 'Concluído',
                    );
                    setContagemEngenharia(ativos.length);
                }
            } catch {
                setContagemEngenharia(0);
            }

            try {
                const resVist = await projetosService.listarVistoriasCelesc();
                if (resVist.success && Array.isArray(resVist.data)) {
                    setContagemVistorias(resVist.data.length);
                }
            } catch {
                setContagemVistorias(0);
            }

        } catch (err) {
            setError('Erro ao carregar dados');
            console.error(err);
        } finally {
            if (!opts?.silent) setLoading(false);
        }
    };

    // Busca tasks por projeto e calcula progresso (mesma lógica do modal)
    const fetchProgressForProjects = async (projetosArray: Projeto[]) => {
        try {
            const ids = (projetosArray || []).map(p => p.id).filter(Boolean);
            if (ids.length === 0) return;
            const [resp, cockpitResp] = await Promise.all([
                axiosApiService.get<{ [key: string]: any }>(`/api/projetos/progresso?ids=${ids.join(',')}`),
                projetosService.getCockpitResumo(ids),
            ]);
            if (resp.success && resp.data) {
                setProjectProgressMap(resp.data);
            } else {
                console.warn('Resposta inesperada ao buscar progresso em lote, fallback para cálculo local');
                const map: Record<string, any> = {};
                projetosArray.forEach(p => {
                    map[p.id] = { percentual: calcularProgressoProjeto(p), tasksTotal: 0, tasksConcluidas: 0, obrasTotal: 0, obrasConcluidas: 0 };
                });
                setProjectProgressMap(map);
            }
            if (cockpitResp.success && cockpitResp.data) {
                setCockpitResumoMap(cockpitResp.data);
            }
        } catch (err) {
            console.error('Erro ao buscar progresso de projetos:', err);
            const map: Record<string, any> = {};
            projetosArray.forEach(p => {
                map[p.id] = { percentual: calcularProgressoProjeto(p), tasksTotal: 0, tasksConcluidas: 0, obrasTotal: 0, obrasConcluidas: 0 };
            });
            setProjectProgressMap(map);
        }
    };

    /** Atualiza lista/status sem spinner da página (evita piscar o modal). */
    const refreshModalContext = useCallback(async () => {
        try {
            const projetosRes = await projetosService.listar();
            if (projetosRes.success && projetosRes.data) {
                const projetosArray = Array.isArray(projetosRes.data) ? projetosRes.data : [];
                setProjetos(projetosArray);
                setProjetoToView((prev) => {
                    if (!prev) return prev;
                    const updated = projetosArray.find((p) => p.id === prev.id);
                    if (updated?.id) {
                        void refreshEngInfoForProjeto(updated.id);
                    }
                    return updated ?? prev;
                });
                void fetchProgressForProjects(projetosArray);
            }
        } catch {
            /* silencioso */
        }
    }, []);

    const calcularProgressoProjeto = (projeto: Projeto): number => {
        switch (projeto.status) {
            case 'PROPOSTA': return 10;
            case 'VALIDADO':
            case 'APROVADO': return 40;
            case 'EXECUCAO': return 60;
            case 'CONCLUIDO': return 100;
            case 'CANCELADO': return 0;
            default: return 0;
        }
    };

    // ==================== ABAS: Listagem (em andamento) vs Concluídos (100%) ====================
    const projetosListagemBase = useMemo(() => {
        if (!Array.isArray(projetos)) return [];
        return projetos.filter(projeto => {
            if (!mostrarCancelados && projeto.status === 'CANCELADO') return false;
            const percentual = projectProgressMap[projeto.id]?.percentual ?? calcularProgressoProjeto(projeto);
            const estaConcluido100 = projeto.status === 'CONCLUIDO' && percentual >= 100;
            return !estaConcluido100; // Listagem: tudo que NÃO é concluído 100%
        });
    }, [projetos, mostrarCancelados, projectProgressMap]);

    const projetosConcluidosBase = useMemo(() => {
        if (!Array.isArray(projetos)) return [];
        return projetos.filter(projeto => {
            if (projeto.status === 'CANCELADO') return false;
            const percentual = projectProgressMap[projeto.id]?.percentual ?? calcularProgressoProjeto(projeto);
            return projeto.status === 'CONCLUIDO' && percentual >= 100;
        });
    }, [projetos, projectProgressMap]);

    const engenhariaAtribuicaoModal = useMemo(() => {
        if (!projetoToView) return undefined;
        const info = engInfoMap[projetoToView.id];
        return {
            precisaEquipeEngenharia: true,
            atribuido: Boolean(info?.atribuido),
            responsavelNome: info?.responsavelNome ?? null,
            statusEngenharia: info?.statusEngenharia ?? null,
        };
    }, [projetoToView, engInfoMap]);

    // ==================== FILTROS ====================
    const filteredProjetos = useMemo(() => {
        const base = abaAtiva === 'concluidos' ? projetosConcluidosBase : projetosListagemBase;
        if (!base.length) return [];

        return base.filter(projeto => {
            if (minhasTarefasFilter && !projetoIdsComMinhasTarefas.has(projeto.id)) return false;

            const matchesSearch =
                projeto.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                projeto.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                projeto.cliente?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                projeto.id.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'Todos' || projeto.status === statusFilter;
            const matchesResponsavel = responsavelFilter === 'Todos' || projeto.responsavelId === responsavelFilter;

            return matchesSearch && matchesStatus && matchesResponsavel;
        });
    }, [abaAtiva, projetosListagemBase, projetosConcluidosBase, searchTerm, statusFilter, responsavelFilter, minhasTarefasFilter, projetoIdsComMinhasTarefas]);

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
                responsavelId: projeto.responsavelId || '',
                dataInicio: serverDateToInput(projeto.dataInicio as any),
                dataPrevisao: serverDateToInput(projeto.dataPrevisao as any),
                orcamentoId: projeto.orcamentoId || '',
                horasEngenhariaOrcadas: projeto.horasEngenhariaOrcadas ?? 0,
                diariasEquipeOrcadas: projeto.diariasEquipeOrcadas ?? 0,
                valorHoraEngenharia: projeto.valorHoraEngenharia ?? null,
                valorDiariaEquipe: projeto.valorDiariaEquipe ?? null,
                exigeVistoriaCelesc: Boolean(projeto.exigeVistoriaCelesc),
            });
        } else {
            setProjetoToEdit(null);
            setFormState({
                titulo: '',
                descricao: '',
                tipo: 'PROJETOS_ELETRICOS',
                clienteId: '',
                responsavelId: '',
                dataInicio: '',
                dataPrevisao: '',
                orcamentoId: '',
                horasEngenhariaOrcadas: 0,
                diariasEquipeOrcadas: 0,
                valorHoraEngenharia: null,
                valorDiariaEquipe: null,
                exigeVistoriaCelesc: false,
            });
            setBuscaCliente('');
            setBuscaOrcamento('');
        }
        setOpenDropdownCliente(false);
        setOpenDropdownOrcamento(false);
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

        void refreshEngInfoForProjeto(projeto.id);
        setIsViewModalOpen(true);
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projetoToEdit && !formState.orcamentoId) {
            toast.error('Selecione um orçamento aprovado');
            return;
        }
        if (!formState.responsavelId) {
            toast.error('Selecione o gerente do projeto');
            return;
        }
        if (!formState.dataInicio || !formState.dataPrevisao) {
            toast.error('Informe as datas de início e fim');
            return;
        }
        const horas = Number(formState.horasEngenhariaOrcadas) || 0;
        const diarias = Number(formState.diariasEquipeOrcadas) || 0;
        if (horas <= 0 && diarias <= 0) {
            toast.error('Informe horas de engenharia ou diárias de equipe orçadas');
            return;
        }
        try {
            if (projetoToEdit) {
                const { orcamentoId: _orcamentoId, ...updatePayload } = formState;
                const response = await projetosService.atualizar(projetoToEdit.id, updatePayload);
                if (response.success && response.data) {
                    const updated = response.data;
                    const responsavelUsuario = updated.responsavelId
                        ? usuariosOs.find((u) => u.id === updated.responsavelId)
                        : undefined;
                    const merged = {
                        ...updated,
                        responsavel: updated.responsavel ?? (responsavelUsuario
                            ? { id: responsavelUsuario.id, nome: responsavelUsuario.nome }
                            : undefined),
                    };
                    setProjetos((prev) => prev.map((p) => (p.id === projetoToEdit.id ? merged : p)));
                    setIsCreateModalOpen(false);
                    setProjetoToEdit(null);
                    setVistoriasRefreshKey((k) => k + 1);
                    toast.success('Ordem de serviço atualizada');
                }
            } else {
                const response = await projetosService.criar(formState);
                if (response.success && response.data) {
                    const created = response.data;
                    const responsavelUsuario = created.responsavelId
                        ? usuariosOs.find((u) => u.id === created.responsavelId)
                        : undefined;
                    const merged = {
                        ...created,
                        responsavel: created.responsavel ?? (responsavelUsuario
                            ? { id: responsavelUsuario.id, nome: responsavelUsuario.nome }
                            : undefined),
                    };
                    setProjetos(prev => [merged, ...prev]);
                    setIsCreateModalOpen(false);
                    setVistoriasRefreshKey((k) => k + 1);
                }
            }
        } catch (err: unknown) {
            const message =
                (err as { response?: { data?: { error?: string } } })?.response?.data?.error
                || 'Erro ao salvar ordem de serviço';
            toast.error(message);
        }
    };

    const abrirAtribuirEngenharia = (projeto: Projeto) => {
        const info = engInfoMap[projeto.id];
        setProjetoAtribuirEng(projeto);
        setResponsavelEngSelecionado(info?.responsavelEngenhariaId ?? '');
        setAtribuirEngModalOpen(true);
    };

    const confirmarAtribuirEngenharia = async () => {
        if (!projetoAtribuirEng) return;
        const jaAtribuido = engInfoMap[projetoAtribuirEng.id]?.atribuido;
        if (jaAtribuido && !responsavelEngSelecionado) {
            toast.error('Selecione o novo projetista');
            return;
        }
        try {
            const responsavelId =
                responsavelEngSelecionado || user?.id || null;
            const res = await projetosEngenhariaService.atribuir(
                projetoAtribuirEng.id,
                responsavelId,
            );
            if (res.success) {
                toast.success(jaAtribuido ? 'Projetista atualizado' : 'OS atribuída ao setor de engenharia');
                setAtribuirEngModalOpen(false);
                setProjetoAtribuirEng(null);
                setEngenhariaRefreshKey((k) => k + 1);
                void loadData({ silent: true });
                if (projetoAtribuirEng) void refreshEngInfoForProjeto(projetoAtribuirEng.id);
            } else {
                toast.error(res.error || 'Erro ao atribuir à engenharia');
            }
        } catch {
            toast.error('Erro ao atribuir à engenharia');
        }
    };

    const handleResponsavelOsChange = async (projetoId: string, responsavelId: string) => {
        try {
            setResponsavelAtribuindoId(projetoId);
            const response = await projetosService.atualizar(projetoId, { responsavelId });
            if (response.success && response.data) {
                const updated = response.data;
                const responsavelUsuario = responsavelId
                    ? usuariosOs.find((u) => u.id === responsavelId)
                    : undefined;
                const merged = {
                    ...updated,
                    responsavel: updated.responsavel ?? (responsavelUsuario
                        ? { id: responsavelUsuario.id, nome: responsavelUsuario.nome }
                        : undefined),
                };
                setProjetos((prev) => prev.map((p) => (p.id === projetoId ? merged : p)));
                toast.success('Responsável da OS atualizado');
            }
        } catch {
            toast.error('Erro ao atualizar responsável da OS');
        } finally {
            setResponsavelAtribuindoId(null);
        }
    };

    const usuariosEngenhariaOptions = useMemo(
        () => usuarios.map((u) => ({ id: u.id, name: u.nome })),
        [usuarios],
    );

    const handleOpenOsFromEngenharia = (projetoId: string) => {
        const projeto = projetos.find((p) => p.id === projetoId);
        if (projeto) {
            handleOpenViewModal(projeto);
        } else {
            void projetosService.buscar(projetoId).then((res) => {
                if (res.success && res.data) handleOpenViewModal(res.data);
            });
        }
    };

    const buildProjetoActions = useCallback((projeto: Projeto) => {
        const atribuido = Boolean(engInfoMap[projeto.id]?.atribuido);
        return [
            {
                label: 'Visualizar',
                icon: <EyeIcon className="w-4 h-4" />,
                onClick: () => handleOpenViewModal(projeto),
            },
            {
                label: 'Editar',
                icon: <PencilIcon className="w-4 h-4" />,
                onClick: () => handleOpenCreateModal(projeto),
            },
            {
                label: getProjetoEngenhariaActionLabel(atribuido),
                icon: <CubeIcon className="w-4 h-4" />,
                onClick: () => abrirAtribuirEngenharia(projeto),
                variant: 'primary' as const,
            },
            {
                label: 'Excluir',
                icon: <TrashIcon className="w-4 h-4" />,
                onClick: () => setProjetoToDelete(projeto),
                variant: 'danger' as const,
            },
        ];
    }, [engInfoMap]);

    // Fechar modais com ESC
    useEscapeKey(isCreateModalOpen, () => setIsCreateModalOpen(false));
    useEscapeKey(isViewModalOpen, () => {
        setIsViewModalOpen(false);
        setProjetoToView(null);
    });
    useEscapeKey(isTeamModalOpen, () => setIsTeamModalOpen(false));
    useEscapeKey(isTaskModalOpen, () => setIsTaskModalOpen(false));
    useEscapeKey(extendPrazoModalOpen, () => setExtendPrazoModalOpen(false));
    useEscapeKey(atribuirEngModalOpen, () => setAtribuirEngModalOpen(false));

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
                        description: 'Você pode acessá-la em Execução Obra'
                    });
                    setProjetos(prev => prev.map(p => 
                        p.id === projetoToView.id ? { ...p, status: 'Em Execução' } : p
                    ));
                    setIsViewModalOpen(false);
                    onNavigate('Execução Obra');
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

    // ==================== RENDER ====================
    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Carregando projetos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-white dark:hover:bg-dark-card hover:shadow-soft">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">Ordem De Serviços</h1>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">Hub central de gerenciamento de ordens de serviço</p>
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
                        onClick={() => { loadData(); fetchProgressForProjects(projetos); }}
                        className="flex items-center gap-2 px-4 py-3 bg-yellow-50 text-yellow-800 rounded-xl hover:bg-yellow-100 transition-all font-semibold shadow-soft dark:bg-yellow-900/25 dark:text-yellow-200 dark:hover:bg-yellow-900/40 dark:border dark:border-yellow-800/40"
                        title="Atualizar projetos"
                    >
                        ↻ Atualizar
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

            {/* Abas de Navegação: Listagem | Projetos | Concluídos */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border mb-6">
                <div className="flex border-b border-gray-200 dark:border-dark-border">
                    <button
                        type="button"
                        onClick={() => setAbaAtiva('listagem')}
                        className={`flex-1 px-6 py-4 text-center font-semibold transition-all ${abaAtiva === 'listagem'
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                            : 'text-gray-600 dark:text-dark-text-secondary hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-dark-card'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <span>📋</span>
                            <span>Listagem</span>
                            {abaAtiva === 'listagem' && (
                                <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                                    {filteredProjetos.length}
                                </span>
                            )}
                            {abaAtiva !== 'listagem' && projetosListagemBase.length > 0 && (
                                <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                                    {projetosListagemBase.length}
                                </span>
                            )}
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={() => setAbaAtiva('projetos')}
                        className={`flex-1 px-6 py-4 text-center font-semibold transition-all ${abaAtiva === 'projetos'
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                            : 'text-gray-600 dark:text-dark-text-secondary hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-dark-card'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <span>📐</span>
                            <span>Projetos</span>
                            {contagemEngenharia > 0 && (
                                <span className={`px-2 py-0.5 text-xs rounded-full ${abaAtiva === 'projetos' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                                    {contagemEngenharia}
                                </span>
                            )}
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={() => setAbaAtiva('vistorias')}
                        className={`flex-1 px-6 py-4 text-center font-semibold transition-all ${abaAtiva === 'vistorias'
                            ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-600 dark:border-cyan-400 bg-cyan-50 dark:bg-cyan-900/20'
                            : 'text-gray-600 dark:text-dark-text-secondary hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-gray-50 dark:hover:bg-dark-card'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <span>🔎</span>
                            <span>Vistorias</span>
                            {contagemVistorias > 0 && (
                                <span className={`px-2 py-0.5 text-xs rounded-full ${abaAtiva === 'vistorias' ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                                    {contagemVistorias}
                                </span>
                            )}
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={() => setAbaAtiva('concluidos')}
                        className={`flex-1 px-6 py-4 text-center font-semibold transition-all ${abaAtiva === 'concluidos'
                            ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'text-gray-600 dark:text-dark-text-secondary hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-50 dark:hover:bg-dark-card'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <span>✅</span>
                            <span>Concluídos</span>
                            {abaAtiva === 'concluidos' && (
                                <span className="px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full">
                                    {filteredProjetos.length}
                                </span>
                            )}
                            {abaAtiva !== 'concluidos' && projetosConcluidosBase.length > 0 && (
                                <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                                    {projetosConcluidosBase.length}
                                </span>
                            )}
                        </div>
                    </button>
                </div>
            </div>

            {abaAtiva === 'projetos' ? (
                <ProjetosEngenhariaTable
                    onOpenOs={handleOpenOsFromEngenharia}
                    refreshKey={engenhariaRefreshKey}
                    onProgressRefresh={() => {
                        void fetchProgressForProjects(projetos);
                    }}
                    onEngenhariaUpdated={(projetoId) => {
                        void refreshEngInfoForProjeto(projetoId);
                    }}
                    onActiveCountChange={setContagemEngenharia}
                />
            ) : abaAtiva === 'vistorias' ? (
                <VistoriasCelescPanel
                    refreshKey={vistoriasRefreshKey}
                    onCountChange={setContagemVistorias}
                    onOpenOs={(item) => {
                        void handleOpenViewModal(item as Projeto);
                    }}
                />
            ) : (
            <>
            {/* Filtros e Busca */}
            <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border mb-6">
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
                            <option value="PROPOSTA">📋 Pendente</option>
                            <option value="APROVADO">🎉 Aprovada</option>
                            <option value="EXECUCAO">🏗️ Execução</option>
                            <option value="CONCLUIDO">🎊 Concluída</option>
                            <option value="CANCELADO">❌ Cancelado</option>
                        </select>
                    </div>

                    {/* Filtro por Responsável */}
                    <div>
                        <select
                            value={responsavelFilter}
                            onChange={(e) => setResponsavelFilter(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all dark:bg-dark-card dark:border-dark-border dark:text-dark-text"
                        >
                            <option value="Todos">Todos Responsáveis</option>
                            {responsaveisOsFiltro.map((usuario) => (
                                <option key={usuario.id} value={usuario.id}>
                                    {usuario.nome}
                                </option>
                            ))}
                        </select>
                    </div>
                    {abaAtiva === 'concluidos' && (
                        <div className="md:col-span-4 flex items-center">
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-700 rounded-xl p-3 w-full">
                                <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                                    ✅ Exibindo apenas ordens de serviço concluídas (status Concluído e progresso 100%)
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Resultado da Busca */}
                <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                        {abaAtiva === 'concluidos' ? (
                            <>Exibindo <span className="font-bold text-gray-900 dark:text-dark-text">{filteredProjetos.length}</span> de <span className="font-bold text-gray-900 dark:text-dark-text">{projetosConcluidosBase.length}</span> OS concluídas</>
                        ) : (
                            <>Exibindo <span className="font-bold text-gray-900 dark:text-dark-text">{filteredProjetos.length}</span> de <span className="font-bold text-gray-900 dark:text-dark-text">{projetosListagemBase.length}</span> ordens de serviço</>
                        )}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                        <ViewToggle view={viewMode} onViewChange={handleViewModeChange} />
                        
                        {/* Filtro: Somente OS com minhas tarefas (a fazer / em andamento no Kanban) */}
                        <label className="flex items-center gap-2 cursor-pointer" title="Exibir apenas OS em que você tem tarefas pendentes ou em andamento no Kanban">
                            <input
                                type="checkbox"
                                checked={minhasTarefasFilter}
                                onChange={(e) => setMinhasTarefasFilter(e.target.checked)}
                                className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                            />
                            <span className="text-sm text-gray-600">Somente OS com minhas tarefas</span>
                        </label>
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
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border p-16 text-center">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-dark-border rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">{abaAtiva === 'concluidos' ? '✅' : '📋'}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-2">
                        {abaAtiva === 'concluidos'
                            ? 'Nenhuma OS concluída'
                            : 'Nenhuma ordem de serviço encontrada'}
                    </h3>
                    <p className="text-gray-500 dark:text-dark-text-secondary mb-6">
                        {abaAtiva === 'concluidos'
                            ? 'Não há ordens de serviço com status Concluído e progresso 100% no momento.'
                            : searchTerm || statusFilter !== 'Todos' || responsavelFilter !== 'Todos' || minhasTarefasFilter
                                ? 'Tente ajustar os filtros de busca'
                                : 'Comece criando sua primeira ordem de serviço'}
                    </p>
                    {abaAtiva === 'listagem' && !searchTerm && statusFilter === 'Todos' && responsavelFilter === 'Todos' && !minhasTarefasFilter && (
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
                        // Calcular progresso real do projeto (usar valor calculado por fetchProgressForProjects quando disponível)
                        const progresso = projectProgressMap[projeto.id]?.percentual ?? calcularProgressoProjeto(projeto);
                        const numeroOS = gerarNumeroOS(projeto);
                        const temMinhasTarefas = projetoIdsComMinhasTarefas.has(projeto.id);
                        const temMinhasTarefasAtrasadas = projetoIdsComMinhasTarefasAtrasadas.has(projeto.id);
                        const cockpitResumo = cockpitResumoMap[projeto.id];
                        const custoTempoOrcado =
                            cockpitResumo?.custoTempoOrcado ??
                            calcularCustoTempoOrcado({
                                horasEngenhariaOrcadas: projeto.horasEngenhariaOrcadas ?? 0,
                                diariasEquipeOrcadas: projeto.diariasEquipeOrcadas ?? 0,
                                valorHoraEngenharia: projeto.valorHoraEngenharia,
                                valorDiariaEquipe: projeto.valorDiariaEquipe,
                            });
                        const diasEstimadosTexto = calcularDiasEstimadosTexto(
                            cockpitResumo?.diariasEquipeOrcadas ?? projeto.diariasEquipeOrcadas ?? 0,
                            projeto.dataInicio,
                            projeto.dataPrevisao
                        );
                        const estouroPrazo =
                            projeto.status === 'EXECUCAO' &&
                            cockpitResumo != null &&
                            (cockpitResumo.estouroDiarias || cockpitResumo.estouroDiasCorridos);
                        
                        return (
                            <div
                                key={projeto.id}
                                className={`bg-white rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all duration-200 relative group ${
                                    estouroPrazo && !temMinhasTarefasAtrasadas
                                        ? 'border-2 border-red-500 hover:border-red-600'
                                        : temMinhasTarefasAtrasadas && temMinhasTarefas
                                        ? 'border-2 border-red-600 hover:border-red-700 ring-2 ring-inset ring-amber-400 dark:ring-amber-500'
                                        : temMinhasTarefasAtrasadas
                                            ? 'border-2 border-red-600 hover:border-red-700'
                                            : temMinhasTarefas
                                                ? 'border-2 border-amber-400 hover:border-amber-500 dark:border-amber-500 dark:hover:border-amber-400'
                                                : 'border border-gray-200 hover:border-blue-300'
                                }`}
                            >
                                {/* Menu de Ações */}
                                <div className="absolute top-4 right-4">
                                    <ActionsDropdown label="Ações" actions={buildProjetoActions(projeto)} />
                                </div>

                                {/* Conteúdo do Card */}
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                                            {numeroOS}
                                        </span>
                                        {temMinhasTarefasAtrasadas && (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-red-600 px-2 py-1 rounded-md border border-red-700 shadow-sm" title="Você tem tarefa(s) atrasada(s) nesta OS">
                                                Atrasada
                                            </span>
                                        )}
                                        {temMinhasTarefas && (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-200 px-2 py-1 rounded-md border border-amber-400 shadow-sm dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-600" title="Você tem tarefas a fazer ou em andamento nesta OS">
                                                Minhas tarefas
                                            </span>
                                        )}
                                        {estouroPrazo && (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-red-600 px-2 py-1 rounded-md border border-red-700 shadow-sm" title="Dias corridos ou diárias realizadas ultrapassaram a estimativa">
                                                Estouro de prazo
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-900 mb-2 pr-8">{projeto.titulo}</h3>
                                    <p className="text-sm text-gray-600 line-clamp-2">{projeto.descricao}</p>
                                </div>

                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">Cliente:</span>
                                        <span className="text-sm font-semibold text-gray-900">{projeto.cliente?.nome || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-gray-500 shrink-0">Responsável:</span>
                                        <select
                                            value={projeto.responsavelId || ''}
                                            disabled={responsavelAtribuindoId === projeto.id}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                void handleResponsavelOsChange(projeto.id, e.target.value);
                                            }}
                                            className="text-sm font-medium text-gray-700 border border-gray-200 rounded-lg px-2 py-1 max-w-[55%] truncate bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Selecionar...</option>
                                            {usuariosOs.map((usuario) => (
                                                <option key={usuario.id} value={usuario.id}>
                                                    {usuario.nome}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">Status:</span>
                                        <span className={`px-3 py-1 text-xs font-bold rounded-lg ${getStatusColor(projeto.status)}`}>
                                            {getStatusLabel(projeto.status)}
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

                                {/* Prazo e custo de tempo */}
                                <div className="mb-4 p-3 bg-blue-50 dark:bg-dark-elevated rounded-xl border border-blue-100 dark:border-dark-border space-y-2">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <span className="text-xs font-medium text-gray-600 dark:text-dark-text-secondary">Estimativa</span>
                                        <span className="text-xs font-bold text-blue-700 dark:text-dark-accent-light bg-blue-100 dark:bg-dark-accent-soft px-2 py-0.5 rounded-md">
                                            {diasEstimadosTexto}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-medium text-gray-600 dark:text-dark-text-secondary">Custo tempo orçado</span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-dark-text">{formatMoeda(custoTempoOrcado)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-medium text-gray-600 dark:text-dark-text-secondary">Data limite</span>
                                        <span className="text-sm font-bold text-blue-700 dark:text-dark-accent-light">
                                            {formatDateDisplay((cockpitResumo?.dataPrevisao ?? projeto.dataPrevisao) as any) || '—'}
                                        </span>
                                    </div>
                                </div>

                                {/* Datas */}
                                <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
                                    <span>Início: {formatDateDisplay(projeto.dataInicio as any)}</span>
                                    <span className="text-gray-400">Execução física</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ): (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-soft" style={{ overflow: 'visible', position: 'relative' }}>
                    <div className="overflow-x-auto" style={{ overflowY: 'visible' }}>
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Ordem De Serviço</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Cliente</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Valor</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Início</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredProjetos.map((projeto) => {
                                const numeroOS = gerarNumeroOS(projeto);
                                const temMinhasTarefasLista = projetoIdsComMinhasTarefas.has(projeto.id);
                                const temMinhasTarefasAtrasadasLista = projetoIdsComMinhasTarefasAtrasadas.has(projeto.id);
                                return (
                                <tr
                                    key={projeto.id}
                                    className={`hover:bg-gray-50 transition-colors ${
                                        temMinhasTarefasAtrasadasLista && temMinhasTarefasLista
                                            ? 'border-l-4 border-l-red-600 shadow-[inset_4px_0_0_0_rgb(251,191,36)]'
                                            : temMinhasTarefasAtrasadasLista
                                                ? 'border-l-4 border-l-red-600'
                                                : temMinhasTarefasLista
                                                    ? 'border-l-4 border-l-amber-400'
                                                    : ''
                                    }`}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                                                {numeroOS}
                                            </span>
                                            {temMinhasTarefasAtrasadasLista && (
                                                <span className="text-xs font-bold text-white bg-red-600 px-2 py-1 rounded border border-red-700" title="Você tem tarefa(s) atrasada(s) nesta OS">
                                                    Atrasada
                                                </span>
                                            )}
                                            {temMinhasTarefasLista && (
                                                <span className="text-xs font-bold text-amber-800 bg-amber-200 px-2 py-1 rounded border border-amber-400 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-600" title="Você tem tarefas nesta OS">
                                                    Minhas tarefas
                                                </span>
                                            )}
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
                                            {getStatusLabel(projeto.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4" style={{ position: 'relative', overflow: 'visible', zIndex: 'auto' }}>
                                        <div className="flex items-center justify-center" style={{ position: 'relative' }}>
                                            <ActionsDropdown label="Ações" actions={buildProjetoActions(projeto)} />
                                        </div>
                                    </td>
                                </tr>
                            );
                            })}
                        </tbody>
                    </table>
                    </div>
                </div>
            )}

            </>
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

                                <div className="md:col-span-2 p-4 rounded-xl bg-indigo-50 dark:bg-dark-elevated border border-indigo-200 dark:border-indigo-800/40">
                                    <div className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">Recursos reservados (homem-hora)</div>
                                    <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mt-1">
                                        {homemHoraReservado.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h
                                    </div>
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                                        {Number(formState.horasEngenhariaOrcadas) || 0}h engenharia + {Number(formState.diariasEquipeOrcadas) || 0} diárias × 8h
                                    </p>
                                </div>

                                <div className="relative">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Cliente
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.clienteId ? (clientes.find(c => c.id === formState.clienteId)?.nome ?? '') : buscaCliente}
                                        onChange={(e) => {
                                            setBuscaCliente(e.target.value);
                                            if (formState.clienteId) setFormState(prev => ({ ...prev, clienteId: '' }));
                                            setOpenDropdownCliente(true);
                                        }}
                                        onFocus={() => setOpenDropdownCliente(true)}
                                        onBlur={() => setTimeout(() => setOpenDropdownCliente(false), 200)}
                                        placeholder="Digite para buscar o cliente..."
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    {openDropdownCliente && (
                                        <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1">
                                            {clientesFiltrados.length === 0 ? (
                                                <li className="px-4 py-3 text-gray-500 text-sm">Nenhum cliente encontrado</li>
                                            ) : (
                                                clientesFiltrados.map(cliente => (
                                                    <li
                                                        key={cliente.id}
                                                        onMouseDown={(e) => { e.preventDefault(); setFormState(prev => ({ ...prev, clienteId: cliente.id })); setBuscaCliente(''); setOpenDropdownCliente(false); }}
                                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                                    >
                                                        {cliente.nome}{cliente.documento ? ` — ${cliente.documento}` : ''}
                                                    </li>
                                                ))
                                            )}
                                        </ul>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Gerente do Projeto *
                                    </label>
                                    <select
                                        value={formState.responsavelId}
                                        onChange={(e) => setFormState({...formState, responsavelId: e.target.value})}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Selecione o responsável</option>
                                        {usuariosOs.map(usuario => (
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
                                        <option value="PROJETOS_ELETRICOS">Projetos Elétricos</option>
                                        <option value="LAUDO_TECNICO">Laudo Técnico</option>
                                        <option value="MANUTENCAO_EMERGENCIA">Manutenção / Emergência</option>
                                        <option value="QUADROS_PAINEIS">Quadros e Painéis</option>
                                        <option value="DESLIGAMENTO">Desligamento</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2 relative">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Orçamento *
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.orcamentoId ? (() => { const o = orcamentos.find(or => or.id === formState.orcamentoId); return o ? `${o.titulo} — ${o.cliente?.nome || ''} — R$ ${(o.precoVenda ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''; })() : buscaOrcamento}
                                        onChange={(e) => {
                                            setBuscaOrcamento(e.target.value);
                                            if (formState.orcamentoId) setFormState(prev => ({ ...prev, orcamentoId: '' }));
                                            setOpenDropdownOrcamento(true);
                                        }}
                                        onFocus={() => setOpenDropdownOrcamento(true)}
                                        onBlur={() => setTimeout(() => setOpenDropdownOrcamento(false), 200)}
                                        placeholder="Digite para buscar orçamento aprovado..."
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    {openDropdownOrcamento && (
                                        <ul className="absolute z-10 mt-1 w-full max-h-56 overflow-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1">
                                            {orcamentosFiltrados.length === 0 ? (
                                                <li className="px-4 py-3 text-gray-500 text-sm">Nenhum orçamento encontrado</li>
                                            ) : (
                                                orcamentosFiltrados.map(orcamento => (
                                                    <li
                                                        key={orcamento.id}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            const previsaoInicio = orcamento.previsaoInicio;
                                                            const previsaoTermino = orcamento.previsaoTermino;
                                                            setFormState(prev => ({
                                                                ...prev,
                                                                orcamentoId: orcamento.id,
                                                                dataInicio: previsaoInicio ? serverDateToInput(previsaoInicio) : prev.dataInicio,
                                                                dataPrevisao: previsaoTermino ? serverDateToInput(previsaoTermino) : prev.dataPrevisao
                                                            }));
                                                            setBuscaOrcamento('');
                                                            setOpenDropdownOrcamento(false);
                                                        }}
                                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                                    >
                                                        {orcamento.titulo} — {orcamento.cliente?.nome || 'N/A'} — R$ {(orcamento.precoVenda ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </li>
                                                ))
                                            )}
                                        </ul>
                                    )}
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
                                        Data Fim *
                                    </label>
                                    <input
                                        type="date"
                                        value={formState.dataPrevisao}
                                        onChange={(e) => setFormState({...formState, dataPrevisao: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Horas Engenharia Orçadas *
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={formState.horasEngenhariaOrcadas ?? 0}
                                        onChange={(e) => setFormState({...formState, horasEngenhariaOrcadas: Number(e.target.value)})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Diárias Equipe Orçadas *
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={formState.diariasEquipeOrcadas ?? 0}
                                        onChange={(e) => setFormState({...formState, diariasEquipeOrcadas: Number(e.target.value)})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Valor Hora Engenharia (R$)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formState.valorHoraEngenharia ?? ''}
                                        onChange={(e) => setFormState({...formState, valorHoraEngenharia: e.target.value === '' ? null : Number(e.target.value)})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Valor Diária Equipe (R$)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formState.valorDiariaEquipe ?? ''}
                                        onChange={(e) => setFormState({...formState, valorDiariaEquipe: e.target.value === '' ? null : Number(e.target.value)})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="flex items-start gap-3 p-4 rounded-xl border border-cyan-200 dark:border-cyan-800/40 bg-cyan-50 dark:bg-dark-elevated cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(formState.exigeVistoriaCelesc)}
                                            onChange={(e) =>
                                                setFormState({
                                                    ...formState,
                                                    exigeVistoriaCelesc: e.target.checked,
                                                })
                                            }
                                            className="mt-1 h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                                        />
                                        <span>
                                            <span className="block text-sm font-semibold text-cyan-900 dark:text-cyan-300">
                                                Exige Vistoria CELESC
                                            </span>
                                            <span className="block text-xs text-cyan-700 dark:text-cyan-400 mt-0.5">
                                                Após a aprovação da OS, o projeto entra automaticamente na fila da aba Vistorias.
                                            </span>
                                        </span>
                                    </label>
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
                    onRefresh={refreshModalContext}
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
                    engenhariaAtribuicao={engenhariaAtribuicaoModal}
                    onAtribuirEngenharia={() => {
                        if (projetoToView) abrirAtribuirEngenharia(projetoToView);
                    }}
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
                <OsEquipeAnalyticsModal
                    isOpen={isTeamModalOpen}
                    onClose={() => setIsTeamModalOpen(false)}
                    canView={canViewKanbanTempoRelatorio}
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

            {/* MODAL — ATRIBUIR À ENGENHARIA */}
            {atribuirEngModalOpen && projetoAtribuirEng && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong max-w-md w-full p-6 border border-gray-100 dark:border-dark-border">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-2 flex items-center gap-2">
                            <CubeIcon className="w-6 h-6 text-blue-600" />
                            {engInfoMap[projetoAtribuirEng.id]?.atribuido
                                ? 'Alterar projetista'
                                : 'Atribuir à Engenharia'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                            {engInfoMap[projetoAtribuirEng.id]?.atribuido ? (
                                <>
                                    Atualize o projetista responsável pela OS <strong>{projetoAtribuirEng.titulo}</strong>.
                                </>
                            ) : (
                                <>
                                    A OS <strong>{projetoAtribuirEng.titulo}</strong> entrará na <strong>sua</strong> lista na aba Projetos.
                                    Se não escolher responsável, você será o projetista responsável.
                                </>
                            )}
                        </p>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                            Projetista responsável
                        </label>
                        <select
                            value={responsavelEngSelecionado}
                            onChange={(e) => setResponsavelEngSelecionado(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl mb-6 dark:bg-dark-card dark:text-dark-text"
                        >
                            <option value="">Selecionar depois…</option>
                            {usuariosEngenhariaOptions.map((u) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setAtribuirEngModalOpen(false);
                                    setProjetoAtribuirEng(null);
                                }}
                                className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-semibold"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => void confirmarAtribuirEngenharia()}
                                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'PROPOSTA': return '📋';
        case 'VALIDADO':
        case 'APROVADO': return '🎉';
        case 'EXECUCAO': return '🏗️';
        case 'CONCLUIDO': return '🎊';
        case 'CANCELADO': return '❌';
        default: return '';
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'PROPOSTA': return 'Pendente';
        case 'VALIDADO':
        case 'APROVADO': return 'Aprovada';
        case 'EXECUCAO': return 'Execução';
        case 'CONCLUIDO': return 'Concluída';
        case 'CANCELADO': return 'Cancelado';
        default: return status;
    }
};

export default OrdemServicosHub;
