import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  extrairEntregaQuadro,
  isOsTipoQuadrosPainels,
  mensagemBloqueioConclusaoQuadros,
  normalizarEntregaQuadroInput,
  podeConcluirOsQuadros,
  type EntregaQuadroMetadados,
} from '../utils/osEntregaQuadro.util';

export async function obterEntregaQuadroProjeto(
  projetoId: string,
): Promise<{
  tipo: string;
  exigeChecklist: boolean;
  entrega: EntregaQuadroMetadados | null;
  checklist: ReturnType<typeof podeConcluirOsQuadros>;
  empresaFiscalInformada: boolean;
}> {
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: {
      id: true,
      tipo: true,
      entregaQuadro: true,
      orcamento: { select: { empresaFiscalId: true } },
    },
  });
  if (!projeto) throw new Error('Projeto não encontrado');

  let entrega = extrairEntregaQuadro(projeto.entregaQuadro);

  // Fallback: metadados da task Entrega (dados legados salvos só no Kanban)
  if (!entrega) {
    const taskEntrega = await prisma.task.findFirst({
      where: { projetoId, titulo: { equals: 'Entrega', mode: 'insensitive' } },
      select: { metadados: true },
    });
    entrega = extrairEntregaQuadro(taskEntrega?.metadados) ?? null;
  }

  const checklist = podeConcluirOsQuadros(projeto.tipo, entrega);
  return {
    tipo: projeto.tipo,
    exigeChecklist: isOsTipoQuadrosPainels(projeto.tipo),
    entrega,
    checklist,
    empresaFiscalInformada: Boolean(projeto.orcamento?.empresaFiscalId),
  };
}

export async function salvarEntregaQuadroProjeto(
  projetoId: string,
  body: unknown,
): Promise<EntregaQuadroMetadados> {
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: { id: true, tipo: true },
  });
  if (!projeto) throw new Error('Projeto não encontrado');
  if (!isOsTipoQuadrosPainels(projeto.tipo)) {
    throw new Error('Entrega de quadro só se aplica a OS do tipo Quadros e Painéis');
  }

  const entrega = normalizarEntregaQuadroInput(body);

  await prisma.projeto.update({
    where: { id: projetoId },
    data: { entregaQuadro: entrega as unknown as Prisma.InputJsonValue },
  });

  // Espelha na task Entrega para o Kanban continuar coerente
  const taskEntrega = await prisma.task.findFirst({
    where: { projetoId, titulo: { equals: 'Entrega', mode: 'insensitive' } },
    select: { id: true },
  });
  if (taskEntrega) {
    await prisma.task.update({
      where: { id: taskEntrega.id },
      data: {
        metadados: { entregaQuadro: entrega } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return entrega;
}

/** Retorna mensagem de bloqueio ou null se pode concluir. */
export async function validarConclusaoOsQuadros(
  projetoId: string,
  tipo?: string | null,
  entregaQuadroCampo?: unknown,
): Promise<string | null> {
  const tipoEfetivo =
    tipo ??
    (
      await prisma.projeto.findUnique({
        where: { id: projetoId },
        select: { tipo: true },
      })
    )?.tipo;

  if (!isOsTipoQuadrosPainels(tipoEfetivo)) return null;

  let entrega = extrairEntregaQuadro(entregaQuadroCampo);
  if (!entrega) {
    const loaded = await obterEntregaQuadroProjeto(projetoId);
    entrega = loaded.entrega;
  }

  return mensagemBloqueioConclusaoQuadros(
    podeConcluirOsQuadros(tipoEfetivo, entrega),
  );
}
