import { prisma } from '../lib/prisma';
import type { DestinoCompraAvulsa } from '@prisma/client';

export class ReservaMaterialProjetoService {
  static async criarReserva(params: {
    projetoId: string;
    materialId: string;
    quantidade: number;
    compraId?: string;
    compraItemId?: string;
    observacoes?: string;
  }) {
    return prisma.reservaMaterialProjeto.create({
      data: {
        projetoId: params.projetoId,
        materialId: params.materialId,
        quantidade: params.quantidade,
        compraId: params.compraId ?? null,
        compraItemId: params.compraItemId ?? null,
        observacoes: params.observacoes ?? null,
      },
    });
  }

  static async listarPorProjeto(projetoId: string) {
    return prisma.reservaMaterialProjeto.findMany({
      where: { projetoId },
      include: { material: { select: { id: true, nome: true, sku: true, estoque: true } } },
    });
  }

  /** Consome reservas ao iniciar obra: baixa estoque e registra saída para obra. */
  static async consumirReservasAoIniciarObra(projetoId: string, obraId: string) {
    const reservas = await prisma.reservaMaterialProjeto.findMany({
      where: { projetoId },
    });
    if (reservas.length === 0) return { consumidas: 0 };

    let consumidas = 0;
    await prisma.$transaction(async (tx) => {
      for (const r of reservas) {
        const mat = await tx.material.findUnique({ where: { id: r.materialId } });
        if (!mat) continue;
        const qtd = r.quantidade;
        if (mat.estoque < qtd) {
          throw new Error(
            `Estoque insuficiente para reserva do material ${mat.nome} (necessário ${qtd}, disponível ${mat.estoque})`,
          );
        }
        await tx.material.update({
          where: { id: r.materialId },
          data: { estoque: { decrement: qtd } },
        });
        await tx.movimentacaoEstoque.create({
          data: {
            materialId: r.materialId,
            tipo: 'SAIDA',
            quantidade: qtd,
            motivo: 'OBRA',
            referencia: obraId,
            observacoes: `Reserva OS consumida ao iniciar obra (projeto ${projetoId})`,
          },
        });
        await tx.reservaMaterialProjeto.delete({ where: { id: r.id } });
        consumidas++;
      }
    });
    return { consumidas };
  }

  static async resolverObraIdParaDestino(
    destinoTipo: DestinoCompraAvulsa | null | undefined,
    obraId?: string | null,
    projetoId?: string | null,
  ): Promise<{ obraId: string | null; projetoId: string | null }> {
    if (destinoTipo === 'OBRA' && obraId) {
      return { obraId, projetoId: null };
    }
    if (destinoTipo === 'PROJETO' && projetoId) {
      const obra = await prisma.obra.findUnique({
        where: { projetoId },
        select: { id: true },
      });
      if (obra?.id) {
        return { obraId: obra.id, projetoId };
      }
      return { obraId: null, projetoId };
    }
    return { obraId: null, projetoId: null };
  }
}
