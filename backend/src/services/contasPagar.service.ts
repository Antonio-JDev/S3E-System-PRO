import { prisma } from '../lib/prisma';
import { ContaStatus } from '../types/index';
import { RhService } from './rh.service';
import { LancamentoFolhaCategoria } from '@prisma/client';

export interface ContaPagarPayload {
    fornecedorId?: string;
    origemCadastro?: 'FORNECEDOR_CADASTRADO' | 'FORNECEDOR_NOVO' | 'RH' | 'DESPESA_FIXA';
    credorNome?: string; // Nome do credor para contas manuais (sem compra)
    compraId?: string;
    tipo?: string; // FORNECEDOR, RH, DESPESA_FIXA, FROTA
    subtipo?: string; // RH: ADIANTAMENTO | VALE | SALARIO
    funcionarioId?: string;
    descontoFolhaTipo?: 'UMA_VEZ' | 'PARCELADO';
    descontoFolhaParcelas?: number;
    descontoFolhaReferenciaAno?: number;
    descontoFolhaReferenciaMes?: number;
    descricao: string;
    valorParcela: number;
    dataVencimento: Date;
    numeroParcela?: number;
    totalParcelas?: number;
    observacoes?: string;
    classificacao?: string; // Impostos, TRT-ART, Serviço mão de obra eletricista, Brindes, Combustíveis e pedagios, Frete, Material de escritório, Saídas
}

export interface AtualizarContaPagarPayload {
    fornecedorId?: string | null;
    credorNome?: string | null;
    descricao?: string;
    dataVencimento?: Date;
    observacoes?: string | null;
    classificacao?: string | null;
}

type TipoContaPagar = 'FORNECEDOR' | 'RH' | 'DESPESA_FIXA' | 'FROTA';

function parseAnoMesReferencia(dataBase: Date): { ano: number; mes: number } {
    return {
        ano: dataBase.getFullYear(),
        mes: dataBase.getMonth() + 1,
    };
}

function avancarMes(ano: number, mes: number): { ano: number; mes: number } {
    if (mes === 12) {
        return { ano: ano + 1, mes: 1 };
    }
    return { ano, mes: mes + 1 };
}

export interface ContaPagarParceladaPayload {
    fornecedorId?: string;
    compraId?: string;
    descricao: string;
    valorTotal: number;
    parcelas: number;
    dataPrimeiroVencimento: Date;
    observacoes?: string;
}

export interface ContaPagarPorDuplicataPayload {
    fornecedorId?: string;
    compraId?: string;
    descricao: string;
    duplicatas: Array<{
        numero: string;
        dataVencimento: string;
        valor: number;
    }>;
    observacoes?: string;
}

