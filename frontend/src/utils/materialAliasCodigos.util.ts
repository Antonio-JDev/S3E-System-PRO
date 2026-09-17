export type AliasCodigoResumo = {
  id: string;
  ean?: string | null;
  codigoFornecedor?: string | null;
  fornecedorId?: string;
  fornecedor?: { id: string; nome: string } | null;
};

/** Escolhe EAN / cProd a partir dos aliases (prioriza fornecedor do material, depois mais recente com valor). */
export function resolverEanCprod(
  aliases: AliasCodigoResumo[] | undefined | null,
  fornecedorId?: string | null
): { ean: string | null; codigoFornecedor: string | null } {
  const lista = Array.isArray(aliases) ? aliases : [];
  const comCodigo = lista.filter((a) => Boolean(a.ean?.trim()) || Boolean(a.codigoFornecedor?.trim()));
  const preferido =
    (fornecedorId && comCodigo.find((a) => a.fornecedorId === fornecedorId)) ||
    comCodigo[0] ||
    null;
  return {
    ean: preferido?.ean?.trim() || null,
    codigoFornecedor: preferido?.codigoFornecedor?.trim() || null,
  };
}

/** Vínculos com EAN/cProd distintos do par principal (para listagem no modal). */
export function aliasesCodigosDistintos(
  aliases: AliasCodigoResumo[] | undefined | null,
  eanPrincipal?: string | null,
  cprodPrincipal?: string | null
): AliasCodigoResumo[] {
  const principalKey = `${(eanPrincipal || '').trim()}|${(cprodPrincipal || '').trim()}`;
  const lista = Array.isArray(aliases) ? aliases : [];
  const comCodigo = lista.filter((a) => Boolean(a.ean?.trim()) || Boolean(a.codigoFornecedor?.trim()));
  const distintos = comCodigo.filter((a) => {
    const key = `${(a.ean || '').trim()}|${(a.codigoFornecedor || '').trim()}`;
    return key !== principalKey;
  });
  return distintos.filter((a, idx, arr) => {
    const key = `${a.fornecedorId || ''}|${(a.ean || '').trim()}|${(a.codigoFornecedor || '').trim()}`;
    return (
      arr.findIndex(
        (x) => `${x.fornecedorId || ''}|${(x.ean || '').trim()}|${(x.codigoFornecedor || '').trim()}` === key
      ) === idx
    );
  });
}

export const textoOuNaoInformado = (valor?: string | null) =>
  valor && valor.trim() ? valor.trim() : 'Não informado';

/** Lista EANs únicos dos aliases (ordem de aparição). */
export function listarEansDistintos(
  aliases: AliasCodigoResumo[] | undefined | null
): string[] {
  const lista = Array.isArray(aliases) ? aliases : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const a of lista) {
    const e = (a.ean || '').trim();
    if (!e || seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}

/** Lista cProd únicos dos aliases (ordem de aparição). */
export function listarCprodsDistintos(
  aliases: AliasCodigoResumo[] | undefined | null
): string[] {
  const lista = Array.isArray(aliases) ? aliases : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const a of lista) {
    const c = (a.codigoFornecedor || '').trim();
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}
