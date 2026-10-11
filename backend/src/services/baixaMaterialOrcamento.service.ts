import { prisma } from '../lib/prisma';
import { EstoqueService } from './estoque.service';
import { ReservaMaterialProjetoService } from './reservaMaterialProjeto.service';

/** todos = kit + material de obra; obra = só o que sai na OS; kit = só a composição do kit. */
export type EscopoMateriaisOrcamento = 'todos' | 'obra' | 'kit';

/**
 * Agrupa os materiais do orçamento que saem do estoque da empresa.
 * Serviço, quadro pronto, custo extra e venda direta ficam de fora.
 * Serviço dentro do kit não entra: é custo interno, não item de estoque.
 */
export async function agruparMateriaisDoOrcamento(
    orcamentoId: string,
    escopo: EscopoMateriaisOrcamento = 'todos',
): Promise<Map<string, number>> {
    const itensOrcamento = await prisma.orcamentoItem.findMany({
        where: { orcamentoId },
        include: { kit: true, cotacao: true, material: true },
    });

    const incluiAvulso = escopo === 'todos' || escopo === 'obra';
    const incluiKit = escopo === 'todos' || escopo === 'kit';

    const materiaisAgrupados = new Map<string, number>();
    const add = (materialId: string, qtd: number) => {
        if (!materialId || !qtd || qtd <= 0) return;
        materiaisAgrupados.set(materialId, (materiaisAgrupados.get(materialId) || 0) + qtd);
    };

    for (const item of itensOrcamento as any[]) {
        if (item?.vendaDiretaFornecedor) continue;
        const tipo = String(item.tipo || '').toUpperCase();
        if (tipo === 'SERVICO' || tipo === 'QUADRO_PRONTO' || tipo === 'CUSTO_EXTRA') continue;

        if (tipo === 'MATERIAL' && item.materialId) {
            if (incluiAvulso) add(String(item.materialId), Number(item.quantidade || 0));
            continue;
        }

        if (tipo === 'COTACAO' && (item.cotacaoId || item.materialId)) {
            if (!incluiAvulso) continue;
            const materialIdCotacao = await EstoqueService.resolverMaterialIdParaItemCotacao(item);
            if (materialIdCotacao) {
                add(String(materialIdCotacao), Number(item.quantidade || 0));
            }
            continue;
        }

        if (!incluiKit || tipo !== 'KIT') continue;

        if (item.itensDoKit) {
            const qtdKit = Number(item.quantidade || 1);
            const arr = Array.isArray(item.itensDoKit) ? item.itensDoKit : [item.itensDoKit];
            for (const sub of arr) {
                const tipoSub = String(sub?.tipo || '').toUpperCase();
                if (tipoSub === 'SERVICO') continue;
                if (tipoSub === 'MATERIAL' && sub?.materialId) {
                    add(String(sub.materialId), Number(sub?.quantidade || 1) * qtdKit);
                    continue;
                }
                if (tipoSub === 'COTACAO' && (sub?.materialVinculadoId || sub?.materialId)) {
                    add(String(sub.materialVinculadoId || sub.materialId), Number(sub?.quantidade || 1) * qtdKit);
                    continue;
                }
                if (tipoSub === 'KIT' && sub?.kitId) {
                    const componentes = await EstoqueService.expandirKit(String(sub.kitId));
                    const mult = Number(sub?.quantidade || 1) * qtdKit;
                    for (const c of componentes) {
                        add(String(c.materialId), Number(c.quantidade || 1) * mult);
                    }
                }
            }
            continue;
        }

        if (item.kitId) {
            const componentes = await EstoqueService.expandirKit(String(item.kitId));
            for (const c of componentes) {
                add(String(c.materialId), Number(c.quantidade || 1) * Number(item.quantidade || 1));
            }
        }
    }

    return materiaisAgrupados;
}

