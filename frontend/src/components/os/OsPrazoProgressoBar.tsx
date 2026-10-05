import React, { useMemo } from 'react';
import {
  calcularPrazoProgresso,
  type CalcularPrazoProgressoInput,
  type PrazoProgressoResultado,
} from '../../utils/osPrazoProgresso.util';

export interface OsPrazoProgressoBarProps extends CalcularPrazoProgressoInput {
  /** compact = listagem; full = visão geral / card detalhe */
  variant?: 'compact' | 'full';
  className?: string;
  /** Se false, oculta quando não há estimativa (em vez de mostrar “Sem estimativa”). */
  showWhenEmpty?: boolean;
}

export function usePrazoProgresso(
  input: CalcularPrazoProgressoInput
): PrazoProgressoResultado {
  return useMemo(
    () =>
      calcularPrazoProgresso({
        dataInicio: input.dataInicio,
        dataPrevisao: input.dataPrevisao,
        dataConclusao: input.dataConclusao,
        dataFim: input.dataFim,
        status: input.status,
        diariasOrcadas: input.diariasOrcadas,
        diariasRealizadas: input.diariasRealizadas,
        agora: input.agora,
      }),
    [
      input.dataInicio,
      input.dataPrevisao,
      input.dataConclusao,
      input.dataFim,
      input.status,
      input.diariasOrcadas,
      input.diariasRealizadas,
      input.agora,
    ]
  );
}

/**
 * Barra de consumo do prazo estimado (amarelo → laranja → vermelho).
 * Independente da barra azul de progresso de tarefas/obras.
 */
const OsPrazoProgressoBar: React.FC<OsPrazoProgressoBarProps> = ({
  variant = 'full',
  className = '',
  showWhenEmpty = true,
  ...input
}) => {
  const prazo = usePrazoProgresso(input);

  if (!prazo.temEstimativa && !showWhenEmpty) {
    return null;
  }

  const isCompact = variant === 'compact';

  return (
    <div className={className}>
      <div className={`flex items-center justify-between gap-2 ${isCompact ? 'mb-1.5' : 'mb-2'}`}>
        <span
          className={`font-medium text-gray-600 dark:text-gray-300 ${
            isCompact ? 'text-xs' : 'text-sm'
          }`}
        >
          Consumo do prazo
        </span>
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`font-semibold tabular-nums text-gray-800 dark:text-gray-100 truncate ${
              isCompact ? 'text-xs' : 'text-sm'
            }`}
          >
            {prazo.labelNumeros}
          </span>
          <span
            className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md font-bold ${
              isCompact ? 'text-[10px]' : 'text-xs'
            } ${prazo.badgeClassName}`}
          >
            {prazo.badge}
          </span>
        </div>
      </div>
      <div
        className={`w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner ${
          isCompact ? 'h-2' : 'h-2.5'
        }`}
        role="progressbar"
        aria-valuenow={Math.round(prazo.percentual)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Consumo do prazo estimado"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${prazo.barClassName}`}
          style={{ width: `${prazo.temEstimativa ? prazo.percentual : 0}%` }}
        />
      </div>
      {!isCompact && prazo.temEstimativa && (
        <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
          Dias corridos desde o início até a data final do cronograma
          {prazo.percentualRaw > 100
            ? ` · ${Math.round(prazo.percentualRaw)}% do estimado`
            : ''}
        </p>
      )}
    </div>
  );
};

export default OsPrazoProgressoBar;
