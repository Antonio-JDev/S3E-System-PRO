import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  AlertTriangle,
  Building2,
  Zap,
  Download,
  FileText,
  Star,
  X,
  LayoutGrid,
  ClipboardList,
  Table2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  dashboardService,
  type DashboardCardsMetricas,
  type DashboardCompleto,
} from '../services/dashboardService';
import { fornecedoresService, type Fornecedor } from '../services/fornecedoresService';
import { ThemeContext } from '../contexts/ThemeContext';
import { CHART_ACCENT, CHART_SERIES_COLORS, getChartTheme, chartTooltipStyle } from '../styles/chartTheme';
import { useAuth } from '../hooks/useAuth';

interface DashboardModernoProps {
  toggleSidebar: () => void;
  onNavigate: (view: string) => void;
}

// Tipos para os dados
interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  trend: 'up' | 'down';
  hint?: string;
}

const DashboardModerno: React.FC<DashboardModernoProps> = ({ toggleSidebar, onNavigate }) => {
  const [dashboardData, setDashboardData] = useState<DashboardCompleto | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'semester' | 'annual'>('monthly');
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [quadrosData, setQuadrosData] = useState<any[]>([]);
  const [graficosExec, setGraficosExec] = useState<{
    evolucaoOrcamentos: any[];
    evolucaoOrdensServico: any[];
    evolucaoObrasKanban: any[];
    evolucaoPedidosVendas: any[];
    comparativoMensal: any[];
    categoriasVendas: { name: string; value: number }[];
  } | null>(null);
  const [pieActiveIndex, setPieActiveIndex] = useState(0);
  const [piePedidosActiveIndex, setPiePedidosActiveIndex] = useState(0);
  const [materiaisCriticos, setMateriaisCriticos] = useState<any[]>([]);
  const [exportando, setExportando] = useState(false);
  const [filtroEstoque, setFiltroEstoque] = useState<'todos' | 'criticos' | 'abaixo-minimo'>('todos');
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>('todos');
  const [cardsMetricas, setCardsMetricas] = useState<DashboardCardsMetricas | null>(null);
  const [kpiModalOpen, setKpiModalOpen] = useState(false);
  const [kpiModalLoading, setKpiModalLoading] = useState(false);
  const [kpiModalData, setKpiModalData] = useState<{
    titulo?: string;
    bucket?: string;
    legenda?: Array<{ kpi: string; significado: string; termoPaginaOs: string }>;
    resumo?: Record<string, number>;
    linhas?: Array<Record<string, string | number>>;
    nota?: string;
  } | null>(null);
  const [kpiModalBucket, setKpiModalBucket] = useState('');
  
  // Detectar tema efetivo (igual ao que o ThemeContext aplica no <html>)
  const themeContext = useContext(ThemeContext);
  const isDark = themeContext?.effectiveTheme === 'dark';
  const ct = getChartTheme(!!isDark);
  
  // Pegar usuário logado
  const { user } = useAuth();
  const userName = user?.name?.split(' ')[0] || 'Usuário';

  // Carregar dados do dashboard
  const loadCardsMetricas = async () => {
    try {
      const result = await dashboardService.getCardsMetricas();
      if (result.success && result.data) {
        setCardsMetricas(result.data);
      }
    } catch (err) {
      console.error('Erro ao carregar métricas dos cards:', err);
    }
  };

  const abrirDetalheKpis = async (grafico: string, bucket?: string) => {
    setKpiModalOpen(true);
    setKpiModalLoading(true);
    setKpiModalBucket(bucket || '');
    setKpiModalData(null);
    try {
      const periodoApi =
        selectedPeriod === 'annual' ? 'annual' : selectedPeriod === 'semester' ? 'semester' : 'monthly';
      const result = await dashboardService.getDetalheKpis({
        grafico,
        periodo: periodoApi,
        bucket,
      });
      if (result.success && result.data) {
        setKpiModalData(result.data as typeof kpiModalData);
      }
    } catch (err) {
      console.error('Erro ao abrir detalhe KPIs:', err);
    } finally {
      setKpiModalLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Carregar dados principais
      const result = await dashboardService.getDashboardCompleto();
      
      if (result.success && result.data) {
        setDashboardData(result.data);
      }
      
      setLastUpdate(new Date().toLocaleString('pt-BR', { 
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }));
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGraficosExec = async (periodo: 'monthly' | 'semester' | 'annual') => {
    try {
      const result = await dashboardService.getGraficosExecutivo(periodo);
      if (result.success && result.data) {
        setGraficosExec({
          evolucaoOrcamentos: result.data.evolucaoOrcamentos || [],
          evolucaoOrdensServico: result.data.evolucaoOrdensServico || [],
          evolucaoObrasKanban: result.data.evolucaoObrasKanban || [],
          evolucaoPedidosVendas: result.data.evolucaoPedidosVendas || [],
          comparativoMensal: result.data.comparativoMensal || [],
          categoriasVendas: result.data.categoriasVendas || []
        });
      }
    } catch (err) {
      console.error('Erro ao carregar gráficos executivo:', err);
    }
  };

  // Carregar produção de quadros (apenas para o card de estatísticas)
  const loadQuadrosData = async (periodo: 'daily' | 'weekly' | 'monthly') => {
    try {
      const result = await dashboardService.getProducaoQuadros(periodo);
      if (result.success && result.data) {
        setQuadrosData(result.data);
      }
    } catch (err) {
      console.error('Erro ao carregar produção de quadros:', err);
    }
  };

  // Carregar materiais com estoque crítico
  const loadMateriaisCriticos = async () => {
    try {
      const alertasResult = await dashboardService.getAlertas();
      if (alertasResult.success && alertasResult.data?.estoqueBaixo?.itens) {
        const materiais = alertasResult.data.estoqueBaixo.itens;
        console.log('📦 Materiais críticos carregados:', materiais.length);
        if (materiais.length > 0) {
          console.log('📊 Exemplo de estrutura do material:', materiais[0]);
        }
        setMateriaisCriticos(materiais);
      } else {
        // Fallback: buscar materiais e filtrar
        const materiaisResult = await dashboardService.getMateriais();
        if (materiaisResult.success && materiaisResult.data) {
          const criticos = materiaisResult.data.filter((material: any) => {
            const estoque = material.estoque || material.stock || 0;
            const estoqueMinimo = material.estoqueMinimo || material.minStock || 5;
            return estoque <= estoqueMinimo;
          });
          console.log('📦 Materiais críticos (fallback):', criticos.length);
          if (criticos.length > 0) {
            console.log('📊 Exemplo de estrutura do material:', criticos[0]);
          }
          setMateriaisCriticos(criticos);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar materiais críticos:', err);
    }
  };

  // Carregar fornecedores
  const loadFornecedores = async () => {
    try {
      const result = await fornecedoresService.listar();
      if (result.success && result.data) {
        // Filtrar apenas fornecedores ativos
        const fornecedoresAtivos = result.data.filter((f: Fornecedor) => f.ativo);
        setFornecedores(fornecedoresAtivos);
      }
    } catch (err) {
      console.error('Erro ao carregar fornecedores:', err);
    }
  };

  // Exportar dados
  const handleExportarDados = async () => {
    try {
      setExportando(true);
      
      // Criar dados para exportação usando dados já carregados
      const dadosParaExportar = {
        timestamp: new Date().toISOString(),
        dataGeracao: new Date().toLocaleString('pt-BR'),
        geradoPor: user?.name || 'Usuário',
        
        // Estatísticas
        estatisticas: {
          obrasAtivas: dashboardData?.estatisticas?.projetos?.ativos || 0,
          equipesAtivas: dashboardData?.estatisticas?.equipes?.ativas || 0,
          quadrosProduzidos: quadrosData.reduce((sum, item) => sum + (item.producao || 0), 0),
          clientesAtivos: dashboardData?.estatisticas?.clientes?.ativos || 0,
          fornecedores: dashboardData?.estatisticas?.fornecedores?.ativos || 0,
          vendasMes: dashboardData?.estatisticas?.vendas?.mesAtual || 0,
          materiaisBaixo: dashboardData?.estatisticas?.estoque?.materiaisBaixo || 0,
        },
        
        // Evolução de obras
        graficosExecutivo: graficosExec,
        
        producaoQuadros: {
          periodo: 'monthly',
          dados: quadrosData
        },
        
        // Materiais
        materiais: dashboardData?.materiais || [],
        
        // Projetos
        projetos: dashboardData?.projetos || [],
        
        // Sistema
        sistema: {
          versao: '1.0.0',
          empresa: 'S3E Engenharia',
          tipo: 'Dashboard Executivo'
        }
      };
      
      // Criar arquivo JSON para download
      const dataStr = JSON.stringify(dadosParaExportar, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dashboard-s3e-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('✅ Dados exportados com sucesso!');
    } catch (err) {
      console.error('Erro ao exportar:', err);
      alert('❌ Erro ao exportar dados. Tente novamente.');
    } finally {
      setExportando(false);
    }
  };

  // Filtrar materiais críticos (usando useMemo para recalcular quando dependências mudarem)
  const materiaisFiltrados = useMemo(() => {
    // Se não há materiais críticos, retornar array vazio
    if (!materiaisCriticos || materiaisCriticos.length === 0) {
      return [];
    }
    
    let resultado = [...materiaisCriticos]; // Criar cópia para não mutar o array original
    
    // Filtrar por nível de estoque
    if (filtroEstoque === 'criticos') {
      resultado = resultado.filter((material: any) => {
        const estoque = material.estoque || material.stock || 0;
        return estoque === 0;
      });
    } else if (filtroEstoque === 'abaixo-minimo') {
      resultado = resultado.filter((material: any) => {
        const estoque = material.estoque || material.stock || 0;
        const estoqueMinimo = material.estoqueMinimo || material.minStock || 5;
        return estoque > 0 && estoque <= estoqueMinimo;
      });
    }
    
    // Filtrar por fornecedor
    if (filtroFornecedor !== 'todos') {
      resultado = resultado.filter((material: any) => {
        // Suportar tanto fornecedorId direto quanto fornecedor.id (objetos aninhados)
        const fornecedorIdMaterial = material.fornecedorId || material.fornecedor?.id;
        
        // Se o material não tem fornecedor, não deve aparecer quando filtrado por fornecedor específico
        if (!fornecedorIdMaterial) {
          return false;
        }
        
        // Normalizar IDs para string para comparação correta (evita problemas de tipo)
        const fornecedorIdMaterialStr = String(fornecedorIdMaterial).trim();
        const filtroFornecedorStr = String(filtroFornecedor).trim();
        
        return fornecedorIdMaterialStr === filtroFornecedorStr;
      });
    }
    
    return resultado;
  }, [materiaisCriticos, filtroEstoque, filtroFornecedor]);

  // Gerar PDF para cotação com fornecedor
  const handleGerarPDFCotacao = () => {
    try {
      // Usar materiaisFiltrados já calculado pelo useMemo
      if (materiaisFiltrados.length === 0) {
        alert('⚠️ Não há materiais para gerar a cotação.');
        return;
      }

      const cotacaoWindow = window.open('', '_blank');
      
      if (!cotacaoWindow) {
        alert('❌ Bloqueador de pop-ups ativado. Permita pop-ups para gerar o PDF.');
        return;
      }
      
      const dataAtual = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      // Buscar nome do fornecedor se filtrado
      const fornecedorSelecionado = filtroFornecedor !== 'todos' 
        ? fornecedores.find(f => f.id === filtroFornecedor) 
        : null;
      
      const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Solicitação de Cotação - S3E Engenharia</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              padding: 40px;
              background: #fff;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 3px solid #DC2626;
            }
            .header h1 {
              color: #DC2626;
              font-size: 28px;
              margin-bottom: 10px;
              font-weight: bold;
            }
            .header h2 {
              color: #666;
              font-size: 18px;
              font-weight: normal;
            }
            .info-section {
              margin-bottom: 30px;
              padding: 20px;
              background: #FEF2F2;
              border-left: 4px solid #DC2626;
              border-radius: 4px;
            }
            .info-section p {
              margin-bottom: 8px;
              line-height: 1.6;
            }
            .info-section strong {
              color: #991B1B;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              margin-bottom: 30px;
            }
            table th, table td {
              padding: 12px;
              text-align: left;
              border: 1px solid #E5E7EB;
            }
            table th {
              background: #DC2626;
              color: white;
              font-weight: 600;
              text-align: center;
            }
            table td {
              background: #fff;
            }
            table tr:nth-child(even) td {
              background: #FEF2F2;
            }
            .col-nome {
              width: 60%;
            }
            .col-sku {
              width: 25%;
            }
            .col-unidade {
              width: 15%;
              text-align: center;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 2px solid #E5E7EB;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            .obs-section {
              margin-top: 30px;
              padding: 15px;
              background: #F3F4F6;
              border-radius: 4px;
              font-size: 13px;
              line-height: 1.6;
            }
            .obs-section strong {
              color: #374151;
            }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
              table { page-break-inside: avoid; }
              table tr { page-break-inside: avoid; }
            }
            .button-container {
              text-align: center;
              margin-top: 30px;
            }
            button {
              padding: 12px 24px;
              margin: 0 10px;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              transition: all 0.3s;
            }
            .btn-print {
              background: #DC2626;
              color: white;
            }
            .btn-print:hover {
              background: #991B1B;
            }
            .btn-close {
              background: #6B7280;
              color: white;
            }
            .btn-close:hover {
              background: #4B5563;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📋 SOLICITAÇÃO DE COTAÇÃO</h1>
            <h2>S3E Engenharia - Lista de Materiais</h2>
            <p style="margin-top: 10px; color: #666; font-size: 14px;">Data: ${dataAtual}</p>
          </div>

          <div class="info-section">
            <p><strong>${fornecedorSelecionado ? `Prezado(a) ${fornecedorSelecionado.nome},` : 'Prezado(a) Fornecedor,'}</strong></p>
            <p>Solicitamos cotação para os seguintes materiais de nosso interesse:</p>
            <p style="margin-top: 10px;"><strong>Total de itens:</strong> ${materiaisFiltrados.length}</p>
            ${fornecedorSelecionado ? `<p><strong>Destinatário:</strong> ${fornecedorSelecionado.nome}</p>` : ''}
            ${fornecedorSelecionado && fornecedorSelecionado.email ? `<p><strong>Email:</strong> ${fornecedorSelecionado.email}</p>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th class="col-nome">Nome do Material</th>
                <th class="col-sku">SKU</th>
                <th class="col-unidade">Unidade</th>
              </tr>
            </thead>
            <tbody>
              ${materiaisFiltrados.map((material: any) => {
                return `
                  <tr>
                    <td class="col-nome"><strong>${material.nome || material.name || 'Material sem nome'}</strong></td>
                    <td class="col-sku">${material.sku || 'N/A'}</td>
                    <td class="col-unidade">${material.unidadeMedida || 'un'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="obs-section">
            <p><strong>Observações:</strong></p>
            <ul style="margin-left: 20px; margin-top: 10px;">
              <li>Por favor, informar prazo de entrega e condições de pagamento para cada item.</li>
              <li>Solicitamos que a cotação tenha validade mínima de 30 dias.</li>
              <li>Favor informar quantidade mínima de compra, se houver.</li>
              <li>Por favor, enviar catálogo ou informações técnicas dos produtos, se disponível.</li>
            </ul>
            <p style="margin-top: 15px;"><strong>Contato:</strong></p>
            <p>Para esclarecimentos, entre em contato conosco através dos canais oficiais.</p>
          </div>

          <div class="footer">
            <p><strong>S3E Engenharia</strong> - Sistema de Gestão Profissional</p>
            <p>Este documento foi gerado automaticamente pelo sistema</p>
            <p style="margin-top: 10px; font-size: 11px; color: #999;">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
            <p style="margin-top: 5px; font-size: 11px; color: #999;">Gerado por: ${user?.name || 'Usuário'}</p>
          </div>

          <div class="button-container no-print">
            <button class="btn-print" onclick="window.print()">
              🖨️ Imprimir / Salvar PDF
            </button>
            <button class="btn-close" onclick="window.close()">
              ✖️ Fechar
            </button>
          </div>
        </body>
        </html>
      `;
      
      cotacaoWindow.document.write(html);
      cotacaoWindow.document.close();
      
    } catch (err) {
      console.error('Erro ao gerar PDF de cotação:', err);
      alert('❌ Erro ao gerar PDF de cotação. Tente novamente.');
    }
  };

  // Criar relatório em PDF
  const handleCriarRelatorio = () => {
    try {
      // Criar relatório em HTML para impressão
      const relatorioWindow = window.open('', '_blank');
      
      if (!relatorioWindow) {
        alert('❌ Bloqueador de pop-ups ativado. Permita pop-ups para gerar o relatório.');
        return;
      }
      
      const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Relatório Dashboard - S3E Engenharia</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              padding: 40px;
              background: #fff;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 3px solid #3B82F6;
            }
            .header h1 {
              color: #3B82F6;
              font-size: 32px;
              margin-bottom: 10px;
            }
            .header p {
              color: #666;
              font-size: 14px;
            }
            .section {
              margin-bottom: 30px;
            }
            .section h2 {
              color: #1E293B;
              font-size: 20px;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 2px solid #E5E7EB;
            }
            .metrics {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              margin-bottom: 30px;
            }
            .metric-card {
              padding: 20px;
              border: 2px solid #E5E7EB;
              border-radius: 8px;
              text-align: center;
            }
            .metric-card .value {
              font-size: 36px;
              font-weight: bold;
              color: #3B82F6;
              margin-bottom: 8px;
            }
            .metric-card .label {
              font-size: 14px;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            table th, table td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #E5E7EB;
            }
            table th {
              background: #F3F4F6;
              font-weight: 600;
              color: #374151;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 2px solid #E5E7EB;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>⚡ S3E Engenharia</h1>
            <p>Relatório do Dashboard Executivo</p>
            <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
            <p>Por: ${user?.name || 'Usuário'}</p>
          </div>

          <div class="section">
            <h2>📊 Métricas Principais</h2>
            <div class="metrics">
              <div class="metric-card">
                <div class="value">${dashboardData?.estatisticas?.projetos?.ativos || 0}</div>
                <div class="label">Obras Ativas</div>
              </div>
              <div class="metric-card">
                <div class="value">${dashboardData?.estatisticas?.equipes?.ativas || 0}</div>
                <div class="label">Equipes Ativas</div>
              </div>
              <div class="metric-card">
                <div class="value">${quadrosData.reduce((sum, item) => sum + (item.producao || 0), 0)}</div>
                <div class="label">Quadros Produzidos</div>
              </div>
              <div class="metric-card">
                <div class="value">${dashboardData?.estatisticas?.clientes?.ativos || 0}</div>
                <div class="label">Clientes Ativos</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>📈 Comparativo (${selectedPeriod === 'monthly' ? 'Mensal' : selectedPeriod === 'semester' ? 'Semestral' : 'Anual'})</h2>
            <table>
              <thead>
                <tr>
                  <th>Período</th>
                  <th>Orçamentos</th>
                  <th>OS</th>
                  <th>Obras</th>
                  <th>Pedidos</th>
                </tr>
              </thead>
              <tbody>
                ${(graficosExec?.comparativoMensal || []).map((item: any) => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.orcamentos}</td>
                    <td>${item.ordensServico}</td>
                    <td>${item.obras}</td>
                    <td>${item.pedidosVendas}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>🔧 Produção de Quadros (referência mensal)</h2>
            <table>
              <thead>
                <tr>
                  <th>Período</th>
                  <th>Quantidade Produzida</th>
                </tr>
              </thead>
              <tbody>
                ${quadrosData.map(item => `
                  <tr>
                    <td>${item.hora}</td>
                    <td>${item.producao}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>📦 Resumo do Sistema</h2>
            <table>
              <thead>
                <tr>
                  <th>Métrica</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Fornecedores Ativos</td>
                  <td>${dashboardData?.estatisticas?.fornecedores?.ativos || 0}</td>
                </tr>
                <tr>
                  <td>Vendas no Mês</td>
                  <td>${dashboardData?.estatisticas?.vendas?.mesAtual || 0}</td>
                </tr>
                <tr>
                  <td>Materiais com Estoque Baixo</td>
                  <td>${dashboardData?.estatisticas?.estoque?.materiaisBaixo || 0}</td>
                </tr>
                <tr>
                  <td>Total de Projetos</td>
                  <td>${dashboardData?.projetos?.length || 0}</td>
                </tr>
                <tr>
                  <td>Total de Materiais</td>
                  <td>${dashboardData?.materiais?.length || 0}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p><strong>S3E Engenharia</strong> - Sistema de Gestão Profissional</p>
            <p>Relatório gerado automaticamente pelo sistema</p>
            <p class="no-print" style="margin-top: 20px;">
              <button onclick="window.print()" style="padding: 10px 20px; background: #3B82F6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                🖨️ Imprimir / Salvar PDF
              </button>
              <button onclick="window.close()" style="padding: 10px 20px; background: #6B7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; margin-left: 10px;">
                ✖️ Fechar
              </button>
            </p>
          </div>
        </body>
        </html>
      `;
      
      relatorioWindow.document.write(html);
      relatorioWindow.document.close();
      
    } catch (err) {
      console.error('Erro ao criar relatório:', err);
      alert('❌ Erro ao criar relatório. Tente novamente.');
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadCardsMetricas();
    loadQuadrosData('monthly');
    loadMateriaisCriticos();
    loadFornecedores();

    const interval = setInterval(() => {
      loadDashboardData();
      loadCardsMetricas();
      loadMateriaisCriticos();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadGraficosExec(selectedPeriod);
  }, [selectedPeriod]);

  const PIE_COLORS = [...CHART_SERIES_COLORS];

  /** Fatias para pizza interativa: pedidos por período (evolução) */
  const piePedidosPorPeriodo = useMemo(() => {
    const rows = graficosExec?.evolucaoPedidosVendas ?? [];
    if (!rows.length) return [{ name: 'Sem dados', value: 1 }];
    let mapped = rows.map((r: any) => ({
      name: String(r.name ?? '—'),
      value: Number(r.quantidade ?? 0),
      valor: Number(r.valor ?? 0)
    }));
    const sumQ = mapped.reduce((s, x) => s + x.value, 0);
    if (sumQ === 0) {
      mapped = mapped.map((x) => ({ ...x, value: Math.max(0, x.valor) }));
    }
    const sum = mapped.reduce((s, x) => s + x.value, 0);
    if (sum <= 0) return [{ name: 'Sem dados', value: 1 }];
    return mapped.filter((x) => x.value > 0);
  }, [graficosExec?.evolucaoPedidosVendas]);

  useEffect(() => {
    setPiePedidosActiveIndex(0);
  }, [selectedPeriod, piePedidosPorPeriodo.length]);

  const tendenciaDir = (n: number): 'up' | 'down' => (n >= 0 ? 'up' : 'down');

  // Métricas principais — valores e tendências da API /api/dashboard/cards-metricas
  const metricsData: MetricCard[] = [
    {
      title: 'Obras Ativas',
      value: (
        cardsMetricas?.obrasAtivas.valor ??
        dashboardData?.estatisticas?.projetos?.ativos ??
        0
      ).toString(),
      change: cardsMetricas?.obrasAtivas.tendencia ?? 0,
      icon: <Building2 className="w-5 h-5" />,
      trend: tendenciaDir(cardsMetricas?.obrasAtivas.tendencia ?? 0),
      hint: 'OS com status Em Execução',
    },
    {
      title: 'OS em andamento',
      value: (cardsMetricas?.osEmAndamento.valor ?? 0).toString(),
      change: cardsMetricas?.osEmAndamento.tendencia ?? 0,
      icon: <ClipboardList className="w-5 h-5" />,
      trend: tendenciaDir(cardsMetricas?.osEmAndamento.tendencia ?? 0),
      hint: cardsMetricas?.osEmAndamento.descricao ?? 'Progresso entre 1% e 99% (barra da OS)',
    },
    {
      title: 'Equipes Ativas',
      value: (
        cardsMetricas?.equipesAtivas.valor ??
        dashboardData?.estatisticas?.equipes?.ativas ??
        0
      ).toString(),
      change: cardsMetricas?.equipesAtivas.tendencia ?? 0,
      icon: <Users className="w-5 h-5" />,
      trend: tendenciaDir(cardsMetricas?.equipesAtivas.tendencia ?? 0),
    },
    {
      title: 'Quadros produzidos',
      value: (
        cardsMetricas?.quadrosProduzidos.valor ??
        quadrosData.reduce((sum, item) => sum + (item.producao || 0), 0)
      ).toString(),
      change: cardsMetricas?.quadrosProduzidos.tendencia ?? 0,
      icon: <Zap className="w-5 h-5" />,
      trend: tendenciaDir(cardsMetricas?.quadrosProduzidos.tendencia ?? 0),
      hint:
        cardsMetricas?.quadrosProduzidos.fonte ??
        'OS criadas no mês com Quadro/Painel no título',
    },
    {
      title: 'Clientes atendidos',
      value: (
        cardsMetricas?.clientesAtendidos.valor ??
        dashboardData?.estatisticas?.clientes?.ativos ??
        0
      ).toString(),
      change: cardsMetricas?.clientesAtendidos.tendencia ?? 0,
      icon: <Star className="w-5 h-5" />,
      trend: tendenciaDir(cardsMetricas?.clientesAtendidos.tendencia ?? 0),
      hint:
        cardsMetricas?.clientesAtendidos.descricao ??
        'Clientes com orçamento aprovado',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-blue mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-dark-text-secondary">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-dark-text mb-2">
              Bem-vindo de volta, {userName}! 👋
            </h1>
            <p className="text-gray-600 dark:text-dark-text-secondary">
              Acompanhe o desempenho e evolução da S3E Engenharia
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleExportarDados}
              disabled={exportando}
            >
              <Download className="w-4 h-4" />
              {exportando ? 'Exportando...' : 'Exportar dados'}
            </Button>
            <Button className="gap-2" onClick={handleCriarRelatorio}>
              <FileText className="w-4 h-4" />
              Criar relatório
            </Button>
          </div>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-8 items-stretch">
        {metricsData.map((metric, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow h-full">
            <CardContent className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center text-brand-blue shrink-0">
                  {metric.icon}
                </div>
                <Badge 
                  variant={metric.trend === 'up' ? 'success' : 'destructive'}
                  className="gap-1"
                >
                  {metric.trend === 'up' ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {Math.abs(metric.change)}%
                </Badge>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-dark-text mb-1 mt-auto">
                {metric.value}
              </h3>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                {metric.title}
              </p>
              {metric.hint ? (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight" title={metric.hint}>
                  {metric.hint.length > 72 ? `${metric.hint.slice(0, 72)}…` : metric.hint}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={kpiModalOpen} onOpenChange={setKpiModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{kpiModalData?.titulo ?? 'Detalhamento dos KPIs'}</DialogTitle>
            <DialogDescription>
              {kpiModalData?.nota ??
                'Termos alinhados à página Ordem de Serviços. Período dos gráficos: '}
              {kpiModalBucket ? ` · Recorte: ${kpiModalBucket}` : ''}
            </DialogDescription>
          </DialogHeader>
          {kpiModalLoading ? (
            <p className="text-sm text-gray-500 py-8 text-center">Carregando…</p>
          ) : kpiModalData ? (
            <div className="space-y-4">
              {kpiModalData.legenda && kpiModalData.legenda.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-dark-border">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-slate-800">
                      <tr>
                        <th className="text-left p-2 font-semibold">KPI no gráfico</th>
                        <th className="text-left p-2 font-semibold">Significado</th>
                        <th className="text-left p-2 font-semibold">Na página OS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpiModalData.legenda.map((row) => (
                        <tr key={row.kpi} className="border-t border-gray-100 dark:border-gray-700">
                          <td className="p-2 font-medium">{row.kpi}</td>
                          <td className="p-2 text-gray-600 dark:text-gray-300">{row.significado}</td>
                          <td className="p-2 text-gray-600 dark:text-gray-300">{row.termoPaginaOs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {kpiModalData.resumo && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {[
                    ['concluido', 'Concluído'],
                    ['comProgresso', 'Com progresso'],
                    ['aguardando', 'Aguardando (0%)'],
                    ['proposta', 'Proposta'],
                    ['validado', 'Validado'],
                    ['aprovado', 'Aprovado'],
                    ['emExecucao', 'Em Execução'],
                  ].map(([key, label]) => {
                    const v = (kpiModalData.resumo as Record<string, number>)[key];
                    if (typeof v !== 'number') return null;
                    return (
                      <Badge key={key} variant="outline" className="font-mono">
                        {label}: {v}
                      </Badge>
                    );
                  })}
                </div>
              )}
              {kpiModalData.linhas && kpiModalData.linhas.length > 0 && (
                <div className="overflow-x-auto max-h-[50vh] rounded-lg border border-gray-200 dark:border-dark-border">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0">
                      <tr>
                        <th className="text-left p-2">OS</th>
                        <th className="text-left p-2">Título</th>
                        <th className="text-left p-2">Status (página)</th>
                        <th className="text-right p-2">Progresso</th>
                        <th className="text-left p-2">No gráfico</th>
                        <th className="text-left p-2">Criado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpiModalData.linhas.map((linha, i) => (
                        <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                          <td className="p-2 font-mono">{linha.os}</td>
                          <td className="p-2 max-w-[200px] truncate" title={String(linha.titulo)}>
                            {linha.titulo}
                          </td>
                          <td className="p-2">{linha.statusPagina}</td>
                          <td className="p-2 text-right font-mono">{linha.progressoPct}%</td>
                          <td className="p-2">{linha.classificacaoGrafico}</td>
                          <td className="p-2 whitespace-nowrap">{linha.criadoEm}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhum dado disponível.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Painel analítico — período global */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 text-gray-700 dark:text-dark-text-secondary">
          <LayoutGrid className="w-5 h-5 text-brand-blue" />
          <span className="font-medium">Período dos gráficos</span>
        </div>
        <Select value={selectedPeriod} onValueChange={(v: 'monthly' | 'semester' | 'annual') => setSelectedPeriod(v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Mensal (ano atual)</SelectItem>
            <SelectItem value="semester">Semestral</SelectItem>
            <SelectItem value="annual">Anual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg">Evolução de orçamentos</CardTitle>
                <CardDescription>Criados, aprovados e em análise (por data de criação)</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1 text-xs"
                onClick={() => void abrirDetalheKpis('orcamentos')}
                disabled
                title="Em breve"
              >
                <Table2 className="w-3.5 h-3.5" />
                KPIs
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={graficosExec?.evolucaoOrcamentos ?? []}>
                <defs>
                  <linearGradient id="gOrc1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ct.areaFrom} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={ct.areaTo} stopOpacity={isDark ? 0.15 : 0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="name" stroke={ct.axis} fontSize={11} />
                <YAxis stroke={ct.axis} fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={chartTooltipStyle(!!isDark)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="criados" name="Criados" stroke={CHART_ACCENT} fill="url(#gOrc1)" strokeWidth={2} />
                <Area type="monotone" dataKey="aprovados" name="Aprovados" stroke="#10B981" fillOpacity={0} strokeWidth={2} />
                <Area type="monotone" dataKey="emAnalise" name="Em análise" stroke="#F59E0B" fillOpacity={0} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg">Evolução de ordens de serviço</CardTitle>
                <CardDescription>
                  OS criadas no período — Concluído, Com progresso (barra 1–99%) e Aguardando (0%)
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1 text-xs"
                onClick={() => void abrirDetalheKpis('ordens-servico')}
              >
                <Table2 className="w-3.5 h-3.5" />
                Ver KPIs
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={graficosExec?.evolucaoOrdensServico ?? []}
                margin={{ top: 20, right: 8, left: 0, bottom: 0 }}
                onClick={(state) => {
                  const label = (state as { activeLabel?: string })?.activeLabel;
                  if (label) void abrirDetalheKpis('ordens-servico', String(label));
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="name" stroke={ct.axis} fontSize={11} />
                <YAxis stroke={ct.axis} fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={chartTooltipStyle(!!isDark)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="concluido" name="Concluído" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 4, fill: '#8B5CF6' }} activeDot={{ r: 6 }}>
                  <LabelList
                    dataKey="concluido"
                    position="top"
                    fontSize={10}
                    fill={isDark ? '#E2E8F0' : '#475569'}
                    formatter={(v: number) => (v > 0 ? v : '')}
                  />
                </Line>
                <Line type="monotone" dataKey="comProgresso" name="Com progresso (1–99%)" stroke={CHART_ACCENT} strokeWidth={2} dot={{ r: 3, fill: CHART_ACCENT }}>
                  <LabelList
                    dataKey="comProgresso"
                    position="top"
                    offset={12}
                    fontSize={10}
                    fill={isDark ? '#E2E8F0' : '#475569'}
                    formatter={(v: number) => (v > 0 ? v : '')}
                  />
                </Line>
                <Line type="monotone" dataKey="aguardando" name="Aguardando (0%)" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: '#10B981' }}>
                  <LabelList
                    dataKey="aguardando"
                    position="top"
                    offset={24}
                    fontSize={10}
                    fill={isDark ? '#E2E8F0' : '#475569'}
                    formatter={(v: number) => (v > 0 ? v : '')}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg">Evolução de obras (Kanban)</CardTitle>
                <CardDescription>Obras de campo por status (cadastro no período)</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1 text-xs" disabled title="Em breve">
                <Table2 className="w-3.5 h-3.5" />
                KPIs
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={graficosExec?.evolucaoObrasKanban ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="name" stroke={ct.axis} fontSize={11} />
                <YAxis stroke={ct.axis} fontSize={11} allowDecimals={false} />
                <Tooltip
                  cursor={{ stroke: ct.axis, strokeWidth: 1, strokeDasharray: '4 4' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div
                        className="rounded-xl px-3 py-2.5 shadow-lg min-w-[200px]"
                        style={chartTooltipStyle(!!isDark)}
                      >
                        <p className="font-bold text-sm mb-2 pb-1.5 border-b" style={{ borderColor: ct.grid }}>
                          {label}
                        </p>
                        <ul className="space-y-1.5 text-xs">
                          {payload.map((p: any) => (
                            <li key={String(p.dataKey)} className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                                <span className="opacity-90">{p.name}</span>
                              </span>
                              <span className="font-semibold tabular-nums">{p.value}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="backlog" name="Backlog" stroke="#94A3B8" fill="#94A3B833" strokeWidth={2} />
                <Area type="monotone" dataKey="aFazer" name="A fazer" stroke="#F59E0B" fill="#F59E0B33" strokeWidth={2} />
                <Area type="monotone" dataKey="andamento" name="Andamento" stroke={CHART_ACCENT} fill={`${CHART_ACCENT}33`} strokeWidth={2} />
                <Area type="monotone" dataKey="concluidas" name="Concluídas" stroke="#10B981" fill="#10B98133" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Evolução de pedidos de venda</CardTitle>
            <CardDescription>Quantidade e valor total por período — barras agrupadas</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={graficosExec?.evolucaoPedidosVendas ?? []} barGap={4} barCategoryGap="18%">
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="name" stroke={ct.axis} fontSize={11} />
                <YAxis
                  yAxisId="left"
                  stroke={ct.axis}
                  fontSize={11}
                  allowDecimals={false}
                  label={{ value: 'Qtd. pedidos', angle: -90, position: 'insideLeft', fill: ct.axis, fontSize: 10 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke={ct.axis}
                  fontSize={11}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  label={{ value: 'Valor', angle: 90, position: 'insideRight', fill: ct.axis, fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle(!!isDark)}
                  formatter={(value: number, name: string) =>
                    name === 'Valor (R$)' ? [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), name] : [value, name]
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="quantidade" name="Pedidos (qtd.)" fill="#0EA5E9" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar yAxisId="right" dataKey="valor" name="Valor (R$)" fill="#A855F7" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Comparativo — volume por período</CardTitle>
          <CardDescription>Orçamentos, OS (projetos), obras e pedidos criados no intervalo</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={graficosExec?.comparativoMensal ?? []} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
              <XAxis dataKey="name" stroke={ct.axis} />
              <YAxis stroke={ct.axis} allowDecimals={false} />
              <Tooltip
                contentStyle={chartTooltipStyle(!!isDark)}
              />
              <Legend />
              <Bar dataKey="orcamentos" name="Orçamentos" fill={CHART_ACCENT} radius={[4, 4, 0, 0]} />
              <Bar dataKey="ordensServico" name="Ordens de serviço" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="obras" name="Obras" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pedidosVendas" name="Pedidos de venda" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Categorias de venda</CardTitle>
            <CardDescription>Distribuição por forma de pagamento (pedidos no período)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={
                      graficosExec?.categoriasVendas?.length
                        ? graficosExec.categoriasVendas
                        : [{ name: 'Sem dados', value: 1 }]
                    }
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={96}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    onMouseEnter={(_, i) => setPieActiveIndex(i)}
                  >
                    {(graficosExec?.categoriasVendas?.length
                      ? graficosExec.categoriasVendas
                      : [{ name: 'Sem dados', value: 1 }]
                    ).map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                        stroke={isDark ? ct.cardBg : '#fff'}
                        strokeWidth={pieActiveIndex === i ? 3 : 1}
                        style={{ cursor: 'pointer', opacity: pieActiveIndex === i ? 1 : 0.88 }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={chartTooltipStyle(!!isDark)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2 w-full">
                <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">Destaque (interativo)</p>
                <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
                  Passe o mouse ou clique nas fatias para destacar. A legenda reflete a forma de pagamento cadastrada no pedido.
                </p>
                <div className="rounded-lg bg-gray-50 dark:bg-slate-800/80 p-3 text-sm">
                  {graficosExec?.categoriasVendas?.[pieActiveIndex] ? (
                    <>
                      <p className="font-medium text-gray-900 dark:text-dark-text">
                        {graficosExec.categoriasVendas[pieActiveIndex].name}
                      </p>
                      <p className="text-brand-blue font-bold text-lg">
                        {graficosExec.categoriasVendas[pieActiveIndex].value} pedido(s)
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-500">Sem vendas no período selecionado.</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pedidos de venda por fatia (pizza)</CardTitle>
            <CardDescription>Distribuição da quantidade de pedidos entre os períodos do gráfico de evolução — destaque interativo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={piePedidosPorPeriodo}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={96}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    onMouseEnter={(_, i) => setPiePedidosActiveIndex(i)}
                    onClick={(_, i) => setPiePedidosActiveIndex(i)}
                  >
                    {piePedidosPorPeriodo.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[(i + 3) % PIE_COLORS.length]}
                        stroke={isDark ? ct.cardBg : '#fff'}
                        strokeWidth={piePedidosActiveIndex === i ? 3 : 1}
                        style={{ cursor: 'pointer', opacity: piePedidosActiveIndex === i ? 1 : 0.88 }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0].payload as { name: string; value: number; valor?: number };
                      return (
                        <div
                          className="rounded-lg px-3 py-2 text-xs shadow-lg"
                          style={chartTooltipStyle(!!isDark)}
                        >
                          <p className="font-semibold mb-1">{row.name}</p>
                          <p className="tabular-nums">
                            {row.name === 'Sem dados' ? '—' : `${row.value} pedido(s)`}
                          </p>
                          {typeof row.valor === 'number' && row.name !== 'Sem dados' && (
                            <p className="tabular-nums opacity-90 mt-0.5">
                              {row.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2 w-full">
                <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">Período em destaque</p>
                <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
                  Passe o mouse ou clique na fatia para ver quantidade e valor no período.
                </p>
                <div className="rounded-lg bg-gray-50 dark:bg-slate-800/80 p-3 text-sm">
                  {(() => {
                    const destaque = piePedidosPorPeriodo[Math.min(piePedidosActiveIndex, piePedidosPorPeriodo.length - 1)];
                    if (!destaque || destaque.name === 'Sem dados') {
                      return <p className="text-gray-500">Sem pedidos no período selecionado.</p>;
                    }
                    const valorExtra = 'valor' in destaque ? (destaque as { valor?: number }).valor : undefined;
                    return (
                      <>
                        <p className="font-medium text-gray-900 dark:text-dark-text">{destaque.name}</p>
                        <p className="text-brand-blue font-bold text-lg">{destaque.value} pedido(s)</p>
                        {typeof valorExtra === 'number' && (
                          <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1 tabular-nums">
                            {valorExtra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção inferior - Card de Estoque Crítico (ocupando todo o espaço) */}
      <div className="grid grid-cols-1 gap-6">
        {/* Alertas - Materiais com Estoque Crítico */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Estoque Crítico
                </CardTitle>
                <CardDescription>
                  {materiaisCriticos.length > 0 
                    ? `${materiaisCriticos.length} material(is) com estoque abaixo do mínimo`
                    : 'Nenhum material com estoque crítico'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {materiaisCriticos.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary font-medium">
                  Todos os materiais estão com estoque adequado
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Filtros e Botão PDF */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Estoque:</span>
                      <Select value={filtroEstoque} onValueChange={(v: any) => setFiltroEstoque(v)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          <SelectItem value="criticos">Itens Críticos</SelectItem>
                          <SelectItem value="abaixo-minimo">Abaixo do Mínimo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fornecedor:</span>
                      <Select 
                        value={filtroFornecedor} 
                        onValueChange={(v: string) => setFiltroFornecedor(v)}
                        disabled={fornecedores.length === 0}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder={fornecedores.length === 0 ? "Sem fornecedores" : "Todos os fornecedores"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os fornecedores</SelectItem>
                          {fornecedores.map((fornecedor) => (
                            <SelectItem key={fornecedor.id} value={fornecedor.id}>
                              {fornecedor.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {(filtroEstoque !== 'todos' || filtroFornecedor !== 'todos') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFiltroEstoque('todos');
                          setFiltroFornecedor('todos');
                        }}
                        className="text-xs"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Limpar Filtros
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-sm">
                      {materiaisFiltrados.length} {materiaisFiltrados.length === 1 ? 'item' : 'itens'}
                    </Badge>
                    <Button
                      variant="default"
                      className="gap-2"
                      onClick={handleGerarPDFCotacao}
                    >
                      <FileText className="w-4 h-4" />
                      Gerar PDF para Cotação
                    </Button>
                  </div>
                </div>

                {/* Alerta de Filtro Ativo */}
                {filtroFornecedor !== 'todos' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                      <AlertTriangle className="w-4 h-4" />
                      <span>
                        Exibindo apenas materiais do fornecedor: <strong>{fornecedores.find(f => f.id === filtroFornecedor)?.nome}</strong>
                      </span>
                    </div>
                  </div>
                )}

                {/* Tabela de Materiais */}
                <div className="border rounded-lg overflow-hidden">
                  {materiaisFiltrados.length > 0 ? (
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-b border-gray-200 dark:border-gray-600 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Nome do Item</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">SKU</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Estoque Atual</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Estoque Mínimo</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Unidade</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {materiaisFiltrados.map((material: any) => {
                            const estoque = material.estoque || material.stock || 0;
                            const estoqueMinimo = material.estoqueMinimo || material.minStock || 5;
                            const isCritico = estoque === 0;
                            
                            return (
                              <tr
                                key={material.id || material.sku}
                                className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                                  isCritico
                                    ? 'bg-red-50/50 dark:bg-red-900/10'
                                    : 'bg-orange-50/50 dark:bg-orange-900/10'
                                }`}
                              >
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-dark-text">
                                  {material.nome || material.name || 'Material sem nome'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-dark-text-secondary">
                                  {material.sku || 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-dark-text">
                                  {estoque}
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-dark-text-secondary">
                                  {estoqueMinimo}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-dark-text-secondary">
                                  {material.unidadeMedida || 'un'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Badge 
                                    variant={isCritico ? "destructive" : "warning"}
                                  >
                                    {isCritico ? 'Crítico' : 'Baixo'}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm font-medium">
                        Nenhum material encontrado com o filtro selecionado.
                      </p>
                      {(filtroEstoque !== 'todos' || filtroFornecedor !== 'todos') && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => {
                            setFiltroEstoque('todos');
                            setFiltroFornecedor('todos');
                          }}
                        >
                          Limpar Filtros
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer info */}
      <div className="mt-8 flex items-center justify-between text-sm text-gray-500 dark:text-dark-text-secondary">
        <p>Última atualização: {lastUpdate}</p>
        <p className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Sistema Online
        </p>
      </div>
    </div>
  );
};

export default DashboardModerno;

