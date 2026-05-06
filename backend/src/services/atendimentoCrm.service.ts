import { prisma } from '../lib/prisma';

export type ContatoLeadStatus = 'AGUARDANDO_DOCUMENTO' | 'EM_ANALISE_TECNICA' | 'PRONTO_PARA_ORCAR' | 'NAO_ATENDE' | 'CONVERTIDO';

export interface CreateContatoLeadInput {
  nome: string;
  whatsapp?: string;
  cpfCnpj?: string;
  necessidade?: string;
  mediaKwhMes?: number;
  observacoes?: string;
  status?: ContatoLeadStatus;
  etapa?: number;
}

export interface UpdateContatoLeadInput {
  nome?: string;
  whatsapp?: string;
  cpfCnpj?: string;
  necessidade?: string;
  mediaKwhMes?: number;
  contaEnergiaUrl?: string;
  observacoesTecnicas?: string;
  viabilidadeTecnica?: boolean;
  condicoesNaoAtender?: string;
  observacoes?: string;
  status?: ContatoLeadStatus;
  etapa?: number;
  clienteId?: string | null;
}

export async function listLeads(filters?: { status?: string; etapa?: number }) {
  const where: any = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.etapa != null) where.etapa = filters.etapa;
  return prisma.contatoLead.findMany({
    where,
    include: { cliente: { select: { id: true, nome: true, cpfCnpj: true } } },
    orderBy: { updatedAt: 'desc' }
  });
}

export async function getLeadById(id: string) {
  return prisma.contatoLead.findUnique({
    where: { id },
    include: { cliente: { select: { id: true, nome: true, cpfCnpj: true } } }
  });
}

export async function createLead(data: CreateContatoLeadInput) {
  return prisma.contatoLead.create({
    data: {
      nome: data.nome.trim(),
      whatsapp: data.whatsapp?.trim() || null,
      cpfCnpj: data.cpfCnpj?.trim() || null,
      necessidade: data.necessidade?.trim() || null,
      mediaKwhMes: data.mediaKwhMes ?? null,
      observacoes: data.observacoes?.trim() || null,
      status: (data.status as ContatoLeadStatus) || 'AGUARDANDO_DOCUMENTO',
      etapa: data.etapa ?? 1
    }
  });
}

export async function updateLead(id: string, data: UpdateContatoLeadInput) {
  return prisma.contatoLead.update({
    where: { id },
    data: {
      ...(data.nome !== undefined && { nome: data.nome.trim() }),
      ...(data.whatsapp !== undefined && { whatsapp: data.whatsapp?.trim() || null }),
      ...(data.cpfCnpj !== undefined && { cpfCnpj: data.cpfCnpj?.trim() || null }),
      ...(data.necessidade !== undefined && { necessidade: data.necessidade?.trim() || null }),
      ...(data.mediaKwhMes !== undefined && { mediaKwhMes: data.mediaKwhMes == null ? null : data.mediaKwhMes }),
      ...(data.contaEnergiaUrl !== undefined && { contaEnergiaUrl: data.contaEnergiaUrl || null }),
      ...(data.observacoesTecnicas !== undefined && { observacoesTecnicas: data.observacoesTecnicas?.trim() || null }),
      ...(data.viabilidadeTecnica !== undefined && { viabilidadeTecnica: data.viabilidadeTecnica }),
      ...(data.condicoesNaoAtender !== undefined && { condicoesNaoAtender: data.condicoesNaoAtender?.trim() || null }),
      ...(data.observacoes !== undefined && { observacoes: data.observacoes?.trim() || null }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.etapa !== undefined && { etapa: data.etapa }),
      ...(data.clienteId !== undefined && { clienteId: data.clienteId || null })
    }
  });
}
