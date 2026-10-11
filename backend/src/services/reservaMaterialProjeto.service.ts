import { prisma } from '../lib/prisma';
import type { DestinoCompraAvulsa } from '@prisma/client';
import { camposCustoMovimento } from '../utils/custoMovimentacao.util';

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
            ...camposCustoMovimento({
              preco: mat.preco,
              quantidade: qtd,
              projetoId,
            }),
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

  /**
   * Consome só a quantidade pedida de cada material (material de obra).
   * O que for de kit permanece reservado até a NF-e.
   * Devolve o que de fato saiu do estoque, para a baixa complementar não repetir.
   */
  static async consumirReservasLimitadas(params: {
    projetoId: string;
    referencia: string;
    motivo: string;
    limites: Map<string, number>;
    observacao: string;
  }): Promise<Map<string, number>> {
    const consumidas = new Map<string, number>();
    if (params.limites.size === 0) return consumidas;

    await prisma.$transaction(async (tx) => {
      for (const [materialId, limite] of params.limites.entries()) {
        let restante = Number(limite) || 0;
        if (restante <= 0) continue;

        const reservas = await tx.reservaMaterialProjeto.findMany({
          where: { projetoId: params.projetoId, materialId },
          orderBy: { createdAt: 'asc' },
        });

        for (const reserva of reservas) {
          if (restante <= 0) break;
          const mat = await tx.material.findUnique({ where: { id: materialId } });
          if (!mat) break;

          const querer = Math.min(Number(reserva.quantidade) || 0, restante);
          const qtdBaixa = Math.min(querer, Math.max(0, Number(mat.estoque) || 0));
          if (qtdBaixa <= 0) break;

          await tx.material.update({
            where: { id: materialId },
            data: { estoque: { decrement: qtdBaixa } },
          });
          await tx.movimentacaoEstoque.create({
            data: {
              materialId,
              tipo: 'SAIDA',
              quantidade: qtdBaixa,
              motivo: params.motivo,
              referencia: params.referencia,
              observacoes: params.observacao,
              ...camposCustoMovimento({
                preco: mat.preco,
                quantidade: qtdBaixa,
                projetoId: params.projetoId,
              }),
            },
          });

          const novaQtd = Number(reserva.quantidade) - qtdBaixa;
          if (novaQtd <= 0.0001) {
            await tx.reservaMaterialProjeto.delete({ where: { id: reserva.id } });
          } else {
            await tx.reservaMaterialProjeto.update({
              where: { id: reserva.id },
              data: { quantidade: novaQtd },
            });
          }

          consumidas.set(materialId, (consumidas.get(materialId) || 0) + qtdBaixa);
          restante -= qtdBaixa;
        }
      }
    });

    return consumidas;
  }

  /** Tira da reserva a quantidade que já saiu pela NF-e, sem mexer no estoque de novo. */
  static async liberarReservas(projetoId: string, quantidades: Map<string, number>): Promise<void> {
    for (const [materialId, quantidade] of quantidades.entries()) {
      let restante = Number(quantidade) || 0;
      if (restante <= 0) continue;

      const reservas = await prisma.reservaMaterialProjeto.findMany({
        where: { projetoId, materialId },
        orderBy: { createdAt: 'asc' },
      });

      for (const reserva of reservas) {
        if (restante <= 0) break;
        const usar = Math.min(Number(reserva.quantidade) || 0, restante);
        if (usar <= 0) continue;
        const novaQtd = Number(reserva.quantidade) - usar;
        if (novaQtd <= 0.0001) {
          await prisma.reservaMaterialProjeto.delete({ where: { id: reserva.id } });
        } else {
          await prisma.reservaMaterialProjeto.update({
            where: { id: reserva.id },
            data: { quantidade: novaQtd },
          });
        }
        restante -= usar;
      }
    }
  }
}
