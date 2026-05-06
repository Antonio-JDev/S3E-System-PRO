import React, { useState, useEffect, useMemo } from 'react';
import { financeiroService, type ResumoFinanceiro } from '../services/financeiroService';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ==================== ICONS ====================
const CurrencyDollarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.268-.268-1.268-.732 0-.464.543-.732 1.268-.732.725 0 1.268.268 1.268.732" />
    </svg>
);

const ArrowTrendingUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
);

const ArrowTrendingDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.511l-5.511-3.182" />
    </svg>
);

const BanknotesIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H15.75c.621 0 1.125.504 1.125 1.125v.375m-13.5 0h12m-12 0v.75c0 .414.336.75.75.75h9.75c.621 0 1.125-.504 1.125-1.125v-.375M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5zm-3 0h.008v.008H12V10.5zm-3 0h.008v.008H9V10.5zm-3 0h.008v.008H6V10.5z" />
    </svg>
);

const ChartBarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
);

const ExclamationTriangleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);

interface FinanceiroDashboardProps {
    setAbaAtiva: (aba: string) => void;
}

const FinanceiroDashboard: React.FC<FinanceiroDashboardProps> = ({ setAbaAtiva }) => {
    const [loading, setLoading] = useState(true);
    const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
    const [dadosGraficos, setDadosGraficos] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [resumoRes, graficosRes] = await Promise.all([
                financeiroService.getResumo(),
                financeiroService.getDadosGraficos()
            ]);

            if (resumoRes.success && resumoRes.data) {
                setResumo(resumoRes.data);
            } else {
                console.warn('⚠️ Erro ao carregar resumo:', resumoRes.error);
            }

            if (graficosRes.success && graficosRes.data) {
                const dados = Array.isArray(graficosRes.data) ? graficosRes.data : [];
                setDadosGraficos(dados);
            } else {
                console.warn('⚠️ Erro ao carregar gráficos:', graficosRes.error);
            }
        } catch (err) {
            console.error('❌ Erro ao carregar dashboard:', err);
            setError('Erro ao carregar dados do dashboard');
        } finally {
            setLoading(false);
        }
    };

    const dadosFluxoCaixa = useMemo(() => {
        if (dadosGraficos.length > 0) {
            return dadosGraficos.slice(-6).map((item: any) => ({
                mes: item.mes || 'N/A',
                receita: item.receita || 0,
                despesa: item.despesa || 0,
                saldo: (item.receita || 0) - (item.despesa || 0)
            }));
        }
        return [];
    }, [dadosGraficos]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando dashboard financeiro...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                <p className="text-red-800 font-medium">⚠️ {error}</p>
                <button
                    onClick={loadDashboardData}
                    className="mt-3 text-red-700 hover:text-red-900 font-medium underline"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total a Receber */}
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                            <ArrowTrendingUpIcon className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">A Receber</p>
                            <p className="text-2xl font-bold text-green-600">
                                R$ {(resumo?.contasReceber || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Total a Pagar */}
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
                            <ArrowTrendingDownIcon className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">A Pagar</p>
                            <p className="text-2xl font-bold text-red-600">
                                R$ {(resumo?.contasPagar || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Saldo Previsto */}
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                            <BanknotesIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Saldo Previsto</p>
                            <p className={`text-2xl font-bold ${
                                (resumo?.saldoAtual || 0) >= 0 ? 'text-blue-600' : 'text-red-600'
                            }`}>
                                R$ {(resumo?.saldoAtual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Lucro Líquido */}
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                            <ChartBarIcon className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Lucro Líquido</p>
                            <p className={`text-2xl font-bold ${
                                (resumo?.lucroLiquido || 0) >= 0 ? 'text-purple-600' : 'text-red-600'
                            }`}>
                                R$ {(resumo?.lucroLiquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alertas */}
            {(resumo && (resumo.receitaMes < resumo.despesaMes)) && (
                <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                        <ExclamationTriangleIcon className="w-8 h-8 text-orange-600 flex-shrink-0" />
                        <div>
                            <h3 className="text-lg font-semibold text-orange-900 mb-2">⚠️ Atenção ao Fluxo de Caixa</h3>
                            <p className="text-orange-800">
                                As despesas do mês (R$ {(resumo.despesaMes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) 
                                estão maiores que as receitas (R$ {(resumo.receitaMes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). 
                                Revise os pagamentos e considere ações para melhorar o fluxo de caixa.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de Fluxo de Caixa */}
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <ChartBarIcon className="w-6 h-6 text-emerald-600" />
                        Fluxo de Caixa Mensal
                    </h3>
                    {dadosFluxoCaixa.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={dadosFluxoCaixa}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis 
                                    dataKey="mes" 
                                    stroke="#6b7280"
                                    style={{ fontSize: '12px' }}
                                />
                                <YAxis 
                                    stroke="#6b7280"
                                    style={{ fontSize: '12px' }}
                                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                                />
                                <Tooltip 
                                    formatter={(value: any) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                    contentStyle={{ 
                                        backgroundColor: '#fff',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Legend />
                                <Line 
                                    type="monotone" 
                                    dataKey="receita" 
                                    stroke="#10b981" 
                                    strokeWidth={3}
                                    name="Receita"
                                    dot={{ fill: '#10b981', r: 4 }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="despesa" 
                                    stroke="#ef4444" 
                                    strokeWidth={3}
                                    name="Despesa"
                                    dot={{ fill: '#ef4444', r: 4 }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="saldo" 
                                    stroke="#3b82f6" 
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    name="Saldo"
                                    dot={{ fill: '#3b82f6', r: 3 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-gray-400">
                            <div className="text-center">
                                <ChartBarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Sem dados de fluxo de caixa</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Gráfico de Comparativo */}
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <BanknotesIcon className="w-6 h-6 text-emerald-600" />
                        Receitas vs Despesas
                    </h3>
                    {dadosFluxoCaixa.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={dadosFluxoCaixa}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis 
                                    dataKey="mes"
                                    stroke="#6b7280"
                                    style={{ fontSize: '12px' }}
                                />
                                <YAxis 
                                    stroke="#6b7280"
                                    style={{ fontSize: '12px' }}
                                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                                />
                                <Tooltip 
                                    formatter={(value: any) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                    contentStyle={{ 
                                        backgroundColor: '#fff',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="receita" fill="#10b981" name="Receita" radius={[8, 8, 0, 0]} />
                                <Bar dataKey="despesa" fill="#ef4444" name="Despesa" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-gray-400">
                            <div className="text-center">
                                <ChartBarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Sem dados de comparativo</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Resumo Financeiro do Mês */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <CurrencyDollarIcon className="w-6 h-6 text-emerald-600" />
                    Resumo do Mês Atual
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                        <h4 className="text-xs font-semibold text-green-700 uppercase mb-2">Receita do Mês</h4>
                        <p className="text-3xl font-bold text-green-700">
                            R$ {(resumo?.receitaMes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                        <h4 className="text-xs font-semibold text-red-700 uppercase mb-2">Despesa do Mês</h4>
                        <p className="text-3xl font-bold text-red-700">
                            R$ {(resumo?.despesaMes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className={`border p-4 rounded-xl ${
                        (resumo?.lucroMes || 0) >= 0 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'bg-orange-50 border-orange-200'
                    }`}>
                        <h4 className={`text-xs font-semibold uppercase mb-2 ${
                            (resumo?.lucroMes || 0) >= 0 ? 'text-blue-700' : 'text-orange-700'
                        }`}>
                            Lucro do Mês
                        </h4>
                        <p className={`text-3xl font-bold ${
                            (resumo?.lucroMes || 0) >= 0 ? 'text-blue-700' : 'text-orange-700'
                        }`}>
                            R$ {(resumo?.lucroMes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinanceiroDashboard;

