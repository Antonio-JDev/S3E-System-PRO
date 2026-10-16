export type RegimeNfe = 'SimplesNacional' | 'RegimeNormal';

export type RegraFiscalNfeCache = {
  id?: string;
  empresaFiscalId?: string | null;
  regime: RegimeNfe;
  cfop?: string | null;
  ncm?: string | null;
  origem: string;
  cstIcms: string;
  aliquotaIcms: number;
  cstPis: string;
  aliquotaPis: number;
  cstCofins: string;
  aliquotaCofins: number;
  cstIpi: string;
  aliquotaIpi: number;
  informarTotTrib?: boolean;
  ativo?: boolean;
  updatedAt?: Date | string | null;
};

type TributosItem = {
  icms: { origem: string; cst: string; aliquota: number; valor: number };
  ipi: { cst: string; aliquota: number; valor: number };
  pis: { cst: string; aliquota: number; valor: number };
  cofins: { cst: string; aliquota: number; valor: number };
  vTotTrib: number;
};

const FALLBACK: Record<
  RegimeNfe,
  {
    origem: string;
    cstIcms: string;
    aliquotaIcms: number;
    cstIpi: string;
    aliquotaIpi: number;
    cstPis: string;
    aliquotaPis: number;
    cstCofins: string;
    aliquotaCofins: number;
    informarTotTrib: boolean;
  }
> = {
  SimplesNacional: {
    origem: '0',
    cstIcms: '102',
    aliquotaIcms: 0,
    cstIpi: '99',
    aliquotaIpi: 0,
    cstPis: '49',
    aliquotaPis: 0,
    cstCofins: '49',
    aliquotaCofins: 0,
    informarTotTrib: false,
  },
  RegimeNormal: {
    origem: '0',
    cstIcms: '00',
    aliquotaIcms: 12,
    cstIpi: '99',
    aliquotaIpi: 0,
    cstPis: '01',
    aliquotaPis: 1.65,
    cstCofins: '01',
    aliquotaCofins: 7.6,
    informarTotTrib: true,
  },
};

/** null = ainda não carregado. Array (mesmo vazio) = cache pronto. */
let cacheRegras: RegraFiscalNfeCache[] | null = null;

function somenteDigitos(valor: string | null | undefined): string {
  return String(valor ?? '').replace(/\D/g, '');
}

