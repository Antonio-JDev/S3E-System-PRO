export const HORAS_COMERCIAIS_POR_DIA = 8;

export interface ResultadoOsCalculado {
  horasEngenhariaOrcadas: number;
  diariasEquipeOrcadas: number;
  horasEngenhariaRealizadas: number;
  diariasEquipeRealizadas: number;
  homemHoraOrcado: number;
  homemHoraRealizado: number;
  custoOrcado: number;
  custoRealizado: number;
  valorFechado: number;
  resultado: number;
  estouroHorasEngenharia: boolean;
  estouroDiariasEquipe: boolean;
}

export function calcularHomemHoraTotal(
  horasEngenharia: number,
  diariasEquipe: number
): number {
  return horasEngenharia + diariasEquipe * HORAS_COMERCIAIS_POR_DIA;
}

export function formatMoeda(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatQuantidade(value: number, sufixo: string): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${sufixo}`;
}
