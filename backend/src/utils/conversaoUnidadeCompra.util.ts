/**
 * Regras de conversão de unidade de itens de compra (cabos/fios vendidos em km -> estoque em metros).
 */

export type UnidadeComprimento = 'km' | 'm' | 'cm';

const FATOR_METROS: Record<UnidadeComprimento, number> = { km: 1000, m: 1, cm: 0.01 };

/** Acima disso por metro não é plausível para cabo 750V/1kV de 1 a 120mm — o preço é por km. */
export const LIMITE_PRECO_METRO_CABO = 500;
/** Faixa da razão valorUnit / preço por metro do material que indica preço por km (~1000x). */
export const RAZAO_PRECO_KM_MIN = 300;
export const RAZAO_PRECO_KM_MAX = 3000;
export const TOLERANCIA_SUBTOTAL = 0.02;

export type MotivoConversao = 'UNIDADE_KM' | 'PRECO_PROPORCIONAL_MATERIAL' | 'PRECO_ACIMA_LIMITE_METRO';

const ALIASES_UNIDADE: Record<string, string> = {
  km: 'km',
  kilometro: 'km',
  quilometro: 'km',
  'kilômetro': 'km',
  'quilômetro': 'km',
  m: 'm',
  mt: 'm',
  mts: 'm',
  metro: 'm',
  metros: 'm',
  cm: 'cm',
  centimetro: 'cm',
  'centímetro': 'cm',
  centimetros: 'cm',
  'centímetros': 'cm',
};

export function normalizarUnidade(unidade?: string | null): string {
  const u = String(unidade ?? '').toLowerCase().trim();
  if (!u) return 'un';
  return ALIASES_UNIDADE[u] ?? u;
}

export function isUnidadeComprimento(unidade?: string | null): unidade is UnidadeComprimento {
  return normalizarUnidade(unidade) in FATOR_METROS;
}

/** Fator que multiplica a quantidade ao converter de `de` para `para` (km -> m = 1000). */
export function fatorConversao(de: string, para: string): number {
  const d = normalizarUnidade(de);
  const p = normalizarUnidade(para);
  if (!isUnidadeComprimento(d) || !isUnidadeComprimento(p)) {
    throw new Error(`Conversão não suportada: ${de} -> ${para} (use km, m ou cm)`);
  }
  if (d === p) throw new Error('Unidade de origem e destino são iguais');
  return FATOR_METROS[d] / FATOR_METROS[p];
}

export function confereSubtotal(
  quantidade: number,
  valorUnit: number,
  valorTotal: number,
  tolerancia = TOLERANCIA_SUBTOTAL,
): boolean {
  if (![quantidade, valorUnit, valorTotal].every(Number.isFinite)) return false;
  return Math.abs(quantidade * valorUnit - valorTotal) <= tolerancia;
}

/**
 * Cabo/fio de 750V ou 1kV com bitola de 1,00mm até 120,00mm (vendido por km por alguns fornecedores).
 */
export function isCaboFioEspecifico(nomeProduto: string): boolean {
  if (!nomeProduto) return false;
  const nomeLower = nomeProduto.toLowerCase();

  const temCaboFio = nomeLower.includes('cabo') || nomeLower.includes('fio');
  if (!temCaboFio) return false;

  const temTensao =
    nomeLower.includes('750') ||
    nomeLower.includes('1kv') ||
    nomeLower.includes('1 kv') ||
    nomeLower.includes('1000v');
  if (!temTensao) return false;

  const match = nomeLower.match(/(\d+[,.]?\d*)\s*mm/i);
  if (!match) return false;
  const bitola = parseFloat(match[1].replace(',', '.'));
  return bitola >= 1.0 && bitola <= 120.0;
}

/** Cabo vendido em rolo/bobina com metragem no nome: o preço por "UN" é da embalagem, não do km. */
export function pareceEmbalagemComMetragem(nomeProduto: string): boolean {
  const nome = (nomeProduto || '').toLowerCase();
  if (/\b(rolo|rl|bobina|caixa|cx)\b/.test(nome)) return true;
  return /\b\d+\s*(m|mt|mts|metros)\b/.test(nome);
}

export interface ItemParaDetectar {
  nomeProduto: string;
  unidadeMedida?: string | null;
  quantidade: number;
  valorUnit: number;
  valorTotal: number;
  /** Preço atual por metro do material vinculado (se houver). */
  precoMaterialPorMetro?: number | null;
}

export interface ResultadoDeteccao {
  converter: boolean;
  motivo?: MotivoConversao;
  descricao?: string;
}