export class ContasPagarService {
    /**
     * Cria uma única conta a pagar
     */
    static async criarContaPagar(data: ContaPagarPayload) {
        const {
            fornecedorId,
            origemCadastro,
            credorNome,
            compraId,
            tipo,
            subtipo,
            funcionarioId,
            descontoFolhaTipo,
            descontoFolhaParcelas,
            descontoFolhaReferenciaAno,
            descontoFolhaReferenciaMes,
            descricao,
            valorParcela,
            dataVencimento,
            numeroParcela,
            totalParcelas,
            observacoes,
            classificacao
        } = data;

        const tipoFinal = ((tipo || 'FORNECEDOR') as TipoContaPagar);

        // Validações
        if (valorParcela <= 0) {
            throw new Error('Valor da parcela deve ser maior que zero');
        }

        if (tipoFinal === 'FORNECEDOR') {
            const origem = origemCadastro || (fornecedorId ? 'FORNECEDOR_CADASTRADO' : 'FORNECEDOR_NOVO');
            if (origem === 'FORNECEDOR_CADASTRADO' && !fornecedorId) {
                throw new Error('Selecione um fornecedor cadastrado para continuar.');
            }
            if (origem === 'FORNECEDOR_NOVO' && !credorNome?.trim()) {
                throw new Error('Informe o nome do novo fornecedor/credor.');
            }
        }

        if (tipoFinal === 'RH') {
            if (!funcionarioId) {
                throw new Error('Selecione um funcionário para conta de Recursos Humanos.');
            }
            if (!subtipo || !['ADIANTAMENTO', 'VALE', 'SALARIO'].includes(subtipo)) {
                throw new Error('Subtipo de RH inválido. Use ADIANTAMENTO, VALE ou SALARIO.');
            }
            if (subtipo !== 'SALARIO') {
                if (!descontoFolhaTipo || !['UMA_VEZ', 'PARCELADO'].includes(descontoFolhaTipo)) {
                    throw new Error('Defina se o desconto em folha será em uma vez ou parcelado.');
                }
                if (descontoFolhaTipo === 'PARCELADO' && (!descontoFolhaParcelas || descontoFolhaParcelas < 2)) {
                    throw new Error('Informe uma quantidade de parcelas maior ou igual a 2.');
                }
            }
        }

        // Criar conta a pagar (tipo FROTA para gastos de veículos - não vira despesa fixa)
        const createData = {
                fornecedorId,
                origemCadastro: origemCadastro || undefined,
                credorNome: credorNome || undefined,
                compraId,
                tipo: tipoFinal,
                subtipo: subtipo || undefined,
                funcionarioId: funcionarioId || undefined,
                descontoFolhaTipo: descontoFolhaTipo || undefined,
                descontoFolhaParcelas: descontoFolhaParcelas || undefined,
                descontoFolhaReferenciaAno: descontoFolhaReferenciaAno || undefined,
                descontoFolhaReferenciaMes: descontoFolhaReferenciaMes || undefined,
                descricao,
                valorParcela,
                dataVencimento,
                numeroParcela,
                totalParcelas,
                observacoes,
                classificacao: classificacao || undefined,
                status: ContaStatus.Pendente
            };
        const contaPagar = await prisma.contaPagar.create({
            data: createData as any,
            include: {
                fornecedor: true
            }
        });

        // Notificar apenas role Financeiro/Faturamento (contas a receber/pagar)
        try {
            const { criarNotificacao } = await import('./notificacoes.service');
            const usuarios = await prisma.user.findMany({
                where: {
                    active: true,
                    role: { equals: 'financeiro_faturamento', mode: 'insensitive' }
                },
                select: { id: true }
            });
            const titulo = 'Nova conta a pagar criada';
            const mensagem = `Conta: ${contaPagar.descricao} • Valor: R$ ${contaPagar.valorParcela.toFixed(2)} • Vencimento: ${contaPagar.dataVencimento?.toISOString().slice(0,10) || 'N/A'}`;
            for (const u of usuarios) {
                await criarNotificacao({
                    userId: u.id,
                    tipo: 'financeiro',
                    titulo,
                    mensagem,
                    metadata: { contaPagarId: contaPagar.id, compraId: compraId || null, fornecedorId: fornecedorId || null },
                    enviarEmail: true
                });
            }
        } catch (err) {
            console.error('Erro ao notificar sobre nova conta a pagar:', err);
        }

        return contaPagar;
    }

    /**
     * Cria múltiplas contas a pagar parceladas
     */
    static async criarContasPagarParceladas(data: ContaPagarParceladaPayload) {
        const { fornecedorId, compraId, descricao, valorTotal, parcelas, dataPrimeiroVencimento, observacoes } = data;

        // Validações
        if (valorTotal <= 0) {
            throw new Error('Valor total deve ser maior que zero');
        }

        if (parcelas < 1) {
            throw new Error('Número de parcelas deve ser pelo menos 1');
        }

        // Calcular valor por parcela
        const valorParcela = valorTotal / parcelas;

        // Usar transação para garantir consistência
        const contasCriadas = await prisma.$transaction(async (tx) => {
            const contas: any[] = [];

            for (let i = 1; i <= parcelas; i++) {
                // Calcular data de vencimento
                const dataVencimento = new Date(dataPrimeiroVencimento);
                dataVencimento.setDate(dataVencimento.getDate() + ((i - 1) * 30));

                const conta = await tx.contaPagar.create({
                    data: {
                        fornecedorId,
                        compraId,
                        descricao: `${descricao} - Parcela ${i}/${parcelas}`,
                        valorParcela,
                        dataVencimento,
                        numeroParcela: i,
                        totalParcelas: parcelas,
                        observacoes,
                        status: ContaStatus.Pendente
                    }
                });

                contas.push(conta);
            }

            return contas;
        });

        return contasCriadas;
    }

    /**
     * Helper para converter string de data em Date local (sem problema de timezone)
     * Corrige o bug onde datas aparecem 1 dia antes devido ao timezone UTC
     */
    private static parseDataLocal(dataString: string): Date {
        // Se a string já tem hora, usar Date normal
        if (dataString.includes('T') || dataString.includes(' ')) {
            return new Date(dataString);
        }

        // Para strings no formato YYYY-MM-DD, criar data local
        const [ano, mes, dia] = dataString.split('-').map(Number);
        
        // Criar data local (sem conversão de timezone)
        // Mês é 0-indexed no JavaScript (0 = Janeiro)
        const data = new Date(ano, mes - 1, dia, 12, 0, 0, 0); // Meio-dia para evitar problemas de DST
        
        return data;
    }

