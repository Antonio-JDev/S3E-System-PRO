import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Package,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  Calendar,
  Activity,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  biService,
  type VendasComprasClassificacao,
  type MateriaisMaisCompradosPeriodo,
} from '../services/biService';
import { ThemeContext } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface BIDashboardProps {
  toggleSidebar?: () => void;
}

const BIDashboard: React.FC<BIDashboardProps> = ({ toggleSidebar }) => {
  // Estados de período
  const [dataInicio, setDataInicio] = useState<string>(
    new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0]
  );
  const [dataFim, setDataFim] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  // Estados de dados
  const [loading, setLoading] = useState<boolean>(true);
  const [exportando, setExportando] = useState<boolean>(false);
  const [orcamentosPorStatus, setOrcamentosPorStatus] = useState<any>(null);
  const [orcamentosPorTipoServico, setOrcamentosPorTipoServico] = useState<any>(null);
  const [markupVendasPorServico, setMarkupVendasPorServico] = useState<any>(null);
  const [periodoMarkup, setPeriodoMarkup] = useState<'mes' | 'semana' | 'semestre' | 'ano'>('mes');
  const [gastosFornecedor, setGastosFornecedor] = useState<any>(null);
  const [servicosRentaveis, setServicosRentaveis] = useState<any>(null);
  const [vendasCompras, setVendasCompras] = useState<VendasComprasClassificacao | null>(null);
  const [diasMateriais, setDiasMateriais] = useState<30 | 60>(30);
  const [materiaisPeriodo, setMateriaisPeriodo] = useState<MateriaisMaisCompradosPeriodo | null>(null);
  const [loadingMateriais, setLoadingMateriais] = useState(false);

  const themeContext = useContext(ThemeContext);
  const isDark =
    themeContext?.theme === 'dark' ||
    (themeContext?.theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Cores para status de orçamentos
  const STATUS_COLORS = {
    aprovados: '#10B981',   // verde
    pendentes: '#F59E0B',   // amarelo
    expirados: '#EF4444',   // vermelho
    declinados: '#1F2937',  // preto
  };

  // Cores para gráficos
  const CHART_COLORS = [
    '#6366F1', // indigo
    '#8B5CF6', // purple
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#EC4899', // pink
    '#06B6D4', // cyan
  ];

  // Carregar dados
  const carregarDados = async () => {
    try {
      setLoading(true);
      
      if (!dataInicio || !dataFim) {
        toast.error('Por favor, selecione um período válido');
        setLoading(false);
        return;
      }

      console.log('📊 Carregando dados de BI:', { dataInicio, dataFim, periodoMarkup });
      
      const [
        orcamentosStatusResultado,
        orcamentosTipoServicoResultado,
        markupVendasResultado,
        gastosFornecedorResultado,
        servicosRentaveisResultado,
        vendasComprasResultado,
      ] = await Promise.all([
        biService.getOrcamentosPorStatus(dataInicio, dataFim),
        biService.getOrcamentosPorTipoServicoClassificado(dataInicio, dataFim),
        biService.getMarkupVendasPorServico(dataInicio, dataFim, periodoMarkup),
        biService.getGastosFornecedor(dataInicio, dataFim),
        biService.getServicosRentaveis(dataInicio, dataFim),
        biService.getVendasComprasClassificacao(dataInicio, dataFim),
      ]);

      console.log('📊 Resultados recebidos:', {
        orcamentosStatus: orcamentosStatusResultado,
        orcamentosTipoServico: orcamentosTipoServicoResultado,
        markupVendas: markupVendasResultado,
        gastosFornecedor: gastosFornecedorResultado,
        servicosRentaveis: servicosRentaveisResultado,
        vendasCompras: vendasComprasResultado,
      });

      // Processar orçamentos por status
      if (orcamentosStatusResultado && orcamentosStatusResultado.data) {
        console.log('✅ Orçamentos por status carregados:', orcamentosStatusResultado.data);
        setOrcamentosPorStatus(orcamentosStatusResultado.data);
      } else if (orcamentosStatusResultado && !orcamentosStatusResultado.success) {
        console.error('❌ Erro ao carregar orçamentos por status:', orcamentosStatusResultado.error);
        toast.error('Erro ao carregar estatísticas de orçamentos por status');
      }

      // Processar orçamentos por tipo de serviço
      if (orcamentosTipoServicoResultado && orcamentosTipoServicoResultado.data) {
        console.log('✅ Orçamentos por tipo de serviço carregados:', orcamentosTipoServicoResultado.data);
        setOrcamentosPorTipoServico(orcamentosTipoServicoResultado.data);
      } else if (orcamentosTipoServicoResultado && !orcamentosTipoServicoResultado.success) {
        console.error('❌ Erro ao carregar orçamentos por tipo de serviço:', orcamentosTipoServicoResultado.error);
        toast.error('Erro ao carregar estatísticas de orçamentos por tipo de serviço');
      }

      // Processar markup de vendas
      if (markupVendasResultado && markupVendasResultado.data) {
        console.log('✅ Markup de vendas carregado:', markupVendasResultado.data);
        setMarkupVendasPorServico(markupVendasResultado.data);
      } else if (markupVendasResultado && !markupVendasResultado.success) {
        console.error('❌ Erro ao carregar markup de vendas:', markupVendasResultado.error);
        toast.error('Erro ao carregar estatísticas de markup de vendas');
      }

      // Processar gastos por fornecedor
      if (gastosFornecedorResultado && gastosFornecedorResultado.data) {
        console.log('✅ Gastos por fornecedor carregados:', gastosFornecedorResultado.data);
        // Verificar se é um array e tem dados
        if (Array.isArray(gastosFornecedorResultado.data) && gastosFornecedorResultado.data.length > 0) {
          setGastosFornecedor(gastosFornecedorResultado.data);
        } else {
          console.warn('⚠️ Array de fornecedores vazio');
          setGastosFornecedor([]);
        }
      } else if (gastosFornecedorResultado && !gastosFornecedorResultado.success) {
        console.error('❌ Erro ao carregar gastos por fornecedor:', gastosFornecedorResultado.error);
        setGastosFornecedor([]);
      } else {
        console.warn('⚠️ Resposta de fornecedores inválida:', gastosFornecedorResultado);
        setGastosFornecedor([]);
      }

      // Processar serviços rentáveis
      if (servicosRentaveisResultado && servicosRentaveisResultado.data) {
        console.log('✅ Serviços rentáveis carregados:', servicosRentaveisResultado.data);
        // Verificar se é um array e tem dados
        if (Array.isArray(servicosRentaveisResultado.data) && servicosRentaveisResultado.data.length > 0) {
          setServicosRentaveis(servicosRentaveisResultado.data);
        } else {
          console.warn('⚠️ Array de serviços rentáveis vazio');
          setServicosRentaveis([]);
        }
      } else if (servicosRentaveisResultado && !servicosRentaveisResultado.success) {
        console.error('❌ Erro ao carregar serviços rentáveis:', servicosRentaveisResultado.error);
        setServicosRentaveis([]);
      } else {
        console.warn('⚠️ Resposta de serviços rentáveis inválida:', servicosRentaveisResultado);
        setServicosRentaveis([]);
      }

      if (vendasComprasResultado?.success && vendasComprasResultado.data) {
        setVendasCompras(vendasComprasResultado.data);
      } else {
        setVendasCompras(null);
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados de BI:', error);
      toast.error('Erro ao carregar dados do Business Intelligence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [dataInicio, dataFim, periodoMarkup]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingMateriais(true);
      const r = await biService.getMateriaisMaisCompradosPeriodo(diasMateriais);
      if (!cancelled && r.success && r.data) {
        setMateriaisPeriodo(r.data);
      }
      if (!cancelled) setLoadingMateriais(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [diasMateriais]);

  const vendasComprasChartData = useMemo(() => {
    if (!vendasCompras) return [];
    const rows: Array<{
      nome: string;
      valor: number;
      qtd: number;
      tipo: 'venda' | 'compra';
      fill?: string;
    }> = [
      {
        nome: 'Receita (orçamentos aprovados)',
        valor: vendasCompras.vendasOrcamentosAprovados.valorTotal,
        qtd: vendasCompras.vendasOrcamentosAprovados.quantidadeOrcamentos,
        tipo: 'venda',
      },
    ];
    vendasCompras.comprasPorClassificacao.forEach((c, i) => {
      rows.push({
        nome: c.nomeExibicao,
        valor: c.valorTotal,
        qtd: c.quantidadeCompras,
        tipo: 'compra',
        fill: CHART_COLORS[i % CHART_COLORS.length],
      });
    });
    return rows;
  }, [vendasCompras]);

  // Formatar valor monetário
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  // Formatar percentual
  const formatarPercentual = (valor: number) => {
    return `${valor.toFixed(2)}%`;
  };

  // Exportar para PDF
  const exportarParaPDF = async () => {
    try {
      setExportando(true);
      const elemento = document.getElementById('bi-dashboard-content');

      if (!elemento) {
        toast.error('Elemento não encontrado para exportação');
        return;
      }

      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgScaledWidth = imgWidth * ratio;
      const imgScaledHeight = imgHeight * ratio;
      const xOffset = (pdfWidth - imgScaledWidth) / 2;
      const yOffset = (pdfHeight - imgScaledHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgScaledWidth, imgScaledHeight);

      const nomeArquivo = `bi-dashboard-${dataInicio}-${dataFim}.pdf`;
      pdf.save(nomeArquivo);

      toast.success('PDF exportado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setExportando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-gray-50 dark:bg-dark-bg min-h-screen" id="bi-dashboard-content">
      {/* Header com seletor de período e botão de exportar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-dark-text">
            Business Intelligence - S3E Engenharia
          </h2>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
            Visão administrativa: vendas (orçamentos aprovados), compras por classificação, fornecedores, serviços e materiais
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="flex gap-2">
            <div className="flex flex-col flex-1 sm:flex-none">
              <label className="text-xs font-medium text-gray-700 dark:text-dark-text mb-1">
                Data Início
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="input-field text-sm"
              />
            </div>
            <div className="flex flex-col flex-1 sm:flex-none">
              <label className="text-xs font-medium text-gray-700 dark:text-dark-text mb-1">
                Data Fim
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="input-field text-sm"
              />
            </div>
          </div>
          <button
            onClick={exportarParaPDF}
            disabled={exportando}
            className="btn-primary mt-6 sm:mt-0 flex items-center justify-center"
          >
            <Download className="w-4 h-4 mr-2" />
            {exportando ? 'Exportando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* Cards de Resumo de Orçamentos */}
      {orcamentosPorStatus && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Orçamentos Aprovados */}
          <div className="card-primary card-hover">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text">
                Orçamentos Aprovados
              </h3>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {orcamentosPorStatus.aprovados.quantidade}
              </div>
              <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
                {formatarMoeda(orcamentosPorStatus.aprovados.valorTotal)}
              </p>
            </div>
          </div>

          {/* Orçamentos Pendentes */}
          <div className="card-primary card-hover">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text">
                Orçamentos Pendentes
              </h3>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {orcamentosPorStatus.pendentes.quantidade}
              </div>
              <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
                {formatarMoeda(orcamentosPorStatus.pendentes.valorTotal)}
              </p>
            </div>
          </div>

          {/* Orçamentos Expirados */}
          <div className="card-primary card-hover">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text">
                Orçamentos Expirados
              </h3>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {orcamentosPorStatus.expirados.quantidade}
              </div>
              <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
                {formatarMoeda(orcamentosPorStatus.expirados.valorTotal)}
              </p>
            </div>
          </div>

          {/* Orçamentos Declinados */}
          <div className="card-primary card-hover">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text">
                Orçamentos Declinados
              </h3>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900/30 dark:to-gray-800/30 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-400">
                {orcamentosPorStatus.declinados.quantidade}
              </div>
              <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
                {formatarMoeda(orcamentosPorStatus.declinados.valorTotal)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Receita (orç. aprovados) vs compras por classificação — mesmo período do filtro */}
      {vendasCompras && vendasComprasChartData.length > 0 && (
        <div className="card-primary">
          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">
              Receita de vendas vs compras por classificação
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
              Compara a receita somada dos <strong>orçamentos aprovados</strong> no período com o gasto em compras (NF-e),
              agrupado por classificação: material/estoque, RH, despesas variadas, escritório, limpeza, ferramentas, etc.
              Use junto com os gráficos de serviços e fornecedores para enxergar volume de negócio, tipo de compra e onde mais se gasta.
            </p>
          </div>
          <div className="p-6 space-y-6">
            <ResponsiveContainer width="100%" height={Math.min(520, 120 + vendasComprasChartData.length * 36)}>
              <BarChart
                data={vendasComprasChartData}
                margin={{ top: 16, right: 24, left: 8, bottom: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} vertical={false} />
                <XAxis
                  dataKey="nome"
                  tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 10 }}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={90}
                />
                <YAxis
                  tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 11 }}
                  tickFormatter={(v) =>
                    v >= 1_000_000 ? `R$ ${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`
                  }
                />
                <Tooltip
                  formatter={(value: number, _n: string, props: any) => [
                    `${formatarMoeda(value)} (${props.payload.qtd} ${props.payload.tipo === 'venda' ? 'orç.' : 'compras'})`,
                    'Valor',
                  ]}
                  contentStyle={{
                    backgroundColor: isDark ? '#1E293B' : '#fff',
                    border: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: isDark ? '#F8FAFC' : '#111827',
                  }}
                />
                <Legend />
                <Bar dataKey="valor" name="Valor (R$)" radius={[6, 6, 0, 0]}>
                  {vendasComprasChartData.map((entry: any, index: number) => (
                    <Cell
                      key={index}
                      fill={entry.tipo === 'venda' ? '#10B981' : entry.fill || CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-dark-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-700 to-slate-600 text-white">
                    <th className="text-left p-3 font-semibold">Indicador</th>
                    <th className="text-right p-3 font-semibold">Qtd.</th>
                    <th className="text-right p-3 font-semibold">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200 dark:border-dark-border bg-emerald-50/50 dark:bg-emerald-900/10">
                    <td className="p-3 font-medium text-gray-900 dark:text-dark-text">Receita — orçamentos aprovados</td>
                    <td className="p-3 text-right tabular-nums">{vendasCompras.vendasOrcamentosAprovados.quantidadeOrcamentos}</td>
                    <td className="p-3 text-right font-semibold tabular-nums">
                      {formatarMoeda(vendasCompras.vendasOrcamentosAprovados.valorTotal)}
                    </td>
                  </tr>
                  {vendasCompras.comprasPorClassificacao.map((c, idx) => (
                    <tr
                      key={c.classificacao}
                      className="border-b border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="p-3 text-gray-900 dark:text-dark-text">
                        <span className="inline-block w-2 h-2 rounded-full mr-2 align-middle" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                        {c.nomeExibicao}
                      </td>
                      <td className="p-3 text-right tabular-nums">{c.quantidadeCompras}</td>
                      <td className="p-3 text-right font-medium tabular-nums">{formatarMoeda(c.valorTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Seção 1: Distribuição de Orçamentos por Status */}
      {orcamentosPorStatus && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Pizza - Distribuição por Status */}
          <div className="card-primary">
            <div className="p-6 border-b border-gray-200 dark:border-dark-border">
              <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">
                Distribuição de Orçamentos por Status
              </h3>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                Visão geral de todos os {orcamentosPorStatus.total.quantidade} orçamentos no período
              </p>
            </div>
            <div className="p-6">
              {orcamentosPorStatus.porStatus && orcamentosPorStatus.porStatus.filter((s: any) => s.quantidade > 0).length > 0 ? (
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={orcamentosPorStatus.porStatus.filter((s: any) => s.quantidade > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                          outerRadius={110}
                          innerRadius={50}
                          fill="#8884d8"
                          dataKey="quantidade"
                          paddingAngle={3}
                        >
                          {orcamentosPorStatus.porStatus.filter((s: any) => s.quantidade > 0).map((entry: any, index: number) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.cor}
                              stroke={isDark ? '#1E293B' : '#fff'}
                              strokeWidth={3}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string, props: any) => [
                            `${value} orçamentos (${formatarMoeda(props.payload.valorTotal)})`,
                            props.payload.status
                          ]}
                          contentStyle={{
                            backgroundColor: isDark ? '#1E293B' : '#fff',
                            border: (isDark ? '1px solid #334155' : '1px solid #e5e7eb'),
                            borderRadius: '8px',
                            color: isDark ? '#F8FAFC' : '#111827',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="lg:w-72 space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-4">Detalhamento</h4>
                    {orcamentosPorStatus.porStatus.map((entry: any, index: number) => {
                      const total = orcamentosPorStatus.total.quantidade;
                      const percent = total > 0 ? (entry.quantidade / total) * 100 : 0;
                      return (
                        <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-gray-100 dark:border-gray-700">
                          <div 
                            className="w-5 h-5 rounded-full flex-shrink-0 shadow-sm" 
                            style={{ backgroundColor: entry.cor }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">
                              {entry.status}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex-1 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all"
                                  style={{ 
                                    width: `${percent}%`,
                                    backgroundColor: entry.cor
                                  }}
                                />
                              </div>
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                {percent.toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                              <span className="font-semibold">{entry.quantidade}</span> orçamentos • {formatarMoeda(entry.valorTotal)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[320px] text-gray-500 dark:text-gray-400">
                  <PieChartIcon className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm font-medium">Nenhum orçamento encontrado</p>
                  <p className="text-xs mt-1">Selecione outro período</p>
                </div>
              )}
            </div>
          </div>

          {/* Gráfico de Barras - Gerados vs Aprovados */}
          <div className="card-primary">
            <div className="p-6 border-b border-gray-200 dark:border-dark-border">
              <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">
                Orçamentos Gerados vs Aprovados
              </h3>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                Taxa de conversão de orçamentos em vendas
              </p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart 
                  data={[
                    {
                      nome: 'Gerados',
                      quantidade: orcamentosPorStatus.total.quantidade,
                      valor: orcamentosPorStatus.total.valorTotal,
                    },
                    {
                      nome: 'Aprovados',
                      quantidade: orcamentosPorStatus.aprovados.quantidade,
                      valor: orcamentosPorStatus.aprovados.valorTotal,
                    },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="nome" 
                    tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 12 }}
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 11 }}
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Quantidade', angle: -90, position: 'insideLeft', style: { fill: isDark ? '#CBD5E1' : '#6b7280' } }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 11 }}
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return 'R$ ' + (value / 1000000).toFixed(1) + 'M';
                      if (value >= 1000) return 'R$ ' + (value / 1000).toFixed(1) + 'k';
                      return 'R$ ' + value.toFixed(0);
                    }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'Quantidade') {
                        return [`${value} orçamentos`, name];
                      }
                      return [formatarMoeda(value), 'Valor Total'];
                    }}
                    contentStyle={{
                      backgroundColor: isDark ? '#1E293B' : '#fff',
                      border: (isDark ? '1px solid #334155' : '1px solid #e5e7eb'),
                      borderRadius: '8px',
                      color: isDark ? '#F8FAFC' : '#111827',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="left"
                    dataKey="quantidade" 
                    fill="#6366F1" 
                    name="Quantidade"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar 
                    yAxisId="right"
                    dataKey="valor" 
                    fill="#10B981" 
                    name="Valor Total"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">
                  Taxa de Aprovação: {orcamentosPorStatus.total.quantidade > 0 
                    ? ((orcamentosPorStatus.aprovados.quantidade / orcamentosPorStatus.total.quantidade) * 100).toFixed(1)
                    : '0'}%
                </p>
                <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-1">
                  {orcamentosPorStatus.aprovados.quantidade} de {orcamentosPorStatus.total.quantidade} orçamentos foram aprovados
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seção 2: Orçamentos por Tipo de Serviço */}
      {orcamentosPorTipoServico && orcamentosPorTipoServico.porClassificacao && orcamentosPorTipoServico.porClassificacao.length > 0 && (
        <div className="card-primary">
          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">
              Orçamentos por Tipo de Serviço
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
              Análise detalhada por classificação: Mão de Obra, Engenharia, Administrativo e Montagem
            </p>
          </div>
          <div className="p-6">
            {/* Cards de Resumo por Classificação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {orcamentosPorTipoServico.porClassificacao.map((item: any, index: number) => (
                <div
                  key={index}
                  className="p-5 border-2 border-gray-200 dark:border-dark-border rounded-xl bg-gradient-to-br from-white to-gray-50 dark:from-slate-800/30 dark:to-slate-800/50 hover:shadow-lg transition-all"
                  style={{
                    borderColor: CHART_COLORS[index % CHART_COLORS.length] + '40',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-gray-700 dark:text-dark-text">
                      {item.classificacao}
                    </h4>
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                  </div>
                  <p className="text-2xl font-bold mb-1" style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}>
                    {item.quantidade}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-dark-text-secondary mb-2">
                    orçamentos • {formatarMoeda(item.valorTotal)}
                  </p>
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                      Taxa de Aprovação: {item.taxaAprovacao.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Gráfico de Barras - Comparação por Classificação */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-4">
                Valor Total por Classificação
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={orcamentosPorTipoServico.porClassificacao}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="classificacao" 
                    tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 11 }}
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                    tickLine={false}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 11 }}
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return 'R$ ' + (value / 1000000).toFixed(1) + 'M';
                      if (value >= 1000) return 'R$ ' + (value / 1000).toFixed(1) + 'k';
                      return 'R$ ' + value.toFixed(0);
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatarMoeda(value)}
                    contentStyle={{
                      backgroundColor: isDark ? '#1E293B' : '#fff',
                      border: (isDark ? '1px solid #334155' : '1px solid #e5e7eb'),
                      borderRadius: '8px',
                      color: isDark ? '#F8FAFC' : '#111827',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Bar 
                    dataKey="valorTotal" 
                    name="Valor Total"
                    radius={[8, 8, 0, 0]}
                  >
                    {orcamentosPorTipoServico.porClassificacao.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela Detalhada de Serviços por Classificação */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-4">
                Serviços Detalhados por Classificação
              </h4>
              <div className="space-y-4">
                {orcamentosPorTipoServico.porClassificacao.map((classif: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden">
                    <div 
                      className="p-3 font-semibold text-white"
                      style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                    >
                      {classif.classificacao} - {classif.quantidade} orçamentos ({formatarMoeda(classif.valorTotal)})
                    </div>
                    {classif.servicos && classif.servicos.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-slate-800/50">
                            <tr>
                              <th className="text-left p-3 text-xs font-semibold text-gray-700 dark:text-dark-text">Serviço</th>
                              <th className="text-right p-3 text-xs font-semibold text-gray-700 dark:text-dark-text">Quantidade</th>
                              <th className="text-right p-3 text-xs font-semibold text-gray-700 dark:text-dark-text">Valor Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classif.servicos.slice(0, 5).map((servico: any, sIdx: number) => (
                              <tr key={sIdx} className="border-t border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-800/30">
                                <td className="p-3 text-sm text-gray-900 dark:text-dark-text">{servico.nome}</td>
                                <td className="p-3 text-sm text-right text-gray-700 dark:text-dark-text-secondary">{servico.quantidade}</td>
                                <td className="p-3 text-sm text-right font-semibold text-gray-900 dark:text-dark-text">{formatarMoeda(servico.valorTotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seção 3: Evolução Mensal por Classificação */}
      {orcamentosPorTipoServico && orcamentosPorTipoServico.evolucaoMensal && orcamentosPorTipoServico.evolucaoMensal.length > 0 && (
        <div className="card-primary">
          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">
              Evolução Mensal de Orçamentos por Classificação de Serviço
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
              Tendência de valores de orçamentos ao longo do tempo
            </p>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={orcamentosPorTipoServico.evolucaoMensal.map((item: any) => ({
                  mes: new Date(item.mes + '-01').toLocaleDateString('pt-BR', {
                    month: 'short',
                    year: '2-digit',
                  }),
                  'Mão de Obra': item.maoDeObra,
                  'Engenharia/Projetos': item.engenharia,
                  'Administrativo': item.administrativo,
                  'Montagem': item.montagem,
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false}
                  stroke={isDark ? '#334155' : '#e5e7eb'} 
                />
                <XAxis
                  dataKey="mes"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 12 }}
                  stroke={isDark ? '#334155' : '#e5e7eb'}
                />
                <YAxis
                  tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 11 }}
                  stroke={isDark ? '#334155' : '#e5e7eb'}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return 'R$ ' + (value / 1000000).toFixed(1) + 'M';
                    if (value >= 1000) return 'R$ ' + (value / 1000).toFixed(1) + 'k';
                    return 'R$ ' + value.toFixed(0);
                  }}
                />
                <Tooltip
                  formatter={(value: number) => formatarMoeda(value)}
                  contentStyle={{
                    backgroundColor: isDark ? '#1E293B' : '#fff',
                    border: (isDark ? '1px solid #334155' : '1px solid #e5e7eb'),
                    borderRadius: '8px',
                    color: isDark ? '#F8FAFC' : '#111827',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Legend 
                  wrapperStyle={{ color: isDark ? '#CBD5E1' : '#6b7280' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Mão de Obra" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Engenharia/Projetos" 
                  stroke="#6366F1" 
                  strokeWidth={3}
                  dot={{ fill: '#6366F1', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Administrativo" 
                  stroke="#F59E0B" 
                  strokeWidth={3}
                  dot={{ fill: '#F59E0B', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Montagem" 
                  stroke="#8B5CF6" 
                  strokeWidth={3}
                  dot={{ fill: '#8B5CF6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detalhamento por serviço (substitui a visão DRE — análise de resultado fica no Financeiro) */}
      {markupVendasPorServico && markupVendasPorServico.dados && markupVendasPorServico.dados.length > 0 && (
        <div className="card-primary">
          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">
                  Detalhamento por Serviço Individual
                </h3>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                  Análise detalhada de cada serviço vendido no período{' '}
                  {periodoMarkup === 'mes'
                    ? 'mensal'
                    : periodoMarkup === 'semana'
                      ? 'semanal'
                      : periodoMarkup === 'semestre'
                        ? 'semestral'
                        : 'anual'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-700 dark:text-dark-text whitespace-nowrap">
                  Agregação do período:
                </label>
                <Select value={periodoMarkup} onValueChange={(value: any) => setPeriodoMarkup(value)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mes">Mensal</SelectItem>
                    <SelectItem value="semana">Semanal</SelectItem>
                    <SelectItem value="semestre">Semestral</SelectItem>
                    <SelectItem value="ano">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/50 border-b-2 border-gray-300 dark:border-gray-600">
                    <th className="text-left p-3 text-xs font-bold text-gray-700 dark:text-dark-text">Período</th>
                    <th className="text-left p-3 text-xs font-bold text-gray-700 dark:text-dark-text">Classificação</th>
                    <th className="text-left p-3 text-xs font-bold text-gray-700 dark:text-dark-text">Serviço</th>
                    <th className="text-right p-3 text-xs font-bold text-gray-700 dark:text-dark-text">Receita</th>
                    <th className="text-right p-3 text-xs font-bold text-gray-700 dark:text-dark-text">Custo</th>
                    <th className="text-right p-3 text-xs font-bold text-gray-700 dark:text-dark-text">Lucro</th>
                    <th className="text-right p-3 text-xs font-bold text-gray-700 dark:text-dark-text">Markup %</th>
                    <th className="text-right p-3 text-xs font-bold text-gray-700 dark:text-dark-text">Qtd</th>
                  </tr>
                </thead>
                <tbody>
                  {markupVendasPorServico.dados.map((item: any, index: number) => (
                    <tr 
                      key={index} 
                      className="border-b border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-3 text-xs text-gray-700 dark:text-dark-text-secondary">
                        {item.periodo}
                      </td>
                      <td className="p-3 text-xs text-gray-900 dark:text-dark-text font-medium">
                        {item.classificacao}
                      </td>
                      <td className="p-3 text-xs text-gray-900 dark:text-dark-text">
                        {item.servicoNome}
                      </td>
                      <td className="p-3 text-xs text-right text-gray-900 dark:text-dark-text font-semibold">
                        {formatarMoeda(item.receita)}
                      </td>
                      <td className="p-3 text-xs text-right text-gray-700 dark:text-dark-text-secondary">
                        {formatarMoeda(item.custo)}
                      </td>
                      <td className={`p-3 text-xs text-right font-semibold ${
                        item.lucro >= 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {formatarMoeda(item.lucro)}
                      </td>
                      <td className={`p-3 text-xs text-right font-bold ${
                        item.markup >= 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {formatarPercentual(item.markup)}
                      </td>
                      <td className="p-3 text-xs text-right text-gray-700 dark:text-dark-text-secondary">
                        {item.quantidade}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Seção 6: Gastos com Fornecedores */}
      {gastosFornecedor && Array.isArray(gastosFornecedor) && gastosFornecedor.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Pizza - Top 8 Fornecedores */}
          <div className="card-primary">
            <div className="p-6 border-b border-gray-200 dark:border-dark-border">
              <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Distribuição de Gastos por Fornecedor
              </h3>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                Top 8 fornecedores por volume de compras
              </p>
            </div>
            <div className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={gastosFornecedor.slice(0, 8)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                        outerRadius={120}
                        innerRadius={60}
                        fill="#8884d8"
                        dataKey="total"
                        paddingAngle={3}
                      >
                        {gastosFornecedor.slice(0, 8).map((entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                            stroke={isDark ? '#1E293B' : '#fff'}
                            strokeWidth={3}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string, props: any) => [
                          formatarMoeda(value),
                          props.payload.fornecedorNome
                        ]}
                        contentStyle={{
                          backgroundColor: isDark ? '#1E293B' : '#fff',
                          border: (isDark ? '1px solid #334155' : '1px solid #e5e7eb'),
                          borderRadius: '8px',
                          color: isDark ? '#F8FAFC' : '#111827',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="lg:w-72 space-y-2">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-3">Top 8 Fornecedores</h4>
                  {gastosFornecedor.slice(0, 8).map((fornecedor: any, index: number) => {
                    const totalGeral = gastosFornecedor.slice(0, 8).reduce((sum: number, f: any) => sum + f.total, 0);
                    const percent = totalGeral > 0 ? (fornecedor.total / totalGeral) * 100 : 0;
                    return (
                      <div key={index} className="p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          <span className="text-sm text-gray-900 dark:text-dark-text font-semibold flex-1 truncate">
                            {fornecedor.fornecedorNome}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all"
                              style={{ 
                                width: `${percent}%`,
                                backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                              }}
                            />
                          </div>
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {percent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-600 dark:text-gray-400">
                            {fornecedor.quantidadeCompras} compras
                          </span>
                          <span className="font-bold text-gray-900 dark:text-dark-text">
                            {formatarMoeda(fornecedor.total)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">
                      Total Gasto (Top 8)
                    </p>
                    <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-1">
                      {gastosFornecedor.slice(0, 8).reduce((sum: number, f: any) => sum + f.quantidadeCompras, 0)} compras realizadas
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-300">
                      {formatarMoeda(gastosFornecedor.slice(0, 8).reduce((sum: number, f: any) => sum + f.total, 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico de Barras - Top 10 Fornecedores */}
          <div className="card-primary">
            <div className="p-6 border-b border-gray-200 dark:border-dark-border">
              <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Gastos por Fornecedor (Top 10)
              </h3>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                Fornecedores com maior volume de compras
              </p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={Math.max(450, gastosFornecedor.slice(0, 10).length * 45)}>
                <BarChart 
                  data={gastosFornecedor.slice(0, 10).map((f: any, idx: number) => ({
                    ...f,
                    cor: CHART_COLORS[idx % CHART_COLORS.length],
                  }))}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 150, bottom: 20 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis 
                    type="number"
                    tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 11 }}
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return 'R$ ' + (value / 1000000).toFixed(1) + 'M';
                      if (value >= 1000) return 'R$ ' + (value / 1000).toFixed(1) + 'k';
                      return 'R$ ' + value.toFixed(0);
                    }}
                  />
                  <YAxis
                    dataKey="fornecedorNome"
                    type="category"
                    width={140}
                    tick={{ fontSize: 11, fill: isDark ? '#CBD5E1' : '#6b7280' }}
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      formatarMoeda(value),
                      `${props.payload.quantidadeCompras} compras`
                    ]}
                    contentStyle={{
                      backgroundColor: isDark ? '#1E293B' : '#fff',
                      border: (isDark ? '1px solid #334155' : '1px solid #e5e7eb'),
                      borderRadius: '8px',
                      color: isDark ? '#F8FAFC' : '#111827',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Bar 
                    dataKey="total" 
                    name="Volume de Compras"
                    radius={[0, 8, 8, 0]}
                  >
                    {gastosFornecedor.slice(0, 10).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">Total Gasto (Top 10)</p>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-300">
                    {formatarMoeda(gastosFornecedor.slice(0, 10).reduce((sum: number, f: any) => sum + f.total, 0))}
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-xs text-purple-700 dark:text-purple-400 mb-1">Média por Fornecedor</p>
                  <p className="text-xl font-bold text-purple-900 dark:text-purple-300">
                    {formatarMoeda(gastosFornecedor.slice(0, 10).reduce((sum: number, f: any) => sum + f.total, 0) / Math.min(10, gastosFornecedor.length))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : gastosFornecedor !== null && (
        <div className="card-primary">
          <div className="p-12 text-center">
            <PieChartIcon className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-2">
              Nenhum gasto com fornecedor encontrado
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
              Não há compras registradas no período selecionado.
            </p>
          </div>
        </div>
      )}

      {/* Materiais mais comprados — últimos 30 ou 60 dias (independente do filtro de datas do BI) */}
      <div className="card-primary">
        <div className="p-6 border-b border-gray-200 dark:border-dark-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Materiais mais comprados
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
              Ranking por valor gasto em itens vinculados a materiais no estoque (compras recebidas). Escolha a janela de tempo:
            </p>
          </div>
          <div className="flex rounded-lg border border-gray-200 dark:border-dark-border p-1 bg-gray-50 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => setDiasMateriais(30)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                diasMateriais === 30
                  ? 'bg-white dark:bg-slate-700 shadow text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              30 dias
            </button>
            <button
              type="button"
              onClick={() => setDiasMateriais(60)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                diasMateriais === 60
                  ? 'bg-white dark:bg-slate-700 shadow text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              60 dias
            </button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {materiaisPeriodo && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Período:{' '}
              {new Date(materiaisPeriodo.dataInicio).toLocaleDateString('pt-BR')} —{' '}
              {new Date(materiaisPeriodo.dataFim).toLocaleDateString('pt-BR')}
            </p>
          )}
          {loadingMateriais ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
          ) : materiaisPeriodo && materiaisPeriodo.materiais.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={Math.min(480, 80 + materiaisPeriodo.materiais.length * 40)}>
                <BarChart
                  data={materiaisPeriodo.materiais.map((m, i) => ({
                    ...m,
                    nomeCurto: m.nome.length > 42 ? `${m.nome.slice(0, 40)}…` : m.nome,
                    fill: CHART_COLORS[i % CHART_COLORS.length],
                  }))}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} horizontal vertical={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 11 }}
                    tickFormatter={(v) =>
                      v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                    }
                  />
                  <YAxis
                    dataKey="nomeCurto"
                    type="category"
                    width={200}
                    tick={{ fontSize: 10, fill: isDark ? '#CBD5E1' : '#6b7280' }}
                  />
                  <Tooltip
                    formatter={(value: number, _n: string, p: any) => [
                      formatarMoeda(value),
                      `${p.payload.quantidade?.toFixed?.(2) ?? p.payload.quantidade} un.`,
                    ]}
                    contentStyle={{
                      backgroundColor: isDark ? '#1E293B' : '#fff',
                      border: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="valorTotal" name="Valor comprado" radius={[0, 6, 6, 0]}>
                    {materiaisPeriodo.materiais.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-dark-border">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-700 to-slate-600 text-white">
                      <th className="text-left p-3 font-semibold">#</th>
                      <th className="text-left p-3 font-semibold">Material</th>
                      <th className="text-left p-3 font-semibold">SKU</th>
                      <th className="text-right p-3 font-semibold">Qtd.</th>
                      <th className="text-right p-3 font-semibold">Valor total</th>
                      <th className="text-right p-3 font-semibold">Custo médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materiaisPeriodo.materiais.map((m, idx) => (
                      <tr key={m.materialId} className="border-b border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 text-gray-500">{idx + 1}</td>
                        <td className="p-3 font-medium text-gray-900 dark:text-dark-text">{m.nome}</td>
                        <td className="p-3 text-gray-600 dark:text-gray-400">{m.sku}</td>
                        <td className="p-3 text-right tabular-nums">{m.quantidade?.toFixed?.(2) ?? m.quantidade}</td>
                        <td className="p-3 text-right font-semibold tabular-nums">{formatarMoeda(m.valorTotal ?? 0)}</td>
                        <td className="p-3 text-right tabular-nums">{formatarMoeda(m.custoMedio ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-8">
              Nenhuma compra de material no período selecionado.
            </p>
          )}
        </div>
      </div>

      {/* Seção 7: Serviços Mais Rentáveis */}
      {servicosRentaveis && Array.isArray(servicosRentaveis) && servicosRentaveis.length > 0 ? (
        <div className="card-primary">
          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              Serviços Mais Rentáveis
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
              Ranking dos serviços com maior lucratividade nos pedidos de venda
            </p>
          </div>
          <div className="p-6 space-y-6">
            {/* Top 3 Serviços - Cards Destacados */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {servicosRentaveis.slice(0, 3).map((servico: any, index: number) => (
                <div
                  key={index}
                  className={`p-6 rounded-xl border-2 bg-gradient-to-br ${
                    index === 0
                      ? 'border-yellow-400 from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30'
                      : index === 1
                      ? 'border-gray-400 from-gray-50 to-gray-100 dark:from-gray-800/30 dark:to-gray-700/30'
                      : 'border-orange-400 from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`text-3xl font-bold ${
                      index === 0 ? 'text-yellow-600 dark:text-yellow-400' :
                      index === 1 ? 'text-gray-600 dark:text-gray-400' :
                      'text-orange-600 dark:text-orange-400'
                    }`}>
                      #{index + 1}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      index === 0 ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' :
                      index === 1 ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200' :
                      'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200'
                    }`}>
                      {servico.classificacao}
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-3">
                    {servico.servicoNome}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Lucro:</span>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatarMoeda(servico.lucro)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Markup:</span>
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {formatarPercentual(servico.markup)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Receita:</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-dark-text">
                        {formatarMoeda(servico.receita)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabela Completa de Serviços Rentáveis */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-4">
                Ranking Completo de Rentabilidade
              </h4>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-dark-border">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-green-600 to-green-500 text-white">
                      <th className="text-center p-4 font-bold w-16">#</th>
                      <th className="text-left p-4 font-bold">Serviço</th>
                      <th className="text-left p-4 font-bold">Classificação</th>
                      <th className="text-right p-4 font-bold">Receita</th>
                      <th className="text-right p-4 font-bold">Custo</th>
                      <th className="text-right p-4 font-bold">Lucro</th>
                      <th className="text-right p-4 font-bold">Markup %</th>
                      <th className="text-right p-4 font-bold">Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servicosRentaveis.map((servico: any, index: number) => (
                      <tr 
                        key={index} 
                        className={`border-b border-gray-200 dark:border-dark-border hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors ${
                          index < 3 ? 'bg-green-50/50 dark:bg-green-900/10' : ''
                        }`}
                      >
                        <td className="p-4 text-center">
                          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                            index === 0 ? 'bg-yellow-400 text-yellow-900' :
                            index === 1 ? 'bg-gray-400 text-gray-900' :
                            index === 2 ? 'bg-orange-400 text-orange-900' :
                            'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                            {index + 1}
                          </div>
                        </td>
                        <td className="p-4 text-gray-900 dark:text-dark-text font-semibold">
                          {servico.servicoNome}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs font-medium">
                            {servico.classificacao}
                          </span>
                        </td>
                        <td className="p-4 text-right text-gray-900 dark:text-dark-text font-semibold">
                          {formatarMoeda(servico.receita)}
                        </td>
                        <td className="p-4 text-right text-gray-700 dark:text-dark-text-secondary">
                          {formatarMoeda(servico.custo)}
                        </td>
                        <td className="p-4 text-right font-bold text-green-600 dark:text-green-400">
                          {formatarMoeda(servico.lucro)}
                        </td>
                        <td className="p-4 text-right font-bold text-lg text-green-600 dark:text-green-400">
                          {formatarPercentual(servico.markup)}
                        </td>
                        <td className="p-4 text-right text-gray-700 dark:text-dark-text-secondary">
                          {servico.quantidade}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 dark:bg-slate-800 font-bold">
                      <td colSpan={3} className="p-4 text-gray-900 dark:text-dark-text">TOTAL</td>
                      <td className="p-4 text-right text-gray-900 dark:text-dark-text">
                        {formatarMoeda(servicosRentaveis.reduce((sum: number, s: any) => sum + s.receita, 0))}
                      </td>
                      <td className="p-4 text-right text-gray-900 dark:text-dark-text">
                        {formatarMoeda(servicosRentaveis.reduce((sum: number, s: any) => sum + s.custo, 0))}
                      </td>
                      <td className="p-4 text-right text-green-600 dark:text-green-400">
                        {formatarMoeda(servicosRentaveis.reduce((sum: number, s: any) => sum + s.lucro, 0))}
                      </td>
                      <td className="p-4 text-right text-green-600 dark:text-green-400 text-lg">
                        {(() => {
                          const totalCusto = servicosRentaveis.reduce((sum: number, s: any) => sum + s.custo, 0);
                          const totalLucro = servicosRentaveis.reduce((sum: number, s: any) => sum + s.lucro, 0);
                          const markupTotal = totalCusto > 0 ? (totalLucro / totalCusto) * 100 : 0;
                          return formatarPercentual(markupTotal);
                        })()}
                      </td>
                      <td className="p-4 text-right text-gray-900 dark:text-dark-text">
                        {servicosRentaveis.reduce((sum: number, s: any) => sum + s.quantidade, 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : servicosRentaveis !== null && (
        <div className="card-primary">
          <div className="p-12 text-center">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-2">
              Nenhum serviço rentável encontrado
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
              Não há vendas de serviços registradas no período selecionado.
            </p>
          </div>
        </div>
      )}

      {/* Mensagem quando não há dados */}
      {!loading && (!orcamentosPorStatus || !orcamentosPorTipoServico || !markupVendasPorServico) && (
        <div className="card-primary">
          <div className="p-12 text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-2">
              Nenhum dado disponível
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
              Selecione um período diferente ou verifique se há orçamentos e vendas registrados no sistema.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BIDashboard;
