import React, { useState, useEffect, useRef } from 'react';
import { financeiroService, type MovimentacaoCaixaItem, type ResumoMovimentacoes, type AtualizarMovimentacaoPayload } from '../services/financeiroService';
import { toast } from 'sonner';
import { AuthContext } from '../contexts/AuthContext';
import { useContext } from 'react';
import { hasPermission } from '../utils/permissions';
import AlertDialog from './ui/AlertDialog';

interface MovimentacoesCaixaProps {
  toggleSidebar?: () => void;
  setAbaAtiva?: (aba: string) => void;
}

const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

const getInicioFimMes = (ano: number, mes: number) => {
  const inicio = new Date(ano, mes, 1);
  const fim = new Date(ano, mes + 1, 0);
  return {
    dataInicio: inicio.toISOString().split('T')[0],
    dataFim: fim.toISOString().split('T')[0]
  };
};

const MovimentacoesCaixa: React.FC<MovimentacoesCaixaProps> = ({ toggleSidebar, setAbaAtiva }) => {
  const now = new Date();
  const [dataInicio, setDataInicio] = useState(() => getInicioFimMes(now.getFullYear(), now.getMonth()).dataInicio);
  const [dataFim, setDataFim] = useState(() => getInicioFimMes(now.getFullYear(), now.getMonth()).dataFim);
  const [categoria, setCategoria] = useState<string>('Todas');
  const [busca, setBusca] = useState('');
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCaixaItem[]>([]);
  const [resumo, setResumo] = useState<ResumoMovimentacoes | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext)!;
  const [showDesfazerDialog, setShowDesfazerDialog] = useState(false);
  const [contaToDesfazer, setContaToDesfazer] = useState<MovimentacaoCaixaItem | null>(null);
  const [motivoDesfazer, setMotivoDesfazer] = useState('');
  const [processingDesfazer, setProcessingDesfazer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [movimentacaoToEdit, setMovimentacaoToEdit] = useState<MovimentacaoCaixaItem | null>(null);
  const [editForm, setEditForm] = useState<AtualizarMovimentacaoPayload>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [movimentacaoToView, setMovimentacaoToView] = useState<MovimentacaoCaixaItem | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const CATEGORIAS_SAIDA = ['Fornecedor', 'Recursos Humanos', 'Despesa Fixa', 'Frota'];
  const MEIOS_PAGAMENTO = [
    { value: 'PIX', label: 'PIX' },
    { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
    { value: 'CARTAO_DEBITO', label: 'Cartão de Débito' },
    { value: 'BOLETO', label: 'Boleto' },
    { value: 'TRANSFERENCIA', label: 'Transferência' },
    { value: 'DINHEIRO', label: 'Dinheiro' }
  ];
  // Audit panel removed from this page (logs centralizados na página Logs)

  const loadMovimentacoes = async () => {
    setLoading(true);
    try {
      const response = await financeiroService.listarMovimentacoesCaixa({
        dataInicio,
        dataFim,
        categoria: categoria === 'Todas' ? undefined : categoria,
        busca: busca.trim() || undefined
      });
      if (response.success && response.data) {
        setMovimentacoes(response.data.movimentacoes);
        setResumo(response.data.resumo);
      } else {
        setMovimentacoes([]);
        setResumo(null);
        toast.error(response.error || 'Erro ao carregar movimentações');
      }
    } catch (e) {
      setMovimentacoes([]);
      setResumo(null);
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovimentacoes();
  }, [dataInicio, dataFim, categoria]);

  const handleBuscar = () => {
    loadMovimentacoes();
  };

  const abrirDesfazerDialog = (m: MovimentacaoCaixaItem) => {
    setContaToDesfazer(m);
    setMotivoDesfazer('');
    setShowDesfazerDialog(true);
  };

  const confirmarDesfazer = async () => {
    if (!contaToDesfazer) return;
    setProcessingDesfazer(true);
    try {
      const res = await financeiroService.desfazerPagamento(contaToDesfazer.id, motivoDesfazer || undefined);
      if (res.success) {
        toast.success(
          contaToDesfazer.tipo === 'ENTRADA' ? 'Recebimento desfeito com sucesso' : 'Pagamento desfeito com sucesso'
        );
        setShowDesfazerDialog(false);
        setContaToDesfazer(null);
        await loadMovimentacoes();
      } else {
        toast.error(res.error || 'Erro ao desfazer movimentação');
      }
    } catch (err) {
      toast.error('Erro de conexão ao desfazer movimentação');
    } finally {
      setProcessingDesfazer(false);
    }
  };

  const abrirModalEditar = (m: MovimentacaoCaixaItem) => {
    const dataPagamentoStr =
      typeof m.dataPagamento === 'string'
        ? m.dataPagamento.split('T')[0]
        : new Date(m.dataPagamento).toISOString().split('T')[0];
    setMovimentacaoToEdit(m);
    setEditForm({
      dataPagamento: dataPagamentoStr,
      descricao: m.descricao,
      categoria: m.tipo === 'SAIDA' ? m.categoria : undefined,
      valor: m.valorBase ?? m.valor,
      valorJuros: m.valorJuros ?? 0,
      valorDesconto: m.valorDesconto ?? 0,
      meioPagamento: m.meioPagamento || undefined
    });
    setShowEditModal(true);
  };

  const fecharModalEditar = () => {
    setShowEditModal(false);
    setMovimentacaoToEdit(null);
    setEditForm({});
  };

  const abrirModalDetalhes = (m: MovimentacaoCaixaItem) => {
    setMovimentacaoToView(m);
    setShowDetalhesModal(true);
  };

  const fecharModalDetalhes = () => {
    setShowDetalhesModal(false);
    setMovimentacaoToView(null);
  };

  const salvarEdicao = async () => {
    if (!movimentacaoToEdit) return;
    setSavingEdit(true);
    try {
      const payload: AtualizarMovimentacaoPayload = {
        dataPagamento: editForm.dataPagamento,
        descricao: editForm.descricao,
        valor: editForm.valor,
        valorJuros: editForm.valorJuros,
        valorDesconto: editForm.valorDesconto,
        meioPagamento: editForm.meioPagamento
      };
      if (movimentacaoToEdit.tipo === 'SAIDA' && editForm.categoria) payload.categoria = editForm.categoria;

      const res = await financeiroService.atualizarMovimentacao(movimentacaoToEdit.id, payload);
      if (res.success) {
        toast.success('Movimentação atualizada. Alterações refletem no Fluxo de Caixa.');
        fecharModalEditar();
        await loadMovimentacoes();
      } else {
        toast.error(res.error || 'Erro ao atualizar movimentação');
      }
    } catch (err) {
      toast.error('Erro de conexão ao atualizar');
    } finally {
      setSavingEdit(false);
    }
  };

  const valorEfetivoEdit = () => {
    const v = Number(editForm.valor) || 0;
    const j = Number(editForm.valorJuros) || 0;
    const d = Number(editForm.valorDesconto) || 0;
    return v + j - d;
  };

  const handleExportarPDF = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Não foi possível abrir a janela de impressão');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Extrato Movimentações de Caixa - ${dataInicio} a ${dataFim}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { font-size: 18px; margin-bottom: 8px; }
            .periodo { font-size: 12px; color: #666; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
            th { background: #f5f5f5; }
            .entrada { color: #059669; }
            .saida { color: #dc2626; }
            .resumo { margin-top: 16px; display: flex; gap: 24px; flex-wrap: wrap; }
            .resumo span { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Movimentações de Caixa (Extrato)</h1>
          <p class="periodo">Período: ${new Date(dataInicio).toLocaleDateString('pt-BR')} a ${new Date(dataFim).toLocaleDateString('pt-BR')}</p>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Meio</th>
              </tr>
            </thead>
            <tbody>
              ${movimentacoes
                .map(
                  (m) =>
                    `<tr>
                <td>${new Date(m.dataPagamento).toLocaleDateString('pt-BR')}</td>
                <td>${m.descricao}</td>
                <td>${m.categoria}</td>
                <td class="${m.tipo === 'ENTRADA' ? 'entrada' : 'saida'}">${m.tipo === 'ENTRADA' ? '+' : '-'} R$ ${m.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td>${m.meioPagamento || '-'}</td>
              </tr>`
                )
                .join('')}
            </tbody>
          </table>
          <div class="resumo" style="margin-top: 16px;">
            <span>Entradas: R$ ${(resumo?.entradasTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span>Saídas: R$ ${(resumo?.saidasTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span>Saldo: R$ ${(resumo?.saldoConta ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <p style="margin-top: 20px; font-size: 10px; color: #888;">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
    toast.success('Use a janela de impressão e escolha "Salvar como PDF" para exportar.');
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-white dark:hover:bg-dark-card hover:shadow-soft"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">
              Movimentações de Caixa (Extrato)
            </h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">
              Histórico de entradas e saídas realizadas — Livro Caixa
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportarPDF}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all shadow-md font-semibold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar PDF
          </button>
          {setAbaAtiva && (
            <button
              onClick={() => setAbaAtiva('dashboard')}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-dark-text rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold"
            >
              ← Voltar ao Dashboard
            </button>
          )}
          {/* Auditoria removida desta página — use a página "Logs" (Desenvolvedor) */}
        </div>
      </header>

      {/* Filtros */}
      <div className="card-primary p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Data início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Data fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="select-field"
            >
              <option value="Todas">Todas</option>
              <option value="Venda">Venda</option>
              <option value="Fornecedor">Fornecedor</option>
              <option value="Despesa Fixa">Despesa Fixa</option>
              <option value="Recursos Humanos">Recursos Humanos</option>
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Buscar (nome, categoria)</label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
              placeholder="Buscar..."
              className="input-field w-full"
            />
          </div>
          <button
            onClick={handleBuscar}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold"
          >
            Filtrar
          </button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div ref={printRef} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-green-700 dark:text-green-400">Entradas Totais (período)</p>
          <p className="text-2xl font-bold text-green-800 dark:text-green-300 mt-1">
            R$ {(resumo?.entradasTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">Saídas Totais (período)</p>
          <p className="text-2xl font-bold text-red-800 dark:text-red-300 mt-1">
            R$ {(resumo?.saidasTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Saldo em Conta</p>
          <p className="text-2xl font-bold text-blue-800 dark:text-blue-300 mt-1">
            R$ {(resumo?.saldoConta ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Tabela */}
      <div className="card-primary overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Carregando movimentações...</div>
        ) : movimentacoes.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Nenhuma movimentação no período. Ajuste os filtros ou dê baixa em contas a receber/pagar para ver o extrato aqui.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-dark-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-dark-text uppercase">Data do Pagamento</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-dark-text uppercase">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-dark-text uppercase">Categoria</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-dark-text uppercase">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-dark-text uppercase">Meio de Pagamento</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-dark-text uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                {movimentacoes.map((m) => (
                  <tr key={`${m.origem}-${m.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-dark-text whitespace-nowrap">
                      {new Date(m.dataPagamento).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-dark-text">{m.descricao}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-dark-text-secondary">{m.categoria}</td>
                    <td
                      className={`px-4 py-3 text-sm font-semibold text-right ${
                        m.tipo === 'ENTRADA' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {m.tipo === 'ENTRADA' ? '+' : '-'} R$ {m.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-dark-text-secondary">{m.meioPagamento || '—'}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => abrirModalDetalhes(m)}
                          className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-dark-text rounded-lg transition-colors"
                          title="Ver detalhes"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        {hasPermission(user, 'view_financeiro') && (
                          <>
                            <button
                              onClick={() => abrirModalEditar(m)}
                              className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              title="Editar movimentação (conciliação bancária)"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => abrirDesfazerDialog(m)}
                              className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 font-semibold"
                              title={m.tipo === 'ENTRADA' ? 'Desfazer recebimento' : 'Desfazer pagamento'}
                            >
                              Desfazer
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Dialogo de desfazer pagamento */}
      <AlertDialog
        isOpen={showDesfazerDialog}
        onClose={() => setShowDesfazerDialog(false)}
        onConfirm={confirmarDesfazer}
        title={contaToDesfazer?.tipo === 'ENTRADA' ? 'Desfazer recebimento' : 'Desfazer pagamento'}
        message={
          contaToDesfazer?.tipo === 'ENTRADA'
            ? 'Tem certeza que deseja desfazer este recebimento? O valor será estornado na duplicata e o status será recalculado (pendente ou parcial).'
            : 'Tem certeza que deseja desfazer este pagamento? Esta ação irá marcar a parcela como pendente novamente.'
        }
        confirmText={processingDesfazer ? 'Processando...' : 'Desfazer'}
        variant="warning"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">Informe o motivo (opcional):</p>
          <textarea value={motivoDesfazer} onChange={(e) => setMotivoDesfazer(e.target.value)} className="w-full p-3 border rounded-lg" rows={3} />
        </div>
      </AlertDialog>

      {/* Modal Ver detalhes da conta paga */}
      {showDetalhesModal && movimentacaoToView && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-dark-border">
            <div className="p-6 border-b border-gray-200 dark:border-dark-border flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                  {movimentacaoToView.tipo === 'ENTRADA' ? 'Detalhes do recebimento' : 'Detalhes da conta paga'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                  Dados da movimentação registrada
                </p>
              </div>
              <button
                type="button"
                onClick={fecharModalDetalhes}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                aria-label="Fechar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">
                  {movimentacaoToView.tipo === 'ENTRADA' ? 'Data do recebimento' : 'Data do pagamento'}
                </label>
                <p className="text-gray-900 dark:text-dark-text">
                  {typeof movimentacaoToView.dataPagamento === 'string'
                    ? new Date(movimentacaoToView.dataPagamento).toLocaleDateString('pt-BR')
                    : new Date(movimentacaoToView.dataPagamento).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Descrição</label>
                <p className="text-gray-900 dark:text-dark-text">{movimentacaoToView.descricao}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Categoria</label>
                <p className="text-gray-900 dark:text-dark-text">{movimentacaoToView.categoria}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Valor</label>
                  <p className={`text-lg font-bold ${movimentacaoToView.tipo === 'ENTRADA' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {movimentacaoToView.tipo === 'ENTRADA' ? '+' : '-'} R$ {movimentacaoToView.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  {(movimentacaoToView.valorJuros !== undefined && movimentacaoToView.valorJuros > 0) || (movimentacaoToView.valorDesconto !== undefined && movimentacaoToView.valorDesconto > 0) ? (
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                      Base R$ {movimentacaoToView.valorBase?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) ?? '—'}
                      {movimentacaoToView.valorJuros ? ` + juros R$ ${movimentacaoToView.valorJuros.toFixed(2)}` : ''}
                      {movimentacaoToView.valorDesconto ? ` - desconto R$ ${movimentacaoToView.valorDesconto.toFixed(2)}` : ''}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Meio de pagamento</label>
                  <p className="text-gray-900 dark:text-dark-text">{movimentacaoToView.meioPagamento || '—'}</p>
                </div>
              </div>
              {movimentacaoToView.observacoes && movimentacaoToView.observacoes.trim() && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <label className="block text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">Descrição / Justificativa</label>
                  <p className="text-amber-900 dark:text-amber-100 text-sm whitespace-pre-wrap">{movimentacaoToView.observacoes}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-dark-border flex justify-end">
              <button
                type="button"
                onClick={fecharModalDetalhes}
                className="px-4 py-2 text-gray-700 dark:text-dark-text bg-gray-100 dark:bg-dark-hover rounded-lg hover:bg-gray-200 font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar movimentação (conciliação bancária) */}
      {showEditModal && movimentacaoToEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-dark-border">
            <div className="p-6 border-b border-gray-200 dark:border-dark-border">
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">Editar movimentação</h2>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                Conciliação bancária — alterações refletem no Fluxo de Caixa
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">
                  {movimentacaoToEdit.tipo === 'ENTRADA' ? 'Data do recebimento *' : 'Data do pagamento *'}
                </label>
                <input
                  type="date"
                  value={editForm.dataPagamento ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, dataPagamento: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Descrição *</label>
                <input
                  type="text"
                  value={editForm.descricao ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, descricao: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Descrição da movimentação"
                />
              </div>
              {movimentacaoToEdit.tipo === 'SAIDA' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Categoria</label>
                  <select
                    value={editForm.categoria ?? movimentacaoToEdit.categoria}
                    onChange={(e) => setEditForm((f) => ({ ...f, categoria: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIAS_SAIDA.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.valor !== undefined && editForm.valor !== null ? editForm.valor : ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditForm((f) => ({ ...f, valor: v === '' ? undefined : parseFloat(v) }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Juros (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.valorJuros ?? 0}
                    onChange={(e) => setEditForm((f) => ({ ...f, valorJuros: e.target.value ? parseFloat(e.target.value) : 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Desconto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.valorDesconto ?? 0}
                    onChange={(e) => setEditForm((f) => ({ ...f, valorDesconto: e.target.value ? parseFloat(e.target.value) : 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-dark-text">Valor efetivo: </span>
                <span className="text-lg font-bold text-gray-900 dark:text-dark-text">
                  R$ {valorEfetivoEdit().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Meio de pagamento</label>
                <select
                  value={editForm.meioPagamento ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, meioPagamento: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">—</option>
                  {MEIOS_PAGAMENTO.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-dark-border flex justify-end gap-3">
              <button
                type="button"
                onClick={fecharModalEditar}
                className="px-4 py-2 text-gray-700 dark:text-dark-text bg-gray-100 dark:bg-dark-hover rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarEdicao}
                disabled={savingEdit || !editForm.dataPagamento || editForm.descricao === undefined || editForm.valor === undefined}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {savingEdit ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AuditLogsPanel removed from this page */}
    </div>
  );
};

export default MovimentacoesCaixa;
