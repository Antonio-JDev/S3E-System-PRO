import React, { useState, useEffect, useMemo, useContext } from 'react';
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
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Package,
  Wrench,
  FileText,
  Download,
  Calendar,
  TrendingDown,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  resumoAdministrativoService,
  type ResumoAdministrativoCompleto,
  type ResumoMensal,
  type EvolucaoFinanceira,
} from '../services/biService';
import { ThemeContext } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ResumoAdministrativo: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState(() => {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return primeiroDiaMes.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });
  const [periodoEvolucao, setPeriodoEvolucao] = useState<'mensal' | '6meses' | 'anual'>('mensal');
  const [resumoCompleto, setResumoCompleto] = useState<ResumoAdministrativoCompleto | null>(null);
  const [evolucaoFinanceira, setEvolucaoFinanceira] = useState<EvolucaoFinanceira | null>(null);
  const [exportando, setExportando] = useState(false);

  const themeContext = useContext(ThemeContext);
  const isDark = themeContext?.theme === 'dark' ||
    (themeContext?.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Carregar dados
  const carregarDados = async () => {
    try {
      setLoading(true);

      const [resumoResult, evolucaoResult] = await Promise.all([
        resumoAdministrativoService.getResumoCompleto(dataInicio, dataFim),
        resumoAdministrativoService.getEvolucaoFinanceira(periodoEvolucao),
      ]);

      if (resumoResult.success && resumoResult.data) {
        setResumoCompleto(resumoResult.data);
      } else {
        toast.error(resumoResult.error || 'Erro ao carregar resumo administrativo');
      }

      if (evolucaoResult.success && evolucaoResult.data) {
        setEvolucaoFinanceira(evolucaoResult.data);
      } else {
        toast.error(evolucaoResult.error || 'Erro ao carregar evolução financeira');
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do resumo administrativo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [dataInicio, dataFim, periodoEvolucao]);

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
      const elemento = document.getElementById('resumo-administrativo-content');

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

      const nomeArquivo = `resumo-administrativo-${dataInicio}-${dataFim}.pdf`;
      pdf.save(nomeArquivo);

      toast.success('PDF exportado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setExportando(false);
    }
  };

  // Preparar dados para gráficos
  const dadosLucroMaterial = useMemo(() => {
    return (resumoCompleto?.lucroPorMaterial || []).map((item) => ({
      mes: new Date(item.mes + '-01').toLocaleDateString('pt-BR', {
        month: 'short',
        year: 'numeric',
      }),
      lucro: item.lucroTotal,
      receita: item.valorVendido,
      custo: item.custoTotal,
    }));
  }, [resumoCompleto]);

  const dadosLucroServico = useMemo(() => {
    return (resumoCompleto?.lucroPorServico || []).map((item) => ({
      mes: new Date(item.mes + '-01').toLocaleDateString('pt-BR', {
        month: 'short',
        year: 'numeric',
      }),
      lucro: item.lucroTotal,
      receita: item.valorVendido,
      custo: item.custoTotal,
    }));
  }, [resumoCompleto]);

  const dadosLucroMaoDeObra = useMemo(() => {
    return (resumoCompleto?.lucroMaoDeObra || []).map((item) => ({
      mes: new Date(item.mes + '-01').toLocaleDateString('pt-BR', {
        month: 'short',
        year: 'numeric',
      }),
      lucro: item.lucroTotal,
      receita: item.valorVendido,
      custo: item.custoTotal,
    }));
  }, [resumoCompleto]);

  const dadosResumoMensal = useMemo(() => {
    return (resumoCompleto?.resumoMensal || []).map((item) => ({
      mes: new Date(item.mes + '-01').toLocaleDateString('pt-BR', {
        month: 'short',
        year: 'numeric',
      }),
      lucroMateriais: item.lucroMateriais,
      lucroServicos: item.lucroServicos,
      lucroMaoDeObra: item.lucroMaoDeObra,
      totalBDI: item.totalBDI,
      receitaTotal: item.receitaTotal,
      custoTotal: item.custoTotal,
      lucroLiquido: item.lucroLiquido,
      margemPercentual: item.margemPercentual,
    }));
  }, [resumoCompleto]);

  const dadosEvolucaoFinanceira = useMemo(() => {
    return (evolucaoFinanceira?.dados || []).map((item) => ({
      mes: new Date(item.mes + '-01').toLocaleDateString('pt-BR', {
        month: 'short',
        year: 'numeric',
      }),
      receita: item.receitaTotal,
      custo: item.custoTotal,
      lucro: item.lucroLiquido,
      margem: item.margemPercentual,
    }));
  }, [evolucaoFinanceira]);

  // Calcular totais
  const totais = useMemo(() => {
    if (!resumoCompleto) {
      return {
        lucroMateriais: 0,
        lucroServicos: 0,
        lucroMaoDeObra: 0,
        totalBDI: 0,
        receitaTotal: 0,
        custoTotal: 0,
        lucroLiquido: 0,
      };
    }

    return {
      lucroMateriais: resumoCompleto.lucroPorMaterial.reduce((sum, item) => sum + item.lucroTotal, 0),
      lucroServicos: resumoCompleto.lucroPorServico.reduce((sum, item) => sum + item.lucroTotal, 0),
      lucroMaoDeObra: resumoCompleto.lucroMaoDeObra.reduce((sum, item) => sum + item.lucroTotal, 0),
      totalBDI: resumoCompleto.bdiPorOrcamento.reduce((sum, item) => sum + item.valorBDI, 0),
      receitaTotal: resumoCompleto.resumoMensal.reduce((sum, item) => sum + item.receitaTotal, 0),
      custoTotal: resumoCompleto.resumoMensal.reduce((sum, item) => sum + item.custoTotal, 0),
      lucroLiquido: resumoCompleto.resumoMensal.reduce((sum, item) => sum + item.lucroLiquido, 0),
    };
  }, [resumoCompleto]);

  const margemMedia = totais.receitaTotal > 0
    ? (totais.lucroLiquido / totais.receitaTotal) * 100
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-gray-50 dark:bg-dark-bg min-h-screen" id="resumo-administrativo-content">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-dark-text">
            Resumo Administrativo
          </h2>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
            Análise de lucros, BDI e evolução financeira da empresa
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
          <Button
            onClick={exportarParaPDF}
            disabled={exportando}
            className="mt-6 sm:mt-0 flex items-center justify-center"
          >
            <Download className="w-4 h-4 mr-2" />
            {exportando ? 'Exportando...' : 'Exportar PDF'}
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Lucro por Materiais */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-dark-text">
                Lucro por Materiais
              </CardTitle>
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatarMoeda(totais.lucroMateriais)}
            </div>
            <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
              {resumoCompleto?.lucroPorMaterial.length || 0} mês(es) com vendas
            </p>
          </CardContent>
        </Card>

        {/* Lucro por Serviços */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-dark-text">
                Lucro por Serviços
              </CardTitle>
              <Wrench className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatarMoeda(totais.lucroServicos)}
            </div>
            <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
              {resumoCompleto?.lucroPorServico.length || 0} mês(es) com vendas
            </p>
          </CardContent>
        </Card>

        {/* Lucro por Mão de Obra */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-dark-text">
                Lucro Mão de Obra
              </CardTitle>
              <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatarMoeda(totais.lucroMaoDeObra)}
            </div>
            <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
              Total de serviços vendidos
            </p>
          </CardContent>
        </Card>

        {/* Total BDI */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-dark-text">
                Total BDI Arrecadado
              </CardTitle>
              <DollarSign className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatarMoeda(totais.totalBDI)}
            </div>
            <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
              {resumoCompleto?.bdiPorOrcamento.length || 0} orçamento(s) vendido(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Card de Resumo Geral */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Receita Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {formatarMoeda(totais.receitaTotal)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Custo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {formatarMoeda(totais.custoTotal)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lucro Líquido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${
              totais.lucroLiquido >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {formatarMoeda(totais.lucroLiquido)}
            </div>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-2">
              Margem: {formatarPercentual(margemMedia)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Lucro por Material */}
        <Card>
          <CardHeader>
            <CardTitle>Lucro Mensal por Venda de Material</CardTitle>
            <CardDescription>
              Evolução do lucro obtido com vendas de materiais
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dadosLucroMaterial.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                <p>Nenhum dado disponível</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosLucroMaterial}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 12 }}
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                  />
                  <YAxis
                    tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 12 }}
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                    tickFormatter={(value) => {
                      if (value >= 1000) return 'R$ ' + (value / 1000).toFixed(1) + 'k';
                      return 'R$ ' + value;
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatarMoeda(value)}
                    contentStyle={{
                      backgroundColor: isDark ? '#1E293B' : '#fff',
                      border: (isDark ? '1px solid #334155' : '1px solid #e5e7eb'),
                      borderRadius: '8px',
                      color: isDark ? '#F8FAFC' : '#111827',
                    }}
                    labelStyle={{ color: isDark ? '#CBD5E1' : '#6b7280' }}
                  />
                  <Legend wrapperStyle={{ color: isDark ? '#CBD5E1' : '#6b7280' }} />
                  <Bar dataKey="lucro" fill="#10B981" name="Lucro" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Lucro por Serviço */}
        <Card>
          <CardHeader>
            <CardTitle>Lucro Mensal por Venda de Serviço</CardTitle>
            <CardDescription>
              Evolução do lucro obtido com vendas de serviços
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dadosLucroServico.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                <p>Nenhum dado disponível</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosLucroServico}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 12 }}
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                  />
                  <YAxis
                    tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 12 }}
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                    tickFormatter={(value) => {
                      if (value >= 1000) return 'R$ ' + (value / 1000).toFixed(1) + 'k';
                      return 'R$ ' + value;
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatarMoeda(value)}
                    contentStyle={{
                      backgroundColor: isDark ? '#1E293B' : '#fff',
                      border: (isDark ? '1px solid #334155' : '1px solid #e5e7eb'),
                      borderRadius: '8px',
                      color: isDark ? '#F8FAFC' : '#111827',
                    }}
                    labelStyle={{ color: isDark ? '#CBD5E1' : '#6b7280' }}
                  />
                  <Legend wrapperStyle={{ color: isDark ? '#CBD5E1' : '#6b7280' }} />
                  <Bar dataKey="lucro" fill="#8B5CF6" name="Lucro" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Lucro por Mão de Obra */}
        <Card>
          <CardHeader>
            <CardTitle>Lucro Mensal por Mão de Obra</CardTitle>
            <CardDescription>
              Evolução do lucro obtido com serviços de mão de obra
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dadosLucroMaoDeObra.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                <p>Nenhum dado disponível</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosLucroMaoDeObra}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 12 }}
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                  />
                  <YAxis
                    tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 12 }}
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                    tickFormatter={(value) => {
                      if (value >= 1000) return 'R$ ' + (value / 1000).toFixed(1) + 'k';
                      return 'R$ ' + value;
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatarMoeda(value)}
                    contentStyle={{
                      backgroundColor: isDark ? '#1E293B' : '#fff',
                      border: (isDark ? '1px solid #334155' : '1px solid #e5e7eb'),
                      borderRadius: '8px',
                      color: isDark ? '#F8FAFC' : '#111827',
                    }}
                    labelStyle={{ color: isDark ? '#CBD5E1' : '#6b7280' }}
                  />
                  <Legend wrapperStyle={{ color: isDark ? '#CBD5E1' : '#6b7280' }} />
                  <Bar dataKey="lucro" fill="#F59E0B" name="Lucro" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Resumo Mensal Consolidado */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo Mensal Consolidado</CardTitle>
            <CardDescription>
              Comparação de lucros por categoria mensalmente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dadosResumoMensal.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                <p>Nenhum dado disponível</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosResumoMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 12 }}
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                  />
                  <YAxis
                    tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 12 }}
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                    tickFormatter={(value) => {
                      if (value >= 1000) return 'R$ ' + (value / 1000).toFixed(1) + 'k';
                      return 'R$ ' + value;
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatarMoeda(value)}
                    contentStyle={{
                      backgroundColor: isDark ? '#1E293B' : '#fff',
                      border: (isDark ? '1px solid #334155' : '1px solid #e5e7eb'),
                      borderRadius: '8px',
                      color: isDark ? '#F8FAFC' : '#111827',
                    }}
                    labelStyle={{ color: isDark ? '#CBD5E1' : '#6b7280' }}
                  />
                  <Legend wrapperStyle={{ color: isDark ? '#CBD5E1' : '#6b7280' }} />
                  <Bar dataKey="lucroMateriais" fill="#10B981" name="Lucro Materiais" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lucroServicos" fill="#8B5CF6" name="Lucro Serviços" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lucroMaoDeObra" fill="#F59E0B" name="Lucro Mão de Obra" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalBDI" fill="#6366F1" name="Total BDI" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Evolução Financeira */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Evolução Financeira da Empresa</CardTitle>
              <CardDescription>
                Receita, custos e lucro ao longo do tempo
              </CardDescription>
            </div>
            <Select value={periodoEvolucao} onValueChange={(v: any) => setPeriodoEvolucao(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="6meses">6 Meses</SelectItem>
                <SelectItem value="anual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {dadosEvolucaoFinanceira.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
              <p>Nenhum dado disponível</p>
            </div>
          ) : (
            <>
              {/* Métricas do Período */}
              {evolucaoFinanceira && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Receita Total</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatarMoeda(evolucaoFinanceira.totalReceita)}
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Custo Total</p>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">
                      {formatarMoeda(evolucaoFinanceira.totalCusto)}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Lucro Total</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {formatarMoeda(evolucaoFinanceira.totalLucro)}
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Margem Média</p>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {formatarPercentual(evolucaoFinanceira.margemMedia)}
                    </p>
                  </div>
                </div>
              )}

              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dadosEvolucaoFinanceira}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 12 }}
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                  />
                  <YAxis
                    tick={{ fill: isDark ? '#CBD5E1' : '#6b7280', fontSize: 12 }}
                    stroke={isDark ? '#334155' : '#e5e7eb'}
                    tickFormatter={(value) => {
                      if (value >= 1000) return 'R$ ' + (value / 1000).toFixed(1) + 'k';
                      return 'R$ ' + value;
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatarMoeda(value)}
                    contentStyle={{
                      backgroundColor: isDark ? '#1E293B' : '#fff',
                      border: (isDark ? '1px solid #334155' : '1px solid #e5e7eb'),
                      borderRadius: '8px',
                      color: isDark ? '#F8FAFC' : '#111827',
                    }}
                    labelStyle={{ color: isDark ? '#CBD5E1' : '#6b7280' }}
                  />
                  <Legend wrapperStyle={{ color: isDark ? '#CBD5E1' : '#6b7280' }} />
                  <Line
                    type="monotone"
                    dataKey="receita"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Receita"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="custo"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name="Custo"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="lucro"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    name="Lucro"
                    dot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tabela de BDI por Orçamento */}
      <Card>
        <CardHeader>
          <CardTitle>BDI Arrecadado por Orçamento</CardTitle>
          <CardDescription>
            Detalhamento do BDI arrecadado em cada venda realizada
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resumoCompleto?.bdiPorOrcamento.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>Nenhum orçamento vendido no período selecionado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-slate-800/50">
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-dark-text">Orçamento</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-dark-text">Cliente</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-dark-text">Data Venda</th>
                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-dark-text">Valor Total</th>
                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-dark-text">BDI (%)</th>
                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-dark-text">Valor BDI</th>
                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-dark-text">Custo Total</th>
                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-dark-text">Lucro</th>
                  </tr>
                </thead>
                <tbody>
                  {resumoCompleto?.bdiPorOrcamento.map((item) => (
                    <tr
                      key={item.orcamentoId}
                      className="border-b border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-3 text-gray-900 dark:text-dark-text font-medium">
                        #{item.numeroSequencial}
                      </td>
                      <td className="p-3 text-gray-900 dark:text-dark-text">
                        {item.clienteNome}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-dark-text-secondary">
                        {new Date(item.dataVenda).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-3 text-right font-semibold text-gray-900 dark:text-dark-text">
                        {formatarMoeda(item.valorTotal)}
                      </td>
                      <td className="p-3 text-right text-gray-600 dark:text-dark-text-secondary">
                        {formatarPercentual(item.bdiPercentual)}
                      </td>
                      <td className="p-3 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                        {formatarMoeda(item.valorBDI)}
                      </td>
                      <td className="p-3 text-right text-gray-600 dark:text-dark-text-secondary">
                        {formatarMoeda(item.custoTotal)}
                      </td>
                      <td className="p-3 text-right font-semibold text-green-600 dark:text-green-400">
                        {formatarMoeda(item.lucroTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-slate-800/50 font-semibold">
                    <td colSpan={5} className="p-3 text-right text-gray-700 dark:text-dark-text">
                      Total:
                    </td>
                    <td className="p-3 text-right text-indigo-600 dark:text-indigo-400">
                      {formatarMoeda(totais.totalBDI)}
                    </td>
                    <td className="p-3 text-right text-gray-600 dark:text-dark-text-secondary">
                      {formatarMoeda(
                        resumoCompleto?.bdiPorOrcamento.reduce((sum, item) => sum + item.custoTotal, 0) || 0
                      )}
                    </td>
                    <td className="p-3 text-right text-green-600 dark:text-green-400">
                      {formatarMoeda(
                        resumoCompleto?.bdiPorOrcamento.reduce((sum, item) => sum + item.lucroTotal, 0) || 0
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResumoAdministrativo;