    /**
     * Cria contas a pagar baseadas nas duplicatas (valores e datas exatos do XML)
     */
    static async criarContasPagarPorDuplicatas(data: ContaPagarPorDuplicataPayload) {
        const { fornecedorId, compraId, descricao, duplicatas, observacoes } = data;

        if (!duplicatas || duplicatas.length === 0) {
            throw new Error('Pelo menos uma duplicata é necessária para criar contas a pagar');
        }

        // Transação para garantir consistência
        const contasCriadas = await prisma.$transaction(async (tx) => {
            const contas: any[] = [];
            const totalParcelas = duplicatas.length;

            for (let i = 0; i < duplicatas.length; i++) {
                const dup = duplicatas[i];
                
                // ✅ CORRIGIDO: Usar parseDataLocal para evitar problema de timezone
                const dataVencimento = dup.dataVencimento
                    ? this.parseDataLocal(dup.dataVencimento)
                    : new Date();

                const conta = await tx.contaPagar.create({
                    data: {
                        fornecedorId,
                        compraId,
                        descricao: `${descricao} - Parcela ${dup.numero || i + 1}/${totalParcelas}`,
                        valorParcela: dup.valor,
                        dataVencimento,
                        numeroParcela: i + 1,
                        totalParcelas,
                        observacoes,
                        status: ContaStatus.Pendente
                    }
                });

                contas.push(conta);
            }

            return contas;
        });

        return contasCriadas;
    }

    private static async registrarDescontoFolhaRhAoPagar(conta: any) {
        if (conta.tipo !== 'RH') return;
        if (!conta.funcionarioId) return;
        if (!conta.subtipo || !['ADIANTAMENTO', 'VALE'].includes(conta.subtipo)) return;

        const dataBase = conta.dataPagamento ? new Date(conta.dataPagamento) : new Date();
        const refAno = conta.descontoFolhaReferenciaAno || parseAnoMesReferencia(dataBase).ano;
        const refMes = conta.descontoFolhaReferenciaMes || parseAnoMesReferencia(dataBase).mes;
        const descontoTipo = conta.descontoFolhaTipo || 'UMA_VEZ';
        const totalParcelas = descontoTipo === 'PARCELADO'
            ? Math.max(2, Number(conta.descontoFolhaParcelas || 2))
            : 1;

        await prisma.$transaction(async (tx) => {
            if (descontoTipo === 'UMA_VEZ') {
                await tx.lancamentoFolha.create({
                    data: {
                        funcionarioId: conta.funcionarioId,
                        referenciaAno: refAno,
                        referenciaMes: refMes,
                        categoria: LancamentoFolhaCategoria.ADIANTAMENTO,
                        valor: conta.valorParcela,
                        descricao: `${conta.subtipo === 'VALE' ? 'Vale' : 'Adiantamento'} - ${conta.descricao}`
                    }
                });
                return;
            }

            const valorParcela = Number((Number(conta.valorParcela) / totalParcelas).toFixed(2));
            const valorTotal = Number(conta.valorParcela);
            const saldoInicial = Number((valorTotal - valorParcela).toFixed(2));
            const proxima = avancarMes(refAno, refMes);

            const parcelamento = await tx.rhAdiantamentoParcelamento.create({
                data: {
                    funcionarioId: conta.funcionarioId,
                    contaPagarId: conta.id,
                    subtipo: conta.subtipo,
                    descricao: conta.descricao || null,
                    valorTotal,
                    valorParcela,
                    saldoRestante: saldoInicial > 0 ? saldoInicial : 0,
                    parcelasTotal: totalParcelas,
                    parcelasAplicadas: 1,
                    referenciaAnoInicio: refAno,
                    referenciaMesInicio: refMes,
                    proximaReferenciaAno: proxima.ano,
                    proximaReferenciaMes: proxima.mes,
                    status: totalParcelas > 1 ? 'ATIVO' : 'QUITADO',
                }
            });

            await tx.lancamentoFolha.create({
                data: {
                    funcionarioId: conta.funcionarioId,
                    referenciaAno: refAno,
                    referenciaMes: refMes,
                    categoria: LancamentoFolhaCategoria.ADIANTAMENTO,
                    valor: valorParcela,
                    descricao: `${conta.subtipo === 'VALE' ? 'Vale' : 'Adiantamento'} (1/${totalParcelas}) - ${conta.descricao}`,
                    rhParcelamentoId: parcelamento.id,
                    rhParcelaNumero: 1,
                }
            });

            await tx.contaPagar.update({
                where: { id: conta.id },
                data: { rhParcelamentoId: parcelamento.id }
            });
        });
    }

