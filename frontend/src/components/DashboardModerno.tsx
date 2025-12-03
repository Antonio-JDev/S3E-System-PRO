import React, { useState, useEffect, useContext } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, DollarSign, 
  Package, AlertTriangle, Building2, Zap, 
  ArrowUpRight, Calendar, Download, FileText,
  Activity, Star, Eye, Printer, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { dashboardService, type DashboardCompleto } from '../services/dashboardService';
import { fornecedoresService, type Fornecedor } from '../services/fornecedoresService';
import { ThemeContext } from '../contexts/ThemeContext';
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
}

const DashboardModerno: React.FC<DashboardModernoProps> = ({ toggleSidebar, onNavigate }) => {
  const [dashboardData, setDashboardData] = useState<DashboardCompleto | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'semester' | 'annual'>('monthly');
  const [selectedQuadrosPeriod, setSelectedQuadrosPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [obrasData, setObrasData] = useState<any[]>([]);
  const [quadrosData, setQuadrosData] = useState<any[]>([]);
  const [atividadesData, setAtividadesData] = useState<any[]>([]);
  const [materiaisCriticos, setMateriaisCriticos] = useState<any[]>([]);
  const [exportando, setExportando] = useState(false);
  const [estoqueExpandido, setEstoqueExpandido] = useState(false);
  const [filtroEstoque, setFiltroEstoque] = useState<'todos' | 'criticos' | 'abaixo-minimo'>('todos');
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>('todos');
  
  // Detectar tema para ajustar cores dos gráficos
  const themeContext = useContext(ThemeContext);
  const isDark = themeContext?.theme === 'dark' || 
    (themeContext?.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  // Pegar usuário logado
  const { user } = useAuth();
  const userName = user?.name?.split(' ')[0] || 'Usuário';

  // Carregar dados do dashboard
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

  // Carregar evolução de obras
  const loadObrasData = async (periodo: 'monthly' | 'semester' | 'annual') => {
    try {
      const result = await dashboardService.getEvolucaoObras(periodo);
      if (result.success && result.data) {
        setObrasData(result.data);
      }
    } catch (err) {
      console.error('Erro ao carregar evolução de obras:', err);
    }
  };

  // Carregar produção de quadros
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

  // Carregar atividades do sistema
  const loadAtividadesData = async () => {
    try {
      const result = await dashboardService.getAtividades('daily');
      if (result.success && result.data) {
        setAtividadesData(result.data);
      }
    } catch (err) {
      console.error('Erro ao carregar atividades:', err);
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
        evolucaoObras: {
          periodo: selectedPeriod,
          dados: obrasData
        },
        
        // Produção de quadros
        producaoQuadros: {
          periodo: selectedQuadrosPeriod,
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

  // Filtrar materiais críticos
  const getMateriaisFiltrados = () => {
    let materiaisFiltrados = materiaisCriticos;
    
    // Filtrar por nível de estoque
    if (filtroEstoque === 'criticos') {
      materiaisFiltrados = materiaisFiltrados.filter((material: any) => {
        const estoque = material.estoque || material.stock || 0;
        return estoque === 0;
      });
    } else if (filtroEstoque === 'abaixo-minimo') {
      materiaisFiltrados = materiaisFiltrados.filter((material: any) => {
        const estoque = material.estoque || material.stock || 0;
        const estoqueMinimo = material.estoqueMinimo || material.minStock || 5;
        return estoque > 0 && estoque <= estoqueMinimo;
      });
    }
    
    // Filtrar por fornecedor
    if (filtroFornecedor !== 'todos') {
      const antesDoFiltro = materiaisFiltrados.length;
      materiaisFiltrados = materiaisFiltrados.filter((material: any) => {
        // Suportar tanto fornecedorId direto quanto fornecedor.id (objetos aninhados)
        const fornecedorIdMaterial = material.fornecedorId || material.fornecedor?.id;
        return fornecedorIdMaterial === filtroFornecedor;
      });
      console.log(`🔍 Filtro de fornecedor: ${antesDoFiltro} materiais → ${materiaisFiltrados.length} após filtrar por fornecedor ${filtroFornecedor}`);
    }
    
    return materiaisFiltrados;
  };

  // Gerar PDF para cotação com fornecedor
  const handleGerarPDFCotacao = () => {
    try {
      const materiaisFiltrados = getMateriaisFiltrados();
      
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
            <h2>🏗️ Evolução de Obras (${selectedPeriod === 'monthly' ? 'Mensal' : selectedPeriod === 'semester' ? 'Semestral' : 'Anual'})</h2>
            <table>
              <thead>
                <tr>
                  <th>Período</th>
                  <th>Concluídas</th>
                  <th>Em Andamento</th>
                  <th>Planejadas</th>
                  <th>Receita</th>
                </tr>
              </thead>
              <tbody>
                ${obrasData.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.concluidas}</td>
                    <td>${item.emAndamento}</td>
                    <td>${item.planejadas}</td>
                    <td>R$ ${(item.receita || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>🔧 Produção de Quadros (${selectedQuadrosPeriod === 'daily' ? 'Diário' : selectedQuadrosPeriod === 'weekly' ? 'Semanal' : 'Mensal'})</h2>
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
    loadAtividadesData();
    loadMateriaisCriticos();
    loadFornecedores();
    
    const interval = setInterval(() => {
      loadDashboardData();
      loadAtividadesData();
      loadMateriaisCriticos();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carregar dados de obras quando período mudar
  useEffect(() => {
    loadObrasData(selectedPeriod);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod]);

  // Carregar dados de quadros quando período mudar
  useEffect(() => {
    loadQuadrosData(selectedQuadrosPeriod);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQuadrosPeriod]);

  // Usar dados reais da API ou fallback para dados mockados
  const getObrasData = () => {
    if (obrasData && obrasData.length > 0) {
      return obrasData;
    }
    
    // Fallback para dados mockados caso API não retorne dados
    if (selectedPeriod === 'monthly') {
      return [
        { name: 'Jan', concluidas: 0, emAndamento: 0, planejadas: 0, receita: 0 },
        { name: 'Fev', concluidas: 0, emAndamento: 0, planejadas: 0, receita: 0 },
        { name: 'Mar', concluidas: 0, emAndamento: 0, planejadas: 0, receita: 0 },
        { name: 'Abr', concluidas: 0, emAndamento: 0, planejadas: 0, receita: 0 },
        { name: 'Mai', concluidas: 0, emAndamento: 0, planejadas: 0, receita: 0 },
        { name: 'Jun', concluidas: 0, emAndamento: 0, planejadas: 0, receita: 0 },
        { name: 'Jul', concluidas: 0, emAndamento: 0, planejadas: 0, receita: 0 },
        { name: 'Ago', concluidas: 0, emAndamento: 0, planejadas: 0, receita: 0 },
        { name: 'Set', concluidas: 0, emAndamento: 0, planejadas: 0, receita: 0 },
        { name: 'Out', concluidas: 0, emAndamento: 0, planejadas: 0, receita: 0 },
        { name: 'Nov', concluidas: 0, emAndamento: 0, planejadas: 0, receita: 0 },
        { name: 'Dez', concluidas: 0, emAndamento: 0, planejadas: 0, receita: 0 },
      ];
    } else if (selectedPeriod === 'semester') {
      return [
        { name: '1º Sem 2023', concluidas: 0, emAndamento: 0, planejadas: 0, receita: 0 },
        { name: '2º Sem 2023', concluidas: 0, emAndamento: 0, planejadas: 0, receita: 0 },
        { name: '1º Sem 2024', concluidas: 0, emAndamento: 0, planejadas: 0, receita: 0 },
        { name: '2º Sem 2024', concluidas: 0, emAndamento: 0, planejadas: 0, receita: 0 },
      ];
    } else {
      return [
        { name: '2020', concluidas: 0, emAndamento: 0, planejadas: 0, receita: 0 },
        { name: '2021', concluidas: 0, emAndamento: 0, planejadas: 0, receita: 0 },
        { name: '2022', concluidas: 0, emAndamento: 0, planejadas: 0, receita: 0 },
        { name: '2023', concluidas: 0, emAndamento: 0, planejadas: 0, receita: 0 },
        { name: '2024', concluidas: 0, emAndamento: 0, planejadas: 0, receita: 0 },
      ];
    }
  };

  // Usar dados reais de quadros ou fallback
  const getQuadrosData = () => {
    if (quadrosData && quadrosData.length > 0) {
      return quadrosData;
    }
    
    // Fallback para dados mockados
    return [
      { hora: '8h', producao: 0 },
      { hora: '10h', producao: 0 },
      { hora: '12h', producao: 0 },
      { hora: '14h', producao: 0 },
      { hora: '16h', producao: 0 },
      { hora: '18h', producao: 0 },
    ];
  };

  // Usar dados reais de atividades ou fallback
  const getAtividadesData = () => {
    if (atividadesData && atividadesData.length > 0) {
      return atividadesData;
    }
    
    // Fallback para dados mockados
    return [
      { hora: '8h', sessoes: 0 },
      { hora: '10h', sessoes: 0 },
      { hora: '12h', sessoes: 0 },
      { hora: '14h', sessoes: 0 },
      { hora: '16h', sessoes: 0 },
      { hora: '18h', sessoes: 0 },
    ];
  };

  // Métricas principais usando dados reais da API
  const metricsData: MetricCard[] = [
    {
      title: 'Obras Ativas',
      value: dashboardData?.estatisticas?.projetos?.ativos?.toString() || '0',
      change: 28.4,
      icon: <Building2 className="w-5 h-5" />,
      trend: 'up'
    },
    {
      title: 'Equipes Ativas',
      value: dashboardData?.estatisticas?.equipes?.ativas?.toString() || '0',
      change: -12.6,
      icon: <Users className="w-5 h-5" />,
      trend: 'down'
    },
    {
      title: 'Quadros Produzidos',
      value: (quadrosData.reduce((sum, item) => sum + (item.producao || 0), 0)).toString(),
      change: 3.1,
      icon: <Zap className="w-5 h-5" />,
      trend: 'up'
    },
    {
      title: 'Clientes Ativos',
      value: dashboardData?.estatisticas?.clientes?.ativos?.toString() || '0',
      change: 11.3,
      icon: <Star className="w-5 h-5" />,
      trend: 'up'
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {metricsData.map((metric, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center text-brand-blue">
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
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-dark-text mb-1">
                {metric.value}
              </h3>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                {metric.title}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Evolução de Obras */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  Evolução de Obras
                  <Badge variant="success" className="gap-1">
                    <TrendingUp className="w-3 h-3" />
                    24.6%
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-2">
                  Acompanhamento de obras concluídas, em andamento e planejadas
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Select value={selectedPeriod} onValueChange={(v: any) => setSelectedPeriod(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="semester">Semestral</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={getObrasData()}>
                <defs>
                  <linearGradient id="colorConcluidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAndamento" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={isDark ? '#334155' : '#E5E7EB'} 
                />
                <XAxis 
                  dataKey="name" 
                  stroke={isDark ? '#CBD5E1' : '#6B7280'}
                />
                <YAxis 
                  stroke={isDark ? '#CBD5E1' : '#6B7280'}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    border: isDark ? '1px solid #334155' : '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    color: isDark ? '#F8FAFC' : '#374151'
                  }}
                  itemStyle={{ color: isDark ? '#F8FAFC' : '#374151' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="concluidas" 
                  name="Concluídas"
                  stroke="#8B5CF6" 
                  fill="url(#colorConcluidas)"
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="emAndamento" 
                  name="Em Andamento"
                  stroke="#3B82F6" 
                  fill="url(#colorAndamento)"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="planejadas" 
                  name="Planejadas"
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Produção de Quadros Elétricos */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Produção de Quadros
                  <Badge variant="success" className="gap-1">
                    <TrendingUp className="w-3 h-3" />
                    28.5%
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-2">
                  {selectedQuadrosPeriod === 'daily' && 'Últimas 12 horas'}
                  {selectedQuadrosPeriod === 'weekly' && 'Últimos 7 dias'}
                  {selectedQuadrosPeriod === 'monthly' && 'Último mês'}
                </CardDescription>
              </div>
              <Select value={selectedQuadrosPeriod} onValueChange={(v: any) => setSelectedQuadrosPeriod(v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getQuadrosData()}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={isDark ? '#334155' : '#E5E7EB'} 
                />
                <XAxis 
                  dataKey="hora" 
                  stroke={isDark ? '#CBD5E1' : '#6B7280'} 
                />
                <YAxis 
                  stroke={isDark ? '#CBD5E1' : '#6B7280'} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    border: isDark ? '1px solid #334155' : '1px solid #E5E7EB',
                    borderRadius: '8px',
                    color: isDark ? '#F8FAFC' : '#374151'
                  }}
                />
                <Bar 
                  dataKey="producao" 
                  fill="#8B5CF6" 
                  radius={[8, 8, 0, 0]}
                  name="Quadros Produzidos"
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-dark-text-secondary">
                {selectedQuadrosPeriod === 'daily' ? 'Hoje' : selectedQuadrosPeriod === 'weekly' ? 'Esta semana' : 'Este mês'}: <strong className="text-gray-900 dark:text-dark-text">
                  {quadrosData.reduce((sum, item) => sum + (item.producao || 0), 0)} quadros
                </strong>
              </span>
              <Button variant="link" className="h-auto p-0">
                Ver relatório →
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Atividades do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Atividades do Sistema
              <Badge variant="success" className="gap-1">
                <TrendingUp className="w-3 h-3" />
                16.8%
              </Badge>
            </CardTitle>
            <CardDescription className="mt-2">
              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                <Activity className="w-4 h-4" />
                Total: {atividadesData.reduce((sum, item) => sum + (item.sessoes || 0), 0)} atividades
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getAtividadesData()}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={isDark ? '#334155' : '#E5E7EB'} 
                />
                <XAxis 
                  dataKey="hora" 
                  stroke={isDark ? '#CBD5E1' : '#6B7280'} 
                />
                <YAxis 
                  stroke={isDark ? '#CBD5E1' : '#6B7280'} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    border: isDark ? '1px solid #334155' : '1px solid #E5E7EB',
                    borderRadius: '8px',
                    color: isDark ? '#F8FAFC' : '#374151'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sessoes" 
                  stroke="#8B5CF6" 
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#8B5CF6' }}
                  name="Sessões"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-dark-text-secondary">
                Total: <strong className="text-gray-900 dark:text-dark-text">
                  {atividadesData.reduce((sum, item) => sum + (item.sessoes || 0), 0)} atividades
                </strong>
              </span>
              <Button variant="link" className="h-auto p-0">
                Ver relatório →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção inferior - Cards adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Alertas - Materiais com Estoque Crítico */}
        <Card className={estoqueExpandido ? 'lg:col-span-2' : ''}>
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
              {materiaisCriticos.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setEstoqueExpandido(!estoqueExpandido)}
                  >
                    {estoqueExpandido ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Ocultar
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Visualizar
                      </>
                    )}
                  </Button>
                </div>
              )}
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
            ) : !estoqueExpandido ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {materiaisCriticos.slice(0, 5).map((material: any) => {
                  const estoque = material.estoque || material.stock || 0;
                  const estoqueMinimo = material.estoqueMinimo || material.minStock || 5;
                  const isCritico = estoque === 0;
                  
                  return (
                    <div
                      key={material.id || material.sku}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isCritico
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-dark-text truncate">
                          {material.nome || material.name || 'Material sem nome'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-600 dark:text-dark-text-secondary">
                            SKU: {material.sku || 'N/A'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                          <span className={`text-xs font-medium ${
                            isCritico ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'
                          }`}>
                            Estoque: {estoque} {material.unidadeMedida || 'un'}
                          </span>
                        </div>
                      </div>
                      <Badge 
                        variant={isCritico ? "destructive" : "warning"}
                        className="ml-2 flex-shrink-0"
                      >
                        {isCritico ? 'Crítico' : 'Baixo'}
                      </Badge>
                    </div>
                  );
                })}
                {materiaisCriticos.length > 5 && (
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => setEstoqueExpandido(true)}
                  >
                    Ver todos ({materiaisCriticos.length})
                  </Button>
                )}
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
                      {getMateriaisFiltrados().length} {getMateriaisFiltrados().length === 1 ? 'item' : 'itens'}
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
                        {getMateriaisFiltrados().map((material: any) => {
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
                  {getMateriaisFiltrados().length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Nenhum material encontrado com o filtro selecionado.
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-brand-blue" />
              Ações Rápidas
            </CardTitle>
            <CardDescription>Acesso rápido às funcionalidades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-between hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
                onClick={() => onNavigate('Estoque')}
              >
                <span>Gerenciar Estoque</span>
                <ArrowUpRight className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
                onClick={() => onNavigate('Obras')}
              >
                <span>Nova Obra</span>
                <ArrowUpRight className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
                onClick={() => onNavigate('Orçamentos')}
              >
                <span>Criar Orçamento</span>
                <ArrowUpRight className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
                onClick={() => onNavigate('Projetos')}
              >
                <span>Ver Projetos</span>
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>
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

