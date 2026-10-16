import {
  normalizarCodigoFornecedor,
  normalizarEan,
} from '../services/materialFornecedorAlias.service';
import { normalizarNomeProduto } from './stringUtils';
import { cnpjDeXml, mesmoCnpjFornecedor } from './cnpjFornecedor.util';

export type NfeIdentidade = {
  numeroNF: string;
  serieNF: string | null;
  fornecedorCNPJ: string;
  chaveAcesso: string | null;
};

export type NfeItemAjuste = {
  nItem: number;
  nomeProduto: string;
  nomeNormalizado: string;
  codigoFornecedor: string | null;
  ean: string | null;
  ncm: string | null;
  valorICMS: number | null;
  quantidade: number;
  valorUnit: number;
  valorTotal: number;
};

export type NfeTotaisAjuste = {
  valorICMS: number;
  valorIPI: number;
  valorFrete: number;
  outrasDespesas: number;
  valorDesconto: number;
  valorTotalProdutos: number;
  valorTotalNota: number;
};

export type NfeParseAjuste = {
  identidade: NfeIdentidade;
  items: NfeItemAjuste[];
  totais: NfeTotaisAjuste;
};

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function extrairValorIcmsDet(imposto: any): number | null {
  if (!imposto?.ICMS) return null;
  const icms = imposto.ICMS;
  const bloco =
    icms.ICMS00 ||
    icms.ICMS10 ||
    icms.ICMS20 ||
    icms.ICMS30 ||
    icms.ICMS40 ||
    icms.ICMS51 ||
    icms.ICMS60 ||
    icms.ICMS70 ||
    icms.ICMS90 ||
    icms.ICMSSN101 ||
    icms.ICMSSN102 ||
    icms.ICMSSN201 ||
    icms.ICMSSN202 ||
    icms.ICMSSN500 ||
    icms.ICMSSN900 ||
    null;
  if (!bloco) return null;
  const raw = bloco.vICMS ?? bloco.vICMSST ?? null;
  if (raw == null || raw === '') return null;
  const n = parseFloat(String(raw));
  return Number.isFinite(n) ? n : null;
}

/**
 * Extrai identidade, itens (EAN/cProd/ICMS) e totais a partir do objeto já parseado do XML.
 */
export function extrairDadosAjusteDeNfe(nfeRoot: any): NfeParseAjuste {
  const nfe = nfeRoot?.nfeProc?.NFe?.infNFe || nfeRoot?.NFe?.infNFe || nfeRoot?.infNFe || {};
  const idAttr = String(nfe['@_Id'] || nfe.Id || '');
  const chaveAcesso = idAttr.replace(/^NFe/i, '') || null;

  const numeroNF = String(nfe.ide?.nNF ?? '').trim();
  const serieRaw = nfe.ide?.serie ?? nfe.ide?.serieNF;
  const serieNF =
    serieRaw != null && String(serieRaw).trim() !== '' ? String(serieRaw).trim() : null;
  const fornecedorCNPJ = cnpjDeXml(nfe.emit?.CNPJ);

  const detList = asArray(nfe.det);
  const items: NfeItemAjuste[] = [];
  for (const det of detList) {
    if (!det?.prod) continue;
    const nomeProduto = String(det.prod.xProd || '').trim();
    const codigoFornecedor = normalizarCodigoFornecedor(
      det.prod.cProd != null ? String(det.prod.cProd) : null
    );
    const ean = normalizarEan(det.prod.cEAN || det.prod.cEANTrib);
    const ncmValue = det.prod.NCM;
    const nItem = parseInt(String(det['@_nItem'] || det.nItem || items.length + 1), 10) || items.length + 1;

    items.push({
      nItem,
      nomeProduto,
      nomeNormalizado: normalizarNomeProduto(nomeProduto),
      codigoFornecedor,
      ean,
      ncm: ncmValue != null ? String(ncmValue) : null,
      valorICMS: extrairValorIcmsDet(det.imposto),
      quantidade: parseFloat(String(det.prod.qCom || '0')) || 0,
      valorUnit: parseFloat(String(det.prod.vUnCom || '0')) || 0,
      valorTotal: parseFloat(String(det.prod.vProd || '0')) || 0,
    });
  }

  const totaisRaw = nfe.total?.ICMSTot || {};
  const totais: NfeTotaisAjuste = {
    valorICMS: parseFloat(String(totaisRaw.vICMS || '0')) || 0,
    valorIPI: parseFloat(String(totaisRaw.vIPI || '0')) || 0,
    valorFrete: parseFloat(String(totaisRaw.vFrete || '0')) || 0,
    outrasDespesas: parseFloat(String(totaisRaw.vOutro || '0')) || 0,
    valorDesconto: parseFloat(String(totaisRaw.vDesc || '0')) || 0,
    valorTotalProdutos: parseFloat(String(totaisRaw.vProd || '0')) || 0,
    valorTotalNota: parseFloat(String(totaisRaw.vNF || '0')) || 0,
  };

  return {
    identidade: { numeroNF, serieNF, fornecedorCNPJ, chaveAcesso },
    items,
    totais,
  };
}

