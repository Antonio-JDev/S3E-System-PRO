import React, { useState, useEffect, useMemo } from 'react';
import { axiosApiService } from '../services/axiosApi';
import { ENDPOINTS } from '../config/api';
import { toast } from 'sonner';
import { Alocacao, Equipe } from '../types';

// Icons
const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

const ChartPieIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
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

const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

interface MetricasEquipeProps {
    toggleSidebar: () => void;
}

type TabType = 'desempenho' | 'disponibilidade' | 'tempo-real';

interface EletricistaDisponibilidade {
    id: string;
    nome: string;
    email: string;
    diasTrabalhados: number;
    diasDisponiveis: number;
    alocacoesAtivas: number;
    dataLiberacao: Date | null;
    ocupacao: number; // Porcentagem de ocupação
    status: 'disponivel' | 'parcial' | 'ocupado';
}

interface ObraTempoReal {
    id: string;
    nome: string;
    status: string;
    equipes: {
        id: string;
        nome: string;
        tipo: string;
    }[];
    eletricistas: {
        id: string;
        nome: string;
    }[];
    progresso: number;
    dataInicio: Date;
    dataPrevisaoFim?: Date;
}

const MetricasEquipe: React.FC<MetricasEquipeProps> = ({ toggleSidebar }) => {
    const [activeTab, setActiveTab] = useState<TabType>('desempenho');
    const [equipes, setEquipes] = useState<Equipe[]>([]);
    const [alocacoes, setAlocacoes] = useState<Alocacao[]>([]);
    const [obrasAndamento, setObrasAndamento] = useState<ObraTempoReal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Constantes para cálculo de disponibilidade
    const DIAS_MES = 30;
    const DIAS_TRABALHO_MES = 20;
    const REFRESH_INTERVAL = 30000; // 30 segundos

    // Carregar obras em andamento
    const loadObrasAndamento = async () => {
        try {
            const obrasRes = await axiosApiService.get<any[]>(ENDPOINTS.OBRAS.LISTAR);
            
            if (obrasRes.success && obrasRes.data) {
                const obrasEmAndamento = obrasRes.data
                    .filter((obra: any) => obra.status === 'ANDAMENTO' || obra.status === 'A_FAZER')
                    .map((obra: any) => ({
                        id: obra.id,
                        nome: obra.nomeObra,
                        status: obra.status,
                        equipes: [],
                        eletricistas: [],
                        progresso: obra.progresso || 0,
                        dataInicio: obra.dataInicioReal || obra.dataPrevistaInicio,
                        dataPrevisaoFim: obra.dataPrevistaFim
                    }));
                
                setObrasAndamento(obrasEmAndamento);
            }
        } catch (err: any) {
            console.error('❌ Erro ao carregar obras em andamento:', err);
        }
    };

    // Carregar dados
    const loadData = async () => {
        setLoading(true);
        try {
            const [equipesRes, alocacoesRes] = await Promise.all([
                axiosApiService.get<Equipe[]>(ENDPOINTS.OBRAS.EQUIPES),
                axiosApiService.get<Alocacao[]>(ENDPOINTS.OBRAS.ALOCACOES)
            ]);

            if (equipesRes.success && equipesRes.data) {
                setEquipes(Array.isArray(equipesRes.data) ? equipesRes.data : []);
            }

            if (alocacoesRes.success && alocacoesRes.data) {
                const alocacoesArray = Array.isArray(alocacoesRes.data) ? alocacoesRes.data : [];
                setAlocacoes(alocacoesArray);
            }
            
            // Carregar obras em andamento
            await loadObrasAndamento();
            
            setLastUpdate(new Date());
            setError(null);
        } catch (err: any) {
            console.error('❌ Erro ao carregar dados:', err);
            setError('Erro ao carregar dados das métricas');
            toast.error('Erro ao carregar métricas', {
                description: err?.message || 'Erro desconhecido'
            });
        } finally {
            setLoading(false);
        }
    };

    // Carregamento inicial
    useEffect(() => {
        loadData();
    }, []);

    // Auto-refresh a cada 30 segundos
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            console.log('🔄 Atualizando dados em tempo real...');
            loadData();
        }, REFRESH_INTERVAL);

        return () => clearInterval(interval);
    }, [autoRefresh]);

    // Calcular métricas de desempenho das equipes
    const metricasEquipes = useMemo(() => {
        return equipes.map(equipe => {
            const alocacoesEquipe = alocacoes.filter(a => a.equipeId === equipe.id);
            const concluidas = alocacoesEquipe.filter(a => a.status === 'Concluida').length;
            const emAndamento = alocacoesEquipe.filter(a => a.status === 'EmAndamento').length;
            const planejadas = alocacoesEquipe.filter(a => a.status === 'Planejada').length;
            const total = alocacoesEquipe.length;

            return {
                equipe,
                total,
                concluidas,
                emAndamento,
                planejadas,
                taxaConclusao: total > 0 ? (concluidas / total) * 100 : 0
            };
        });
    }, [equipes, alocacoes]);

    // Calcular disponibilidade dos eletricistas
    const disponibilidadeEletricistas = useMemo(() => {
        const eletricistasMap = new Map<string, EletricistaDisponibilidade>();
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

        // Processar todas as alocações do mês atual
        alocacoes.forEach(alocacao => {
            if (!alocacao.eletricista) return;

            const eletricistaId = alocacao.eletricista.id;
            
            if (!eletricistasMap.has(eletricistaId)) {
                eletricistasMap.set(eletricistaId, {
                    id: eletricistaId,
                    nome: alocacao.eletricista.nome || 'Sem nome',
                    email: alocacao.eletricista.email || 'Sem email',
                    diasTrabalhados: 0,
                    diasDisponiveis: DIAS_TRABALHO_MES,
                    alocacoesAtivas: 0,
                    dataLiberacao: null,
                    ocupacao: 0,
                    status: 'disponivel'
                });
            }

            const eletricista = eletricistasMap.get(eletricistaId)!;

            // Contar apenas alocações ativas ou planejadas
            if (alocacao.status === 'EmAndamento' || alocacao.status === 'Planejada') {
                const dataInicio = new Date(alocacao.dataInicio);
                const dataFim = new Date(alocacao.dataFim || alocacao.dataFimPrevisto || alocacao.dataInicio);

                // Calcular dias trabalhados no mês atual
                const inicio = dataInicio > inicioMes ? dataInicio : inicioMes;
                const fim = dataFim < fimMes ? dataFim : fimMes;

                if (inicio <= fim) {
                    const diffTime = Math.abs(fim.getTime() - inicio.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    eletricista.diasTrabalhados += diffDays;
                    eletricista.alocacoesAtivas++;

                    // Atualizar data de liberação (última data de fim)
                    if (!eletricista.dataLiberacao || dataFim > eletricista.dataLiberacao) {
                        eletricista.dataLiberacao = dataFim;
                    }
                }
            }
        });

        // Calcular estatísticas finais
        const eletricistas: EletricistaDisponibilidade[] = Array.from(eletricistasMap.values()).map(e => {
            e.diasDisponiveis = DIAS_TRABALHO_MES - e.diasTrabalhados;
            e.ocupacao = (e.diasTrabalhados / DIAS_TRABALHO_MES) * 100;
            
            if (e.ocupacao >= 90) {
                e.status = 'ocupado';
            } else if (e.ocupacao >= 50) {
                e.status = 'parcial';
            } else {
                e.status = 'disponivel';
            }

            return e;
        });

        return eletricistas.sort((a, b) => b.ocupacao - a.ocupacao);
    }, [alocacoes]);

    // Dados para gráfico de pizza de status das equipes
    const dadosGraficoPizza = useMemo(() => {
        const totalConcluidas = metricasEquipes.reduce((acc, m) => acc + m.concluidas, 0);
        const totalEmAndamento = metricasEquipes.reduce((acc, m) => acc + m.emAndamento, 0);
        const totalPlanejadas = metricasEquipes.reduce((acc, m) => acc + m.planejadas, 0);

        return [
            { nome: 'Concluídas', valor: totalConcluidas, cor: '#10b981' },
            { nome: 'Em Andamento', valor: totalEmAndamento, cor: '#3b82f6' },
            { nome: 'Planejadas', valor: totalPlanejadas, cor: '#f59e0b' }
        ];
    }, [metricasEquipes]);

    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando métricas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={toggleSidebar} 
                        className="lg:hidden p-2 text-gray-600 rounded-xl hover:bg-white hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200" 
                        aria-label="Open sidebar"
                    >
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                            📊 Métricas de Equipe
                        </h1>
                        <p className="text-sm sm:text-base text-gray-500 mt-1">
                            Análise de desempenho e disponibilidade de recursos
                        </p>
                    </div>
                </div>
            </header>

            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 animate-slide-in-up">
                    <h3 className="text-sm font-medium text-red-800">Erro ao carregar dados</h3>
                    <p className="mt-2 text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Tabs */}
            <div className="mb-6">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('desempenho')}
                            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors duration-200 flex items-center gap-2 ${
                                activeTab === 'desempenho'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <ChartPieIcon className="w-5 h-5" />
                            Desempenho das Equipes
                        </button>
                        <button
                            onClick={() => setActiveTab('disponibilidade')}
                            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors duration-200 flex items-center gap-2 ${
                                activeTab === 'disponibilidade'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <ClockIcon className="w-5 h-5" />
                            Disponibilidade de Eletricistas
                        </button>
                        <button
                            onClick={() => setActiveTab('tempo-real')}
                            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors duration-200 flex items-center gap-2 ${
                                activeTab === 'tempo-real'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <CalendarIcon className="w-5 h-5" />
                            <span className="relative">
                                Tempo Real
                                {autoRefresh && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                )}
                            </span>
                        </button>
                    </nav>
                </div>
                
                {/* Indicador de atualização automática */}
                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                            Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
                        </span>
                        <button
                            onClick={loadData}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                            🔄 Atualizar agora
                        </button>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded text-blue-600"
                        />
                        Atualização automática (30s)
                    </label>
                </div>
            </div>

            {/* Conteúdo das Tabs */}
            {activeTab === 'desempenho' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Cards de Resumo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        <div className="card-primary p-6 rounded-2xl shadow-soft border border-gray-100">
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

                        <div className="card-primary p-6 rounded-2xl shadow-soft border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center shadow-sm ring-1 ring-green-200/50">
                                    <CalendarIcon className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Alocações Ativas</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">
                                        {alocacoes.filter(a => a.status === 'EmAndamento').length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card-primary p-6 rounded-2xl shadow-soft border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center shadow-sm ring-1 ring-purple-200/50">
                                    <ChartPieIcon className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Alocações Totais</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">{alocacoes.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="card-primary p-6 rounded-2xl shadow-soft border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center shadow-sm ring-1 ring-orange-200/50">
                                    <ClockIcon className="w-6 h-6 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Taxa Média de Conclusão</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">
                                        {metricasEquipes.length > 0
                                            ? Math.round(
                                                metricasEquipes.reduce((acc, m) => acc + m.taxaConclusao, 0) /
                                                metricasEquipes.length
                                            )
                                            : 0}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Gráfico de Pizza - Distribuição de Status */}
                    <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Distribuição de Alocações por Status</h2>
                        <div className="flex flex-col lg:flex-row items-center gap-8">
                            {/* Gráfico de Pizza Manual */}
                            <div className="relative w-64 h-64">
                                <svg viewBox="0 0 200 200" className="transform -rotate-90">
                                    {(() => {
                                        const total = dadosGraficoPizza.reduce((acc, d) => acc + d.valor, 0);
                                        if (total === 0) return null;

                                        let currentAngle = 0;
                                        return dadosGraficoPizza.map((item, index) => {
                                            const percentage = (item.valor / total) * 100;
                                            const angle = (percentage / 100) * 360;
                                            const startAngle = currentAngle;
                                            const endAngle = currentAngle + angle;
                                            currentAngle = endAngle;

                                            // Calcular path do arco
                                            const startRad = (startAngle * Math.PI) / 180;
                                            const endRad = (endAngle * Math.PI) / 180;
                                            const x1 = 100 + 80 * Math.cos(startRad);
                                            const y1 = 100 + 80 * Math.sin(startRad);
                                            const x2 = 100 + 80 * Math.cos(endRad);
                                            const y2 = 100 + 80 * Math.sin(endRad);
                                            const largeArc = angle > 180 ? 1 : 0;

                                            return (
                                                <path
                                                    key={index}
                                                    d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                                    fill={item.cor}
                                                    className="hover:opacity-80 transition-opacity cursor-pointer"
                                                />
                                            );
                                        });
                                    })()}
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-gray-900">
                                            {dadosGraficoPizza.reduce((acc, d) => acc + d.valor, 0)}
                                        </p>
                                        <p className="text-sm text-gray-500">Total</p>
                                    </div>
                                </div>
                            </div>

                            {/* Legenda */}
                            <div className="flex-1 space-y-4">
                                {dadosGraficoPizza.map((item, index) => {
                                    const total = dadosGraficoPizza.reduce((acc, d) => acc + d.valor, 0);
                                    const percentage = total > 0 ? ((item.valor / total) * 100).toFixed(1) : 0;
                                    return (
                                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="w-4 h-4 rounded-full" 
                                                    style={{ backgroundColor: item.cor }}
                                                />
                                                <span className="font-semibold text-gray-900">{item.nome}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-gray-900">{item.valor}</p>
                                                <p className="text-sm text-gray-500">{percentage}%</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Ranking de Equipes */}
                    <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">🏆 Ranking de Desempenho das Equipes</h2>
                        <div className="space-y-3">
                            {metricasEquipes
                                .sort((a, b) => b.taxaConclusao - a.taxaConclusao)
                                .map((metrica, index) => (
                                    <div 
                                        key={metrica.equipe.id} 
                                        className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:shadow-md transition-all"
                                    >
                                        {/* Posição */}
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                                            index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white shadow-lg' :
                                            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-md' :
                                            index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-md' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                        </div>

                                        {/* Info da Equipe */}
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-900">{metrica.equipe.nome}</h3>
                                            <p className="text-sm text-gray-600">Tipo: {metrica.equipe.tipo}</p>
                                        </div>

                                        {/* Estatísticas */}
                                        <div className="hidden sm:flex items-center gap-6 text-sm">
                                            <div className="text-center">
                                                <p className="font-bold text-green-600">{metrica.concluidas}</p>
                                                <p className="text-xs text-gray-500">Concluídas</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-bold text-blue-600">{metrica.emAndamento}</p>
                                                <p className="text-xs text-gray-500">Em Andamento</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-bold text-orange-600">{metrica.planejadas}</p>
                                                <p className="text-xs text-gray-500">Planejadas</p>
                                            </div>
                                        </div>

                                        {/* Taxa de Conclusão */}
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-gray-900">
                                                {Math.round(metrica.taxaConclusao)}%
                                            </p>
                                            <p className="text-xs text-gray-500">Taxa de Conclusão</p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'disponibilidade' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Informações sobre o Cálculo */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-blue-900 mb-2">ℹ️ Como Calculamos a Disponibilidade</h3>
                        <p className="text-sm text-blue-800">
                            • Mês tem <strong>30 dias</strong> no total<br />
                            • Cada eletricista trabalha <strong>20 dias úteis</strong> por mês<br />
                            • A ocupação é calculada com base nas alocações ativas do mês atual<br />
                            • Status: <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded font-semibold">Disponível</span> (&lt;50%), <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded font-semibold">Parcial</span> (50-90%), <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-semibold">Ocupado</span> (&gt;90%)
                        </p>
                    </div>

                    {/* Cards de Resumo */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="card-primary p-6 rounded-2xl shadow-soft border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center shadow-sm">
                                    <UsersIcon className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Disponíveis</p>
                                    <p className="text-3xl font-bold text-green-600">
                                        {disponibilidadeEletricistas.filter(e => e.status === 'disponivel').length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card-primary p-6 rounded-2xl shadow-soft border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100 flex items-center justify-center shadow-sm">
                                    <UsersIcon className="w-6 h-6 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Parcialmente</p>
                                    <p className="text-3xl font-bold text-yellow-600">
                                        {disponibilidadeEletricistas.filter(e => e.status === 'parcial').length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card-primary p-6 rounded-2xl shadow-soft border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center shadow-sm">
                                    <UsersIcon className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Ocupados</p>
                                    <p className="text-3xl font-bold text-red-600">
                                        {disponibilidadeEletricistas.filter(e => e.status === 'ocupado').length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card-primary p-6 rounded-2xl shadow-soft border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shadow-sm">
                                    <CalendarIcon className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Total</p>
                                    <p className="text-3xl font-bold text-blue-600">
                                        {disponibilidadeEletricistas.length}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lista de Eletricistas */}
                    <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">
                            👷 Disponibilidade de Eletricistas - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </h2>
                        
                        {disponibilidadeEletricistas.length === 0 ? (
                            <div className="text-center py-12">
                                <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Nenhum eletricista com alocações no mês atual</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {disponibilidadeEletricistas.map((eletricista) => (
                                    <div 
                                        key={eletricista.id} 
                                        className="p-5 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:shadow-md transition-all"
                                    >
                                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                            {/* Info do Eletricista */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="font-bold text-gray-900 text-lg">{eletricista.nome}</h3>
                                                    <span className={`px-3 py-1 text-xs font-bold rounded-lg ${
                                                        eletricista.status === 'disponivel' ? 'bg-green-100 text-green-800 ring-1 ring-green-200' :
                                                        eletricista.status === 'parcial' ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200' :
                                                        'bg-red-100 text-red-800 ring-1 ring-red-200'
                                                    }`}>
                                                        {eletricista.status === 'disponivel' ? '✅ Disponível' :
                                                         eletricista.status === 'parcial' ? '⚠️ Parcialmente Ocupado' :
                                                         '🔴 Totalmente Ocupado'}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600">{eletricista.email}</p>
                                            </div>

                                            {/* Estatísticas */}
                                            <div className="flex flex-wrap gap-6 text-sm">
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-blue-600">{eletricista.diasTrabalhados}</p>
                                                    <p className="text-xs text-gray-500">Dias Trabalhados</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-green-600">{eletricista.diasDisponiveis}</p>
                                                    <p className="text-xs text-gray-500">Dias Disponíveis</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-orange-600">{eletricista.alocacoesAtivas}</p>
                                                    <p className="text-xs text-gray-500">Alocações Ativas</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-purple-600">{Math.round(eletricista.ocupacao)}%</p>
                                                    <p className="text-xs text-gray-500">Ocupação</p>
                                                </div>
                                            </div>

                                            {/* Data de Liberação */}
                                            <div className="text-center lg:text-right">
                                                {eletricista.dataLiberacao ? (
                                                    <>
                                                        <p className="text-xs text-gray-500 mb-1">Liberação Prevista</p>
                                                        <p className="text-sm font-bold text-gray-900">
                                                            {new Date(eletricista.dataLiberacao).toLocaleDateString('pt-BR')}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {(() => {
                                                                const hoje = new Date();
                                                                const liberacao = new Date(eletricista.dataLiberacao);
                                                                const diffTime = liberacao.getTime() - hoje.getTime();
                                                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                                if (diffDays < 0) return 'Já liberado';
                                                                if (diffDays === 0) return 'Libera hoje';
                                                                if (diffDays === 1) return 'Libera amanhã';
                                                                return `Em ${diffDays} dias`;
                                                            })()}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-gray-500">Sem alocações ativas</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Barra de Progresso */}
                                        <div className="mt-4">
                                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                                                <span>Capacidade utilizada</span>
                                                <span>{Math.round(eletricista.ocupacao)}% de {DIAS_TRABALHO_MES} dias</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-500 rounded-full ${
                                                        eletricista.status === 'disponivel' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                                        eletricista.status === 'parcial' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                                        'bg-gradient-to-r from-red-500 to-red-600'
                                                    }`}
                                                    style={{ width: `${Math.min(eletricista.ocupacao, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'tempo-real' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Cards de Resumo Tempo Real */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="card-primary p-6 rounded-2xl shadow-soft border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center shadow-sm">
                                    <CalendarIcon className="w-6 h-6 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Obras em Andamento</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">{obrasAndamento.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="card-primary p-6 rounded-2xl shadow-soft border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shadow-sm">
                                    <UsersIcon className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Equipes Alocadas</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">
                                        {equipes.filter(e => e.ativa).length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card-primary p-6 rounded-2xl shadow-soft border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center shadow-sm">
                                    <UsersIcon className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Eletricistas Ativos</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">
                                        {disponibilidadeEletricistas.filter(e => e.alocacoesAtivas > 0).length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card-primary p-6 rounded-2xl shadow-soft border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center shadow-sm">
                                    <ClockIcon className="w-6 h-6 text-purple-600" />
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

                    {/* Lista de Obras em Andamento */}
                    <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">
                            🏗️ Obras em Andamento - Atualização em Tempo Real
                        </h2>
                        
                        {obrasAndamento.length === 0 ? (
                            <div className="text-center py-12">
                                <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Nenhuma obra em andamento no momento</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {obrasAndamento.map((obra) => {
                                    // Buscar alocações desta obra
                                    const alocacoesObra = alocacoes.filter(a => a.projetoId === obra.id && a.status === 'EmAndamento');
                                    const equipesObra = new Set(alocacoesObra.filter(a => a.equipeId).map(a => a.equipe?.nome)).size;
                                    const eletricistasObra = new Set(alocacoesObra.filter(a => a.eletricistaId).map(a => a.eletricista?.nome)).size;

                                    return (
                                        <div 
                                            key={obra.id} 
                                            className="p-5 bg-gradient-to-r from-blue-50 to-white rounded-xl border border-blue-200 hover:shadow-lg transition-all"
                                        >
                                            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                                {/* Info da Obra */}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="font-bold text-gray-900 text-lg">{obra.nome}</h3>
                                                        <span className={`px-3 py-1 text-xs font-bold rounded-lg ${
                                                            obra.status === 'ANDAMENTO' ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-200' :
                                                            'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200'
                                                        }`}>
                                                            {obra.status === 'ANDAMENTO' ? '🔵 Em Andamento' : '🟡 A Fazer'}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                                        <span>📅 Início: {new Date(obra.dataInicio).toLocaleDateString('pt-BR')}</span>
                                                        {obra.dataPrevisaoFim && (
                                                            <span>🏁 Previsão: {new Date(obra.dataPrevisaoFim).toLocaleDateString('pt-BR')}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Estatísticas em Tempo Real */}
                                                <div className="flex flex-wrap gap-6 text-sm">
                                                    <div className="text-center">
                                                        <p className="text-2xl font-bold text-blue-600">{equipesObra}</p>
                                                        <p className="text-xs text-gray-500">Equipes</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-2xl font-bold text-green-600">{eletricistasObra}</p>
                                                        <p className="text-xs text-gray-500">Eletricistas</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-2xl font-bold text-purple-600">{alocacoesObra.length}</p>
                                                        <p className="text-xs text-gray-500">Alocações</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-2xl font-bold text-orange-600">{obra.progresso}%</p>
                                                        <p className="text-xs text-gray-500">Progresso</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Barra de Progresso */}
                                            <div className="mt-4">
                                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                                    <span>Progresso da obra</span>
                                                    <span>{obra.progresso}% concluído</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                                    <div 
                                                        className="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                                                        style={{ width: `${obra.progresso}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Alocações Detalhadas */}
                                            {alocacoesObra.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-gray-200">
                                                    <p className="text-xs font-semibold text-gray-700 mb-2">Alocações Ativas:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {alocacoesObra.map((alocacao) => (
                                                            <span 
                                                                key={alocacao.id}
                                                                className="px-3 py-1 bg-white text-xs font-medium text-gray-700 rounded-full border border-gray-200 shadow-sm"
                                                            >
                                                                {alocacao.equipe?.nome || alocacao.eletricista?.nome || 'Sem nome'}
                                                                {alocacao.dataFimPrevisto && (
                                                                    <span className="ml-1 text-gray-500">
                                                                        (até {new Date(alocacao.dataFimPrevisto).toLocaleDateString('pt-BR')})
                                                                    </span>
                                                                )}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Eletricistas Disponíveis para Alocação */}
                    <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">
                            👷 Eletricistas Disponíveis para Nova Alocação
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {disponibilidadeEletricistas
                                .filter(e => e.status === 'disponivel' || e.status === 'parcial')
                                .slice(0, 6)
                                .map((eletricista) => (
                                    <div 
                                        key={eletricista.id}
                                        className="p-4 bg-gradient-to-br from-green-50 to-white rounded-xl border border-green-200"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <h4 className="font-bold text-gray-900">{eletricista.nome}</h4>
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                                                eletricista.status === 'disponivel' ? 'bg-green-100 text-green-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {eletricista.status === 'disponivel' ? '✅' : '⚠️'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 mb-2">{eletricista.email}</p>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-gray-500">Disponível:</span>
                                                <p className="font-bold text-green-600">{eletricista.diasDisponiveis} dias</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Ocupação:</span>
                                                <p className="font-bold text-blue-600">{Math.round(eletricista.ocupacao)}%</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                        {disponibilidadeEletricistas.filter(e => e.status === 'disponivel' || e.status === 'parcial').length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                Todos os eletricistas estão totalmente alocados no momento
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MetricasEquipe;

