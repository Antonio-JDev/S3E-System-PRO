import React, { useState } from 'react';
import { toast } from 'sonner';
import { axiosApiService } from '../services/axiosApi';
import { getUploadUrl } from '../config/api';
import {
  SystemPdfPage,
  resolveSystemPdfLetterhead,
  renderSystemPdfDocument,
  downloadPdfBlob,
} from '../pdf';

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

  const TABLE_ROWS_PER_PAGE = 20;

  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    if (!arr.length) return [];
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  const fmtMoney = (n: number) =>
    (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const handleGerarRelatorioHTML = async () => {
    try {
      setGerando(true);
      toast.loading('Gerando PDF...', { id: 'relatorio-pdf' });

      const params = new URLSearchParams({
        tipo: formState.tipoRelatorio,
        dataInicio: formState.dataInicio,
        dataFim: formState.dataFim,
      });

      const response = await axiosApiService.get(`/api/relatorios/financeiro/dados?${params}`);

      if (!response.success || !response.data) {
        toast.error('Erro ao carregar dados do relatório', { id: 'relatorio-pdf' });
        return;
      }

      const dados: DadosRelatorio = response.data;
      const letterhead = await resolveSystemPdfLetterhead();
      const logoUrl = getUploadUrl('/uploads/logos/logo-nome-azul.png');
      const periodo = `${new Date(formState.dataInicio).toLocaleDateString('pt-BR')} até ${new Date(formState.dataFim).toLocaleDateString('pt-BR')}`;
      const geradoEm = `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;

      const pageNodes: React.ReactNode[] = [];

      pageNodes.push(
        <SystemPdfPage
          key="capa"
          folhaTimbradaUrl={letterhead.folhaTimbradaDataUrl}
          opacidade={letterhead.opacidade}
          compact
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img
              src={logoUrl}
              alt="S3E Engenharia"
              style={{ maxWidth: 260, height: 'auto', margin: '0 auto 12px', display: 'block' }}
            />
            <h1 style={{ color: '#10B981', fontSize: 22, margin: '0 0 8px' }}>Relatório Financeiro</h1>
            <p style={{ fontSize: 11, color: '#666', margin: 4 }}>Período: {periodo}</p>
            <p style={{ fontSize: 11, color: '#666', margin: 4 }}>Gerado em: {geradoEm}</p>
          </div>
          <h2 style={{ fontSize: 14, color: '#1E293B', borderBottom: '2px solid #E5E7EB', paddingBottom: 6, marginBottom: 12 }}>
            Métricas principais
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              fontSize: 10,
            }}
          >
            {[
              { label: 'Total a Receber', value: dados.totalReceber ?? 0, color: '#10B981' },
              { label: 'Total a Pagar', value: dados.totalPagar ?? 0, color: '#EF4444' },
              {
                label: 'Saldo Previsto',
                value: dados.saldoPrevisto ?? 0,
                color: (dados.saldoPrevisto ?? 0) >= 0 ? '#10B981' : '#EF4444',
              },
              { label: 'Total Faturado', value: dados.totalFaturado ?? 0, color: '#3B82F6' },
              { label: 'Total Pago', value: dados.totalPago ?? 0, color: '#3B82F6' },
              {
                label: 'Lucro Líquido',
                value: dados.lucroLiquido ?? 0,
                color: (dados.lucroLiquido ?? 0) >= 0 ? '#10B981' : '#EF4444',
              },
            ].map((m) => (
              <div
                key={m.label}
                style={{ border: '2px solid #E5E7EB', borderRadius: 6, padding: 10, textAlign: 'center' }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: m.color, marginBottom: 4 }}>
                  R$ {fmtMoney(m.value)}
                </div>
                <div style={{ color: '#666' }}>{m.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 32, textAlign: 'center', fontSize: 10, color: '#666' }}>
            <p>
              <strong>S3E Engenharia</strong> — Sistema de Gestão Empresarial Elétrica
            </p>
          </div>
        </SystemPdfPage>
      );

      const renderContasTable = (
        title: string,
        contas: Conta[],
        valueColor: string,
        keyPrefix: string
      ) => {
        const chunks = chunkArray(contas, TABLE_ROWS_PER_PAGE);
        chunks.forEach((chunk, i) => {
          pageNodes.push(
            <SystemPdfPage
              key={`${keyPrefix}-${i}`}
              folhaTimbradaUrl={letterhead.folhaTimbradaDataUrl}
              opacidade={letterhead.opacidade}
              compact
            >
              <h2 style={{ fontSize: 14, marginBottom: 10, color: '#1E293B' }}>{title}</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead>
                  <tr>
                    {['Descrição', 'Vencimento', 'Status', 'Valor'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: 8,
                          textAlign: h === 'Valor' ? 'right' : 'left',
                          background: '#F3F4F6',
                          borderBottom: '1px solid #E5E7EB',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chunk.map((conta, idx) => (
                    <tr key={`${keyPrefix}-row-${i}-${idx}`}>
                      <td style={{ padding: 8, borderBottom: '1px solid #E5E7EB' }}>
                        {conta.descricao || 'Sem descrição'}
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid #E5E7EB' }}>
                        {conta.dataVencimento
                          ? new Date(conta.dataVencimento).toLocaleDateString('pt-BR')
                          : 'N/A'}
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid #E5E7EB' }}>{conta.status}</td>
                      <td
                        style={{
                          padding: 8,
                          borderBottom: '1px solid #E5E7EB',
                          textAlign: 'right',
                          color: valueColor,
                          fontWeight: 600,
                        }}
                      >
                        R$ {fmtMoney(conta.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SystemPdfPage>
          );
        });
      };

      if (formState.incluirDetalhes && dados.contasReceber?.length) {
        renderContasTable('Contas a Receber', dados.contasReceber, '#10B981', 'receber');
      }
      if (formState.incluirDetalhes && dados.contasPagar?.length) {
        renderContasTable('Contas a Pagar', dados.contasPagar, '#EF4444', 'pagar');
      }

      const totalPages = pageNodes.length;
      const numberedPages = pageNodes.map((node, index) => {
        if (!React.isValidElement(node)) return node;
        return React.cloneElement(node as React.ReactElement, {
          pageNumber: index + 1,
          totalPages,
        });
      });

      const { blob, filename } = await renderSystemPdfDocument({
        filename: `relatorio-financeiro-${formState.dataInicio}-${formState.dataFim}.pdf`,
        letterhead,
        document: <>{numberedPages}</>,
      });

      downloadPdfBlob(blob, filename);
      toast.success('PDF exportado com sucesso!', { id: 'relatorio-pdf' });
    } catch (error: unknown) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório PDF', { id: 'relatorio-pdf' });
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

