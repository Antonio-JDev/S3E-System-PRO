import { prisma } from '../lib/prisma';
import { MOTIVOS_CMV_SAIDA } from '../utils/custoMovimentacao.util';
import {
    REGIME_DRE,
    impostoDaVenda,
    particionarReceitaItens,
    resultadoFinanceiro,
    valeEhDuplicado,
} from '../utils/dreGerencial.util';

/**
 * DRE gerencial.
 * Receita pela data da venda, CMV pela baixa de estoque, despesas e resultado financeiro pelo pagamento.
 */
export class DREService {
    static async calcularDRE(dataInicio: Date, dataFim: Date) {
        console.log(`📊 Calculando DRE de ${dataInicio.toLocaleDateString('pt-BR')} até ${dataFim.toLocaleDateString('pt-BR')}`);

        const vendas = await prisma.venda.findMany({
            where: {
                dataVenda: { gte: dataInicio, lte: dataFim },
                status: { in: ['Pendente', 'Concluida'] },
            },
            include: {
                orcamento: {
                    include: {
                        items: true,
                        empresaFiscal: {
                            select: { aliquotaMaterial: true, aliquotaServico: true },
                        },
                    },
                },
                contasReceber: { where: { status: 'Pago' } },
            },
        });

        let receitaMateriais = 0;
        let receitaServicos = 0;
        let impostosVendas = 0;

        for (const v of vendas) {
            const items = (v as any).orcamento?.items;
            let parteMateriais = 0;
            let parteServicos = 0;
            if (items && Array.isArray(items) && items.length > 0) {
                const partes = particionarReceitaItens(items);
                parteMateriais = partes.materiais;
                parteServicos = partes.servicos;
            } else {
                parteMateriais = Number(v.valorTotal) || 0;
            }
            receitaMateriais += parteMateriais;
            receitaServicos += parteServicos;

            const empresa = (v as any).orcamento?.empresaFiscal;
            impostosVendas += impostoDaVenda({
                receitaMateriais: parteMateriais,
                receitaServicos: parteServicos,
                impostoPercentual: Number((v as any).orcamento?.impostoPercentual) || 0,
                aliquotaMaterial: Number(empresa?.aliquotaMaterial) || 0,
                aliquotaServico: Number(empresa?.aliquotaServico) || 0,
            });
        }

        const receitaBruta = receitaMateriais + receitaServicos;

        const contasReceberPagas = await prisma.contaReceber.findMany({
            where: {
                status: 'Pago',
                dataPagamento: { gte: dataInicio, lte: dataFim },
            },
            select: {
                tipo: true,
                valorParcela: true,
                valorJuros: true,
                valorDesconto: true,
                descricao: true,
                dataPagamento: true,
            },
        });

        // Transferência entre contas fica em movimentacoes_tesouraria (TRANSFERENCIA).
        // Não está em vendas nem em contas a receber, então não entra como receita.
        const outrasReceitas = contasReceberPagas
            .filter((c) => c.tipo === 'ENTRADA' || c.tipo === 'OUTRAS_RECEITAS')
            .reduce((sum, c) => sum + c.valorParcela, 0);

        const receitaLiquidaVendas = receitaBruta - impostosVendas;
        const receitaLiquida = receitaLiquidaVendas + outrasReceitas;

        const saidasCmv = await prisma.movimentacaoEstoque.findMany({
            where: {
                tipo: 'SAIDA',
                motivo: { in: [...MOTIVOS_CMV_SAIDA] },
                data: { gte: dataInicio, lte: dataFim },
            },
            include: {
                material: { select: { nome: true, sku: true } },
            },
        });
        const devolucoesCmv = await prisma.movimentacaoEstoque.findMany({
            where: {
                tipo: 'ENTRADA',
                motivo: 'DEVOLUCAO',
                projetoId: { not: null },
                data: { gte: dataInicio, lte: dataFim },
            },
            include: {
                material: { select: { nome: true, sku: true } },
            },
        });

        const custoMateriais = saidasCmv.reduce((sum, m) => sum + (Number(m.valorCusto) || 0), 0)
            - devolucoesCmv.reduce((sum, m) => sum + (Number(m.valorCusto) || 0), 0);

        const contasPagarPagas = await prisma.contaPagar.findMany({
            where: {
                status: 'Pago',
                dataPagamento: { gte: dataInicio, lte: dataFim },
            },
            include: {
                fornecedor: { select: { nome: true } },
            },
        });

        const contasRh = contasPagarPagas.filter((c) => c.tipo === 'RH');
        const custoMaoDeObra = contasRh.reduce((sum, s) => sum + s.valorParcela, 0);

        const vales = await prisma.vale.findMany({
            where: { data: { gte: dataInicio, lte: dataFim } },
        });
        const contasRhVale = contasRh
            .filter((c) => c.subtipo === 'VALE')
            .map((c) => ({
                funcionarioId: c.funcionarioId,
                valorParcela: c.valorParcela,
                dataPagamento: c.dataPagamento,
                subtipo: c.subtipo,
            }));
        const valesSemDuplicata = vales.filter((v) => !valeEhDuplicado(
            { funcionarioId: v.funcionarioId, valor: Number(v.valor), data: v.data },
            contasRhVale,
        ));
        const custoVales = valesSemDuplicata.reduce((sum, v) => sum + Number(v.valor), 0);
        const custoMaoDeObraTotal = custoMaoDeObra + custoVales;

        const cpvTotal = custoMateriais + custoMaoDeObraTotal;
        const lucroBruto = receitaLiquida - cpvTotal;
        const margemBruta = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0;

        const contasDespesa = contasPagarPagas.filter((c) => c.tipo !== 'RH' && !c.compraId);
        const porClassificacaoMap = new Map<string, number>();
        for (const conta of contasDespesa) {
            const chave = (conta.classificacao || '').trim() || 'Sem classificação';
            porClassificacaoMap.set(chave, (porClassificacaoMap.get(chave) || 0) + conta.valorParcela);
        }
        const porClassificacao = Array.from(porClassificacaoMap.entries())
            .map(([classificacao, valor]) => ({ classificacao, valor }))
            .sort((a, b) => b.valor - a.valor);
        const despesasOperacionais = contasDespesa.reduce((sum, d) => sum + d.valorParcela, 0);

        const gastosVeiculos = await prisma.gastoVeiculo.findMany({
            where: { data: { gte: dataInicio, lte: dataFim } },
        });
        const custoVeiculos = gastosVeiculos.reduce((sum, g) => sum + Number(g.valor), 0);
        const despesasOperacionaisTotais = despesasOperacionais + custoVeiculos;

        const ebitda = lucroBruto - despesasOperacionaisTotais;
        const resultadoFinanceiroPeriodo = resultadoFinanceiro({
            receber: contasReceberPagas,
            pagar: contasPagarPagas,
        });
        const resultadoPeriodo = Number((ebitda + resultadoFinanceiroPeriodo).toFixed(2));
        const baseMargem = receitaBruta + outrasReceitas;
        const margemLiquida = baseMargem > 0 ? (resultadoPeriodo / baseMargem) * 100 : 0;

        return {
            periodo: { inicio: dataInicio, fim: dataFim },
            regime: REGIME_DRE,
            resumo: {
                receitaBruta,
                receitaMateriais,
                receitaServicos,
                impostosVendas,
                outrasReceitas,
                receitaLiquida,
                cpv: {
                    materiais: custoMateriais,
                    maoDeObra: custoMaoDeObraTotal,
                    total: cpvTotal,
                },
                lucroBruto,
                margemBruta,
                despesasOperacionais: {
                    despesasFixas: despesasOperacionais,
                    porClassificacao,
                    veiculos: custoVeiculos,
                    total: despesasOperacionaisTotais,
                },
                ebitda,
                resultadoFinanceiro: resultadoFinanceiroPeriodo,
                resultadoPeriodo,
                lucroLiquido: resultadoPeriodo,
                margemLiquida,
            },
            detalhamento: {
                vendas: vendas.map((v) => ({
                    id: v.id,
                    numeroVenda: v.numeroVenda,
                    dataVenda: v.dataVenda,
                    valorTotal: v.valorTotal,
                    status: v.status,
                    valorRecebido: v.contasReceber.reduce((sum, cr) => sum + cr.valorParcela, 0),
                })),
                materiais: saidasCmv.map((m) => ({
                    id: m.id,
                    material: m.material?.nome || 'Material',
                    sku: m.material?.sku || '',
                    data: m.data,
                    quantidade: m.quantidade,
                    valor: Number(m.valorCusto) || 0,
                    custoRetroativo: m.custoRetroativo,
                    motivo: m.motivo,
                })),
                maoDeObra: [
                    ...contasRh.map((s) => ({
                        id: s.id,
                        tipo: s.subtipo || 'RH',
                        descricao: s.descricao,
                        dataPagamento: s.dataPagamento,
                        valor: s.valorParcela,
                    })),
                    ...valesSemDuplicata.map((v) => ({
                        id: v.id,
                        tipo: 'Vale',
                        descricao: `${v.tipo}`,
                        dataPagamento: v.data,
                        valor: Number(v.valor),
                    })),
                ],
                despesasFixas: contasDespesa.map((d) => ({
                    id: d.id,
                    descricao: d.descricao,
                    classificacao: d.classificacao || 'Sem classificação',
                    fornecedor: d.fornecedor?.nome || d.credorNome || 'N/A',
                    dataPagamento: d.dataPagamento,
                    valor: d.valorParcela,
                })),
                veiculos: gastosVeiculos.map((g) => ({
                    id: g.id,
                    tipo: g.tipo,
                    descricao: g.descricao || g.tipo,
                    data: g.data,
                    valor: Number(g.valor),
                })),
                outrasReceitas: contasReceberPagas
                    .filter((c) => c.tipo === 'ENTRADA' || c.tipo === 'OUTRAS_RECEITAS')
                    .map((c) => ({
                        tipo: c.tipo,
                        descricao: c.descricao,
                        dataPagamento: c.dataPagamento,
                        valor: c.valorParcela,
                    })),
            },
            metricas: {
                totalVendas: vendas.length,
                totalCompras: saidasCmv.length,
                totalBaixasMateriais: saidasCmv.length,
                totalDespesas: contasDespesa.length + gastosVeiculos.length,
                ticketMedioVenda: vendas.length > 0 ? receitaBruta / vendas.length : 0,
            },
        };
    }

