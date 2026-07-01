export type ServicoRef = {
  codigo?: string | null;
  nome?: string | null;
  tipoServico?: string | null;
};

/** Classificação usada na tela Serviços (filtro Engenharia / Projetos). */
export function isServicoClassificacaoEngenhariaProjetos(
  ref: ServicoRef | null | undefined,
): boolean {
  if (!ref) return false;
  const tipo = String(ref.tipoServico || '').toUpperCase();
  return tipo === 'ENGENHARIA' || tipo === 'PROJETOS';
}

/**
 * Define se a OS deve exibir "Atribuir à Engenharia".
 * Alinhado ao filtro Engenharia / Projetos do catálogo: apenas tipoServico.
 * O campo `tipo` do serviço (Consultoria, Instalação, etc.) não entra na regra.
 */
export function isServicoEngenhariaAtribuivelSetor(ref: ServicoRef | null | undefined): boolean {
  return isServicoClassificacaoEngenhariaProjetos(ref);
}

/** @deprecated Mantido para compatibilidade; não usar no botão de atribuição. */
export const CODIGOS_ENG_SEM_ATRIBUICAO_SETOR = new Set([
  'ENG-PRO-002',
  'ENG-PRO-003',
  'ENG-PRO-004',
  'ENG-PRO-005',
  'ENG-PRO-006',
  'ENG-PRO-080',
  'ENG-PRO-105',
]);

/** @deprecated Não usado na elegibilidade do botão Atribuir à Engenharia. */
export function isServicoExcluidoAtribuicaoSetorEngenharia(ref: ServicoRef | null | undefined): boolean {
  if (!ref) return false;
  const codigo = String(ref.codigo || '').toUpperCase().trim();
  if (CODIGOS_ENG_SEM_ATRIBUICAO_SETOR.has(codigo)) return true;
  const nome = String(ref.nome || '').toUpperCase();
  if (nome.includes('ASSESSORIA') || nome.includes('CONSULTORIA')) return true;
  if (nome.includes('HORA TÉCNICA') || nome.includes('HORA TECNICA')) return true;
  return false;
}

export type OrcamentoItemEngenhariaInput = {
  tipo: string;
  servicoId?: string | null;
  servicoNome?: string | null;
  servico?: ServicoRef | null;
  itensDoKit?: unknown;
  kit?: { itensFaltantes?: unknown } | null;
};

function parseJsonArray(raw: unknown): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }
  if (typeof raw === 'object') return [raw];
  return [];
}

/** Detecção ampla de “serviço de engenharia” (ex.: validações legadas). */
export function isServicoEngenharia(ref: ServicoRef | null | undefined): boolean {
  if (!ref) return false;
  if (isServicoClassificacaoEngenhariaProjetos(ref)) return true;
  const codigo = String(ref.codigo || '').toUpperCase();
  const nome = String(ref.nome || '').toUpperCase();
  if (codigo.startsWith('ENG-PRO-') || codigo.includes('ENG-PRO')) return true;
  if (nome.includes('PROJETO')) return true;
  return false;
}

export type ServicoLookupMaps = {
  byId: Map<string, ServicoRef>;
  byNome: Map<string, ServicoRef>;
  byCodigo: Map<string, ServicoRef>;
};

function extractCodigoEngPro(text: string | null | undefined): string | null {
  const m = String(text || '').match(/(ENG-PRO-\d+)/i);
  return m ? m[1].toUpperCase() : null;
}

function resolveServicoRef(
  item: { servicoId?: string | null; servicoNome?: string | null; servico?: ServicoRef | null; nome?: string | null },
  maps: ServicoLookupMaps,
): ServicoRef | null {
  if (item.servico) return item.servico;
  if (item.servicoId && maps.byId.has(item.servicoId)) {
    return maps.byId.get(item.servicoId)!;
  }
  const nome = item.servicoNome || item.nome;
  if (nome) {
    const key = nome.trim().toLowerCase();
    if (maps.byNome.has(key)) return maps.byNome.get(key)!;
    const codigo = extractCodigoEngPro(nome);
    if (codigo && maps.byCodigo.has(codigo)) return maps.byCodigo.get(codigo)!;
  }
  if (item.servicoNome || item.nome) {
    return { nome: item.servicoNome || item.nome || null };
  }
  return null;
}

