import React, { useState, useMemo, useRef, useEffect, useContext } from 'react';
import { toast } from 'sonner';
import ModalAlocacaoEquipe from './Obras/ModalAlocacaoEquipe';
import { alocacaoObraService, type AlocacaoDTO } from '../services/AlocacaoObraService';
import GanttChart, { type GanttItem } from './GanttChart';

import { useEscapeKey } from '../hooks/useEscapeKey';
import { useSKey } from '../hooks/useSKey';
import { 
    ProjectStatus,
    type User, UserRole,
    type ProjectStage, ProjectStageStatus
} from '../types';
import { projetosService, type Projeto, type CreateProjetoData } from '../services/projetosService';
import { clientesService, type Cliente } from '../services/clientesService';
import { obrasService } from '../services/obrasService';
import { axiosApiService } from '../services/axiosApi';
import { AuthContext } from '../contexts/AuthContext';

// Tipos locais para obra
type ProjectType = 'Instalacao' | 'Manutencao' | 'Retrofit' | 'Automacao';

// Interface local para obra (formatação do frontend)
interface Project {
    id: string;
    titulo: string;
    descricao: string;
    cliente: {
        id: string;
        nome: string;
        cpfCnpj: string;
    };
    tipo: ProjectType;
    status: ProjectStatus;
    dataInicio: string;
    dataFim: string;
    orcamento: number;
    progresso: number;
    responsavel: {
        id: string;
        nome: string;
        role: UserRole;
    };
    equipe: User[];
    endereco: string;
    observacoes: string;
    etapas: ProjectStage[];
}

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
const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);
const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);
const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const Cog6ToothIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.242 1.434l-1.005.827c-.294.24-.438.613-.438.995a6.473 6.473 0 010 .255c0 .382.144.755.438.995l1.005.827c.48.398.668 1.036.242 1.434l-1.296 2.247a1.125 1.125 0 01-1.37.49l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.324-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.242-1.434l1.006-.827c.294-.24.438-.613.438-.995a6.473 6.473 0 010-.255c0-.382-.144-.755-.438-.995l-1.006-.827a1.125 1.125 0 01-.242-1.434l1.296-2.247a1.125 1.125 0 011.37-.49l1.217.456c.355.133.75.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.213-1.28z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const CheckBadgeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c.552 0 1.005-.449.95-.998a10.928 10.928 0 00-2.761-6.15m2.761 6.15A9.005 9.005 0 0112 21c-2.172 0-4.15-.774-5.653-2.056M21 12a9.005 9.005 0 00-9.95-8.998c-.801.076-1.05.95-.45 1.45L12 5.25l1.4-1.798c.6-.5 1.351-.374 1.45.45M3 12c-.552 0-1.005.449-.95.998a10.928 10.928 0 002.761 6.15M3 12a9.005 9.005 0 019.95-8.998c.801.076 1.05.95.45 1.45L12 5.25 10.6 3.452c-.6-.5-1.351-.374-1.45.45M12 5.25v13.5" />
    </svg>
);
const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const UserGroupIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
);
const BuildingOffice2Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m2.25-18v18m13.5-18v18m2.25-18v18M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
);

interface ObrasProps {
    toggleSidebar: () => void;
    onViewProject?: (projectId: string) => void;
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
}