    static async calcularDREMensal(meses: number = 12) {
        const resultados: Array<Record<string, any>> = [];
        const hoje = new Date();

        for (let i = meses - 1; i >= 0; i--) {
            const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
            const dataFim = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 0, 23, 59, 59);
            const dre = await this.calcularDRE(dataInicio, dataFim);
            resultados.push({
                mes: dataInicio.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
                mesNumerico: `${dataInicio.getFullYear()}-${String(dataInicio.getMonth() + 1).padStart(2, '0')}`,
                dataInicio,
                dataFim,
                ...dre.resumo,
            });
        }

        return resultados;
    }

    static async exportarDREParaPDF(dataInicio: Date, dataFim: Date) {
        const dre = await this.calcularDRE(dataInicio, dataFim);
        const linhasDespesas = (dre.resumo.despesasOperacionais.porClassificacao || []).map((linha) => ({
            nivel: 1,
            descricao: `(-) ${linha.classificacao}`,
            valor: -linha.valor,
            tipo: 'deducao',
        }));

        return {
            titulo: 'DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO (DRE)',
            subtitulo: dre.regime,
            periodo: `${dataInicio.toLocaleDateString('pt-BR')} a ${dataFim.toLocaleDateString('pt-BR')}`,
            data: new Date(),
            linhas: [
                { nivel: 0, descricao: 'RECEITA BRUTA', valor: dre.resumo.receitaBruta, tipo: 'valor' },
                { nivel: 1, descricao: '(-) Impostos sobre Vendas', valor: -dre.resumo.impostosVendas, tipo: 'deducao' },
                { nivel: 1, descricao: '(+) Outras receitas', valor: dre.resumo.outrasReceitas, tipo: 'valor' },
                { nivel: 0, descricao: 'RECEITA LÍQUIDA', valor: dre.resumo.receitaLiquida, tipo: 'subtotal' },
                { nivel: 1, descricao: '(-) CMV - Materiais baixados', valor: -dre.resumo.cpv.materiais, tipo: 'deducao' },
                { nivel: 1, descricao: '(-) CMV - Mão de obra', valor: -dre.resumo.cpv.maoDeObra, tipo: 'deducao' },
                { nivel: 0, descricao: 'LUCRO BRUTO', valor: dre.resumo.lucroBruto, tipo: 'subtotal' },
                { nivel: 2, descricao: `Margem Bruta: ${dre.resumo.margemBruta.toFixed(2)}%`, valor: null, tipo: 'info' },
                ...linhasDespesas,
                { nivel: 1, descricao: '(-) Gastos com Veículos', valor: -dre.resumo.despesasOperacionais.veiculos, tipo: 'deducao' },
                { nivel: 0, descricao: 'EBITDA', valor: dre.resumo.ebitda, tipo: 'subtotal' },
                { nivel: 1, descricao: '(+/-) Resultado financeiro', valor: dre.resumo.resultadoFinanceiro, tipo: 'valor' },
                { nivel: 0, descricao: 'RESULTADO DO PERÍODO (sem depreciação e sem IR/CSLL)', valor: dre.resumo.resultadoPeriodo, tipo: 'total' },
                { nivel: 2, descricao: `Margem do período: ${dre.resumo.margemLiquida.toFixed(2)}%`, valor: null, tipo: 'info' },
            ],
            detalhamento: dre.detalhamento,
            metricas: dre.metricas,
        };
    }
}