function itemKitTemEngenhariaAtribuivel(
  raw: unknown,
  maps: ServicoLookupMaps,
): boolean {
  for (const sub of parseJsonArray(raw)) {
    const tipo = String(sub?.tipo || '').toUpperCase();
    if (tipo !== 'SERVICO') continue;
    const ref = resolveServicoRef(
      {
        servicoId: sub?.servicoId,
        servicoNome: sub?.nome || sub?.servicoNome,
        nome: sub?.nome,
      },
      maps,
    );
    if (isServicoEngenhariaAtribuivelSetor(ref)) return true;
  }
  return false;
}

export function orcamentoItemTemServicoEngenhariaAtribuivelSetor(
  item: OrcamentoItemEngenhariaInput,
  servicoById: Map<string, ServicoRef>,
  servicoByNome: Map<string, ServicoRef>,
  servicoByCodigo?: Map<string, ServicoRef>,
): boolean {
  const maps: ServicoLookupMaps = {
    byId: servicoById,
    byNome: servicoByNome,
    byCodigo: servicoByCodigo ?? new Map(),
  };
  const tipo = String(item.tipo || '').toUpperCase();

  if (tipo === 'SERVICO') {
    const ref = resolveServicoRef(item, maps);
    return isServicoEngenhariaAtribuivelSetor(ref);
  }

  if (tipo === 'KIT') {
    if (itemKitTemEngenhariaAtribuivel(item.itensDoKit, maps)) return true;
    if (
      item.kit?.itensFaltantes &&
      itemKitTemEngenhariaAtribuivel(item.kit.itensFaltantes, maps)
    ) {
      return true;
    }
  }

  return false;
}

export function projetoTemServicoEngenhariaAtribuivelSetor(
  items: OrcamentoItemEngenhariaInput[],
  servicoById: Map<string, ServicoRef>,
  servicoByNome: Map<string, ServicoRef>,
  servicoByCodigo?: Map<string, ServicoRef>,
): boolean {
  return items.some((item) =>
    orcamentoItemTemServicoEngenhariaAtribuivelSetor(item, servicoById, servicoByNome, servicoByCodigo),
  );
}

function itemKitTemEngenharia(
  raw: unknown,
  maps: ServicoLookupMaps,
): boolean {
  for (const sub of parseJsonArray(raw)) {
    const tipo = String(sub?.tipo || '').toUpperCase();
    if (tipo !== 'SERVICO') continue;
    const ref = resolveServicoRef(
      {
        servicoId: sub?.servicoId,
        servicoNome: sub?.nome || sub?.servicoNome,
        nome: sub?.nome,
      },
      maps,
    );
    if (isServicoEngenharia(ref)) return true;
  }
  return false;
}

export function orcamentoItemTemServicoEngenharia(
  item: OrcamentoItemEngenhariaInput,
  servicoById: Map<string, ServicoRef>,
  servicoByNome: Map<string, ServicoRef>,
  servicoByCodigo?: Map<string, ServicoRef>,
): boolean {
  const maps: ServicoLookupMaps = {
    byId: servicoById,
    byNome: servicoByNome,
    byCodigo: servicoByCodigo ?? new Map(),
  };
  const tipo = String(item.tipo || '').toUpperCase();

  if (tipo === 'SERVICO') {
    const ref = resolveServicoRef(item, maps);
    return isServicoEngenharia(ref);
  }

  if (tipo === 'KIT') {
    if (itemKitTemEngenharia(item.itensDoKit, maps)) return true;
    if (item.kit?.itensFaltantes && itemKitTemEngenharia(item.kit.itensFaltantes, maps)) {
      return true;
    }
  }

  return false;
}

export function projetoTemServicoEngenharia(
  items: OrcamentoItemEngenhariaInput[],
  servicoById: Map<string, ServicoRef>,
  servicoByNome: Map<string, ServicoRef>,
  servicoByCodigo?: Map<string, ServicoRef>,
): boolean {
  return items.some((item) =>
    orcamentoItemTemServicoEngenharia(item, servicoById, servicoByNome, servicoByCodigo),
  );
}

export function buildServicoLookupMaps(
  servicos: Array<{ id: string; codigo: string; nome: string; tipoServico: string }>,
): ServicoLookupMaps {
  const byId = new Map<string, ServicoRef>();
  const byNome = new Map<string, ServicoRef>();
  const byCodigo = new Map<string, ServicoRef>();

  for (const s of servicos) {
    const ref: ServicoRef = { codigo: s.codigo, nome: s.nome, tipoServico: s.tipoServico };
    byId.set(s.id, ref);
    byNome.set(s.nome.trim().toLowerCase(), ref);
    byCodigo.set(s.codigo.toUpperCase().trim(), ref);
  }

  return { byId, byNome, byCodigo };
}
