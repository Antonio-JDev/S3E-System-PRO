import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ModalEquipesDeObra from './Obras/ModalEquipesDeObra';
import ModalAlocacaoEquipe from './Obras/ModalAlocacaoEquipe';
import EquipesGantt from './Obras/EquipesGantt';
import GanttChart from './Obras/GanttChart';
import JiraBoard from './Obras/JiraBoard';
import { axiosApiService } from '../services/axiosApi';
import { ENDPOINTS } from '../config/api';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { toast } from 'sonner';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { Alocacao, Obra, Equipe } from '../types';

// Icons
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
const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
);
const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
    </svg>
);
const ChartBarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
);

interface Membro {
    id: string;
    nome: string;
    email: string;
    role: string;
}

interface GanttChartProps {
    toggleSidebar: () => void;
}

type TabType = 'equipes' | 'calendario' | 'timeline';

const GanttChartPage: React.FC<GanttChartProps> = ({ toggleSidebar }) => {
    const [activeTab, setActiveTab] = useState<TabType>('equipes');
    const [equipes, setEquipes] = useState<Equipe[]>([]);
    const [alocacoes, setAlocacoes] = useState<Alocacao[]>([]);
    const [obras, setObras] = useState<Obra[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Estados para filtros de data na Timeline
    const [filtroDataInicio, setFiltroDataInicio] = useState<string>('');
    const [filtroDataFim, setFiltroDataFim] = useState<string>('');
    
    // Estados para calendário
    const [mesCalendario, setMesCalendario] = useState(new Date().getMonth());
    const [anoCalendario, setAnoCalendario] = useState(new Date().getFullYear());
    
    // Estados para modal de equipe
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [equipeToEdit, setEquipeToEdit] = useState<Equipe | null>(null);
    const [isEquipeManagerOpen, setIsEquipeManagerOpen] = useState(false);
    const [isAlocacaoModalOpen, setIsAlocacaoModalOpen] = useState(false);
    const [projetoSelecionadoId, setProjetoSelecionadoId] = useState<string | null>(null);
    const [alertaValidacao, setAlertaValidacao] = useState<{ tipo: 'erro' | 'info'; mensagem: string } | null>(null);
    const [modalVisualizarMembros, setModalVisualizarMembros] = useState(false);
    const [equipeParaVisualizar, setEquipeParaVisualizar] = useState<Equipe | null>(null);
    const [loadingMembros, setLoadingMembros] = useState(false);
    const [formState, setFormState] = useState({
        nome: '',
        tipo: '' as '' | 'MONTAGEM' | 'CAMPO' | 'DISTINTA',
        membrosIds: [] as string[], // IDs dos membros (backend espera array de strings)
        ativa: true
    });
    
    // Estados para listar eletricistas
    const [eletricistas, setEletricistas] = useState<any[]>([]);
    const [loadingEletricistas, setLoadingEletricistas] = useState(false);

    // Carregar equipes do backend
    const loadEquipes = async () => {
        try {
            console.log('🔍 Carregando equipes do backend...');
            const response = await axiosApiService.get<Equipe[]>(ENDPOINTS.OBRAS.EQUIPES);
            
            if (response.success && response.data) {
                console.log('✅ Equipes carregadas:', response.data);
                setEquipes(Array.isArray(response.data) ? response.data : []);
                setError(null);
            } else {
                console.warn('⚠️ Resposta sem dados:', response);
                setEquipes([]);
                setError(null); // Não mostrar erro se simplesmente não houver dados
            }
        } catch (err) {
            console.error('❌ Erro ao carregar equipes:', err);
            setError('Erro ao carregar equipes. Verifique sua conexão.');
            setEquipes([]);
        }
    };

    // Carregar equipe completa com membros do backend
    const loadEquipeComMembros = async (equipeId: string) => {
        try {
            setLoadingMembros(true);
            console.log('🔍 Carregando equipe completa do backend:', equipeId);
            
            // Tentar primeiro com o endpoint de obras
            let response = await axiosApiService.get<any>(`${ENDPOINTS.OBRAS.EQUIPES}/${equipeId}`);
            
            // Se não funcionar, tentar com o endpoint padrão
            if (!response.success) {
                response = await axiosApiService.get<any>(`/api/equipes/${equipeId}`);
            }
            
            if (response.success && response.data) {
                const equipe = response.data;
                console.log('📥 Equipe carregada (raw):', equipe);
                
                // Se os membros são apenas IDs (strings), buscar dados completos dos usuários
                if (equipe.membros && Array.isArray(equipe.membros)) {
                    const membrosIds = equipe.membros.map((m: any) => {
                        return typeof m === 'string' ? m : m.id;
                    }).filter((id: string) => id);
                    
                    if (membrosIds.length > 0) {
                        console.log('🔍 Buscando dados completos dos membros:', membrosIds);
                        
                        // Buscar dados dos usuários
                        const usuariosResponse = await axiosApiService.get<any[]>('/api/configuracoes/usuarios');
                        
                        if (usuariosResponse.success && usuariosResponse.data) {
                            const usuariosArray = Array.isArray(usuariosResponse.data) ? usuariosResponse.data : [];
                            const membrosCompletos = membrosIds.map((membroId: string) => {
                                const usuario = usuariosArray.find((u: any) => u.id === membroId);
                                if (usuario) {
                                    return {
                                        id: usuario.id,
                                        nome: usuario.name || 'Sem nome',
                                        email: usuario.email || 'Sem email',
                                        role: usuario.role || 'Eletricista',
                                        funcao: usuario.role || 'Eletricista'
                                    };
                                } else {
                                    // Se não encontrar o usuário, retornar um objeto básico
                                    return {
                                        id: membroId,
                                        nome: 'Usuário não encontrado',
                                        email: 'Sem email',
                                        role: 'Eletricista',
                                        funcao: 'Eletricista'
                                    };
                                }
                            });
                            
                            equipe.membros = membrosCompletos;
                            console.log('✅ Membros completos carregados:', membrosCompletos);
                        } else {
                            console.warn('⚠️ Não foi possível carregar dados dos usuários');
                            // Se não conseguir carregar, criar objetos básicos
                            equipe.membros = membrosIds.map((id: string) => ({
                                id,
                                nome: 'Carregando...',
                                email: 'Sem email',
                                role: 'Eletricista',
                                funcao: 'Eletricista'
                            }));
                        }
                    } else {
                        equipe.membros = [];
                    }
                }
                
                console.log('✅ Equipe carregada com membros completos:', equipe);
                return equipe as Equipe;
            } else {
                console.warn('⚠️ Resposta sem dados da equipe:', response);
                return null;
            }
        } catch (err) {
            console.error('❌ Erro ao carregar equipe:', err);
            return null;
        } finally {
            setLoadingMembros(false);
        }
    };

    // Carregar alocações do backend
    const loadAlocacoes = useCallback(async (usarCalendarioEndpoint: boolean = false) => {
        try {
            console.log('🔍 Carregando alocações do backend...', usarCalendarioEndpoint ? '(endpoint calendário)' : '(endpoint geral)');
            setError(null);
            
            // Usar endpoint geral que retorna TODAS as alocações de TODAS as obras
            // Isso permite visão ampla de todas as equipes e obras
            let endpoint = ENDPOINTS.OBRAS.ALOCACOES;
            let params: any = {};
            
            // Se estiver na aba de calendário, ainda usar endpoint geral mas pode filtrar por período
            // Não usar endpoint de calendário específico para manter visão ampla
            // O endpoint /api/obras/alocacoes retorna todas as alocações sem filtro de projeto
            
            const response = await axiosApiService.get<Alocacao[]>(endpoint, params);
            
            console.log('📦 Resposta completa:', response);
            console.log('📊 Tipo da resposta:', typeof response.data, Array.isArray(response.data));
            
            if (response.success && response.data) {
                // O backend retorna { success: true, data: [...] }
                let alocacoesArray: any[] = [];
                
                // Type guard para verificar se é array
                if (Array.isArray(response.data)) {
                    alocacoesArray = response.data;
                } else if (response.data && typeof response.data === 'object') {
                    // Verificar se tem estrutura aninhada { data: [...] }
                    const dataObj = response.data as any;
                    if ('data' in dataObj && Array.isArray(dataObj.data)) {
                        alocacoesArray = dataObj.data;
                    } else {
                        // Pode ser um objeto único, não um array
                        console.warn('⚠️ Resposta não é um array:', response.data);
                        alocacoesArray = [];
                    }
                }
                
                console.log('✅ Alocações carregadas:', alocacoesArray.length, 'alocações');
                if (alocacoesArray.length > 0) {
                    console.log('📋 Exemplo de alocação:', JSON.stringify(alocacoesArray[0], null, 2));
                }
                
                // Normalizar dados para garantir que todas as alocações tenham os campos necessários
                const alocacoesNormalizadas = alocacoesArray.map((a: any) => {
                    // O backend retorna dataFimPrevisto, então mapear para dataFim também
                    const dataFimPrevisto = a.dataFimPrevisto || a.dataFimReal || null;
                    const dataFimFinal = a.dataFim || dataFimPrevisto || a.dataInicio;
                    
                    // Normalizar nome do eletricista (pode vir como 'name' ou 'nome')
                    const nomeEletricista = a.eletricista?.name || a.eletricista?.nome || null;
                    
                    return {
                        ...a,
                        id: a.id,
                        equipeId: a.equipeId,
                        eletricistaId: a.eletricistaId,
                        projetoId: a.projetoId,
                        dataInicio: a.dataInicio,
                        dataFim: dataFimFinal,
                        dataFimPrevisto: dataFimPrevisto || dataFimFinal,
                        status: a.status || 'Planejada',
                        observacoes: a.observacoes || '',
                        equipe: a.equipe ? {
                            id: a.equipe.id,
                            nome: a.equipe.nome,
                            tipo: a.equipe.tipo,
                            membros: a.equipe.membros || []
                        } : null,
                        eletricista: a.eletricista ? {
                            id: a.eletricista.id,
                            nome: nomeEletricista,
                            email: a.eletricista.email,
                            role: a.eletricista.role
                        } : null,
                        projeto: a.projeto || null
                    };
                });
                
                setAlocacoes(alocacoesNormalizadas);
                setError(null);
                
                if (alocacoesNormalizadas.length === 0) {
                    console.log('ℹ️ Nenhuma alocação encontrada para o período selecionado');
                }
            } else {
                console.warn('⚠️ Resposta sem alocações ou erro:', response);
                setAlocacoes([]);
                const errorMsg = response.error || response.message || 'Nenhuma alocação encontrada';
                if (response.error && response.error !== 'Nenhuma alocação encontrada') {
                    setError(errorMsg);
                    toast.error('Erro ao carregar alocações', {
                        description: errorMsg
                    });
                }
            }
        } catch (err: any) {
            console.error('❌ Erro ao carregar alocações:', err);
            const errorMessage = err?.message || err?.response?.data?.message || err?.response?.data?.error || 'Erro ao carregar alocações';
            setError(errorMessage);
            setAlocacoes([]);
            toast.error('Erro ao carregar alocações', {
                description: errorMessage
            });
        }
    }, [activeTab, mesCalendario, anoCalendario]);

    // Carregar todas as obras do backend (para Gantt Chart e Jira Board)
    const loadObras = async () => {
        try {
            console.log('🔍 Carregando obras do backend...');
            const response = await axiosApiService.get<any>('/api/obras/kanban');
            
            if (response.success && response.data) {
                // Extrair todas as obras de todos os status
                const todasObras: Obra[] = [];
                if (response.data.BACKLOG) {
                    todasObras.push(...response.data.BACKLOG);
                }
                if (response.data.A_FAZER) {
                    todasObras.push(...response.data.A_FAZER);
                }
                if (response.data.ANDAMENTO) {
                    todasObras.push(...response.data.ANDAMENTO);
                }
                if (response.data.CONCLUIDO) {
                    todasObras.push(...response.data.CONCLUIDO);
                }
                console.log('✅ Obras carregadas:', todasObras.length);
                setObras(todasObras);
            } else {
                console.warn('⚠️ Resposta sem obras:', response);
                setObras([]);
            }
        } catch (err) {
            console.error('❌ Erro ao carregar obras:', err);
            setObras([]);
        }
    };

    // Carregar dados ao montar o componente
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([loadEquipes(), loadAlocacoes(), loadObras()]);
            setLoading(false);
        };
        loadData();
    }, []);

    // Recarregar dados quando mudar de aba ou mês/ano do calendário
    useEffect(() => {
        if (activeTab === 'calendario') {
            loadObras();
            loadAlocacoes(true); // Usar endpoint de calendário
        } else if (activeTab === 'timeline') {
            loadAlocacoes(false); // Usar endpoint geral para timeline
        }
    }, [activeTab, loadAlocacoes]);

    // Recarregar alocações quando mudar mês/ano do calendário
    useEffect(() => {
        if (activeTab === 'calendario') {
            loadAlocacoes(true); // Usar endpoint de calendário com parâmetros de mês/ano
        }
    }, [mesCalendario, anoCalendario, activeTab, loadAlocacoes]);

    // Filtrar alocações por data para Timeline (sempre executado, não condicional)
    const alocacoesFiltradas = useMemo(() => {
        let filtradas = alocacoes;
        
        if (filtroDataInicio) {
            const dataInicio = new Date(filtroDataInicio);
            filtradas = filtradas.filter(a => {
                const alocacaoInicio = new Date(a.dataInicio);
                return alocacaoInicio >= dataInicio;
            });
        }
        
        if (filtroDataFim) {
            const dataFim = new Date(filtroDataFim);
            filtradas = filtradas.filter(a => {
                const alocacaoFim = new Date(a.dataFim);
                return alocacaoFim <= dataFim;
            });
        }
        
        return filtradas;
    }, [alocacoes, filtroDataInicio, filtroDataFim]);

    // Carregar eletricistas do backend
    const loadEletricistas = async () => {
        try {
            setLoadingEletricistas(true);
            const response = await axiosApiService.get<any[]>('/api/configuracoes/usuarios');
            
            if (response.success && response.data) {
                // Filtrar apenas eletricistas ativos
                const usuariosArray = Array.isArray(response.data) ? response.data : [];
                const eletricistasFiltered = usuariosArray
                    .filter((u: any) => 
                        u.role?.toLowerCase() === 'eletricista' && 
                        (u.active !== false) // Apenas usuários ativos
                    )
                    .map((u: any) => ({
                        id: u.id,
                        name: u.name || 'Sem nome',
                        email: u.email || 'Sem email',
                        role: u.role,
                        active: u.active
                    }));
                
                console.log('✅ Eletricistas carregados:', eletricistasFiltered);
                setEletricistas(eletricistasFiltered);
            } else {
                console.warn('⚠️ Resposta sem dados de eletricistas:', response);
                setEletricistas([]);
            }
        } catch (err) {
            console.error('❌ Erro ao carregar eletricistas:', err);
            setEletricistas([]);
        } finally {
            setLoadingEletricistas(false);
        }
    };

    const handleOpenModal = async (equipe: Equipe | null = null) => {
        console.log('🔍 Abrindo modal de equipe:', equipe ? 'EDITAR' : 'CRIAR', equipe);
        if (equipe) {
            // Carregar equipe completa com membros antes de abrir o modal
            const equipeCompleta = await loadEquipeComMembros(equipe.id);
            if (equipeCompleta) {
                // Extrair IDs dos membros (pode ser array de objetos ou strings)
                const membrosIds = equipeCompleta.membros.map(m => {
                    return typeof m === 'string' ? m : m.id;
                }).filter((id: string) => id);
                
                console.log('✅ Membros IDs extraídos:', membrosIds);
                
                setEquipeToEdit(equipeCompleta);
                setFormState({
                    nome: equipeCompleta.nome,
                    tipo: equipeCompleta.tipo,
                    membrosIds: membrosIds,
                    ativa: equipeCompleta.ativa
                });
            } else {
                // Fallback: usar equipe da lista se não conseguir recarregar
                const membrosIds = equipe.membros.map(m => {
                    return typeof m === 'string' ? m : m.id;
                }).filter((id: string) => id);
                
                setEquipeToEdit(equipe);
                setFormState({
                    nome: equipe.nome,
                    tipo: equipe.tipo,
                    membrosIds: membrosIds,
                    ativa: equipe.ativa
                });
            }
        } else {
            // Limpar completamente o estado para criar nova equipe
            setEquipeToEdit(null);
            setFormState({
                nome: '',
                tipo: '' as '' | 'MONTAGEM' | 'CAMPO' | 'DISTINTA',
                membrosIds: [],
                ativa: true
            });
        }
        setAlertaValidacao(null); // Limpar alertas anteriores
        // Recarregar equipes e eletricistas para ter dados atualizados
        await Promise.all([loadEquipes(), loadEletricistas()]);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        console.log('🔒 Fechando modal de equipe');
        setIsModalOpen(false);
        setEquipeToEdit(null);
        setAlertaValidacao(null);
        // Limpar o formulário ao fechar
        setFormState({
            nome: '',
            tipo: '' as '' | 'MONTAGEM' | 'CAMPO' | 'DISTINTA',
            membrosIds: [],
            ativa: true
        });
    };

    // Fechar modais com ESC
    useEscapeKey(isModalOpen, handleCloseModal);
    useEscapeKey(isAlocacaoModalOpen, () => setIsAlocacaoModalOpen(false));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validações
        if (!formState.nome.trim()) {
            setAlertaValidacao({ tipo: 'erro', mensagem: 'Por favor, preencha o nome da equipe' });
            return;
        }
        
        if (!formState.tipo) {
            setAlertaValidacao({ tipo: 'erro', mensagem: 'Por favor, selecione o tipo da equipe' });
            return;
        }
        
        if (formState.membrosIds.length === 0) {
            setAlertaValidacao({ tipo: 'erro', mensagem: 'Por favor, adicione pelo menos um membro à equipe' });
            return;
        }
        
        // Verificar se o nome já existe (apenas ao criar, não ao editar)
        if (!equipeToEdit) {
            const nomeJaExiste = equipes.some(e => 
                e.nome.trim().toLowerCase() === formState.nome.trim().toLowerCase() && e.ativa
            );
            if (nomeJaExiste) {
                setAlertaValidacao({ 
                    tipo: 'erro', 
                    mensagem: `Já existe uma equipe ativa com o nome "${formState.nome}". Por favor, escolha outro nome ou use o botão "✨ Sugerir" para gerar um nome único.` 
                });
                return;
            }
        } else {
            // Ao editar, verificar se o nome mudou e se já existe outra equipe com esse nome
            if (formState.nome.trim().toLowerCase() !== equipeToEdit.nome.trim().toLowerCase()) {
                const nomeJaExiste = equipes.some(e => 
                    e.id !== equipeToEdit.id &&
                    e.nome.trim().toLowerCase() === formState.nome.trim().toLowerCase() && 
                    e.ativa
                );
                if (nomeJaExiste) {
                    setAlertaValidacao({ 
                        tipo: 'erro', 
                        mensagem: `Já existe outra equipe ativa com o nome "${formState.nome}". Por favor, escolha outro nome.` 
                    });
                    return;
                }
            }
        }
        
        // Limpar alerta se tudo estiver OK
        setAlertaValidacao(null);
        
        try {
            // Formato esperado pelo backend
            const equipeData = {
                nome: formState.nome,
                tipo: formState.tipo,
                membros: formState.membrosIds // Array de IDs dos usuários
            };

            console.log('📤 Enviando dados da equipe:', equipeData);

            if (equipeToEdit) {
                const response = await axiosApiService.put(`${ENDPOINTS.OBRAS.EQUIPES}/${equipeToEdit.id}`, equipeData);
                console.log('📥 Resposta:', response);
                if (response.success) {
                    // Recarregar equipes e eletricistas para atualizar a lista de disponíveis
                    await Promise.all([loadEquipes(), loadEletricistas()]);
                    handleCloseModal();
                    toast.success('✅ Equipe atualizada com sucesso!');
                } else {
                    toast.error('❌ Erro ao atualizar equipe: ' + (response.error || 'Erro desconhecido'));
                }
            } else {
                console.log('📤 Criando NOVA equipe:', equipeData);
                console.log('🔍 equipeToEdit:', equipeToEdit);
                const response = await axiosApiService.post(ENDPOINTS.OBRAS.EQUIPES, equipeData);
                console.log('📥 Resposta:', response);
                if (response.success) {
                    // Recarregar equipes e eletricistas para atualizar a lista de disponíveis
                    await Promise.all([loadEquipes(), loadEletricistas()]);
                    handleCloseModal();
                    toast.success('✅ Equipe criada com sucesso!');
                } else {
                    const errorMsg = response.error || 'Erro desconhecido';
                    setAlertaValidacao({ tipo: 'erro', mensagem: errorMsg });
                    toast.error('❌ Erro ao criar equipe: ' + errorMsg);
                }
            }
        } catch (err: any) {
            console.error('Erro ao salvar equipe:', err);
            const errorMessage = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Erro desconhecido';
            setAlertaValidacao({ tipo: 'erro', mensagem: errorMessage });
            toast.error('❌ Erro ao salvar equipe: ' + errorMessage);
        }
    };

    const handleDeleteEquipe = async (equipe: Equipe) => {
        if (window.confirm(`Tem certeza que deseja desativar a equipe "${equipe.nome}"?`)) {
            try {
                const response = await axiosApiService.delete(`${ENDPOINTS.OBRAS.EQUIPES}/${equipe.id}`);
                if (response.success) {
                    await loadEquipes();
                    toast.success('✅ Equipe desativada com sucesso!');
                } else {
                    toast.error('❌ Erro ao desativar equipe');
                }
            } catch (err) {
                console.error('Erro ao desativar equipe:', err);
                toast.error('❌ Erro ao desativar equipe');
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
        // Limpar alerta quando usuário começar a corrigir
        if (alertaValidacao) setAlertaValidacao(null);
    };

    // Função para sugerir nome automático baseado no tipo
    const sugerirNomeAutomatico = () => {
        const tipo = formState.tipo;
        if (!tipo) {
            toast.error('Por favor, selecione o tipo da equipe primeiro');
            return;
        }
        
        const prefixos: Record<string, string> = {
            'MONTAGEM': 'Equipe Montagem',
            'CAMPO': 'Equipe Campo',
            'DISTINTA': 'Equipe Distinta'
        };
        
        const prefixo = prefixos[tipo] || 'Equipe';
        let numero = 1;
        let nomeDisponivel = `${prefixo} ${numero}`;
        
        // Verificar se o nome já existe (ignorar a equipe atual se estiver editando)
        while (equipes.some(e => {
            const nomeIgual = e.nome.trim().toLowerCase() === nomeDisponivel.trim().toLowerCase();
            const naoEhEquipeAtual = equipeToEdit ? e.id !== equipeToEdit.id : true;
            return nomeIgual && naoEhEquipeAtual && e.ativa;
        })) {
            numero++;
            nomeDisponivel = `${prefixo} ${numero}`;
        }
        
        setFormState(prev => ({ ...prev, nome: nomeDisponivel }));
        toast.success(`✨ Nome sugerido: ${nomeDisponivel}`);
    };

    // Verificar se um eletricista já está em outra equipe
    const isEletricistaEmOutraEquipe = (eletricistaId: string): { emOutraEquipe: boolean; nomeEquipe?: string } => {
        // Se estiver editando uma equipe, ignorar os membros dessa equipe atual
        const equipeAtualId = equipeToEdit?.id;
        
        // Se o eletricista está na equipe atual sendo editada, não está em outra equipe
        if (equipeAtualId && formState.membrosIds.includes(eletricistaId)) {
            return { emOutraEquipe: false };
        }
        
        for (const equipe of equipes) {
            // Ignorar a equipe atual se estiver editando
            if (equipeAtualId && equipe.id === equipeAtualId) {
                continue;
            }
            
            // Verificar se o eletricista está nesta equipe (verificar pelos membros)
            const estaNaEquipe = equipe.membros?.some(membro => {
                // Membros podem ser objetos com id ou apenas strings (IDs)
                const membroId = typeof membro === 'string' ? membro : membro.id;
                return membroId === eletricistaId;
            });
            
            if (estaNaEquipe && equipe.ativa) {
                return { emOutraEquipe: true, nomeEquipe: equipe.nome };
            }
        }
        
        return { emOutraEquipe: false };
    };

    const handleAddEletricista = (eletricistaId: string) => {
        // Verificar se o eletricista já está em outra equipe
        const { emOutraEquipe, nomeEquipe } = isEletricistaEmOutraEquipe(eletricistaId);
        
        if (emOutraEquipe) {
            setAlertaValidacao({ 
                tipo: 'erro', 
                mensagem: `Este eletricista já faz parte da equipe "${nomeEquipe}". Um eletricista não pode estar em múltiplas equipes simultaneamente.` 
            });
            return;
        }
        
        if (!formState.membrosIds.includes(eletricistaId)) {
            setFormState(prev => ({ 
                ...prev, 
                membrosIds: [...prev.membrosIds, eletricistaId] 
            }));
            // Limpar alerta quando adicionar membro
            if (alertaValidacao) setAlertaValidacao(null);
        }
    };

    const handleRemoveMembroId = (membroId: string) => {
        setFormState(prev => ({ 
            ...prev, 
            membrosIds: prev.membrosIds.filter(id => id !== membroId) 
        }));
    };

    // Funções auxiliares para o calendário
    const irParaMesAnterior = () => {
        if (mesCalendario === 0) {
            setMesCalendario(11);
            setAnoCalendario(anoCalendario - 1);
        } else {
            setMesCalendario(mesCalendario - 1);
        }
    };

    const irParaHoje = () => {
        const agora = new Date();
        setMesCalendario(agora.getMonth());
        setAnoCalendario(agora.getFullYear());
    };

    const irParaProximoMes = () => {
        if (mesCalendario === 11) {
            setMesCalendario(0);
            setAnoCalendario(anoCalendario + 1);
        } else {
            setMesCalendario(mesCalendario + 1);
        }
    };

    // Verificar se há alocações ou obras em um dia específico
    const getEventosDoDia = (dia: number) => {
        const hoje = new Date();
        // Normalizar data para comparar apenas dia/mês/ano (sem horas)
        const dataAtual = new Date(anoCalendario, mesCalendario, dia);
        dataAtual.setHours(0, 0, 0, 0);
        
        const eventos: Array<{ tipo: 'alocacao' | 'obra'; cor: string; titulo: string }> = [];

        // Verificar alocações (equipes e eletricistas)
        alocacoes.forEach(alocacao => {
            if (!alocacao.dataInicio) return;
            
            const inicio = new Date(alocacao.dataInicio);
            inicio.setHours(0, 0, 0, 0);
            
            const fim = new Date(alocacao.dataFim || alocacao.dataFimPrevisto || alocacao.dataInicio);
            fim.setHours(23, 59, 59, 999); // Incluir o dia inteiro
            
            // Verificar se a data atual está entre o início e o fim da alocação
            if (dataAtual >= inicio && dataAtual <= fim) {
                const cor = alocacao.status === 'EmAndamento' ? 'bg-green-500' :
                           alocacao.status === 'Planejada' ? 'bg-blue-500' :
                           alocacao.status === 'Concluida' ? 'bg-orange-500' : 'bg-red-500';
                // Determinar título: equipe ou eletricista
                const titulo = alocacao.equipe 
                    ? `Equipe: ${alocacao.equipe.nome}` 
                    : alocacao.eletricista 
                        ? `Eletricista: ${alocacao.eletricista.nome}` 
                        : 'Alocação';
                eventos.push({
                    tipo: 'alocacao',
                    cor,
                    titulo
                });
            }
        });

        // Verificar obras em andamento
        obras.forEach(obra => {
            if (obra.dataPrevistaInicio || obra.dataInicioReal) {
                const inicio = new Date(obra.dataInicioReal || obra.dataPrevistaInicio!);
                inicio.setHours(0, 0, 0, 0);
                
                const fim = obra.dataPrevistaFim ? new Date(obra.dataPrevistaFim) : null;
                if (fim) {
                    fim.setHours(23, 59, 59, 999);
                }
                
                if (dataAtual >= inicio && (!fim || dataAtual <= fim)) {
                    eventos.push({
                        tipo: 'obra',
                        cor: 'bg-purple-500',
                        titulo: obra.nomeObra
                    });
                }
            }
        });

        return eventos;
    };

    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando gestão de obras...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-8">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 rounded-xl hover:bg-white hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200" aria-label="Open sidebar">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight">GanttChart</h1>
                        <p className="text-sm sm:text-base text-gray-500 mt-1">Gerenciamento de equipes e alocações de projetos</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsEquipeManagerOpen(true)} 
                        className="flex items-center justify-center bg-white border-2 border-blue-600 text-blue-600 font-semibold px-4 py-3 rounded-xl shadow-soft hover:bg-blue-50 transition-all duration-200"
                    >
                        <UsersIcon className="w-5 h-5 mr-2" />
                        Equipes (Pessoas)
                    </button>
                    <button 
                        onClick={() => handleOpenModal()} 
                        className="flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold px-6 py-3 rounded-xl shadow-medium hover:from-blue-700 hover:to-blue-600 transition-all duration-200"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Nova Equipe
                    </button>
                </div>
            </header>

            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 animate-slide-in-up">
                    <h3 className="text-sm font-medium text-red-800">Erro ao carregar dados</h3>
                    <p className="mt-2 text-sm text-red-700">{error}</p>
                    <button
                        onClick={() => {
                            setLoading(true);
                            loadEquipes().then(() => loadAlocacoes()).finally(() => setLoading(false));
                        }}
                        className="mt-3 bg-red-100 px-4 py-2 rounded-lg text-sm font-medium text-red-800 hover:bg-red-200 transition-colors"
                    >
                        Tentar novamente
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div className="mb-6">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('equipes')}
                            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors duration-200 ${
                                activeTab === 'equipes'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <UsersIcon className="w-5 h-5 inline mr-2" />
                            Equipes
                        </button>
                        <button
                            onClick={() => setActiveTab('calendario')}
                            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors duration-200 ${
                                activeTab === 'calendario'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <CalendarIcon className="w-5 h-5 inline mr-2" />
                            Calendário
                        </button>
                        <button
                            onClick={() => setActiveTab('timeline')}
                            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors duration-200 ${
                                activeTab === 'timeline'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <ChartBarIcon className="w-5 h-5 inline mr-2" />
                            Timeline
                        </button>
                    </nav>
                </div>
            </div>

           {/* Conteúdo das Tabs */}
            {activeTab === 'equipes' && (
                <div className="space-y-6">
                    {/* Estatísticas rápidas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        <div className="card-primary p-6 rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border hover:border-gray-200 dark:hover:border-gray-600 card-hover">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shadow-sm ring-1 ring-blue-200/50">
                                    <UsersIcon className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Total de Equipes</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">{equipes.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="card-primary p-6 rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border hover:border-gray-200 dark:hover:border-gray-600 card-hover">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center shadow-sm ring-1 ring-green-200/50">
                                    <UsersIcon className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Equipes Ativas</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">
                                        {equipes.filter(e => e.ativa).length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card-primary p-6 rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border hover:border-gray-200 dark:hover:border-gray-600 card-hover">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center shadow-sm ring-1 ring-purple-200/50">
                                    <UsersIcon className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Total de Membros</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">
                                        {equipes.reduce((total, equipe) => total + (equipe.membros?.length || 0), 0)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card-primary p-6 rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border hover:border-gray-200 dark:hover:border-gray-600 card-hover">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center shadow-sm ring-1 ring-orange-200/50">
                                    <CalendarIcon className="w-6 h-6 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Alocações Ativas</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">
                                        {alocacoes.filter(a => a.status === 'EmAndamento').length}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lista de equipes */}
                    <div className="bg-white rounded-2xl shadow-soft border border-gray-100">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Equipes Cadastradas</h2>
                                    <p className="text-sm text-gray-500 mt-1">Gerencie suas equipes de trabalho</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            {equipes.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-sm ring-1 ring-blue-200/50 mb-4">
                                        <UsersIcon className="w-10 h-10 text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">Nenhuma equipe cadastrada</h3>
                                    <p className="text-gray-500 mb-6 max-w-md mx-auto">Comece criando sua primeira equipe para organizar o trabalho em suas obras</p>
                                    <button 
                                        onClick={() => handleOpenModal()}
                                        className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold"
                                    >
                                        <PlusIcon className="w-5 h-5 inline mr-2" />
                                        Criar Primeira Equipe
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {equipes.map((equipe) => (
                                        <div key={equipe.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft hover:shadow-medium transition-all duration-200 hover:border-blue-300">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-gray-900 text-lg mb-1">{equipe.nome}</h3>
                                                    <p className="text-sm text-gray-600">Tipo: {equipe.tipo}</p>
                                                </div>
                                                <span className={`px-3 py-1 text-xs font-bold rounded-lg shadow-sm ${
                                                    equipe.ativa 
                                                        ? 'bg-green-100 text-green-800 ring-1 ring-green-200' 
                                                        : 'bg-gray-100 text-gray-800 ring-1 ring-gray-200'
                                                }`}>
                                                    {equipe.ativa ? 'Ativa' : 'Inativa'}
                                                </span>
                                            </div>
                                            
                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                                    <UsersIcon className="w-4 h-4 mr-2 text-gray-400" />
                                                    <span className="font-medium">{equipe.membros?.length || 0} membros</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex gap-2 pt-4 border-t border-gray-100">
                                                <button
                                                    onClick={async () => {
                                                        // Recarregar equipe com membros atualizados do backend
                                                        const equipeCompleta = await loadEquipeComMembros(equipe.id);
                                                        if (equipeCompleta) {
                                                            setEquipeParaVisualizar(equipeCompleta);
                                                            setModalVisualizarMembros(true);
                                                        } else {
                                                            // Fallback: usar equipe da lista se não conseguir recarregar
                                                            setEquipeParaVisualizar(equipe);
                                                            setModalVisualizarMembros(true);
                                                        }
                                                    }}
                                                    className="flex-1 text-purple-600 hover:text-purple-700 transition-colors text-sm font-semibold py-2 px-3 rounded-lg hover:bg-purple-50 flex items-center justify-center gap-1"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    Ver Membros
                                                </button>
                                                <button
                                                    onClick={() => handleOpenModal(equipe)}
                                                    className="flex-1 text-blue-600 hover:text-blue-700 transition-colors text-sm font-semibold py-2 px-3 rounded-lg hover:bg-blue-50"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteEquipe(equipe)}
                                                    className="flex-1 text-red-600 hover:text-red-700 transition-colors text-sm font-semibold py-2 px-3 rounded-lg hover:bg-red-50"
                                                >
                                                    Desativar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'calendario' && (
                <GanttChart 
                    alocacoes={alocacoes}
                    obras={obras}
                    equipes={equipes}
                />
            )}

            {/* Código antigo do calendário removido - substituído por GanttChart */}

            {activeTab === 'timeline' && (
                <JiraBoard 
                    alocacoes={alocacoes}
                    obras={obras}
                    onRefresh={async () => {
                        await Promise.all([loadAlocacoes(false), loadObras()]);
                    }}
                />
            )}

            {/* Código antigo do gantt removido - substituído por JiraBoard */}

        {/* Modal de Visualizar Membros da Equipe */}
        {modalVisualizarMembros && equipeParaVisualizar && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong max-w-2xl w-full animate-slide-in-up">
                    <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-dark-border bg-gradient-to-r from-purple-600 to-indigo-600">
                        <div>
                            <h2 className="text-2xl font-bold text-white">{equipeParaVisualizar.nome}</h2>
                            <p className="text-purple-100 text-sm mt-1">Membros da Equipe • Tipo: {equipeParaVisualizar.tipo}</p>
                        </div>
                        <button
                            onClick={() => {
                                setModalVisualizarMembros(false);
                                setEquipeParaVisualizar(null);
                            }}
                            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="p-6">
                        {loadingMembros ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                    <UsersIcon className="w-8 h-8 text-gray-400" />
                                </div>
                                <p className="text-gray-500 font-medium">Carregando membros...</p>
                            </div>
                        ) : equipeParaVisualizar.membros && equipeParaVisualizar.membros.length > 0 ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                        👥 {equipeParaVisualizar.membros.length} {equipeParaVisualizar.membros.length === 1 ? 'Membro' : 'Membros'}
                                    </h3>
                                    <span className={`px-3 py-1 text-xs font-bold rounded-lg shadow-sm ${
                                        equipeParaVisualizar.ativa 
                                            ? 'bg-green-100 text-green-800 ring-1 ring-green-200' 
                                            : 'bg-gray-100 text-gray-800 ring-1 ring-gray-200'
                                    }`}>
                                        {equipeParaVisualizar.ativa ? 'Ativa' : 'Inativa'}
                                    </span>
                                </div>

                                {equipeParaVisualizar.membros.map((membro, index) => (
                                    <div 
                                        key={membro.id || `membro-${index}`}
                                        className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-xl hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-center justify-center w-10 h-10 bg-purple-600 text-white rounded-full font-bold text-lg">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900 dark:text-white">{membro.nome}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{membro.email || 'Sem email'}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 rounded-lg text-xs font-semibold">
                                                {membro.role || 'Eletricista'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <UsersIcon className="w-8 h-8 text-gray-400" />
                                </div>
                                <p className="text-gray-500 font-medium">Nenhum membro nesta equipe</p>
                                <p className="text-sm text-gray-400 mt-2">Adicione eletricistas editando a equipe</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100 dark:border-dark-border">
                            <button
                                onClick={() => {
                                    setModalVisualizarMembros(false);
                                    setEquipeParaVisualizar(null);
                                }}
                                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                            >
                                Fechar
                            </button>
                            <button
                                onClick={() => {
                                    setModalVisualizarMembros(false);
                                    handleOpenModal(equipeParaVisualizar);
                                }}
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold"
                            >
                                Editar Equipe
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Modal de Formação de Equipes com Pessoas Disponíveis */}
        {isEquipeManagerOpen && (
            <ModalEquipesDeObra isOpen={isEquipeManagerOpen} onClose={() => setIsEquipeManagerOpen(false)} />
        )}

        {isAlocacaoModalOpen && projetoSelecionadoId && (
            <ModalAlocacaoEquipe
                isOpen={isAlocacaoModalOpen}
                onClose={() => setIsAlocacaoModalOpen(false)}
                projetoId={projetoSelecionadoId}
            />
        )}

            {/* Modal de Equipe */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-strong max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-in-up">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {equipeToEdit ? 'Editar Equipe' : 'Nova Equipe'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-xl"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Alerta de Validação */}
                            {alertaValidacao && (
                                <Alert variant={alertaValidacao.tipo === 'erro' ? 'destructive' : 'default'} className="animate-fade-in">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <AlertTitle>Atenção!</AlertTitle>
                                    <AlertDescription>
                                        {alertaValidacao.mensagem}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                    Nome da Equipe * <span className="text-xs text-gray-500 dark:text-dark-text-secondary font-normal">(deve ser único)</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        name="nome"
                                        value={formState.nome}
                                        onChange={handleInputChange}
                                        required
                                        className="input-field flex-1"
                                        placeholder="Ex: Equipe Elétrica A, Equipe Campo 1, etc."
                                    />
                                    <button
                                        type="button"
                                        onClick={sugerirNomeAutomatico}
                                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all shadow-md font-semibold whitespace-nowrap"
                                        title="Sugerir nome automático"
                                    >
                                        ✨ Sugerir
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                    💡 Dica: Use nomes descritivos e únicos. Clique em "Sugerir" para gerar um nome automático.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                    Tipo de Equipe *
                                </label>
                                <select
                                    name="tipo"
                                    value={formState.tipo}
                                    onChange={handleInputChange}
                                    required
                                    className="select-field"
                                >
                                    <option value="">Selecione o tipo</option>
                                    <option value="MONTAGEM">Montagem</option>
                                    <option value="CAMPO">Campo</option>
                                    <option value="DISTINTA">Distinta</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    Eletricistas Disponíveis *
                                </label>
                                {loadingEletricistas ? (
                                    <div className="text-center py-4">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                    </div>
                                ) : eletricistas.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 text-sm bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                        <UsersIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p>Nenhum eletricista cadastrado no sistema.</p>
                                        <p className="text-xs mt-1">Cadastre eletricistas em Configurações → Usuários</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {/* Informação sobre selecionados */}
                                        <div className="flex items-center justify-between text-sm px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                                            <span className="text-blue-800 font-medium">
                                                Selecionados: {formState.membrosIds.length} eletricista(s)
                                            </span>
                                        </div>
                                        
                                        {/* Lista de eletricistas selecionados (se houver) */}
                                        {formState.membrosIds.length > 0 && (
                                            <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                                <p className="text-xs font-semibold text-green-800 mb-2">Eletricistas Selecionados:</p>
                                                <div className="space-y-1">
                                                    {formState.membrosIds.map(membroId => {
                                                        const eletricista = eletricistas.find(e => e.id === membroId);
                                                        return (
                                                            <div key={membroId} className="flex items-center gap-2 text-sm">
                                                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                                <span className="text-green-800 font-medium">
                                                                    {eletricista ? `${eletricista.name} (${eletricista.email})` : `ID: ${membroId}`}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Lista de eletricistas */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-200">
                                            {eletricistas.map((eletricista) => {
                                                const isSelected = formState.membrosIds.includes(eletricista.id);
                                                const { emOutraEquipe, nomeEquipe } = isEletricistaEmOutraEquipe(eletricista.id);
                                                // Se estiver editando, permitir selecionar membros atuais mesmo se estiverem em outra equipe
                                                // Se não estiver editando, desabilitar eletricistas que já estão em equipes ativas
                                                const isDisabled = emOutraEquipe && !isSelected && !equipeToEdit;
                                                
                                                return (
                                                    <button
                                                        key={eletricista.id}
                                                        type="button"
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                handleRemoveMembroId(eletricista.id);
                                                            } else if (!isDisabled) {
                                                                handleAddEletricista(eletricista.id);
                                                            }
                                                        }}
                                                        disabled={isDisabled}
                                                        className={`p-3 rounded-xl border-2 transition-all text-left ${
                                                            isSelected 
                                                                ? 'border-blue-500 bg-blue-50 hover:bg-blue-100' 
                                                                : isDisabled
                                                                ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60'
                                                                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                                                        }`}
                                                        title={isDisabled ? `Este eletricista já faz parte da equipe "${nomeEquipe}"` : isSelected ? 'Clique para remover' : 'Clique para adicionar'}
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                                                isSelected ? 'bg-blue-600 border-blue-600' : isDisabled ? 'border-gray-300 bg-gray-200' : 'border-gray-300 bg-white'
                                                            }`}>
                                                                {isSelected && (
                                                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                )}
                                                                {isDisabled && (
                                                                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <p className={`text-sm font-semibold ${isSelected ? 'text-blue-900' : isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>
                                                                        {eletricista.name || 'Sem nome'}
                                                                    </p>
                                                                    {isDisabled && (
                                                                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                                                                            Em outra equipe
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className={`text-xs mt-1 ${isSelected ? 'text-blue-700' : isDisabled ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                    {eletricista.email || 'Sem email'}
                                                                </p>
                                                                {isDisabled && nomeEquipe && (
                                                                    <p className="text-xs text-orange-600 mt-1 font-medium">
                                                                        Equipe: {nomeEquipe}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        
                                        {/* Mensagem se não houver eletricistas disponíveis */}
                                        {eletricistas.filter(e => {
                                            const { emOutraEquipe } = isEletricistaEmOutraEquipe(e.id);
                                            // Ao editar, mostrar todos; ao criar, mostrar apenas disponíveis
                                            return !emOutraEquipe || equipeToEdit;
                                        }).length === 0 && !loadingEletricistas && (
                                            <div className="text-center py-4 text-sm text-gray-500 bg-yellow-50 rounded-lg border border-yellow-200">
                                                <p>⚠️ Todos os eletricistas já estão em equipes ativas.</p>
                                                <p className="text-xs mt-1">Desative uma equipe ou remova membros para liberar eletricistas.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold"
                                >
                                    {equipeToEdit ? 'Atualizar' : 'Criar'} Equipe
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GanttChartPage;
