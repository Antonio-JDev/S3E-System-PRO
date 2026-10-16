/**
 * Grupo IBS/CBS da NF-e 4.00 (NT 2025.002 / PL_010b v1.30).
 *
 * No leiaute deste repositório (`DFeTiposBasicos_v1.00.xsd` e `leiauteNFe_v4.00.xsd`):
 * - `det/imposto/IBSCBS` é `TTribNFe` (opcional; fica depois de COFINS e de IS).
 * - `total/IBSCBSTot` é `TIBSCBSMonoTot` (opcional; fica depois de ICMSTot e de ISTot).
 *
 * Obrigatórios de `TTribNFe`: CST e cClassTrib. A choice `gIBSCBS` é opcional
 * (`minOccurs=0`). Ela entra mesmo assim: é o grupo da tributação regular, e as
 * alíquotas só existem dentro de `TCIBS`. Filhos obrigatórios de `TCIBS`:
 * vBC, pIBSUF, vIBSUF, pIBSMun, vIBSMun, vIBS, pCBS, vCBS.
 *
 * Obrigatório de `TIBSCBSMonoTot`: vBCIBSCBS. `gIBS` e `gCBS` são opcionais;
 * abertos, exigem vDif, vDevTrib, o valor do tributo, vCredPres e
 * vCredPresCondSus. Eles acompanham a soma dos itens. Diferimento, devolução,
 * crédito presumido, monofasia e estorno ficam de fora (não usados).
 *
 * TCST e TcClassTrib não têm enumeração no XSD (só `\d{3}` e `\d{6}`). Não há
 * código explícito de operação não incidente ou alíquota zero. O padrão é
 * CST 000 e cClassTrib 000000, com alíquotas 0.00. A alíquota definitiva, o CST
 * e o cClassTrib oficiais vêm da regra do contador. Este módulo não inventa
 * percentual real de IBS/CBS.
 *
 * No Simples Nacional o fragmento entra além do ICMSSN102, sem substituir o ICMS.
 */

export type DadosIbscbsItem = {
  valorBase: number;
  cst?: string;
  cClassTrib?: string;
  aliquotaIbsUf?: number;
  aliquotaIbsMun?: number;
  aliquotaCbs?: number;
};

const CST_PADRAO = '000';
const CCLASS_TRIB_PADRAO = '000000';

type ItemCalculado = {
  cst: string;
  cClassTrib: string;
  baseCentavos: number;
  aliquotaIbsUf: number;
  aliquotaIbsMun: number;
  aliquotaCbs: number;
  vIbsUfCentavos: number;
  vIbsMunCentavos: number;
  vCbsCentavos: number;
};

function centavosDeReais(valor: number): number {
  if (!Number.isFinite(valor) || valor <= 0) return 0;
  const [inteiro, frac = '00'] = valor.toFixed(2).split('.');
  return Number(inteiro) * 100 + Number(frac);
}

function formatarCentavos(centavos: number): string {
  const abs = Math.max(0, Math.trunc(centavos));
  const inteiro = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${inteiro}.${frac}`;
}

/** Alíquota em centésimos de ponto percentual (1,50% vira 150). */
function aliquotaEmCentavos(valor: number | undefined): number {
  if (valor == null || !Number.isFinite(valor) || valor <= 0) return 0;
  if (valor > 999.99) {
    throw new Error('Alíquota de IBS/CBS acima de 999.99 não cabe em TDec_0302_04RTC.');
  }
  const [inteiro, frac = '00'] = valor.toFixed(2).split('.');
  return Number(inteiro) * 100 + Number(frac);
}

function formatarAliquota(centavosPercentual: number): string {
  const abs = Math.max(0, Math.trunc(centavosPercentual));
  const inteiro = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${inteiro}.${frac}`;
}

function tributoCentavos(baseCentavos: number, aliquotaCentavos: number): number {
  if (baseCentavos <= 0 || aliquotaCentavos <= 0) return 0;
  return Math.round((baseCentavos * aliquotaCentavos) / 10000);
}

function codigoCst(valor: string | undefined): string {
  if (valor == null || valor.trim() === '') return CST_PADRAO;
  const codigo = valor.trim();
  if (!/^\d{3}$/.test(codigo)) {
    throw new Error('CST do IBS/CBS deve ter 3 dígitos (TCST).');
  }
  return codigo;
}

function codigoClassTrib(valor: string | undefined): string {
  if (valor == null || valor.trim() === '') return CCLASS_TRIB_PADRAO;
  const codigo = valor.trim();
  if (!/^\d{6}$/.test(codigo)) {
    throw new Error('cClassTrib do IBS/CBS deve ter 6 dígitos (TcClassTrib).');
  }
  return codigo;
}

