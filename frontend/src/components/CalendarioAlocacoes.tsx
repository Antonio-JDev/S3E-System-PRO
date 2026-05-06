import React, { useState, useEffect, useMemo } from 'react';
import { alocacaoService, type AlocacaoEquipeDTO } from '../services/alocacaoService';
import { toast } from 'sonner';

interface CalendarioAlocacoesProps {
  obraId?: string;
  equipeId?: string;
  dataInicio?: Date;
  dataFim?: Date;
  /** Quando true, exibe texto de visão consolidada (todas as obras) */
  visaoExecucao?: boolean;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const CalendarioAlocacoes: React.FC<CalendarioAlocacoesProps> = ({
  obraId,
  equipeId,
  dataInicio: dataInicioProp,
  dataFim: dataFimProp,
  visaoExecucao = false
}) => {
  const [alocacoes, setAlocacoes] = useState<AlocacaoEquipeDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [mesAtual, setMesAtual] = useState(new Date());

  useEffect(() => {
    carregarAlocacoes();
  }, [obraId, equipeId, mesAtual]);

  const carregarAlocacoes = async () => {
    try {
      setLoading(true);
      
      const dataInicio = dataInicioProp || new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
      const dataFim = dataFimProp || new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0);

      const response = await alocacaoService.buscarPorPeriodo({
        dataInicio: dataInicio.toISOString(),
        dataFim: dataFim.toISOString(),
        obraId,
        equipeId
      });

      if (response.success && response.data) {
        setAlocacoes(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar alocações:', error);
      toast.error('Erro ao carregar alocações do calendário');
    } finally {
      setLoading(false);
    }
  };

  const diasDoMes = useMemo(() => {
    const ano = mesAtual.getFullYear();
    const mes = mesAtual.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    
    const dias: Date[] = [];
    for (let dia = new Date(primeiroDia); dia <= ultimoDia; dia.setDate(dia.getDate() + 1)) {
      dias.push(new Date(dia));
    }
    
    return dias;
  }, [mesAtual]);

  const obterAlocacoesDoDia = (dia: Date) => {
    const d0 = startOfDay(dia).getTime();
    return alocacoes.filter((alocacao) => {
      const i0 = startOfDay(new Date(alocacao.dataInicio)).getTime();
      const f0 = startOfDay(new Date(alocacao.dataFim)).getTime();
      return d0 >= i0 && d0 <= f0;
    });
  };

  const proximoMes = () => {
    setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1));
  };

  const mesAnterior = () => {
    setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1));
  };

  const mesNomeCompleto = mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const mostrarVisaoGlobal = visaoExecucao || (!obraId && !equipeId);

  return (
    <div className="space-y-6">
      {mostrarVisaoGlobal && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/80 dark:bg-blue-950/30 dark:border-blue-800 px-4 py-3 text-sm text-blue-900 dark:text-blue-100">
          <p className="font-semibold">Calendário de execução (todas as obras)</p>
          <p className="mt-1 text-blue-800/90 dark:text-blue-200/90">
            Cada data mostra <strong>obras</strong> com alocação de <strong>equipe</strong> e os <strong>eletricistas</strong> (membros) vinculados ao período. Use em conjunto com o Kanban e a Timeline (aba própria) em Execução Obra.
          </p>
        </div>
      )}

      {/* Header de Controles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <button
            onClick={mesAnterior}
            className="p-2 bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
            {mesNomeCompleto}
          </h3>
          <button
            onClick={proximoMes}
            className="p-2 bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => setMesAtual(new Date())}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Hoje
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border rounded-2xl p-6 shadow-soft">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Calendário mensal
            </h4>

            {alocacoes.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Nenhuma alocação neste mês.</p>
            )}

            <div className="grid grid-cols-7 gap-2">
                {/* Cabeçalho dos dias da semana */}
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
                  <div key={dia} className="text-center font-bold text-gray-700 dark:text-gray-300 py-2">
                    {dia}
                  </div>
                ))}

                {/* Espaços vazios antes do primeiro dia */}
                {Array.from({ length: diasDoMes[0].getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square"></div>
                ))}

                {/* Dias do mês */}
                {diasDoMes.map((dia) => {
                  const alocacoesDia = obterAlocacoesDoDia(dia);
                  const isHoje = dia.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={dia.toISOString()}
                      className={`aspect-square border-2 rounded-lg p-2 transition-all ${
                        isHoje
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : alocacoesDia.length > 0
                          ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/10 hover:bg-purple-100'
                          : 'border-gray-200 dark:border-dark-border hover:border-gray-300'
                      }`}
                    >
                      <div className="text-xs font-semibold text-gray-900 dark:text-white mb-1">
                        {dia.getDate()}
                      </div>
                      {alocacoesDia.length > 0 && (
                        <div className="space-y-0.5">
                          {alocacoesDia.slice(0, 3).map((alocacao) => {
                            const membrosTxt =
                              alocacao.membros?.length && alocacao.membros.length > 0
                                ? alocacao.membros.map((m) => m.nome).join(', ')
                                : '';
                            const titulo = [
                              alocacao.obraNome,
                              `Equipe: ${alocacao.equipeNome}`,
                              membrosTxt ? `Eletricistas: ${membrosTxt}` : ''
                            ]
                              .filter(Boolean)
                              .join(' · ');
                            return (
                              <div key={alocacao.id} className="space-y-0">
                                <div
                                  className="text-[9px] leading-tight px-1 py-0.5 bg-slate-700 text-white rounded truncate font-medium"
                                  title={titulo}
                                >
                                  {(alocacao.obraNome || 'Obra').substring(0, 14)}
                                </div>
                                <div
                                  className="text-[9px] px-1 py-0.5 bg-purple-600 text-white rounded truncate"
                                  title={titulo}
                                >
                                  {alocacao.equipeNome.substring(0, 12)}
                                </div>
                              </div>
                            );
                          })}
                          {alocacoesDia.length > 3 && (
                            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                              +{alocacoesDia.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Resumo de Alocações */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-2xl p-6">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">📊 Resumo do Período</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white dark:bg-dark-card rounded-xl border border-purple-200 dark:border-purple-700">
                <div className="text-2xl font-bold text-purple-600">{alocacoes.length}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total Alocações</div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-dark-card rounded-xl border border-blue-200 dark:border-blue-700">
                <div className="text-2xl font-bold text-blue-600">
                  {alocacoes.filter(a => a.status === 'EM_ANDAMENTO').length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Em Andamento</div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-dark-card rounded-xl border border-green-200 dark:border-green-700">
                <div className="text-2xl font-bold text-green-600">
                  {alocacoes.filter(a => a.status === 'CONCLUIDA').length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Concluídas</div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-dark-card rounded-xl border border-yellow-200 dark:border-yellow-700">
                <div className="text-2xl font-bold text-yellow-600">
                  {alocacoes.filter(a => a.status === 'PLANEJADA').length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Planejadas</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CalendarioAlocacoes;

