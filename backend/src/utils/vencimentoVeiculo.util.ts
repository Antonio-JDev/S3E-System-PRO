import {
  dataReferenciaDiaCivilUtc,
  parseDataDiaCivilInput,
  ymdCivilBrasilia,
  ymdDeDataDiaCivil,
} from './datetime-sp.util';
/** Dias até a data de vencimento (negativo = já vencido). Referência: dia civil em Brasília. */
export function calcularDiasAteVencimento(
  data: Date | string | null | undefined,
  agora: Date = new Date(),
): number | null {
  const vencYmd = ymdDeDataDiaCivil(data);
  if (!vencYmd) return null;
  const [vy, vm, vd] = vencYmd.split('-').map(Number);
  const hoje = ymdCivilBrasilia(agora);
  const vencDate = dataReferenciaDiaCivilUtc(vy, vm, vd);
  const hojeDate = dataReferenciaDiaCivilUtc(hoje.ano, hoje.mes, hoje.dia);
  return Math.round((vencDate.getTime() - hojeDate.getTime()) / (1000 * 60 * 60 * 24));
}

export function enriquecerVencimentosVeiculo(
  veiculo: {
    dataVencimentoIpva?: Date | string | null;
    dataVencimentoLicenciamento?: Date | string | null;
  },
  agora: Date = new Date(),
) {
  const diasAteVencimentoIpva = calcularDiasAteVencimento(veiculo.dataVencimentoIpva, agora);
  const diasAteVencimentoLicenciamento = calcularDiasAteVencimento(
    veiculo.dataVencimentoLicenciamento,
    agora,
  );
  return {
    diasAteVencimentoIpva,
    diasAteVencimentoLicenciamento,
    ipvaProximoVencimento:
      diasAteVencimentoIpva != null && diasAteVencimentoIpva <= 30,
    licenciamentoProximoVencimento:
      diasAteVencimentoLicenciamento != null && diasAteVencimentoLicenciamento <= 30,
  };
}

/** Reexport para serviços de frota persistirem datas sem shift de timezone. */
export { parseDataDiaCivilInput };
