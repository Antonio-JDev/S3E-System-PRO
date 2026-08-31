/** Dias até a data de vencimento (negativo = já vencido). */
export function calcularDiasAteVencimento(data: Date | string | null | undefined): number | null {
  if (data == null || data === '') return null;
  const raw = typeof data === 'string' ? data.trim() : data;
  const venc =
    typeof raw === 'string'
      ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw)
      : new Date(raw);
  if (Number.isNaN(venc.getTime())) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  venc.setHours(0, 0, 0, 0);
  return Math.round((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

export function enriquecerVencimentosVeiculo(veiculo: {
  dataVencimentoIpva?: Date | string | null;
  dataVencimentoLicenciamento?: Date | string | null;
}) {
  const diasAteVencimentoIpva = calcularDiasAteVencimento(veiculo.dataVencimentoIpva);
  const diasAteVencimentoLicenciamento = calcularDiasAteVencimento(
    veiculo.dataVencimentoLicenciamento
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
