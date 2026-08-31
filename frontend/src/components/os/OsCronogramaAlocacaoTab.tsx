import React, { useEffect, useState } from 'react';
import type { Obra } from '../../services/obrasService';
import ObrasGanttChart from '../ObrasGanttChart';
import CalendarioAlocacoes from '../CalendarioAlocacoes';
import OsObraStatusBadge from './OsObraStatusBadge';
import HubTarefasObra from '../HubTarefasObra';
import { ordemServicosService, type AlocacaoPontoEvento } from '../../services/ordemServicosService';

export interface OsCronogramaAlocacaoTabProps {
  projetoId: string;
  semObra: boolean;
  obra: Obra | null;
  loadingObra: boolean;
  onIniciarObra?: () => void;
}

const OsCronogramaAlocacaoTab: React.FC<OsCronogramaAlocacaoTabProps> = ({
  projetoId,
  semObra,
  obra,
  loadingObra,
  onIniciarObra,
}) => {
  const [alocacoes, setAlocacoes] = useState<AlocacaoPontoEvento[]>([]);
  const [loadingAlocacao, setLoadingAlocacao] = useState(false);

  useEffect(() => {
    if (semObra) return;
    let cancel = false;
    setLoadingAlocacao(true);
    ordemServicosService
      .getAlocacaoPonto(projetoId)
      .then((res) => {
        if (!cancel && res.success && Array.isArray(res.data)) setAlocacoes(res.data);
      })
      .finally(() => {
        if (!cancel) setLoadingAlocacao(false);
      });
    return () => {
      cancel = true;
    };
  }, [projetoId, semObra]);

  if (semObra) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-dark-border p-8 text-center text-gray-600 dark:text-gray-400">
        Esta ordem de serviço está marcada como <strong>sem obra de campo</strong>. Cronograma e
        alocação de equipes de execução não se aplicam.
      </div>
    );
  }

  const blocoEquipeCalendario = (
    <div className="rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-4 shadow-soft">
      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 px-2">
        Equipe do calendário (jornada × extras do ponto)
      </h4>
      {loadingAlocacao && <p className="text-sm text-gray-500 px-2">Carregando alocações...</p>}
      {!loadingAlocacao && alocacoes.length === 0 && (
        <p className="text-sm text-gray-500 px-2">
          Ninguém alocado nesta OS pelo calendário. Arraste a OS no Calendário e defina equipe e veículos.
        </p>
      )}
      <div className="space-y-3">
        {alocacoes.map((ev) => (
          <div key={ev.eventoId} className="rounded-xl border border-gray-100 dark:border-dark-border p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-semibold text-sm">{ev.titulo}</span>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                ev.status === 'VALIDO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {ev.status === 'VALIDO' ? 'Confirmado' : 'Previsão'}
              </span>
            </div>
            {ev.pessoas.map((p) => (
              <div key={p.funcionarioId} className="text-sm py-1">
                <div className="font-medium">{p.nome} <span className="text-gray-500 font-normal">· {p.cargo}</span></div>
                <ul className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                  {p.dias.map((d) => (
                    <li key={d.data}>
                      {new Date(`${d.data}T12:00:00`).toLocaleDateString('pt-BR')}
                      {' · jornada '}{d.horasJornada}h ({d.workShift.entrada1}–{d.workShift.saida2})
                      {d.temPonto && d.horasExtras > 0
                        ? ` · extras ${d.horasExtras}h`
                        : d.temPonto
                          ? ' · ponto sem extra'
                          : ' · sem ponto (previsão)'}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  if (loadingObra) {
    return (
      <div className="space-y-6">
        {blocoEquipeCalendario}
        <p className="text-gray-500 p-6">Carregando dados da obra...</p>
      </div>
    );
  }

  if (!obra) {
    return (
      <div className="space-y-6 animate-fade-in">
        {blocoEquipeCalendario}
        <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 dark:bg-blue-900/20 p-8 text-center space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Ainda não há obra vinculada a esta OS. Inicie a obra para acompanhar timeline e
            tarefas de campo aqui.
          </p>
          {onIniciarObra && (
            <button
              type="button"
              onClick={onIniciarObra}
              className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600"
            >
              Iniciar obra
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <OsObraStatusBadge
        status={obra.status}
        nomeObra={obra.nomeObra}
        progresso={obra.progresso}
      />

      {blocoEquipeCalendario}

      <div className="rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-4 shadow-soft overflow-hidden">
        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 px-2">
          Timeline da execução
        </h4>
        <ObrasGanttChart obras={[obra]} compact />
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-4 shadow-soft">
        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 px-2">
          Agenda de técnicos (esta obra)
        </h4>
        <CalendarioAlocacoes modo="os" projetoId={projetoId} />
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-2 shadow-soft overflow-hidden">
        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 px-4 pt-3">
          Tarefas de campo
        </h4>
        <HubTarefasObra obraId={obra.id} embedded />
      </div>
    </div>
  );
};

export default OsCronogramaAlocacaoTab;
