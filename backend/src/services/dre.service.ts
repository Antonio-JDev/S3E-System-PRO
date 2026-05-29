import { prisma } from '../lib/prisma';

/**
 * Serviço para gerar DRE (Demonstração do Resultado do Exercício)
 * Consolida receitas, custos, despesas e calcula lucro líquido.
 * Receita é calculada por item: kits unificados são expandidos (valor de cada material/serviço × quantidade vendida).
 */
export class DREService {
    /**
     * Calcula a receita bruta a partir dos itens do orçamento, expandindo kit unificado.
     * Para kit unificado (tipo KIT, sem kitId, com itensDoKit): usa valor de cada componente × quantidade.
     * Para demais itens: usa subtotal do item.
     */
    private static receitaBrutaDeItens(items: Array<{ tipo: string; kitId: string | null; quantidade: number; subtotal: number; itensDoKit?: unknown; vendaDiretaFornecedor?: boolean }>): number {
        let total = 0;
        for (const item of items) {
            // Itens venda direta não entram como receita da empresa
            if ((item as any).vendaDiretaFornecedor) {
                continue;
            }
            const tipo = (item.tipo || '').toUpperCase();
            const ehKitUnificado = tipo === 'KIT' && !item.kitId && item.itensDoKit != null;
            if (ehKitUnificado && Array.isArray(item.itensDoKit)) {
                const qtdKit = Number(item.quantidade) || 0;
                for (const sub of item.itensDoKit as Array<{ valorVenda?: number; quantidade?: number; subtotal?: number }>) {
                    const qtdSub = Number(sub.quantidade) ?? 0;
                    const valorUnit = Number(sub.valorVenda) ?? Number((sub as any).precoUnit) ?? 0;
                    const subtotalSub = Number(sub.subtotal);
                    const valorItem = subtotalSub && !Number.isNaN(subtotalSub) ? subtotalSub : valorUnit * qtdSub;
                    total += valorItem * qtdKit;
                }
            } else {
                total += Number(item.subtotal) || 0;
            }
        }
        return total;
    }