function calcularItem(dados: DadosIbscbsItem): ItemCalculado {
  const baseCentavos = centavosDeReais(dados.valorBase);
  const aliquotaIbsUf = aliquotaEmCentavos(dados.aliquotaIbsUf);
  const aliquotaIbsMun = aliquotaEmCentavos(dados.aliquotaIbsMun);
  const aliquotaCbs = aliquotaEmCentavos(dados.aliquotaCbs);
  return {
    cst: codigoCst(dados.cst),
    cClassTrib: codigoClassTrib(dados.cClassTrib),
    baseCentavos,
    aliquotaIbsUf,
    aliquotaIbsMun,
    aliquotaCbs,
    vIbsUfCentavos: tributoCentavos(baseCentavos, aliquotaIbsUf),
    vIbsMunCentavos: tributoCentavos(baseCentavos, aliquotaIbsMun),
    vCbsCentavos: tributoCentavos(baseCentavos, aliquotaCbs),
  };
}

function somar(itens: ItemCalculado[], campo: (item: ItemCalculado) => number): number {
  return itens.reduce((total, item) => total + campo(item), 0);
}

/**
 * Fragmento `IBSCBS` de um item (`det/imposto`), na ordem do XSD.
 * Inserir depois de COFINS, sem remover ICMSSN102 nem qualquer outro grupo de ICMS.
 */
export function xmlGrupoIbscbsItem(dados: DadosIbscbsItem): string {
  const item = calcularItem(dados);
  const vIbsCentavos = item.vIbsUfCentavos + item.vIbsMunCentavos;
  return (
    '<IBSCBS>' +
    `<CST>${item.cst}</CST>` +
    `<cClassTrib>${item.cClassTrib}</cClassTrib>` +
    '<gIBSCBS>' +
    `<vBC>${formatarCentavos(item.baseCentavos)}</vBC>` +
    '<gIBSUF>' +
    `<pIBSUF>${formatarAliquota(item.aliquotaIbsUf)}</pIBSUF>` +
    `<vIBSUF>${formatarCentavos(item.vIbsUfCentavos)}</vIBSUF>` +
    '</gIBSUF>' +
    '<gIBSMun>' +
    `<pIBSMun>${formatarAliquota(item.aliquotaIbsMun)}</pIBSMun>` +
    `<vIBSMun>${formatarCentavos(item.vIbsMunCentavos)}</vIBSMun>` +
    '</gIBSMun>' +
    `<vIBS>${formatarCentavos(vIbsCentavos)}</vIBS>` +
    '<gCBS>' +
    `<pCBS>${formatarAliquota(item.aliquotaCbs)}</pCBS>` +
    `<vCBS>${formatarCentavos(item.vCbsCentavos)}</vCBS>` +
    '</gCBS>' +
    '</gIBSCBS>' +
    '</IBSCBS>'
  );
}

/**
 * Fragmento `IBSCBSTot` (`total`), na ordem do XSD.
 * `vBCIBSCBS` é a soma das bases dos itens, já arredondadas a 2 casas.
 */
export function xmlGrupoIbscbsTotal(itens: DadosIbscbsItem[]): string {
  const calculados = (itens ?? []).map(calcularItem);
  const base = somar(calculados, (item) => item.baseCentavos);
  const vIbsUf = somar(calculados, (item) => item.vIbsUfCentavos);
  const vIbsMun = somar(calculados, (item) => item.vIbsMunCentavos);
  const vCbs = somar(calculados, (item) => item.vCbsCentavos);
  const zero = formatarCentavos(0);

  return (
    '<IBSCBSTot>' +
    `<vBCIBSCBS>${formatarCentavos(base)}</vBCIBSCBS>` +
    '<gIBS>' +
    '<gIBSUF>' +
    `<vDif>${zero}</vDif>` +
    `<vDevTrib>${zero}</vDevTrib>` +
    `<vIBSUF>${formatarCentavos(vIbsUf)}</vIBSUF>` +
    '</gIBSUF>' +
    '<gIBSMun>' +
    `<vDif>${zero}</vDif>` +
    `<vDevTrib>${zero}</vDevTrib>` +
    `<vIBSMun>${formatarCentavos(vIbsMun)}</vIBSMun>` +
    '</gIBSMun>' +
    `<vIBS>${formatarCentavos(vIbsUf + vIbsMun)}</vIBS>` +
    `<vCredPres>${zero}</vCredPres>` +
    `<vCredPresCondSus>${zero}</vCredPresCondSus>` +
    '</gIBS>' +
    '<gCBS>' +
    `<vDif>${zero}</vDif>` +
    `<vDevTrib>${zero}</vDevTrib>` +
    `<vCBS>${formatarCentavos(vCbs)}</vCBS>` +
    `<vCredPres>${zero}</vCredPres>` +
    `<vCredPresCondSus>${zero}</vCredPresCondSus>` +
    '</gCBS>' +
    '</IBSCBSTot>'
  );
}
