import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { financeiroService, type ContaBancaria, type ExtratoContaBancaria } from '../services/financeiroService';

interface TesourariaBancariaProps {
  onTransferenciaLancada: () => void;
  versao?: number;
}

const hojeIso = () => {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
};

const periodoDoMes = () => {
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
  const iso = (data: Date) => {
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${data.getFullYear()}-${mes}-${dia}`;
  };
  return { dataInicio: iso(inicio), dataFim: iso(fim) };
};

const moeda = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const TesourariaBancaria: React.FC<TesourariaBancariaProps> = ({ onTransferenciaLancada, versao = 0 }) => {
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvandoConta, setSalvandoConta] = useState(false);
  const [salvandoTransferencia, setSalvandoTransferencia] = useState(false);
  const [nome, setNome] = useState('');
  const [banco, setBanco] = useState('');
  const [agencia, setAgencia] = useState('');
  const [numeroConta, setNumeroConta] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('');
  const [contaOrigemId, setContaOrigemId] = useState('');
  const [contaDestinoId, setContaDestinoId] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hojeIso);
  const [descricao, setDescricao] = useState('');
  const mesAtual = periodoDoMes();
  const [contaExtratoId, setContaExtratoId] = useState<string | null>(null);
  const [extratoInicio, setExtratoInicio] = useState(mesAtual.dataInicio);
  const [extratoFim, setExtratoFim] = useState(mesAtual.dataFim);
  const [extrato, setExtrato] = useState<ExtratoContaBancaria | null>(null);
  const [carregandoExtrato, setCarregandoExtrato] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    const resposta = await financeiroService.listarContasBancarias();
    if (resposta.success && resposta.data) {
      setContas(resposta.data);
    } else {
      toast.error(resposta.error || 'Erro ao carregar contas bancárias');
    }
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, [versao]);

  const carregarExtrato = async (contaId: string, inicio = extratoInicio, fim = extratoFim) => {
    setCarregandoExtrato(true);
    const resposta = await financeiroService.extratoContaBancaria(contaId, {
      dataInicio: inicio || undefined,
      dataFim: fim || undefined,
    });
    setCarregandoExtrato(false);
    if (!resposta.success || !resposta.data) {
      toast.error(resposta.error || 'Erro ao carregar extrato');
      return;
    }
    setExtrato(resposta.data);
  };

  const abrirExtrato = (contaId: string) => {
    setContaExtratoId(contaId);
    void carregarExtrato(contaId);
  };

  useEffect(() => {
    if (contaExtratoId) void carregarExtrato(contaExtratoId);
    // Recarrega o extrato aberto quando uma transferência muda a lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versao]);

  const ativas = contas.filter((conta) => conta.ativo);

  const cadastrarConta = async (event: React.FormEvent) => {
    event.preventDefault();
    setSalvandoConta(true);
    const resposta = await financeiroService.criarContaBancaria({
      nome,
      banco: banco || undefined,
      agencia: agencia || undefined,
      numeroConta: numeroConta || undefined,
      saldoInicial: saldoInicial === '' ? 0 : Number(saldoInicial.replace(',', '.')),
    });
    setSalvandoConta(false);
    if (!resposta.success) {
      toast.error(resposta.error || 'Erro ao cadastrar conta');
      return;
    }
    toast.success('Conta bancária cadastrada');
    setNome('');
    setBanco('');
    setAgencia('');
    setNumeroConta('');
    setSaldoInicial('');
    await carregar();
  };

  const alternarAtivo = async (conta: ContaBancaria) => {
    const resposta = await financeiroService.definirContaBancariaAtiva(conta.id, !conta.ativo);
    if (!resposta.success) {
      toast.error(resposta.error || 'Erro ao atualizar conta');
      return;
    }
    await carregar();
  };

  const lancarTransferencia = async (event: React.FormEvent) => {
    event.preventDefault();
    if (contaOrigemId === contaDestinoId) {
      toast.error('Escolha contas diferentes');
      return;
    }
    setSalvandoTransferencia(true);
    const resposta = await financeiroService.criarTransferenciaBancaria({
      contaOrigemId,
      contaDestinoId,
      valor: Number(valor.replace(',', '.')),
      data,
      descricao: descricao || undefined,
    });
    setSalvandoTransferencia(false);
    if (!resposta.success) {
      toast.error(resposta.error || 'Erro ao lançar transferência');
      return;
    }
    toast.success('Transferência lançada. O valor não entra como receita.');
    setValor('');
    setDescricao('');
    await carregar();
    onTransferenciaLancada();
  };

  return (
    <div className="card-primary p-4 mb-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text">Contas bancárias</h2>
      <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1 mb-4">
        Transferência entre contas muda o saldo de cada banco. Não entra como receita, venda nem no DRE.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Contas da empresa</h3>
          {carregando ? (
            <p className="text-sm text-gray-500">Carregando contas...</p>
          ) : contas.length === 0 ? (
            <p className="text-sm text-gray-500 mb-3">Nenhuma conta cadastrada. Cadastre banco A, banco B e banco C abaixo.</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {contas.map((conta) => (
                <li
                  key={conta.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-dark-border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">
                      {conta.nome}
                      {!conta.ativo && <span className="ml-2 text-xs font-normal text-gray-500">inativa</span>}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                      {[conta.banco, conta.agencia && `Ag ${conta.agencia}`, conta.numeroConta && `Cc ${conta.numeroConta}`]
                        .filter(Boolean)
                        .join(' · ') || 'Sem agência/conta'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${conta.saldo < 0 ? 'text-red-600' : 'text-blue-700 dark:text-blue-300'}`}>
                      {moeda(conta.saldo)}
                    </p>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => abrirExtrato(conta.id)}
                        className="text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline"
                      >
                        Extrato
                      </button>
                      <button
                        type="button"
                        onClick={() => alternarAtivo(conta)}
                        className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-dark-text"
                      >
                        {conta.ativo ? 'Inativar' : 'Reativar'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={cadastrarConta} className="grid grid-cols-2 gap-2">
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome (ex.: Banco A)"
              className="input-field col-span-2"
            />
            <input value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="Banco" className="input-field" />
            <input value={agencia} onChange={(e) => setAgencia(e.target.value)} placeholder="Agência" className="input-field" />
            <input
              value={numeroConta}
              onChange={(e) => setNumeroConta(e.target.value)}
              placeholder="Número da conta"
              className="input-field"
            />
            <input
              value={saldoInicial}
              onChange={(e) => setSaldoInicial(e.target.value)}
              placeholder="Saldo inicial"
              inputMode="decimal"
              className="input-field"
            />
            <button
              type="submit"
              disabled={salvandoConta}
              className="col-span-2 px-4 py-2 bg-gray-800 text-white rounded-xl font-semibold disabled:opacity-60"
            >
              {salvandoConta ? 'Salvando...' : 'Cadastrar conta'}
            </button>
          </form>
        </div>

        <form onSubmit={lancarTransferencia} className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text">Transferência entre contas</h3>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Conta origem</label>
            <select
              required
              value={contaOrigemId}
              onChange={(e) => setContaOrigemId(e.target.value)}
              className="select-field w-full"
            >
              <option value="">Selecione</option>
              {ativas.map((conta) => (
                <option key={conta.id} value={conta.id}>
                  {conta.nome} ({moeda(conta.saldo)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Conta destino</label>
            <select
              required
              value={contaDestinoId}
              onChange={(e) => setContaDestinoId(e.target.value)}
              className="select-field w-full"
            >
              <option value="">Selecione</option>
              {ativas.map((conta) => (
                <option key={conta.id} value={conta.id}>
                  {conta.nome} ({moeda(conta.saldo)})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Valor</label>
              <input
                required
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Data</label>
              <input
                required
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="input-field w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Descrição</label>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Opcional"
              className="input-field w-full"
            />
          </div>
          <button
            type="submit"
            disabled={salvandoTransferencia || ativas.length < 2}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold disabled:opacity-60"
          >
            {salvandoTransferencia ? 'Lançando...' : 'Lançar transferência'}
          </button>
        </form>
      </div>

      {contaExtratoId && (
        <div className="mt-6 border-t border-gray-200 dark:border-dark-border pt-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-text">
                Extrato {extrato?.conta.nome ? `— ${extrato.conta.nome}` : ''}
              </h3>
              <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                Lançamentos desta conta no período. Recebimentos e pagamentos ainda não escolhem o banco.
              </p>
            </div>
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void carregarExtrato(contaExtratoId);
              }}
            >
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Data início</label>
                <input
                  type="date"
                  value={extratoInicio}
                  onChange={(e) => setExtratoInicio(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Data fim</label>
                <input
                  type="date"
                  value={extratoFim}
                  onChange={(e) => setExtratoFim(e.target.value)}
                  className="input-field"
                />
              </div>
              <button
                type="submit"
                disabled={carregandoExtrato}
                className="px-3 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {carregandoExtrato ? '...' : 'Filtrar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setContaExtratoId(null);
                  setExtrato(null);
                }}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300"
              >
                Fechar
              </button>
            </form>
          </div>
          {extrato && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-sm">
                <p className="rounded-xl border border-gray-200 dark:border-dark-border px-3 py-2">
                  Saldo anterior <strong className="float-right">{moeda(extrato.saldoAnterior)}</strong>
                </p>
                <p className="rounded-xl border border-gray-200 dark:border-dark-border px-3 py-2">
                  Saldo no período <strong className="float-right">{moeda(extrato.saldoFinal)}</strong>
                </p>
              </div>
              {extrato.linhas.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum lançamento nesta conta no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-200 dark:border-dark-border">
                        <th className="py-2 pr-3">Data</th>
                        <th className="py-2 pr-3">Histórico</th>
                        <th className="py-2 pr-3">Conta</th>
                        <th className="py-2 pr-3 text-right">Valor</th>
                        <th className="py-2 text-right">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extrato.linhas.map((linha) => (
                        <tr key={linha.id} className="border-b border-gray-100 dark:border-dark-border">
                          <td className="py-2 pr-3 whitespace-nowrap">
                            {new Date(linha.data).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-2 pr-3">{linha.descricao}</td>
                          <td className="py-2 pr-3">{linha.contraparte || '—'}</td>
                          <td className={`py-2 pr-3 text-right font-semibold ${linha.tipo === 'SAIDA' ? 'text-red-600' : 'text-emerald-700'}`}>
                            {linha.tipo === 'SAIDA' ? '− ' : '+ '}
                            {moeda(linha.valor)}
                          </td>
                          <td className="py-2 text-right">{moeda(linha.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TesourariaBancaria;
