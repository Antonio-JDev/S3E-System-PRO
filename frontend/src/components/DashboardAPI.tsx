import React, { useState, useEffect } from 'react';
import { dashboardService, type Estatisticas, type Graficos, type Alertas } from '../services/dashboardService';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import StatCard from './StatCard';
import CriticalAlerts from './CriticalAlerts';
import QuickActions from './QuickActions';
import { 
    CubeIcon, 
    BlueprintIcon, 
    CurrencyDollarIcon, 
    ExclamationTriangleIcon, 
    TrendingUpIcon,
    CatalogIcon,
    BoltIcon
} from '../constants';

const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" x2="20" y1="12" y2="12" />
        <line x1="4" x2="20" y1="6" y2="6" />
        <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
);

interface DashboardAPIProps {
    toggleSidebar: () => void;
    onNavigate: (view: string) => void;
}

const DashboardAPI: React.FC<DashboardAPIProps> = ({ toggleSidebar, onNavigate }) => {
    const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
    const [graficos, setGraficos] = useState<Graficos | null>(null);
    const [alertas, setAlertas] = useState<Alertas | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [estatisticasResponse, graficosResponse, alertasResponse] = await Promise.all([
                dashboardService.getEstatisticas(),
                dashboardService.getGraficos(),
                dashboardService.getAlertas()
            ]);

            if (estatisticasResponse.success && estatisticasResponse.data) {
                setEstatisticas(estatisticasResponse.data);
            }

            if (graficosResponse.success && graficosResponse.data) {
                setGraficos(graficosResponse.data);
            }

            if (alertasResponse.success && alertasResponse.data) {
                setAlertas(alertasResponse.data);
            }
        } catch (err) {
            setError('Erro ao carregar dados do dashboard');
            console.error('Erro ao carregar dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <LoadingSpinner size="lg" text="Carregando dashboard..." />;
    }

    if (error) {
        return <ErrorMessage message={error} onRetry={loadDashboardData} />;
    }

    const statCardsData = estatisticas ? [
        { 
            title: 'Clientes Ativos', 
            value: estatisticas.clientes.ativos.toString(), 
            subtitle: `Total: ${estatisticas.clientes.total}`, 
            color: 'bg-blue-500', 
            subtitleIcon: <CubeIcon className="w-4 h-4" />, 
            icon: <CubeIcon className="w-8 h-8" />
        },
        { 
            title: 'Fornecedores Ativos', 
            value: estatisticas.fornecedores.ativos.toString(), 
            subtitle: `Total: ${estatisticas.fornecedores.total}`, 
            color: 'bg-green-500', 
            subtitleIcon: <CubeIcon className="w-4 h-4" />, 
            icon: <CubeIcon className="w-8 h-8" />
        },
        { 
            title: 'Projetos Ativos', 
            value: estatisticas.projetos.ativos.toString(), 
            subtitle: `${estatisticas.projetos.pendentes} pendentes`, 
            color: 'bg-purple-500', 
            subtitleIcon: <BlueprintIcon className="w-4 h-4" />, 
            icon: <BlueprintIcon className="w-8 h-8" />
        },
        { 
            title: 'Vendas do Mês', 
            value: estatisticas.vendas.mesAtual.toString(), 
            subtitle: 'Este mês', 
            color: 'bg-green-500', 
            subtitleIcon: <CurrencyDollarIcon className="w-4 h-4" />, 
            icon: <CurrencyDollarIcon className="w-8 h-8" />
        },
        { 
            title: 'Estoque Baixo', 
            value: estatisticas.estoque.materiaisBaixo.toString(), 
            subtitle: 'Materiais com estoque baixo', 
            color: 'bg-red-500', 
            subtitleIcon: <ExclamationTriangleIcon className="w-4 h-4" />, 
            icon: <ExclamationTriangleIcon className="w-8 h-8" />
        },
        { 
            title: 'Equipes Ativas', 
            value: estatisticas.equipes.ativas.toString(), 
            subtitle: `Total: ${estatisticas.equipes.total}`, 
            color: 'bg-indigo-500', 
            subtitleIcon: <BoltIcon className="w-4 h-4" />, 
            icon: <BoltIcon className="w-8 h-8" />
        }
    ] : [];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow">
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <button
                                onClick={toggleSidebar}
                                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 lg:hidden"
                            >
                                <Bars3Icon className="h-6 w-6" />
                            </button>
                            <div className="ml-4">
                                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                                <p className="text-sm text-gray-500">Visão geral do sistema</p>
                            </div>
                        </div>
                        <button
                            onClick={loadDashboardData}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Atualizar
                        </button>
                    </div>
                </div>
            </div>

            {/* Conteúdo */}
            <div className="px-4 sm:px-6 lg:px-8 py-8">
                {/* Cards de Estatísticas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {statCardsData.map((stat, index) => (
                        <StatCard key={index} {...stat} />
                    ))}
                </div>

                {/* Alertas Críticos */}
                {alertas && (
                    <div className="mb-8">
                        <CriticalAlerts 
                            alerts={[
                                {
                                    title: 'Estoque Baixo',
                                    level: 'warning',
                                    count: alertas.estoqueBaixo.itens.length,
                                    items: alertas.estoqueBaixo.itens.map(item => ({
                                        id: item.id,
                                        title: item.nome,
                                        description: `Estoque: ${item.estoque} (Mín: ${item.estoqueMinimo})`,
                                        level: 'warning'
                                    }))
                                },
                                {
                                    title: 'Orçamentos Vencendo',
                                    level: 'info',
                                    count: alertas.orcamentosVencendo.itens.length,
                                    items: alertas.orcamentosVencendo.itens.map(item => ({
                                        id: item.id,
                                        title: item.titulo,
                                        description: `${item.cliente} - ${item.diasRestantes} dias restantes`,
                                        level: 'info'
                                    }))
                                },
                                {
                                    title: 'Contas Vencidas',
                                    level: 'error',
                                    count: alertas.contasVencidas.itens.length,
                                    items: alertas.contasVencidas.itens.map(item => ({
                                        id: item.id,
                                        title: item.descricao,
                                        description: `${item.fornecedor} - ${item.diasAtraso} dias em atraso`,
                                        level: 'error'
                                    }))
                                },
                                {
                                    title: 'Projetos Atrasados',
                                    level: 'warning',
                                    count: alertas.projetosAtrasados.itens.length,
                                    items: alertas.projetosAtrasados.itens.map(item => ({
                                        id: item.id,
                                        title: item.titulo,
                                        description: `${item.cliente} - ${item.diasAtraso} dias de atraso`,
                                        level: 'warning'
                                    }))
                                }
                            ]}
                        />
                    </div>
                )}

                {/* Ações Rápidas */}
                <div className="mb-8">
                    <QuickActions onNavigate={onNavigate} />
                </div>

                {/* Componentes de teste removidos para produção */}

                {/* Gráficos */}
                {graficos && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Vendas por Mês */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Vendas por Mês</h3>
                            <div className="space-y-2">
                                {graficos.vendasPorMes.map((venda, index) => (
                                    <div key={index} className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">{venda.mes}</span>
                                        <div className="flex items-center space-x-4">
                                            <span className="text-sm text-gray-900">{venda.quantidade} vendas</span>
                                            <span className="text-sm font-medium text-green-600">
                                                R$ {venda.valor.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Projetos por Status */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Projetos por Status</h3>
                            <div className="space-y-2">
                                {graficos.projetosPorStatus.map((projeto, index) => (
                                    <div key={index} className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">{projeto.status}</span>
                                        <span className="text-sm font-medium text-gray-900">{projeto.quantidade}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardAPI;
