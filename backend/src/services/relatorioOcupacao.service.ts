import { prisma } from '../lib/prisma';

const STATUS_ALOCACAO_ATIVOS = ['Planejada', 'EmAndamento'] as const;

export interface AlocacaoRecursoLinha {
  id: string;
  projetoId: string;
  osTitulo: string;
  osNumero: string | null;
  clienteNome: string;
  dataInicio: string;
  dataFimPrevisto: string;
  status: string;
  projetoStatus: string;
  obraStatus: string | null;
}

export interface RecursoOcupacaoLinha {
  tipo: 'equipe' | 'eletricista';
  id: string;
  nome: string;
  ocupadoHoje: boolean;
  osVinculadas: number;
  previsaoLiberacao: string | null;
  alocacoes: AlocacaoRecursoLinha[];
}

export interface RelatorioOcupacaoResumo {
  totalRecursos: number;
  recursosOcupadosHoje: number;
  recursosLivresHoje: number;
  osComAlocacaoAtiva: number;
  osEmExecucao: number;
  horizonteOcupacaoGlobal: string | null;
  proximaLiberacaoRecurso: string | null;
}

export interface RelatorioOcupacaoResult {
  resumo: RelatorioOcupacaoResumo;
  porRecurso: RecursoOcupacaoLinha[];
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toIsoDate(d: Date): string {
  return startOfDay(d).toISOString();
}

function gerarNumeroOS(numeroSequencial?: number | null): string | null {
  if (numeroSequencial != null && numeroSequencial > 0) {
    return `OS-${String(numeroSequencial).padStart(4, '0')}`;
  }
  return null;
}

function isOcupadoHoje(dataInicio: Date, dataFimPrevisto: Date, hoje: Date): boolean {
  const ini = startOfDay(dataInicio).getTime();
  const fim = startOfDay(dataFimPrevisto).getTime();
  const h = startOfDay(hoje).getTime();
  return h >= ini && h <= fim;
}

export async function gerarRelatorioOcupacao(
  referencia: Date = new Date()
): Promise<RelatorioOcupacaoResult> {
  const hoje = startOfDay(referencia);

  const [equipesAtivas, eletricistasAtivos, alocacoesAtivas] = await Promise.all([
    prisma.equipe.findMany({
      where: { ativa: true },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.user.findMany({
      where: {
        active: true,
        role: { equals: 'eletricista', mode: 'insensitive' },
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.alocacaoObra.findMany({
      where: {
        status: { in: [...STATUS_ALOCACAO_ATIVOS] },
        dataFimPrevisto: { gte: hoje },
      },
      include: {
        projeto: {
          select: {
            id: true,
            titulo: true,
            status: true,
            cliente: { select: { nome: true } },
            orcamento: { select: { numeroSequencial: true } },
            obra: { select: { status: true } },
          },
        },
      },
      orderBy: { dataInicio: 'asc' },
    }),
  ]);

  const mapAlocacao = (a: (typeof alocacoesAtivas)[number]): AlocacaoRecursoLinha => ({
    id: a.id,
    projetoId: a.projetoId,
    osTitulo: a.projeto.titulo,
    osNumero: gerarNumeroOS(a.projeto.orcamento?.numeroSequencial),
    clienteNome: a.projeto.cliente?.nome ?? '',
    dataInicio: toIsoDate(a.dataInicio),
    dataFimPrevisto: toIsoDate(a.dataFimPrevisto),
    status: a.status,
    projetoStatus: a.projeto.status,
    obraStatus: a.projeto.obra?.status ?? null,
  });

  const alocacoesPorEquipe = new Map<string, AlocacaoRecursoLinha[]>();
  const alocacoesPorEletricista = new Map<string, AlocacaoRecursoLinha[]>();

  for (const a of alocacoesAtivas) {
    const linha = mapAlocacao(a);
    if (a.equipeId) {
      const list = alocacoesPorEquipe.get(a.equipeId) ?? [];
      list.push(linha);
      alocacoesPorEquipe.set(a.equipeId, list);
    }
    if (a.eletricistaId) {
      const list = alocacoesPorEletricista.get(a.eletricistaId) ?? [];
      list.push(linha);
      alocacoesPorEletricista.set(a.eletricistaId, list);
    }
  }

  const porRecurso: RecursoOcupacaoLinha[] = [];

  for (const eq of equipesAtivas) {
    const alocs = alocacoesPorEquipe.get(eq.id) ?? [];
    const rawAlocs = alocacoesAtivas.filter((a) => a.equipeId === eq.id);
    const ocupadoHoje = rawAlocs.some((a) =>
      isOcupadoHoje(a.dataInicio, a.dataFimPrevisto, hoje)
    );
    const previsaoLiberacao =
      rawAlocs.length > 0
        ? toIsoDate(
            new Date(Math.max(...rawAlocs.map((a) => a.dataFimPrevisto.getTime())))
          )
        : null;
    const osIds = new Set(alocs.map((x) => x.projetoId));

    porRecurso.push({
      tipo: 'equipe',
      id: eq.id,
      nome: eq.nome,
      ocupadoHoje,
      osVinculadas: osIds.size,
      previsaoLiberacao,
      alocacoes: alocs,
    });
  }

  for (const el of eletricistasAtivos) {
    const alocs = alocacoesPorEletricista.get(el.id) ?? [];
    const rawAlocs = alocacoesAtivas.filter((a) => a.eletricistaId === el.id);
    const ocupadoHoje = rawAlocs.some((a) =>
      isOcupadoHoje(a.dataInicio, a.dataFimPrevisto, hoje)
    );
    const previsaoLiberacao =
      rawAlocs.length > 0
        ? toIsoDate(
            new Date(Math.max(...rawAlocs.map((a) => a.dataFimPrevisto.getTime())))
          )
        : null;
    const osIds = new Set(alocs.map((x) => x.projetoId));

    porRecurso.push({
      tipo: 'eletricista',
      id: el.id,
      nome: el.name,
      ocupadoHoje,
      osVinculadas: osIds.size,
      previsaoLiberacao,
      alocacoes: alocs,
    });
  }

  const projetoIdsComAlocacao = new Set(alocacoesAtivas.map((a) => a.projetoId));

  const osEmExecucaoIds = new Set<string>();
  for (const a of alocacoesAtivas) {
    const emExec =
      a.projeto.status === 'EXECUCAO' || a.projeto.obra?.status === 'ANDAMENTO';
    if (emExec) osEmExecucaoIds.add(a.projetoId);
  }

  // OS em execução no pipeline (mesmo sem alocação ativa registrada)
  const projetosEmExecucao = await prisma.projeto.findMany({
    where: {
      OR: [{ status: 'EXECUCAO' }, { obra: { status: 'ANDAMENTO' } }],
    },
    select: { id: true },
  });
  const totalOsEmExecucao = projetosEmExecucao.length;

  const horizonteOcupacaoGlobal =
    alocacoesAtivas.length > 0
      ? toIsoDate(
          new Date(Math.max(...alocacoesAtivas.map((a) => a.dataFimPrevisto.getTime())))
        )
      : null;

  const liberacoesOcupadosHoje = porRecurso
    .filter((r) => r.ocupadoHoje && r.previsaoLiberacao)
    .map((r) => new Date(r.previsaoLiberacao!).getTime());

  const proximaLiberacaoRecurso =
    liberacoesOcupadosHoje.length > 0
      ? toIsoDate(new Date(Math.min(...liberacoesOcupadosHoje)))
      : null;

  const recursosOcupadosHoje = porRecurso.filter((r) => r.ocupadoHoje).length;
  const totalRecursos = equipesAtivas.length + eletricistasAtivos.length;

  return {
    resumo: {
      totalRecursos,
      recursosOcupadosHoje,
      recursosLivresHoje: totalRecursos - recursosOcupadosHoje,
      osComAlocacaoAtiva: projetoIdsComAlocacao.size,
      osEmExecucao: totalOsEmExecucao,
      horizonteOcupacaoGlobal,
      proximaLiberacaoRecurso,
    },
    porRecurso,
  };
}