    static async aplicarParcelamentosRhCompetencia(referenciaAno: number, referenciaMes: number) {
        const parcelamentos = await prisma.rhAdiantamentoParcelamento.findMany({
            where: {
                status: 'ATIVO',
                OR: [
                    { proximaReferenciaAno: { lt: referenciaAno } },
                    { proximaReferenciaAno: referenciaAno, proximaReferenciaMes: { lte: referenciaMes } }
                ]
            },
            orderBy: [{ proximaReferenciaAno: 'asc' }, { proximaReferenciaMes: 'asc' }]
        });

        for (const parcelamento of parcelamentos) {
            await prisma.$transaction(async (tx) => {
                const atual = await tx.rhAdiantamentoParcelamento.findUnique({
                    where: { id: parcelamento.id }
                });
                if (!atual || atual.status !== 'ATIVO') return;
                if (
                    atual.proximaReferenciaAno > referenciaAno ||
                    (atual.proximaReferenciaAno === referenciaAno && atual.proximaReferenciaMes > referenciaMes)
                ) {
                    return;
                }

                const numeroParcela = atual.parcelasAplicadas + 1;
                const valorParcela = numeroParcela >= atual.parcelasTotal
                    ? Number(atual.saldoRestante)
                    : Number(atual.valorParcela);

                const jaExiste = await tx.lancamentoFolha.findFirst({
                    where: {
                        rhParcelamentoId: atual.id,
                        rhParcelaNumero: numeroParcela,
                    }
                });
                if (!jaExiste) {
                    await tx.lancamentoFolha.create({
                        data: {
                            funcionarioId: atual.funcionarioId,
                            referenciaAno,
                            referenciaMes,
                            categoria: LancamentoFolhaCategoria.ADIANTAMENTO,
                            valor: valorParcela,
                            descricao: `${atual.subtipo === 'VALE' ? 'Vale' : 'Adiantamento'} (${numeroParcela}/${atual.parcelasTotal})${atual.descricao ? ` - ${atual.descricao}` : ''}`,
                            rhParcelamentoId: atual.id,
                            rhParcelaNumero: numeroParcela
                        }
                    });
                }

                const saldoRestante = Math.max(0, Number((Number(atual.saldoRestante) - valorParcela).toFixed(2)));
                const parcelasAplicadas = numeroParcela;
                const quitado = parcelasAplicadas >= atual.parcelasTotal || saldoRestante <= 0;
                const prox = avancarMes(referenciaAno, referenciaMes);

                await tx.rhAdiantamentoParcelamento.update({
                    where: { id: atual.id },
                    data: {
                        saldoRestante,
                        parcelasAplicadas,
                        status: quitado ? 'QUITADO' : 'ATIVO',
                        proximaReferenciaAno: quitado ? atual.proximaReferenciaAno : prox.ano,
                        proximaReferenciaMes: quitado ? atual.proximaReferenciaMes : prox.mes,
                    }
                });
            });
        }
    }

