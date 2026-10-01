import React, { useEffect, useState } from 'react';
import { apropriacaoOsService } from '../../services/apropriacaoOsService';
import { eventosCalendarioService } from '../../services/eventosCalendarioService';
import { ordemServicosService } from '../../services/ordemServicosService';
import { montarResumoFatiasOs, type FatiasHoras, type ResumoFatiasOs } from '../../utils/fatiasTempoOs';

export interface OsFatiasTempoBarrasProps {
  projetoId: string;
  horasEngenhariaOrcadas?: number;
  diariasEquipeOrcadas?: number;
  compacto?: boolean;
}

function fmtHoras(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function BarraFatias({
  titulo,
  corTitulo,
  fatias,
}: {
  titulo: string;
  corTitulo: string;
  fatias: FatiasHoras;
}) {
  const vazia = fatias.semOrcamento && fatias.efetivadas <= 0 && fatias.previstas <= 0;
  const base = Math.max(fatias.orcadas, fatias.efetivadas + fatias.previstas, 0);
  const pct = (horas: number) => (base > 0 ? Math.max(0, (horas / base) * 100) : 0);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className={`text-sm font-semibold ${corTitulo}`}>{titulo}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {fatias.semOrcamento ? 'Sem horas orçadas' : `${fmtHoras(fatias.orcadas)} h orçadas`}
        </p>
      </div>
      {vazia ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 rounded-lg bg-gray-100 dark:bg-dark-bg px-3 py-2">
          Nada orçado, efetivado ou agendado nesta faixa.
        </p>
      ) : (
        <div className="relative h-3 w-full">
          <div className="absolute inset-0 rounded-full overflow-hidden flex bg-gray-200 dark:bg-gray-700">
            {fatias.efetivadas > 0 && (
              <div className="h-full bg-emerald-600" style={{ width: `${pct(fatias.efetivadas)}%` }} />
            )}
            {fatias.previstas > 0 && (
              <div className="h-full bg-sky-500" style={{ width: `${pct(fatias.previstas)}%` }} />
            )}
            {fatias.restante > 0 && (
              <div className="h-full bg-slate-300 dark:bg-slate-600" style={{ width: `${pct(fatias.restante)}%` }} />
            )}
          </div>
          {fatias.excedente > 0 && fatias.orcadas > 0 && (
            <div
              className="absolute top-0 bottom-0 right-0 bg-rose-600 rounded-r-full"
              style={{ width: `${pct(fatias.excedente)}%` }}
              title="Acima do orçado"
            />
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600 dark:text-gray-300">
        <span><span className="inline-block w-2 h-2 rounded-sm bg-emerald-600 mr-1" />Efetivadas {fmtHoras(fatias.efetivadas)} h</span>
        <span><span className="inline-block w-2 h-2 rounded-sm bg-sky-500 mr-1" />Previstas (agendadas) {fmtHoras(fatias.previstas)} h</span>
        <span><span className="inline-block w-2 h-2 rounded-sm bg-slate-300 mr-1" />Restante {fmtHoras(fatias.restante)} h</span>
        {fatias.excedente > 0 && (
          <span className="font-semibold text-rose-700 dark:text-rose-300">
            <span className="inline-block w-2 h-2 rounded-sm bg-rose-600 mr-1" />
            {fmtHoras(fatias.excedente)} h acima do orçado
          </span>
        )}
      </div>
    </div>
  );
}

const OsFatiasTempoBarras: React.FC<OsFatiasTempoBarrasProps> = ({
  projetoId,
  horasEngenhariaOrcadas,
  diariasEquipeOrcadas,
  compacto = false,
}) => {
  const [resumo, setResumo] = useState<ResumoFatiasOs | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setResumo(null);
    setErro(null);

    void (async () => {
      let horasEng = horasEngenhariaOrcadas;
      let diarias = diariasEquipeOrcadas;
      if (horasEng == null || diarias == null) {
        const os = await ordemServicosService.buscar(projetoId);
        if (!os.success || !os.data) {
          if (!cancel) setErro('Não foi possível carregar o orçado da OS');
          return;
        }
        horasEng = Number(os.data.horasEngenhariaOrcadas) || 0;
        diarias = Number(os.data.diariasEquipeOrcadas) || 0;
      }

      const [eventosRes, apontamentosRes] = await Promise.all([
        eventosCalendarioService.listarPorProjeto(projetoId),
        apropriacaoOsService.listar(projetoId, 200),
      ]);
      if (cancel) return;
      if (!eventosRes.success || !apontamentosRes.success) {
        setErro('Não foi possível montar as horas da OS');
        return;
      }

      setResumo(
        montarResumoFatiasOs({
          horasEngenhariaOrcadas: horasEng ?? 0,
          diariasEquipeOrcadas: diarias ?? 0,
          eventos: eventosRes.data || [],
          apontamentos: apontamentosRes.data || [],
        }),
      );
    })();

    return () => {
      cancel = true;
    };
  }, [projetoId, horasEngenhariaOrcadas, diariasEquipeOrcadas]);

  return (
    <section className={compacto ? 'space-y-3' : 'rounded-xl bg-gray-50 dark:bg-dark-bg/60 px-5 py-4 shadow-sm space-y-4'}>
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Tempo da OS</h3>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
          Orçadas, efetivadas (apontamentos) e previstas que ainda estão só na agenda. Diária de equipe = 8 h na barra.
        </p>
      </div>
      {erro && <p className="text-xs text-rose-600">{erro}</p>}
      {!resumo && !erro && <p className="text-xs text-gray-500">Carregando horas...</p>}
      {resumo && (
        <>
          <BarraFatias titulo="Engenharia" corTitulo="text-indigo-700 dark:text-indigo-300" fatias={resumo.engenharia} />
          <BarraFatias titulo="Execução" corTitulo="text-amber-700 dark:text-amber-300" fatias={resumo.execucao} />
          <p className="text-xs text-gray-600 dark:text-gray-300">
            <strong>{resumo.diasPrevistos}</strong> dia{resumo.diasPrevistos === 1 ? '' : 's'} previsto{resumo.diasPrevistos === 1 ? '' : 's'} na agenda
            {' · '}
            <strong>{resumo.diasEfetivados}</strong> dia{resumo.diasEfetivados === 1 ? '' : 's'} efetivado{resumo.diasEfetivados === 1 ? '' : 's'} (apontamento ou evento confirmado).
            A confirmação não apaga a previsão.
          </p>
        </>
      )}
    </section>
  );
};

export default OsFatiasTempoBarras;
