import React, { useState, useEffect } from 'react';
import StatCard from './StatCard';
import RecentMovements from './RecentMovements';
import CriticalAlerts from './CriticalAlerts';
import QuickActions from './QuickActions';
import OngoingProjects from './OngoingProjects';
import { ProjectStatus, type StatCardData, type Project } from '../types';
import { 
    CubeIcon, 
    BlueprintIcon, 
    CurrencyDollarIcon, 
    ExclamationTriangleIcon, 
    TrendingUpIcon,
    CatalogIcon,
    BoltIcon
} from '../constants';
import { dashboardService, type DashboardCompleto } from '../services/dashboardService';

const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" x2="20" y1="12" y2="12" />
        <line x1="4" x2="20" y1="6" y2="6" />
        <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
);

interface DashboardProps {
    toggleSidebar: () => void;
    onNavigate: (view: string) => void;
    projects: Project[];
}

const Dashboard: React.FC<DashboardProps> = ({ toggleSidebar, onNavigate, projects }) => {
    const [dashboardData, setDashboardData] = useState<DashboardCompleto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<string>('');
    const [connectivityStatus, setConnectivityStatus] = useState<'connected' | 'disconnected' | 'testing'>('testing');

    // Carregar dados do dashboard usando o serviço centralizado
    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            setConnectivityStatus('testing');
            
            console.log('🔍 Carregando dashboard completo via serviço...');

            // Testar conectividade primeiro
            const connectivityTest = await dashboardService.testarConectividade();
            
            if (!connectivityTest.success) {
                setConnectivityStatus('disconnected');
                setError(`Erro de conexão: ${connectivityTest.message}`);
                return;
            }

            setConnectivityStatus('connected');
            console.log(`🌐 Backend conectado (${connectivityTest.responseTime}ms)`);

            // Carregar dados completos
            const result = await dashboardService.getDashboardCompleto();
            
            if (result.success && result.data) {
                setDashboardData(result.data);
                console.log('✅ Dashboard carregado com sucesso:', result.data);
                
                if (result.errors && result.errors.length > 0) {
                    console.warn('⚠️ Alguns dados não puderam ser carregados:', result.errors);
                    setError(`Avisos: ${result.errors.join(', ')}`);
                }
            } else {
                setError(`Erro ao carregar dashboard: ${result.errors?.join(', ') || 'Erro desconhecido'}`);
            }

            setLastUpdate(new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }));

        } catch (err) {
            console.error('❌ Erro crítico ao carregar dashboard:', err);
            setError('Erro crítico na conexão com o backend');
            setConnectivityStatus('disconnected');
        } finally {
            setLoading(false);
        }
    };

    // Carregar dados na inicialização
    useEffect(() => {
        loadDashboardData();
        
        // Auto-refresh a cada 5 minutos
        const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Função para atualizar dados manualmente
    const handleRefreshData = async () => {
        await loadDashboardData();
    };

    // Calcular estatísticas dinâmicas usando dados da API (com proteção contra undefined)
    const materials = dashboardData?.materiais || [];
    const movements = dashboardData?.movimentacoes || [];
    const apiProjects = dashboardData?.projetos || [];
    
    const totalCatalogItems = materials.length;
    const activeProjectsCount = dashboardData?.estatisticas?.projetos?.ativos ?? 
        projects.filter(p => p.status === ProjectStatus.EmExecucao || p.status === ProjectStatus.Planejamento).length;
    
    const totalStockValue = materials.reduce((total, material) => {
        const estoque = material.estoque || material.stock || 0;
        const preco = material.preco || material.price || 0;
        return total + (estoque * preco);
    }, 0);

    const criticalItems = dashboardData?.alertas?.estoqueBaixo?.itens || 
        materials.filter(material => {
            const estoque = material.estoque || material.stock || 0;
            const estoqueMinimo = material.estoqueMinimo || material.minStock || 5;
            return estoque <= estoqueMinimo;
        });
    const criticalAlertsCount = criticalItems.length;

    // Dados dos cards com dados reais da API
    const statCardsData: StatCardData[] = [
        { 
            title: 'Itens no Catálogo', 
            value: totalCatalogItems.toString(), 
            subtitle: 'Produtos e Materiais', 
            color: 'bg-blue-500', 
            subtitleIcon: <CatalogIcon className="w-3.5 h-3.5" />, 
            icon: <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shadow-sm ring-1 ring-blue-200/50"><CatalogIcon className="w-7 h-7 text-blue-600" /></div> 
        },
        { 
            title: 'Projetos Ativos', 
            value: activeProjectsCount.toString(), 
            subtitle: 'Em andamento/planejamento', 
            color: 'bg-green-500', 
            subtitleIcon: <BoltIcon className="w-3.5 h-3.5" />, 
            icon: <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center shadow-sm ring-1 ring-green-200/50"><BlueprintIcon className="w-7 h-7 text-green-600" /></div> 
        },
        { 
            title: 'Valor do Estoque', 
            value: `R$ ${totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
            subtitle: 'Total em materiais', 
            color: 'bg-purple-500', 
            subtitleIcon: <TrendingUpIcon className="w-3.5 h-3.5" />, 
            icon: <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center shadow-sm ring-1 ring-purple-200/50"><CurrencyDollarIcon className="w-7 h-7 text-purple-600" /></div> 
        },
        { 
            title: 'Alertas Críticos', 
            value: (dashboardData?.estatisticas?.estoque?.materiaisBaixo ?? criticalAlertsCount).toString(), 
            subtitle: 'Estoque abaixo do mínimo', 
            color: 'bg-orange-500', 
            subtitleIcon: <ExclamationTriangleIcon className="w-3.5 h-3.5" />, 
            icon: <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center shadow-sm ring-1 ring-orange-200/50"><ExclamationTriangleIcon className="w-7 h-7 text-orange-600" /></div> 
        },
    ];

    // Adicionar cards extras se tivermos dados do backend (com proteção contra undefined)
    if (dashboardData?.estatisticas?.clientes && dashboardData?.estatisticas?.vendas) {
        const extraCards: StatCardData[] = [
            {
                title: 'Clientes Ativos',
                value: (dashboardData.estatisticas.clientes?.ativos ?? 0).toString(),
                subtitle: 'Clientes cadastrados',
                color: 'bg-teal-500',
                subtitleIcon: <CatalogIcon className="w-3.5 h-3.5" />,
                icon: <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center shadow-sm ring-1 ring-teal-200/50"><span className="text-2xl">👥</span></div>
            },
            {
                title: 'Vendas no Mês',
                value: (dashboardData.estatisticas.vendas?.mesAtual ?? 0).toString(),
                subtitle: 'Vendas realizadas',
                color: 'bg-emerald-500',
                subtitleIcon: <TrendingUpIcon className="w-3.5 h-3.5" />,
                icon: <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center shadow-sm ring-1 ring-emerald-200/50"><span className="text-2xl">💰</span></div>
            }
        ];
        statCardsData.push(...extraCards);
    }

    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Carregando dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
            {/* Header Modernizado */}
            <header className="flex justify-between items-start mb-8 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-white dark:hover:bg-dark-card hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200" aria-label="Open sidebar">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">Dashboard Executivo</h1>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">Visão geral do sistema de gestão S3E</p>
                    </div>
                </div>
                 <div className="flex items-center gap-3 sm:gap-4">
                    <button
                        onClick={handleRefreshData}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all font-semibold"
                        title="Atualizar dados"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Atualizar
                    </button>
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-500 font-medium">Última atualização</p>
                        <p className="text-sm font-semibold text-gray-700 mt-0.5">{lastUpdate}</p>
                    </div>
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex-shrink-0 ring-2 ring-white shadow-medium overflow-hidden">
                         <img className="w-full h-full object-cover" src="https://picsum.photos/100" alt="User Avatar" />
                    </div>
                </div>
            </header>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 animate-fade-in">
                    <p className="text-red-800 font-medium">⚠️ {error}</p>
                    <button 
                        onClick={handleRefreshData}
                        className="mt-2 text-red-700 hover:text-red-900 font-medium underline"
                    >
                        Tentar novamente
                    </button>
                </div>
            )}

            {/* Stats Cards Grid com animação */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-6 mb-8">
                {statCardsData.map((card, index) => (
                    <div key={index} style={{ animationDelay: `${index * 0.1}s` }}>
                        <StatCard data={card} />
                    </div>
                ))}
            </div>

            {/* Indicadores de Status da API */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-soft">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Status da API</p>
                            <p className={`text-lg font-bold ${dashboardData ? 'text-green-600' : 'text-red-600'}`}>
                                {dashboardData ? '🟢 Conectado' : '🔴 Desconectado'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500">Backend</p>
                            <p className="text-sm font-semibold text-gray-700">S3E API</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-soft">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Materiais Carregados</p>
                            <p className="text-lg font-bold text-blue-600">{materials.length}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500">Estoque</p>
                            <p className="text-sm font-semibold text-gray-700">Itens</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-soft">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Movimentações Recentes</p>
                            <p className="text-lg font-bold text-purple-600">{movements.length}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500">Últimas</p>
                            <p className="text-sm font-semibold text-gray-700">Atividades</p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                    <RecentMovements movements={movements} materials={materials} />
                    <OngoingProjects projects={apiProjects.length > 0 ? apiProjects : projects} />
                    
                    {/* Resumo Financeiro com dados da API */}
                    {dashboardData?.estatisticas && (
                        <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Resumo Executivo</h3>
                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                    ✅ Dados Reais
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                                    <p className="text-sm font-medium text-blue-800">Clientes Ativos</p>
                                    <p className="text-2xl font-bold text-blue-900">{dashboardData.estatisticas.clientes?.ativos ?? 0}</p>
                                </div>
                                <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl">
                                    <p className="text-sm font-medium text-orange-800">Fornecedores</p>
                                    <p className="text-2xl font-bold text-orange-900">{dashboardData.estatisticas.fornecedores?.ativos ?? 0}</p>
                                </div>
                                <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                                    <p className="text-sm font-medium text-green-800">Vendas no Mês</p>
                                    <p className="text-2xl font-bold text-green-900">{dashboardData.estatisticas.vendas?.mesAtual ?? 0}</p>
                                </div>
                                <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl">
                                    <p className="text-sm font-medium text-purple-800">Projetos Ativos</p>
                                    <p className="text-2xl font-bold text-purple-900">{dashboardData.estatisticas.projetos?.ativos ?? 0}</p>
                                </div>
                                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
                                    <p className="text-sm font-medium text-yellow-800">Equipes Ativas</p>
                                    <p className="text-2xl font-bold text-yellow-900">{dashboardData.estatisticas.equipes?.ativas ?? 0}</p>
                                </div>
                                <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                                    <p className="text-sm font-medium text-red-800">Estoque Baixo</p>
                                    <p className="text-2xl font-bold text-red-900">{dashboardData.estatisticas.estoque?.materiaisBaixo ?? 0}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="lg:col-span-1 space-y-6 sm:space-y-8">
                    <CriticalAlerts materials={criticalItems} />
                    <QuickActions onNavigate={onNavigate} />
                    
                    {/* API Status Card */}
                    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Status da Integração</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Backend API</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    connectivityStatus === 'connected' ? 'bg-green-100 text-green-800' : 
                                    connectivityStatus === 'disconnected' ? 'bg-red-100 text-red-800' : 
                                    'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {connectivityStatus === 'connected' ? '🟢 Online' : 
                                     connectivityStatus === 'disconnected' ? '🔴 Offline' : 
                                     '🟡 Testando...'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Materiais</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    materials.length > 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {materials.length > 0 ? `${materials.length} carregados` : 'Sem dados'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Movimentações</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    movements.length > 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {movements.length > 0 ? `${movements.length} recentes` : 'Sem dados'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Projetos API</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    apiProjects.length > 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {apiProjects.length > 0 ? `${apiProjects.length} ativos` : 'Usando locais'}
                                </span>
                            </div>
                        </div>
                        
                        <button 
                            onClick={handleRefreshData}
                            disabled={loading}
                            className={`w-full mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? '⏳ Carregando...' : '🔄 Recarregar Dados'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Debug Info (apenas em desenvolvimento) */}
            {process.env.NODE_ENV === 'development' && dashboardData && (
                <div className="mt-8 bg-gray-900 text-green-400 rounded-2xl p-6 font-mono text-sm">
                    <h4 className="text-green-300 font-bold mb-3">🔧 Debug Info - Dashboard API Integration</h4>
                    <div className="space-y-2">
                        <p>📊 Estatísticas carregadas: {dashboardData ? '✅' : '❌'}</p>
                        <p>📦 Materiais: {materials.length} itens</p>
                        <p>🔄 Movimentações: {movements.length} registros</p>
                        <p>🏗️ Projetos: {projects.length} projetos (local) + {apiProjects.length} (API)</p>
                        <p>⚠️ Alertas críticos: {criticalAlertsCount}</p>
                        <p>💰 Valor do estoque: R$ {totalStockValue.toLocaleString('pt-BR')}</p>
                        <p>🕐 Última atualização: {lastUpdate}</p>
                        <p>🌐 Status conectividade: {connectivityStatus}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;