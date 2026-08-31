import { HORAS_COMERCIAIS_POR_DIA } from './apropriacaoOs';

export { HORAS_COMERCIAIS_POR_DIA as HORAS_POR_DIARIA };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Converte dias + horas parciais em diárias equivalentes (ex.: 1d + 4h = 1,5d). */
export function diariasEquivalentes(dias: number, horas: number): number {
  let d = Number.isFinite(dias) ? Math.max(0, dias) : 0;
  let h = Number.isFinite(horas) ? Math.max(0, horas) : 0;
  if (h >= HORAS_COMERCIAIS_POR_DIA) {
    d += Math.floor(h / HORAS_COMERCIAIS_POR_DIA);
    h = h % HORAS_COMERCIAIS_POR_DIA;
  }
  return round2(d + h / HORAS_COMERCIAIS_POR_DIA);
}

/** Separa quantidade em diárias inteiras + horas restantes (para edição). */
export function splitDiariasEquivalentes(qtd: number): { dias: number; horas: number } {
  const total = Number.isFinite(qtd) ? Math.max(0, qtd) : 0;
  const diasInteiros = Math.floor(total);
  const fracao = total - diasInteiros;
  const horas = round2(fracao * HORAS_COMERCIAIS_POR_DIA);
  return { dias: diasInteiros, horas };
}

/** Texto legível para exibição (ex.: "1d + 4h (1,5d)"). */
export function formatarExecucaoLegivel(
  dias: number,
  horas: number,
  equivalente?: number
): string {
  const eq = equivalente ?? diariasEquivalentes(dias, horas);
  if (eq <= 0) return '—';
  const partes: string[] = [];
  if (dias > 0) partes.push(`${dias}d`);
  if (horas > 0) partes.push(`${horas}h`);
  if (partes.length === 0) {
    return `${eq.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}d`;
  }
  const detalhe = partes.join(' + ');
  if (partes.length === 1 && ((dias > 0 && horas === 0) || (horas > 0 && dias === 0))) {
    return detalhe;
  }
  return `${detalhe} (${eq.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}d)`;
}

/** Formata item de apontamento DIARIA_EQUIPE a partir da quantidade salva. */
export function formatarExecucaoDeQuantidade(qtd: number): string {
  const { dias, horas } = splitDiariasEquivalentes(qtd);
  return formatarExecucaoLegivel(dias, horas, qtd);
}
