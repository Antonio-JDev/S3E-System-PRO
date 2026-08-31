export interface GastoCombustivelInput {
  data: Date | string;
  km: number | null | undefined;
  litros: number | null | undefined;
  tipo: string;
}

export interface IntervaloConsumo {
  data: string;
  kmRodados: number;
  litros: number;
  kmPorLitro: number;
  litrosPorKm: number;
}

export interface ConsumoMensal {
  mes: string;
  kmRodados: number;
  litros: number;
  kmPorLitro: number | null;
  litrosPorKm: number | null;
}

export interface ResumoConsumoVeiculo {
  consumoMedioTotalKmL: number | null;
  consumoMedioMesAtualKmL: number | null;
  litrosPorKmTotal: number | null;
  historicoMensal: ConsumoMensal[];
  desempenhoQueda: boolean;
  intervalos: IntervaloConsumo[];
}

const TIPO_COMBUSTIVEL = 'Combustível';
const QUEDA_THRESHOLD = 0.15;

function toYmd(d: Date | string): string {
  if (typeof d === 'string') {
    const t = d.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
    const parsed = new Date(t);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return t.slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

function mesKey(d: Date | string): string {
  return toYmd(d).slice(0, 7);
}

function isCombustivelValido(g: GastoCombustivelInput): boolean {
  return g.tipo === TIPO_COMBUSTIVEL && g.km != null && g.litros != null && Number(g.litros) > 0;
}

export function calcularIntervalosConsumo(gastos: GastoCombustivelInput[]): IntervaloConsumo[] {
  const combustivel = gastos
    .filter(isCombustivelValido)
    .map((g) => ({
      data: toYmd(g.data),
      km: Number(g.km),
      litros: Number(g.litros),
      tipo: g.tipo,
    }))
    .sort((a, b) => a.data.localeCompare(b.data) || a.km - b.km);

  const intervalos: IntervaloConsumo[] = [];
  for (let i = 1; i < combustivel.length; i++) {
    const prev = combustivel[i - 1];
    const curr = combustivel[i];
    const kmRodados = curr.km - prev.km;
    if (kmRodados <= 0) continue;
    const litros = curr.litros;
    if (litros <= 0) continue;
    intervalos.push({
      data: curr.data,
      kmRodados,
      litros,
      kmPorLitro: kmRodados / litros,
      litrosPorKm: litros / kmRodados,
    });
  }
  return intervalos;
}

export function calcularConsumoMensal(intervalos: IntervaloConsumo[]): ConsumoMensal[] {
  const porMes = new Map<string, { km: number; litros: number }>();
  for (const i of intervalos) {
    const key = mesKey(i.data);
    const acc = porMes.get(key) ?? { km: 0, litros: 0 };
    acc.km += i.kmRodados;
    acc.litros += i.litros;
    porMes.set(key, acc);
  }
  return Array.from(porMes.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, v]) => ({
      mes,
      kmRodados: v.km,
      litros: v.litros,
      kmPorLitro: v.litros > 0 ? v.km / v.litros : null,
      litrosPorKm: v.km > 0 ? v.litros / v.km : null,
    }));
}

function mediaKmPorLitro(intervalos: IntervaloConsumo[]): number | null {
  if (!intervalos.length) return null;
  const totalKm = intervalos.reduce((s, i) => s + i.kmRodados, 0);
  const totalLitros = intervalos.reduce((s, i) => s + i.litros, 0);
  if (totalLitros <= 0) return null;
  return totalKm / totalLitros;
}

export function calcularResumoConsumo(
  gastos: GastoCombustivelInput[],
  mesReferencia?: string
): ResumoConsumoVeiculo {
  const intervalos = calcularIntervalosConsumo(gastos);
  const historicoMensal = calcularConsumoMensal(intervalos);
  const consumoMedioTotalKmL = mediaKmPorLitro(intervalos);

  const mesAtual = mesReferencia ?? new Date().toISOString().slice(0, 7);
  const mesAtualData = historicoMensal.find((m) => m.mes === mesAtual);
  const consumoMedioMesAtualKmL = mesAtualData?.kmPorLitro ?? null;

  let desempenhoQueda = false;
  const idx = historicoMensal.findIndex((m) => m.mes === mesAtual);
  if (idx >= 0 && consumoMedioMesAtualKmL != null) {
    const anteriores = historicoMensal
      .slice(Math.max(0, idx - 3), idx)
      .map((m) => m.kmPorLitro)
      .filter((v): v is number => v != null);
    if (anteriores.length > 0) {
      const mediaAnterior = anteriores.reduce((a, b) => a + b, 0) / anteriores.length;
      // Queda de desempenho = menos km/L (mais litros por km)
      if (mediaAnterior > 0 && consumoMedioMesAtualKmL < mediaAnterior * (1 - QUEDA_THRESHOLD)) {
        desempenhoQueda = true;
      }
    }
  }

  const totalKm = intervalos.reduce((s, i) => s + i.kmRodados, 0);
  const totalLitros = intervalos.reduce((s, i) => s + i.litros, 0);

  return {
    consumoMedioTotalKmL,
    consumoMedioMesAtualKmL,
    litrosPorKmTotal: totalKm > 0 ? totalLitros / totalKm : null,
    historicoMensal,
    desempenhoQueda,
    intervalos,
  };
}
