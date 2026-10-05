import React from 'react';
import OsPrazoProgressoBar, { type OsPrazoProgressoBarProps } from './OsPrazoProgressoBar';

function fmtHoras(n: number): string {
  const r = Math.round(n * 100) / 100;
  const texto = Number.isInteger(r)
    ? String(r)
    : r.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return `${texto} h`;
}

function BarraHoras({
  label,
  horas,
  percentual,
  barraClassName,
  valorClassName,
}: {
  label: string;
  horas: number | null;
  percentual: number;
  barraClassName: string;
  valorClassName: string;
}) {
  const carregado = horas != null;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>
        <span className={`text-xs font-semibold tabular-nums ${valorClassName}`}>
          {carregado ? fmtHoras(horas) : '—'}
        </span>
      </div>
      <div
        className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden"
        role="progressbar"
        aria-valuenow={carregado ? Math.round(percentual) : undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={carregado ? `${label}: ${fmtHoras(horas)}` : label}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${barraClassName}`}
          style={{ width: `${carregado ? percentual : 0}%` }}
        />
      </div>
    </div>
  );
}

export interface OsCardListagemBarrasProps {
  /** null enquanto o resumo da listagem não chegou. */
  horasPrevistas: number | null;
  horasExecutadas: number | null;
  prazo: OsPrazoProgressoBarProps;
}

/**
 * Três barras do card da listagem: previstas, executadas e consumo do prazo.
 * Previstas/executadas são o total (engenharia + execução) em horas.
 */
const OsCardListagemBarras: React.FC<OsCardListagemBarrasProps> = ({
  horasPrevistas,
  horasExecutadas,
  prazo,
}) => {
  const previstas = Math.max(0, Number(horasPrevistas) || 0);
  const executadas = Math.max(0, Number(horasExecutadas) || 0);
  const teto = Math.max(previstas, executadas, 0);
  const percentual = (horas: number | null, valor: number) => {
    if (horas == null || teto <= 0 || valor <= 0) return 0;
    return Math.min(100, Math.max((valor / teto) * 100, 6));
  };

  return (
    <div className="mb-4 space-y-2.5">
      <BarraHoras
        label="Previstas"
        horas={horasPrevistas}
        percentual={percentual(horasPrevistas, previstas)}
        barraClassName="bg-sky-400"
        valorClassName="text-sky-700 dark:text-sky-300"
      />
      <BarraHoras
        label="Executadas"
        horas={horasExecutadas}
        percentual={percentual(horasExecutadas, executadas)}
        barraClassName="bg-emerald-400"
        valorClassName="text-emerald-700 dark:text-emerald-300"
      />
      <OsPrazoProgressoBar variant="compact" showWhenEmpty {...prazo} />
    </div>
  );
};

export default OsCardListagemBarras;