const Obras: React.FC<ObrasProps> = ({ toggleSidebar, onViewProject, projects, setProjects }) => {
    const authContext = useContext(AuthContext);
    const user = authContext?.user;
    const userRole = user?.role?.toLowerCase();
    const isAdminOrDev = userRole === 'admin' || userRole === 'desenvolvedor';
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'Todos'>('Todos');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAlocacaoModalOpen, setIsAlocacaoModalOpen] = useState(false);
    const [projetoSelecionadoId, setProjetoSelecionadoId] = useState<string | null>(null);
    const [alocacoesProjeto, setAlocacoesProjeto] = useState<AlocacaoDTO[]>([]);
    
    // Estados para o formulário de obra
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [usuarios, setUsuarios] = useState<any[]>([]);
    const [projetosValidados, setProjetosValidados] = useState<Projeto[]>([]);
    const [formState, setFormState] = useState<{ projetoId: string; nomeObra?: string }>({
        projetoId: '',
        nomeObra: ''
    });

    // Função para mapear status do backend para o frontend
    const mapearStatusBackendParaFrontend = (statusBackend: string): ProjectStatus => {
        const statusMap: Record<string, ProjectStatus> = {
            'PROPOSTA': ProjectStatus.Planejamento,
            'VALIDADO': ProjectStatus.Planejamento,
            'APROVADO': ProjectStatus.Planejamento,
            'EXECUCAO': ProjectStatus.EmExecucao,
            'CONCLUIDO': ProjectStatus.Concluido,
            'CANCELADO': ProjectStatus.Cancelado,
            // Valores do frontend (caso já estejam mapeados)
            'Planejamento': ProjectStatus.Planejamento,
            'Em Execução': ProjectStatus.EmExecucao,
            'Controle de Qualidade': ProjectStatus.ControleQualidade,
            'Concluído': ProjectStatus.Concluido,
            'Cancelado': ProjectStatus.Cancelado
        };
        return statusMap[statusBackend] || ProjectStatus.Planejamento;
    };

    // Carregar projetos do backend
    useEffect(() => {
        carregarDados();
    }, []);
    
    const carregarDados = async () => {
        await Promise.all([
            carregarProjetos(),
            carregarClientes(),
            carregarUsuarios(),
            carregarProjetosValidados()
        ]);
    };

    const carregarProjetosValidados = async () => {
        try {
            // Buscar TODOS os projetos (exceto concluídos e cancelados)
            const response = await projetosService.listar();
            if (response.success && response.data) {
                const projetosArray = Array.isArray(response.data) ? response.data : [];
                // Filtrar projetos concluídos e cancelados (todos os outros podem gerar obras)
                const projetosDisponiveis = projetosArray.filter((p: Projeto) => 
                    p.status !== 'CONCLUIDO' && p.status !== 'CANCELADO'
                );
                setProjetosValidados(projetosDisponiveis);
            }
        } catch (error) {
            console.error('Erro ao carregar projetos disponíveis:', error);
            setProjetosValidados([]);
        }
    };
    
    const carregarClientes = async () => {
        try {
            const response = await clientesService.listar();
            if (response.success && response.data) {
                setClientes(Array.isArray(response.data) ? response.data : []);
            }
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    };
    
    const carregarUsuarios = async () => {
        try {
            const response = await axiosApiService.get<any[]>('/api/configuracoes/usuarios');
            if (response.success && response.data) {
                const usuariosArray = Array.isArray(response.data) ? response.data : [];
                // Filtrar apenas roles técnicas
                const usuariosFiltrados = usuariosArray.filter((u: any) => 
                    ['admin', 'gerente', 'engenheiro', 'orcamentista'].includes(u.role?.toLowerCase())
                );
                setUsuarios(usuariosFiltrados);
            }
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
        }
    };

    const carregarProjetos = async () => {
        try {
            setLoading(true);
            const response = await projetosService.listar();
            
            if (response.success && response.data) {
                // Converter projetos da API para o formato do componente
                const projetosFormatados: Project[] = Array.isArray(response.data)
                    ? response.data.map((proj: Projeto) => ({
                        id: proj.id,
                        titulo: proj.titulo,
                        descricao: proj.descricao || '',
                        cliente: proj.cliente ? {
                            id: proj.cliente.id,
                            nome: proj.cliente.nome,
                            cpfCnpj: ''
                        } : { id: '', nome: 'Cliente não informado', cpfCnpj: '' },
                        tipo: proj.tipo as ProjectType,
                        status: mapearStatusBackendParaFrontend(proj.status as string), // Mapear status do backend
                        dataInicio: proj.dataInicio,
                        dataFim: proj.dataPrevisao,
                        orcamento: proj.orcamento?.precoVenda || proj.valorTotal || 0,
                        progresso: 0, // TODO: calcular progresso real
                        responsavel: proj.responsavel ? {
                            id: proj.responsavel.id,
                            nome: proj.responsavel.nome,
                            role: UserRole.Engenheiro
                        } : { id: '', nome: 'Não informado', role: UserRole.Engenheiro },
                        equipe: [],
                        endereco: '',
                        observacoes: '',
                        etapas: []
                    }))
                    : [];
                
                console.log('📊 Projetos carregados:', projetosFormatados.length);
                console.log('📊 Status dos projetos:', projetosFormatados.map(p => ({ titulo: p.titulo, status: p.status })));
                setProjects(projetosFormatados);
            } else {
                console.warn('Nenhum projeto encontrado ou erro na resposta:', response);
                setProjects([]);
            }
        } catch (error) {
            console.error('Erro ao carregar projetos:', error);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    // Filtros
    const filteredProjects = useMemo(() => {
        let filtered = projects;

        // Filtro por status
        if (statusFilter !== 'Todos') {
            filtered = filtered.filter(project => project.status === statusFilter);
        }

        // Filtro por busca
        if (searchTerm) {
            filtered = filtered.filter(project =>
                project.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                project.cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                project.endereco.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    }, [projects, statusFilter, searchTerm]);

    // Estatísticas - agora os projetos já têm status mapeado corretamente
    const stats = useMemo(() => {
        const total = projects.length;
        const planejamento = projects.filter(p => p.status === ProjectStatus.Planejamento).length;
        const execucao = projects.filter(p => p.status === ProjectStatus.EmExecucao).length;
        const concluidos = projects.filter(p => p.status === ProjectStatus.Concluido).length;
        const valorTotal = projects.reduce((acc, p) => acc + (p.orcamento || 0), 0);

        console.log('📊 Estatísticas calculadas:', { total, planejamento, execucao, concluidos, valorTotal });
        console.log('📊 Distribuição de status:', {
            planejamento: projects.filter(p => p.status === ProjectStatus.Planejamento).map(p => p.titulo),
            execucao: projects.filter(p => p.status === ProjectStatus.EmExecucao).map(p => p.titulo),
            concluidos: projects.filter(p => p.status === ProjectStatus.Concluido).map(p => p.titulo)
        });

        return { total, planejamento, execucao, concluidos, valorTotal };
    }, [projects]);

    const getStatusClass = (status: ProjectStatus) => {
        switch (status) {
            case ProjectStatus.Planejamento:
                return 'bg-blue-100 text-blue-800 ring-1 ring-blue-200';
            case ProjectStatus.EmExecucao:
                return 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200';
            case ProjectStatus.ControleQualidade:
                return 'bg-purple-100 text-purple-800 ring-1 ring-purple-200';
            case ProjectStatus.Concluido:
                return 'bg-green-100 text-green-800 ring-1 ring-green-200';
            case ProjectStatus.Cancelado:
                return 'bg-red-100 text-red-800 ring-1 ring-red-200';
            default:
                return 'bg-gray-100 text-gray-800 ring-1 ring-gray-200';
        }
    };

    const getStatusIcon = (status: ProjectStatus) => {
        switch (status) {
            case ProjectStatus.Planejamento:
                return '📋';
            case ProjectStatus.EmExecucao:
                return '🔧';
            case ProjectStatus.ControleQualidade:
                return '🔍';
            case ProjectStatus.Concluido:
                return '✅';
            case ProjectStatus.Cancelado:
                return '❌';
            default:
                return '📋';
        }
    };

    const getTypeIcon = (tipo: ProjectType) => {
        switch (tipo) {
            case 'Instalacao':
                return '⚡';
            case 'Manutencao':
                return '🔧';
            case 'Retrofit':
                return '🔄';
            case 'Automacao':
                return '🤖';
            default:
                return '🏗️';
        }
    };

    const getProgressColor = (progress: number) => {
        if (progress >= 80) return 'bg-green-500';
        if (progress >= 50) return 'bg-yellow-500';
        return 'bg-blue-500';
    };

    const handleOpenModal = (project: Project | null = null) => {
        if (project) {
            // Editando obra existente - não permitido pois obra vem de projeto
            toast.warning('Edição não disponível', {
                description: 'Obras são gerenciadas através de seus projetos. Vá até o Kanban de Obras para gerenciar.'
            });
            return;
        } else {
            // Nova obra - limpar formulário
            setProjectToEdit(null);
            setFormState({
                projetoId: '',
                nomeObra: ''
            });
        }
        // Recarregar projetos validados ao abrir modal
        carregarProjetosValidados();
        setIsModalOpen(true);
    };
    useEffect(() => {
        if (selectedProject) {
            void loadAlocacoesDoProjeto(selectedProject.id);
        } else {
            setAlocacoesProjeto([]);
        }
    }, [selectedProject]);

    const loadAlocacoesDoProjeto = async (projetoId: string) => {
        try {
            const res = await alocacaoObraService.getAlocacoesPorProjeto(projetoId);
            if (res.success && Array.isArray(res.data)) {
                setAlocacoesProjeto(res.data);
            } else {
                setAlocacoesProjeto([]);
            }
        } catch (e) {
            console.error('Erro ao carregar alocações do projeto', e);
            setAlocacoesProjeto([]);
        }
    };

    const ganttItems: GanttItem[] = useMemo(() => {
        return alocacoesProjeto.map((a) => ({
            id: a.id,
            title: a.equipe?.nome || 'Equipe',
            startDate: new Date(a.dataInicio as any),
            endDate: new Date(a.dataFimPrevisto as any),
            progress: 0,
            status: a.status === 'EmAndamento' ? 'in-progress' :
                    a.status === 'Concluida' ? 'completed' :
                    a.status === 'Cancelada' ? 'cancelled' : 'planned',
            team: a.equipe?.nome || '',
            color: '#3b82f6'
        }));
    }, [alocacoesProjeto]);

    const ganttRange = useMemo(() => {
        if (ganttItems.length === 0) return null;
        const starts = ganttItems.map(i => i.startDate.getTime());
        const ends = ganttItems.map(i => i.endDate.getTime());
        return { start: new Date(Math.min(...starts)), end: new Date(Math.max(...ends)) };
    }, [ganttItems]);

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setProjectToEdit(null);
    };


    // Fechar modais com ESC
    useEscapeKey(isModalOpen, handleCloseModal);
    useEscapeKey(isAlocacaoModalOpen, () => setIsAlocacaoModalOpen(false));
    
    // Fechar modais com tecla S
    useSKey(isModalOpen, handleCloseModal);
    useSKey(isAlocacaoModalOpen, () => setIsAlocacaoModalOpen(false));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validar que um projeto foi selecionado
        if (!formState.projetoId) {
            toast.error('Projeto obrigatório', {
                description: 'Você deve selecionar um projeto validado para gerar uma obra.'
            });
            return;
        }
        
        try {
            // Gerar obra a partir do projeto validado
            const response = await obrasService.gerarObra({
                projetoId: formState.projetoId,
                nomeObra: formState.nomeObra || undefined
            });
            
            if (response.success) {
                toast.success('✅ Obra criada com sucesso!', {
                    description: `A obra foi gerada a partir do projeto e adicionada ao Kanban de Obras.`
                });
                handleCloseModal();
                await carregarProjetos();
            } else {
                toast.error('Erro ao gerar obra', {
                    description: response.error || 'Erro desconhecido'
                });
            }
        } catch (error: any) {
            console.error('Erro ao gerar obra:', error);
            toast.error('Erro ao gerar obra', {
                description: error?.response?.data?.message || error?.message || 'Erro desconhecido'
            });
        }
    };

    const handleDeleteObra = async (project: Project) => {
        if (!isAdminOrDev) {
            toast.error('Acesso negado', {
                description: 'Apenas administradores e desenvolvedores podem excluir obras.'
            });
            return;
        }

        const confirmMessage = `Tem certeza que deseja excluir a obra "${project.titulo}"?\n\nEsta ação não pode ser desfeita e irá remover:\n- A obra\n- Todas as tarefas relacionadas\n- Todos os registros de atividade\n- Todas as alocações relacionadas`;
        
        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            setLoading(true);
            const response = await obrasService.deletarObra(project.id);
            
            if (response.success) {
                toast.success('✅ Obra excluída com sucesso!', {
                    description: `A obra "${project.titulo}" foi removida do sistema.`
                });
                // Remover da lista local
                setProjects(prev => prev.filter(p => p.id !== project.id));
                // Recarregar projetos do backend
                await carregarProjetos();
            } else {
                const errorMsg = response.error || response.message || 'Erro desconhecido';
                toast.error('Erro ao excluir obra', {
                    description: errorMsg
                });
            }
        } catch (error: any) {
            console.error('Erro ao excluir obra:', error);
            const errorMsg = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Erro ao excluir obra';
            toast.error('Erro ao excluir obra', {
                description: errorMsg
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-4 sm:p-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 rounded-xl hover:bg-white hover:shadow-soft">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight">Obras</h1>
                        <p className="text-sm sm:text-base text-gray-500 mt-1">Gerencie projetos e acompanhe execução</p>
                    </div>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-xl hover:from-amber-700 hover:to-amber-600 transition-all shadow-medium font-semibold"
                >
                    <PlusIcon className="w-5 h-5" />
                    Nova Obra
                </button>
            </header>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <div className="card-primary border border-gray-100 dark:border-dark-border rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 flex items-center justify-center">
                            <BuildingOffice2Icon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">Total de Obras</p>
                            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.total}</p>
                        </div>
                    </div>
                </div>

                <div className="card-primary border border-gray-100 dark:border-dark-border rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 flex items-center justify-center">
                            <span className="text-2xl">📋</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">Planejamento</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.planejamento}</p>
                        </div>
                    </div>
                </div>

                <div className="card-primary border border-gray-100 dark:border-dark-border rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/40 flex items-center justify-center">
                            <Cog6ToothIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">Em Execução</p>
                            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.execucao}</p>
                        </div>
                    </div>
                </div>

                <div className="card-primary border border-gray-100 dark:border-dark-border rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40 flex items-center justify-center">
                            <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">Concluídas</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.concluidos}</p>
                        </div>
                    </div>
                </div>

                <div className="card-primary border border-gray-100 dark:border-dark-border rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 flex items-center justify-center">
                            <span className="text-2xl">💰</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">Valor Total</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                R$ {(stats.valorTotal / 1000).toFixed(0)}K
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="card-primary p-6 rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                            <input
                                type="text"
                                placeholder="Buscar por título, cliente ou endereço..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-field w-full pl-10"
                            />
                        </div>
                    </div>

                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'Todos')}
                            className="select-field w-full"
                        >
                            <option value="Todos">Todos os Status</option>
                            <option value={ProjectStatus.Planejamento}>Planejamento</option>
                            <option value={ProjectStatus.EmExecucao}>Em Execução</option>
                            <option value={ProjectStatus.Concluido}>Concluído</option>
                        </select>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                        Exibindo <span className="font-bold text-gray-900 dark:text-dark-text">{filteredProjects.length}</span> de <span className="font-bold text-gray-900 dark:text-dark-text">{projects.length}</span> obras
                    </p>
                </div>
            </div>

            {/* Grid de Obras */}
            {loading ? (
                <div className="card-primary rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border p-16 text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 dark:border-amber-400 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Carregando obras...</p>
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className="card-primary rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border p-16 text-center">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">🏗️</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-2">Nenhuma obra encontrada</h3>
                    <p className="text-gray-500 dark:text-dark-text-secondary mb-6">
                        {searchTerm || statusFilter !== 'Todos'
                            ? 'Tente ajustar os filtros de busca'
                            : 'Comece criando sua primeira obra'}
                    </p>
                    {!searchTerm && statusFilter === 'Todos' && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-gradient-to-r from-amber-600 to-amber-500 dark:from-amber-700 dark:to-amber-600 text-white px-6 py-3 rounded-xl hover:from-amber-700 hover:to-amber-600 transition-all shadow-medium font-semibold"
                        >
                            <PlusIcon className="w-5 h-5 inline mr-2" />
                            Criar Primeira Obra
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => (
                        <div key={project.id} className="card-primary border border-gray-200 dark:border-dark-border rounded-2xl p-6 shadow-soft hover:shadow-medium hover:border-amber-300 dark:hover:border-amber-600 transition-all duration-200">
                            {/* Header do Card */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-dark-text mb-1 line-clamp-2">{project.titulo}</h3>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-lg ${getStatusClass(project.status)}`}>
                                            {getStatusIcon(project.status)} {project.status}
                                        </span>
                                        <span className="px-3 py-1 text-xs font-bold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 ring-1 ring-gray-200 dark:ring-gray-700">
                                            {getTypeIcon(project.tipo)} {project.tipo}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Informações */}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                                    <span>👤</span>
                                    <span className="truncate">{project.cliente.nome}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                                    <span>📍</span>
                                    <span className="truncate">{project.endereco}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                                    <span>👷</span>
                                    <span className="truncate">{project.responsavel.nome}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                                    <UserGroupIcon className="w-4 h-4" />
                                    <span>{project.equipe.length} pessoas na equipe</span>
                                </div>
                            </div>

                            {/* Progresso */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">Progresso</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-dark-text">{project.progresso}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(project.progresso)}`}
                                        style={{ width: `${project.progresso}%` }}
                                    />
                                </div>
                            </div>

                            {/* Valor e Prazo */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <p className="text-xs text-gray-600 dark:text-dark-text-secondary mb-1">Orçamento</p>
                                    <p className="font-bold text-amber-700 dark:text-amber-400">
                                        R$ {project.orcamento.toLocaleString('pt-BR')}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <p className="text-xs text-gray-600 dark:text-dark-text-secondary mb-1">Prazo</p>
                                    <p className="font-bold text-gray-900 dark:text-dark-text">
                                        {new Date(project.dataFim).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-dark-border">
                                <button
                                    onClick={() => setSelectedProject(project)}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-semibold"
                                >
                                    <EyeIcon className="w-4 h-4" />
                                    Ver
                                </button>
                                <button
                                    onClick={() => handleOpenModal(project)}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors text-sm font-semibold"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                    Editar
                                </button>
                                <button
                                    onClick={() => { setProjetoSelecionadoId(project.id); setIsAlocacaoModalOpen(true); }}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors text-sm font-semibold"
                                >
                                    📅 Alocar Equipe
                                </button>
                                {isAdminOrDev && (
                                    <button
                                        onClick={() => handleDeleteObra(project)}
                                        disabled={loading}
                                        className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Excluir obra (apenas admin/desenvolvedor)"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL DE VISUALIZAÇÃO */}
            {selectedProject && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="modal-content max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="modal-header bg-gradient-to-r from-gray-50 to-amber-50 dark:from-gray-800 dark:to-amber-900/30">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Detalhes da Obra</h2>
                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">{selectedProject.titulo}</p>
                                </div>
                                <button onClick={() => setSelectedProject(null)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700 rounded-xl transition-colors">
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="modal-body space-y-6">
                            {/* Informações Básicas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="card-secondary p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <h3 className="font-semibold text-gray-800 dark:text-dark-text mb-2">Cliente</h3>
                                    <p className="text-gray-900 dark:text-dark-text font-medium">{selectedProject.cliente.nome}</p>
                                </div>
                                <div className="card-secondary p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <h3 className="font-semibold text-gray-800 dark:text-dark-text mb-2">Status</h3>
                                    <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${getStatusClass(selectedProject.status)}`}>
                                        {getStatusIcon(selectedProject.status)} {selectedProject.status}
                                    </span>
                                </div>
                                <div className="card-secondary p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <h3 className="font-semibold text-gray-800 dark:text-dark-text mb-2">Tipo</h3>
                                    <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 ring-1 ring-gray-200 dark:ring-gray-700">
                                        {getTypeIcon(selectedProject.tipo)} {selectedProject.tipo}
                                    </span>
                                </div>
                                <div className="card-secondary p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <h3 className="font-semibold text-gray-800 dark:text-dark-text mb-2">Responsável</h3>
                                    <p className="text-gray-900 dark:text-dark-text font-medium">{selectedProject.responsavel.nome}</p>
                                </div>
                            </div>

                            {/* Progresso e Orçamento */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-dark-text mb-2">Progresso</h3>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                                <div 
                                                    className={`h-3 rounded-full ${getProgressColor(selectedProject.progresso)}`}
                                                    style={{ width: `${selectedProject.progresso}%` }}
                                                />
                                            </div>
                                        </div>
                                        <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">{selectedProject.progresso}%</span>
                                    </div>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-dark-text mb-2">Orçamento</h3>
                                    <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                                        R$ {selectedProject.orcamento.toLocaleString('pt-BR')}
                                    </p>
                                </div>
                            </div>

                            {/* Descrição e Endereço */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-dark-text mb-2">Descrição</h3>
                                    <p className="text-gray-700 dark:text-dark-text-secondary">{selectedProject.descricao}</p>
                                </div>
                                <div className="card-secondary p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <h3 className="font-semibold text-gray-800 dark:text-dark-text mb-2">Endereço</h3>
                                    <p className="text-gray-700 dark:text-dark-text-secondary">{selectedProject.endereco}</p>
                                </div>
                            </div>

                            {/* Equipe */}
                            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-4 rounded-xl">
                                <h3 className="font-semibold text-gray-800 dark:text-dark-text mb-3">Equipe do Projeto</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {selectedProject.equipe.map((member) => (
                                        <div key={member.id} className="flex items-center gap-3 card-primary p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center">
                                                <span className="text-purple-600 dark:text-purple-400 font-bold text-sm">
                                                    {member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-dark-text">{member.name}</p>
                                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{member.role}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Timeline/Gantt de Alocações */}
                            <div className="card-primary border border-gray-200 dark:border-dark-border p-4 rounded-xl">
                                <h3 className="font-semibold text-gray-800 dark:text-dark-text mb-3">Cronograma de Alocações</h3>
                                {ganttItems.length === 0 || !ganttRange ? (
                                    <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Sem alocações para este projeto.</p>
                                ) : (
                                    <GanttChart
                                        items={ganttItems}
                                        startDate={ganttRange.start}
                                        endDate={ganttRange.end}
                                        onItemClick={(item) => {
                                            alert(`${item.title}: ${item.startDate.toLocaleDateString()} - ${item.endDate.toLocaleDateString()}`);
                                        }}
                                    />
                                )}
                            </div>

                            {/* Observações */}
                            {selectedProject.observacoes && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-dark-text mb-2">Observações</h3>
                                    <p className="text-gray-700 dark:text-dark-text-secondary">{selectedProject.observacoes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CRIAÇÃO/EDIÇÃO DE OBRA */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="modal-content max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-in-up">
                        {/* Header do Modal */}
                        <div className="modal-header bg-gradient-to-r from-amber-600 to-amber-500 dark:from-amber-700 dark:to-amber-600">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <BuildingOffice2Icon className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">
                                            Gerar Nova Obra
                                        </h2>
                                        <p className="text-sm text-white/80 mt-1">
                                            Gere uma obra de campo a partir de um projeto validado
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseModal}
                                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Formulário */}
                        <form onSubmit={handleSubmit} className="modal-body space-y-6">
                            {/* Alerta informativo sobre o fluxo */}
                            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-300 mb-1">📋 Fluxo do Sistema</h4>
                                        <p className="text-sm text-amber-800 dark:text-amber-300">
                                            <strong>Orçamento</strong> → <strong>Projeto</strong> → <strong>Obra (Produção de Campo)</strong>
                                        </p>
                                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                                            Obras são criadas a partir de projetos. O projeto representa a parte administrativa/documental, e a obra é a execução no campo. Apenas projetos concluídos não aparecem nesta lista.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Projeto - OBRIGATÓRIO */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Projeto * <span className="text-red-500 dark:text-red-400">(Obrigatório)</span>
                                    </label>
                                    <select
                                        value={formState.projetoId || ''}
                                        onChange={(e) => {
                                            const projetoId = e.target.value;
                                            const projetoSelecionado = projetosValidados.find(p => p.id === projetoId);
                                            
                                            if (projetoSelecionado) {
                                                setFormState({
                                                    projetoId,
                                                    nomeObra: projetoSelecionado.titulo || ''
                                                });
                                            } else {
                                                setFormState({ projetoId: '', nomeObra: '' });
                                            }
                                        }}
                                        required
                                        className="select-field border-2 border-amber-300 dark:border-amber-700"
                                    >
                                        <option value="">Selecione um projeto</option>
                                        {projetosValidados.map(projeto => (
                                            <option key={projeto.id} value={projeto.id}>
                                                {projeto.titulo} - Cliente: {projeto.cliente?.nome} ({projeto.status})
                                            </option>
                                        ))}
                                    </select>
                                    {projetosValidados.length === 0 && (
                                        <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-semibold">
                                            ❌ Nenhum projeto disponível. Crie um projeto primeiro ou verifique se todos os projetos já foram transformados em obras.
                                        </p>
                                    )}
                                    {formState.projetoId && (
                                        <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-semibold">
                                            ✅ A obra será gerada a partir deste projeto e adicionada ao Kanban de Obras.
                                        </p>
                                    )}
                                </div>

                                {/* Nome da Obra - OPCIONAL */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Nome da Obra (Opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.nomeObra || ''}
                                        onChange={(e) => setFormState({...formState, nomeObra: e.target.value})}
                                        className="input-field"
                                        placeholder="Deixe em branco para usar o título do projeto"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                        Se deixar em branco, o nome será o mesmo do projeto selecionado.
                                    </p>
                                </div>
                            </div>

                            {/* Informação Adicional */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">💡 Próximos Passos</h4>
                                        <p className="text-sm text-blue-800 dark:text-blue-300">
                                            Após criar a obra, você poderá alocar equipes de eletricistas, gerenciar materiais e acompanhar o progresso através do Kanban de Obras.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Botões de Ação */}
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="btn-secondary"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!formState.projetoId || projetosValidados.length === 0}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-500 dark:from-amber-700 dark:to-amber-600 text-white rounded-xl hover:from-amber-700 hover:to-amber-600 transition-all shadow-medium font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    Gerar Obra do Projeto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isAlocacaoModalOpen && projetoSelecionadoId && (
                <ModalAlocacaoEquipe
                    isOpen={isAlocacaoModalOpen}
                    onClose={() => setIsAlocacaoModalOpen(false)}
                    projetoId={projetoSelecionadoId}
                />
            )}
        </div>
    );
};

export default Obras;