    /**
     * Marca uma conta a pagar como paga
     * @param id ID da conta a pagar
     * @param dataPagamento Data do pagamento (opcional, default: hoje)
     * @param valorPago Valor pago (opcional, default: valor da parcela)
     * @param observacoes Observações sobre o pagamento
     * @param meioPagamento Meio de pagamento (PIX, Boleto, Cartão, etc.)
     */
    static async pagarConta(
        id: string, 
        dataPagamento?: string | Date,
        valorPago?: number,
        observacoes?: string,
        meioPagamento?: string
    ) {
        const conta = await prisma.contaPagar.findUnique({
            where: { id }
        });

        if (!conta) {
            throw new Error('Conta a pagar não encontrada');
        }

        if (conta.status === ContaStatus.Pago) {
            throw new Error('Conta já está paga');
        }

        // ✅ CORRIGIDO: Usar data fornecida pelo usuário ou data atual
        // Parsear data corretamente para evitar problema de timezone
        let dataPagamentoFinal: Date;
        
        if (dataPagamento) {
            if (typeof dataPagamento === 'string') {
                // Se for string no formato YYYY-MM-DD, parsear localmente
                if (dataPagamento.includes('-') && !dataPagamento.includes('T')) {
                    const [ano, mes, dia] = dataPagamento.split('-').map(Number);
                    dataPagamentoFinal = new Date(ano, mes - 1, dia, 12, 0, 0, 0);
                } else {
                    dataPagamentoFinal = new Date(dataPagamento);
                }
            } else {
                dataPagamentoFinal = dataPagamento;
            }
        } else {
            // Se não informou data, usar data atual
            dataPagamentoFinal = new Date();
        }

        // Permitir pagamento com desconto (ex.: funcionário – faltas): persistir valorJuros/valorDesconto
        let valorJurosUpdate: number | undefined;
        let valorDescontoUpdate: number | undefined;
        if (valorPago != null && typeof valorPago === 'number') {
            if (valorPago < conta.valorParcela) {
                valorDescontoUpdate = conta.valorParcela - valorPago;
            } else if (valorPago > conta.valorParcela) {
                valorJurosUpdate = valorPago - conta.valorParcela;
            }
        }

        const contaAtualizada = await prisma.contaPagar.update({
            where: { id },
            data: {
                status: ContaStatus.Pago,
                dataPagamento: dataPagamentoFinal,
                dataAgendamento: null as any, // Limpar agendamento quando pago
                observacoes: observacoes ?? conta.observacoes ?? undefined,
                meioPagamento: meioPagamento ?? undefined,
                ...(valorJurosUpdate !== undefined && { valorJuros: valorJurosUpdate }),
                ...(valorDescontoUpdate !== undefined && { valorDesconto: valorDescontoUpdate }),
                updatedAt: new Date()
            } as any,
            include: {
                fornecedor: true
            }
        });

        try {
            await this.registrarDescontoFolhaRhAoPagar(contaAtualizada);
        } catch (rhErr) {
            console.error('Erro ao registrar desconto automático de RH:', rhErr);
        }
        // Notificar apenas role Financeiro/Faturamento
        try {
            const { criarNotificacao } = await import('./notificacoes.service');
            const usuarios = await prisma.user.findMany({
                where: {
                    active: true,
                    role: { equals: 'financeiro_faturamento', mode: 'insensitive' }
                },
                select: { id: true }
            });
            const titulo = 'Conta a pagar marcada como Paga';
            const mensagem = `Conta: ${contaAtualizada.descricao} • Valor: R$ ${contaAtualizada.valorParcela.toFixed(2)} • Data Pagamento: ${contaAtualizada.dataPagamento ? contaAtualizada.dataPagamento.toISOString().slice(0,10) : 'N/A'}`;
            for (const u of usuarios) {
                await criarNotificacao({
                    userId: u.id,
                    tipo: 'financeiro',
                    titulo,
                    mensagem,
                    metadata: { contaPagarId: contaAtualizada.id },
                    enviarEmail: true
                });
            }
        } catch (err) {
            console.error('Erro ao notificar sobre pagamento de conta a pagar:', err);
        }

        try {
            const { baixarBancoHorasAoPagarSalarioRh } = await import('./bancoHorasRh.service');
            await baixarBancoHorasAoPagarSalarioRh({
                id: contaAtualizada.id,
                funcionarioId: (contaAtualizada as { funcionarioId?: string | null }).funcionarioId ?? null,
                tipo: contaAtualizada.tipo,
                descricao: contaAtualizada.descricao,
                status: contaAtualizada.status,
            });
        } catch (bhErr) {
            console.error('Baixa banco de horas (RH) ao pagar salário:', bhErr);
        }

        return contaAtualizada;
    }

    /**
     * Agenda uma data de pagamento para uma conta a pagar
     */
    static async agendarPagamento(id: string, dataAgendamento: Date) {
        const conta = await prisma.contaPagar.findUnique({
            where: { id }
        });

        if (!conta) {
            throw new Error('Conta a pagar não encontrada');
        }

        if (conta.status === ContaStatus.Pago) {
            throw new Error('Não é possível agendar pagamento de uma conta já paga');
        }

        // Validar que a data de agendamento não seja no passado
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataAgendamentoLimpa = new Date(dataAgendamento);
        dataAgendamentoLimpa.setHours(0, 0, 0, 0);

        if (dataAgendamentoLimpa < hoje) {
            throw new Error('Data de agendamento não pode ser no passado');
        }

        const contaAtualizada = await prisma.contaPagar.update({
            where: { id },
            data: {
                dataAgendamento: dataAgendamento as any,
                updatedAt: new Date()
            } as any,
            include: {
                fornecedor: true
            }
        });

        return contaAtualizada;
    }

    /**
     * Remove o agendamento de pagamento de uma conta
     */
    static async removerAgendamento(id: string) {
        const conta = await prisma.contaPagar.findUnique({
            where: { id }
        });

        if (!conta) {
            throw new Error('Conta a pagar não encontrada');
        }

        const contaAtualizada = await prisma.contaPagar.update({
            where: { id },
            data: {
                dataAgendamento: null as any,
                updatedAt: new Date()
            } as any,
            include: {
                fornecedor: true
            }
        });

        return contaAtualizada;
    }

