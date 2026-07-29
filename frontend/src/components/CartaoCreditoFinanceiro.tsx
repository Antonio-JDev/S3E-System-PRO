import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  financeiroService,
  type CartaoCredito,
  type FaturaCartaoPreview,
} from '../services/financeiroService';

interface CartaoCreditoFinanceiroProps {
  toggleSidebar: () => void;
  setAbaAtiva: (aba: string) => void;
}

const MESES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

const emptyForm = {
  nomeOuBanco: '',
  bandeira: 'Visa',
  ultimosQuatroDigitos: '',
  diaFechamento: 10,
  diaVencimento: 17,
};

const CartaoCreditoFinanceiro: React.FC<CartaoCreditoFinanceiroProps> = ({
  toggleSidebar,
  setAbaAtiva,
}) => {
  const hoje = new Date();
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([]);
  const [loadingCartoes, setLoadingCartoes] = useState(true);
  const [modalCartaoOpen, setModalCartaoOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formCartao, setFormCartao] = useState(emptyForm);
  const [salvandoCartao, setSalvandoCartao] = useState(false);

  const [cartaoFiltroId, setCartaoFiltroId] = useState('');
  const [mesCompetencia, setMesCompetencia] = useState(hoje.getMonth() + 1);
  const [anoCompetencia, setAnoCompetencia] = useState(hoje.getFullYear());
  const [preview, setPreview] = useState<FaturaCartaoPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [modalPagarOpen, setModalPagarOpen] = useState(false);
  const [dataPagamento, setDataPagamento] = useState(hoje.toISOString().slice(0, 10));
  const [observacoesPagamento, setObservacoesPagamento] = useState('');
  const [pagando, setPagando] = useState(false);

  const carregarCartoes = useCallback(async () => {
    setLoadingCartoes(true);
    const res = await financeiroService.listarCartoes();
    if (res.success && res.data) {
      setCartoes(res.data);
      if (!cartaoFiltroId && res.data.length > 0) {
        const ativo = res.data.find((c) => c.ativo) || res.data[0];
        setCartaoFiltroId(ativo.id);
      }
    } else {
      toast.error(res.error || 'Erro ao carregar cartões');
    }
    setLoadingCartoes(false);
  }, [cartaoFiltroId]);

  const carregarPreview = useCallback(async () => {
    if (!cartaoFiltroId) {
      setPreview(null);
      return;
    }
    setLoadingPreview(true);
    const res = await financeiroService.previewFaturaCartao({
      cartaoCreditoId: cartaoFiltroId,
      mesCompetencia,
      anoCompetencia,
    });
    if (res.success && res.data) {
      setPreview(res.data);
    } else {
      setPreview(null);
      toast.error(res.error || 'Erro ao carregar lançamentos');
    }
    setLoadingPreview(false);
  }, [cartaoFiltroId, mesCompetencia, anoCompetencia]);

  useEffect(() => {
    carregarCartoes();
  }, []);

  useEffect(() => {
    carregarPreview();
  }, [carregarPreview]);

  const abrirNovoCartao = () => {
    setEditandoId(null);
    setFormCartao(emptyForm);
    setModalCartaoOpen(true);
  };

  const abrirEditarCartao = (c: CartaoCredito) => {
    setEditandoId(c.id);
    setFormCartao({
      nomeOuBanco: c.nomeOuBanco,
      bandeira: c.bandeira,
      ultimosQuatroDigitos: c.ultimosQuatroDigitos,
      diaFechamento: c.diaFechamento,
      diaVencimento: c.diaVencimento,
    });
    setModalCartaoOpen(true);
  };

  const salvarCartao = async () => {
    if (!formCartao.nomeOuBanco.trim()) {
      toast.error('Informe o nome/banco do cartão');
      return;
    }
    if (!/^\d{4}$/.test(formCartao.ultimosQuatroDigitos)) {
      toast.error('Informe exatamente 4 dígitos');
      return;
    }
    setSalvandoCartao(true);
    const res = editandoId
      ? await financeiroService.atualizarCartao(editandoId, formCartao)
      : await financeiroService.criarCartao(formCartao);
    setSalvandoCartao(false);
    if (res.success) {
      toast.success(editandoId ? 'Cartão atualizado' : 'Cartão cadastrado');
      setModalCartaoOpen(false);
      await carregarCartoes();
    } else {
      toast.error(res.error || 'Erro ao salvar cartão');
    }
  };

  const excluirCartao = async (id: string) => {
    if (!confirm('Deseja inativar/excluir este cartão?')) return;
    const res = await financeiroService.excluirCartao(id);
    if (res.success) {
      toast.success('Cartão removido/inativado');
      if (cartaoFiltroId === id) setCartaoFiltroId('');
      await carregarCartoes();
    } else {
      toast.error(res.error || 'Erro ao excluir');
    }
  };

  const confirmarPagamento = async () => {
    if (!cartaoFiltroId) return;
    setPagando(true);
    const res = await financeiroService.gerarEPagarFatura({
      cartaoCreditoId: cartaoFiltroId,
      mesCompetencia,
      anoCompetencia,
      dataPagamento,
      observacoes: observacoesPagamento || undefined,
    });
    setPagando(false);
    if (res.success) {
      toast.success('Fatura liquidada com sucesso');
      setModalPagarOpen(false);
      setObservacoesPagamento('');
      await carregarPreview();
    } else {
      toast.error(res.error || 'Erro ao liquidar fatura');
    }
  };

  const formatBRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const lancamentosPendentes =
    preview?.lancamentos?.filter((l) => l.status !== 'Pago') || [];
  const podePagar = lancamentosPendentes.length > 0;

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-white dark:hover:bg-dark-card"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">
              Cartão de Crédito
            </h1>
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
              Cadastro de cartões e faturamento consolidado
            </p>
          </div>
        </div>
        <button
          onClick={() => setAbaAtiva('dashboard')}
          className="px-4 py-2 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50"
        >
          Voltar ao Dashboard
        </button>
      </header>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setAbaAtiva('dashboard')}
          className="px-6 py-3 rounded-xl font-semibold bg-white text-gray-700 border-2 border-gray-200 hover:bg-emerald-50"
        >
          Dashboard
        </button>
        <button
          onClick={() => setAbaAtiva('pagar')}
          className="px-6 py-3 rounded-xl font-semibold bg-white text-gray-700 border-2 border-gray-200 hover:bg-red-50"
        >
          Contas a Pagar
        </button>
        <button className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-medium">
          Cartão de Crédito
        </button>
      </div>

      {/* Seção 1 — Cartões */}
      <section className="bg-white dark:bg-dark-card rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-text">Cartões cadastrados</h2>
          <button
            onClick={abrirNovoCartao}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700"
          >
            + Novo Cartão
          </button>
        </div>

        {loadingCartoes ? (
          <p className="text-gray-500">Carregando...</p>
        ) : cartoes.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum cartão cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Nome / Banco</th>
                  <th className="py-2 pr-4">Bandeira</th>
                  <th className="py-2 pr-4">Final</th>
                  <th className="py-2 pr-4">Fechamento</th>
                  <th className="py-2 pr-4">Vencimento</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {cartoes.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 dark:border-dark-border">
                    <td className="py-3 pr-4 font-medium text-gray-800 dark:text-dark-text">{c.nomeOuBanco}</td>
                    <td className="py-3 pr-4">{c.bandeira}</td>
                    <td className="py-3 pr-4">•••• {c.ultimosQuatroDigitos}</td>
                    <td className="py-3 pr-4">Dia {c.diaFechamento}</td>
                    <td className="py-3 pr-4">Dia {c.diaVencimento}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                          c.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {c.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3 space-x-2">
                      <button
                        onClick={() => abrirEditarCartao(c)}
                        className="text-indigo-600 font-semibold hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => excluirCartao(c.id)}
                        className="text-red-600 font-semibold hover:underline"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Seção 2 — Fatura */}
      <section className="bg-white dark:bg-dark-card rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-4">
          Lançamentos e fatura
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Cartão</label>
            <select
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
              value={cartaoFiltroId}
              onChange={(e) => setCartaoFiltroId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {cartoes
                .filter((c) => c.ativo)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nomeOuBanco} •••• {c.ultimosQuatroDigitos}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Mês</label>
            <select
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
              value={mesCompetencia}
              onChange={(e) => setMesCompetencia(Number(e.target.value))}
            >
              {MESES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Ano</label>
            <input
              type="number"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
              value={anoCompetencia}
              onChange={(e) => setAnoCompetencia(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 p-5">
            <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">Valor total da fatura</p>
            <p className="text-3xl font-bold text-indigo-900 dark:text-indigo-100 mt-1">
              {formatBRL(preview?.valorTotal || 0)}
            </p>
            {preview?.faturaExistente && (
              <p className="text-xs text-indigo-600 mt-2">
                Fatura existente: {preview.faturaExistente.status} —{' '}
                {formatBRL(preview.faturaExistente.valorTotal)}
              </p>
            )}
          </div>
          <div className="flex items-center">
            <button
              disabled={!podePagar || pagando}
              onClick={() => setModalPagarOpen(true)}
              className={`w-full px-4 py-3 rounded-xl font-semibold text-white ${
                podePagar
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              Fechar e Pagar Fatura
            </button>
          </div>
        </div>

        {loadingPreview ? (
          <p className="text-gray-500">Carregando lançamentos...</p>
        ) : !preview || preview.lancamentos.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-500">
            Nenhum lançamento neste cartão para a competência selecionada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Descrição</th>
                  <th className="py-2 pr-4">Fornecedor / NF</th>
                  <th className="py-2 pr-4">Vencimento</th>
                  <th className="py-2 pr-4">Valor</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.lancamentos.map((l) => (
                  <tr key={l.id} className="border-b border-gray-50">
                    <td className="py-3 pr-4 text-gray-800 dark:text-dark-text">{l.descricao}</td>
                    <td className="py-3 pr-4">
                      {l.compra?.fornecedorNome || l.fornecedor?.nome || '—'}
                      {l.compra?.numeroNF ? ` (NF ${l.compra.numeroNF})` : ''}
                    </td>
                    <td className="py-3 pr-4">
                      {l.dataVencimento
                        ? new Date(l.dataVencimento).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td className="py-3 pr-4 font-semibold">{formatBRL(Number(l.valorParcela))}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                          l.status === 'Pago'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal cartão */}
      {modalCartaoOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                {editandoId ? 'Editar Cartão' : 'Novo Cartão'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome / Banco *</label>
                <input
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
                  value={formCartao.nomeOuBanco}
                  onChange={(e) => setFormCartao({ ...formCartao, nomeOuBanco: e.target.value })}
                  placeholder="Ex: Itaú Corporate"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Bandeira *</label>
                  <select
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
                    value={formCartao.bandeira}
                    onChange={(e) => setFormCartao({ ...formCartao, bandeira: e.target.value })}
                  >
                    <option>Visa</option>
                    <option>Mastercard</option>
                    <option>Elo</option>
                    <option>Amex</option>
                    <option>Hipercard</option>
                    <option>Outra</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">4 últimos dígitos *</label>
                  <input
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
                    maxLength={4}
                    value={formCartao.ultimosQuatroDigitos}
                    onChange={(e) =>
                      setFormCartao({
                        ...formCartao,
                        ultimosQuatroDigitos: e.target.value.replace(/\D/g, '').slice(0, 4),
                      })
                    }
                    placeholder="4321"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Dia fechamento *</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
                    value={formCartao.diaFechamento}
                    onChange={(e) =>
                      setFormCartao({ ...formCartao, diaFechamento: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Dia vencimento *</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
                    value={formCartao.diaVencimento}
                    onChange={(e) =>
                      setFormCartao({ ...formCartao, diaVencimento: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setModalCartaoOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={salvarCartao}
                disabled={salvandoCartao}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {salvandoCartao ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pagar fatura */}
      {modalPagarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Fechar e Pagar Fatura</h3>
              <p className="text-sm text-gray-500 mt-1">
                Total: {formatBRL(preview?.valorTotal || 0)} — {lancamentosPendentes.length} lançamento(s)
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Data do pagamento *</label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Observações</label>
                <textarea
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
                  rows={3}
                  value={observacoesPagamento}
                  onChange={(e) => setObservacoesPagamento(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <p className="text-xs text-gray-500">
                Ao confirmar, as contas vinculadas serão marcadas como Pagas e a saída entrará no extrato de caixa.
              </p>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setModalPagarOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarPagamento}
                disabled={pagando}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {pagando ? 'Processando...' : 'Confirmar pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartaoCreditoFinanceiro;
