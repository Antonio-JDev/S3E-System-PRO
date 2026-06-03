import React, { useState } from 'react';
import {
  type ContaReceberAuditoria,
  totalCaixaConta,
  totalJurosVenda,
} from '../../utils/contaReceberAuditoria';

const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Props = {
  contas: ContaReceberAuditoria[];
  numeroParcelas?: number;
  parcelas?: number;
};

const ParcelasVendaAuditoriaTable: React.FC<Props> = ({
  contas,
  numeroParcelas,
  parcelas,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sorted = [...contas].sort((a, b) => (a.numeroParcela || 0) - (b.numeroParcela || 0));
  const totalParcelasRef =
    numeroParcelas ||
    parcelas ||
    contas.filter((c) => (c.numeroParcela || 0) > 0).length;
  const jurosTotal = totalJurosVenda(contas);

  return (
    <div className="mt-4">
      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        📋 Detalhamento da Entrada e Parcelas
      </h5>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white dark:bg-gray-800 rounded-lg min-w-[720px]">
          <thead>
            <tr className="bg-purple-100 dark:bg-purple-900/50">
              <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-300 border border-purple-200 dark:border-purple-700">
                Parcela
              </th>
              <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 dark:text-gray-300 border border-purple-200 dark:border-purple-700">
                Valor parcela
              </th>
              <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 dark:text-gray-300 border border-purple-200 dark:border-purple-700">
                Principal recebido
              </th>
              <th className="px-3 py-2 text-right text-xs font-bold text-amber-800 dark:text-amber-300 border border-purple-200 dark:border-purple-700">
                Juros por atraso
              </th>
              <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 dark:text-gray-300 border border-purple-200 dark:border-purple-700">
                Total em caixa
              </th>
              <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-300 border border-purple-200 dark:border-purple-700">
                Vencimento
              </th>
              <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-300 border border-purple-200 dark:border-purple-700">
                Status
              </th>
              <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-300 border border-purple-200 dark:border-purple-700">
                Data pagamento
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((conta, index) => {
              const isEntrada =
                conta.numeroParcela === 0 || conta.descricao?.includes('Entrada');
              const isPago = conta.status === 'Pago' || conta.status === 'Recebido';
              const isRecebidoParcial = conta.status === 'Recebido Parcial';
              const isAtrasado =
                !isPago &&
                !isRecebidoParcial &&
                conta.dataVencimento &&
                new Date(conta.dataVencimento) < new Date();
              const statusClass = isPago
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : isRecebidoParcial
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  : isAtrasado
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
              const statusText = isPago
                ? 'Pago'
                : isRecebidoParcial
                  ? 'Recebido Parcial'
                  : isAtrasado
                    ? 'Atrasado'
                    : 'Pendente';
              const juros = Number(conta.valorJuros ?? 0);
              const principalRec = Number(conta.valorRecebido ?? 0);
              const totalCaixa = totalCaixaConta(conta);
              const parciais = conta.recebimentosParciais ?? [];
              const rowId = conta.id || String(index);
              const hasHistorico = parciais.length > 0;

              return (
                <React.Fragment key={rowId}>
                  <tr
                    className={`hover:bg-purple-50 dark:hover:bg-purple-900/20 ${isEntrada ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                  >
                    <td className="px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white border border-purple-200 dark:border-purple-700">
                      {isEntrada ? (
                        <span className="flex items-center gap-1">
                          <span className="text-blue-600 dark:text-blue-400">💰</span>
                          <span>Entrada</span>
                        </span>
                      ) : (
                        `${conta.numeroParcela || index + 1}/${totalParcelasRef || '—'}`
                      )}
                      {hasHistorico && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(expandedId === rowId ? null : rowId)
                          }
                          className="ml-2 text-[10px] text-purple-600 underline"
                        >
                          {expandedId === rowId ? 'Ocultar' : 'Histórico'}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm font-bold text-right border border-purple-200 dark:border-purple-700">
                      R$ {fmt(Number(conta.valorParcela ?? conta.valor ?? 0))}
                    </td>
                    <td className="px-3 py-2 text-sm text-right border border-purple-200 dark:border-purple-700">
                      {principalRec > 0 ? `R$ ${fmt(principalRec)}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-amber-700 dark:text-amber-300 border border-purple-200 dark:border-purple-700">
                      {juros > 0 ? `R$ ${fmt(juros)}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-sm font-semibold text-right text-green-700 dark:text-green-400 border border-purple-200 dark:border-purple-700">
                      {totalCaixa > 0 ? `R$ ${fmt(totalCaixa)}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-center border border-purple-200 dark:border-purple-700">
                      {conta.dataVencimento
                        ? new Date(conta.dataVencimento).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-center border border-purple-200 dark:border-purple-700">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-bold ${statusClass}`}
                      >
                        {statusText}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-center border border-purple-200 dark:border-purple-700">
                      {conta.dataPagamento
                        ? new Date(conta.dataPagamento).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                  </tr>
                  {expandedId === rowId && hasHistorico && (
                    <tr className="bg-gray-50 dark:bg-gray-900/40">
                      <td colSpan={8} className="px-4 py-3 border border-purple-200 dark:border-purple-700">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                          Recebimentos registrados (auditoria)
                        </p>
                        <ul className="space-y-1 text-xs">
                          {parciais.map((rp, i) => {
                            const pj = Number(rp.valorJuros ?? 0);
                            const pd = Number(rp.valorDesconto ?? 0);
                            const pb = Math.max(0, Number(rp.valorPago ?? 0) + pd - pj);
                            return (
                              <li
                                key={rp.id || i}
                                className="flex flex-wrap gap-x-3 gap-y-1 text-gray-700 dark:text-gray-300"
                              >
                                <span>
                                  {rp.dataPagamento
                                    ? new Date(rp.dataPagamento).toLocaleDateString('pt-BR')
                                    : '—'}
                                </span>
                                <span>Principal R$ {fmt(pb)}</span>
                                {pj > 0 && (
                                  <span className="text-amber-700">Juros R$ {fmt(pj)}</span>
                                )}
                                {pd > 0 && <span>Desconto R$ {fmt(pd)}</span>}
                                <span className="font-semibold">
                                  Caixa R$ {fmt(Number(rp.valorPago ?? 0))}
                                </span>
                                {rp.meioPagamento && (
                                  <span className="text-gray-500">({rp.meioPagamento})</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          {jurosTotal > 0 && (
            <tfoot>
              <tr className="bg-amber-50 dark:bg-amber-900/20">
                <td
                  colSpan={3}
                  className="px-3 py-2 text-xs font-bold text-amber-800 dark:text-amber-200 border border-purple-200 dark:border-purple-700 text-right"
                >
                  Total juros por atraso (venda)
                </td>
                <td
                  colSpan={5}
                  className="px-3 py-2 text-sm font-bold text-amber-800 dark:text-amber-200 border border-purple-200 dark:border-purple-700 text-right"
                >
                  R$ {fmt(jurosTotal)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default ParcelasVendaAuditoriaTable;
