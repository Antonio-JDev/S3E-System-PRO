import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { axiosApiService } from '../services/axiosApi';
import { hasPermission } from '../utils/permissions';
import { obrasService } from '../services/obrasService';

// Icons
const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const PhotoIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

const MapPinIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
);

const PlayCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
    </svg>
);

const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const HistoryIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const DocumentTextIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);

interface TarefaObra {
    id: string;
    obraId: string;
    descricao: string;
    atribuidoA: string | null;
    progresso: number;
    dataPrevista: string | null;
    dataConclusaoReal: string | null;
    observacoes: string | null;
    createdAt: string;
    updatedAt: string;
    obra: {
        id: string;
        nomeObra: string;
        status: 'BACKLOG' | 'A_FAZER' | 'ANDAMENTO' | 'CONCLUIDO';
        endereco: string | null;
        clienteNome?: string;
    };
    registrosAtividade?: RegistroAtividade[];
}

interface RegistroAtividade {
    id: string;
    tarefaId: string;
    dataRegistro: string;
    descricaoAtividade: string;
    horasTrabalhadas: number;
    observacoes: string | null;
    imagens: string[];
    createdAt: string;
}

interface TarefasObraProps {
    toggleSidebar: () => void;
}

const TarefasObra: React.FC<TarefasObraProps> = ({ toggleSidebar }) => {
    const authContext = useContext(AuthContext);
    const user = authContext?.user;
    
    const [tarefas, setTarefas] = useState<TarefaObra[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTarefa, setSelectedTarefa] = useState<TarefaObra | null>(null);
    const [resumoDia, setResumoDia] = useState('');
    const [horasTrabalhadas, setHorasTrabalhadas] = useState<number>(8);
    const [observacoesRegistro, setObservacoesRegistro] = useState('');
    const [imagens, setImagens] = useState<File[]>([]);
    const [imagensPreviews, setImagensPreviews] = useState<string[]>([]);
    const [salvando, setSalvando] = useState(false);
    const [iniciandoExecucao, setIniciandoExecucao] = useState<string | null>(null); // ID da obra sendo iniciada
    const [tarefaHistorico, setTarefaHistorico] = useState<TarefaObra | null>(null); // Tarefa para visualizar histórico

    // Verificar permissão - Desenvolvedor tem acesso universal a todas as páginas
    const userRole = user?.role?.toLowerCase();
    const canView = userRole === 'desenvolvedor' || hasPermission(user, 'view_tarefas_obra');

    useEffect(() => {
        if (canView) {
            loadTarefas();
        }
    }, [canView]);

    const loadTarefas = async () => {
        try {
            setLoading(true);
            // TODO: Implementar endpoint no backend
            const response = await axiosApiService.get('/api/obras/tarefas');
            
            if (response.success && response.data) {
                setTarefas(Array.isArray(response.data) ? response.data : []);
            }
        } catch (error) {
            console.error('Erro ao carregar tarefas:', error);
            toast.error('Erro ao carregar tarefas da obra');
            setTarefas([]);
        } finally {
            setLoading(false);
        }
    };

    const handleImagemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setImagens(prev => [...prev, ...files]);
            
            // Criar previews
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImagensPreviews(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleRemoverImagem = (index: number) => {
        setImagens(prev => prev.filter((_, i) => i !== index));
        setImagensPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSalvarResumo = async () => {
        if (!selectedTarefa) return;
        
        if (!resumoDia.trim()) {
            toast.error('Por favor, preencha o resumo do dia');
            return;
        }

        if (horasTrabalhadas <= 0 || horasTrabalhadas > 24) {
            toast.error('Horas trabalhadas deve ser entre 1 e 24');
            return;
        }

        try {
            setSalvando(true);
            
            const formData = new FormData();
            formData.append('tarefaId', selectedTarefa.id);
            formData.append('descricaoAtividade', resumoDia);
            formData.append('horasTrabalhadas', horasTrabalhadas.toString());
            if (observacoesRegistro.trim()) {
                formData.append('observacoes', observacoesRegistro);
            }
            
            imagens.forEach((imagem) => {
                formData.append(`imagens`, imagem);
            });

            const response = await axiosApiService.post('/api/obras/tarefas/resumo', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.success || response.data) {
                toast.success('✅ Atividade registrada com sucesso!');
                setSelectedTarefa(null);
                setResumoDia('');
                setHorasTrabalhadas(8);
                setObservacoesRegistro('');
                setImagens([]);
                setImagensPreviews([]);
                loadTarefas();
            } else {
                toast.error(response.error || 'Erro ao registrar atividade');
            }
        } catch (error: any) {
            console.error('Erro ao salvar resumo:', error);
            const errorMsg = error?.response?.data?.error || error?.message || 'Erro ao salvar resumo do dia';
            toast.error(errorMsg);
        } finally {
            setSalvando(false);
        }
    };

    const handleIniciarExecucao = async (obraId: string, nomeObra: string) => {
        try {
            setIniciandoExecucao(obraId);
            
            const response = await obrasService.iniciarExecucao(obraId);
            
            if (response.success) {
                toast.success(`🚀 Execução iniciada com sucesso!`, {
                    description: `A obra "${nomeObra}" foi movida para "Em Andamento" no Kanban.`
                });
                
                // Recarregar tarefas para atualizar o status
                loadTarefas();
            } else {
                const errorMsg = response.message || 'Erro ao iniciar execução da obra';
                toast.error(errorMsg);
            }
        } catch (error: any) {
            console.error('Erro ao iniciar execução:', error);
            const errorMsg = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Erro ao iniciar execução da obra';
            toast.error(errorMsg);
        } finally {
            setIniciandoExecucao(null);
        }
    };

    const loadTarefaCompleta = async (tarefaId: string) => {
        try {
            // Primeiro, tentar buscar a tarefa completa do backend
            const response = await obrasService.getTarefa(tarefaId);
            
            if (response.success && response.data) {
                // Buscar a tarefa na lista atual para manter os dados da obra
                const tarefaAtual = tarefas.find(t => t.id === tarefaId);
                
                // Combinar dados: usar dados da obra da lista atual e registros do backend
                const tarefaCompleta: TarefaObra = {
                    ...(tarefaAtual || response.data),
                    registrosAtividade: response.data.registrosAtividade || tarefaAtual?.registrosAtividade || []
                };
                
                setTarefaHistorico(tarefaCompleta);
            } else {
                // Se não conseguir carregar do backend, usar a tarefa da lista atual
                const tarefaAtual = tarefas.find(t => t.id === tarefaId);
                if (tarefaAtual) {
                    setTarefaHistorico(tarefaAtual);
                } else {
                    toast.error('Erro ao carregar histórico da tarefa');
                }
            }
        } catch (error: any) {
            console.error('Erro ao carregar tarefa completa:', error);
            // Em caso de erro, usar a tarefa da lista atual
            const tarefaAtual = tarefas.find(t => t.id === tarefaId);
            if (tarefaAtual) {
                setTarefaHistorico(tarefaAtual);
            } else {
                toast.error('Erro ao carregar histórico da tarefa');
            }
        }
    };

    // Verificação de acesso
    if (!canView) {
        return (
            <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
                <div className="modal-content max-w-md w-full p-8 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">🚫 Acesso Negado</h2>
                    <p className="text-gray-600 dark:text-dark-text-secondary">
                        Você não tem permissão para acessar as tarefas de obra.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-white dark:hover:bg-dark-card hover:shadow-soft transition-colors">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">⚡ Tarefas da Obra</h1>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">
                            Gerencie suas atividades diárias de campo
                        </p>
                    </div>
                </div>
            </header>

            {/* Lista de Tarefas */}
            {loading ? (
                <div className="card-primary rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border p-16 text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Carregando tarefas...</p>
                </div>
            ) : tarefas.length === 0 ? (
                <div className="card-primary rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border p-16 text-center">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">📋</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-2">Nenhuma tarefa pendente</h3>
                    <p className="text-gray-500 dark:text-dark-text-secondary">
                        Não há tarefas de obra atribuídas a você no momento.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {tarefas.map((tarefa) => (
                        <div key={tarefa.id} className="card-primary border border-gray-200 dark:border-dark-border rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                            {/* Header do Card */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-2">{tarefa.obra.nomeObra}</h3>
                                    {tarefa.obra.endereco && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                                            <MapPinIcon className="w-4 h-4" />
                                            <span>{tarefa.obra.endereco}</span>
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                        Cliente: {tarefa.obra.clienteNome}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 items-end">
                                    {/* Status da Obra */}
                                    <span className={`px-2 py-1 text-xs font-bold rounded-lg ${
                                        tarefa.obra.status === 'BACKLOG' 
                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300' 
                                            : tarefa.obra.status === 'A_FAZER'
                                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                            : tarefa.obra.status === 'ANDAMENTO'
                                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                                            : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                    }`}>
                                        {tarefa.obra.status === 'BACKLOG' && '📋 Backlog'}
                                        {tarefa.obra.status === 'A_FAZER' && '📝 Para Fazer'}
                                        {tarefa.obra.status === 'ANDAMENTO' && '⚡ Em Andamento'}
                                        {tarefa.obra.status === 'CONCLUIDO' && '✅ Concluída'}
                                    </span>
                                    {/* Progresso da Tarefa */}
                                    {tarefa.progresso === 100 ? (
                                        <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 ring-1 ring-green-200 dark:ring-green-800">
                                            ✅ Tarefa Concluída
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 ring-1 ring-orange-200 dark:ring-orange-800">
                                            ⏳ {tarefa.progresso}% da Tarefa
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Descrição da Tarefa */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">📝 Tarefa:</h4>
                                <p className="text-sm text-gray-700 dark:text-dark-text whitespace-pre-wrap">{tarefa.descricao}</p>
                            </div>

                            {/* Observações */}
                            {tarefa.observacoes && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-4">
                                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-300 mb-1">💡 Observações:</p>
                                    <p className="text-xs text-gray-700 dark:text-dark-text">{tarefa.observacoes}</p>
                                </div>
                            )}

                            {/* Data Prevista */}
                            {tarefa.dataPrevista && (
                                <div className="text-xs text-gray-500 dark:text-dark-text-secondary mb-4">
                                    📅 Data prevista: {new Date(tarefa.dataPrevista).toLocaleDateString('pt-BR')}
                                </div>
                            )}

                            {/* Registros de Atividade */}
                            {tarefa.registrosAtividade && tarefa.registrosAtividade.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-xs font-semibold text-gray-600 dark:text-dark-text-secondary mb-2">
                                        📊 {tarefa.registrosAtividade.length} registro(s) de atividade
                                    </p>
                                </div>
                            )}

                            {/* Botões de Ação */}
                            <div className="space-y-3">
                                {/* Botão Iniciar Execução - apenas para obras "A_FAZER" */}
                                {tarefa.obra.status === 'A_FAZER' && (
                                    <button
                                        onClick={() => handleIniciarExecucao(tarefa.obra.id, tarefa.obra.nomeObra)}
                                        disabled={iniciandoExecucao === tarefa.obra.id}
                                        className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-medium py-3 px-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {iniciandoExecucao === tarefa.obra.id ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Iniciando...
                                            </>
                                        ) : (
                                            <>
                                                <PlayCircleIcon className="w-5 h-5" />
                                                🚀 Iniciar Execução
                                            </>
                                        )}
                                    </button>
                                )}
                                
                                {/* Botão Registrar Atividades - para obras em andamento (permite múltiplos registros) */}
                                {tarefa.obra.status === 'ANDAMENTO' && (
                                    <button
                                        onClick={() => {
                                            setSelectedTarefa(tarefa);
                                            setResumoDia('');
                                            setHorasTrabalhadas(8);
                                            setObservacoesRegistro('');
                                            setImagens([]);
                                            setImagensPreviews([]);
                                        }}
                                        className="w-full btn-primary flex items-center justify-center gap-2"
                                    >
                                        <CheckCircleIcon className="w-5 h-5" />
                                        Registrar Atividades do Dia
                                    </button>
                                )}
                                
                                {/* Botão Histórico - sempre visível se obra em andamento ou concluída, ou se houver registros */}
                                {(tarefa.obra.status === 'ANDAMENTO' || tarefa.obra.status === 'CONCLUIDO' || (tarefa.registrosAtividade && tarefa.registrosAtividade.length > 0)) && (
                                    <button
                                        onClick={() => {
                                            // Carregar registros completos da tarefa antes de abrir o histórico
                                            loadTarefaCompleta(tarefa.id);
                                        }}
                                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium py-3 px-4 flex items-center justify-center gap-2"
                                    >
                                        <DocumentTextIcon className="w-5 h-5" />
                                        📋 Ver Histórico
                                    </button>
                                )}
                                
                                {/* Mensagem informativa para obras não iniciadas */}
                                {tarefa.obra.status === 'BACKLOG' && (
                                    <div className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-center">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            📋 Obra ainda não foi liberada para execução
                                        </p>
                                    </div>
                                )}
                                
                                {/* Mensagem informativa para obras concluídas */}
                                {tarefa.obra.status === 'CONCLUIDO' && (
                                    <div className="w-full p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-center">
                                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                                            ✅ Obra concluída com sucesso!
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Registro */}
            {selectedTarefa && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="modal-content max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-in-up">
                        {/* Header */}
                        <div className="modal-header bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-700 dark:to-blue-600">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Registro de Atividades</h2>
                                    <p className="text-sm text-white/80 mt-1">{selectedTarefa.obra.nomeObra}</p>
                                    <p className="text-xs text-white/70 mt-0.5">{selectedTarefa.descricao}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedTarefa(null);
                                        setResumoDia('');
                                        setHorasTrabalhadas(8);
                                        setObservacoesRegistro('');
                                        setImagens([]);
                                        setImagensPreviews([]);
                                    }}
                                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="modal-body space-y-6">
                            {/* Tarefas Atribuídas */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">📝 Tarefa Atribuída:</h4>
                                <p className="text-sm text-gray-700 dark:text-dark-text whitespace-pre-wrap">{selectedTarefa.descricao}</p>
                                {selectedTarefa.observacoes && (
                                    <>
                                        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mt-3 mb-2">💡 Observações:</h4>
                                        <p className="text-sm text-gray-700 dark:text-dark-text whitespace-pre-wrap">{selectedTarefa.observacoes}</p>
                                    </>
                                )}
                            </div>

                            {/* Resumo do Dia */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                    Resumo das Atividades do Dia *
                                </label>
                                <textarea
                                    value={resumoDia}
                                    onChange={(e) => setResumoDia(e.target.value)}
                                    rows={6}
                                    placeholder="Descreva o que foi realizado durante o dia na obra..."
                                    className="textarea-field"
                                    required
                                />
                                <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                    Seja detalhado sobre as atividades executadas, materiais utilizados e observações importantes.
                                </p>
                            </div>

                            {/* Horas Trabalhadas */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                    Horas Trabalhadas *
                                </label>
                                <input
                                    type="number"
                                    min="0.5"
                                    max="24"
                                    step="0.5"
                                    value={horasTrabalhadas}
                                    onChange={(e) => setHorasTrabalhadas(parseFloat(e.target.value) || 0)}
                                    className="input-field"
                                    required
                                />
                                <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                    Informe a quantidade de horas trabalhadas (ex: 8, 4.5, 10)
                                </p>
                            </div>

                            {/* Observações Adicionais */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                    Observações Adicionais
                                </label>
                                <textarea
                                    value={observacoesRegistro}
                                    onChange={(e) => setObservacoesRegistro(e.target.value)}
                                    rows={3}
                                    placeholder="Observações, dificuldades encontradas, materiais necessários, etc..."
                                    className="textarea-field"
                                />
                            </div>

                            {/* Upload de Imagens */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                    Fotos da Obra
                                </label>
                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
                                    <input
                                        type="file"
                                        id="imagens"
                                        multiple
                                        accept="image/*"
                                        onChange={handleImagemChange}
                                        className="hidden"
                                    />
                                    <label htmlFor="imagens" className="cursor-pointer">
                                        <PhotoIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                                        <p className="text-sm font-semibold text-gray-700 dark:text-dark-text">
                                            Clique para adicionar fotos
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                            PNG, JPG até 10MB cada
                                        </p>
                                    </label>
                                </div>

                                {/* Preview das Imagens */}
                                {imagensPreviews.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                        {imagensPreviews.map((preview, index) => (
                                            <div key={index} className="relative group">
                                                <img
                                                    src={preview}
                                                    alt={`Preview ${index + 1}`}
                                                    className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                                                />
                                                <button
                                                    onClick={() => handleRemoverImagem(index)}
                                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="modal-footer">
                            <button
                                onClick={() => {
                                    setSelectedTarefa(null);
                                    setResumoDia('');
                                    setImagens([]);
                                    setImagensPreviews([]);
                                }}
                                className="btn-secondary"
                                disabled={salvando}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSalvarResumo}
                                disabled={salvando || !resumoDia.trim()}
                                className="btn-primary flex items-center gap-2"
                            >
                                {salvando ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircleIcon className="w-5 h-5" />
                                        Salvar Registro
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Histórico */}
            {tarefaHistorico && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="modal-content max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-in-up">
                        {/* Header */}
                        <div className="modal-header bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-700 dark:to-blue-600">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">📋 Histórico de Atividades</h2>
                                    <p className="text-sm text-white/80 mt-1">{tarefaHistorico.obra.nomeObra}</p>
                                    <p className="text-xs text-white/70 mt-0.5">{tarefaHistorico.descricao}</p>
                                </div>
                                <button
                                    onClick={() => setTarefaHistorico(null)}
                                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="modal-body space-y-6">
                            {/* Informações da Tarefa */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">📝 Tarefa:</h4>
                                <p className="text-sm text-gray-700 dark:text-dark-text whitespace-pre-wrap">{tarefaHistorico.descricao}</p>
                                <div className="mt-3 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                                    <span>📍 {tarefaHistorico.obra.endereco || 'Endereço não informado'}</span>
                                    {tarefaHistorico.dataPrevista && (
                                        <span>📅 Data prevista: {new Date(tarefaHistorico.dataPrevista).toLocaleDateString('pt-BR')}</span>
                                    )}
                                    <span>⏳ Progresso: {tarefaHistorico.progresso}%</span>
                                </div>
                            </div>

                            {/* Lista de Registros */}
                            {tarefaHistorico.registrosAtividade && tarefaHistorico.registrosAtividade.length > 0 ? (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">
                                        Registros de Atividades ({tarefaHistorico.registrosAtividade.length})
                                    </h3>
                                    {tarefaHistorico.registrosAtividade
                                        .sort((a, b) => new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime())
                                        .map((registro, index) => (
                                            <div key={registro.id} className="bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border rounded-xl p-5 shadow-soft">
                                                {/* Header do Registro */}
                                                <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-200 dark:border-dark-border">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-bold rounded">
                                                                Registro #{tarefaHistorico.registrosAtividade!.length - index}
                                                            </span>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                {new Date(registro.dataRegistro).toLocaleDateString('pt-BR', {
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <ClockIcon className="w-4 h-4 text-gray-400" />
                                                        <span className="text-sm font-semibold text-gray-700 dark:text-dark-text">
                                                            {registro.horasTrabalhadas}h
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Descrição da Atividade */}
                                                <div className="mb-3">
                                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">📝 Atividades Realizadas:</h4>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-dark-bg p-3 rounded-lg">
                                                        {registro.descricaoAtividade}
                                                    </p>
                                                </div>

                                                {/* Observações */}
                                                {registro.observacoes && (
                                                    <div className="mb-3">
                                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">💡 Observações:</h4>
                                                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                                                            {registro.observacoes}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Imagens */}
                                                {registro.imagens && registro.imagens.length > 0 && (
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                                            📷 Fotos ({registro.imagens.length})
                                                        </h4>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                            {registro.imagens.map((imagem, imgIndex) => (
                                                                <div key={imgIndex} className="relative group">
                                                                    <img
                                                                        src={imagem}
                                                                        alt={`Foto ${imgIndex + 1} do registro`}
                                                                        className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                                                                        onClick={() => window.open(imagem, '_blank')}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <DocumentTextIcon className="w-10 h-10 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-2">Nenhum registro encontrado</h3>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        Ainda não há registros de atividades para esta tarefa.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="modal-footer">
                            <button
                                onClick={() => setTarefaHistorico(null)}
                                className="btn-secondary"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TarefasObra;