/** Baixa só o que houver em estoque. O custo unitário fica congelado na movimentação. */
export async function baixarMapaMateriais(params: {
    quantidades: Map<string, number>;
    projetoId?: string | null;
    referencia: string;
    motivo: string;
    descontar?: Map<string, number>;
    observacao: (nome: string, qtdBaixa: number, qtdRestante: number) => string;
}): Promise<void> {
    for (const [materialId, quantidade] of params.quantidades.entries()) {
        const reservado = params.descontar?.get(materialId) || 0;
        const qtdRestante = Math.max(0, quantidade - reservado);
        if (qtdRestante <= 0) continue;

        const material = await prisma.material.findUnique({
            where: { id: materialId },
            select: { id: true, nome: true, estoque: true, preco: true },
        });
        if (!material) continue;

        const qtdBaixa = Math.min(qtdRestante, Math.max(0, Number(material.estoque) || 0));
        if (qtdBaixa <= 0) {
            console.warn(`[Estoque] Sem estoque para baixar ${material.nome} (necessário ${qtdRestante}). Continuando.`);
            continue;
        }

        await EstoqueService.darBaixaMaterial(
            materialId,
            qtdBaixa,
            params.motivo,
            params.referencia,
            params.observacao(material.nome, qtdBaixa, qtdRestante),
            { projetoId: params.projetoId, custoUnitario: material.preco },
        );
    }
}

/** Quando a baixa já ocorreu no pedido de venda antigo, só aponta as saídas para a OS. */
export async function vincularMovimentosVendaAoProjeto(orcamentoId: string, projetoId: string): Promise<void> {
    const venda = await prisma.venda.findUnique({
        where: { orcamentoId },
        select: { id: true },
    });
    if (!venda) return;

    await prisma.movimentacaoEstoque.updateMany({
        where: { referencia: venda.id, motivo: 'VENDA', projetoId: null },
        data: { projetoId },
    });
}

async function projetoIdDaVenda(orcamentoId: string, projetoIdConhecido?: string | null): Promise<string | null> {
    if (projetoIdConhecido) return projetoIdConhecido;
    const projeto = await prisma.projeto.findUnique({
        where: { orcamentoId },
        select: { id: true },
    });
    if (projeto?.id) return projeto.id;
    const venda = await prisma.venda.findUnique({
        where: { orcamentoId },
        select: { projetoId: true },
    });
    return venda?.projetoId ?? null;
}

/**
 * Na geração da venda (e de novo ao criar a OS, se a venda já existir), reserva kit e material de obra.
 * Não dá baixa. Não duplica quantidade que já esteja reservada. Não reserva o que já saiu.
 */
export async function reservarMateriaisDaVenda(orcamentoId: string): Promise<{ reservados: number; projetoId: string | null }> {
    const projetoId = await projetoIdDaVenda(orcamentoId);
    if (!projetoId) return { reservados: 0, projetoId: null };

    const orcamento = await prisma.orcamento.findUnique({
        where: { id: orcamentoId },
        select: { baixaEstoqueRealizadaEm: true, baixaKitRealizadaEm: true },
    });
    if (orcamento?.baixaEstoqueRealizadaEm === 'VENDA') {
        return { reservados: 0, projetoId };
    }

    const quantidades = new Map<string, number>();
    const somar = (origem: Map<string, number>) => {
        for (const [materialId, qtd] of origem.entries()) {
            quantidades.set(materialId, (quantidades.get(materialId) || 0) + qtd);
        }
    };

    if (orcamento?.baixaEstoqueRealizadaEm !== 'OBRA') {
        somar(await agruparMateriaisDoOrcamento(orcamentoId, 'obra'));
    }
    if (orcamento?.baixaKitRealizadaEm !== 'NFE') {
        somar(await agruparMateriaisDoOrcamento(orcamentoId, 'kit'));
    }
    if (quantidades.size === 0) return { reservados: 0, projetoId };

    const existentes = await ReservaMaterialProjetoService.listarPorProjeto(projetoId);
    const jaReservado = new Map<string, number>();
    for (const reserva of existentes) {
        jaReservado.set(reserva.materialId, (jaReservado.get(reserva.materialId) || 0) + reserva.quantidade);
    }

    let reservados = 0;
    for (const [materialId, quantidade] of quantidades.entries()) {
        const falta = quantidade - (jaReservado.get(materialId) || 0);
        if (falta <= 0.0001) continue;
        await ReservaMaterialProjetoService.criarReserva({
            projetoId,
            materialId,
            quantidade: falta,
            observacoes: 'Reserva na venda: kit e material de obra, sem baixa de estoque',
        });
        reservados++;
    }

    return { reservados, projetoId };
}

