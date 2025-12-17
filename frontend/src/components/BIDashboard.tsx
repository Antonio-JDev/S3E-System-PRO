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
  ShoppingCart,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  Calendar,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartStyle, type ChartConfig } from './ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label, Sector } from 'recharts';
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
  const [servicoAtivo, setServicoAtivo] = useState<string>('');
  const [markupAtivo, setMarkupAtivo] = useState<string>('');

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
      
      // Validar datas antes de fazer as chamadas
      if (!dataInicio || !dataFim) {
        console.error('❌ Datas inválidas:', { dataInicio, dataFim });
        toast.error('Por favor, selecione um período válido');
        setLoading(false);
        return;
      }

      console.log('📊 [BIDashboard] Carregando dados de BI:', { dataInicio, dataFim });
      
      // Carregar ambos: resumo geral (para gráficos existentes) e dashboard metrics (para métricas principais)
      const [resumoResultado, dashboardResultado] = await Promise.all([
        biService.getResumoGeral(dataInicio, dataFim),
        biService.getDashboardMetrics(dataInicio, dataFim),
      ]);
      
      console.log('📊 [BIDashboard] Resultados:', { 
        resumo: resumoResultado.success, 
        dashboard: dashboardResultado.success 
      });

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
      const errorMsg = error?.message || error?.response?.data?.error || 'Erro desconhecido ao carregar dados de BI';
      toast.error(`Erro ao carregar dados de BI: ${errorMsg}`);
      
      // Definir dados vazios para evitar quebras na interface
      if (!resumoGeral) {
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
      
      if (!dashboardMetrics) {
        setDashboardMetrics({
          vendasTotal: 0,
          cpv: 0,
          margemBruta: 0,
          custosFixosTotal: 0,
          investimentosPorMes: [],
          gastosPorFornecedorTop10: [],
        });
      }
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
  const dadosInvestimentosPorMes = (dashboardMetrics?.investimentosPorMes && Array.isArray(dashboardMetrics.investimentosPorMes))
    ? dashboardMetrics.investimentosPorMes.map((item) => ({
        mes: new Date(item.mes + '-01').toLocaleDateString('pt-BR', {
          month: 'short',
          year: 'numeric',
        }),
        valor: item.cpv || 0,
      }))
    : (resumoGeral?.investimentos?.porMes && Array.isArray(resumoGeral.investimentos.porMes))
      ? resumoGeral.investimentos.porMes.map((item) => ({
          mes: new Date(item.mes + '-01').toLocaleDateString('pt-BR', {
            month: 'short',
            year: 'numeric',
          }),
          valor: item.valor || 0,
        }))
      : [];

  // Preparar dados para gráfico de gastos por fornecedor (top 10)
  const dadosGastosFornecedor = dashboardMetrics?.gastosPorFornecedorTop10?.map((item) => ({
    nome: item.nomeFornecedor,
    total: item.valorGasto,
    quantidade: 0, // Não disponível no dashboard metrics
  })) || (resumoGeral?.gastosFornecedor && Array.isArray(resumoGeral.gastosFornecedor)
    ? resumoGeral.gastosFornecedor
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
        .map((item) => ({
          nome: item.fornecedorNome,
          total: item.total,
          quantidade: item.quantidadeCompras,
        }))
    : []);

  // Preparar dados para gráfico de pizza de gastos por fornecedor
  const dadosPizzaFornecedor = (resumoGeral?.gastosFornecedor && Array.isArray(resumoGeral.gastosFornecedor))
    ? resumoGeral.gastosFornecedor
        .sort((a, b) => b.total - a.total)
        .slice(0, 8)
        .map((item) => ({
          name: item.fornecedorNome.length > 20
            ? item.fornecedorNome.substring(0, 20) + '...'
            : item.fornecedorNome,
          value: item.total,
        }))
    : [];

  // Preparar dados para gráfico de pizza de markup por tipo
  const dadosPizzaMarkup = (resumoGeral?.markupItens?.porTipo && Array.isArray(resumoGeral.markupItens.porTipo))
    ? resumoGeral.markupItens.porTipo.map((item) => ({
        name: item.tipo.replace('_', ' '),
        value: item.markupMedio,
        quantidade: item.quantidade,
      }))
    : [];

  // Preparar dados para gráfico de pizza interativo (shadcn)
  const dadosPizzaMarkupFormatados = useMemo(() => {
    if (!dadosPizzaMarkup || !Array.isArray(dadosPizzaMarkup) || dadosPizzaMarkup.length === 0) return [];
    return dadosPizzaMarkup.map((item, index) => {
      const key = item.name.toLowerCase().replace(/\s+/g, '_');
      return {
        month: key,
        desktop: item.value,
        fill: `var(--color-${key})`,
      };
    });
  }, [dadosPizzaMarkup]);

  const chartConfigMarkup: ChartConfig = useMemo(() => {
    const config: ChartConfig = {
      visitors: {
        label: 'Visitors',
      },
      desktop: {
        label: 'Desktop',
      },
    };
    dadosPizzaMarkup.forEach((item, index) => {
      const key = item.name.toLowerCase().replace(/\s+/g, '_');
      config[key] = {
        label: item.name,
        color: COLORS[index % COLORS.length],
      };
    });
    return config;
  }, [dadosPizzaMarkup]);

  // Inicializar markup ativo
  useEffect(() => {
    if (dadosPizzaMarkupFormatados.length > 0 && !markupAtivo) {
      setMarkupAtivo(dadosPizzaMarkupFormatados[0].month);
    }
  }, [dadosPizzaMarkupFormatados, markupAtivo]);

  const activeIndexMarkup = useMemo(() => {
    if (!markupAtivo || !dadosPizzaMarkupFormatados || dadosPizzaMarkupFormatados.length === 0) {
      return -1;
    }
    return dadosPizzaMarkupFormatados.findIndex((item) => item.month === markupAtivo);
  }, [markupAtivo, dadosPizzaMarkupFormatados]);

  // Preparar dados para gráfico de linha interativo - Evolução de orçamentos por tipo de serviço
  const dadosEvolucaoOrcamentos = (resumoGeral?.evolucaoOrcamentosPorServico && Array.isArray(resumoGeral.evolucaoOrcamentosPorServico))
    ? resumoGeral.evolucaoOrcamentosPorServico
    : [];
  
  // Obter todos os tipos de serviço únicos para o gráfico interativo
  const tiposServico = useMemo(() => {
    if (!dadosEvolucaoOrcamentos || !Array.isArray(dadosEvolucaoOrcamentos) || !dadosEvolucaoOrcamentos.length) return [];
    const servicos = new Set<string>();
    dadosEvolucaoOrcamentos.forEach((item) => {
      if (item && typeof item === 'object') {
        Object.keys(item).forEach((key) => {
          if (key !== 'data') {
            servicos.add(key);
          }
        });
      }
    });
    return Array.from(servicos);
  }, [dadosEvolucaoOrcamentos]);

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
    const dados = (resumoGeral?.orcamentosPorTipoMensal && Array.isArray(resumoGeral.orcamentosPorTipoMensal))
      ? resumoGeral.orcamentosPorTipoMensal
      : [];
    return dados.map((item) => ({
      month: new Date(item.mes + '-01').toLocaleDateString('pt-BR', {
        month: 'short',
        year: 'numeric',
      }),
      mes: item.mes,
      quadros: item.quadros || 0,
      servicos: item.servicos || 0,
    }));
  }, [resumoGeral]);

  // Configuração do gráfico de barras múltiplas (shadcn)
  const chartConfigQuadrosServicos: ChartConfig = {
    quadros: {
      label: 'Quadros',
      color: '#6366F1', // indigo-500
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
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <TrendingUp className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm font-medium">Nenhum dado disponível</p>
                <p className="text-xs mt-1">Selecione outro período ou verifique se há investimentos registrados</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={dadosInvestimentosPorMes}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="mes" 
                    tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 11 }}
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                    tickLine={false}
                    axisLine={false}
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
                    formatter={(value: number) => [
                      formatarMoeda(value),
                      'CPV'
                    ]}
                    labelFormatter={(label) => `Mês: ${label}`}
                    contentStyle={{
                      backgroundColor: isDark ? '#1E293B' : '#fff',
                      border: (isDark ? '1px solid #334155' : '1px solid #e5e7eb'),
                      borderRadius: '8px',
                      color: isDark ? '#F8FAFC' : '#111827',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    labelStyle={{ 
                      color: isDark ? '#CBD5E1' : '#6b7280',
                      fontWeight: 'bold',
                      marginBottom: '4px'
                    }}
                  />
                  <Bar 
                    dataKey="valor" 
                    fill="#6366F1" 
                    name="CPV"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
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
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <PieChartIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm font-medium">Nenhum dado disponível</p>
                <p className="text-xs mt-1">Selecione outro período ou verifique se há compras registradas</p>
              </div>
            ) : dadosPizzaFornecedor.length === 1 ? (
              <div className="flex flex-col items-center justify-center h-[300px]">
                <div className="text-center mb-4">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4 mx-auto" style={{ backgroundColor: COLORS[0] + '20' }}>
                    <Package className="w-12 h-12" style={{ color: COLORS[0] }} />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-1">
                    {dadosPizzaFornecedor[0].name}
                  </h4>
                  <p className="text-3xl font-bold mb-2" style={{ color: COLORS[0] }}>
                    {formatarMoeda(dadosPizzaFornecedor[0].value)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                    100% dos gastos no período
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={dadosPizzaFornecedor}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                        outerRadius={100}
                        innerRadius={40}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {dadosPizzaFornecedor.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            stroke={isDark ? '#1E293B' : '#fff'}
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string, props: any) => [
                          formatarMoeda(value),
                          props.payload.name
                        ]}
                        contentStyle={{
                          backgroundColor: isDark ? '#1E293B' : '#fff',
                          border: (isDark ? '1px solid #334155' : '1px solid #e5e7eb'),
                          borderRadius: '8px',
                          color: isDark ? '#F8FAFC' : '#111827',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                        labelStyle={{ 
                          color: isDark ? '#CBD5E1' : '#6b7280',
                          fontWeight: 'bold',
                          marginBottom: '4px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="lg:w-64 space-y-2">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-3">Fornecedores</h4>
                  {dadosPizzaFornecedor.map((entry, index) => {
                    const percent = (entry.value / dadosPizzaFornecedor.reduce((sum, e) => sum + e.value, 0)) * 100;
                    return (
                      <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-dark-text truncate">
                            {entry.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ 
                                  width: `${percent}%`,
                                  backgroundColor: COLORS[index % COLORS.length]
                                }}
                              />
                            </div>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                              {percent.toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            {formatarMoeda(entry.value)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <BarChart3 className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm font-medium">Nenhum dado disponível</p>
                <p className="text-xs mt-1">Selecione outro período ou verifique se há compras registradas</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(300, dadosGastosFornecedor.length * 40)}>
                <BarChart 
                  data={dadosGastosFornecedor} 
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
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
                    tickFormatter={(value) => {
                      if (value >= 1000000) return 'R$ ' + (value / 1000000).toFixed(1) + 'M';
                      if (value >= 1000) return 'R$ ' + (value / 1000).toFixed(1) + 'k';
                      return 'R$ ' + value.toFixed(0);
                    }}
                  />
                  <YAxis
                    dataKey="nome"
                    type="category"
                    width={Math.min(200, Math.max(120, dadosGastosFornecedor.reduce((max, item) => Math.max(max, item.nome.length), 0) * 7))}
                    tick={{ fontSize: 11, fill: isDark ? '#CBD5E1' : '#6b7280' }}
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                    tickFormatter={(value) => {
                      if (value.length > 25) return value.substring(0, 25) + '...';
                      return value;
                    }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      formatarMoeda(value),
                      'Total Gasto'
                    ]}
                    labelFormatter={(label) => `Fornecedor: ${label}`}
                    contentStyle={{
                      backgroundColor: isDark ? '#1E293B' : '#fff',
                      border: (isDark ? '1px solid #334155' : '1px solid #e5e7eb'),
                      borderRadius: '8px',
                      color: isDark ? '#F8FAFC' : '#111827',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    labelStyle={{ 
                      color: isDark ? '#CBD5E1' : '#6b7280',
                      fontWeight: 'bold',
                      marginBottom: '4px'
                    }}
                  />
                  <Bar 
                    dataKey="total" 
                    fill="#10B981"
                    name="Total Gasto"
                    radius={[0, 8, 8, 0]}
                  >
                    {dadosGastosFornecedor.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico de Barras Múltiplas - Comparação Quadros vs Serviços (shadcn) */}
        <Card data-chart="quadros-servicos">
          <ChartStyle id="quadros-servicos" config={chartConfigQuadrosServicos} />
          <CardHeader>
            <CardTitle>Comparação: Quadros vs Serviços</CardTitle>
            <CardDescription>Valor de orçamentos por tipo no período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            {dadosQuadrosServicos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <BarChart3 className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm font-medium">Nenhum dado disponível</p>
                <p className="text-xs mt-1">Selecione outro período ou verifique se há orçamentos registrados</p>
              </div>
            ) : (
              <ChartContainer config={chartConfigQuadrosServicos}>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart accessibilityLayer data={dadosQuadrosServicos}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <YAxis
                      tickFormatter={(value) => {
                        if (value >= 1000000) return 'R$ ' + (value / 1000000).toFixed(1) + 'M';
                        if (value >= 1000) return 'R$ ' + (value / 1000).toFixed(1) + 'k';
                        return 'R$ ' + value.toFixed(0);
                      }}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dashed" />}
                    />
                    <Bar dataKey="quadros" fill="var(--color-quadros)" radius={4} />
                    <Bar dataKey="servicos" fill="var(--color-servicos)" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <div className="flex gap-2 leading-none font-medium">
              Comparação mensal de orçamentos por tipo <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground leading-none">
              Valores totais de orçamentos com itens de quadros e serviços
            </div>
          </CardFooter>
        </Card>

        {/* Gráfico de Pizza Interativo - Markup por Tipo (shadcn) */}
        {dadosPizzaMarkupFormatados && dadosPizzaMarkupFormatados.length > 0 ? (
          <Card data-chart="markup-pie" className="flex flex-col">
            <ChartStyle id="markup-pie" config={chartConfigMarkup} />
            <CardHeader className="flex-row items-start space-y-0 pb-0">
              <div className="grid gap-1">
                <CardTitle>Markup Médio por Tipo de Item</CardTitle>
                <CardDescription>Percentual de lucro por categoria</CardDescription>
              </div>
              {markupAtivo && (
                <Select value={markupAtivo} onValueChange={setMarkupAtivo}>
                  <SelectTrigger
                    className="ml-auto h-7 w-[130px] rounded-lg pl-2.5"
                    aria-label="Selecione um tipo"
                  >
                    <SelectValue placeholder="Selecione tipo" />
                  </SelectTrigger>
                  <SelectContent align="end" className="rounded-xl">
                    {dadosPizzaMarkupFormatados.map((item) => {
                      const config = chartConfigMarkup[item.month as keyof typeof chartConfigMarkup];
                      if (!config) return null;
                      return (
                        <SelectItem
                          key={item.month}
                          value={item.month}
                          className="rounded-lg [&_span]:flex"
                        >
                          <div className="flex items-center gap-2 text-xs">
                            <span
                              className="flex h-3 w-3 shrink-0 rounded-xs"
                              style={{
                                backgroundColor: `var(--color-${item.month})`,
                              }}
                            />
                            {config?.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </CardHeader>
            <CardContent className="flex flex-1 justify-center pb-0">
              <ChartContainer
                id="markup-pie"
                config={chartConfigMarkup}
                className="mx-auto aspect-square w-full max-w-[300px]"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                      data={dadosPizzaMarkupFormatados}
                      dataKey="desktop"
                      nameKey="month"
                      innerRadius={60}
                      strokeWidth={5}
                      activeIndex={activeIndexMarkup >= 0 ? activeIndexMarkup : undefined}
                      activeShape={(props: any) => {
                        const outerRadius = props.outerRadius || 0;
                        return (
                          <g>
                            <Sector {...props} outerRadius={outerRadius + 10} />
                            <Sector
                              {...props}
                              outerRadius={outerRadius + 25}
                              innerRadius={outerRadius + 12}
                            />
                          </g>
                        );
                      }}
                    >
                      <Label
                        content={({ viewBox }: any) => {
                          try {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox && activeIndexMarkup >= 0 && activeIndexMarkup < dadosPizzaMarkupFormatados.length && dadosPizzaMarkupFormatados[activeIndexMarkup]) {
                              const activeData = dadosPizzaMarkupFormatados[activeIndexMarkup];
                              return (
                                <text
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                >
                                  <tspan
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    className="fill-foreground text-3xl font-bold"
                                  >
                                    {activeData.desktop.toFixed(2)}%
                                  </tspan>
                                  <tspan
                                    x={viewBox.cx}
                                    y={(viewBox.cy || 0) + 24}
                                    className="fill-muted-foreground"
                                  >
                                    {chartConfigMarkup[activeData.month as keyof typeof chartConfigMarkup]?.label || 'Markup'}
                                  </tspan>
                                </text>
                              );
                            }
                          } catch (error) {
                            console.error('Erro ao renderizar label do gráfico de markup:', error);
                          }
                          return null;
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Markup Médio por Tipo de Item</CardTitle>
              <CardDescription>Percentual de lucro por categoria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <PieChartIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm font-medium">Nenhum dado disponível</p>
                <p className="text-xs mt-1">Selecione outro período ou verifique se há itens com markup registrado</p>
              </div>
            </CardContent>
          </Card>
        )}
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
          {tiposServico.length === 0 || dadosEvolucaoOrcamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <Activity className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm font-medium">Nenhum dado disponível</p>
              <p className="text-xs mt-1">Selecione outro período ou verifique se há orçamentos registrados</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart
                data={dadosEvolucaoOrcamentos}
                margin={{
                  left: 20,
                  right: 30,
                  top: 20,
                  bottom: 20,
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
                  formatter={(value: number, name: string) => [
                    formatarMoeda(value),
                    name
                  ]}
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString('pt-BR', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                  }}
                  contentStyle={{
                    backgroundColor: isDark ? '#1E293B' : '#fff',
                    border: (isDark ? '1px solid #334155' : '1px solid #e5e7eb'),
                    borderRadius: '8px',
                    color: isDark ? '#F8FAFC' : '#111827',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  labelStyle={{ 
                    color: isDark ? '#CBD5E1' : '#6b7280',
                    fontWeight: 'bold',
                    marginBottom: '4px'
                  }}
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
                {(resumoGeral?.markupItens?.porTipo && Array.isArray(resumoGeral.markupItens.porTipo))
                  ? resumoGeral.markupItens.porTipo.map((item, index) => (
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
                    ))
                  : (
                      <tr>
                        <td colSpan={3} className="p-3 text-center text-gray-500 dark:text-gray-400">
                          Nenhum dado disponível
                        </td>
                      </tr>
                    )}
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
            {Object.keys(resumoGeral.gastosFixos.porCategoria).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-gray-500 dark:text-gray-400 mb-6">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-xs font-medium">Nenhuma categoria registrada</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {Object.entries(resumoGeral.gastosFixos.porCategoria).map(([categoria, valor]) => (
                  <div
                    key={categoria}
                    className="p-4 border-2 border-gray-200 dark:border-dark-border rounded-xl bg-gradient-to-br from-white to-gray-50 dark:from-slate-800/30 dark:to-slate-800/50 hover:from-amber-50 hover:to-amber-100 dark:hover:from-amber-900/20 dark:hover:to-amber-800/20 transition-all shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700"
                  >
                    <p className="text-xs font-semibold text-gray-600 dark:text-dark-text-secondary mb-2 uppercase tracking-wide">
                      {categoria}
                    </p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {formatarMoeda(valor)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                      Mensal
                    </p>
                  </div>
                ))}
              </div>
            )}
            {resumoGeral.gastosFixos.evolucaoMensal.length > 0 ? (
              <div>
                <h4 className="text-sm font-semibold mb-4 text-gray-700 dark:text-dark-text">
                  Evolução Mensal
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart 
                    data={resumoGeral.gastosFixos.evolucaoMensal}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      vertical={false}
                      stroke={isDark ? '#334155' : '#e5e7eb'} 
                    />
                    <XAxis
                      dataKey="mes"
                      tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 11 }}
                      stroke={isDark ? '#334155' : '#e5e7eb'}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => {
                        const date = new Date(value + '-01');
                        return date.toLocaleDateString('pt-BR', {
                          month: 'short',
                        });
                      }}
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
                      formatter={(value: number) => [
                        formatarMoeda(value),
                        'Gastos Fixos'
                      ]}
                      labelFormatter={(label) => `Mês: ${label}`}
                      contentStyle={{
                        backgroundColor: isDark ? '#1E293B' : '#fff',
                        border: (isDark ? '1px solid #334155' : '1px solid #e5e7eb'),
                        borderRadius: '8px',
                        color: isDark ? '#F8FAFC' : '#111827',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                      labelStyle={{ 
                        color: isDark ? '#CBD5E1' : '#6b7280',
                        fontWeight: 'bold',
                        marginBottom: '4px'
                      }}
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
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-gray-500 dark:text-gray-400">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-xs font-medium">Nenhuma evolução registrada</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BIDashboard;

