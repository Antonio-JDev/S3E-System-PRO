import React, { useState, useEffect, useMemo } from 'react';
import { axiosApiService } from '../services/axiosApi';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';

interface FluxoCaixaComponentProps {
    toggleSidebar: () => void;
    setAbaAtiva?: (aba: string) => void;
}

const formatarDataParaInput = (d: Date) => d.toISOString().split('T')[0];

export const FluxoCaixa: React.FC<FluxoCaixaComponentProps> = ({ toggleSidebar, setAbaAtiva }) => {
    const [loading, setLoading] = useState(true);
    const [tipoVisao, setTipoVisao] = useState<'projecao' | 'realizado'>('projecao');
    const [periodo, setPeriodo] = useState<30 | 60 | 90>(90);
    const [modo, setModo] = useState<'confirmado' | 'previsao'>('confirmado');
    const [dataInicio, setDataInicio] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return formatarDataParaInput(d);
    });
    const [dataFim, setDataFim] = useState(() => formatarDataParaInput(new Date()));
    const [agrupamento, setAgrupamento] = useState<'dia' | 'semana' | 'mes'>('mes');
    const [dados, setDados] = useState<any>(null);
    const [diaExpandido, setDiaExpandido] = useState<string | null>(null);
    const [abaDetalhamento, setAbaDetalhamento] = useState<'entradas' | 'saidas'>('entradas');

    useEffect(() => {
        carregarFluxoCaixa();
    }, [periodo, modo, tipoVisao, dataInicio, dataFim]);

    const carregarFluxoCaixa = async () => {
        setLoading(true);
        try {
            if (tipoVisao === 'realizado') {
                const response = await axiosApiService.get(
                    '/api/financeiro/fluxo-caixa',
                    { tipo: 'realizado', dataInicio, dataFim }
                );
                if (response.success && response.data) {
                    setDados(response.data);
                }
            } else {
                const response = await axiosApiService.get(
                    '/api/financeiro/fluxo-caixa',
                    { dias: periodo, modo }
                );
                if (response.success && response.data) {
                    setDados(response.data);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar fluxo de caixa:', error);
        } finally {
            setLoading(false);
        }
    };

    // Dados do gráfico baseado no agrupamento (formatado para Recharts)
    const dadosGrafico = useMemo(() => {
        if (!dados) return [];

        const dadosAgrupados = agrupamento === 'dia' ? dados.fluxoPorDia :
                               agrupamento === 'semana' ? dados.fluxoPorSemana :
                               dados.fluxoPorMes;
        const lista = Array.isArray(dadosAgrupados) ? dadosAgrupados : [];

        return lista.map((item: any, index: number) => {
            let label = '';
            if (agrupamento === 'dia') {
                const data = new Date(item.data);
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                const dataItem = new Date(data);
                dataItem.setHours(0, 0, 0, 0);
                const diffDias = Math.floor((dataItem.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                
                if (diffDias === 0) {
                    label = 'Hoje';
                } else if (diffDias === 1) {
                    label = 'D+1';
                } else if (diffDias === -1) {
                    label = 'D-1';
                } else if (diffDias > 0) {
                    label = `D+${diffDias}`;
                } else {
                    label = `D${diffDias}`;
                }
                
                // Adicionar data formatada como tooltip
                label += ` (${data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })})`;
            } else if (agrupamento === 'semana') {
                const inicio = new Date(item.dataInicio);
                const fim = new Date(item.dataFim);
                label = `${inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${fim.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
            } else {
                label = item.mesAno;
            }

            return {
                periodo: label,
                entradas: item.entradas,
                saidas: item.saidas,
                saldo: item.saldoAcumulado || item.saldoAcumuladoFinal
            };
        });
    }, [dados, agrupamento]);

    // Formatador de moeda para os gráficos (sempre 2 casas decimais)
    const formatarMoeda = (valor: number) => {
        return `R$ ${Number(valor).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
    };

    // Tooltip customizado
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                    <p className="font-semibold text-gray-900 mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ color: entry.color }} className="text-sm">
                            {entry.name}: {formatarMoeda(entry.value)}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Carregando Fluxo de Caixa...</p>
                </div>
            </div>
        );
    }

    if (!dados) {
        return (
            <div className="p-6">
                <p className="text-red-600">Erro ao carregar dados do fluxo de caixa.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
            {/* Header - Padrão do sistema */}
            <div className="bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                                {tipoVisao === 'realizado' ? '📋 Fluxo de Caixa Realizado' : '💰 Fluxo de Caixa Futuro'}
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                                {tipoVisao === 'realizado'
                                    ? `O que entrou e saiu no período (${dataInicio} a ${dataFim})`
                                    : `Projeção de entradas e saídas - Próximos ${periodo} dias`}
                            </p>
                        </div>
                        {setAbaAtiva && (
                            <button
                                onClick={() => setAbaAtiva('dashboard')}
                                className="px-4 py-2 text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg font-medium flex items-center gap-2 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Voltar ao Dashboard
                            </button>
                        )}
                    </div>
                    {/* Filtros - Integrados no header */}
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Tipo: Projeção ou Realizado */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Visão:</span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setTipoVisao('projecao')}
                                    className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                                        tipoVisao === 'projecao'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Projeção
                                </button>
                                <button
                                    onClick={() => setTipoVisao('realizado')}
                                    className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                                        tipoVisao === 'realizado'
                                            ? 'bg-teal-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Realizado
                                </button>
                            </div>
                        </div>

                        {tipoVisao === 'projecao' && (
                            <>
                                {/* Período */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">Período:</span>
                                    <div className="flex gap-1">
                                        {[30, 60, 90].map((dias) => (
                                            <button
                                                key={dias}
                                                onClick={() => setPeriodo(dias as 30 | 60 | 90)}
                                                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                                                    periodo === dias
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                {dias}d
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Modo */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">Modo:</span>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setModo('confirmado')}
                                            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                                                modo === 'confirmado'
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            Confirmado
                                        </button>
                                        <button
                                            onClick={() => setModo('previsao')}
                                            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                                                modo === 'previsao'
                                                    ? 'bg-orange-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            Previsão
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {tipoVisao === 'realizado' && (
                            <>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-gray-700">Data início:</label>
                                    <input
                                        type="date"
                                        value={dataInicio}
                                        onChange={(e) => setDataInicio(e.target.value)}
                                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-gray-700">Data fim:</label>
                                    <input
                                        type="date"
                                        value={dataFim}
                                        onChange={(e) => setDataFim(e.target.value)}
                                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                </div>
                            </>
                        )}

                        {/* Agrupamento */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Visualização:</span>
                            <div className="flex gap-1">
                                {[
                                    { value: 'dia' as const, label: 'Dia' },
                                    { value: 'semana' as const, label: 'Semana' },
                                    { value: 'mes' as const, label: 'Mês' }
                                ].map((opcao) => (
                                    <button
                                        key={opcao.value}
                                        onClick={() => setAgrupamento(opcao.value)}
                                        className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                                            agrupamento === opcao.value
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {opcao.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Badge de Modo */}
                        {modo === 'previsao' && (
                            <span className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-800 px-2.5 py-1 rounded-md text-xs font-medium">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                Incluindo orçamentos em negociação
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-6">

                {/* Cards de Resumo - Projeção (5 colunas) ou Realizado (4 colunas) */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${dados.tipo === 'realizado' ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-4 mb-6`}>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-5 text-white">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wide opacity-90">Saldo Inicial</h3>
                            <svg className="w-5 h-5 opacity-75" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
                            </svg>
                        </div>
                        <p className="text-2xl font-bold mb-1">
                            {formatarMoeda(dados.saldos.saldoInicial)}
                        </p>
                        <p className="text-xs opacity-80">{dados.tipo === 'realizado' ? 'Antes do período' : 'Caixa atual'}</p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-md p-5 text-white">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wide opacity-90">{dados.tipo === 'realizado' ? 'Entradas' : '✓ Recebido'}</h3>
                            <svg className="w-5 h-5 opacity-75" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                            </svg>
                        </div>
                        <p className="text-2xl font-bold mb-1">
                            {formatarMoeda(dados.saldos.totalEntradasPagas ?? dados.saldos.totalEntradas ?? 0)}
                        </p>
                        <p className="text-xs opacity-80">{dados.tipo === 'realizado' ? 'No período' : 'Já entrou no período'}</p>
                    </div>

                    {dados.tipo !== 'realizado' && (
                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-5 text-white">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-semibold uppercase tracking-wide opacity-90">A Receber</h3>
                                <svg className="w-5 h-5 opacity-75" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd"/>
                                </svg>
                            </div>
                            <p className="text-2xl font-bold mb-1">
                                {formatarMoeda(dados.saldos.totalEntradas)}
                            </p>
                            <p className="text-xs opacity-80">{dados.estatisticas?.entradasPendentes ?? 0} parcelas pendentes</p>
                        </div>
                    )}

                    <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-md p-5 text-white">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wide opacity-90">{dados.tipo === 'realizado' ? 'Saídas' : 'A Pagar'}</h3>
                            <svg className="w-5 h-5 opacity-75" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd"/>
                            </svg>
                        </div>
                        <p className="text-2xl font-bold mb-1">
                            {formatarMoeda(dados.saldos.totalSaidasPagas ?? dados.saldos.totalSaidas ?? 0)}
                        </p>
                        <p className="text-xs opacity-80">{dados.tipo === 'realizado' ? 'No período' : `${dados.estatisticas?.saidasPendentes ?? 0} contas pendentes`}</p>
                    </div>

                    <div className={`bg-gradient-to-br ${dados.saldos.saldoFinal >= 0 ? 'from-purple-500 to-purple-600' : 'from-orange-500 to-orange-600'} rounded-lg shadow-md p-5 text-white`}>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wide opacity-90">{dados.tipo === 'realizado' ? 'Saldo Final' : 'Saldo Previsto'}</h3>
                            <svg className="w-5 h-5 opacity-75" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                            </svg>
                        </div>
                        <p className="text-2xl font-bold mb-1">
                            {formatarMoeda(dados.saldos.saldoFinal)}
                        </p>
                        <p className="text-xs opacity-80">{dados.tipo === 'realizado' ? 'Fim do período' : `Após ${periodo} dias`}</p>
                    </div>
                </div>

                {/* Resumo do Dia Atual (HOJE) - apenas em Projeção */}
                {dados.resumoHoje && dados.tipo !== 'realizado' && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-6 mb-6 shadow-md">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-indigo-600 rounded-full p-2">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">📅 Movimento do Dia Atual</h3>
                                <p className="text-sm text-gray-600">
                                    {new Date(dados.resumoHoje.data).toLocaleDateString('pt-BR', { 
                                        weekday: 'long', 
                                        day: 'numeric', 
                                        month: 'long', 
                                        year: 'numeric' 
                                    })}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-lg p-4 border-2 border-green-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-600">Vencendo Hoje (Receber)</span>
                                    <span className="text-2xl">💰</span>
                                </div>
                                <p className="text-2xl font-bold text-green-700 mb-1">
                                    {formatarMoeda(dados.resumoHoje.vencendoHojeReceber.valor)}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {dados.resumoHoje.vencendoHojeReceber.quantidade} {dados.resumoHoje.vencendoHojeReceber.quantidade === 1 ? 'parcela' : 'parcelas'} pendente{dados.resumoHoje.vencendoHojeReceber.quantidade !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <div className="bg-white rounded-lg p-4 border-2 border-red-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-600">Vencendo Hoje (Pagar)</span>
                                    <span className="text-2xl">💸</span>
                                </div>
                                <p className="text-2xl font-bold text-red-700 mb-1">
                                    {formatarMoeda(dados.resumoHoje.vencendoHojePagar.valor)}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {dados.resumoHoje.vencendoHojePagar.quantidade} {dados.resumoHoje.vencendoHojePagar.quantidade === 1 ? 'conta' : 'contas'} a pagar
                                </p>
                            </div>
                            <div className={`bg-white rounded-lg p-4 border-2 ${dados.resumoHoje.saldoPrevistoFinal >= 0 ? 'border-purple-200' : 'border-orange-200'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-600">Saldo Previsto Final</span>
                                    <span className="text-2xl">💵</span>
                                </div>
                                <p className={`text-2xl font-bold mb-1 ${dados.resumoHoje.saldoPrevistoFinal >= 0 ? 'text-purple-700' : 'text-orange-700'}`}>
                                    {formatarMoeda(dados.resumoHoje.saldoPrevistoFinal)}
                                </p>
                                <p className="text-xs text-gray-500">
                                    Se tudo for pago/recebido hoje
                                </p>
                            </div>
                        </div>
                    </div>
                )}


                {/* Alertas de Itens Atrasados */}
                {((dados.estatisticas?.contasAtrasadasReceber ?? 0) > 0 || (dados.estatisticas?.contasAtrasadasPagar ?? 0) > 0) && (
                    <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6 rounded-lg">
                        <div className="flex items-start gap-3">
                            <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <div className="flex-1">
                                <h4 className="text-red-900 font-bold text-lg mb-2">
                                    ⚠️ Alerta: {(dados.estatisticas?.contasAtrasadasReceber ?? 0) + (dados.estatisticas?.contasAtrasadasPagar ?? 0)} Conta(s) Atrasada(s)
                                </h4>
                                <p className="text-red-700 text-sm mb-2">
                                    Há {dados.estatisticas?.contasAtrasadasReceber ?? 0} parcela(s) a receber e {dados.estatisticas?.contasAtrasadasPagar ?? 0} conta(s) a pagar com vencimento passado. 
                                    Estas aparecerão destacadas no topo da lista.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Alertas de Dias Críticos */}
                {(dados.diasCriticos ?? []).length > 0 && (
                    <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6 rounded-lg">
                        <div className="flex items-start gap-3">
                            <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <div className="flex-1">
                                <h4 className="text-red-900 font-bold text-lg mb-2">⚠️ Alerta: {(dados.diasCriticos ?? []).length} Dia(s) com Saldo Negativo</h4>
                                <p className="text-red-700 text-sm">
                                    Foram identificados dias onde o saldo acumulado ficará negativo. Considere renegociar prazos com fornecedores ou antecipar recebimentos.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Gráficos - Lado a lado em telas maiores */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Gráfico de Barras - Entradas vs Saídas */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="text-2xl">📊</span>
                            Entradas vs Saídas
                        </h3>
                        <div style={{ height: '350px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dadosGrafico}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis 
                                        dataKey="periodo" 
                                        tick={{ fontSize: 11 }}
                                        angle={-45}
                                        textAnchor="end"
                                        height={70}
                                    />
                                    <YAxis 
                                        tick={{ fontSize: 11 }}
                                        tickFormatter={(value) => formatarMoeda(value)}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: '13px' }} />
                                    <Bar 
                                        dataKey="entradas" 
                                        name="Entradas" 
                                        fill="#22c55e" 
                                        radius={[6, 6, 0, 0]}
                                    />
                                    <Bar 
                                        dataKey="saidas" 
                                        name="Saídas" 
                                        fill="#ef4444" 
                                        radius={[6, 6, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Gráfico de Área - Saldo Acumulado */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="text-2xl">📈</span>
                            Saldo Acumulado
                        </h3>
                        <div style={{ height: '350px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dadosGrafico}>
                                    <defs>
                                        <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis 
                                        dataKey="periodo" 
                                        tick={{ fontSize: 11 }}
                                        angle={-45}
                                        textAnchor="end"
                                        height={70}
                                    />
                                    <YAxis 
                                        tick={{ fontSize: 11 }}
                                        tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: '13px' }} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="saldo" 
                                        name="Saldo Acumulado"
                                        stroke="#3b82f6" 
                                        strokeWidth={2.5}
                                        fillOpacity={1} 
                                        fill="url(#colorSaldo)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Tabela de Detalhamento */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-2xl">📋</span>
                        Movimentações Detalhadas
                    </h3>
                    
                    {/* Abas */}
                    <div className="flex gap-2 mb-4">
                        <button 
                            onClick={() => setAbaDetalhamento('entradas')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                                abaDetalhamento === 'entradas'
                                    ? 'bg-green-100 text-green-800 border-2 border-green-300'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Entradas ({dados.detalhamento.contasReceber.length})
                        </button>
                        <button 
                            onClick={() => setAbaDetalhamento('saidas')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                                abaDetalhamento === 'saidas'
                                    ? 'bg-red-100 text-red-800 border-2 border-red-300'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Saídas ({dados.detalhamento.contasPagar.length})
                        </button>
                    </div>

                    {/* Tabela de Entradas */}
                    {abaDetalhamento === 'entradas' && (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Data</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pedido</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Descrição</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">n°</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Valor</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Saldo Acumulado</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {/* Primeiro: Itens Atrasados */}
                                    {dados.detalhamento.contasReceber
                                        .filter((conta: any) => conta.estaAtrasado)
                                        .sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime())
                                        .map((conta: any) => {
                                            // Encontrar saldo acumulado para este item
                                            const movimentacao = dados.detalhamento.movimentacoesComSaldo?.find((m: any) => 
                                                m.id === conta.id && m.tipo === 'ENTRADA'
                                            );
                                            const saldoAcumulado = movimentacao?.saldoAcumulado || dados.saldos.saldoInicial;
                                            
                                            return (
                                                <tr key={conta.id} className="bg-red-50 hover:bg-red-100 border-l-4 border-red-500">
                                                    <td className="px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-red-600 font-bold">⚠️</span>
                                                            <span className="text-gray-900 font-semibold">
                                                                {new Date(conta.data).toLocaleDateString('pt-BR')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{conta.cliente}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{conta.numeroPedido || (conta.numeroVenda && conta.numeroVenda !== 'N/A' ? conta.numeroVenda : '—')}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{conta.numeroPedido ? `Venda ${conta.numeroPedido} - Parcela ${conta.numeroParcela}/${conta.totalParcelas}` : conta.descricao}</td>
                                                    <td className="px-4 py-3 text-sm text-center text-gray-600">{conta.numeroParcela}/{conta.totalParcelas}</td>
                                                    <td className="px-4 py-3 text-sm text-right font-bold text-green-700">
                                                        {formatarMoeda(conta.valor)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-700">
                                                        {formatarMoeda(saldoAcumulado)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                                            Atrasado
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    {/* Depois: Itens Normais (ordenados por data) */}
                                    {dados.detalhamento.contasReceber
                                        .filter((conta: any) => !conta.estaAtrasado)
                                        .sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime())
                                        .map((conta: any) => {
                                            // Encontrar saldo acumulado para este item
                                            const movimentacao = dados.detalhamento.movimentacoesComSaldo?.find((m: any) => 
                                                m.id === conta.id && m.tipo === 'ENTRADA'
                                            );
                                            const saldoAcumulado = movimentacao?.saldoAcumulado || dados.saldos.saldoInicial;
                                            
                                            return (
                                                <tr key={conta.id} className="hover:bg-green-50">
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        {new Date(conta.data).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{conta.cliente}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{conta.numeroPedido || (conta.numeroVenda && conta.numeroVenda !== 'N/A' ? conta.numeroVenda : '—')}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{conta.numeroPedido ? `Venda ${conta.numeroPedido} - Parcela ${conta.numeroParcela}/${conta.totalParcelas}` : conta.descricao}</td>
                                                    <td className="px-4 py-3 text-sm text-center text-gray-600">{conta.numeroParcela}/{conta.totalParcelas}</td>
                                                    <td className="px-4 py-3 text-sm text-right font-bold text-green-700">
                                                        {formatarMoeda(conta.valor)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-700">
                                                        {formatarMoeda(saldoAcumulado)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                            conta.status === 'Pendente' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                                                        }`}>
                                                            {conta.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Tabela de Saídas */}
                    {abaDetalhamento === 'saidas' && (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Data</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fornecedor</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Descrição</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Valor</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Saldo Acumulado</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {/* Primeiro: Itens Atrasados */}
                                    {dados.detalhamento.contasPagar
                                        .filter((conta: any) => conta.estaAtrasado)
                                        .sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime())
                                        .map((conta: any) => {
                                            // Encontrar saldo acumulado para este item
                                            const movimentacao = dados.detalhamento.movimentacoesComSaldo?.find((m: any) => 
                                                m.id === conta.id && m.tipoMovimento === 'SAIDA'
                                            );
                                            const saldoAcumulado = movimentacao?.saldoAcumulado || dados.saldos.saldoInicial;
                                            
                                            return (
                                                <tr key={conta.id} className="bg-red-50 hover:bg-red-100 border-l-4 border-red-500">
                                                    <td className="px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-red-600 font-bold">⚠️</span>
                                                            <span className="text-gray-900 font-semibold">
                                                                {new Date(conta.data).toLocaleDateString('pt-BR')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{(conta.tipo === 'RH' && (!conta.fornecedor || conta.fornecedor === 'N/A')) ? 'Pagamento Funcionário' : conta.fornecedor}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{conta.descricao}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {conta.tipo === 'FORNECEDOR' ? 'Fornecedor' : 
                                                         conta.tipo === 'RH' ? 'Recursos Humanos' : 
                                                         conta.tipo === 'DESPESA_FIXA' ? 'Despesa Fixa' : 
                                                         conta.tipo}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right font-bold text-red-700">
                                                        {formatarMoeda(conta.valor)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-700">
                                                        {formatarMoeda(saldoAcumulado)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                                            Atrasado
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    {/* Depois: Itens Normais (ordenados por data) */}
                                    {dados.detalhamento.contasPagar
                                        .filter((conta: any) => !conta.estaAtrasado)
                                        .sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime())
                                        .map((conta: any) => {
                                            // Encontrar saldo acumulado para este item
                                            const movimentacao = dados.detalhamento.movimentacoesComSaldo?.find((m: any) => 
                                                m.id === conta.id && m.tipoMovimento === 'SAIDA'
                                            );
                                            const saldoAcumulado = movimentacao?.saldoAcumulado || dados.saldos.saldoInicial;
                                            
                                            return (
                                                <tr key={conta.id} className="hover:bg-red-50">
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        {new Date(conta.data).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{(conta.tipo === 'RH' && (!conta.fornecedor || conta.fornecedor === 'N/A')) ? 'Pagamento Funcionário' : conta.fornecedor}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{conta.descricao}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {conta.tipo === 'FORNECEDOR' ? 'Fornecedor' : 
                                                         conta.tipo === 'RH' ? 'Recursos Humanos' : 
                                                         conta.tipo === 'DESPESA_FIXA' ? 'Despesa Fixa' : 
                                                         conta.tipo}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right font-bold text-red-700">
                                                        {formatarMoeda(conta.valor)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-700">
                                                        {formatarMoeda(saldoAcumulado)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                            conta.status === 'Pendente' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                                                        }`}>
                                                            {conta.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FluxoCaixa;
