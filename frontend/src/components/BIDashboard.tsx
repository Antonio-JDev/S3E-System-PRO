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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import {
  DollarSign,
  TrendingUp,
  Package,
  ShoppingCart,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { biService, type ResumoGeral, type DashboardMetrics } from '../services/biService';
import { ThemeContext } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface BIDashboardProps {
  toggleSidebar?: () => void;
}

const BIDashboard: React.FC<BIDashboardProps> = ({ toggleSidebar }) => {
  const [dataInicio, setDataInicio] = useState<string>(
    new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0]
  );
  const [dataFim, setDataFim] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [resumoGeral, setResumoGeral] = useState<ResumoGeral | null>(null);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [exportando, setExportando] = useState<boolean>(false);

  const themeContext = useContext(ThemeContext);
  const isDark =
    themeContext?.theme === 'dark' ||
    (themeContext?.theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Cores para gráficos - seguindo padrão do sistema (indigo/roxo como primário)
  const COLORS = [
    '#6366F1', // indigo-500 (primário do sistema)
    '#8B5CF6', // purple-500
    '#3B82F6', // blue-500
    '#10B981', // green-500
    '#F59E0B', // amber-500
    '#EF4444', // red-500
    '#EC4899', // pink-500
    '#06B6D4', // cyan-500
  ];

  // Carregar dados
  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar ambos: resumo geral (para gráficos existentes) e dashboard metrics (para métricas principais)
      const [resumoResultado, dashboardResultado] = await Promise.all([
        biService.getResumoGeral(dataInicio, dataFim),
        biService.getDashboardMetrics(dataInicio, dataFim),
      ]);

      if (resumoResultado.success && resumoResultado.data) {
        setResumoGeral(resumoResultado.data);
      } else {
        const errorMsg = resumoResultado.error || 'Erro desconhecido ao carregar resumo geral';
        console.error('Erro ao carregar resumo geral:', errorMsg);
        toast.error(`Erro ao carregar resumo geral: ${errorMsg}`);
        // Definir dados vazios para evitar quebras
        setResumoGeral({
          investimentos: { total: 0, porMes: [] },
          gastosFornecedor: [],
          custosQuadros: { total: 0, quantidade: 0, media: 0 },
          lucrosQuadros: { total: 0, quantidade: 0, media: 0, margemMedia: 0 },
          vendas: { quantidade: 0, valorTotal: 0, media: 0 },
          markupItens: { porTipo: [] },
          evolucaoOrcamentosPorServico: [],
          orcamentosPorTipoMensal: [],
          gastosFixos: { totalMensal: 0, totalAnual: 0, porCategoria: {}, evolucaoMensal: [] },
        });
      }

      if (dashboardResultado.success && dashboardResultado.data) {
        setDashboardMetrics(dashboardResultado.data);
      } else {
        toast.error(dashboardResultado.error || 'Erro ao carregar métricas do dashboard');
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados de BI:', error);
      toast.error('Erro ao carregar dados de BI');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [dataInicio, dataFim]);

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

  // Preparar dados para gráfico de investimentos por mês (CPV por mês)
  const dadosInvestimentosPorMes = dashboardMetrics?.investimentosPorMes.map((item) => ({
    mes: new Date(item.mes + '-01').toLocaleDateString('pt-BR', {
      month: 'short',
      year: 'numeric',
    }),
    valor: item.cpv,
  })) || resumoGeral?.investimentos.porMes.map((item) => ({
    mes: new Date(item.mes + '-01').toLocaleDateString('pt-BR', {
      month: 'short',
      year: 'numeric',
    }),
    valor: item.valor,
  })) || [];

  // Preparar dados para gráfico de gastos por fornecedor (top 10)
  const dadosGastosFornecedor = dashboardMetrics?.gastosPorFornecedorTop10.map((item) => ({
    nome: item.nomeFornecedor,
    total: item.valorGasto,
    quantidade: 0, // Não disponível no dashboard metrics
  })) || resumoGeral?.gastosFornecedor
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((item) => ({
      nome: item.fornecedorNome,
      total: item.total,
      quantidade: item.quantidadeCompras,
    })) || [];

  // Preparar dados para gráfico de pizza de gastos por fornecedor
  const dadosPizzaFornecedor = resumoGeral?.gastosFornecedor
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map((item) => ({
      name: item.fornecedorNome.length > 20
        ? item.fornecedorNome.substring(0, 20) + '...'
        : item.fornecedorNome,
      value: item.total,
    })) || [];

  // Preparar dados para gráfico de pizza de markup por tipo
  const dadosPizzaMarkup = resumoGeral?.markupItens.porTipo.map((item) => ({
    name: item.tipo.replace('_', ' '),
    value: item.markupMedio,
    quantidade: item.quantidade,
  })) || [];

  // Preparar dados para gráfico de linha interativo - Evolução de orçamentos por tipo de serviço
  const dadosEvolucaoOrcamentos = resumoGeral?.evolucaoOrcamentosPorServico || [];
  
  // Obter todos os tipos de serviço únicos para o gráfico interativo
  const tiposServico = useMemo(() => {
    if (!dadosEvolucaoOrcamentos.length) return [];
    const servicos = new Set<string>();
    dadosEvolucaoOrcamentos.forEach((item) => {
      Object.keys(item).forEach((key) => {
        if (key !== 'data') {
          servicos.add(key);
        }
      });
    });
    return Array.from(servicos);
  }, [dadosEvolucaoOrcamentos]);

  const [servicoAtivo, setServicoAtivo] = useState<string>('');

  // Atualizar serviço ativo quando tiposServico mudar
  useEffect(() => {
    if (tiposServico.length > 0 && !servicoAtivo) {
      setServicoAtivo(tiposServico[0]);
    }
  }, [tiposServico, servicoAtivo]);

  // Calcular totais por serviço
  const totaisPorServico = useMemo(() => {
    const totais: Record<string, number> = {};
    dadosEvolucaoOrcamentos.forEach((item) => {
      tiposServico.forEach((servico) => {
        totais[servico] = (totais[servico] || 0) + (Number(item[servico]) || 0);
      });
    });
    return totais;
  }, [dadosEvolucaoOrcamentos, tiposServico]);

  // Preparar dados para gráfico de barras múltiplas - Quadros vs Serviços
  const dadosQuadrosServicos = useMemo(() => {
    const dados = resumoGeral?.orcamentosPorTipoMensal || [];
    return dados.map((item) => ({
      month: new Date(item.mes + '-01').toLocaleDateString('pt-BR', {
        month: 'short',
        year: 'numeric',
      }),
      mes: item.mes,
      quadros: item.quadros,
      servicos: item.servicos,
    }));
  }, [resumoGeral]);

  // Configuração do gráfico de barras múltiplas
  const chartConfigQuadrosServicos = {
    quadros: {
      label: 'Quadros',
      color: '#6366F1', // indigo-500 (primário do sistema)
    },
    servicos: {
      label: 'Serviços',
      color: '#10B981', // green-500
    },
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
            Business Intelligence
          </h2>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
            Análise de investimentos, gastos, custos e lucros
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

      {/* Cards de Métricas Principais - Dashboard Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Vendas Total (Receita Bruta) */}
        <div className="card-primary card-hover">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text">
              Vendas Total
            </h3>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatarMoeda(dashboardMetrics?.vendasTotal || 0)}
            </div>
            <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
              Receita Bruta no período
            </p>
          </div>
        </div>

        {/* 2. CPV (Custo dos Produtos Vendidos) */}
        <div className="card-primary card-hover">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text">
              CPV
            </h3>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 flex items-center justify-center">
              <Package className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatarMoeda(dashboardMetrics?.cpv || 0)}
            </div>
            <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
              Custo dos Produtos Vendidos
            </p>
          </div>
        </div>

        {/* 3. Margem Bruta (Lucro Bruto) */}
        <div className="card-primary card-hover">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text">
              Margem Bruta
            </h3>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-bold ${
              (dashboardMetrics?.margemBruta || 0) >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {formatarMoeda(dashboardMetrics?.margemBruta || 0)}
            </div>
            <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
              Lucro Bruto • {dashboardMetrics?.vendasTotal 
                ? formatarPercentual(((dashboardMetrics.margemBruta || 0) / dashboardMetrics.vendasTotal) * 100)
                : '0,00%'
              } de margem
            </p>
          </div>
        </div>

        {/* 4. Custos Fixos Total */}
        <div className="card-primary card-hover">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text">
              Custos Fixos
            </h3>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatarMoeda(dashboardMetrics?.custosFixosTotal || 0)}
            </div>
            <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
              Total de custos fixos no período
            </p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras - Investimentos por Mês */}
        <div className="card-primary">
          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">
              Investimentos em Produtos por Mês (CPV)
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
              Evolução do Custo dos Produtos Vendidos (CPV) ao longo do período
            </p>
          </div>
          <div className="p-6">
            {dadosInvestimentosPorMes.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                <p>Nenhum dado disponível para o período selecionado</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosInvestimentosPorMes}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={isDark ? '#334155' : '#e5e7eb'} 
                />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 12 }}
                  stroke={isDark ? '#334155' : '#e5e7eb'}
                />
                <YAxis 
                  tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 12 }}
                  stroke={isDark ? '#334155' : '#e5e7eb'}
                  tickFormatter={(value) => {
                    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
                    return `R$ ${value}`;
                  }}
                />
                <Tooltip
                  formatter={(value: number) => formatarMoeda(value)}
                  contentStyle={{
                    backgroundColor: isDark ? '#1E293B' : '#fff',
                    border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    color: isDark ? '#F8FAFC' : '#111827',
                  }}
                  labelStyle={{ color: isDark ? '#CBD5E1' : '#6b7280' }}
                />
                <Legend 
                  wrapperStyle={{ color: isDark ? '#CBD5E1' : '#6b7280' }}
                />
                <Bar 
                  dataKey="valor" 
                  fill="#6366F1" 
                  name="Investimento"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Pizza - Gastos por Fornecedor */}
        <div className="card-primary">
          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">
              Distribuição de Gastos por Fornecedor
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
              Top 8 fornecedores por volume de compras
            </p>
          </div>
          <div className="p-6">
            {dadosPizzaFornecedor.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                <p>Nenhum dado disponível para o período selecionado</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dadosPizzaFornecedor}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name.length > 15 ? name.substring(0, 15) + '...' : name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dadosPizzaFornecedor.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatarMoeda(value)}
                  contentStyle={{
                    backgroundColor: isDark ? '#1E293B' : '#fff',
                    border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    color: isDark ? '#F8FAFC' : '#111827',
                  }}
                  labelStyle={{ color: isDark ? '#CBD5E1' : '#6b7280' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Barras - Gastos por Fornecedor */}
        <div className="card-primary">
          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">
              Gastos por Fornecedor (Top 10)
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
              Fornecedores com maior volume de compras
            </p>
          </div>
          <div className="p-6">
            {dadosGastosFornecedor.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                <p>Nenhum dado disponível para o período selecionado</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosGastosFornecedor} layout="vertical">
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={isDark ? '#334155' : '#e5e7eb'} 
                />
                <XAxis 
                  type="number" 
                  tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 12 }}
                  stroke={isDark ? '#334155' : '#e5e7eb'}
                  tickFormatter={(value) => {
                    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
                    return `R$ ${value}`;
                  }}
                />
                <YAxis
                  dataKey="nome"
                  type="category"
                  width={150}
                  tick={{ fontSize: 12, fill: isDark ? '#CBD5E1' : '#6b7280' }}
                  stroke={isDark ? '#334155' : '#e5e7eb'}
                />
                <Tooltip
                  formatter={(value: number) => formatarMoeda(value)}
                  contentStyle={{
                    backgroundColor: isDark ? '#1E293B' : '#fff',
                    border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    color: isDark ? '#F8FAFC' : '#111827',
                  }}
                  labelStyle={{ color: isDark ? '#CBD5E1' : '#6b7280' }}
                />
                <Legend 
                  wrapperStyle={{ color: isDark ? '#CBD5E1' : '#6b7280' }}
                />
                <Bar 
                  dataKey="total" 
                  fill="#10B981" 
                  name="Total Gasto"
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Barras Múltiplas - Comparação Quadros vs Serviços */}
        <div className="card-primary">
          <CardHeader>
            <CardTitle>Comparação: Quadros vs Serviços</CardTitle>
            <CardDescription>
              Valor de orçamentos por tipo no período selecionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dadosQuadrosServicos.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                <p>Nenhum dado disponível para o período selecionado</p>
              </div>
            ) : (
              <ChartContainer config={chartConfigQuadrosServicos}>
                <BarChart
                  accessibilityLayer
                  data={dadosQuadrosServicos}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.slice(0, 3)}
                    style={{
                      fontSize: '12px',
                      fill: isDark ? '#CBD5E1' : '#6b7280',
                    }}
                  />
                  <YAxis
                    tickFormatter={(value) => {
                      if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
                      return `R$ ${value}`;
                    }}
                    style={{
                      fontSize: '12px',
                      fill: isDark ? '#CBD5E1' : '#6b7280',
                    }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div
                            className="rounded-lg border bg-background p-2 shadow-sm"
                            style={{
                              backgroundColor: isDark ? '#1E293B' : '#fff',
                              borderColor: isDark ? '#334155' : '#e5e7eb',
                            }}
                          >
                            <div className="grid gap-2">
                              {payload.map((entry: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between gap-4"
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="h-2.5 w-2.5 rounded-full"
                                      style={{ backgroundColor: entry.color }}
                                    />
                                    <span
                                      className="text-sm"
                                      style={{
                                        color: isDark ? '#CBD5E1' : '#6b7280',
                                      }}
                                    >
                                      {entry.dataKey === 'quadros' ? 'Quadros' : 'Serviços'}
                                    </span>
                                  </div>
                                  <span
                                    className="font-medium"
                                    style={{
                                      color: isDark ? '#F8FAFC' : '#111827',
                                    }}
                                  >
                                    {formatarMoeda(entry.value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="quadros"
                    fill={chartConfigQuadrosServicos.quadros.color}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="servicos"
                    fill={chartConfigQuadrosServicos.servicos.color}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
            </CardContent>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <div className="flex gap-2 leading-none font-medium">
              <TrendingUp className="h-4 w-4" />
              Comparação mensal de orçamentos por tipo
            </div>
            <div className="text-muted-foreground leading-none">
                  Valores totais de orçamentos com itens de quadros e serviços
                </div>
            </CardFooter>
          </div>
        )}

        {/* Gráfico de Pizza - Markup por Tipo */}
        <div className="card-primary">
          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">
              Markup Médio por Tipo de Item
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
              Percentual de lucro por categoria
            </p>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosPizzaMarkup}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dadosPizzaMarkup.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(2)}%`}
                  contentStyle={{
                    backgroundColor: isDark ? '#1E293B' : '#fff',
                    border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    color: isDark ? '#F8FAFC' : '#111827',
                  }}
                  labelStyle={{ color: isDark ? '#CBD5E1' : '#6b7280' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Gráfico de Linha Interativo - Evolução de Orçamentos por Tipo de Serviço */}
      <div className="card-primary">
        <div className="flex flex-col lg:flex-row border-b border-gray-200 dark:border-dark-border">
          <div className="flex flex-1 flex-col justify-center gap-1 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">
              Evolução de Orçamentos por Tipo de Serviço
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
              Mostrando valores de orçamentos por tipo de serviço no período selecionado
            </p>
          </div>
          {tiposServico.length > 0 ? (
            <div className="flex flex-wrap border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-dark-border">
              {tiposServico.map((servico) => {
                const total = totaisPorServico[servico] || 0;
                const isActive = servicoAtivo === servico;
                return (
                  <button
                    key={servico}
                    onClick={() => setServicoAtivo(servico)}
                    className={`
                      flex flex-1 flex-col justify-center gap-1 px-4 py-4 text-left 
                      min-w-[150px] sm:min-w-[180px] 
                      transition-all duration-200
                      ${isActive 
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-600 dark:border-indigo-400' 
                        : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                      }
                      border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-dark-border
                      even:border-l lg:even:border-l
                    `}
                  >
                    <span className="text-xs font-medium text-gray-600 dark:text-dark-text-secondary">
                      {servico.length > 20 ? servico.substring(0, 20) + '...' : servico}
                    </span>
                    <span className={`text-lg leading-none font-bold sm:text-2xl ${
                      isActive 
                        ? 'text-indigo-600 dark:text-indigo-400' 
                        : 'text-gray-900 dark:text-dark-text'
                    }`}>
                      {formatarMoeda(total)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center px-6 py-4 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-dark-border">
              <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                Nenhum serviço encontrado no período
              </p>
            </div>
          )}
        </div>
        <div className="p-6">
          {tiposServico.length > 0 && dadosEvolucaoOrcamentos.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={dadosEvolucaoOrcamentos}
                margin={{
                  left: 12,
                  right: 12,
                  top: 12,
                  bottom: 12,
                }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false}
                  stroke={isDark ? '#334155' : '#e5e7eb'} 
                />
                <XAxis
                  dataKey="data"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 12 }}
                  stroke={isDark ? '#334155' : '#e5e7eb'}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('pt-BR', {
                      month: 'short',
                      day: 'numeric',
                    });
                  }}
                />
                <YAxis
                  tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 12 }}
                  stroke={isDark ? '#334155' : '#e5e7eb'}
                  tickFormatter={(value) => {
                    if (value >= 1000) {
                      return `R$ ${(value / 1000).toFixed(1)}k`;
                    }
                    return `R$ ${value}`;
                  }}
                />
                <Tooltip
                  formatter={(value: number) => formatarMoeda(value)}
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString('pt-BR', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                  }}
                  contentStyle={{
                    backgroundColor: isDark ? '#1E293B' : '#fff',
                    border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    color: isDark ? '#F8FAFC' : '#111827',
                  }}
                  labelStyle={{ color: isDark ? '#CBD5E1' : '#6b7280' }}
                />
                <Legend 
                  wrapperStyle={{ color: isDark ? '#CBD5E1' : '#6b7280' }}
                />
                {tiposServico.map((servico, index) => {
                  const isActive = servicoAtivo === servico;
                  return (
                    <Line
                      key={servico}
                      type="monotone"
                      dataKey={servico}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={isActive ? 3 : 2}
                      dot={isActive}
                      dotRadius={isActive ? 4 : 0}
                      strokeDasharray={isActive ? '0' : '5 5'}
                      opacity={isActive ? 1 : 0.5}
                      name={servico.length > 20 ? servico.substring(0, 20) + '...' : servico}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] bg-gray-50 dark:bg-slate-800/30 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                  Nenhum dado de serviço disponível para o período selecionado
                </p>
                <p className="text-xs text-gray-400 dark:text-dark-text-secondary mt-1">
                  Os dados aparecerão aqui quando houver orçamentos com serviços no período
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabela de Markup por Tipo */}
      <div className="card-primary">
        <div className="p-6 border-b border-gray-200 dark:border-dark-border">
          <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">
            Detalhamento de Markup por Tipo
          </h3>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
            Análise detalhada de margem de lucro
          </p>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-slate-800/50">
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-dark-text">
                    Tipo
                  </th>
                  <th className="text-right p-3 font-semibold text-gray-700 dark:text-dark-text">
                    Markup Médio
                  </th>
                  <th className="text-right p-3 font-semibold text-gray-700 dark:text-dark-text">
                    Quantidade
                  </th>
                </tr>
              </thead>
              <tbody>
                {resumoGeral?.markupItens.porTipo.map((item, index) => (
                  <tr 
                    key={index} 
                    className="border-b border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-3 text-gray-900 dark:text-dark-text">
                      {item.tipo.replace('_', ' ')}
                    </td>
                    <td className="p-3 text-right font-semibold text-green-600 dark:text-green-400">
                      {formatarPercentual(item.markupMedio)}
                    </td>
                    <td className="p-3 text-right text-gray-700 dark:text-dark-text-secondary">
                      {item.quantidade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Card de Gastos Fixos por Categoria */}
      {resumoGeral?.gastosFixos && (
        <div className="card-primary">
          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">
              Gastos Fixos por Categoria
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
              Distribuição mensal de gastos fixos por categoria
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {Object.entries(resumoGeral.gastosFixos.porCategoria).map(([categoria, valor]) => (
                <div
                  key={categoria}
                  className="p-4 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-slate-800/30 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors card-hover"
                >
                  <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary mb-1">
                    {categoria}
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-dark-text">
                    {formatarMoeda(valor)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                    Mensal
                  </p>
                </div>
              ))}
            </div>
            {resumoGeral.gastosFixos.evolucaoMensal.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 text-gray-700 dark:text-dark-text">
                  Evolução Mensal
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={resumoGeral.gastosFixos.evolucaoMensal}>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke={isDark ? '#334155' : '#e5e7eb'} 
                    />
                    <XAxis
                      dataKey="mes"
                      tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 12 }}
                      stroke={isDark ? '#334155' : '#e5e7eb'}
                      tickFormatter={(value) => {
                        const date = new Date(value + '-01');
                        return date.toLocaleDateString('pt-BR', {
                          month: 'short',
                        });
                      }}
                    />
                    <YAxis
                      tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 12 }}
                      stroke={isDark ? '#334155' : '#e5e7eb'}
                      tickFormatter={(value) => {
                        if (value >= 1000) {
                          return `R$ ${(value / 1000).toFixed(1)}k`;
                        }
                        return `R$ ${value}`;
                      }}
                    />
                    <Tooltip
                      formatter={(value: number) => formatarMoeda(value)}
                      contentStyle={{
                        backgroundColor: isDark ? '#1E293B' : '#fff',
                        border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        color: isDark ? '#F8FAFC' : '#111827',
                      }}
                      labelStyle={{ color: isDark ? '#CBD5E1' : '#6b7280' }}
                    />
                    <Bar 
                      dataKey="valor" 
                      fill="#F59E0B" 
                      name="Gastos Fixos"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BIDashboard;

