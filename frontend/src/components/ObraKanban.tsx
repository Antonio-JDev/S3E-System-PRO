import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { obrasService, type Obra, type ObraKanbanData } from '../services/obrasService';
import { axiosApiService } from '../services/axiosApi';
import HubTarefasObra from './HubTarefasObra';
import { AuthContext } from '../contexts/AuthContext';
import { canDelete } from '../utils/permissions';
import AlertDialog from './ui/AlertDialog';

// Icons
const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
);

const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.038-2.124H9.038c-1.128 0-2.038.944-2.038 2.124v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

interface ObraKanbanProps {
    onRefresh?: () => void;
    onNavigate?: (view: string, ...args: any[]) => void;
}

const ObraKanban: React.FC<ObraKanbanProps> = ({ onRefresh, onNavigate }) => {
    const { user } = useContext(AuthContext);
    const [kanbanData, setKanbanData] = useState<ObraKanbanData>({
        BACKLOG: [],
        A_FAZER: [],
        ANDAMENTO: [],
        CONCLUIDO: []
    });
    const [loading, setLoading] = useState(true);
    const [draggedItem, setDraggedItem] = useState<Obra | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [kanbanSearchTerm, setKanbanSearchTerm] = useState('');

    // Hub de Tarefas da Obra
    const [hubObraId, setHubObraId] = useState<string | null>(null);
    
    // Estados para exclusão
    const [obraToDelete, setObraToDelete] = useState<Obra | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Modal de Obra de Manutenção
    const [modalManutencaoOpen, setModalManutencaoOpen] = useState(false);
    const [clienteBuscaInput, setClienteBuscaInput] = useState('');
    const [clienteListOpen, setClienteListOpen] = useState(false);
    const clienteBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [clientes, setClientes] = useState<any[]>([]);
    const [formManutencao, setFormManutencao] = useState({
        clienteId: '',
        nomeObra: '',
        descricao: '',
        endereco: '',
        dataPrevistaInicio: new Date().toISOString().split('T')[0],
        dataPrevistaFim: ''
    });

    useEffect(() => {
        loadObrasKanban();
        loadClientes();
    }, []);

    const loadClientes = async () => {
        try {
            const response = await axiosApiService.get('/api/clientes');
            const raw = response.data ?? response;
            setClientes(Array.isArray(raw) ? raw : []);
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    };

    const filteredClientesModal = useMemo(() => {
        if (!Array.isArray(clientes) || clientes.length === 0) return [];
        const q = clienteBuscaInput.trim().toLowerCase();
        const tokens = q.split(/\s+/).filter(Boolean);
        let list = [...clientes];
        if (tokens.length > 0) {
            list = list.filter((c: { nome?: string; cpfCnpj?: string; email?: string }) => {
                const hay = `${c.nome ?? ''} ${c.cpfCnpj ?? ''} ${c.email ?? ''}`.toLowerCase();
                return tokens.every((tok) => hay.includes(tok));
            });
        } else {
            list = list.slice(0, 80);
        }
        return list.sort((a: { nome?: string }, b: { nome?: string }) =>
            (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
        );
    }, [clientes, clienteBuscaInput]);

    const fecharModalManutencao = () => {
        if (clienteBlurTimeoutRef.current) {
            clearTimeout(clienteBlurTimeoutRef.current);
            clienteBlurTimeoutRef.current = null;
        }
        setModalManutencaoOpen(false);
        setClienteBuscaInput('');
        setClienteListOpen(false);
    };

    const handleAbrirModalManutencao = () => {
        setFormManutencao({
            clienteId: '',
            nomeObra: '',
            descricao: '',
            endereco: '',
            dataPrevistaInicio: new Date().toISOString().split('T')[0],
            dataPrevistaFim: ''
        });
        setClienteBuscaInput('');
        setClienteListOpen(false);
        setModalManutencaoOpen(true);
    };

    const selecionarClienteModal = (c: { id: string; nome?: string; cpfCnpj?: string }) => {
        setFormManutencao((prev) => ({ ...prev, clienteId: c.id }));
        const rotulo = `${c.nome ?? ''}${c.cpfCnpj ? ` — ${c.cpfCnpj}` : ''}`.trim();
        setClienteBuscaInput(rotulo);
        setClienteListOpen(false);
    };

    const handleCriarObraManutencao = async () => {
        if (!formManutencao.clienteId || !formManutencao.nomeObra) {
            toast.error('❌ Cliente e nome da obra são obrigatórios');
            return;
        }

        try {
            console.log('🔧 Criando obra de manutenção:', formManutencao);
            
            const response = await obrasService.criarObraManutencao(formManutencao);
            
            console.log('✅ Resposta da criação:', response);
            
            if (response.success || response.data) {
                toast.success('✅ Obra criada com sucesso no Backlog!');
                fecharModalManutencao();
                await loadObrasKanban();
                if (onRefresh) onRefresh();
            } else {
                toast.error(`❌ ${response.error || 'Erro ao criar obra'}`);
            }
        } catch (error: any) {
            console.error('❌ Erro ao criar obra de manutenção:', error);
            const mensagem = error?.response?.data?.message || error?.message || 'Erro ao criar obra de manutenção';
            toast.error(`❌ ${mensagem}`);
        }
    };

    const loadObrasKanban = async () => {
        try {
            setLoading(true);
            const response = await obrasService.getObrasKanban();
            
            console.log('📥 Resposta de getObrasKanban:', response);
            
            if (response.success && response.data) {
                // Garantir que cada coluna seja um array
                const safeData: ObraKanbanData = {
                    BACKLOG: Array.isArray(response.data.BACKLOG) ? response.data.BACKLOG : [],
                    A_FAZER: Array.isArray(response.data.A_FAZER) ? response.data.A_FAZER : [],
                    ANDAMENTO: Array.isArray(response.data.ANDAMENTO) ? response.data.ANDAMENTO : [],
                    CONCLUIDO: Array.isArray(response.data.CONCLUIDO) ? response.data.CONCLUIDO : []
                };
                console.log('📋 Kanban carregado:', safeData);
                setKanbanData(safeData);
            } else {
                console.warn('⚠️ Resposta sem dados, inicializando kanban vazio');
            }
        } catch (error) {
            console.error('Erro ao carregar obras:', error);
            alert('❌ Erro ao carregar obras');
        } finally {
            setLoading(false);
        }
    };

    const filteredKanbanData = useMemo(() => {
        const q = kanbanSearchTerm.trim().toLowerCase();
        if (!q) return kanbanData;
        const match = (o: Obra) => {
            const nome = (o.nomeObra || '').toLowerCase();
            const cliente = (o.clienteNome || '').toLowerCase();
            return nome.includes(q) || cliente.includes(q);
        };
        return {
            BACKLOG: kanbanData.BACKLOG.filter(match),
            A_FAZER: kanbanData.A_FAZER.filter(match),
            ANDAMENTO: kanbanData.ANDAMENTO.filter(match),
            CONCLUIDO: kanbanData.CONCLUIDO.filter(match),
        };
    }, [kanbanData, kanbanSearchTerm]);

    // Excluir obra
    const handleDeleteObra = async () => {
        if (!obraToDelete) return;

        const response = await obrasService.deletarObra(obraToDelete.id);
        
        if (response.success) {
            toast.success('Obra excluída', {
                description: `Obra "${obraToDelete.nomeObra}" foi excluída permanentemente`
            });
            await loadObrasKanban();
            if (onRefresh) onRefresh();
        } else {
            toast.error('Erro ao excluir', {
                description: response.error || 'Não foi possível excluir a obra'
            });
        }

        setShowDeleteDialog(false);
        setObraToDelete(null);
    };

    const handleDragStart = (e: React.DragEvent, obra: Obra) => {
        setDraggedItem(obra);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, columnStatus: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverColumn(columnStatus);
    };

    const handleDragLeave = () => {
        setDragOverColumn(null);
    };

    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        setDragOverColumn(null);

        if (!draggedItem) return;

        // Se não mudou de coluna, não faz nada
        if (draggedItem.status === newStatus) {
            setDraggedItem(null);
            return;
        }

        try {
            // Atualizar no backend
            const response = await obrasService.updateObraStatus(draggedItem.id, newStatus);
            
            if (response.success) {
                // Atualizar estado local
                await loadObrasKanban();
                
                if (onRefresh) onRefresh();
            } else {
                alert(`❌ ${response.error || 'Erro ao mover obra'}`);
            }
        } catch (error) {
            console.error('Erro ao mover obra:', error);
            alert('❌ Erro ao mover obra');
        } finally {
            setDraggedItem(null);
        }
    };

    const getColumnConfig = (status: string) => {
        const configs: Record<string, { title: string; color: string; bgColor: string; borderColor: string }> = {
            BACKLOG: {
                title: 'Backlog',
                color: 'text-gray-700',
                bgColor: 'bg-gray-50',
                borderColor: 'border-gray-300'
            },
            A_FAZER: {
                title: 'A Fazer',
                color: 'text-blue-700',
                bgColor: 'bg-blue-50',
                borderColor: 'border-blue-300'
            },
            ANDAMENTO: {
                title: 'Em Andamento',
                color: 'text-orange-700',
                bgColor: 'bg-orange-50',
                borderColor: 'border-orange-300'
            },
            CONCLUIDO: {
                title: 'Concluído',
                color: 'text-green-700',
                bgColor: 'bg-green-50',
                borderColor: 'border-green-300'
            }
        };

        return configs[status] || configs.BACKLOG;
    };

    const renderObraCard = (obra: Obra) => (
        <div
            key={obra.id}
            draggable
            onDragStart={(e) => handleDragStart(e, obra)}
            className="bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border rounded-xl p-4 mb-3 hover:shadow-lg transition-all hover:border-orange-400 dark:hover:border-orange-500"
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 cursor-pointer" onClick={() => {
                    if (onNavigate) {
                        onNavigate('DetalhesObra', obra.id);
                    } else {
                        setHubObraId(obra.id);
                    }
                }}>
                    <h4 className="font-bold text-gray-900 dark:text-dark-text text-sm line-clamp-2">
                        {obra.nomeObra}
                    </h4>
                    {/* Badge de Tipo */}
                    {obra.tipoObra === 'MANUTENCAO' && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-xs font-bold rounded border border-orange-300 dark:border-orange-700">
                            🔧 Manutenção
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold rounded">
                        #{obra.id.slice(0, 8)}
                    </span>
                    {canDelete(user) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setObraToDelete(obra);
                                setShowDeleteDialog(true);
                            }}
                            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Excluir obra (apenas Desenvolvedor/Administrador)"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Cliente */}
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-dark-text-secondary mb-2">
                <UserIcon className="w-4 h-4" />
                <span className="truncate">{obra.clienteNome}</span>
            </div>

            {/* Data */}
            {obra.dataPrevistaFim && (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-dark-text-secondary mb-3">
                    <ClockIcon className="w-4 h-4" />
                    <span>{new Date(obra.dataPrevistaFim).toLocaleDateString('pt-BR')}</span>
                </div>
            )}

            {/* Progresso */}
            <div className="space-y-1">
                <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-dark-text-secondary">Progresso</span>
                    <span className="font-bold text-gray-900 dark:text-dark-text">{obra.progresso}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                        className="bg-gradient-to-r from-orange-600 to-orange-500 h-2 rounded-full transition-all"
                        style={{ width: `${obra.progresso}%` }}
                    />
                </div>
            </div>

            {/* Tarefas */}
            <div className="flex items-center gap-2 mt-3 text-xs">
                <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-gray-600 dark:text-dark-text-secondary">
                    {obra.tarefasConcluidas}/{obra.totalTarefas} tarefas
                </span>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando quadro...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Cabeçalho: título, busca e Obra Sem OS */}
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="flex flex-1 flex-col gap-3 min-w-0 lg:flex-row lg:items-end lg:gap-4">
                    <div className="shrink-0">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Kanban de Obras</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Arraste e solte para mover entre as etapas
                        </p>
                    </div>
                    <div className="relative w-full lg:max-w-sm xl:max-w-md">
                        <svg
                            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        <input
                            type="search"
                            value={kanbanSearchTerm}
                            onChange={(e) => setKanbanSearchTerm(e.target.value)}
                            placeholder="Buscar por obra ou cliente..."
                            className="w-full rounded-xl border-2 border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card py-2.5 pl-10 pr-3 text-sm text-gray-900 dark:text-dark-text placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                            autoComplete="off"
                        />
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleAbrirModalManutencao}
                    className="shrink-0 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-medium font-semibold flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Obra Sem OS
                </button>
            </div>

            {/* Grid do Kanban */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(filteredKanbanData).map(([status, obras]) => {
                const config = getColumnConfig(status);
                const isOver = dragOverColumn === status;

                return (
                    <div
                        key={status}
                        onDragOver={(e) => handleDragOver(e, status)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, status)}
                        className={`bg-white dark:bg-dark-card rounded-2xl border-2 dark:border-dark-border transition-all ${
                            isOver ? 'ring-4 ring-orange-300 dark:ring-orange-500/50 border-orange-400 dark:border-orange-500' : config.borderColor
                        }`}
                    >
                        {/* Header da Coluna */}
                        <div className={`${config.bgColor} px-4 py-3 rounded-t-xl border-b-2 ${config.borderColor}`}>
                            <h3 className={`font-bold text-sm ${config.color}`}>
                                {config.title}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{obras.length} obra(s)</p>
                        </div>

                        {/* Cards de Obras */}
                        <div className="p-4 min-h-[500px] max-h-[600px] overflow-y-auto">
                            {obras.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                                    <p className="text-sm">Nenhuma obra</p>
                                    <p className="text-xs mt-1">Arraste para cá</p>
                                </div>
                            ) : (
                                obras.map(renderObraCard)
                            )}
                        </div>
                    </div>
                );
            })}
            </div>

            {/* Modal Obra Sem OS */}
            {modalManutencaoOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border-2 border-orange-200 dark:border-orange-800">
                        {/* Header */}
                        <div className="p-6 bg-gradient-to-r from-orange-600 to-orange-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Obra Sem OS</h3>
                                        <p className="text-sm text-orange-100">Para clientes sem projeto (obra avulsa)</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={fecharModalManutencao}
                                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Formulário */}
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Cliente (busca) */}
                            <div className="relative">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2" htmlFor="obra-sem-os-cliente-busca">
                                    👤 Cliente *
                                </label>
                                <input
                                    id="obra-sem-os-cliente-busca"
                                    type="search"
                                    autoComplete="off"
                                    value={clienteBuscaInput}
                                    onChange={(e) => {
                                        setClienteBuscaInput(e.target.value);
                                        setFormManutencao((prev) => ({ ...prev, clienteId: '' }));
                                        setClienteListOpen(true);
                                    }}
                                    onFocus={() => setClienteListOpen(true)}
                                    onBlur={() => {
                                        clienteBlurTimeoutRef.current = setTimeout(() => setClienteListOpen(false), 180);
                                    }}
                                    placeholder="Digite nome, CNPJ ou CPF — cada palavra restringe o filtro"
                                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {clienteBuscaInput.trim()
                                        ? `${filteredClientesModal.length} cliente(s) encontrado(s)`
                                        : `Digite para filtrar entre ${clientes.length} cliente(s) (mostrando até 80 sem filtro)`}
                                </p>
                                {clienteListOpen && filteredClientesModal.length > 0 && (
                                    <ul
                                        className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border-2 border-orange-200 dark:border-orange-900 bg-white dark:bg-dark-card shadow-xl"
                                        role="listbox"
                                    >
                                        {filteredClientesModal.map((cliente: { id: string; nome?: string; cpfCnpj?: string }) => (
                                            <li key={cliente.id} role="option">
                                                <button
                                                    type="button"
                                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 dark:hover:bg-orange-900/30 border-b border-gray-100 dark:border-dark-border last:border-0"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => selecionarClienteModal(cliente)}
                                                >
                                                    <span className="font-medium text-gray-900 dark:text-white block truncate">
                                                        {cliente.nome}
                                                    </span>
                                                    {cliente.cpfCnpj && (
                                                        <span className="text-xs text-gray-600 dark:text-gray-400">{cliente.cpfCnpj}</span>
                                                    )}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {clienteListOpen && clienteBuscaInput.trim() && filteredClientesModal.length === 0 && (
                                    <p className="absolute z-20 left-0 right-0 mt-1 rounded-xl border-2 border-dashed border-gray-300 dark:border-dark-border bg-gray-50 dark:bg-dark-bg px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                        Nenhum cliente encontrado para este termo.
                                    </p>
                                )}
                            </div>

                            {/* Nome da Obra */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    🏗️ Nome da Obra *
                                </label>
                                <input
                                    type="text"
                                    value={formManutencao.nomeObra}
                                    onChange={(e) => setFormManutencao(prev => ({ ...prev, nomeObra: e.target.value }))}
                                    placeholder="Ex: Manutenção Elétrica Residencial"
                                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                    required
                                />
                            </div>

                            {/* Descrição */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    📝 Descrição
                                </label>
                                <textarea
                                    value={formManutencao.descricao}
                                    onChange={(e) => setFormManutencao(prev => ({ ...prev, descricao: e.target.value }))}
                                    placeholder="Descreva o serviço de manutenção..."
                                    rows={3}
                                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                />
                            </div>

                            {/* Endereço */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    📍 Endereço da Obra
                                </label>
                                <input
                                    type="text"
                                    value={formManutencao.endereco}
                                    onChange={(e) => setFormManutencao(prev => ({ ...prev, endereco: e.target.value }))}
                                    placeholder="Rua, Número, Bairro, Cidade"
                                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                />
                            </div>

                            {/* Datas */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        📅 Data Prevista Início
                                    </label>
                                    <input
                                        type="date"
                                        value={formManutencao.dataPrevistaInicio}
                                        onChange={(e) => setFormManutencao(prev => ({ ...prev, dataPrevistaInicio: e.target.value }))}
                                        className="w-full px-4 py-3 border-2 border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        📅 Data Prevista Fim
                                    </label>
                                    <input
                                        type="date"
                                        value={formManutencao.dataPrevistaFim}
                                        onChange={(e) => setFormManutencao(prev => ({ ...prev, dataPrevistaFim: e.target.value }))}
                                        className="w-full px-4 py-3 border-2 border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Informação */}
                            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                                <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Esta obra será criada no <strong>Backlog</strong> e não terá projeto vinculado (manutenção avulsa).
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-gray-50 dark:bg-dark-bg border-t-2 border-gray-200 dark:border-dark-border flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={fecharModalManutencao}
                                className="px-6 py-3 bg-white dark:bg-dark-card border-2 border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover transition-all font-semibold"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleCriarObraManutencao}
                                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-medium font-semibold"
                            >
                                ✅ Criar Obra
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hub de Tarefas da Obra */}
            {hubObraId && (
                <HubTarefasObra
                    obraId={hubObraId}
                    onClose={() => {
                        setHubObraId(null);
                        loadObrasKanban(); // Recarrega o kanban para atualizar progresso
                    }}
                />
            )}

            {/* AlertDialog de Confirmação de Exclusão */}
            <AlertDialog
                isOpen={showDeleteDialog}
                onClose={() => {
                    setShowDeleteDialog(false);
                    setObraToDelete(null);
                }}
                onConfirm={handleDeleteObra}
                title={`Excluir obra "${obraToDelete?.nomeObra || 'N/A'}"?`}
                message={`Tem certeza que deseja excluir permanentemente esta obra? Esta ação não pode ser desfeita.`}
                confirmText="Excluir Permanentemente"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    );
};

export default ObraKanban;

