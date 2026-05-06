import { prisma } from '../lib/prisma';

/**
 * Serviço de Fluxo de Caixa Futuro
 * Projeta entradas e saídas para os próximos 30, 60, 90 dias
 */
export class FluxoCaixaService {
    /**
     * Calcula o fluxo de caixa futuro projetado
     * @param dias Número de dias para projetar (30, 60, 90)
     * @param modo 'confirmado' (apenas faturado) ou 'previsao' (incluindo em negociação)
     */
    static async calcularFluxoCaixaFuturo(dias: number = 90, modo: 'confirmado' | 'previsao' = 'confirmado') {
        console.log(`💰 Calculando Fluxo de Caixa Futuro: ${dias} dias (modo: ${modo})`);

        const dataInicio = new Date();
        dataInicio.setHours(0, 0, 0, 0);

        const dataFim = new Date();
        dataFim.setDate(dataFim.getDate() + dias);
        dataFim.setHours(23, 59, 59, 999);

        // 1. ENTRADAS: Contas a Receber 
        // Buscar TODAS as contas (já pagas E pendentes) para cálculo correto
        const contasReceber = await prisma.contaReceber.findMany({
            where: {
                OR: [
                    // Contas com vencimento futuro (pendentes ou já pagas)
                    {
                        dataVencimento: {
                            gte: dataInicio,
                            lte: dataFim
                        }
                    },
                    // Contas já pagas no período (mesmo que vencimento seja anterior)
                    {
                        dataPagamento: {
                            gte: dataInicio,
                            lte: dataFim
                        },
                        status: 'Pago'
                    }
                ],
                venda: modo === 'confirmado' ? {
                    status: 'Concluida' // Apenas vendas confirmadas/faturadas
                } : undefined // Previsão: incluir todas
            },
            include: {
                venda: {
                    include: {
                        cliente: {
                            select: {
                                nome: true
                            }
                        },
                        orcamento: {
                            select: {
                                numeroSequencial: true,
                                titulo: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                dataVencimento: 'asc'
            }
        });

        // 2. SAÍDAS: Contas a Pagar
        // Buscar TODAS as contas (já pagas E pendentes) para cálculo correto
        const contasPagar = await prisma.contaPagar.findMany({
            where: {
                OR: [
                    // Contas com vencimento futuro (pendentes ou já pagas)
                    {
                        dataVencimento: {
                            gte: dataInicio,
                            lte: dataFim
                        }
                    },
                    // Contas já pagas no período (mesmo que vencimento seja anterior)
                    {
                        dataPagamento: {
                            gte: dataInicio,
                            lte: dataFim
                        },
                        status: 'Pago'
                    }
                ]
            },
            include: {
                fornecedor: {
                    select: {
                        nome: true
                    }
                }
            },
            orderBy: {
                dataVencimento: 'asc'
            }
        });

        // 3. DESPESAS FIXAS MENSAIS (projetar para cada mês do período)
        const despesasFixas = await prisma.despesaFixa.findMany({
            where: {
                ativa: true
            }
        });

        // Calcular total de despesas fixas mensais
        const despesasFixasMensais = despesasFixas.reduce((total, d) => total + Number(d.valor), 0);

        // 4. AGRUPAR POR DIA
        const fluxoPorDia = this.agruparPorDia(contasReceber, contasPagar, despesasFixas, dataInicio, dataFim);

        // 5. AGRUPAR POR SEMANA
        const fluxoPorSemana = this.agruparPorSemana(fluxoPorDia);

        // 6. AGRUPAR POR MÊS
        const fluxoPorMes = this.agruparPorMes(fluxoPorDia);

        // 7. IDENTIFICAR DIAS CRÍTICOS (saldo negativo)
        const diasCriticos = fluxoPorDia.filter(dia => dia.saldoAcumulado < 0);

        // 8. ESTATÍSTICAS
        // Total de entradas PENDENTES (o que ainda vai entrar)
        const totalEntradasPendentes = contasReceber
            .filter(c => c.status === 'Pendente')
            .reduce((sum, c) => sum + Number(c.valorParcela), 0);
        
        // Total de saídas PENDENTES (o que ainda vai sair)
        const totalSaidasPendentes = contasPagar
            .filter(c => c.status === 'Pendente')
            .reduce((sum, c) => sum + Number(c.valorParcela), 0);
        
        // Total de entradas JÁ PAGAS no período
        const totalEntradasPagas = contasReceber
            .filter(c => c.status === 'Pago')
            .reduce((sum, c) => sum + Number(c.valorParcela), 0);
        
        // Total de saídas JÁ PAGAS no período
        const totalSaidasPagas = contasPagar
            .filter(c => c.status === 'Pago')
            .reduce((sum, c) => sum + Number(c.valorParcela), 0);
        
        const saldoFinal = fluxoPorDia[fluxoPorDia.length - 1]?.saldoAcumulado || 0;

        // 9. BUSCAR SALDO INICIAL (caixa atual)
        const saldoInicial = await this.calcularSaldoAtual();

        // 10. CALCULAR RESUMO DO DIA ATUAL (HOJE)
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const hojeFim = new Date(hoje);
        hojeFim.setHours(23, 59, 59, 999);

        // Contas a receber vencendo hoje (incluir todas, não apenas pendentes para visualização completa)
        const receberHoje = contasReceber.filter(c => {
            const dataVenc = new Date(c.dataVencimento);
            dataVenc.setHours(0, 0, 0, 0);
            return dataVenc.getTime() === hoje.getTime();
        });
        const receberHojePendentes = receberHoje.filter(c => c.status === 'Pendente');
        const totalReceberHoje = receberHojePendentes.reduce((sum, c) => sum + Number(c.valorParcela), 0);

        // Contas a pagar vencendo hoje (incluir todas)
        const pagarHoje = contasPagar.filter(c => {
            const dataVenc = new Date(c.dataVencimento);
            dataVenc.setHours(0, 0, 0, 0);
            return dataVenc.getTime() === hoje.getTime();
        });
        const pagarHojePendentes = pagarHoje.filter(c => c.status === 'Pendente');
        const totalPagarHoje = pagarHojePendentes.reduce((sum, c) => sum + c.valorParcela, 0);

        // Saldo previsto final do dia (se tudo for pago/recebido)
        const saldoPrevistoFinal = saldoInicial + totalReceberHoje - totalPagarHoje;

        // Detalhamento completo das contas de hoje
        const detalhamentoHoje = {
            entradas: receberHoje.map(c => {
                const numPedido = c.venda?.numeroSequencial ? `N${c.venda.numeroSequencial}` : null;
                return {
                id: c.id,
                data: c.dataVencimento,
                descricao: (numPedido ? `Venda ${numPedido} - Parcela ${c.numeroParcela}/${c.totalParcelas}` : c.descricao),
                valor: Number(c.valorParcela),
                status: c.status,
                cliente: c.venda?.cliente?.nome || 'N/A',
                numeroPedido: numPedido,
                numeroVenda: c.venda?.numeroVenda || 'N/A',
                numeroParcela: c.numeroParcela,
                totalParcelas: c.totalParcelas,
                dataPagamento: c.dataPagamento,
                observacoes: c.observacoes || ''
            };
            }),
            saidas: pagarHoje.map(c => ({
                id: c.id,
                data: c.dataVencimento,
                descricao: c.descricao,
                valor: Number(c.valorParcela),
                status: c.status,
fornecedor: (c.tipo === 'RH' ? 'Pagamento Funcionário' : (c.fornecedor?.nome || (c as any).credorNome || 'N/A')),
                    tipo: c.tipo || 'FORNECEDOR',
                    dataPagamento: c.dataPagamento,
                    observacoes: c.observacoes || ''
            }))
        };

        // 11. IDENTIFICAR ITENS ATRASADOS (vencimento < hoje e status Pendente)
        const hojeTimestamp = hoje.getTime();
        const contasAtrasadasReceber = contasReceber.filter(c => {
            const dataVenc = new Date(c.dataVencimento);
            dataVenc.setHours(0, 0, 0, 0);
            return dataVenc.getTime() < hojeTimestamp && c.status === 'Pendente';
        });
        const contasAtrasadasPagar = contasPagar.filter(c => {
            const dataVenc = new Date(c.dataVencimento);
            dataVenc.setHours(0, 0, 0, 0);
            return dataVenc.getTime() < hojeTimestamp && c.status === 'Pendente';
        });

        // 12. ADICIONAR SALDO ACUMULADO AOS DETALHAMENTOS
        // Ordenar todas as movimentações por data (apenas pendentes para projeção)
        const todasMovimentacoes = [
            ...contasReceber
                .filter(c => c.status === 'Pendente') // Apenas pendentes para cálculo de saldo futuro
                .map(c => {
                    const numPedido = c.venda?.numeroSequencial ? `N${c.venda.numeroSequencial}` : null;
                    return {
                    id: c.id,
                    data: c.dataVencimento,
                    descricao: (numPedido ? `Venda ${numPedido} - Parcela ${c.numeroParcela}/${c.totalParcelas}` : c.descricao),
                    valor: Number(c.valorParcela),
                    status: c.status,
                    cliente: c.venda?.cliente?.nome || 'N/A',
                    numeroPedido: numPedido,
                    numeroVenda: c.venda?.numeroVenda || 'N/A',
                    numeroParcela: c.numeroParcela,
                    totalParcelas: c.totalParcelas,
                    tipo: 'ENTRADA',
                    estaAtrasado: new Date(c.dataVencimento).getTime() < hojeTimestamp && c.status === 'Pendente'
                };
                }),
            ...contasPagar
                .filter(c => c.status === 'Pendente') // Apenas pendentes
                .map(c => ({
                    id: c.id,
                    data: c.dataVencimento,
                    descricao: c.descricao,
                    valor: -Number(c.valorParcela), // Negativo para saídas
                    status: c.status,
                    fornecedor: (c.tipo === 'RH' ? 'Pagamento Funcionário' : (c.fornecedor?.nome || (c as any).credorNome || 'N/A')),
                    tipo: 'SAIDA',
                    estaAtrasado: new Date(c.dataVencimento).getTime() < hojeTimestamp && c.status === 'Pendente'
                }))
        ].sort((a, b) => {
            // Ordenar por data, mas atrasados primeiro
            const dataA = new Date(a.data).getTime();
            const dataB = new Date(b.data).getTime();
            if (a.estaAtrasado && !b.estaAtrasado) return -1;
            if (!a.estaAtrasado && b.estaAtrasado) return 1;
            return dataA - dataB;
        });

        // Calcular saldo acumulado progressivo (começando do saldo inicial)
        let saldoAcumuladoAtual = saldoInicial;
        const movimentacoesComSaldo = todasMovimentacoes.map(mov => {
            // Adicionar/subtrair o valor ao saldo acumulado
            saldoAcumuladoAtual += mov.valor;
            return {
                ...mov,
                saldoAcumulado: saldoAcumuladoAtual
            };
        });

        return {
            periodo: {
                dataInicio,
                dataFim,
                dias
            },
            modo,
            saldos: {
                saldoInicial,
                totalEntradas: totalEntradasPendentes,
                totalSaidas: totalSaidasPendentes,
                totalEntradasPagas,
                totalSaidasPagas,
                saldoFinal: saldoInicial + totalEntradasPendentes - totalSaidasPendentes,
                despesasFixasMensais
            },
            resumoHoje: {
                data: hoje,
                vencendoHojeReceber: {
                    quantidade: receberHojePendentes.length,
                    valor: totalReceberHoje
                },
                vencendoHojePagar: {
                    quantidade: pagarHojePendentes.length,
                    valor: totalPagarHoje
                },
                saldoPrevistoFinal,
                detalhamentoHoje // Adicionar detalhamento completo
            },
            fluxoPorDia,
            fluxoPorSemana,
            fluxoPorMes,
            diasCriticos,
            detalhamento: {
                contasReceber: contasReceber.map(c => {
                    const numPedido = c.venda?.numeroSequencial ? `N${c.venda.numeroSequencial}` : null;
                    return {
                    id: c.id,
                    data: c.dataVencimento,
                    descricao: (numPedido ? `Venda ${numPedido} - Parcela ${c.numeroParcela}/${c.totalParcelas}` : c.descricao),
                    valor: Number(c.valorParcela),
                    status: c.status,
                    cliente: c.venda?.cliente?.nome || 'N/A',
                    numeroPedido: numPedido,
                    numeroVenda: c.venda?.numeroVenda || 'N/A',
                    numeroParcela: c.numeroParcela,
                    totalParcelas: c.totalParcelas,
                    tipo: 'ENTRADA',
                    estaAtrasado: new Date(c.dataVencimento).getTime() < hojeTimestamp && c.status === 'Pendente'
                };
                }),
                contasPagar: contasPagar.map(c => ({
                    id: c.id,
                    data: c.dataVencimento,
                    descricao: c.descricao,
                    valor: Number(c.valorParcela),
                    status: c.status,
                    fornecedor: (c.tipo === 'RH' ? 'Pagamento Funcionário' : (c.fornecedor?.nome || (c as any).credorNome || 'N/A')),
                    tipo: c.tipo || 'FORNECEDOR',
                    tipoMovimento: 'SAIDA',
                    estaAtrasado: new Date(c.dataVencimento).getTime() < hojeTimestamp && c.status === 'Pendente'
                })),
                movimentacoesComSaldo // Nova propriedade com saldo acumulado
            },
            estatisticas: {
                entradasPendentes: contasReceber.filter(c => c.status === 'Pendente').length,
                saidasPendentes: contasPagar.filter(c => c.status === 'Pendente').length,
                maiorEntrada: Math.max(...contasReceber.map(c => c.valorParcela), 0),
                maiorSaida: Math.max(...contasPagar.map(c => c.valorParcela), 0),
                diasComSaldoNegativo: diasCriticos.length,
                contasAtrasadasReceber: contasAtrasadasReceber.length,
                contasAtrasadasPagar: contasAtrasadasPagar.length
            }
        };
    }

    /**
     * Agrupa fluxo de caixa por dia
     */
    private static agruparPorDia(
        contasReceber: any[],
        contasPagar: any[],
        despesasFixas: any[],
        dataInicio: Date,
        dataFim: Date
    ) {
        const fluxoPorDia: Array<{
            data: Date;
            entradas: number;
            saidas: number;
            saldo: number;
            saldoAcumulado: number;
            detalhes: {
                entradasCount: number;
                saidasCount: number;
                despesasFixas: number;
            };
        }> = [];

        let saldoAcumulado = 0;
        const despesasFixasMensais = despesasFixas.reduce((total, d) => total + d.valor, 0);
        const despesasFixasDiarias = despesasFixasMensais / 30; // Distribuir mensalmente

        const dataAtual = new Date(dataInicio);
        while (dataAtual <= dataFim) {
            const dataKey = this.formatarDataParaChave(dataAtual);

            // Entradas do dia
            const entradasDia = contasReceber.filter(c => 
                this.formatarDataParaChave(c.dataVencimento) === dataKey &&
                c.status === 'Pendente' // Apenas pendentes para projeção
            );
            const totalEntradasDia = entradasDia.reduce((sum, c) => sum + Number(c.valorParcela), 0);

            // Saídas do dia
            const saidasDia = contasPagar.filter(c => 
                this.formatarDataParaChave(c.dataVencimento) === dataKey &&
                c.status === 'Pendente' // Apenas pendentes
            );
            const totalSaidasDia = saidasDia.reduce((sum, c) => sum + c.valorParcela, 0);

            // Adicionar despesas fixas diárias
            const totalSaidasComFixas = totalSaidasDia + despesasFixasDiarias;

            // Saldo do dia
            const saldoDia = totalEntradasDia - totalSaidasComFixas;
            saldoAcumulado += saldoDia;

            fluxoPorDia.push({
                data: new Date(dataAtual),
                entradas: totalEntradasDia,
                saidas: totalSaidasComFixas,
                saldo: saldoDia,
                saldoAcumulado,
                detalhes: {
                    entradasCount: entradasDia.length,
                    saidasCount: saidasDia.length,
                    despesasFixas: despesasFixasDiarias
                }
            });

            dataAtual.setDate(dataAtual.getDate() + 1);
        }

        return fluxoPorDia;
    }

    /**
     * Agrupa fluxo de caixa por semana
     */
    private static agruparPorSemana(fluxoPorDia: any[]) {
        const fluxoPorSemana: any[] = [];
        let semanaAtual: any = null;

        fluxoPorDia.forEach((dia, index) => {
            const diaSemana = dia.data.getDay(); // 0 = Domingo

            if (!semanaAtual || diaSemana === 0) {
                // Iniciar nova semana
                if (semanaAtual) {
                    fluxoPorSemana.push(semanaAtual);
                }
                semanaAtual = {
                    dataInicio: new Date(dia.data),
                    dataFim: new Date(dia.data),
                    entradas: 0,
                    saidas: 0,
                    saldo: 0,
                    saldoAcumuladoFinal: 0
                };
            }

            semanaAtual.dataFim = new Date(dia.data);
            semanaAtual.entradas += dia.entradas;
            semanaAtual.saidas += dia.saidas;
            semanaAtual.saldo += dia.saldo;
            semanaAtual.saldoAcumuladoFinal = dia.saldoAcumulado;
        });

        if (semanaAtual) {
            fluxoPorSemana.push(semanaAtual);
        }

        return fluxoPorSemana;
    }

    /**
     * Agrupa fluxo de caixa por mês
     */
    private static agruparPorMes(fluxoPorDia: any[]) {
        const fluxoPorMes: any[] = [];
        let mesAtual: any = null;

        fluxoPorDia.forEach((dia) => {
            const mesAno = `${dia.data.getFullYear()}-${String(dia.data.getMonth() + 1).padStart(2, '0')}`;

            if (!mesAtual || mesAtual.mesAno !== mesAno) {
                // Iniciar novo mês
                if (mesAtual) {
                    fluxoPorMes.push(mesAtual);
                }
                mesAtual = {
                    mesAno,
                    dataInicio: new Date(dia.data),
                    dataFim: new Date(dia.data),
                    entradas: 0,
                    saidas: 0,
                    saldo: 0,
                    saldoAcumuladoFinal: 0
                };
            }

            mesAtual.dataFim = new Date(dia.data);
            mesAtual.entradas += dia.entradas;
            mesAtual.saidas += dia.saidas;
            mesAtual.saldo += dia.saldo;
            mesAtual.saldoAcumuladoFinal = dia.saldoAcumulado;
        });

        if (mesAtual) {
            fluxoPorMes.push(mesAtual);
        }

        return fluxoPorMes;
    }

    /**
     * Calcula saldo atual (caixa disponível)
     * Soma de todas as contas a receber pagas - contas a pagar pagas
     */
    private static async calcularSaldoAtual() {
        const [recebido, pago] = await Promise.all([
            prisma.contaReceber.aggregate({
                where: { status: { in: ['Pago', 'Recebido'] } },
                _sum: { valorParcela: true }
            }),
            prisma.contaPagar.aggregate({
                where: { status: 'Pago' },
                _sum: { valorParcela: true }
            })
        ]);

        const totalRecebido = Number(recebido._sum.valorParcela || 0);
        const totalPago = Number(pago._sum.valorParcela || 0);

        return totalRecebido - totalPago;
    }

    /**
     * Formata data para chave de agrupamento (YYYY-MM-DD)
     */
    private static formatarDataParaChave(data: Date): string {
        return data.toISOString().split('T')[0];
    }

    /**
     * Saldo acumulado até uma data (antes dessa data): total recebido - total pago com dataPagamento < data
     */
    private static async calcularSaldoAteData(data: Date): Promise<number> {
        const antes = new Date(data);
        antes.setHours(0, 0, 0, 0);

        const [recebido, pago] = await Promise.all([
            prisma.contaReceber.aggregate({
                where: {
                    status: { in: ['Pago', 'Recebido'] },
                    dataPagamento: { lt: antes }
                },
                _sum: { valorParcela: true }
            }),
            prisma.contaPagar.aggregate({
                where: {
                    status: 'Pago',
                    dataPagamento: { lt: antes }
                },
                _sum: { valorParcela: true }
            })
        ]);
        const totalRecebido = Number(recebido._sum.valorParcela || 0);
        const totalPago = Number(pago._sum.valorParcela || 0);
        return totalRecebido - totalPago;
    }

    /**
     * Fluxo de caixa REALIZADO (o que entrou e saiu) em um período – datas passadas ou qualquer intervalo.
     * Usa dataPagamento para agrupar; inclui recebimentos parciais cada um na sua data.
     */
    static async calcularFluxoCaixaRealizado(dataInicio: Date, dataFim: Date) {
        const inicio = new Date(dataInicio);
        inicio.setHours(0, 0, 0, 0);
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);

        const [recebimentosParciais, contasPagar] = await Promise.all([
            prisma.recebimentoParcial.findMany({
                where: { dataPagamento: { gte: inicio, lte: fim } },
                include: {
                    contaReceber: {
                        include: {
                            venda: {
                                include: {
                                    cliente: { select: { nome: true } },
                                    orcamento: { select: { numeroSequencial: true, titulo: true } }
                                }
                            }
                        }
                    }
                },
                orderBy: { dataPagamento: 'asc' }
            }),
            prisma.contaPagar.findMany({
                where: {
                    status: 'Pago',
                    dataPagamento: { gte: inicio, lte: fim }
                },
                include: {
                    fornecedor: { select: { nome: true } }
                },
                orderBy: { dataPagamento: 'asc' }
            })
        ]);

        const contaIdsComParciais = new Set(recebimentosParciais.map((rp) => rp.contaReceberId));
        const contasReceberFull = await prisma.contaReceber.findMany({
            where: {
                status: 'Pago',
                dataPagamento: { gte: inicio, lte: fim },
                ...(contaIdsComParciais.size > 0 ? { id: { notIn: [...contaIdsComParciais] } } : {})
            },
            include: {
                venda: {
                    include: {
                        cliente: { select: { nome: true } },
                        orcamento: { select: { numeroSequencial: true, titulo: true } }
                    }
                }
            },
            orderBy: { dataPagamento: 'asc' }
        });

        const valorEfetivo = (c: any) =>
            Number(c.valorParcela) + (Number((c as any).valorJuros) || 0) - (Number((c as any).valorDesconto) || 0);

        const saldoInicial = await this.calcularSaldoAteData(inicio);

        const fluxoPorDia = this.agruparPorDiaRealizado(contasReceberFull, contasPagar, inicio, fim, saldoInicial, recebimentosParciais);
        const fluxoPorSemana = this.agruparPorSemana(fluxoPorDia);
        const fluxoPorMes = this.agruparPorMes(fluxoPorDia);

        const totalEntradasContas = contasReceberFull.reduce((s, c) => s + valorEfetivo(c), 0);
        const totalEntradasParciais = recebimentosParciais.reduce((s, rp) => s + Number(rp.valorPago), 0);
        const totalEntradas = totalEntradasContas + totalEntradasParciais;
        const totalSaidas = contasPagar.reduce((s, c) => s + valorEfetivo(c), 0);
        const saldoFinal = saldoInicial + totalEntradas - totalSaidas;

        const diasCriticos = fluxoPorDia.filter(d => d.saldoAcumulado < 0);

        const contasReceberDetalhe = contasReceberFull.map(c => {
            const numPedido = c.venda?.numeroSequencial ? `N${c.venda.numeroSequencial}` : null;
            return {
                id: c.id,
                data: c.dataPagamento,
                descricao: (numPedido ? `Venda ${numPedido} - Parcela ${c.numeroParcela}/${c.totalParcelas}` : c.descricao),
                valor: valorEfetivo(c),
                status: c.status,
                cliente: c.venda?.cliente?.nome || 'N/A',
                numeroPedido: numPedido,
                numeroVenda: c.venda?.numeroVenda || 'N/A',
                numeroParcela: c.numeroParcela,
                totalParcelas: c.totalParcelas,
                tipo: 'ENTRADA',
                estaAtrasado: false
            };
        });
        const parciaisDetalhe = recebimentosParciais.map((rp: any) => {
            const c = rp.contaReceber;
            const numPedido = c?.venda?.orcamento?.numeroSequencial ? `N${c.venda.orcamento.numeroSequencial}` : null;
            return {
                id: rp.id,
                data: rp.dataPagamento,
                descricao: (numPedido ? `Venda ${numPedido} - Parcela ${c?.numeroParcela}/${c?.totalParcelas} (receb. parcial)` : `${c?.descricao || 'Conta'} - Recebimento parcial`),
                valor: Number(rp.valorPago),
                status: 'Pago',
                cliente: c?.venda?.cliente?.nome || 'N/A',
                numeroPedido: numPedido,
                numeroVenda: c?.venda?.numeroVenda || 'N/A',
                numeroParcela: c?.numeroParcela,
                totalParcelas: c?.totalParcelas,
                tipo: 'ENTRADA',
                estaAtrasado: false
            };
        });
        const contasPagarDetalhe = contasPagar.map(c => ({
            id: c.id,
            data: c.dataPagamento,
            descricao: c.descricao,
            valor: valorEfetivo(c),
            status: c.status,
            fornecedor: (c.tipo === 'RH' ? 'Pagamento Funcionário' : (c.fornecedor?.nome || (c as any).credorNome || 'N/A')),
            tipo: c.tipo || 'FORNECEDOR',
            tipoMovimento: 'SAIDA',
            estaAtrasado: false
        }));

        const todasMovimentacoes = [
            ...contasReceberDetalhe.map(c => ({ ...c, valor: c.valor, tipo: 'ENTRADA' as const, tipoMovimento: 'ENTRADA' as const })),
            ...parciaisDetalhe.map(c => ({ ...c, valor: c.valor, tipo: 'ENTRADA' as const, tipoMovimento: 'ENTRADA' as const })),
            ...contasPagarDetalhe.map(c => ({ ...c, valor: -c.valor, tipo: 'SAIDA' as const, tipoMovimento: 'SAIDA' as const }))
        ].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

        let saldoAcumuladoAtual = saldoInicial;
        const movimentacoesComSaldo = todasMovimentacoes.map(mov => {
            saldoAcumuladoAtual += mov.valor;
            return { ...mov, saldoAcumulado: saldoAcumuladoAtual };
        });

        const todosValoresEntrada = [...contasReceberFull.map(c => valorEfetivo(c)), ...recebimentosParciais.map((rp: any) => Number(rp.valorPago))];
        return {
            tipo: 'realizado' as const,
            periodo: { dataInicio: inicio, dataFim: fim },
            saldos: {
                saldoInicial,
                totalEntradasPagas: totalEntradas,
                totalSaidasPagas: totalSaidas,
                totalEntradas,
                totalSaidas: totalSaidas,
                saldoFinal
            },
            fluxoPorDia,
            fluxoPorSemana,
            fluxoPorMes,
            diasCriticos,
            estatisticas: {
                entradasPendentes: 0,
                saidasPendentes: 0,
                maiorEntrada: Math.max(...todosValoresEntrada, 0),
                maiorSaida: Math.max(...contasPagar.map(c => valorEfetivo(c)), 0),
                diasComSaldoNegativo: diasCriticos.length,
                contasAtrasadasReceber: 0,
                contasAtrasadasPagar: 0
            },
            detalhamento: {
                contasReceber: [...contasReceberDetalhe, ...parciaisDetalhe],
                contasPagar: contasPagarDetalhe,
                movimentacoesComSaldo
            },
            resumoHoje: null
        };
    }

    /**
     * Agrupa fluxo REALIZADO por dia (usa dataPagamento; inclui recebimentos parciais por data)
     */
    private static agruparPorDiaRealizado(
        contasReceber: any[],
        contasPagar: any[],
        dataInicio: Date,
        dataFim: Date,
        saldoInicial: number,
        recebimentosParciais: Array<{ dataPagamento: Date; valorPago: number }> = []
    ) {
        const fluxoPorDia: Array<{
            data: Date;
            entradas: number;
            saidas: number;
            saldo: number;
            saldoAcumulado: number;
            detalhes: { entradasCount: number; saidasCount: number; despesasFixas: number };
        }> = [];
        const valorEfetivo = (c: any) =>
            Number(c.valorParcela) + (Number((c as any).valorJuros) || 0) - (Number((c as any).valorDesconto) || 0);

        let saldoAcumulado = saldoInicial;
        const dataAtual = new Date(dataInicio);

        while (dataAtual <= dataFim) {
            const dataKey = this.formatarDataParaChave(dataAtual);

            const entradasDia = contasReceber.filter(c =>
                c.dataPagamento && this.formatarDataParaChave(new Date(c.dataPagamento)) === dataKey
            );
            const parciaisDia = recebimentosParciais.filter(
                (rp) => this.formatarDataParaChave(new Date(rp.dataPagamento)) === dataKey
            );
            const totalEntradasDia =
                entradasDia.reduce((sum, c) => sum + valorEfetivo(c), 0) +
                parciaisDia.reduce((sum, rp) => sum + Number(rp.valorPago), 0);

            const saidasDia = contasPagar.filter(c =>
                c.dataPagamento && this.formatarDataParaChave(new Date(c.dataPagamento)) === dataKey
            );
            const totalSaidasDia = saidasDia.reduce((sum, c) => sum + valorEfetivo(c), 0);

            const saldoDia = totalEntradasDia - totalSaidasDia;
            saldoAcumulado += saldoDia;

            fluxoPorDia.push({
                data: new Date(dataAtual),
                entradas: totalEntradasDia,
                saidas: totalSaidasDia,
                saldo: saldoDia,
                saldoAcumulado,
                detalhes: {
                    entradasCount: entradasDia.length + parciaisDia.length,
                    saidasCount: saidasDia.length,
                    despesasFixas: 0
                }
            });

            dataAtual.setDate(dataAtual.getDate() + 1);
        }

        return fluxoPorDia;
    }

    /**
     * Busca movimentações de um dia específico
     */
    static async buscarMovimentacoesDia(data: Date) {
        const dataInicio = new Date(data);
        dataInicio.setHours(0, 0, 0, 0);

        const dataFim = new Date(data);
        dataFim.setHours(23, 59, 59, 999);

        const [entradas, saidas] = await Promise.all([
            prisma.contaReceber.findMany({
                where: {
                    dataVencimento: {
                        gte: dataInicio,
                        lte: dataFim
                    }
                },
                include: {
                    venda: {
                        include: {
                            cliente: true,
                            orcamento: true
                        }
                    }
                }
            }),
            prisma.contaPagar.findMany({
                where: {
                    dataVencimento: {
                        gte: dataInicio,
                        lte: dataFim
                    }
                }
            })
        ]);

        return {
            data,
            entradas,
            saidas,
            resumo: {
                totalEntradas: entradas.reduce((sum, e) => sum + Number(e.valorParcela), 0),
                totalSaidas: saidas.reduce((sum, s) => sum + Number(s.valorParcela), 0)
            }
        };
    }

    /**
     * Comparação: Confirmado vs Previsão
     */
    static async compararConfirmadoVsPrevisao(dias: number = 90) {
        const [confirmado, previsao] = await Promise.all([
            this.calcularFluxoCaixaFuturo(dias, 'confirmado'),
            this.calcularFluxoCaixaFuturo(dias, 'previsao')
        ]);

        return {
            confirmado,
            previsao,
            diferenca: {
                entradas: previsao.saldos.totalEntradas - confirmado.saldos.totalEntradas,
                saidas: previsao.saldos.totalSaidas - confirmado.saldos.totalSaidas,
                saldoFinal: previsao.saldos.saldoFinal - confirmado.saldos.saldoFinal
            }
        };
    }
}
