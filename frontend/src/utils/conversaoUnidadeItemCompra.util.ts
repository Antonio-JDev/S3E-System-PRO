import { roundMoney } from './financeiroValor';

export type OrigemConversaoForm = 'AUTOMATICA_IMPORTACAO' | 'MANUAL';

/** Conversão já aplicada no item do formulário — enviada ao backend para auditoria */
export type ConversaoUnidadeForm = {
  de: string;
  para: string;
  quantidadeOriginal: number;
  valorUnitOriginal: number;
  origem: OrigemConversaoForm;
  motivo?: string;
  descricao?: string;
};

export type ItemComConversao = {
  quantity?: number;
  unitCost?: number;
  totalCost?: number;
  unidadeMedida?: string;
  conversaoUnidade?: ConversaoUnidadeForm | null;
  conversaoRecusada?: boolean;
};

/** Item vindo do parse-xml do backend: aplica a conversão automática (sem arredondar o unitário por metro). */
export function camposItemImportadoXml(it: any): Required<Pick<ItemComConversao, 'quantity' | 'unitCost' | 'totalCost'>> &
  Pick<ItemComConversao, 'unidadeMedida' | 'conversaoUnidade'> {
  const quantity = Number(it.quantidade) || 0;
  const auto = it.conversaoAutomatica;
  if (auto) {
    return {
      quantity,
      unitCost: Number(it.valorUnit) || 0,
      totalCost: roundMoney(Number(it.valorTotal) || quantity * (Number(it.valorUnit) || 0)),
      unidadeMedida: auto.para || it.unidadeMedida || 'm',
      conversaoUnidade: {
        de: auto.de || auto.unidadeOriginal || 'km',
        para: auto.para || 'm',
        quantidadeOriginal: Number(auto.quantidadeOriginal),
        valorUnitOriginal: Number(auto.valorUnitOriginal),
        origem: 'AUTOMATICA_IMPORTACAO',
        motivo: auto.motivo,
        descricao: auto.descricao,
      },
    };
  }
  const unitCost = roundMoney(Number(it.valorUnit) || 0);
  return {
    quantity,
    unitCost,
    totalCost: roundMoney(quantity * unitCost),
    unidadeMedida: it.unidadeMedida || 'un',
    conversaoUnidade: null,
  };
}

/** Registra uma conversão manual feita no formulário (modal Converter unidade). */
export function registrarConversaoManual<T extends ItemComConversao>(
  item: T,
  novo: { unidade: string; quantity: number; unitCost: number; totalCost: number }
): T {
  const unidadeAntes = (item.unidadeMedida || 'un').toLowerCase();
  const anterior = item.conversaoUnidade;

  let conversaoUnidade: ConversaoUnidadeForm | null;
  let conversaoRecusada = item.conversaoRecusada;
  if (anterior && anterior.de === novo.unidade) {
    conversaoUnidade = null;
    conversaoRecusada = anterior.origem === 'AUTOMATICA_IMPORTACAO' ? true : conversaoRecusada;
  } else if (anterior) {
    conversaoUnidade = { ...anterior, para: novo.unidade, origem: 'MANUAL' };
  } else if (unidadeAntes !== novo.unidade) {
    conversaoUnidade = {
      de: unidadeAntes,
      para: novo.unidade,
      quantidadeOriginal: item.quantity ?? 0,
      valorUnitOriginal: item.unitCost ?? 0,
      origem: 'MANUAL',
    };
  } else {
    conversaoUnidade = null;
  }

  return {
    ...item,
    quantity: novo.quantity,
    unitCost: novo.unitCost,
    totalCost: novo.totalCost,
    unidadeMedida: novo.unidade,
    conversaoUnidade,
    conversaoRecusada,
  };
}

/** Desfaz a conversão automática da importação, voltando para a unidade/valores da NF. */
export function desfazerConversaoAutomatica<T extends ItemComConversao>(item: T): T {
  const conv = item.conversaoUnidade;
  if (!conv) return item;
  return {
    ...item,
    quantity: conv.quantidadeOriginal,
    unitCost: conv.valorUnitOriginal,
    totalCost: item.totalCost ?? roundMoney(conv.quantidadeOriginal * conv.valorUnitOriginal),
    unidadeMedida: conv.de,
    conversaoUnidade: null,
    conversaoRecusada: true,
  };
}

/** Campos de conversão para o payload de criação da compra. */
export function camposConversaoPayload(item: ItemComConversao): {
  conversaoUnidade?: { de: string; para: string; quantidadeOriginal: number; valorUnitOriginal: number; origem: OrigemConversaoForm };
  conversaoRecusada?: boolean;
} {
  const conv = item.conversaoUnidade;
  return {
    ...(conv
      ? {
          conversaoUnidade: {
            de: conv.de,
            para: conv.para,
            quantidadeOriginal: conv.quantidadeOriginal,
            valorUnitOriginal: conv.valorUnitOriginal,
            origem: conv.origem,
          },
        }
      : {}),
    ...(item.conversaoRecusada ? { conversaoRecusada: true } : {}),
  };
}
