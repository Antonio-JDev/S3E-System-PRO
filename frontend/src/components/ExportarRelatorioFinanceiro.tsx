import React, { useState } from 'react';
import { toast } from 'sonner';
import { axiosApiService } from '../services/axiosApi';
import { API_CONFIG, getUploadUrl } from '../config/api';

interface ExportarRelatorioFinanceiroProps {
  setAbaAtiva: (aba: string) => void;
  toggleSidebar: () => void;
}

// Interfaces para os dados do relatório
interface Conta {
  descricao?: string;
  dataVencimento?: string;
  status: string;
  valor: number;
}

interface GraficoData {
  labels?: string[];
  datasets?: any[];
  [key: string]: any;
}

interface DadosRelatorio {
  totalReceber?: number;
  totalPagar?: number;
  saldoPrevisto?: number;
  totalFaturado?: number;
  totalPago?: number;
  lucroLiquido?: number;
  contasReceber?: Conta[];
  contasPagar?: Conta[];
  graficos?: GraficoData;
}

// Icons
const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

const DocumentArrowDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const ExportarRelatorioFinanceiro: React.FC<ExportarRelatorioFinanceiroProps> = ({ setAbaAtiva, toggleSidebar }) => {
  const [gerando, setGerando] = useState(false);
  const [formState, setFormState] = useState({
    tipoRelatorio: 'completo',
    formato: 'pdf',
    dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dataFim: new Date().toISOString().split('T')[0],
    incluirGraficos: true,
    incluirDetalhes: true
  });

  const handleExportar = async () => {
    if (!formState.dataInicio || !formState.dataFim) {
      toast.error('Por favor, selecione o período para o relatório');
      return;
    }

    if (new Date(formState.dataInicio) > new Date(formState.dataFim)) {
      toast.error('Data de início não pode ser maior que data de fim');
      return;
    }

    // Se formato for PDF, usar visualização HTML
    if (formState.formato === 'pdf') {
      handleGerarRelatorioHTML();
      return;
    }

    // Para JSON, exportar dados como JSON
    if (formState.formato === 'json') {
      handleExportarJSON();
      return;
    }
  };

  const handleExportarJSON = async () => {
    try {
      setGerando(true);

      // Buscar dados do período
      const params = new URLSearchParams({
        tipo: formState.tipoRelatorio,
        dataInicio: formState.dataInicio,
        dataFim: formState.dataFim
      });

      const response = await axiosApiService.get(`/api/relatorios/financeiro/dados?${params}`);

      if (!response.success || !response.data) {
        toast.error('Erro ao carregar dados do relatório');
        return;
      }

      const dados: DadosRelatorio = response.data;

      // Criar objeto JSON com todos os dados
      const jsonData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        periodo: {
          dataInicio: formState.dataInicio,
          dataFim: formState.dataFim,
          tipoRelatorio: formState.tipoRelatorio
        },
        resumo: {
          totalReceber: dados.totalReceber || 0,
          totalPagar: dados.totalPagar || 0,
          saldoPrevisto: dados.saldoPrevisto || 0,
          totalFaturado: dados.totalFaturado || 0,
          totalPago: dados.totalPago || 0,
          lucroLiquido: dados.lucroLiquido || 0
        },
        contasReceber: formState.incluirDetalhes && dados.contasReceber ? dados.contasReceber : [],
        contasPagar: formState.incluirDetalhes && dados.contasPagar ? dados.contasPagar : [],
        graficos: formState.incluirGraficos && dados.graficos ? dados.graficos : null
      };

      // Criar e baixar arquivo JSON
      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-financeiro-${formState.dataInicio}_${formState.dataFim}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('✅ Relatório JSON exportado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao exportar JSON:', error);
      toast.error('❌ Erro ao exportar relatório JSON');
    } finally {
      setGerando(false);
    }
  };

  const handleGerarRelatorioHTML = async () => {
    try {
      setGerando(true);

      // Buscar dados do período
      const params = new URLSearchParams({
        tipo: formState.tipoRelatorio,
        dataInicio: formState.dataInicio,
        dataFim: formState.dataFim
      });

      const response = await axiosApiService.get(`/api/relatorios/financeiro/dados?${params}`);

      if (!response.success || !response.data) {
        toast.error('Erro ao carregar dados do relatório');
        return;
      }

      const dados: DadosRelatorio = response.data;

      // Obter URL completa do logo
      const logoUrl = getUploadUrl('/uploads/logos/logo-nome-azul.png');

      // Abrir nova janela
      const relatorioWindow = window.open('', '_blank');
      
      if (!relatorioWindow) {
        toast.error('❌ Bloqueador de pop-ups ativado. Permita pop-ups para gerar o relatório.');
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Relatório Financeiro - S3E Engenharia</title>
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
              border-bottom: 3px solid #10B981;
            }
            .header img {
              display: block;
              margin: 0 auto 15px auto;
              max-width: 300px;
              height: auto;
            }
            .header h1 {
              color: #10B981;
              font-size: 32px;
              margin-bottom: 10px;
            }
            .header p {
              color: #666;
              font-size: 14px;
              margin-top: 5px;
            }
            .section {
              margin-bottom: 30px;
              page-break-inside: avoid;
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
              grid-template-columns: repeat(3, 1fr);
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
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 8px;
            }
            .metric-card .label {
              font-size: 14px;
              color: #666;
            }
            .positive { color: #10B981; }
            .negative { color: #EF4444; }
            .neutral { color: #3B82F6; }
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
            <img src="${logoUrl}" alt="S3E Engenharia" style="max-width: 300px; height: auto; margin-bottom: 20px;" onerror="this.style.display='none';" />
            <h1>💰 S3E Engenharia</h1>
            <p><strong>Relatório Financeiro</strong></p>
            <p>Período: ${new Date(formState.dataInicio).toLocaleDateString('pt-BR')} até ${new Date(formState.dataFim).toLocaleDateString('pt-BR')}</p>
            <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
          </div>

          <div class="section">
            <h2>📊 Métricas Principais</h2>
            <div class="metrics">
              <div class="metric-card">
                <div class="value positive">R$ ${(dados.totalReceber || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div class="label">Total a Receber</div>
              </div>
              <div class="metric-card">
                <div class="value negative">R$ ${(dados.totalPagar || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div class="label">Total a Pagar</div>
              </div>
              <div class="metric-card">
                <div class="value ${(dados.saldoPrevisto || 0) >= 0 ? 'positive' : 'negative'}">R$ ${(dados.saldoPrevisto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div class="label">Saldo Previsto</div>
              </div>
              <div class="metric-card">
                <div class="value neutral">R$ ${(dados.totalFaturado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div class="label">Total Faturado</div>
              </div>
              <div class="metric-card">
                <div class="value neutral">R$ ${(dados.totalPago || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div class="label">Total Pago</div>
              </div>
              <div class="metric-card">
                <div class="value ${(dados.lucroLiquido || 0) >= 0 ? 'positive' : 'negative'}">R$ ${(dados.lucroLiquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div class="label">Lucro Líquido</div>
              </div>
            </div>
          </div>

          ${formState.incluirDetalhes && dados.contasReceber && dados.contasReceber.length > 0 ? `
          <div class="section">
            <h2>📈 Contas a Receber</h2>
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th style="text-align: right;">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${dados.contasReceber.map((conta: any) => `
                  <tr>
                    <td>${conta.descricao || 'Sem descrição'}</td>
                    <td>${conta.dataVencimento ? new Date(conta.dataVencimento).toLocaleDateString('pt-BR') : 'N/A'}</td>
                    <td>${conta.status}</td>
                    <td style="text-align: right; color: #10B981; font-weight: 600;">R$ ${(conta.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${formState.incluirDetalhes && dados.contasPagar && dados.contasPagar.length > 0 ? `
          <div class="section">
            <h2>📉 Contas a Pagar</h2>
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th style="text-align: right;">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${dados.contasPagar.map((conta: any) => `
                  <tr>
                    <td>${conta.descricao || 'Sem descrição'}</td>
                    <td>${conta.dataVencimento ? new Date(conta.dataVencimento).toLocaleDateString('pt-BR') : 'N/A'}</td>
                    <td>${conta.status}</td>
                    <td style="text-align: right; color: #EF4444; font-weight: 600;">R$ ${(conta.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          <div class="footer">
            <p><strong>S3E Engenharia</strong> - Sistema de Gestão Empresarial Elétrica</p>
            <p>Relatório gerado automaticamente pelo sistema</p>
            <p class="no-print" style="margin-top: 20px;">
              <button onclick="window.print()" style="padding: 12px 24px; background: #10B981; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">
                🖨️ Imprimir / Salvar como PDF
              </button>
              <button onclick="window.close()" style="padding: 12px 24px; background: #6B7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; margin-left: 10px;">
                ✖️ Fechar
              </button>
            </p>
          </div>
        </body>
        </html>
      `;
      
      relatorioWindow.document.write(html);
      relatorioWindow.document.close();
      
      toast.success('✅ Relatório aberto em nova aba!');
    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('❌ Erro ao gerar relatório');
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in">
        <div className="flex items-center gap-4">
          <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-white dark:hover:bg-dark-card hover:shadow-soft transition-colors">
            <Bars3Icon className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">Exportar Relatório Financeiro</h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">Gere relatórios personalizados em PDF ou JSON</p>
          </div>
        </div>
        <button
          onClick={() => setAbaAtiva('dashboard')}
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-semibold"
        >
          ← Voltar ao Dashboard
        </button>
      </header>

      {/* Formulário de Exportação */}
      <div className="max-w-4xl mx-auto">
        <div className="card-primary rounded-2xl shadow-lg border-2 border-gray-200 dark:border-dark-border p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl flex items-center justify-center">
              <DocumentArrowDownIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Configurações do Relatório</h2>
              <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Personalize seu relatório financeiro</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Tipo de Relatório */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-3">
                Tipo de Relatório
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setFormState({ ...formState, tipoRelatorio: 'completo' })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formState.tipoRelatorio === 'completo'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-400'
                      : 'border-gray-300 dark:border-dark-border hover:border-purple-300 dark:hover:border-purple-600'
                  }`}
                >
                  <p className="font-bold text-gray-900 dark:text-dark-text">📊 Completo</p>
                  <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
                    Todas as métricas e gráficos
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormState({ ...formState, tipoRelatorio: 'receber' })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formState.tipoRelatorio === 'receber'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-400'
                      : 'border-gray-300 dark:border-dark-border hover:border-green-300 dark:hover:border-green-600'
                  }`}
                >
                  <p className="font-bold text-gray-900 dark:text-dark-text">📈 Contas a Receber</p>
                  <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
                    Apenas receitas
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormState({ ...formState, tipoRelatorio: 'pagar' })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formState.tipoRelatorio === 'pagar'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-400'
                      : 'border-gray-300 dark:border-dark-border hover:border-red-300 dark:hover:border-red-600'
                  }`}
                >
                  <p className="font-bold text-gray-900 dark:text-dark-text">📉 Contas a Pagar</p>
                  <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
                    Apenas despesas
                  </p>
                </button>
              </div>
            </div>

            {/* Período */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                  Data de Início
                </label>
                <input
                  type="date"
                  value={formState.dataInicio}
                  onChange={(e) => setFormState({ ...formState, dataInicio: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                  Data de Fim
                </label>
                <input
                  type="date"
                  value={formState.dataFim}
                  onChange={(e) => setFormState({ ...formState, dataFim: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
            </div>

            {/* Formato */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-3">
                Formato de Exportação
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormState({ ...formState, formato: 'pdf' })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formState.formato === 'pdf'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-400'
                      : 'border-gray-300 dark:border-dark-border hover:border-red-300 dark:hover:border-red-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div className="text-left">
                      <p className="font-bold text-gray-900 dark:text-dark-text">PDF</p>
                      <p className="text-xs text-gray-600 dark:text-dark-text-secondary">Ideal para visualização</p>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormState({ ...formState, formato: 'json' })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formState.formato === 'json'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                      : 'border-gray-300 dark:border-dark-border hover:border-blue-300 dark:hover:border-blue-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <div className="text-left">
                      <p className="font-bold text-gray-900 dark:text-dark-text">JSON</p>
                      <p className="text-xs text-gray-600 dark:text-dark-text-secondary">Ideal para análise de dados</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Opções Adicionais */}
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-dark-border">
              <h3 className="font-semibold text-gray-900 dark:text-dark-text mb-3">Opções Adicionais</h3>
              
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formState.incluirGraficos}
                  onChange={(e) => setFormState({ ...formState, incluirGraficos: e.target.checked })}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-dark-text group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Incluir Gráficos
                  </p>
                  <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                    Gráficos de fluxo de caixa e evolução mensal
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formState.incluirDetalhes}
                  onChange={(e) => setFormState({ ...formState, incluirDetalhes: e.target.checked })}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-dark-text group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Incluir Detalhes de Transações
                  </p>
                  <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                    Lista completa de todas as contas a receber e pagar
                  </p>
                </div>
              </label>
            </div>

            {/* Preview de Informações */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">📄 Seu relatório incluirá:</h4>
              <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
                <li>✓ Resumo financeiro do período</li>
                <li>✓ Total a receber e a pagar</li>
                <li>✓ Saldo e lucro líquido</li>
                {formState.incluirGraficos && <li>✓ Gráficos de fluxo de caixa</li>}
                {formState.incluirDetalhes && <li>✓ Detalhamento de todas as transações</li>}
                {formState.tipoRelatorio === 'completo' && <li>✓ Análise comparativa mensal</li>}
              </ul>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleExportar}
                disabled={gerando}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {gerando ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Gerando...
                  </>
                ) : (
                  <>
                    <DocumentArrowDownIcon className="w-5 h-5" />
                    Exportar Relatório {formState.formato.toUpperCase()}
                  </>
                )}
              </button>
              <button
                onClick={() => setAbaAtiva('dashboard')}
                disabled={gerando}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </div>

          {/* Informações Adicionais */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <h4 className="font-semibold text-red-900 dark:text-red-300 mb-2">📄 Relatório PDF</h4>
              <p className="text-sm text-gray-700 dark:text-dark-text">
                Ideal para apresentações e impressão. Inclui logo da empresa, formatação profissional e gráficos visuais.
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">📊 Relatório JSON</h4>
              <p className="text-sm text-gray-700 dark:text-dark-text">
                Ideal para análise de dados. Formato estruturado que permite integração com outros sistemas e processamento programático.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportarRelatorioFinanceiro;

