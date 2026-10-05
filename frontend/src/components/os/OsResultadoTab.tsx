import React, { useMemo } from 'react';
import {
  formatMoeda,
  formatQuantidade,
  type ResultadoOsCalculado,
} from '../../utils/apropriacaoOs';
import { formatarExecucaoDeQuantidade } from '../../utils/apontamentoExecucao.util';
import { formatDateDisplay } from '../../utils/date';
import {
  calcularCustoTempoOrcado,
  calcularDiasEstimadosTexto,
} from '../../utils/osCockpit.util';
import type { ApontamentoOs } from '../../services/apropriacaoOsService';
import { HORAS_COMERCIAIS_POR_DIA } from '../../utils/custoEventoCalendario';
import OsFatiasTempoBarras from './OsFatiasTempoBarras';
import OsPrazoProgressoBar from './OsPrazoProgressoBar';

export interface OsResultadoTabProps {
  projeto: {
    id?: string;
    status: string;
    valorTotal?: number | null;
    dataInicio?: string | null;
    dataPrevisao?: string | null;
    dataConclusao?: string | null;
    dataFim?: string | null;
    horasEngenhariaOrcadas?: number | null;
    diariasEquipeOrcadas?: number | null;
    valorHoraEngenharia?: number | null;
    valorDiariaEquipe?: number | null;
    orcamento?: { precoVenda?: number | null; numeroSequencial?: number | null } | null;
  };
  resumo: ResultadoOsCalculado | null;
  apontamentos: ApontamentoOs[];
  loadingApontamentos?: boolean;
  onExportCsv?: () => void;
}

function formatarItemApontamento(item: ApontamentoOs['itens'][number]): string {
  const nome = item.user?.name || item.funcionario?.nome || 'Colaborador';
  if (item.tipoRecurso === 'HORA_ENGENHARIA') {
    return `${nome}: ${formatQuantidade(item.quantidade, 'h')}`;
  }
  return `${nome}: ${formatarExecucaoDeQuantidade(item.quantidade)}`;
}