export type CompraIdentidadeRef = {
  numeroNF: string;
  serieNF?: string | null;
  fornecedorCNPJ?: string | null;
  /** CNPJ do Fornecedor vinculado, usado se o snapshot da compra estiver vazio ou divergente. */
  fornecedorVinculadoCNPJ?: string | null;
};

/**
 * Valida se o XML corresponde à compra (mesma regra de duplicata: NF + CNPJ fornecedor).
 * Série é checada quando ambas estão preenchidas.
 */
export function validarIdentidadeNfeCompra(
  compra: CompraIdentidadeRef,
  xml: NfeIdentidade
): { ok: true } | { ok: false; message: string } {
  const nfCompra = String(compra.numeroNF || '').trim();
  const nfXml = String(xml.numeroNF || '').trim();
  if (!nfXml) {
    return { ok: false, message: 'XML sem número de NF. Verifique o arquivo.' };
  }
  if (nfCompra !== nfXml) {
    return {
      ok: false,
      message: `Este XML é da NF ${nfXml}, mas a compra é da NF ${nfCompra}. Envie o XML exato desta compra.`,
    };
  }

  const cnpjXml = cnpjDeXml(xml.fornecedorCNPJ);
  if (!cnpjXml || cnpjXml.length !== 14) {
    return { ok: false, message: 'XML sem CNPJ do fornecedor válido.' };
  }
  const bateSnapshot = mesmoCnpjFornecedor(compra.fornecedorCNPJ, cnpjXml);
  const bateVinculo = mesmoCnpjFornecedor(compra.fornecedorVinculadoCNPJ, cnpjXml);
  if (!bateSnapshot && !bateVinculo) {
    return {
      ok: false,
      message:
        'O CNPJ do fornecedor no XML não confere com o da compra. Envie o XML exato desta nota.',
    };
  }

  const serieCompra =
    compra.serieNF != null && String(compra.serieNF).trim() !== ''
      ? String(compra.serieNF).trim()
      : null;
  const serieXml = xml.serieNF;
  if (serieCompra && serieXml && serieCompra !== serieXml) {
    return {
      ok: false,
      message: `A série do XML (${serieXml}) não confere com a da compra (${serieCompra}).`,
    };
  }

  return { ok: true };
}

export type CompraItemMatchRef = {
  id: string;
  nomeProduto: string;
  codigoFornecedor?: string | null;
  ean?: string | null;
  materialId?: string | null;
};

/**
 * Emparelha itens da compra com linhas do XML sem destruir vínculos.
 * Prioridade: cProd estável → EAN → nome normalizado → índice (se mesma quantidade).
 */
export function emparelharItensCompraComXml(
  itensCompra: CompraItemMatchRef[],
  itensXml: NfeItemAjuste[]
): Array<{ compraItemId: string; xmlItem: NfeItemAjuste } | null> {
  const usados = new Set<number>();
  const resultado: Array<{ compraItemId: string; xmlItem: NfeItemAjuste } | null> = [];

  const tentar = (
    pred: (xml: NfeItemAjuste, idx: number) => boolean
  ): NfeItemAjuste | null => {
    for (let i = 0; i < itensXml.length; i++) {
      if (usados.has(i)) continue;
      if (pred(itensXml[i], i)) {
        usados.add(i);
        return itensXml[i];
      }
    }
    return null;
  };

  for (let i = 0; i < itensCompra.length; i++) {
    const item = itensCompra[i];
    const cprod = normalizarCodigoFornecedor(item.codigoFornecedor);
    const ean = normalizarEan(item.ean);
    const nomeNorm = normalizarNomeProduto(item.nomeProduto || '');

    let xmlItem: NfeItemAjuste | null = null;

    if (cprod) {
      xmlItem = tentar((x) => x.codigoFornecedor === cprod);
    }
    if (!xmlItem && ean) {
      xmlItem = tentar((x) => x.ean === ean);
    }
    if (!xmlItem && nomeNorm) {
      xmlItem = tentar((x) => x.nomeNormalizado === nomeNorm);
    }
    if (!xmlItem && itensCompra.length === itensXml.length && !usados.has(i)) {
      usados.add(i);
      xmlItem = itensXml[i];
    }

    resultado.push(xmlItem ? { compraItemId: item.id, xmlItem } : null);
  }

  return resultado;
}

/**
 * Campos a gravar no CompraItem a partir do XML.
 * Só aplica EAN/cProd quando o XML traz valor válido — nunca limpa o que já existe
 * (ex.: cEAN = "SEM GTIN" → ean null → não sobrescreve).
 */
export function camposAjusteItemDeXml(
  xmlItem: Pick<NfeItemAjuste, 'ean' | 'codigoFornecedor' | 'ncm'>,
  atual: { ncm?: string | null }
): { ean?: string; codigoFornecedor?: string; ncm?: string } {
  const data: { ean?: string; codigoFornecedor?: string; ncm?: string } = {};
  if (xmlItem.ean) data.ean = xmlItem.ean;
  if (xmlItem.codigoFornecedor) data.codigoFornecedor = xmlItem.codigoFornecedor;
  if (xmlItem.ncm && !atual.ncm) data.ncm = xmlItem.ncm;
  return data;
}
