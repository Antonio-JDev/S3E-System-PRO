import React, { useEffect, useMemo, useState } from 'react';
import { ordemServicosService, type AlocacaoPontoEvento } from '../../services/ordemServicosService';

export interface OsExecucaoCalendarioPanelProps {
  projetoId: string;
  semObra: boolean;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function eventoCobreDia(ev: AlocacaoPontoEvento, ymd: string): boolean {
  const dia = new Date(`${ymd}T12:00:00`);
  const inicio = new Date(ev.dataInicio);
  const fim = new Date(ev.dataFim);
  const startDay = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const endDay = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
  return dia >= startDay && dia <= endDay;
}

const OsExecucaoCalendarioPanel: React.FC<OsExecucaoCalendarioPanelProps> = ({
  projetoId,
  semObra,
}) => {
  const [dataRef, setDataRef] = useState(() => toYmd(new Date()));
  const [eventos, setEventos] = useState<AlocacaoPontoEvento[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (semObra) {
      setEventos([]);
      return;
    }
    let cancel = false;
    setLoading(true);
    ordemServicosService
      .getAlocacaoPonto(projetoId)
      .then((res) => {
        if (!cancel && res.success && Array.isArray(res.data)) {
          setEventos(res.data);
        }
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [projetoId, semObra]);

  const hojeYmd = toYmd(new Date());

  const execucaoHoje = useMemo(() => {
    return eventos.filter(
      (e) => e.status === 'VALIDO' && eventoCobreDia(e, hojeYmd),
    );
  }, [eventos, hojeYmd]);

  const execucaoDiaSelecionado = useMemo(() => {
    return eventos.filter(
      (e) => e.status === 'VALIDO' && eventoCobreDia(e, dataRef),
    );
  }, [eventos, dataRef]);

  const proximasPrevisoes = useMemo(() => {
    const agora = new Date();
    agora.setHours(0, 0, 0, 0);
    return eventos
      .filter((e) => e.status === 'PREVISAO' && new Date(e.dataFim) >= agora)
      .sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime());
  }, [eventos]);

  const renderBlocoEvento = (ev: AlocacaoPontoEvento) => (
    <div
      key={ev.eventoId}
      className="rounded-lg p-3 bg-gray-50 dark:bg-dark-bg/60 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-semibold text-sm text-gray-900 dark:text-white">{ev.titulo}</span>
        <span
          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
            ev.status === 'VALIDO'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {ev.status === 'VALIDO' ? 'Confirmado' : 'Previsão'}
        </span>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
        {new Date(ev.dataInicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
        {' → '}
        {new Date(ev.dataFim).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
      </p>
      {ev.pessoas.length > 0 ? (
        <ul className="text-sm space-y-1">
          {ev.pessoas.map((p) => (
            <li key={p.funcionarioId} className="text-gray-800 dark:text-gray-200">
              <span className="font-medium">{p.nome}</span>
              <span className="text-gray-500 text-xs ml-1">· {p.cargo}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-500">Sem equipe definida</p>
      )}
      {(ev.veiculos?.length ?? 0) > 0 && (
        <p className="text-xs text-sky-700 dark:text-sky-300 mt-2">
          🚗 {ev.veiculos!.map((v) => `${v.modelo} (${v.placa})`).join(', ')}
        </p>
      )}
    </div>
  );

  if (semObra) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Execução no calendário
        </h3>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
          Dia
          <input
            type="date"
            value={dataRef}
            onChange={(e) => setDataRef(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-dark-border px-2 py-1 text-sm"
          />
        </label>
      </div>

      {loading && <p className="text-sm text-gray-500">Carregando execução...</p>}

      {!loading && (
        <>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-2">
              {dataRef === hojeYmd ? 'Execução hoje (confirmado)' : `Execução em ${new Date(`${dataRef}T12:00:00`).toLocaleDateString('pt-BR')} (confirmado)`}
            </h4>
            {execucaoDiaSelecionado.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhuma execução confirmada neste dia. Confirme o evento no calendário para aparecer aqui.
              </p>
            ) : (
              <div className="space-y-2">{execucaoDiaSelecionado.map(renderBlocoEvento)}</div>
            )}
          </div>

          {dataRef !== hojeYmd && execucaoHoje.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-600 mb-2">
                Também em execução hoje
              </h4>
              <div className="space-y-2">{execucaoHoje.map(renderBlocoEvento)}</div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-2">
              Próximas execuções (previsão)
            </h4>
            {proximasPrevisoes.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhuma previsão futura. Arraste a OS no calendário para planejar.
              </p>
            ) : (
              <div className="space-y-2">{proximasPrevisoes.slice(0, 5).map(renderBlocoEvento)}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default OsExecucaoCalendarioPanel;