    /**
     * Lista contas a pagar com filtros
     * ✅ CORREÇÃO CRÍTICA: Aumentar limit padrão de 10 para 1000 para evitar perda de dados em auditoria
     */
    static async listarContasPagar(
        status?: string,
        fornecedorId?: string,
        tipo?: string,
        valorExato?: number,
        valorMin?: number,
        valorMax?: number,
        page: number = 1,
        limit: number = 1000
    ) {
        const skip = (page - 1) * limit;

        const where: any = {};

        if (status) {
            where.status = status;
        }

        if (fornecedorId) {
            where.fornecedorId = fornecedorId;
        }

        if (tipo) {
            where.tipo = tipo;
        }

        if (valorExato !== undefined && !Number.isNaN(valorExato)) {
            where.valorParcela = valorExato;
        } else if (
            (valorMin !== undefined && !Number.isNaN(valorMin)) ||
            (valorMax !== undefined && !Number.isNaN(valorMax))
        ) {
            where.valorParcela = {
                ...(valorMin !== undefined && !Number.isNaN(valorMin) ? { gte: valorMin } : {}),
                ...(valorMax !== undefined && !Number.isNaN(valorMax) ? { lte: valorMax } : {}),
            };
        }

        const [contas, total] = await Promise.all([
            prisma.contaPagar.findMany({
                where,
                skip,
                take: limit,
                orderBy: { dataVencimento: 'asc' },
            include: {
                fornecedor: true,
                funcionario: {
                    select: {
                        id: true,
                        nome: true,
                    },
                },
                compra: {
                    select: {
                        id: true,
                        numeroSequencial: true,
                        numeroNF: true
                    }
                } as any,
                despesaFixa: {
                    select: {
                        id: true,
                        descricao: true
                    }
                }
            } as any as any
            }),
            prisma.contaPagar.count({ where })
        ]);

        console.log(`📊 Contas a pagar listadas: ${contas.length} de ${total} total (página ${page}, limit ${limit})`);

        return {
            contas,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Busca uma conta a pagar específica
     */
    static async buscarContaPagar(id: string) {
        const conta = await prisma.contaPagar.findUnique({
            where: { id },
            include: {
                fornecedor: true,
                funcionario: {
                    select: {
                        id: true,
                        nome: true,
                    },
                },
                compra: {
                    select: {
                        id: true,
                        numeroSequencial: true,
                        numeroNF: true
                    }
                } as any,
                despesaFixa: {
                    select: {
                        id: true,
                        descricao: true
                    }
                }
            } as any
        });

        if (!conta) {
            throw new Error('Conta a pagar não encontrada');
        }

        return conta;
    }

    /**
     * Cancela uma conta a pagar
     */
    static async cancelarConta(id: string) {
        const conta = await prisma.contaPagar.findUnique({
            where: { id }
        });

        if (!conta) {
            throw new Error('Conta a pagar não encontrada');
        }

        if (conta.status === ContaStatus.Pago) {
            throw new Error('Não é possível cancelar uma conta já paga');
        }

        return await prisma.contaPagar.update({
            where: { id },
            data: {
                status: ContaStatus.Cancelado,
                updatedAt: new Date()
            }
        });
    }

    /**
     * Atualiza data de vencimento de uma conta
     */
    static async atualizarVencimento(id: string, novaData: Date) {
        const conta = await prisma.contaPagar.findUnique({
            where: { id }
        });

        if (!conta) {
            throw new Error('Conta a pagar não encontrada');
        }

        if (conta.status === ContaStatus.Pago) {
            throw new Error('Não é possível alterar vencimento de conta já paga');
        }

        return await prisma.contaPagar.update({
            where: { id },
            data: {
                dataVencimento: novaData,
                updatedAt: new Date()
            }
        });
    }

    static async atualizarConta(id: string, payload: AtualizarContaPagarPayload) {
        const conta = await prisma.contaPagar.findUnique({ where: { id } });
        if (!conta) throw new Error('Conta a pagar não encontrada');
        if (conta.status === ContaStatus.Pago) {
            throw new Error('Não é possível alterar uma conta já paga');
        }

        const {
            fornecedorId,
            credorNome,
            descricao,
            dataVencimento,
            observacoes,
            classificacao
        } = payload;

        if (fornecedorId && credorNome && credorNome.trim()) {
            throw new Error('Informe apenas fornecedorId ou credorNome (não ambos).');
        }

        const dataUpdate: any = {
            updatedAt: new Date()
        };

        if (descricao !== undefined) dataUpdate.descricao = descricao;
        if (dataVencimento !== undefined) dataUpdate.dataVencimento = dataVencimento;
        if (observacoes !== undefined) dataUpdate.observacoes = observacoes;
        if (classificacao !== undefined) dataUpdate.classificacao = classificacao;

        if (fornecedorId !== undefined) {
            dataUpdate.fornecedorId = fornecedorId;
            if (fornecedorId) {
                dataUpdate.credorNome = null;
                dataUpdate.origemCadastro = 'FORNECEDOR_CADASTRADO';
            }
        }

        if (credorNome !== undefined) {
            const nome = (credorNome ?? '').trim();
            dataUpdate.credorNome = nome || null;
            if (nome) {
                dataUpdate.fornecedorId = null;
                dataUpdate.origemCadastro = 'FORNECEDOR_NOVO';
            }
        }

        return await prisma.contaPagar.update({
            where: { id },
            data: dataUpdate,
            include: { fornecedor: true }
        });
    }

    /**
     * Busca contas em atraso
     */
    static async getContasEmAtraso() {
        const hoje = new Date();

        return await prisma.contaPagar.findMany({
            where: {
                status: ContaStatus.Pendente,
                dataVencimento: {
                    lt: hoje
                }
            },
            orderBy: { dataVencimento: 'asc' },
            include: {
                fornecedor: true,
                compra: {
                    select: {
                        id: true,
                        numeroSequencial: true,
                        numeroNF: true
                    }
                } as any
            } as any
        });
    }

    /**
     * Busca contas a vencer nos próximos N dias
     */
    static async getContasAVencer(dias: number = 7) {
        const hoje = new Date();
        const dataLimite = new Date();
        dataLimite.setDate(hoje.getDate() + dias);

        return await prisma.contaPagar.findMany({
            where: {
                status: ContaStatus.Pendente,
                dataVencimento: {
                    gte: hoje,
                    lte: dataLimite
                }
            },
            orderBy: { dataVencimento: 'asc' },
            include: {
                fornecedor: true,
                compra: {
                    select: {
                        id: true,
                        numeroSequencial: true,
                        numeroNF: true
                    }
                } as any
            } as any
        });
    }

    /**
     * Listar contas por tipo (FORNECEDOR, RH, DESPESA_FIXA)
     */
    static async listarPorTipo(tipo: string) {
        return await prisma.contaPagar.findMany({
            where: { tipo },
            orderBy: { dataVencimento: 'asc' },
            include: {
                fornecedor: true,
                compra: {
                    select: {
                        id: true,
                        numeroSequencial: true,
                        numeroNF: true
                    }
                } as any
            } as any
        });
    }

    /**
     * Retorna o último dia do mês para um ano/mês
     */
    static ultimoDiaDoMes(ano: number, mes: number): number {
        return new Date(ano, mes, 0).getDate();
    }

    /**
     * Recalcula o total da folha (ponto + benefícios + lançamentos) e atualiza a parcela RH **Pendente** do mês, se existir.
     * Usado após acréscimos/descontos no modal da folha.
     */
    static async sincronizarValorParcelaRHPelaFolha(
        funcionarioId: string,
        referenciaAno: number,
        referenciaMes: number
    ): Promise<
        | { ok: false; erro: 'folha_indisponivel' }
        | {
              ok: true;
              valorFolha: number;
              atualizado: boolean;
              motivo: 'atualizado' | 'sem_conta' | 'conta_nao_pendente';
              contaId?: string;
          }
    > {
        const mesReferencia = `${referenciaAno}-${String(referenciaMes).padStart(2, '0')}`;
        const dataRefFolha = new Date(Date.UTC(referenciaAno, referenciaMes - 1, 1, 12, 0, 0, 0));
        let valorFolha: number;
        try {
            const folha = await RhService.calcularFolhaMes({
                funcionarioId,
                dataReferencia: dataRefFolha,
            });
            valorFolha = Number(folha.valores.totalAPagar ?? 0);
        } catch {
            return { ok: false, erro: 'folha_indisponivel' };
        }

        const conta = await prisma.contaPagar.findFirst({
            where: {
                tipo: 'RH',
                funcionarioId,
                descricao: { contains: mesReferencia },
            },
        });
        if (!conta) {
            return { ok: true, valorFolha, atualizado: false, motivo: 'sem_conta' };
        }
        if (conta.status !== 'Pendente') {
            return {
                ok: true,
                valorFolha,
                atualizado: false,
                motivo: 'conta_nao_pendente',
                contaId: conta.id,
            };
        }
        const upd = await prisma.contaPagar.update({
            where: { id: conta.id },
            data: { valorParcela: valorFolha },
        });
        return {
            ok: true,
            valorFolha,
            atualizado: true,
            motivo: 'atualizado',
            contaId: upd.id,
        };
    }

    /**
     * Gerar contas de salários (RH) para o mês - usa diaPagamento de cada funcionário.
     * Valor = totalAPagar da folha (autônomo: diárias/horas conforme regra; + benefícios; + acréscimos − descontos).
     * Se já existir conta **Pendente** para o mês, apenas atualiza o valor (ex.: após lançamentos na folha).
     */
    static async gerarContasSalarios(mesReferencia: string) {
        // Buscar funcionários ativos
        const funcionarios = await prisma.funcionario.findMany({
            where: { status: 'Ativo' }
        });

        const [ano, mes] = mesReferencia.split('-').map(Number);
        await this.aplicarParcelamentosRhCompetencia(ano, mes);
        const ultimoDia = this.ultimoDiaDoMes(ano, mes - 1);

        const contasCriadas: any[] = [];
        const contasAtualizadas: any[] = [];
        for (const func of funcionarios) {
            // Dia de vencimento: usar diaPagamento do funcionário (1-31), padrão 5
            let dia = func.diaPagamento != null ? Math.min(func.diaPagamento, 31) : 5;
            if (dia < 1) dia = 1;
            if (dia > ultimoDia) dia = ultimoDia;
            const dataVencimento = new Date(ano, mes - 1, dia);

            const dataRefFolha = new Date(Date.UTC(ano, mes - 1, 1, 12, 0, 0, 0));
            let valorFolha: number;
            try {
                const folha = await RhService.calcularFolhaMes({
                    funcionarioId: func.id,
                    dataReferencia: dataRefFolha,
                });
                valorFolha = Number(folha.valores.totalAPagar ?? 0);
            } catch {
                valorFolha = Number(func.salario ?? 0);
            }

            // Verificar se já existe conta para este funcionário neste mês
            const contaExistente = await prisma.contaPagar.findFirst({
                where: {
                    tipo: 'RH',
                    funcionarioId: func.id,
                    descricao: { contains: mesReferencia }
                }
            });

            if (contaExistente) {
                if (contaExistente.status === 'Pendente') {
                    const atualizada = await prisma.contaPagar.update({
                        where: { id: contaExistente.id },
                        data: { valorParcela: valorFolha },
                    });
                    contasAtualizadas.push(atualizada);
                }
                continue;
            }

            const conta = await prisma.contaPagar.create({
                data: {
                    tipo: 'RH',
                    funcionarioId: func.id,
                    descricao: `Salário ${func.nome} - ${mesReferencia} (folha)`,
                    valorParcela: valorFolha,
                    dataVencimento,
                    status: 'Pendente'
                }
            });
            contasCriadas.push(conta);
        }

        return { criadas: contasCriadas, atualizadas: contasAtualizadas };
    }

    /**
     * Gerar contas de despesas fixas para o mês
     */
    static async gerarContasDespesasFixas(mesReferencia: string) {
        // Buscar despesas fixas ativas
        const despesas = await prisma.despesaFixa.findMany({
            where: { ativa: true }
        });

        const [ano, mes] = mesReferencia.split('-').map(Number);
        
        const contasCriadas: any[] = [];
        for (const desp of despesas) {
            // Criar data de vencimento baseada no dia configurado
            const dataVencimento = new Date(ano, mes - 1, desp.diaVencimento);

            // Verificar se já existe conta para esta despesa neste mês
            const contaExistente = await prisma.contaPagar.findFirst({
                where: {
                    tipo: 'DESPESA_FIXA',
                    despesaFixaId: desp.id,
                    descricao: { contains: mesReferencia }
                }
            });

            if (!contaExistente) {
                const conta = await prisma.contaPagar.create({
                    data: {
                        tipo: 'DESPESA_FIXA',
                        despesaFixaId: desp.id,
                        descricao: `${desp.descricao} - ${mesReferencia}`,
                        valorParcela: Number(desp.valor),
                        dataVencimento,
                        status: 'Pendente',
                        observacoes: desp.fornecedor ? `Fornecedor: ${desp.fornecedor}` : undefined
                    }
                });
                contasCriadas.push(conta);
            }
        }

        return contasCriadas;
    }

    /**
     * Exclui uma parcela de conta a pagar
     * Só permite excluir se:
     * - A parcela estiver paga (status = 'Pago')
     * - E a origem (compra ou despesa fixa) tiver sido excluída
     */
    static async excluirParcela(id: string) {
        const conta = await prisma.contaPagar.findUnique({
            where: { id }
        });

        if (!conta) {
            throw new Error('Conta a pagar não encontrada');
        }

        // Verificar se a parcela está paga
        if (conta.status !== 'Pago') {
            throw new Error('Só é possível excluir parcelas que já foram pagas');
        }

        // Verificar se a origem foi excluída
        if (conta.compraId) {
            // Verificar se a compra ainda existe
            const compra = await prisma.compra.findUnique({
                where: { id: conta.compraId }
            });
            
            if (compra) {
                throw new Error('Não é possível excluir a parcela: a compra que gerou esta parcela ainda existe');
            }
        } else if (conta.despesaFixaId) {
            // Verificar se a despesa fixa ainda existe
            const despesaFixa = await prisma.despesaFixa.findUnique({
                where: { id: conta.despesaFixaId }
            });
            
            if (despesaFixa) {
                throw new Error('Não é possível excluir a parcela: a despesa fixa que gerou esta parcela ainda existe');
            }
        }
        // Se não tem nem compraId nem despesaFixaId, é uma conta manual e pode excluir se estiver paga

        // Excluir a parcela
        await prisma.contaPagar.delete({
            where: { id }
        });

        return { message: 'Parcela excluída com sucesso' };
    }
}

