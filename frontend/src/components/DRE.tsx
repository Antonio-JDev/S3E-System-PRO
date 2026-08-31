import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';
import DREPrintable from './DREPrintable';
import { axiosApiService } from '../services/axiosApi';
import { useAuth } from '../hooks/useAuth';
import ScrollableRow from './ui/ScrollableRow';
import { scrollableNavItemClasses } from '../utils/responsiveNav';

// ==================== ICONS ====================
const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
);

const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
);

interface DREComponentProps {
    toggleSidebar: () => void;
    setAbaAtiva?: (aba: string) => void;
}

type Periodo = 'mes-atual' | 'mes-anterior' | 'trimestre' | 'semestre' | 'ano' | 'personalizado';
type AbaAnalise = 'lucro-real' | 'lucro-real-servicos' | 'dre-consolidado';

const DRE: React.FC<DREComponentProps> = ({ toggleSidebar, setAbaAtiva }) => {
    const { user } = useAuth();
    const [abaAnalise, setAbaAnalise] = useState<AbaAnalise>('lucro-real');
    const [periodo, setPeriodo] = useState<Periodo>('mes-atual');
    const [sincronizando, setSincronizando] = useState(false);
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [lucroReal, setLucroReal] = useState<any>(null);
    const [dre, setDre] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [logoUrl, setLogoUrl] = useState<string>('');
    const [nomeUsuario, setNomeUsuario] = useState<string>('');

    // Busca para visão de serviços
    const [buscaServico, setBuscaServico] = useState<string>('');
    
    // Busca para produtos
    const [buscaProduto, setBuscaProduto] = useState<string>('');
    
    // Estados para controlar linhas expansíveis
    const [cpvExpanded, setCpvExpanded] = useState(false);
    const [despesasExpanded, setDespesasExpanded] = useState(false);
    const [produtoExpandido, setProdutoExpandido] = useState<string | null>(null);
    const [materialIdRecalculando, setMaterialIdRecalculando] = useState<string | null>(null);

    // Ref para impressão
    const printRef = useRef<HTMLDivElement>(null);

    // Buscar logo e nome do usuário ao carregar
    useEffect(() => {
        const buscarConfiguracoes = async () => {
            try {
                const token = localStorage.getItem('token');
                
                // Buscar logo
                const configResponse = await axiosApiService.get('/api/configuracoes');
                
                if (configResponse.success && configResponse.data?.logoUrl) {
                    setLogoUrl(configResponse.data.logoUrl);
                }

                // Buscar nome do usuário
                const user = localStorage.getItem('user');
                if (user) {
                    const userData = JSON.parse(user);
                    setNomeUsuario(userData.name || userData.email || 'Usuário');
                }
            } catch (err) {
                console.error('Erro ao buscar configurações:', err);
            }
        };

        buscarConfiguracoes();
    }, []);

    // Buscar dados ao carregar ou mudar período/aba
    useEffect(() => {
        if (periodo !== 'personalizado') {
            buscarDados();
        }
    }, [periodo, abaAnalise]);

    const buscarDados = async () => {
        try {
            setLoading(true);
            setError('');

            let endpoint = '';
            let params: any = {};

            if (periodo === 'personalizado') {
                if (!dataInicio || !dataFim) {
                    setError('Selecione as datas de início e fim');
                    setLoading(false);
                    return;
                }
                
                if (abaAnalise === 'lucro-real' || abaAnalise === 'lucro-real-servicos') {
                    endpoint = '/api/financeiro/dre/lucro-real';
                    params = { inicio: dataInicio, fim: dataFim };
                } else {
                    endpoint = '/api/financeiro/dre';
                    params = { inicio: dataInicio, fim: dataFim };
                }
            } else {
                if (abaAnalise === 'lucro-real' || abaAnalise === 'lucro-real-servicos') {
                    endpoint = `/api/financeiro/dre/lucro-real/periodo/${periodo}`;
                } else {
                    endpoint = `/api/financeiro/dre/periodo/${periodo}`;
                }
            }

            const response = await axiosApiService.get(endpoint, params);

            if (response.success && response.data) {
                if (abaAnalise === 'lucro-real' || abaAnalise === 'lucro-real-servicos') {
                    setLucroReal(response.data);
                } else {
                    setDre(response.data);
                }
            } else {
                setError(response.error || 'Erro ao buscar dados');
            }
        } catch (err: any) {
            console.error('Erro ao buscar dados:', err);
            setError(err.response?.data?.message || 'Erro ao buscar dados');
        } finally {
            setLoading(false);
        }
    };

    const handleRecalcularCustoUnitario = async (materialId: string) => {
        setMaterialIdRecalculando(materialId);
        try {
            const response = await axiosApiService.post(`/api/materiais/${materialId}/recalcular-custo`, { force: true });
            if (response.success && response.aplicado) {
                const data = response.data as { valorUnitarioAnterior?: number; valorUnitarioNovo?: number; materialNome?: string };
                toast.success(
                    data?.materialNome
                        ? `Custo de "${data.materialNome}" corrigido (R$ ${data.valorUnitarioAnterior?.toFixed(2)} → R$ ${data.valorUnitarioNovo?.toFixed(2)}).`
                        : 'Custo unitário recalculado com sucesso.'
                );
                await buscarDados();
            } else {
                toast.error((response as any).message || 'Recálculo não aplicado. Verifique se o material está em metros e se o custo indica compra em KM.');
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Erro ao recalcular custo.';
            toast.error(msg);
        } finally {
            setMaterialIdRecalculando(null);
        }
    };

    // Configurar impressão
    const handlePrint = useReactToPrint({
        contentRef: printRef as React.RefObject<HTMLDivElement>,
        documentTitle: `DRE_${abaAnalise === 'lucro-real' ? 'LucroReal' : 'Consolidado'}_${new Date().toISOString().split('T')[0]}`,
        pageStyle: `
            @page {
                size: A4;
                margin: 20mm;
            }
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            }
        `
    });

    const exportarPDF = () => {
        if ((abaAnalise === 'lucro-real' || abaAnalise === 'lucro-real-servicos') && !lucroReal) {
            alert('Carregue os dados antes de exportar');
            return;
        }
        if (abaAnalise === 'dre-consolidado' && !dre) {
            alert('Carregue os dados antes de exportar');
            return;
        }
        handlePrint();
    };

    const formatMoeda = (valor: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    };

    const formatData = (data: string | Date) => {
        return new Date(data).toLocaleDateString('pt-BR');
    };

    // Filtrar produtos baseado na busca
    const produtosFiltrados = useMemo(() => {
        if (!lucroReal?.produtos) return [];
        if (!buscaProduto.trim()) return lucroReal.produtos;
        
        const termoBusca = buscaProduto.toLowerCase().trim();
        return lucroReal.produtos.filter((produto: any) => 
            produto.materialNome?.toLowerCase().includes(termoBusca) ||
            produto.sku?.toLowerCase().includes(termoBusca) ||
            produto.materialId?.toLowerCase().includes(termoBusca)
        );
    }, [lucroReal, buscaProduto]);

    // Filtrar serviços baseado na busca
    const servicosFiltrados = useMemo(() => {
        if (!lucroReal?.servicos) return [];
        if (!buscaServico.trim()) return lucroReal.servicos;
        
        const termoBusca = buscaServico.toLowerCase().trim();
        return lucroReal.servicos.filter((servico: any) => 
            (servico.nomeServico || servico.descricao || '').toLowerCase().includes(termoBusca) ||
            (servico.clienteNome || '').toLowerCase().includes(termoBusca) ||
            (servico.codigoServico || '').toLowerCase().includes(termoBusca)
        );
    }, [lucroReal, buscaServico]);

    const getPeriodoLabel = () => {
        switch (periodo) {
            case 'mes-atual': return 'Mês Atual';
            case 'mes-anterior': return 'Mês Anterior';
            case 'trimestre': return 'Trimestre (3 meses)';
            case 'semestre': return 'Semestre (6 meses)';
            case 'ano': return 'Ano Atual';
            case 'personalizado': return 'Período Personalizado';
            default: return '';
        }
    };

    const getFonteCustoLabel = (fonte: string) => {
        switch (fonte) {
            case 'XML': return '📦 XML (Última Compra)';
            case 'CADASTRO': return '📝 Cadastro';
            case 'SEM_CUSTO': return '⚠️ Sem Custo';
            case 'REPRESENTANTE': return '🏷️ Representante';
            default: return fonte;
        }
    };

    const getFonteCustoColor = (fonte: string) => {
        switch (fonte) {
            case 'XML': return 'text-green-600 bg-green-50';
            case 'CADASTRO': return 'text-yellow-600 bg-yellow-50';
            case 'SEM_CUSTO': return 'text-red-600 bg-red-50';
            case 'REPRESENTANTE': return 'text-orange-600 bg-orange-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
            {/* Botão Sincronizar (apenas desenvolvedor) - no topo da página */}
            {user?.role?.toLowerCase() === 'desenvolvedor' && (
                <div className="mb-4 flex justify-end">
                    <button
                        type="button"
                        onClick={async () => {
                            setSincronizando(true);
                            try {
                                const { data } = await axiosApiService.post<{ success: boolean; message?: string; detalhes?: string[] }>('/api/sistema/sincronizar');
                                if (data?.success) {
                                    toast.success(data.message || 'Sincronização concluída.');
                                } else {
                                    toast.error(data?.message || 'Falha na sincronização.');
                                }
                            } catch (err: any) {
                                const msg = err?.response?.data?.message || err?.message || 'Erro ao sincronizar.';
                                toast.error(msg);
                            } finally {
                                setSincronizando(false);
                            }
                        }}
                        disabled={sincronizando}
                        className="px-4 py-2 rounded-xl border-2 border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:border-amber-500 dark:text-amber-200 font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {sincronizando ? (
                            <>⏳ Sincronizando...</>
                        ) : (
                            <>🔄 Sincronizar atualizações (pós-deploy)</>
                        )}
                    </button>
                </div>
            )}

            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-white dark:hover:bg-dark-card hover:shadow-soft">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">
                            📊 DRE - Demonstração do Resultado do Exercício
                        </h1>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">
                            Análise completa de receitas, custos e lucros
                        </p>
                    </div>
                </div>
                <ScrollableRow className="w-full sm:w-auto justify-start sm:justify-end">
                    {setAbaAtiva && (
                        <button
                            onClick={() => setAbaAtiva('dashboard')}
                            className={`${scrollableNavItemClasses} px-4 py-2.5 bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text border-2 border-gray-200 dark:border-dark-border rounded-xl hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-dark-hover transition-all font-semibold flex items-center gap-2`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Voltar ao Dashboard
                        </button>
                    )}
                    <button
                        onClick={exportarPDF}
                        disabled={loading || (!lucroReal && !dre)}
                        className={`${scrollableNavItemClasses} px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all shadow-md font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Exportar PDF
                    </button>
                </ScrollableRow>
            </header>

            {/* Tabs de Análise */}
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft mb-6 animate-fade-in border border-transparent dark:border-dark-border">
                <ScrollableRow className="mb-6 gap-3">
                    <button
                        onClick={() => setAbaAnalise('lucro-real')}
                        className={`${scrollableNavItemClasses} px-6 py-3 rounded-xl font-semibold transition-all ${
                            abaAnalise === 'lucro-real'
                                ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-md'
                                : 'bg-gray-100 dark:bg-dark-hover text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-elevated'
                        }`}
                    >
                        💰 Lucro Real (Produto x Produto)
                    </button>
                    <button
                        onClick={() => setAbaAnalise('lucro-real-servicos')}
                        className={`${scrollableNavItemClasses} px-6 py-3 rounded-xl font-semibold transition-all ${
                            abaAnalise === 'lucro-real-servicos'
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md'
                                : 'bg-gray-100 dark:bg-dark-hover text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-elevated'
                        }`}
                    >
                        🛠️ Lucro Real (Serviço x Serviço)
                    </button>
                    <button
                        onClick={() => setAbaAnalise('dre-consolidado')}
                        className={`${scrollableNavItemClasses} px-6 py-3 rounded-xl font-semibold transition-all ${
                            abaAnalise === 'dre-consolidado'
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-md'
                                : 'bg-gray-100 dark:bg-dark-hover text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-elevated'
                        }`}
                    >
                        📈 DRE Consolidado (Visão Macro)
                    </button>
                </ScrollableRow>

                {/* Filtros de Período */}
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-4">Selecionar Período</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                        {(['mes-atual', 'mes-anterior', 'trimestre', 'semestre', 'ano', 'personalizado'] as Periodo[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriodo(p)}
                                className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                                    periodo === p
                                        ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md'
                                        : 'bg-gray-100 dark:bg-dark-hover text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-elevated'
                                }`}
                            >
                                {p === 'mes-atual' && '📅 Mês Atual'}
                                {p === 'mes-anterior' && '📆 Mês Anterior'}
                                {p === 'trimestre' && '📊 Trimestre'}
                                {p === 'semestre' && '📈 Semestre'}
                                {p === 'ano' && '🗓️ Ano'}
                                {p === 'personalizado' && '🔧 Personalizado'}
                            </button>
                        ))}
                    </div>

                    {/* Datas personalizadas */}
                    {periodo === 'personalizado' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Data Início</label>
                                <input
                                    type="date"
                                    value={dataInicio}
                                    onChange={(e) => setDataInicio(e.target.value)}
                                    className="w-full px-4 py-2 border-2 border-gray-200 dark:border-dark-border rounded-xl focus:border-purple-500 focus:outline-none bg-white dark:bg-dark-input text-gray-900 dark:text-dark-text"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Data Fim</label>
                                <input
                                    type="date"
                                    value={dataFim}
                                    onChange={(e) => setDataFim(e.target.value)}
                                    className="w-full px-4 py-2 border-2 border-gray-200 dark:border-dark-border rounded-xl focus:border-purple-500 focus:outline-none bg-white dark:bg-dark-input text-gray-900 dark:text-dark-text"
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={buscarDados}
                                    disabled={loading || !dataInicio || !dataFim}
                                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Buscar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">
                            Calculando{' '}
                            {abaAnalise === 'dre-consolidado' ? 'DRE' : 'Lucro Real'}...
                        </p>
                    </div>
                </div>
            )}

            {/* Erro */}
            {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6 animate-fade-in">
                    <p className="text-red-800 font-semibold">{error}</p>
                </div>
            )}

            {/* ABA: LUCRO REAL - PRODUTOS */}
            {abaAnalise === 'lucro-real' && lucroReal && !loading && (
                <div className="space-y-6 animate-fade-in">
                    {/* Cards de Resumo */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="bg-blue-50 dark:bg-dark-elevated border-2 border-blue-200 dark:border-blue-800/40 rounded-2xl p-6">
                            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase">Total Vendas</p>
                            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-1">{formatMoeda(lucroReal.resumo.totalVenda)}</p>
                        </div>
                        <div className="bg-red-50 dark:bg-dark-elevated border-2 border-red-200 dark:border-red-800/40 rounded-2xl p-6">
                            <p className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase">Custo Real</p>
                            <p className="text-3xl font-bold text-red-700 dark:text-red-300 mt-1">{formatMoeda(lucroReal.resumo.totalCusto)}</p>
                        </div>
                        <div className="bg-green-50 dark:bg-dark-elevated border-2 border-green-200 dark:border-green-800/40 rounded-2xl p-6">
                            <p className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase">Lucro Real</p>
                            <p className="text-3xl font-bold text-green-700 dark:text-green-300 mt-1">{formatMoeda(lucroReal.resumo.totalLucro)}</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-dark-elevated border-2 border-purple-200 dark:border-purple-800/40 rounded-2xl p-6">
                            <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase">Margem Real</p>
                            <p className="text-3xl font-bold text-purple-700 dark:text-purple-300 mt-1">{lucroReal.resumo.margemReal.toFixed(2)}%</p>
                        </div>
                    </div>

                    {/* Estatísticas */}
                    <div className="bg-white rounded-2xl p-6 shadow-soft">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Estatísticas</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">{lucroReal.estatisticas.totalProdutos}</p>
                                <p className="text-sm text-gray-600">Produtos Vendidos</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-green-600">{lucroReal.estatisticas.produtosComXML}</p>
                                <p className="text-sm text-gray-600">Com Custo XML</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-yellow-600">{lucroReal.estatisticas.produtosComCadastro}</p>
                                <p className="text-sm text-gray-600">Custo Cadastro</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-orange-600">{lucroReal.estatisticas.produtosRepresentante || 0}</p>
                                <p className="text-sm text-gray-600">Representante</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-purple-600">{lucroReal.estatisticas.totalCotacoes || 0}</p>
                                <p className="text-sm text-gray-600">Cotações</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-red-600">{lucroReal.estatisticas.produtosSemCusto}</p>
                                <p className="text-sm text-gray-600">Sem Custo</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabela de Produtos */}
                    <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
                        <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-white">
                                        Lucro Real por Produto - {getPeriodoLabel()}
                                    </h2>
                                    <p className="text-gray-300 text-sm mt-1">
                                        {lucroReal.periodo?.inicio && lucroReal.periodo?.fim && (
                                            <>Período: {formatData(lucroReal.periodo.inicio)} a {formatData(lucroReal.periodo.fim)}</>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Campo de Busca */}
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={buscaProduto}
                                    onChange={(e) => setBuscaProduto(e.target.value)}
                                    placeholder="Buscar produto por nome ou SKU..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {buscaProduto && (
                                    <button
                                        onClick={() => setBuscaProduto('')}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    >
                                        <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            {buscaProduto && (
                                <p className="text-sm text-gray-600 mt-2">
                                    {produtosFiltrados.length} produto(s) encontrado(s)
                                </p>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Produto</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Qtd</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Venda Unit</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Custo Real</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Lucro Unit</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Lucro Total</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Margem %</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Fonte</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {produtosFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                    <p className="text-gray-500 font-medium">
                                                        {buscaProduto ? 'Nenhum produto encontrado com essa busca' : 'Nenhum produto encontrado'}
                                                    </p>
                                                    {buscaProduto && (
                                                        <button
                                                            onClick={() => setBuscaProduto('')}
                                                            className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                                                        >
                                                            Limpar busca
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        produtosFiltrados.map((produto: any) => (
                                            <React.Fragment key={produto.materialId}>
                                                <tr 
                                                    className="hover:bg-gray-50 cursor-pointer"
                                                    onClick={() => setProdutoExpandido(produtoExpandido === produto.materialId ? null : produto.materialId)}
                                                >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {produtoExpandido === produto.materialId ? 
                                                            <ChevronDownIcon className="w-4 h-4 text-gray-400" /> : 
                                                            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                                                        }
                                                        <div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <p className="font-semibold text-gray-900">{produto.materialNome}</p>
                                                                {produto.tipoItem && (
                                                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                                        produto.tipoItem === 'ORIGINAL' 
                                                                            ? 'bg-blue-100 text-blue-700' 
                                                                            : 'bg-orange-100 text-orange-700'
                                                                    }`}>
                                                                        {produto.tipoItem === 'ORIGINAL' ? '📋 Original' : '➕ Aditivo'}
                                                                    </span>
                                                                )}
                                                                {produto.isCotacao && (
                                                                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700">
                                                                        🏷️ Cotação
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-500">{produto.sku}</p>
                                                            {produto.isCotacao && produto.valorRepresentante && (
                                                                <p className="text-xs text-orange-600 mt-0.5">
                                                                    Valor Representante: {formatMoeda(produto.valorRepresentante)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center text-gray-700">
                                                    {produto.quantidadeVendida} {produto.unidadeMedida}
                                                </td>
                                                <td className="px-4 py-3 text-right text-blue-600 font-semibold">
                                                    {formatMoeda(produto.valorVendaUnitario)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-red-600 font-semibold">
                                                    {produto.custoRealUnitario !== null ? formatMoeda(produto.custoRealUnitario) : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right text-green-600 font-semibold">
                                                    {produto.lucroRealUnitario !== null ? formatMoeda(produto.lucroRealUnitario) : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-green-700">
                                                    {produto.lucroRealTotal !== null ? formatMoeda(produto.lucroRealTotal) : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`px-2 py-1 rounded-lg text-sm font-semibold ${
                                                        produto.margemReal !== null && produto.margemReal > 0 
                                                            ? 'bg-green-100 text-green-700' 
                                                            : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {produto.margemReal !== null ? `${produto.margemReal.toFixed(1)}%` : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getFonteCustoColor(produto.fonteCusto)}`}>
                                                        {getFonteCustoLabel(produto.fonteCusto)}
                                                    </span>
                                                </td>
                                            </tr>
                                            
                                            {/* Detalhamento do Produto */}
                                            {produtoExpandido === produto.materialId && (
                                                <tr className="bg-gray-50">
                                                    <td colSpan={8} className="px-4 py-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {/* Info de Custo */}
                                                            <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
                                                                <h4 className="font-bold text-gray-900 mb-2">📦 Informações de Custo</h4>
                                                                {produto.numeroNF && (
                                                                    <p className="text-sm text-gray-600">NF: {produto.numeroNF}</p>
                                                                )}
                                                                {produto.dataUltimaCompra && (
                                                                    <p className="text-sm text-gray-600">
                                                                        Última Compra: {formatData(produto.dataUltimaCompra)}
                                                                    </p>
                                                                )}
                                                                <p className="text-sm text-gray-600">
                                                                    Fonte: {getFonteCustoLabel(produto.fonteCusto)}
                                                                </p>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); handleRecalcularCustoUnitario(produto.materialId); }}
                                                                    disabled={materialIdRecalculando === produto.materialId}
                                                                    className="mt-3 px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {materialIdRecalculando === produto.materialId ? 'Recalculando...' : 'Recalcular Custo Unitário'}
                                                                </button>
                                                            </div>

                                                            {/* Vendas */}
                                                            <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
                                                                <h4 className="font-bold text-gray-900 mb-2">🛒 Vendas ({produto.vendas.length})</h4>
                                                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                                                    {produto.vendas.map((venda: any, idx: number) => (
                                                                        <p key={venda.vendaId || idx} className="text-xs text-gray-600">
                                                                            <span className="font-medium text-gray-500">n° {idx + 1}</span>
                                                                            {' — '}
                                                                            <span className="font-semibold text-gray-900">{venda.numeroVenda}</span>
                                                                            {' - '}{venda.cliente} ({venda.quantidade} {produto.unidadeMedida})
                                                                        </p>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Alertas */}
                    {lucroReal.alertas.produtosSemCusto.length > 0 && (
                        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-yellow-800 mb-3">⚠️ Produtos sem Custo Definido</h3>
                            <p className="text-sm text-yellow-700 mb-3">
                                Os seguintes produtos foram vendidos mas não possuem custo cadastrado:
                            </p>
                            <div className="space-y-2">
                                {lucroReal.alertas.produtosSemCusto.map((p: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center bg-white rounded-lg p-3">
                                        <span className="text-sm font-semibold text-gray-900">{p.materialNome}</span>
                                        <span className="text-sm text-gray-600">Vendido: {formatMoeda(p.valorVenda)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ABA: LUCRO REAL - SERVIÇOS */}
            {abaAnalise === 'lucro-real-servicos' && lucroReal && !loading && (
                <div className="space-y-6 animate-fade-in">
                    {/* Cards de Resumo para Serviços */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="bg-blue-50 dark:bg-dark-elevated border-2 border-blue-200 dark:border-blue-800/40 rounded-2xl p-6">
                            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase">Receita de Serviços</p>
                            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                                {formatMoeda(lucroReal.resumo.totalVendaServicos ?? lucroReal.resumo.totalVenda)}
                            </p>
                        </div>
                        <div className="bg-red-50 dark:bg-dark-elevated border-2 border-red-200 dark:border-red-800/40 rounded-2xl p-6">
                            <p className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase">Custo de Execução</p>
                            <p className="text-3xl font-bold text-red-700 dark:text-red-300 mt-1">
                                {formatMoeda(lucroReal.resumo.totalCustoServicos ?? lucroReal.resumo.totalCusto)}
                            </p>
                        </div>
                        <div className="bg-green-50 dark:bg-dark-elevated border-2 border-green-200 dark:border-green-800/40 rounded-2xl p-6">
                            <p className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase">Lucro Líquido</p>
                            <p className="text-3xl font-bold text-green-700 dark:text-green-300 mt-1">
                                {formatMoeda(lucroReal.resumo.totalLucroServicos ?? lucroReal.resumo.totalLucro)}
                            </p>
                        </div>
                        <div className="bg-purple-50 dark:bg-dark-elevated border-2 border-purple-200 dark:border-purple-800/40 rounded-2xl p-6">
                            <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase">Margem</p>
                            <p className="text-3xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                                {(lucroReal.resumo.margemServicos ?? lucroReal.resumo.margemReal).toFixed(2)}%
                            </p>
                        </div>
                    </div>

                    {/* Estatísticas de Serviços */}
                    <div className="bg-white rounded-2xl p-6 shadow-soft">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Estatísticas de Serviços</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">
                                    {lucroReal.estatisticas?.totalServicos || 0}
                                </p>
                                <p className="text-sm text-gray-600">Serviços Prestados</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-green-600">
                                    {lucroReal.estatisticas?.servicosComCusto || 0}
                                </p>
                                <p className="text-sm text-gray-600">Com Custo Definido</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-red-600">
                                    {lucroReal.estatisticas?.servicosSemCusto || 0}
                                </p>
                                <p className="text-sm text-gray-600">Sem Custo</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabela de Serviços */}
                    <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
                        <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-white">
                                        Lucro Real por Serviço - {getPeriodoLabel()}
                                    </h2>
                                    <p className="text-gray-300 text-sm mt-1">
                                        {lucroReal.periodo?.inicio && lucroReal.periodo?.fim && (
                                            <>Período: {formatData(lucroReal.periodo.inicio)} a {formatData(lucroReal.periodo.fim)}</>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Campo de Busca */}
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={buscaServico}
                                    onChange={(e) => setBuscaServico(e.target.value)}
                                    placeholder="Buscar serviço por nome, cliente ou código..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {buscaServico && (
                                    <button
                                        onClick={() => setBuscaServico('')}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    >
                                        <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            {buscaServico && (
                                <p className="text-sm text-gray-600 mt-2">
                                    {servicosFiltrados.length} serviço(s) encontrado(s)
                                </p>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                            Serviço
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                            Cliente
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                                            Qtd/Horas
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                                            Receita de Serviço
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                                            Custo de Execução
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                                            Lucro Líquido (R$)
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                                            Margem (%)
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {servicosFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                    <p className="text-gray-500 font-medium">
                                                        {buscaServico ? 'Nenhum serviço encontrado com essa busca' : 'Nenhum serviço encontrado'}
                                                    </p>
                                                    {buscaServico && (
                                                        <button
                                                            onClick={() => setBuscaServico('')}
                                                            className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                                                        >
                                                            Limpar busca
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        servicosFiltrados.map((servico: any, idx: number) => {
                                            const receita =
                                                servico.receitaServico ?? servico.valorTotalServico ?? 0;
                                            const custo = servico.custoExecucao ?? 0;
                                            const lucro = receita - custo;
                                            const margem =
                                                receita > 0 ? (lucro / receita) * 100 : servico.margem ?? 0;

                                            return (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-gray-900">
                                                                {servico.nomeServico ||
                                                                    servico.descricao ||
                                                                    'Serviço sem nome'}
                                                            </span>
                                                            {servico.codigoServico && (
                                                                <span className="text-xs text-gray-500">
                                                                    Código: {servico.codigoServico}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">
                                                        {servico.clienteNome || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-sm text-gray-700">
                                                        {servico.quantidade || servico.horas || 1}{' '}
                                                        {servico.unidadeMedida || 'h'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-blue-600 font-semibold">
                                                        {formatMoeda(receita)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-red-600 font-semibold">
                                                        {custo > 0 ? formatMoeda(custo) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-green-700">
                                                        {formatMoeda(lucro)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span
                                                            className={`px-2 py-1 rounded-lg text-sm font-semibold ${
                                                                margem >= 0
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-red-100 text-red-700'
                                                            }`}
                                                        >
                                                            {margem.toFixed(1)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Alertas - Serviços sem Custo */}
                    {lucroReal.alertas?.servicosSemCusto && lucroReal.alertas.servicosSemCusto.length > 0 && (
                        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-yellow-800 mb-3">⚠️ Serviços sem Custo Definido</h3>
                            <p className="text-sm text-yellow-700 mb-3">
                                Os seguintes serviços foram prestados mas não possuem custo cadastrado. 
                                O lucro está sendo calculado apenas com base na receita:
                            </p>
                            <div className="space-y-2">
                                {lucroReal.alertas.servicosSemCusto.map((s: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center bg-white rounded-lg p-3">
                                        <div>
                                            <span className="text-sm font-semibold text-gray-900">{s.servicoNome}</span>
                                            <span className="text-xs text-gray-500 ml-2">({s.clienteNome})</span>
                                        </div>
                                        <span className="text-sm text-gray-600">Receita: {formatMoeda(s.receitaServico)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ABA: DRE CONSOLIDADO */}
            {abaAnalise === 'dre-consolidado' && dre && !loading && (
                <div className="space-y-6 animate-fade-in">
                    {/* Cards de Margem */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-green-50 dark:bg-dark-elevated border-2 border-green-200 dark:border-green-800/40 rounded-2xl p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase">Margem Bruta</p>
                                    <p className="text-3xl font-bold text-green-700 dark:text-green-300 mt-1">
                                        {dre.resumo.margemBruta.toFixed(2)}%
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-dark-elevated border-2 border-blue-200 dark:border-blue-800/40 rounded-2xl p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase">Margem Líquida</p>
                                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                                        {dre.resumo.margemLiquida.toFixed(2)}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabela DRE */}
                    <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
                        <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-6 py-4">
                            <h2 className="text-xl font-bold text-white">
                                DRE Consolidado - {getPeriodoLabel()}
                            </h2>
                            <p className="text-gray-300 text-sm mt-1">
                                {dre.periodo?.inicio && dre.periodo?.fim && (
                                    <>Período: {formatData(dre.periodo.inicio)} a {formatData(dre.periodo.fim)}</>
                                )}
                            </p>
                        </div>

                        <div className="p-6">
                            <table className="w-full">
                                <tbody className="divide-y divide-gray-200">
                                    <tr className="hover:bg-gray-50">
                                        <td className="py-4 px-4 font-bold text-gray-900">RECEITA BRUTA</td>
                                        <td className="py-4 px-4 text-right font-bold text-blue-600">
                                            {formatMoeda(dre.resumo.receitaBruta)}
                                        </td>
                                    </tr>

                                    <tr className="hover:bg-gray-50">
                                        <td className="py-4 px-4 pl-8 text-gray-700">(-) Impostos sobre Vendas</td>
                                        <td className="py-4 px-4 text-right text-red-600">
                                            {formatMoeda(-dre.resumo.impostosVendas)}
                                        </td>
                                    </tr>

                                    <tr className="bg-gray-100 font-bold">
                                        <td className="py-4 px-4 text-gray-900">RECEITA LÍQUIDA</td>
                                        <td className="py-4 px-4 text-right text-blue-700">
                                            {formatMoeda(dre.resumo.receitaLiquida)}
                                        </td>
                                    </tr>

                                    <tr 
                                        className="hover:bg-gray-50 cursor-pointer"
                                        onClick={() => setCpvExpanded(!cpvExpanded)}
                                    >
                                        <td className="py-4 px-4 text-gray-700 flex items-center gap-2">
                                            {cpvExpanded ? <ChevronDownIcon className="w-5 h-5" /> : <ChevronRightIcon className="w-5 h-5" />}
                                            (-) CPV (Custo de Produtos/Serviços Vendidos)
                                        </td>
                                        <td className="py-4 px-4 text-right text-red-600">
                                            {formatMoeda(-dre.resumo.cpv.total)}
                                        </td>
                                    </tr>

                                    {cpvExpanded && (
                                        <>
                                            <tr className="bg-gray-50">
                                                <td className="py-2 px-4 pl-12 text-sm text-gray-600">• Custo de Materiais</td>
                                                <td className="py-2 px-4 text-right text-sm text-red-600">
                                                    {formatMoeda(-dre.resumo.cpv.materiais)}
                                                </td>
                                            </tr>
                                            <tr className="bg-gray-50">
                                                <td className="py-2 px-4 pl-12 text-sm text-gray-600">• Custo de Mão de Obra</td>
                                                <td className="py-2 px-4 text-right text-sm text-red-600">
                                                    {formatMoeda(-dre.resumo.cpv.maoDeObra)}
                                                </td>
                                            </tr>
                                        </>
                                    )}

                                    <tr className="bg-green-50 dark:bg-green-950/30 font-bold">
                                        <td className="py-4 px-4 text-gray-900 dark:text-dark-text">LUCRO BRUTO</td>
                                        <td className="py-4 px-4 text-right text-green-700 dark:text-green-300">
                                            {formatMoeda(dre.resumo.lucroBruto)}
                                        </td>
                                    </tr>

                                    <tr 
                                        className="hover:bg-gray-50 cursor-pointer"
                                        onClick={() => setDespesasExpanded(!despesasExpanded)}
                                    >
                                        <td className="py-4 px-4 text-gray-700 flex items-center gap-2">
                                            {despesasExpanded ? <ChevronDownIcon className="w-5 h-5" /> : <ChevronRightIcon className="w-5 h-5" />}
                                            (-) Despesas Operacionais
                                        </td>
                                        <td className="py-4 px-4 text-right text-red-600">
                                            {formatMoeda(-dre.resumo.despesasOperacionais.total)}
                                        </td>
                                    </tr>

                                    {despesasExpanded && (
                                        <>
                                            <tr className="bg-gray-50">
                                                <td className="py-2 px-4 pl-12 text-sm text-gray-600">• Despesas Fixas</td>
                                                <td className="py-2 px-4 text-right text-sm text-red-600">
                                                    {formatMoeda(-dre.resumo.despesasOperacionais.despesasFixas)}
                                                </td>
                                            </tr>
                                            <tr className="bg-gray-50">
                                                <td className="py-2 px-4 pl-12 text-sm text-gray-600">• Gastos com Veículos</td>
                                                <td className="py-2 px-4 text-right text-sm text-red-600">
                                                    {formatMoeda(-dre.resumo.despesasOperacionais.veiculos)}
                                                </td>
                                            </tr>
                                        </>
                                    )}

                                    <tr className="bg-purple-50 dark:bg-purple-950/30 font-bold">
                                        <td className="py-4 px-4 text-gray-900 dark:text-dark-text">EBITDA / LUCRO OPERACIONAL</td>
                                        <td className="py-4 px-4 text-right text-purple-700 dark:text-purple-300">
                                            {formatMoeda(dre.resumo.ebitda)}
                                        </td>
                                    </tr>

                                    <tr className="bg-blue-100 dark:bg-blue-950/40 font-bold text-lg">
                                        <td className="py-6 px-4 text-gray-900 dark:text-dark-text">LUCRO LÍQUIDO FINAL</td>
                                        <td className="py-6 px-4 text-right text-blue-700 dark:text-blue-300">
                                            {formatMoeda(dre.resumo.lucroLiquido)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Métricas */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl p-4 shadow-soft border-2 border-gray-200">
                            <p className="text-sm font-semibold text-gray-600">Total de Vendas</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{dre.metricas.totalVendas}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-soft border-2 border-gray-200">
                            <p className="text-sm font-semibold text-gray-600">Total de Compras</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{dre.metricas.totalCompras}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-soft border-2 border-gray-200">
                            <p className="text-sm font-semibold text-gray-600">Total de Despesas</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{dre.metricas.totalDespesas}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-soft border-2 border-gray-200">
                            <p className="text-sm font-semibold text-gray-600">Ticket Médio</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{formatMoeda(dre.metricas.ticketMedioVenda)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Componente de Impressão (invisível) */}
            <div style={{ display: 'none' }}>
                <DREPrintable
                    ref={printRef}
                    tipo={abaAnalise}
                    periodo={{
                        inicio: (abaAnalise === 'lucro-real' || abaAnalise === 'lucro-real-servicos')
                            ? (lucroReal?.periodo?.inicio || new Date())
                            : (dre?.periodo?.inicio || new Date()),
                        fim: (abaAnalise === 'lucro-real' || abaAnalise === 'lucro-real-servicos')
                            ? (lucroReal?.periodo?.fim || new Date())
                            : (dre?.periodo?.fim || new Date())
                    }}
                    dados={(abaAnalise === 'lucro-real' || abaAnalise === 'lucro-real-servicos') ? lucroReal : dre}
                    usuario={nomeUsuario}
                    logoUrl={logoUrl}
                />
            </div>
        </div>
    );
};

export default DRE;
