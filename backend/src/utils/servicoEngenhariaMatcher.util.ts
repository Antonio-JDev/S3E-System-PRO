export type ServicoRef = {
  codigo?: string | null;
  nome?: string | null;
  tipoServico?: string | null;
};

/** Serviços ENG-PRO executados fora do setor de projetos (assessoria/consultoria). */
export const CODIGOS_ENG_SEM_ATRIBUICAO_SETOR = new Set([
  'ENG-PRO-002',
  'ENG-PRO-003',
  'ENG-PRO-004',
  'ENG-PRO-005',
  'ENG-PRO-006',
  'ENG-PRO-080',
  'ENG-PRO-105',
]);

export function isServicoExcluidoAtribuicaoSetorEngenharia(ref: ServicoRef | null | undefined): boolean {
  if (!ref) return false;
  const codigo = String(ref.codigo || '').toUpperCase().trim();
  if (CODIGOS_ENG_SEM_ATRIBUICAO_SETOR.has(codigo)) return true;
  const nome = String(ref.nome || '').toUpperCase();
  if (nome.includes('ASSESSORIA') || nome.includes('CONSULTORIA')) return true;
  if (nome.includes('HORA TÉCNICA') || nome.includes('HORA TECNICA')) return true;
  return false;
}

export function isServicoEngenhariaAtribuivelSetor(ref: ServicoRef | null | undefined): boolean {
  if (!ref || !isServicoEngenharia(ref)) return false;
  return !isServicoExcluidoAtribuicaoSetorEngenharia(ref);
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

export function isServicoEngenharia(ref: ServicoRef | null | undefined): boolean {
  if (!ref) return false;
  const codigo = String(ref.codigo || '').toUpperCase();
  const nome = String(ref.nome || '').toUpperCase();
  const tipo = String(ref.tipoServico || '').toUpperCase();

  if (codigo.startsWith('ENG-PRO-') || codigo.includes('ENG-PRO')) return true;
  if (nome.includes('PROJETO')) return true;
  if (tipo === 'ENGENHARIA' || tipo === 'PROJETOS') return true;
  return false;
}

function resolveServicoRef(
  item: { servicoId?: string | null; servicoNome?: string | null; servico?: ServicoRef | null; nome?: string | null },
  servicoById: Map<string, ServicoRef>,
  servicoByNome: Map<string, ServicoRef>,
): ServicoRef | null {
  if (item.servico) return item.servico;
  if (item.servicoId && servicoById.has(item.servicoId)) {
    return servicoById.get(item.servicoId)!;
  }
  const nome = item.servicoNome || item.nome;
  if (nome) {
    const key = nome.trim().toLowerCase();
    if (servicoByNome.has(key)) return servicoByNome.get(key)!;
  }
  if (item.servicoNome || item.nome) {
    return { nome: item.servicoNome || item.nome || null };
  }
  return null;
}

function itemKitTemEngenhariaAtribuivel(
  raw: unknown,
  servicoById: Map<string, ServicoRef>,
  servicoByNome: Map<string, ServicoRef>,
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
      servicoById,
      servicoByNome,
    );
    if (isServicoEngenhariaAtribuivelSetor(ref)) return true;
  }
  return false;
}

export function orcamentoItemTemServicoEngenhariaAtribuivelSetor(
  item: OrcamentoItemEngenhariaInput,
  servicoById: Map<string, ServicoRef>,
  servicoByNome: Map<string, ServicoRef>,
): boolean {
  const tipo = String(item.tipo || '').toUpperCase();

  if (tipo === 'SERVICO') {
    const ref = resolveServicoRef(item, servicoById, servicoByNome);
    return isServicoEngenhariaAtribuivelSetor(ref);
  }

  if (tipo === 'KIT') {
    if (itemKitTemEngenhariaAtribuivel(item.itensDoKit, servicoById, servicoByNome)) return true;
    if (
      item.kit?.itensFaltantes &&
      itemKitTemEngenhariaAtribuivel(item.kit.itensFaltantes, servicoById, servicoByNome)
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
): boolean {
  return items.some((item) =>
    orcamentoItemTemServicoEngenhariaAtribuivelSetor(item, servicoById, servicoByNome),
  );
}

function itemKitTemEngenharia(
  raw: unknown,
  servicoById: Map<string, ServicoRef>,
  servicoByNome: Map<string, ServicoRef>,
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
      servicoById,
      servicoByNome,
    );
    if (isServicoEngenharia(ref)) return true;
  }
  return false;
}

export function orcamentoItemTemServicoEngenharia(
  item: OrcamentoItemEngenhariaInput,
  servicoById: Map<string, ServicoRef>,
  servicoByNome: Map<string, ServicoRef>,
): boolean {
  const tipo = String(item.tipo || '').toUpperCase();

  if (tipo === 'SERVICO') {
    const ref = resolveServicoRef(item, servicoById, servicoByNome);
    return isServicoEngenharia(ref);
  }

  if (tipo === 'KIT') {
    if (itemKitTemEngenharia(item.itensDoKit, servicoById, servicoByNome)) return true;
    if (item.kit?.itensFaltantes && itemKitTemEngenharia(item.kit.itensFaltantes, servicoById, servicoByNome)) {
      return true;
    }
  }

  return false;
}

export function projetoTemServicoEngenharia(
  items: OrcamentoItemEngenhariaInput[],
  servicoById: Map<string, ServicoRef>,
  servicoByNome: Map<string, ServicoRef>,
): boolean {
  return items.some((item) => orcamentoItemTemServicoEngenharia(item, servicoById, servicoByNome));
}

export function buildServicoLookupMaps(
  servicos: Array<{ id: string; codigo: string; nome: string; tipoServico: string }>,
): { byId: Map<string, ServicoRef>; byNome: Map<string, ServicoRef> } {
  const byId = new Map<string, ServicoRef>();
  const byNome = new Map<string, ServicoRef>();

  for (const s of servicos) {
    const ref: ServicoRef = { codigo: s.codigo, nome: s.nome, tipoServico: s.tipoServico };
    byId.set(s.id, ref);
    byNome.set(s.nome.trim().toLowerCase(), ref);
  }

  return { byId, byNome };
}
