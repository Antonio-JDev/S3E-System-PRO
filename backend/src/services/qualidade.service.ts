import { prisma } from '../lib/prisma';

export const CHECKLIST_ITENS = [
  'Inspeção do local',
  'Medições realizadas',
  'Fotos documentadas',
  'Condições elétricas verificadas',
  'Requisitos técnicos confirmados',
  'Orçamento validado com cliente'
] as const;

export const INSPECOES_PADRAO = [
  { tipo: 'INSPECAO_INICIAL', nome: 'Inspeção Inicial', status: 'pendente' as const },
  { tipo: 'APROVACAO_CLIENTE', nome: 'Aprovação do Cliente', status: 'pendente' as const },
  { tipo: 'TESTE_QUALIDADE', nome: 'Teste de Qualidade', status: 'pendente' as const },
  { tipo: 'VISTORIA_FINAL', nome: 'Vistoria Final', status: 'pendente' as const }
];

export type InspecaoItem = {
  tipo: string;
  nome: string;
  status: 'pendente' | 'aprovado';
  dataAprovacao?: string | null;
  aprovadoPor?: string | null;
};

/**
 * Retorna os dados de qualidade do projeto (visita técnica, checklist, inspeções).
 * Se não existir, retorna objeto padrão sem persistir.
 */
export async function getQualidadeByProjeto(projetoId: string) {
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: { id: true }
  });
  if (!projeto) return null;

  const qualidade = await prisma.projetoQualidade.findUnique({
    where: { projetoId }
  });

  const documentosFotos = await prisma.projetoDocumento.findMany({
    where: { projetoId, tipo: 'FOTO_VISITA_TECNICA' },
    orderBy: { createdAt: 'asc' }
  });

  const checklist = (qualidade?.checklist as boolean[] | null) ?? Array(CHECKLIST_ITENS.length).fill(false);
  const inspecoes = (qualidade?.inspecoes as InspecaoItem[] | null) ?? INSPECOES_PADRAO.map(i => ({ ...i }));

  return {
    id: qualidade?.id ?? null,
    projetoId,
    statusVisita: qualidade?.statusVisita ?? 'pendente',
    dataVisita: qualidade?.dataVisita ?? null,
    responsavel: qualidade?.responsavel ?? null,
    checklist,
    observacoes: qualidade?.observacoes ?? null,
    inspecoes,
    fotos: documentosFotos.map(d => ({
      id: d.id,
      url: d.url,
      nome: d.nome
    })),
    createdAt: qualidade?.createdAt ?? null,
    updatedAt: qualidade?.updatedAt ?? null
  };
}

/**
 * Cria ou atualiza os dados de qualidade (visita técnica, checklist, observações).
 */
export async function upsertQualidade(projetoId: string, data: {
  statusVisita?: string;
  dataVisita?: string | null;
  responsavel?: string | null;
  checklist?: boolean[];
  observacoes?: string | null;
}) {
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: { id: true }
  });
  if (!projeto) return null;

  const existing = await prisma.projetoQualidade.findUnique({
    where: { projetoId }
  });

  const payload = {
    statusVisita: data.statusVisita ?? existing?.statusVisita ?? 'pendente',
    dataVisita: data.dataVisita != null ? (data.dataVisita ? new Date(data.dataVisita) : null) : existing?.dataVisita,
    responsavel: data.responsavel !== undefined ? data.responsavel : existing?.responsavel,
    checklist: data.checklist ?? existing?.checklist ?? Array(CHECKLIST_ITENS.length).fill(false),
    observacoes: data.observacoes !== undefined ? data.observacoes : existing?.observacoes,
    inspecoes: existing?.inspecoes ?? INSPECOES_PADRAO
  };

  const qualidade = await prisma.projetoQualidade.upsert({
    where: { projetoId },
    create: {
      projetoId,
      ...payload
    },
    update: payload
  });

  return qualidade;
}

/**
 * Aprova uma inspeção (Inspeção Inicial, Aprovação do Cliente, etc.).
 */
export async function aprovarInspecao(projetoId: string, tipo: string, aprovadoPor: string) {
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: { id: true }
  });
  if (!projeto) return null;

  let qualidade = await prisma.projetoQualidade.findUnique({
    where: { projetoId }
  });

  const inspecoesPadrao = INSPECOES_PADRAO.map(i => ({
    tipo: i.tipo,
    nome: i.nome,
    status: 'pendente' as const,
    dataAprovacao: null as string | null,
    aprovadoPor: null as string | null
  }));

  if (!qualidade) {
    qualidade = await prisma.projetoQualidade.create({
      data: {
        projetoId,
        inspecoes: inspecoesPadrao
      }
    });
  }

  const inspecoes = (qualidade.inspecoes as InspecaoItem[]) ?? inspecoesPadrao;
  const updated = inspecoes.map(ins => {
    if (ins.tipo !== tipo) return ins;
    return {
      ...ins,
      status: 'aprovado' as const,
      dataAprovacao: new Date().toISOString(),
      aprovadoPor
    };
  });

  const updatedQualidade = await prisma.projetoQualidade.update({
    where: { projetoId },
    data: { inspecoes: updated }
  });

  return updatedQualidade;
}
