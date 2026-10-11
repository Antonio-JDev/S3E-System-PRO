import { prisma } from '../lib/prisma';
import { MOTIVOS_CMV_SAIDA } from '../utils/custoMovimentacao.util';

export interface LinhaCmvOs {
    id: string;
    materialNome: string;
    sku: string;
    unidade: string;
    quantidade: number;
    custoUnitario: number;
    valorCusto: number;
    custoRetroativo: boolean;
    data: Date;
    motivo: string;
}

export interface LinhaComprometidaOs {
    id: string;
    materialNome: string;
    sku: string;
    unidade: string;
    quantidade: number;
    custoUnitario: number;
    valorEstimado: number;
}

export interface CmvOsResumo {
    linhas: LinhaCmvOs[];
    totalCmv: number;
    comprometido: LinhaComprometidaOs[];
    totalComprometido: number;
}

export async function obterCmvOs(projetoId: string): Promise<CmvOsResumo> {
    const [obra, vendas] = await Promise.all([
        prisma.obra.findUnique({ where: { projetoId }, select: { id: true } }),
        prisma.venda.findMany({ where: { projetoId }, select: { id: true } }),
    ]);

    const referencias = [
        ...(obra?.id ? [obra.id] : []),
        ...vendas.map((v) => v.id),
        projetoId,
    ];

    const saidas = await prisma.movimentacaoEstoque.findMany({
        where: {
            tipo: 'SAIDA',
            motivo: { in: [...MOTIVOS_CMV_SAIDA] },
            OR: [
                { projetoId },
                { referencia: { in: referencias } },
            ],
        },
        include: {
            material: { select: { nome: true, sku: true, unidadeMedida: true } },
        },
        orderBy: { data: 'asc' },
    });

    const devolucoes = await prisma.movimentacaoEstoque.findMany({
        where: {
            tipo: 'ENTRADA',
            motivo: 'DEVOLUCAO',
            projetoId,
        },
        include: {
            material: { select: { nome: true, sku: true, unidadeMedida: true } },
        },
        orderBy: { data: 'asc' },
    });

    const paraLinha = (
        m: (typeof saidas)[number],
        sinal: 1 | -1,
    ): LinhaCmvOs => ({
        id: m.id,
        materialNome: m.material?.nome || 'Material',
        sku: m.material?.sku || '',
        unidade: m.material?.unidadeMedida || 'un',
        quantidade: sinal * m.quantidade,
        custoUnitario: Number(m.custoUnitario) || 0,
        valorCusto: sinal * (Number(m.valorCusto) || 0),
        custoRetroativo: m.custoRetroativo,
        data: m.data,
        motivo: m.motivo,
    });

    const linhas: LinhaCmvOs[] = [
        ...saidas.map((m) => paraLinha(m, 1)),
        ...devolucoes.map((m) => paraLinha(m, -1)),
    ];

    const reservas = await prisma.reservaMaterialProjeto.findMany({
        where: { projetoId },
        include: {
            material: { select: { nome: true, sku: true, unidadeMedida: true, preco: true } },
        },
    });

    const comprometido: LinhaComprometidaOs[] = reservas.map((r) => {
        const custoUnitario = Number(r.material?.preco) || 0;
        return {
            id: r.id,
            materialNome: r.material?.nome || 'Material',
            sku: r.material?.sku || '',
            unidade: r.material?.unidadeMedida || 'un',
            quantidade: r.quantidade,
            custoUnitario,
            valorEstimado: Number((custoUnitario * r.quantidade).toFixed(2)),
        };
    });

    return {
        linhas,
        totalCmv: Number(linhas.reduce((sum, l) => sum + l.valorCusto, 0).toFixed(2)),
        comprometido,
        totalComprometido: Number(comprometido.reduce((sum, l) => sum + l.valorEstimado, 0).toFixed(2)),
    };
}
