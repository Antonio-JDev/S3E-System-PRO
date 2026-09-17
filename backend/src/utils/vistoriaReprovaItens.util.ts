/**
 * Itens de avaliação de reprova CELESC + validação pura.
 * Checklist padrão alinhado a vistoria de entrada / quadro de medição.
 */

export type ItemChecklistVistoriaCelesc = {
  codigo: string;
  label: string;
};

export type ItemAvaliacaoReprova = {
  codigo: string;
  label: string;
  /** true = passou; false = não passou */
  passou: boolean;
  /** Obrigatória quando passou === false */
  justificativa: string;
};

export const ITENS_PADRAO_VISTORIA_CELESC: ItemChecklistVistoriaCelesc[] = [
  { codigo: 'quadro_medicao', label: 'Quadro de medição' },
  { codigo: 'padrao_entrada', label: 'Padrão de entrada' },
  { codigo: 'aterramento', label: 'Aterramento' },
  { codigo: 'condutores', label: 'Condutores / bitolas' },
  { codigo: 'protecoes', label: 'Dispositivos de proteção (DR/DPS/disjuntores)' },
  { codigo: 'caixa_passagem', label: 'Caixa de passagem / eletrodutos' },
  { codigo: 'fixacao', label: 'Fixação e estrutura' },
  { codigo: 'identificacao', label: 'Identificação / plaqueta' },
  { codigo: 'distancias', label: 'Distâncias de segurança' },
  { codigo: 'documentacao', label: 'Documentação / projeto aprovado' },
];

export type ValidacaoItensAvaliacaoOk = {
  ok: true;
  itens: ItemAvaliacaoReprova[];
  itensReprovados: string[];
  motivosResumo: string;
};

export type ValidacaoItensAvaliacaoErro = {
  ok: false;
  message: string;
};

export type ValidacaoItensAvaliacaoResult =
  | ValidacaoItensAvaliacaoOk
  | ValidacaoItensAvaliacaoErro;

function catalogoPorCodigo(): Map<string, string> {
  return new Map(ITENS_PADRAO_VISTORIA_CELESC.map((i) => [i.codigo, i.label]));
}

/**
 * Normaliza payload cru (create/update) para lista tipada.
 * Aceita objetos parciais; preenche label a partir do catálogo quando possível.
 */
export function normalizarItensAvaliacao(raw: unknown): ItemAvaliacaoReprova[] {
  if (!Array.isArray(raw)) return [];
  const catalogo = catalogoPorCodigo();

  return raw
    .map((entry): ItemAvaliacaoReprova | null => {
      if (entry == null || typeof entry !== 'object') return null;
      const obj = entry as Record<string, unknown>;
      const codigo = String(obj.codigo ?? obj.itemId ?? '').trim();
      const labelRaw = String(obj.label ?? obj.nome ?? '').trim();
      const label = labelRaw || (codigo ? catalogo.get(codigo) ?? codigo : '');
      if (!codigo && !label) return null;

      const passouExplicit =
        typeof obj.passou === 'boolean'
          ? obj.passou
          : typeof obj.aprovado === 'boolean'
            ? obj.aprovado
            : obj.status != null
              ? !['reprovado', 'nao_passou', 'não_passou', 'fail', 'failed'].includes(
                  String(obj.status).toLowerCase(),
                )
              : obj.reprovado === true
                ? false
                : true;

      return {
        codigo: codigo || label.toLowerCase().replace(/\s+/g, '_').slice(0, 64),
        label: label || codigo,
        passou: passouExplicit,
        justificativa: String(obj.justificativa ?? obj.motivo ?? '').trim(),
      };
    })
    .filter((i): i is ItemAvaliacaoReprova => i != null);
}

/**
 * Converte legado (string[]) em itens avaliados (todos como não passaram, sem justificativa individual).
 */
export function itensReprovadosLegadoParaAvaliacao(raw: unknown): ItemAvaliacaoReprova[] {
  let labels: string[] = [];
  if (Array.isArray(raw)) {
    labels = raw.map((s) => String(s).trim()).filter(Boolean);
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        labels = parsed.map((s) => String(s).trim()).filter(Boolean);
      } else {
        labels = raw
          .split(/\r?\n|,/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
    } catch {
      labels = raw
        .split(/\r?\n|,/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  const porLabel = new Map(
    ITENS_PADRAO_VISTORIA_CELESC.map((i) => [i.label.toLowerCase(), i]),
  );

  return labels.map((label) => {
    const found = porLabel.get(label.toLowerCase());
    if (found) {
      return {
        codigo: found.codigo,
        label: found.label,
        passou: false,
        justificativa: '',
      };
    }
    return {
      codigo: label.toLowerCase().replace(/\s+/g, '_').slice(0, 64),
      label,
      passou: false,
      justificativa: '',
    };
  });
}

/**
 * Validação MVP:
 * - ao menos um item na lista
 * - ao menos um item marcado como não passou
 * - itens que não passaram exigem justificativa não vazia
 */
export function validarItensAvaliacaoReprova(raw: unknown): ValidacaoItensAvaliacaoResult {
  const itens = normalizarItensAvaliacao(raw);

  if (itens.length === 0) {
    return { ok: false, message: 'Informe ao menos um item da avaliação' };
  }

  const reprovados = itens.filter((i) => !i.passou);
  if (reprovados.length === 0) {
    return {
      ok: false,
      message: 'Marque ao menos um item como não passou para registrar a reprova',
    };
  }

  const semJustificativa = reprovados.filter((i) => !i.justificativa.trim());
  if (semJustificativa.length > 0) {
    const nomes = semJustificativa.map((i) => i.label).join(', ');
    return {
      ok: false,
      message: `Justificativa obrigatória para itens que não passaram: ${nomes}`,
    };
  }

  const itensNorm = itens.map((i) => ({
    codigo: i.codigo,
    label: i.label,
    passou: i.passou,
    justificativa: i.passou ? (i.justificativa || '') : i.justificativa.trim(),
  }));

  const itensReprovados = itensNorm.filter((i) => !i.passou).map((i) => i.label);
  const motivosResumo = itensNorm
    .filter((i) => !i.passou)
    .map((i) => `${i.label}: ${i.justificativa}`)
    .join('\n');

  return {
    ok: true,
    itens: itensNorm,
    itensReprovados,
    motivosResumo,
  };
}

/** Monta lista completa do checklist com estado salvo (ou padrão passou=true). */
export function montarChecklistComEstado(
  salvos: ItemAvaliacaoReprova[] | null | undefined,
): ItemAvaliacaoReprova[] {
  const porCodigo = new Map((salvos ?? []).map((i) => [i.codigo, i]));
  const base = ITENS_PADRAO_VISTORIA_CELESC.map((padrao) => {
    const salvo = porCodigo.get(padrao.codigo);
    if (salvo) {
      return {
        codigo: padrao.codigo,
        label: padrao.label,
        passou: salvo.passou,
        justificativa: salvo.justificativa || '',
      };
    }
    return {
      codigo: padrao.codigo,
      label: padrao.label,
      passou: true,
      justificativa: '',
    };
  });

  // Inclui itens custom/legado que não estão no catálogo
  for (const salvo of salvos ?? []) {
    if (!ITENS_PADRAO_VISTORIA_CELESC.some((p) => p.codigo === salvo.codigo)) {
      base.push({
        codigo: salvo.codigo,
        label: salvo.label,
        passou: salvo.passou,
        justificativa: salvo.justificativa || '',
      });
    }
  }

  return base;
}
