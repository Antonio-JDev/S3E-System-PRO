import React, { useState, useEffect, useContext } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { biService, type ResumoGeral } from '../services/biService';
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
  const [exportando, setExportando] = useState<boolean>(false);

  const themeContext = useContext(ThemeContext);
  const isDark =
    themeContext?.theme === 'dark' ||
    (themeContext?.theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Cores para gráficos
  const COLORS = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16', // lime
  ];

  // Carregar dados
  const carregarDados = async () => {
    try {
      setLoading(true);
      const resultado = await biService.getResumoGeral(dataInicio, dataFim);

      if (resultado.success && resultado.data) {
        setResumoGeral(resultado.data);
      } else {
        toast.error(resultado.error || 'Erro ao carregar dados');
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

  // Preparar dados para gráfico de investimentos por mês
  const dadosInvestimentosPorMes = resumoGeral?.investimentos.porMes.map((item) => ({
    mes: new Date(item.mes + '-01').toLocaleDateString('pt-BR', {
      month: 'short',
      year: 'numeric',
    }),
    valor: item.valor,
  })) || [];

  // Preparar dados para gráfico de gastos por fornecedor (top 10)
  const dadosGastosFornecedor = resumoGeral?.gastosFornecedor
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" id="bi-dashboard-content">
      {/* Header com seletor de período e botão de exportar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Business Intelligence
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Análise de investimentos, gastos, custos e lucros
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2">
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Data Início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Data Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>
          </div>
          <Button
            onClick={exportarParaPDF}
            disabled={exportando}
            className="mt-6 sm:mt-0"
          >
            <Download className="w-4 h-4 mr-2" />
            {exportando ? 'Exportando...' : 'Exportar PDF'}
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investimentos em Produtos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatarMoeda(resumoGeral?.investimentos.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total no período selecionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custos de Quadros</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatarMoeda(resumoGeral?.custosQuadros.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {resumoGeral?.custosQuadros.quantidade || 0} quadros • Média:{' '}
              {formatarMoeda(resumoGeral?.custosQuadros.media || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucros de Quadros</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatarMoeda(resumoGeral?.lucrosQuadros.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Margem média: {formatarPercentual(resumoGeral?.lucrosQuadros.margemMedia || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {resumoGeral?.vendas.quantidade || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {formatarMoeda(resumoGeral?.vendas.valorTotal || 0)} • Média:{' '}
              {formatarMoeda(resumoGeral?.vendas.media || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras - Investimentos por Mês */}
        <Card>
          <CardHeader>
            <CardTitle>Investimentos em Produtos por Mês</CardTitle>
            <CardDescription>Evolução dos investimentos ao longo do período</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosInvestimentosPorMes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => formatarMoeda(value)}
                  contentStyle={{
                    backgroundColor: isDark ? '#1f2937' : '#fff',
                    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                  }}
                />
                <Legend />
                <Bar dataKey="valor" fill="#3B82F6" name="Investimento" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Gastos por Fornecedor */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Gastos por Fornecedor</CardTitle>
            <CardDescription>Top 8 fornecedores por volume de compras</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosPizzaFornecedor}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
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
                    backgroundColor: isDark ? '#1f2937' : '#fff',
                    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Barras - Gastos por Fornecedor */}
        <Card>
          <CardHeader>
            <CardTitle>Gastos por Fornecedor (Top 10)</CardTitle>
            <CardDescription>Fornecedores com maior volume de compras</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosGastosFornecedor} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  dataKey="nome"
                  type="category"
                  width={150}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number) => formatarMoeda(value)}
                  contentStyle={{
                    backgroundColor: isDark ? '#1f2937' : '#fff',
                    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                  }}
                />
                <Legend />
                <Bar dataKey="total" fill="#10B981" name="Total Gasto" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Markup por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Markup Médio por Tipo de Item</CardTitle>
            <CardDescription>Percentual de lucro por categoria</CardDescription>
          </CardHeader>
          <CardContent>
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
                    backgroundColor: isDark ? '#1f2937' : '#fff',
                    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Markup por Tipo */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento de Markup por Tipo</CardTitle>
          <CardDescription>Análise detalhada de margem de lucro</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Tipo</th>
                  <th className="text-right p-3 font-semibold">Markup Médio</th>
                  <th className="text-right p-3 font-semibold">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {resumoGeral?.markupItens.porTipo.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-3">{item.tipo.replace('_', ' ')}</td>
                    <td className="p-3 text-right font-semibold text-green-600">
                      {formatarPercentual(item.markupMedio)}
                    </td>
                    <td className="p-3 text-right">{item.quantidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BIDashboard;