    /**
     * Calcula o DRE completo para um período específico
     */
    static async calcularDRE(dataInicio: Date, dataFim: Date) {
        console.log(`📊 Calculando DRE de ${dataInicio.toLocaleDateString('pt-BR')} até ${dataFim.toLocaleDateString('pt-BR')}`);

        // ====================================
        // 1. RECEITAS (Vendas aprovadas no período) – por item, expandindo kit unificado
        // ====================================
        const vendas = await prisma.venda.findMany({
            where: {
                dataVenda: {
                    gte: dataInicio,
                    lte: dataFim
                },
                status: {
                    in: ['Pendente', 'Concluida'] // Considerar vendas confirmadas
                }
            },
            include: {
                orcamento: {
                    include: {
                        items: true // Itens para calcular receita por material/serviço (kit unificado expandido)
                    }
                },
                contasReceber: {
                    where: {
                        status: 'Pago' // Só receitas efetivamente recebidas
                    }
                }
            }
        });

        // Receita bruta = soma dos valores de venda de cada item (kit unificado = soma dos componentes)
        let receitaBruta = 0;
        for (const v of vendas) {
            const items = (v as any).orcamento?.items;
            if (items && Array.isArray(items) && items.length > 0) {
                receitaBruta += this.receitaBrutaDeItens(items);
            } else {
                receitaBruta += Number(v.valorTotal) || 0;
            }
        }
        
        // Calcular impostos (média dos impostos das vendas ou usar alíquota padrão)
        const impostosMedio = vendas.reduce((sum, v) => {
            return sum + (v.orcamento?.impostoPercentual || 0);
        }, 0) / (vendas.length || 1);
        
        const impostosVendas = receitaBruta * (impostosMedio / 100);
        const receitaLiquida = receitaBruta - impostosVendas;

        // ====================================
        // 2. CPV (Custo de Produtos/Serviços Vendidos)
        // ====================================
        
        // 2.1 Custo de Materiais (Compras vinculadas ao período)
        const compras = await prisma.compra.findMany({
            where: {
                dataRecebimento: {
                    gte: dataInicio,
                    lte: dataFim
                },
                status: 'Recebido'
            },
            include: {
                items: true
            }
        });

        const custoMateriais = compras.reduce((sum, c) => sum + c.valorTotal, 0);

        // 2.2 Custo de Mão de Obra (Salários/Vales de eletricistas no período)
        // Buscar salários pagos (usando ContaPagar com tipo RH)
        const salariosPagos = await prisma.contaPagar.findMany({
            where: {
                tipo: 'RH',
                dataPagamento: {
                    gte: dataInicio,
                    lte: dataFim
                },
                status: 'Pago'
            }
        });

        const custoMaoDeObra = salariosPagos.reduce((sum, s) => sum + s.valorParcela, 0);

        // Adicionar vales pagos no período
        const vales = await prisma.vale.findMany({
            where: {
                data: {
                    gte: dataInicio,
                    lte: dataFim
                }
            }
        });

        const custoVales = vales.reduce((sum, v) => sum + Number(v.valor), 0);

        const custoMaoDeObraTotal = custoMaoDeObra + custoVales;

        // CPV Total
        const cpvTotal = custoMateriais + custoMaoDeObraTotal;
        const lucroBruto = receitaLiquida - cpvTotal;
        const margemBruta = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0;

        // ====================================
        // 3. DESPESAS OPERACIONAIS (FIXAS)
        // ====================================
        const despesasFixasPagas = await prisma.contaPagar.findMany({
            where: {
                tipo: 'DESPESA_FIXA',
                dataPagamento: {
                    gte: dataInicio,
                    lte: dataFim
                },
                status: 'Pago'
            },
            include: {
                fornecedor: {
                    select: {
                        nome: true
                    }
                }
            }
        });

        const despesasOperacionais = despesasFixasPagas.reduce((sum, d) => sum + d.valorParcela, 0);

        // Gastos com veículos
        const gastosVeiculos = await prisma.gastoVeiculo.findMany({
            where: {
                data: {
                    gte: dataInicio,
                    lte: dataFim
                }
            }
        });

        const custoVeiculos = gastosVeiculos.reduce((sum, g) => sum + Number(g.valor), 0);

        const despesasOperacionaisTotais = despesasOperacionais + custoVeiculos;

        // ====================================
        // 4. EBITDA / LUCRO OPERACIONAL
        // ====================================
        const ebitda = lucroBruto - despesasOperacionaisTotais;

        // ====================================
        // 5. LUCRO LÍQUIDO FINAL
        // ====================================
        const lucroLiquido = ebitda;
        const margemLiquida = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;

        // ====================================
        // 6. DETALHAMENTO PARA EXIBIÇÃO
        // ====================================
        
        // Detalhamento de materiais
        const detalhamentoMateriais = compras.map(c => ({
            id: c.id,
            numeroNF: c.numeroNF,
            fornecedor: c.fornecedorNome,
            dataRecebimento: c.dataRecebimento,
            valor: c.valorTotal,
            itens: c.items.length
        }));

        // Detalhamento de mão de obra
        const detalhamentoMaoDeObra = [
            ...salariosPagos.map(s => ({
                id: s.id,
                tipo: 'Salário',
                descricao: s.descricao,
                dataPagamento: s.dataPagamento,
                valor: s.valorParcela
            })),
            ...vales.map(v => ({
                id: v.id,
                tipo: 'Vale',
                descricao: `${v.tipo}`,
                dataPagamento: v.data,
                valor: Number(v.valor)
            }))
        ];

        // Detalhamento de despesas fixas
        const detalhamentoDespesasFixas = despesasFixasPagas.map(d => ({
            id: d.id,
            descricao: d.descricao,
            fornecedor: d.fornecedor?.nome || 'N/A',
            dataPagamento: d.dataPagamento,
            valor: d.valorParcela
        }));

        // Detalhamento de gastos com veículos
        const detalhamentoVeiculos = gastosVeiculos.map(g => ({
            id: g.id,
            tipo: g.tipo,
            descricao: g.descricao || g.tipo,
            data: g.data,
            valor: Number(g.valor)
        }));

        // Detalhamento de vendas
        const detalhamentoVendas = vendas.map(v => ({
            id: v.id,
            numeroVenda: v.numeroVenda,
            dataVenda: v.dataVenda,
            valorTotal: v.valorTotal,
            status: v.status,
            valorRecebido: v.contasReceber.reduce((sum, cr) => sum + cr.valorParcela, 0)
        }));

        // ====================================
        // RETORNO ESTRUTURADO
        // ====================================
        return {
            periodo: {
                inicio: dataInicio,
                fim: dataFim
            },
            resumo: {
                receitaBruta,
                impostosVendas,
                receitaLiquida,
                cpv: {
                    materiais: custoMateriais,
                    maoDeObra: custoMaoDeObraTotal,
                    total: cpvTotal
                },
                lucroBruto,
                margemBruta,
                despesasOperacionais: {
                    despesasFixas: despesasOperacionais,
                    veiculos: custoVeiculos,
                    total: despesasOperacionaisTotais
                },
                ebitda,
                lucroLiquido,
                margemLiquida
            },
            detalhamento: {
                vendas: detalhamentoVendas,
                materiais: detalhamentoMateriais,
                maoDeObra: detalhamentoMaoDeObra,
                despesasFixas: detalhamentoDespesasFixas,
                veiculos: detalhamentoVeiculos
            },
            metricas: {
                totalVendas: vendas.length,
                totalCompras: compras.length,
                totalDespesas: despesasFixasPagas.length + gastosVeiculos.length,
                ticketMedioVenda: vendas.length > 0 ? receitaBruta / vendas.length : 0
            }
        };
    }

