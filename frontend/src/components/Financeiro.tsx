import React, { useState, useEffect, lazy, Suspense } from 'react';
import FinanceiroDashboard from './FinanceiroDashboard';

const ContasAReceber = lazy(() => import('./ContasAReceber'));
const ContasAPagar = lazy(() => import('./ContasAPagar'));
const ExportarRelatorioFinanceiro = lazy(() => import('./ExportarRelatorioFinanceiro'));
const DRE = lazy(() => import('./DRE'));
const FluxoCaixa = lazy(() => import('./FluxoCaixa'));
const MovimentacoesCaixa = lazy(() => import('./MovimentacoesCaixa'));
const CartaoCreditoFinanceiro = lazy(() => import('./CartaoCreditoFinanceiro'));

// ==================== ICONS ====================
const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

interface FinanceiroProps {
    toggleSidebar: () => void;
    initialAba?: string | null;
    initialContaId?: string | null;
    onClearInitialAba?: () => void;
    onClearInitialContaId?: () => void;
}

type AbaType = 'dashboard' | 'dre' | 'fluxo-caixa' | 'movimentacoes' | 'receber' | 'pagar' | 'cartao-credito' | 'ajuda' | 'exportar';

const Financeiro: React.FC<FinanceiroProps> = ({ toggleSidebar, initialAba, initialContaId, onClearInitialAba, onClearInitialContaId }) => {
    const [abaAtiva, setAbaAtiva] = useState<AbaType>('dashboard');

    useEffect(() => {
        if (initialAba && onClearInitialAba) {
            const valid = ['dashboard', 'dre', 'fluxo-caixa', 'movimentacoes', 'receber', 'pagar', 'cartao-credito', 'ajuda', 'exportar'];
            if (valid.includes(initialAba)) {
                setAbaAtiva(initialAba as AbaType);
            }
            onClearInitialAba();
        }
    }, [initialAba, onClearInitialAba]);

    // Renderização condicional baseada na aba ativa
    if (abaAtiva === 'dashboard') {
        return (
            <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
                {/* Header */}
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in">
                    <div className="flex items-center gap-4">
                        <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-white dark:hover:bg-dark-card hover:shadow-soft">
                            <Bars3Icon className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">Financeiro</h1>
                            <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">Dashboard financeiro e controle de fluxo de caixa</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs text-gray-500 dark:text-dark-text-secondary font-medium">Última atualização</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-dark-text mt-0.5">{new Date().toLocaleString('pt-BR')}</p>
                        </div>
                        {abaAtiva === 'dashboard' && (
                            <button
                                onClick={() => setAbaAtiva('exportar' as AbaType)}
                                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all shadow-md font-semibold flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="hidden sm:inline">Exportar Relatório</span>
                            </button>
                        )}
                    </div>
                </header>

                {/* Tabs de Navegação */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => setAbaAtiva('dashboard')}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all ${abaAtiva === 'dashboard'
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-medium'
                                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                            }`}
                    >
                        📊 Dashboard
                    </button>
                    <button
                        onClick={() => setAbaAtiva('dre')}
                        className="px-6 py-3 rounded-xl font-semibold transition-all bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                    >
                        📈 DRE
                    </button>
                    <button
                        onClick={() => setAbaAtiva('fluxo-caixa')}
                        className="px-6 py-3 rounded-xl font-semibold transition-all bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                    >
                        💰 Fluxo de Caixa
                    </button>
                    <button
                        onClick={() => setAbaAtiva('movimentacoes')}
                        className="px-6 py-3 rounded-xl font-semibold transition-all bg-white text-gray-700 border-2 border-gray-200 dark:bg-dark-card dark:text-dark-text dark:border-dark-border hover:border-[#0a1a2f]/40 hover:bg-[#0a1a2f]/5 dark:hover:bg-[#0a1a2f]/10"
                    >
                        📋 Movimentações de Caixa
                    </button>
                    <button
                        onClick={() => setAbaAtiva('receber')}
                        className="px-6 py-3 rounded-xl font-semibold transition-all bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300 hover:bg-green-50"
                    >
                        💰 Contas a Receber
                    </button>
                    <button
                        onClick={() => setAbaAtiva('pagar')}
                        className="px-6 py-3 rounded-xl font-semibold transition-all bg-white text-gray-700 border-2 border-gray-200 hover:border-red-300 hover:bg-red-50"
                    >
                        💸 Contas a Pagar
                    </button>
                    <button
                        onClick={() => setAbaAtiva('cartao-credito')}
                        className="px-6 py-3 rounded-xl font-semibold transition-all bg-white text-gray-700 border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                    >
                        💳 Cartão de Crédito
                    </button>
                    <button
                        onClick={() => setAbaAtiva('ajuda')}
                        className="px-6 py-3 rounded-xl font-semibold transition-all bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                    >
                        ❓ Como Funcionam as Métricas
                    </button>
                </div>

                {/* Dashboard Content */}
                <div className="animate-fade-in">
                    <FinanceiroDashboard setAbaAtiva={(aba: string) => setAbaAtiva(aba as AbaType)} />
                </div>
            </div>
        );
    }

    if (abaAtiva === 'dre') {
        return (
            <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 dark:border-purple-400 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-dark-text-secondary">Carregando DRE...</p>
                    </div>
                </div>
            }>
                <DRE toggleSidebar={toggleSidebar} setAbaAtiva={(aba: string) => setAbaAtiva(aba as AbaType)} />
            </Suspense>
        );
    }

    if (abaAtiva === 'fluxo-caixa') {
        return (
            <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Carregando Fluxo de Caixa...</p>
                    </div>
                </div>
            }>
                <FluxoCaixa toggleSidebar={toggleSidebar} setAbaAtiva={(aba: string) => setAbaAtiva(aba as AbaType)} />
            </Suspense>
        );
    }

    if (abaAtiva === 'movimentacoes') {
        return (
            <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 dark:border-amber-400 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-dark-text-secondary">Carregando Movimentações de Caixa...</p>
                    </div>
                </div>
            }>
                <MovimentacoesCaixa toggleSidebar={toggleSidebar} setAbaAtiva={(aba: string) => setAbaAtiva(aba as AbaType)} />
            </Suspense>
        );
    }

    if (abaAtiva === 'receber') {
        return (
            <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Carregando Contas a Receber...</p>
                    </div>
                </div>
            }>
                <ContasAReceber setAbaAtiva={(aba: string) => setAbaAtiva(aba as AbaType)} toggleSidebar={toggleSidebar} />
            </Suspense>
        );
    }

    if (abaAtiva === 'pagar') {
        return (
            <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 dark:border-red-400 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-dark-text-secondary">Carregando Contas a Pagar...</p>
                    </div>
                </div>
            }>
                <ContasAPagar setAbaAtiva={(aba: string) => setAbaAtiva(aba as AbaType)} toggleSidebar={toggleSidebar} initialContaId={initialContaId} onClearInitialContaId={onClearInitialContaId} />
            </Suspense>
        );
    }

    if (abaAtiva === 'cartao-credito') {
        return (
            <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-dark-text-secondary">Carregando Cartão de Crédito...</p>
                    </div>
                </div>
            }>
                <CartaoCreditoFinanceiro toggleSidebar={toggleSidebar} setAbaAtiva={(aba: string) => setAbaAtiva(aba as AbaType)} />
            </Suspense>
        );
    }

    if (abaAtiva === 'exportar') {
        return (
            <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 dark:border-purple-400 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-dark-text-secondary">Carregando Exportar Relatório...</p>
                    </div>
                </div>
            }>
                <ExportarRelatorioFinanceiro setAbaAtiva={(aba: string) => setAbaAtiva(aba as AbaType)} toggleSidebar={toggleSidebar} />
            </Suspense>
        );
    }

    if (abaAtiva === 'ajuda') {
        return (
            <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
                {/* Header */}
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in">
                    <div className="flex items-center gap-4">
                        <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-white dark:hover:bg-dark-card hover:shadow-soft">
                            <Bars3Icon className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">Como Funcionam as Métricas</h1>
                            <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">Entenda cada indicador financeiro</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setAbaAtiva('dashboard')}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-semibold"
                    >
                        ← Voltar ao Dashboard
                    </button>
                </header>

                {/* Tabs de Navegação */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => setAbaAtiva('dashboard')}
                        className="px-6 py-3 rounded-xl font-semibold transition-all bg-white text-gray-700 border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
                    >
                        📊 Dashboard
                    </button>
                    <button
                        onClick={() => setAbaAtiva('dre')}
                        className="px-6 py-3 rounded-xl font-semibold transition-all bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                    >
                        📈 DRE
                    </button>
                    <button
                        onClick={() => setAbaAtiva('fluxo-caixa')}
                        className="px-6 py-3 rounded-xl font-semibold transition-all bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                    >
                        💰 Fluxo de Caixa
                    </button>
                    <button
                        onClick={() => setAbaAtiva('movimentacoes')}
                        className="px-6 py-3 rounded-xl font-semibold transition-all bg-white text-gray-700 border-2 border-gray-200 hover:border-amber-300 hover:bg-amber-50"
                    >
                        📋 Movimentações de Caixa
                    </button>
                    <button
                        onClick={() => setAbaAtiva('receber')}
                        className="px-6 py-3 rounded-xl font-semibold transition-all bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300 hover:bg-green-50"
                    >
                        💰 Contas a Receber
                    </button>
                    <button
                        onClick={() => setAbaAtiva('pagar')}
                        className="px-6 py-3 rounded-xl font-semibold transition-all bg-white text-gray-700 border-2 border-gray-200 hover:border-red-300 hover:bg-red-50"
                    >
                        💸 Contas a Pagar
                    </button>
                    <button
                        onClick={() => setAbaAtiva('cartao-credito')}
                        className="px-6 py-3 rounded-xl font-semibold transition-all bg-white text-gray-700 border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                    >
                        💳 Cartão de Crédito
                    </button>
                    <button
                        onClick={() => setAbaAtiva('ajuda')}
                        className="px-6 py-3 rounded-xl font-semibold transition-all bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-medium"
                    >
                        ❓ Como Funcionam as Métricas
                    </button>
                </div>

                {/* Conteúdo de Ajuda */}
                <div className="space-y-6 animate-fade-in">
                    {/* A Receber */}
                    <div className="bg-white border-2 border-green-200 rounded-2xl p-6 shadow-soft">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-900 mb-3">💰 A Receber</h3>
                                <p className="text-gray-700 mb-3">
                                    <strong>O que é:</strong> Representa o valor total de todas as vendas confirmadas que ainda não foram recebidas pela empresa.
                                </p>
                                <p className="text-gray-700 mb-3">
                                    <strong>Como é calculado:</strong> Soma de todas as vendas com status "Pendente" ou "Aprovado" que ainda não tiveram pagamento confirmado.
                                </p>
                                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-3">
                                    <p className="text-sm text-green-800">
                                        <strong>📝 Exemplo:</strong> Se você tem 3 vendas pendentes de R$ 1.000, R$ 2.500 e R$ 1.500, o total a receber será R$ 5.000.
                                    </p>
                                </div>
                                <div className="mt-3 text-sm text-gray-600">
                                    <strong>💡 Dica:</strong> Monitore este valor para garantir que os pagamentos estão sendo realizados dentro do prazo esperado.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* A Pagar */}
                    <div className="bg-white border-2 border-red-200 rounded-2xl p-6 shadow-soft">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.511l-5.511-3.182" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-900 mb-3">💸 A Pagar</h3>
                                <p className="text-gray-700 mb-3">
                                    <strong>O que é:</strong> Representa o valor total de todas as obrigações financeiras da empresa que ainda não foram quitadas.
                                </p>
                                <p className="text-gray-700 mb-3">
                                    <strong>Como é calculado:</strong> Soma de todas as compras, despesas e contas a pagar com status "Pendente" que ainda não foram pagas.
                                </p>
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-3">
                                    <p className="text-sm text-red-800">
                                        <strong>📝 Exemplo:</strong> Se você tem fornecedores a pagar R$ 3.000, aluguel de R$ 2.000 e energia de R$ 500, o total a pagar será R$ 5.500.
                                    </p>
                                </div>
                                <div className="mt-3 text-sm text-gray-600">
                                    <strong>💡 Dica:</strong> Mantenha este valor sob controle para evitar problemas de fluxo de caixa e garantir bom relacionamento com fornecedores.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Saldo Previsto */}
                    <div className="bg-white border-2 border-blue-200 rounded-2xl p-6 shadow-soft">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H15.75c.621 0 1.125.504 1.125 1.125v.375m-13.5 0h12m-12 0v.75c0 .414.336.75.75.75h9.75c.621 0 1.125-.504 1.125-1.125v-.375M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5zm-3 0h.008v.008H12V10.5zm-3 0h.008v.008H9V10.5zm-3 0h.008v.008H6V10.5z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-900 mb-3">💵 Saldo Previsto</h3>
                                <p className="text-gray-700 mb-3">
                                    <strong>O que é:</strong> Representa a diferença entre o que você tem a receber e o que você tem a pagar.
                                </p>
                                <p className="text-gray-700 mb-3">
                                    <strong>Como é calculado:</strong> <code className="bg-gray-100 px-2 py-1 rounded">Saldo Previsto = A Receber - A Pagar</code>
                                </p>
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-3">
                                    <p className="text-sm text-blue-800">
                                        <strong>📝 Exemplo:</strong> Se você tem R$ 5.000 a receber e R$ 3.000 a pagar, seu saldo previsto será R$ 2.000 (positivo).
                                    </p>
                                </div>
                                <div className="mt-3 space-y-2">
                                    <div className="text-sm">
                                        <strong className="text-green-600">✅ Saldo Positivo:</strong>
                                        <span className="text-gray-600 ml-2">Suas receitas superam as despesas - situação saudável!</span>
                                    </div>
                                    <div className="text-sm">
                                        <strong className="text-red-600">⚠️ Saldo Negativo:</strong>
                                        <span className="text-gray-600 ml-2">Suas despesas superam as receitas - atenção ao fluxo de caixa!</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lucro Líquido */}
                    <div className="bg-white border-2 border-purple-200 rounded-2xl p-6 shadow-soft">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-900 mb-3">📊 Lucro Líquido</h3>
                                <p className="text-gray-700 mb-3">
                                    <strong>O que é:</strong> Representa o lucro real da empresa após descontar todas as receitas e despesas já realizadas.
                                </p>
                                <p className="text-gray-700 mb-3">
                                    <strong>Como é calculado:</strong> <code className="bg-gray-100 px-2 py-1 rounded">Lucro Líquido = Total de Receitas Realizadas - Total de Despesas Pagas</code>
                                </p>
                                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mt-3">
                                    <p className="text-sm text-purple-800">
                                        <strong>📝 Exemplo:</strong> Se você recebeu R$ 10.000 em vendas e pagou R$ 6.000 em despesas, seu lucro líquido será R$ 4.000.
                                    </p>
                                </div>
                                <div className="mt-3 text-sm text-gray-600">
                                    <strong>💡 Dica:</strong> Este é o indicador mais importante para avaliar a saúde financeira real do negócio. Diferente do Saldo Previsto, ele considera apenas valores já realizados.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Resumo do Mês */}
                    <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border-2 border-emerald-200 rounded-2xl p-6 shadow-soft">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            📅 Resumo do Mês Atual
                        </h3>
                        <div className="space-y-3">
                            <div className="bg-white rounded-xl p-4">
                                <p className="text-gray-700">
                                    <strong>Receita do Mês:</strong> Soma de todas as receitas confirmadas no mês atual (vendas pagas).
                                </p>
                            </div>
                            <div className="bg-white rounded-xl p-4">
                                <p className="text-gray-700">
                                    <strong>Despesa do Mês:</strong> Soma de todas as despesas pagas no mês atual (compras, contas, fornecedores).
                                </p>
                            </div>
                            <div className="bg-white rounded-xl p-4">
                                <p className="text-gray-700">
                                    <strong>Lucro do Mês:</strong> Diferença entre Receita e Despesa do mês atual <code className="bg-gray-100 px-2 py-1 rounded">(Receita - Despesa)</code>.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Atualização em Tempo Real */}
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-6 shadow-soft">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-100 to-orange-200 flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-900 mb-3">🔄 Atualização em Tempo Real</h3>
                                <p className="text-gray-700 mb-3">
                                    Todas as métricas são calculadas automaticamente e atualizadas em tempo real sempre que você:
                                </p>
                                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                                    <li>Confirma uma nova venda</li>
                                    <li>Recebe um pagamento de cliente</li>
                                    <li>Registra uma nova compra ou despesa</li>
                                    <li>Marca uma conta como paga</li>
                                    <li>Acessa o dashboard financeiro</li>
                                </ul>
                                <div className="mt-4 bg-white border border-yellow-300 rounded-xl p-4">
                                    <p className="text-sm text-gray-700">
                                        <strong>💫 Dica Pro:</strong> Mantenha seus registros sempre atualizados para que as métricas reflitam a realidade financeira do seu negócio!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default Financeiro;