export function detectarConversaoKmParaM(item: ItemParaDetectar): ResultadoDeteccao {
  if (!isCaboFioEspecifico(item.nomeProduto)) return { converter: false };
  const quantidade = Number(item.quantidade);
  const valorUnit = Number(item.valorUnit);
  const valorTotal = Number(item.valorTotal);
  if (!(quantidade > 0) || !(valorUnit > 0)) return { converter: false };
  if (!confereSubtotal(quantidade, valorUnit, valorTotal)) return { converter: false };

  const unidade = normalizarUnidade(item.unidadeMedida);
  if (unidade === 'km') {
    return { converter: true, motivo: 'UNIDADE_KM', descricao: 'Unidade da nota em km' };
  }
  if (unidade !== 'un') return { converter: false };
  if (pareceEmbalagemComMetragem(item.nomeProduto)) return { converter: false };

  const precoMetro = Number(item.precoMaterialPorMetro ?? 0);
  if (precoMetro > 0) {
    const razao = valorUnit / precoMetro;
    if (razao >= RAZAO_PRECO_KM_MIN && razao <= RAZAO_PRECO_KM_MAX) {
      return {
        converter: true,
        motivo: 'PRECO_PROPORCIONAL_MATERIAL',
        descricao: `Valor unitário ~${Math.round(razao)}x o preço por metro do material`,
      };
    }
  }
  if (valorUnit > LIMITE_PRECO_METRO_CABO) {
    return {
      converter: true,
      motivo: 'PRECO_ACIMA_LIMITE_METRO',
      descricao: `Valor unitário acima de R$ ${LIMITE_PRECO_METRO_CABO} — incompatível com preço por metro`,
    };
  }
  return { converter: false };
}

export const arred6 = (n: number) => Math.round(n * 1e6) / 1e6;
const arred2 = (n: number) => Math.round(n * 100) / 100;

export interface ResultadoConversao {
  fator: number;
  unidade: string;
  quantidade: number;
  valorUnit: number;
  valorTotal: number;
}

/** Converte quantidade e valor unitário preservando o valor total do item. */
export function calcularConversao(
  item: { quantidade: number; valorUnit: number; valorTotal: number },
  de: string,
  para: string,
): ResultadoConversao {
  const fator = fatorConversao(de, para);
  return {
    fator,
    unidade: normalizarUnidade(para),
    quantidade: arred6(Number(item.quantidade) * fator),
    valorUnit: arred6(Number(item.valorUnit) / fator),
    valorTotal: Number(item.valorTotal),
  };
}

/** Conversão já feita no formulário (automática na importação do XML ou pelo botão manual). */
export interface ConversaoInformada {
  de: string;
  para?: string;
  quantidadeOriginal: number;
  valorUnitOriginal: number;
  origem?: 'AUTOMATICA_IMPORTACAO' | 'MANUAL';
}

export interface ItemCompraEntrada {
  nomeProduto: string;
  quantidade: number;
  valorUnit: number;
  unidadeMedida?: string | null;
  conversaoUnidade?: ConversaoInformada | null;
  /** Usuário desfez a conversão automática no formulário: não reconverter. */
  conversaoRecusada?: boolean;
}

export interface CamposUnidadeItemCompra {
  unidadeMedida: string;
  unidadeOriginal?: string;
  quantidadeOriginal?: number;
  valorUnitOriginal?: number;
  conversaoUnidadeEm?: Date;
  conversaoUnidadeOrigem?: 'AUTOMATICA_IMPORTACAO' | 'MANUAL';
  conversaoUnidadePorId?: string;
  conversaoUnidadePorNome?: string | null;
}

/**
 * Normaliza unidade/valores de um item no registro da compra e aplica a rede de segurança km -> m
 * para cabos lançados explicitamente em km. Itens convertidos mantêm 6 casas no valor unitário
 * (arredondar R$ 9,7161/m para R$ 9,72 alteraria o total do item).
 */
export function prepararUnidadeItemCompra(
  item: ItemCompraEntrada,
  agora: Date = new Date(),
): { quantidade: number; valorUnit: number; campos: CamposUnidadeItemCompra } {
  const quantidade = Number(item.quantidade);
  const valorUnit = Number(item.valorUnit);
  const unidade = normalizarUnidade(item.unidadeMedida);
  const informada = item.conversaoUnidade;

  if (informada && Number(informada.quantidadeOriginal) > 0) {
    return {
      quantidade,
      valorUnit: arred6(valorUnit),
      campos: {
        unidadeMedida: normalizarUnidade(item.unidadeMedida || informada.para),
        unidadeOriginal: normalizarUnidade(informada.de),
        quantidadeOriginal: Number(informada.quantidadeOriginal),
        valorUnitOriginal: Number(informada.valorUnitOriginal),
        conversaoUnidadeEm: agora,
        conversaoUnidadeOrigem: informada.origem === 'AUTOMATICA_IMPORTACAO' ? 'AUTOMATICA_IMPORTACAO' : 'MANUAL',
      },
    };
  }

  if (!item.conversaoRecusada && unidade === 'km') {
    const valorTotal = arred2(quantidade * valorUnit);
    const det = detectarConversaoKmParaM({ nomeProduto: item.nomeProduto, unidadeMedida: unidade, quantidade, valorUnit, valorTotal });
    if (det.converter) {
      const conv = calcularConversao({ quantidade, valorUnit, valorTotal }, 'km', 'm');
      return {
        quantidade: conv.quantidade,
        valorUnit: conv.valorUnit,
        campos: {
          unidadeMedida: conv.unidade,
          unidadeOriginal: 'km',
          quantidadeOriginal: quantidade,
          valorUnitOriginal: valorUnit,
          conversaoUnidadeEm: agora,
          conversaoUnidadeOrigem: 'AUTOMATICA_IMPORTACAO',
        },
      };
    }
  }

  return { quantidade, valorUnit: arred2(valorUnit), campos: { unidadeMedida: unidade } };
}