/**
 * NF-e de produto autorizada: explode o kit e baixa os componentes.
 * Material de obra fora do kit não entra. Serviço do kit não vira linha de estoque.
 * O CMV cai na data desta saída (motivo VENDA, com custo e projeto).
 */
export async function baixarKitNaEmissaoNfe(notaFiscalId: string): Promise<{ baixou: boolean; motivo?: string }> {
    const nota = await prisma.notaFiscal.findUnique({
        where: { id: notaFiscalId },
        select: { id: true, status: true, tipo: true, vendaId: true, projetoId: true },
    });
    if (!nota?.vendaId) return { baixou: false, motivo: 'Nota sem venda' };
    if (nota.status !== 'Autorizada') return { baixou: false, motivo: 'Nota não autorizada' };
    if (nota.tipo && nota.tipo !== 'PRODUTO') return { baixou: false, motivo: 'Nota não é de produto' };

    const venda = await prisma.venda.findUnique({
        where: { id: nota.vendaId },
        select: { orcamentoId: true, projetoId: true },
    });
    if (!venda?.orcamentoId) return { baixou: false, motivo: 'Venda sem orçamento' };

    const orcamento = await prisma.orcamento.findUnique({
        where: { id: venda.orcamentoId },
        select: { baixaKitRealizadaEm: true },
    });
    if (orcamento?.baixaKitRealizadaEm === 'NFE') {
        return { baixou: false, motivo: 'Componentes do kit já baixados em outra NF-e' };
    }

    const jaBaixouEstaNota = await prisma.movimentacaoEstoque.count({
        where: { referencia: nota.id, tipo: 'SAIDA', motivo: 'VENDA' },
    });
    if (jaBaixouEstaNota > 0) {
        await prisma.orcamento.update({
            where: { id: venda.orcamentoId },
            data: { baixaKitRealizadaEm: 'NFE' },
        });
        return { baixou: false, motivo: 'Componentes do kit desta nota já foram baixados' };
    }

    const quantidades = await agruparMateriaisDoOrcamento(venda.orcamentoId, 'kit');
    if (quantidades.size === 0) return { baixou: false, motivo: 'Orçamento sem componente de kit no estoque' };

    const projetoId = await projetoIdDaVenda(venda.orcamentoId, nota.projetoId || venda.projetoId);

    await baixarMapaMateriais({
        quantidades,
        projetoId,
        referencia: nota.id,
        motivo: 'VENDA',
        observacao: (nome, qtdBaixa, qtdRestante) =>
            qtdBaixa < qtdRestante
                ? `Baixa parcial dos componentes do kit na NF-e (${nome}): ${qtdBaixa}/${qtdRestante}`
                : `Baixa dos componentes do kit na emissão da NF-e`,
    });

    const saidas = await prisma.movimentacaoEstoque.findMany({
        where: { referencia: nota.id, tipo: 'SAIDA', motivo: 'VENDA' },
        select: { materialId: true, quantidade: true },
    });
    if (saidas.length === 0) {
        return { baixou: false, motivo: 'Sem estoque para baixar os componentes do kit' };
    }

    if (projetoId) {
        const liberar = new Map<string, number>();
        for (const saida of saidas) {
            liberar.set(saida.materialId, (liberar.get(saida.materialId) || 0) + saida.quantidade);
        }
        await ReservaMaterialProjetoService.liberarReservas(projetoId, liberar);
    }

    await prisma.orcamento.update({
        where: { id: venda.orcamentoId },
        data: { baixaKitRealizadaEm: 'NFE' },
    });

    return { baixou: true };
}

/**
 * Cancelamento da NF-e: devolve os componentes do kit com o mesmo valorCusto da saída.
 * A reserva volta para a OS, para o kit não ser baixado na obra.
 */
