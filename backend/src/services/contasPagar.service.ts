import { PrismaClient } from '@prisma/client';
import { ContaStatus } from '../types/index';

const prisma = new PrismaClient();

export interface ContaPagarPayload {
    fornecedorId?: string;
    compraId?: string;
    descricao: string;
    valorParcela: number;
    dataVencimento: Date;
    numeroParcela?: number;
    totalParcelas?: number;
    observacoes?: string;
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
        const { fornecedorId, compraId, descricao, valorParcela, dataVencimento, numeroParcela, totalParcelas, observacoes } = data;

        // Validações
        if (valorParcela <= 0) {
            throw new Error('Valor da parcela deve ser maior que zero');
        }

        // Criar conta a pagar
        const contaPagar = await prisma.contaPagar.create({
            data: {
                fornecedorId,
                compraId,
                descricao,
                valorParcela,
                dataVencimento,
                numeroParcela,
                totalParcelas,
                observacoes,
                status: ContaStatus.Pendente
            },
            include: {
                fornecedor: true
            }
        });

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
            const contas = [];

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
     * Cria contas a pagar baseadas nas duplicatas (valores e datas exatos do XML)
     */
    static async criarContasPagarPorDuplicatas(data: ContaPagarPorDuplicataPayload) {
        const { fornecedorId, compraId, descricao, duplicatas, observacoes } = data;

        if (!duplicatas || duplicatas.length === 0) {
            throw new Error('Pelo menos uma duplicata é necessária para criar contas a pagar');
        }

        // Transação para garantir consistência
        const contasCriadas = await prisma.$transaction(async (tx) => {
            const contas = [];
            const totalParcelas = duplicatas.length;

            for (let i = 0; i < duplicatas.length; i++) {
                const dup = duplicatas[i];
                const dataVencimento = dup.dataVencimento
                    ? new Date(dup.dataVencimento)
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

    /**
     * Marca uma conta a pagar como paga
     */
    static async pagarConta(id: string) {
        const conta = await prisma.contaPagar.findUnique({
            where: { id }
        });

        if (!conta) {
            throw new Error('Conta a pagar não encontrada');
        }

        if (conta.status === ContaStatus.Pago) {
            throw new Error('Conta já está paga');
        }

        const contaAtualizada = await prisma.contaPagar.update({
            where: { id },
            data: {
                status: ContaStatus.Pago,
                dataPagamento: new Date(),
                dataAgendamento: null, // Limpar agendamento quando pago
                updatedAt: new Date()
            },
            include: {
                fornecedor: true
            }
        });

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
                dataAgendamento,
                updatedAt: new Date()
            },
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
                dataAgendamento: null,
                updatedAt: new Date()
            },
            include: {
                fornecedor: true
            }
        });

        return contaAtualizada;
    }

    /**
     * Lista contas a pagar com filtros
     */
    static async listarContasPagar(
        status?: string,
        fornecedorId?: string,
        page: number = 1,
        limit: number = 10
    ) {
        const skip = (page - 1) * limit;

        const where: any = {};

        if (status) {
            where.status = status;
        }

        if (fornecedorId) {
            where.fornecedorId = fornecedorId;
        }

        const [contas, total] = await Promise.all([
            prisma.contaPagar.findMany({
                where,
                skip,
                take: limit,
                orderBy: { dataVencimento: 'asc' },
                include: {
                    fornecedor: true,
                    compra: {
                        select: {
                            id: true,
                            numeroSequencial: true,
                            numeroNF: true
                        }
                    }
                }
            }),
            prisma.contaPagar.count({ where })
        ]);

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
                compra: {
                    select: {
                        id: true,
                        numeroSequencial: true,
                        numeroNF: true
                    }
                }
            }
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
                }
            }
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
                }
            }
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
                }
            }
        });
    }

    /**
     * Gerar contas de salários (RH) para o mês
     */
    static async gerarContasSalarios(mesReferencia: string) {
        // Buscar funcionários ativos
        const funcionarios = await prisma.funcionario.findMany({
            where: { status: 'Ativo' }
        });

        const [ano, mes] = mesReferencia.split('-').map(Number);
        const dataVencimento = new Date(ano, mes - 1, 5); // Vencimento dia 5 do mês

        const contasCriadas = [];
        for (const func of funcionarios) {
            // Verificar se já existe conta para este funcionário neste mês
            const contaExistente = await prisma.contaPagar.findFirst({
                where: {
                    tipo: 'RH',
                    funcionarioId: func.id,
                    descricao: { contains: mesReferencia }
                }
            });

            if (!contaExistente) {
                const conta = await prisma.contaPagar.create({
                    data: {
                        tipo: 'RH',
                        funcionarioId: func.id,
                        descricao: `Salário ${func.nome} - ${mesReferencia}`,
                        valorParcela: Number(func.salario),
                        dataVencimento,
                        status: 'Pendente'
                    }
                });
                contasCriadas.push(conta);
            }
        }

        return contasCriadas;
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
        
        const contasCriadas = [];
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
}