const OsResultadoTab: React.FC<OsResultadoTabProps> = ({
  projeto,
  resumo,
  apontamentos,
  loadingApontamentos,
  onExportCsv,
}) => {
  const valorOrcamentoOficial = useMemo(() => {
    const doResumo = resumo?.valorFechado;
    if (doResumo != null && doResumo > 0) return doResumo;
    const preco = projeto.orcamento?.precoVenda;
    if (preco != null && Number(preco) > 0) return Number(preco);
    return Number(projeto.valorTotal) || 0;
  }, [resumo?.valorFechado, projeto.orcamento?.precoVenda, projeto.valorTotal]);

  const diariasOrcadas =
    (resumo?.diariasEquipeOrcadas ?? Number(projeto.diariasEquipeOrcadas)) || 0;
  const horasOrcadas =
    (resumo?.horasEngenhariaOrcadas ?? Number(projeto.horasEngenhariaOrcadas)) || 0;

  const custoTempoOrcado =
    resumo?.custoOrcado ??
    calcularCustoTempoOrcado({
      horasEngenhariaOrcadas: horasOrcadas,
      diariasEquipeOrcadas: diariasOrcadas,
      valorHoraEngenharia: projeto.valorHoraEngenharia,
      valorDiariaEquipe: projeto.valorDiariaEquipe,
    });

  const totaisApontamentos = useMemo(() => {
    let horas = 0;
    let diarias = 0;
    let colaboradores = new Set<string>();
    for (const ap of apontamentos) {
      for (const item of ap.itens) {
        const key = item.user?.id || item.funcionario?.id || item.id;
        colaboradores.add(key);
        if (item.tipoRecurso === 'HORA_ENGENHARIA') {
          horas += Number(item.quantidade) || 0;
        } else {
          diarias += Number(item.quantidade) || 0;
        }
      }
    }
    return {
      horas,
      diarias,
      colaboradores: colaboradores.size,
    };
  }, [apontamentos]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Resultado — Orçado vs Realizado
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Prazo do cronograma, esforço orçado e o realizado pelos apontamentos (executar na agenda ou F1).
          </p>
        </div>
        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            className="text-sm font-semibold px-4 py-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"
          >
            Exportar CSV contábil
          </button>
        )}
      </div>

      {/* Orçamento oficial + prazo estimado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-5">
          <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3">
            Valor oficial do orçamento
          </h4>
          <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
            {formatMoeda(valorOrcamentoOficial)}
          </div>
          {projeto.orcamento?.numeroSequencial != null && (
            <p className="text-xs text-gray-500 mt-1">
              Orçamento #{projeto.orcamento.numeroSequencial}
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Custo tempo orçado</div>
              <div className="font-semibold">{formatMoeda(custoTempoOrcado)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Custo realizado</div>
              <div className="font-semibold">
                {resumo ? formatMoeda(resumo.custoRealizado) : '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 space-y-3">
          <h4 className="text-sm font-bold text-gray-800 dark:text-white">
            Prazo do cronograma
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {calcularDiasEstimadosTexto(
              0,
              projeto.dataInicio,
              projeto.dataPrevisao
            )}
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Início</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {projeto.dataInicio ? formatDateDisplay(projeto.dataInicio) : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Data final</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {projeto.dataPrevisao ? formatDateDisplay(projeto.dataPrevisao) : '—'}
              </div>
            </div>
          </div>
          <OsPrazoProgressoBar
            dataInicio={projeto.dataInicio}
            dataPrevisao={projeto.dataPrevisao}
            dataConclusao={projeto.dataConclusao}
            dataFim={projeto.dataFim}
            status={projeto.status}
            variant="full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800/50 bg-white dark:bg-dark-card p-5">
          <h4 className="text-sm font-bold text-gray-800 dark:text-white">Estimado (orçado)</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3">
            Esforço previsto dentro do prazo do cronograma.
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Horas execução</div>
              <div className="text-lg font-bold tabular-nums">
                {formatQuantidade(diariasOrcadas * HORAS_COMERCIAIS_POR_DIA, 'h')}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Horas eng. orçadas</div>
              <div className="text-lg font-bold tabular-nums">{formatQuantidade(horasOrcadas, 'h')}</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-white dark:bg-dark-card p-5">
          <h4 className="text-sm font-bold text-gray-800 dark:text-white">Realizado</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3">
            Apontado ao executar a alocação no calendário ou pelo modal F1.
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Horas execução</div>
              <div className="text-lg font-bold tabular-nums">
                {formatQuantidade(totaisApontamentos.diarias * HORAS_COMERCIAIS_POR_DIA, 'h')}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Horas de engenharia</div>
              <div className="text-lg font-bold tabular-nums">
                {formatQuantidade(totaisApontamentos.horas, 'h')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {projeto.id && (
        <OsFatiasTempoBarras
          projetoId={projeto.id}
          horasEngenhariaOrcadas={horasOrcadas}
          diariasEquipeOrcadas={diariasOrcadas}
        />
      )}

      {!resumo ? (
        <p className="text-sm text-gray-500">Carregando resumo...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className={`rounded-2xl border-2 p-5 ${
                resumo.estouroHorasEngenharia
                  ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                  : 'border-blue-200 bg-blue-50 dark:bg-blue-900/20'
              }`}
            >
              <h4 className="font-bold text-gray-800 dark:text-white mb-3">
                Horas de Engenharia
              </h4>
              <div className="flex justify-between text-sm mb-2">
                <span>Orçado</span>
                <span className="font-semibold">
                  {formatQuantidade(resumo.horasEngenhariaOrcadas, 'h')}
                </span>
              </div>
              <div className="flex justify-between text-sm mb-3">
                <span>Realizado</span>
                <span
                  className={`font-semibold ${
                    resumo.estouroHorasEngenharia ? 'text-red-700' : ''
                  }`}
                >
                  {formatQuantidade(resumo.horasEngenhariaRealizadas, 'h')}
                </span>
              </div>
              <div className="h-3 bg-white/70 dark:bg-black/20 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    resumo.estouroHorasEngenharia ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      resumo.horasEngenhariaOrcadas > 0
                        ? (resumo.horasEngenhariaRealizadas /
                            resumo.horasEngenhariaOrcadas) *
                          100
                        : 0
                    )}%`,
                  }}
                />
              </div>
              {resumo.estouroHorasEngenharia && (
                <p className="text-xs text-red-700 mt-2 font-semibold">
                  Orçamento de horas estourado
                </p>
              )}
            </div>

            <div
              className={`rounded-2xl border-2 p-5 ${
                resumo.estouroDiariasEquipe
                  ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                  : 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20'
              }`}
            >
              <h4 className="font-bold text-gray-800 dark:text-white mb-3">Execução</h4>
              <div className="flex justify-between text-sm mb-2">
                <span>Orçado</span>
                <span className="font-semibold">
                  {formatQuantidade(resumo.diariasEquipeOrcadas * HORAS_COMERCIAIS_POR_DIA, 'h')}
                </span>
              </div>
              <div className="flex justify-between text-sm mb-3">
                <span>Realizado</span>
                <span
                  className={`font-semibold ${
                    resumo.estouroDiariasEquipe ? 'text-red-700' : ''
                  }`}
                >
                  {formatQuantidade(resumo.diariasEquipeRealizadas * HORAS_COMERCIAIS_POR_DIA, 'h')}
                </span>
              </div>
              <div className="h-3 bg-white/70 dark:bg-black/20 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    resumo.estouroDiariasEquipe ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      resumo.diariasEquipeOrcadas > 0
                        ? (resumo.diariasEquipeRealizadas /
                            resumo.diariasEquipeOrcadas) *
                          100
                        : 0
                    )}%`,
                  }}
                />
              </div>
              {resumo.estouroDiariasEquipe && (
                <p className="text-xs text-red-700 mt-2 font-semibold">
                  Orçamento de horas de execução estourado
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card-primary p-4">
              <div className="text-xs text-gray-500">Homem-hora orçado</div>
              <div className="text-xl font-bold">
                {formatQuantidade(resumo.homemHoraOrcado, 'h')}
              </div>
            </div>
            <div className="card-primary p-4">
              <div className="text-xs text-gray-500">Homem-hora realizado</div>
              <div className="text-xl font-bold">
                {formatQuantidade(resumo.homemHoraRealizado, 'h')}
              </div>
            </div>
            <div className="card-primary p-4">
              <div className="text-xs text-gray-500">Valor fechado</div>
              <div className="text-xl font-bold">{formatMoeda(resumo.valorFechado)}</div>
            </div>
            <div
              className={`card-primary p-4 ${
                resumo.resultado >= 0 ? '' : 'ring-2 ring-red-300'
              }`}
            >
              <div className="text-xs text-gray-500">Resultado</div>
              <div
                className={`text-xl font-bold ${
                  resumo.resultado >= 0 ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {formatMoeda(resumo.resultado)}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                Custo orç: {formatMoeda(resumo.custoOrcado)} · real:{' '}
                {formatMoeda(resumo.custoRealizado)}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                F1 confirmado: {formatMoeda(resumo.custoApontamento ?? 0)} · F1 aguardando
                execução: {formatMoeda(resumo.custoApontamentoPrevisto ?? 0)} · calendário
                confirmado: {formatMoeda(resumo.custoCalendario ?? 0)} · calendário previsto:{' '}
                {formatMoeda(resumo.custoCalendarioPrevisto ?? 0)}
              </div>
              {resumo.valorFechado > 0 && (
                <div className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5">
                  Custo realizado vs valor orçado:{' '}
                  {((resumo.custoRealizado / resumo.valorFechado) * 100).toFixed(1)}% ·
                  projetado:{' '}
                  {(
                    ((resumo.custoProjetado ?? resumo.custoRealizado) /
                      resumo.valorFechado) *
                    100
                  ).toFixed(1)}
                  %
                </div>
              )}
              <div className="text-[10px] text-sky-700 dark:text-sky-300 mt-0.5">
                Projetado (real + previsão):{' '}
                {formatMoeda(resumo.custoProjetado ?? resumo.custoRealizado)}
              </div>
            </div>
          </div>

          {/* Esforço por apontamento F1 */}
          <div className="rounded-2xl border border-gray-200 dark:border-dark-border overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
              <h4 className="font-bold text-sm text-gray-800 dark:text-white">
                Custo / esforço por apontamento (F1)
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Horas de engenharia, horas de execução e colaboradores lançados no
                apontamento rápido.
              </p>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm border-b border-gray-100 dark:border-dark-border">
              <div>
                <div className="text-xs text-gray-500">Colaboradores</div>
                <div className="font-semibold">{totaisApontamentos.colaboradores}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Horas eng. F1</div>
                <div className="font-semibold">
                  {formatQuantidade(totaisApontamentos.horas, 'h')}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Horas execução F1</div>
                <div className="font-semibold">
                  {formatQuantidade(totaisApontamentos.diarias * HORAS_COMERCIAIS_POR_DIA, 'h')}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Custo F1 confirmado</div>
                <div className="font-semibold">
                  {formatMoeda(resumo.custoApontamento ?? 0)}
                </div>
              </div>
            </div>
            {loadingApontamentos ? (
              <p className="p-4 text-sm text-gray-500">Carregando apontamentos...</p>
            ) : apontamentos.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">Nenhum apontamento F1 registrado.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-dark-border max-h-72 overflow-y-auto">
                {apontamentos.map((ap) => (
                  <li key={ap.id} className="px-4 py-3 text-sm">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {formatDateDisplay(ap.dataApontamento)}
                      {ap.observacoes ? (
                        <span className="font-normal text-gray-500">
                          {' '}
                          — {ap.observacoes}
                        </span>
                      ) : null}
                    </div>
                    <ul className="mt-1 space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                      {ap.itens.map((item) => (
                        <li key={item.id}>{formatarItemApontamento(item)}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(resumo.calendarioLinhas?.length ?? 0) > 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-dark-border overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
                <h4 className="font-bold text-sm text-gray-800 dark:text-white">
                  Custo por pessoa (calendário — previsão e confirmado)
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Taxas do cadastro RH. Previsão conta na ocupação/projetado; Confirmado
                  entra no realizado.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100 dark:border-dark-border">
                      <th className="px-4 py-2 font-semibold">Data</th>
                      <th className="px-4 py-2 font-semibold">Funcionário</th>
                      <th className="px-4 py-2 font-semibold">Status</th>
                      <th className="px-4 py-2 font-semibold">Modo</th>
                      <th className="px-4 py-2 font-semibold text-right">Horas</th>
                      <th className="px-4 py-2 font-semibold text-right">Unitário</th>
                      <th className="px-4 py-2 font-semibold text-right">Custo dia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumo.calendarioLinhas!.map((linha) => (
                      <tr
                        key={`${linha.eventoId}-${linha.funcionarioId}-${linha.data}`}
                        className="border-b border-gray-50 dark:border-dark-border/50"
                      >
                        <td className="px-4 py-2 whitespace-nowrap">{linha.data}</td>
                        <td className="px-4 py-2">
                          <div className="font-medium">{linha.funcionarioNome}</div>
                          {linha.cargo ? (
                            <div className="text-xs text-gray-500">{linha.cargo}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-2">{linha.status}</td>
                        <td className="px-4 py-2">{linha.modoCusto}</td>
                        <td className="px-4 py-2 text-right">{linha.totalHoras}</td>
                        <td className="px-4 py-2 text-right">
                          {formatMoeda(linha.valorUnitario)}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold">
                          {formatMoeda(linha.custoDia)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-dark-bg">
                      <td
                        colSpan={6}
                        className="px-4 py-2 text-right text-xs font-semibold text-gray-600"
                      >
                        Total calendário
                      </td>
                      <td className="px-4 py-2 text-right font-bold">
                        {formatMoeda(resumo.custoCalendario ?? 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OsResultadoTab;