export async function estornarBaixaKitDaNota(notaFiscalId: string): Promise<number> {
    const movimentacoes = await prisma.movimentacaoEstoque.findMany({
        where: { referencia: notaFiscalId, tipo: 'SAIDA', motivo: 'VENDA' },
    });
    if (movimentacoes.length === 0) return 0;

    for (const mov of movimentacoes) {
        const valorCusto = mov.valorCusto != null
            ? Number(mov.valorCusto)
            : Number(((Number(mov.custoUnitario) || 0) * mov.quantidade).toFixed(2));
        await EstoqueService.incrementarEstoque(
            mov.materialId,
            mov.quantidade,
            'DEVOLUCAO',
            notaFiscalId,
            `Estorno da baixa do kit — cancelamento da NF-e ${notaFiscalId}`,
            {
                projetoId: mov.projetoId,
                custoUnitario: mov.custoUnitario,
                valorCusto,
            },
        );
    }

    const nota = await prisma.notaFiscal.findUnique({
        where: { id: notaFiscalId },
        select: { vendaId: true, projetoId: true },
    });
    const venda = nota?.vendaId
        ? await prisma.venda.findUnique({
            where: { id: nota.vendaId },
            select: { orcamentoId: true, projetoId: true },
        })
        : null;

    if (venda?.orcamentoId) {
        await prisma.orcamento.update({
            where: { id: venda.orcamentoId },
            data: { baixaKitRealizadaEm: null },
        });
    }

    const projetoId = movimentacoes.find((m) => m.projetoId)?.projetoId
        || nota?.projetoId
        || venda?.projetoId
        || null;
    if (projetoId) {
        const mapa = new Map<string, number>();
        for (const mov of movimentacoes) {
            mapa.set(mov.materialId, (mapa.get(mov.materialId) || 0) + mov.quantidade);
        }
        for (const [materialId, quantidade] of mapa.entries()) {
            await ReservaMaterialProjetoService.criarReserva({
                projetoId,
                materialId,
                quantidade,
                observacoes: 'Reserva do kit restaurada no cancelamento da NF-e',
            });
        }
    }

    return movimentacoes.length;
}

/**
 * OS sem obra de campo: serviço puro não baixa estoque.
 * Material de obra baixa aqui. Componente de kit continua só reservado.
 * Pedido antigo que já baixou na venda só vincula a saída à OS.
 */
export async function aplicarEstoqueSemObra(projetoId: string): Promise<void> {
    const projeto = await prisma.projeto.findUnique({
        where: { id: projetoId },
        select: { orcamentoId: true },
    });
    if (!projeto?.orcamentoId) return;

    const orcamento = await prisma.orcamento.findUnique({
        where: { id: projeto.orcamentoId },
        select: { baixaEstoqueRealizadaEm: true },
    });

    if (orcamento?.baixaEstoqueRealizadaEm === 'VENDA') {
        await vincularMovimentosVendaAoProjeto(projeto.orcamentoId, projetoId);
        return;
    }
    if (orcamento?.baixaEstoqueRealizadaEm === 'OBRA') return;

    const quantidades = await agruparMateriaisDoOrcamento(projeto.orcamentoId, 'obra');
    if (quantidades.size === 0) return;

    let consumidas = new Map<string, number>();
    try {
        consumidas = await ReservaMaterialProjetoService.consumirReservasLimitadas({
            projetoId,
            referencia: projetoId,
            motivo: 'OBRA',
            limites: quantidades,
            observacao: `Reserva de material de obra consumida ao marcar sem obra (projeto ${projetoId})`,
        });
    } catch (err) {
        console.error('Erro ao consumir reservas ao marcar sem obra:', err);
    }

    await baixarMapaMateriais({
        quantidades,
        descontar: consumidas,
        projetoId,
        referencia: projetoId,
        motivo: 'OBRA',
        observacao: (nome, qtdBaixa, qtdRestante) =>
            qtdBaixa < qtdRestante
                ? `Baixa parcial ao marcar sem obra (${nome}): ${qtdBaixa}/${qtdRestante}`
                : `Baixa ao marcar sem obra de campo (projeto ${projetoId})`,
    });

    await prisma.orcamento.update({
        where: { id: projeto.orcamentoId },
        data: { baixaEstoqueRealizadaEm: 'OBRA' },
    });
}