    /**
     * Calcula DRE consolidado por mês (últimos 12 meses)
     */
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
                ...dre.resumo
            });
        }

        return resultados;
    }

    /**
     * Exporta DRE para formato de impressão/PDF
     */
    static async exportarDREParaPDF(dataInicio: Date, dataFim: Date) {
        const dre = await this.calcularDRE(dataInicio, dataFim);

        // Estrutura formatada para PDF
        return {
            titulo: 'DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO (DRE)',
            periodo: `${dataInicio.toLocaleDateString('pt-BR')} a ${dataFim.toLocaleDateString('pt-BR')}`,
            data: new Date(),
            linhas: [
                { nivel: 0, descricao: 'RECEITA BRUTA', valor: dre.resumo.receitaBruta, tipo: 'valor' },
                { nivel: 1, descricao: '(-) Impostos sobre Vendas', valor: -dre.resumo.impostosVendas, tipo: 'deducao' },
                { nivel: 0, descricao: 'RECEITA LÍQUIDA', valor: dre.resumo.receitaLiquida, tipo: 'subtotal' },
                { nivel: 1, descricao: '(-) CPV - Custo de Materiais', valor: -dre.resumo.cpv.materiais, tipo: 'deducao' },
                { nivel: 1, descricao: '(-) CPV - Custo de Mão de Obra', valor: -dre.resumo.cpv.maoDeObra, tipo: 'deducao' },
                { nivel: 0, descricao: 'LUCRO BRUTO', valor: dre.resumo.lucroBruto, tipo: 'subtotal' },
                { nivel: 2, descricao: `Margem Bruta: ${dre.resumo.margemBruta.toFixed(2)}%`, valor: null, tipo: 'info' },
                { nivel: 1, descricao: '(-) Despesas Fixas', valor: -dre.resumo.despesasOperacionais.despesasFixas, tipo: 'deducao' },
                { nivel: 1, descricao: '(-) Gastos com Veículos', valor: -dre.resumo.despesasOperacionais.veiculos, tipo: 'deducao' },
                { nivel: 0, descricao: 'EBITDA / LUCRO OPERACIONAL', valor: dre.resumo.ebitda, tipo: 'subtotal' },
                { nivel: 0, descricao: 'LUCRO LÍQUIDO', valor: dre.resumo.lucroLiquido, tipo: 'total' },
                { nivel: 2, descricao: `Margem Líquida: ${dre.resumo.margemLiquida.toFixed(2)}%`, valor: null, tipo: 'info' }
            ],
            detalhamento: dre.detalhamento,
            metricas: dre.metricas
        };
    }
}