function arredondar2(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function aliquotaNumero(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.round(valor * 10000) / 10000;
}

function valorImposto(base: number, aliquota: number): number {
  const baseSegura = Number.isFinite(base) ? base : 0;
  return arredondar2((baseSegura * aliquotaNumero(aliquota)) / 100);
}

function ncmCompativel(regraNcm: string, itemNcm: string): boolean {
  if (!regraNcm) return true;
  if (!itemNcm) return false;
  return itemNcm === regraNcm || itemNcm.startsWith(regraNcm);
}

function especificidade(cfop: string, ncm: string): number {
  const ncmScore = ncm ? 1000 + ncm.length : 0;
  const cfopScore = cfop ? 100 : 0;
  return ncmScore + cfopScore;
}

function assinaturaFiscal(regra: RegraFiscalNfeCache): string {
  return [
    regra.origem,
    regra.cstIcms,
    regra.aliquotaIcms,
    regra.cstPis,
    regra.aliquotaPis,
    regra.cstCofins,
    regra.aliquotaCofins,
    regra.cstIpi,
    regra.aliquotaIpi,
    regra.informarTotTrib ? 1 : 0,
  ].join('|');
}

function maisRecente(regras: RegraFiscalNfeCache[]): RegraFiscalNfeCache {
  return [...regras].sort((a, b) => {
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tb - ta;
  })[0];
}

function escolherRegra(
  regras: RegraFiscalNfeCache[],
  regime: RegimeNfe,
  cfopItem: string,
  ncmItem: string
): RegraFiscalNfeCache | null {
  const candidatas = regras
    .filter((regra) => regra.ativo !== false && regra.regime === regime)
    .map((regra) => ({
      regra,
      cfop: somenteDigitos(regra.cfop),
      ncm: somenteDigitos(regra.ncm),
    }))
    .filter((item) => {
      if (item.cfop && item.cfop !== cfopItem) return false;
      if (!ncmCompativel(item.ncm, ncmItem)) return false;
      return true;
    });

  if (candidatas.length === 0) return null;

  const niveis = [...new Set(candidatas.map((item) => especificidade(item.cfop, item.ncm)))].sort(
    (a, b) => b - a
  );

  for (const nivel of niveis) {
    const grupo = candidatas.filter((item) => especificidade(item.cfop, item.ncm) === nivel);
    const gerais = grupo.filter((item) => !item.regra.empresaFiscalId).map((item) => item.regra);
    const deEmpresa = grupo.filter((item) => item.regra.empresaFiscalId).map((item) => item.regra);

    if (deEmpresa.length === 1) return deEmpresa[0];

    if (deEmpresa.length > 1) {
      const assinaturas = new Set(deEmpresa.map(assinaturaFiscal));
      if (assinaturas.size === 1) return deEmpresa[0];
      if (gerais.length > 0) return maisRecente(gerais);
      continue;
    }

    if (gerais.length > 0) return maisRecente(gerais);
  }

  return null;
}

function montarTributos(
  regime: RegimeNfe,
  valorTotal: number,
  partes: {
    origem: string;
    cstIcms: string;
    aliquotaIcms: number;
    cstIpi: string;
    aliquotaIpi: number;
    cstPis: string;
    aliquotaPis: number;
    cstCofins: string;
    aliquotaCofins: number;
    informarTotTrib: boolean;
  }
): TributosItem {
  const icmsValor = valorImposto(valorTotal, partes.aliquotaIcms);
  const ipiValor = valorImposto(valorTotal, partes.aliquotaIpi);
  const pisValor = valorImposto(valorTotal, partes.aliquotaPis);
  const cofinsValor = valorImposto(valorTotal, partes.aliquotaCofins);
  const soma = arredondar2(icmsValor + ipiValor + pisValor + cofinsValor);
  const vTotTrib = regime === 'SimplesNacional' ? (partes.informarTotTrib ? soma : 0) : soma;

  return {
    icms: {
      origem: partes.origem || '0',
      cst: partes.cstIcms,
      aliquota: aliquotaNumero(partes.aliquotaIcms),
      valor: icmsValor,
    },
    ipi: {
      cst: partes.cstIpi,
      aliquota: aliquotaNumero(partes.aliquotaIpi),
      valor: ipiValor,
    },
    pis: {
      cst: partes.cstPis,
      aliquota: aliquotaNumero(partes.aliquotaPis),
      valor: pisValor,
    },
    cofins: {
      cst: partes.cstCofins,
      aliquota: aliquotaNumero(partes.aliquotaCofins),
      valor: cofinsValor,
    },
    vTotTrib,
  };
}

function mapearLinha(row: {
  id: string;
  empresaFiscalId: string | null;
  regime: string;
  cfop: string | null;
  ncm: string | null;
  origem: string;
  cstIcms: string;
  aliquotaIcms: number;
  cstPis: string;
  aliquotaPis: number;
  cstCofins: string;
  aliquotaCofins: number;
  cstIpi: string;
  aliquotaIpi: number;
  informarTotTrib: boolean;
  ativo: boolean;
  updatedAt: Date;
}): RegraFiscalNfeCache | null {
  if (row.regime !== 'SimplesNacional' && row.regime !== 'RegimeNormal') return null;
  return {
    id: row.id,
    empresaFiscalId: row.empresaFiscalId,
    regime: row.regime,
    cfop: row.cfop,
    ncm: row.ncm,
    origem: row.origem,
    cstIcms: row.cstIcms,
    aliquotaIcms: row.aliquotaIcms,
    cstPis: row.cstPis,
    aliquotaPis: row.aliquotaPis,
    cstCofins: row.cstCofins,
    aliquotaCofins: row.aliquotaCofins,
    cstIpi: row.cstIpi,
    aliquotaIpi: row.aliquotaIpi,
    informarTotTrib: row.informarTotTrib,
    ativo: row.ativo,
    updatedAt: row.updatedAt,
  };
}

/** Substitui o cache. Usado pelos testes e por quem já tem as regras em memória. */
export function definirCacheRegrasFiscais(regras: RegraFiscalNfeCache[]): void {
  cacheRegras = regras.filter((regra) => regra.ativo !== false);
}

export function limparCacheRegrasFiscais(): void {
  cacheRegras = null;
}

type LinhaRegraFiscal = {
  id: string;
  empresaFiscalId: string | null;
  regime: string;
  cfop: string | null;
  ncm: string | null;
  origem: string;
  cstIcms: string;
  aliquotaIcms: number;
  cstPis: string;
  aliquotaPis: number;
  cstCofins: string;
  aliquotaCofins: number;
  cstIpi: string;
  aliquotaIpi: number;
  informarTotTrib: boolean;
  ativo: boolean;
  updatedAt: Date;
};

/** Import dinâmico com caminho não literal para o teste do resolvedor não carregar o client do Prisma. */
async function listarRegrasAtivas(): Promise<LinhaRegraFiscal[]> {
  const especificador = '../lib/prisma';
  const modulo = (await import(especificador)) as {
    prisma: {
      regraFiscalNfe: {
        findMany: (args: {
          where: { ativo: boolean };
          orderBy: { updatedAt: 'desc' };
        }) => Promise<LinhaRegraFiscal[]>;
      };
    };
  };
  return modulo.prisma.regraFiscalNfe.findMany({
    where: { ativo: true },
    orderBy: { updatedAt: 'desc' },
  });
}

/** Carrega regras ativas do banco para o cache síncrono da emissão. */
export async function carregarRegrasFiscais(): Promise<void> {
  const rows = await listarRegrasAtivas();
  cacheRegras = rows
    .map((row) => mapearLinha(row))
    .filter((regra): regra is RegraFiscalNfeCache => regra !== null);
}

/**
 * Tributos do item. Cache vazio usa o padrão do regime.
 * Entre regras cadastradas, o NCM mais longo vence; senão o CFOP; senão só o regime.
 */
export function resolverTributosItem(input: {
  regimeTributario: RegimeNfe;
  valorTotal: number;
  cfop: string;
  ncm?: string;
}): {
  icms: { origem: string; cst: string; aliquota: number; valor: number };
  ipi: { cst: string; aliquota: number; valor: number };
  pis: { cst: string; aliquota: number; valor: number };
  cofins: { cst: string; aliquota: number; valor: number };
  vTotTrib: number;
} {
  const regime: RegimeNfe = input.regimeTributario === 'SimplesNacional' ? 'SimplesNacional' : 'RegimeNormal';
  const padrao = FALLBACK[regime];
  const regra =
    cacheRegras && cacheRegras.length > 0
      ? escolherRegra(cacheRegras, regime, somenteDigitos(input.cfop), somenteDigitos(input.ncm))
      : null;

  if (!regra) {
    return montarTributos(regime, input.valorTotal, padrao);
  }

  return montarTributos(regime, input.valorTotal, {
    origem: regra.origem || padrao.origem,
    cstIcms: regra.cstIcms || padrao.cstIcms,
    aliquotaIcms: aliquotaNumero(Number(regra.aliquotaIcms)),
    cstIpi: regra.cstIpi || padrao.cstIpi,
    aliquotaIpi: aliquotaNumero(Number(regra.aliquotaIpi)),
    cstPis: regra.cstPis || padrao.cstPis,
    aliquotaPis: aliquotaNumero(Number(regra.aliquotaPis)),
    cstCofins: regra.cstCofins || padrao.cstCofins,
    aliquotaCofins: aliquotaNumero(Number(regra.aliquotaCofins)),
    informarTotTrib: Boolean(regra.informarTotTrib),
  });
}

/** Garante o cache e devolve o mesmo resultado de `resolverTributosItem`. */
export async function resolverTributosItemAsync(input: {
  regimeTributario: RegimeNfe;
  valorTotal: number;
  cfop: string;
  ncm?: string;
}): Promise<{
  icms: { origem: string; cst: string; aliquota: number; valor: number };
  ipi: { cst: string; aliquota: number; valor: number };
  pis: { cst: string; aliquota: number; valor: number };
  cofins: { cst: string; aliquota: number; valor: number };
  vTotTrib: number;
}> {
  if (cacheRegras === null) {
    await carregarRegrasFiscais();
  }
  return resolverTributosItem(input);
}
