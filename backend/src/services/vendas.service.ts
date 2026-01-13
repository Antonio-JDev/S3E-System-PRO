import { PrismaClient } from '@prisma/client';
import { ContaStatus, VendaStatus } from '../types/index';
import { EstoqueService } from './estoque.service';

const prisma = new PrismaClient();

export interface VendaPayload {
    orcamentoId: string; // ID do orçamento aprovado
    clienteId: string;
    projetoId?: string;
    valorTotal: number;
    formaPagamento: string;
    parcelas?: number;
    valorEntrada?: number;
    observacoes?: string;
}

interface PagarContaPayload {
    dataPagamento?: string;
    valorRecebido?: number;
    observacoes?: string;
}

// Validações específicas por forma de pagamento
const validarFormaPagamento = (formaPagamento: string, parcelas: number) => {
    switch (formaPagamento) {
        case 'À vista':
            if (parcelas !== 1) {
                throw new Error('Vendas à vista devem ter exatamente 1 parcela');
            }
            break;
        // Demais regras podem ser evoluídas depois, mantemos comportamento atual
        default:
            break;
    }
};

export class VendasService {
    /**
     * Realiza uma venda completa, criando a venda principal e suas contas a receber
     */
    static async realizarVenda(data: VendaPayload) {
        const { orcamentoId, clienteId, projetoId, valorTotal, formaPagamento, parcelas = 1, valorEntrada = 0, observacoes } = data;

        // Validar dados básicos
        if (valorTotal <= 0) {
            throw new Error('Valor total deve ser maior que zero');
        }

        if (parcelas < 1) {
            throw new Error('Número de parcelas deve ser pelo menos 1');
        }

        if (valorEntrada >= valorTotal) {
            throw new Error('Valor de entrada deve ser menor que o valor total');
        }

        // Validação de forma de pagamento x parcelas
        validarFormaPagamento(formaPagamento, parcelas);

        // Calcular valor das parcelas
        const valorRestante = valorTotal - valorEntrada;
        const valorParcela = valorRestante / parcelas;

        // Gerar número único da venda
        const numeroVenda = `VND-${Date.now()}`;

        // Usar transação para garantir consistência
        return await prisma.$transaction(async (tx) => {
            // 0. Verificar se já existe venda para este orçamento
            const vendaExistente = await tx.venda.findUnique({
                where: { orcamentoId }
            });

            if (vendaExistente) {
                throw new Error(`Já existe uma venda registrada para este orçamento (Venda #${vendaExistente.numeroVenda}). Não é possível criar venda duplicada.`);
            }

            // 1. Buscar orçamento e projeto vinculado
            const orcamento = await tx.orcamento.findUnique({
                where: { id: orcamentoId },
                include: { projeto: true }
            });

            if (!orcamento) {
                throw new Error('Orçamento não encontrado');
            }

            let projetoIdFinal = projetoId;

            // Se o orçamento já tem um projeto vinculado, usar ele e atualizar status
            if (orcamento.projeto) {
                console.log(`📋 Atualizando status do projeto ${orcamento.projeto.id} para APROVADO`);
                await tx.projeto.update({
                    where: { id: orcamento.projeto.id },
                    data: { 
                        status: 'APROVADO'
                    }
                });
                projetoIdFinal = orcamento.projeto.id;
            } 
            // Se não tem projeto mas foi passado projetoId, atualizar esse projeto
            else if (projetoId) {
                console.log(`📋 Atualizando projeto fornecido ${projetoId} para APROVADO`);
                await tx.projeto.update({
                    where: { id: projetoId },
                    data: { 
                        status: 'APROVADO'
                    }
                });
            }
            // Se não tem projeto, criar um novo com status APROVADO
            else {
                console.log(`📋 Criando novo projeto para o orçamento ${orcamentoId}`);
                const novoProjeto = await tx.projeto.create({
                    data: {
                        orcamentoId: orcamento.id,
                        clienteId: orcamento.clienteId,
                        titulo: orcamento.titulo,
                        descricao: orcamento.descricao,
                        valorTotal: orcamento.precoVenda,
                        dataInicio: new Date(),
                        status: 'APROVADO' // Projeto aprovado quando venda é criada
                    }
                });
                projetoIdFinal = novoProjeto.id;
            }

            // Atualizar status do orçamento para Aprovado
            await tx.orcamento.update({
                where: { id: orcamentoId },
                data: { 
                    status: 'Aprovado',
                    aprovedAt: new Date()
                }
            });

            // 2. Criar a venda principal
            const venda = await tx.venda.create({
                data: {
                    numeroVenda,
                    orcamentoId,
                    valorTotal,
                    clienteId,
                    projetoId: projetoIdFinal,
                    formaPagamento,
                    parcelas,
                    valorEntrada,
                    observacoes,
                    // A venda começa como Pendente e será marcada como Concluida
                    // quando TODAS as parcelas (contas a receber) forem pagas
                    status: VendaStatus.Pendente
                }
            });

            // 3. Gerar contas a receber (entrada separada + parcelas)
            const contasReceber: any[] = [];

            // Se houver entrada, criar uma conta a receber separada para a entrada
            if (valorEntrada > 0) {
                const contaEntrada = await tx.contaReceber.create({
                    data: {
                        vendaId: venda.id,
                        descricao: `Entrada - Venda ${numeroVenda}`,
                        valorParcela: valorEntrada,
                        dataVencimento: new Date(), // Entrada vence na data da venda
                        numeroParcela: 0, // Número especial para entrada
                        totalParcelas: parcelas,
                        status: ContaStatus.Pendente // Inicialmente pendente, pode ser marcada como paga
                    }
                });

                contasReceber.push(contaEntrada);
            }

            // Criar as parcelas do valor financiado (sem incluir entrada)
            for (let i = 1; i <= parcelas; i++) {
                // Calcular data de vencimento (30 dias após a venda para cada parcela)
                const dataVencimento = new Date();
                dataVencimento.setDate(dataVencimento.getDate() + (i * 30));

                const contaReceber = await tx.contaReceber.create({
                    data: {
                        vendaId: venda.id,
                        descricao: `Parcela ${i}/${parcelas} - Venda ${numeroVenda}`,
                        valorParcela: valorParcela, // Apenas o valor da parcela (sem entrada)
                        dataVencimento,
                        numeroParcela: i,
                        totalParcelas: parcelas,
                        status: ContaStatus.Pendente
                    }
                });

                contasReceber.push(contaReceber);
            }

            // 4. Processar baixa de estoque baseado no orçamento
            let baixaEstoque: any = null;
            try {
                baixaEstoque = await EstoqueService.processarBaixaOrcamento(
                    orcamentoId,
                    venda.id
                );
            } catch (error) {
                // Se houver erro de estoque, reverter tudo
                throw new Error(
                    `Erro ao processar estoque: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
                );
            }

            return {
                venda,
                contasReceber,
                baixaEstoque
            };
        });
    }

    /**
     * Verifica disponibilidade de estoque para um orçamento antes de vender
     */
    static async verificarEstoqueOrcamento(orcamentoId: string) {
        return await EstoqueService.verificarDisponibilidadeOrcamento(orcamentoId);
    }

    /**
     * Busca dados para o dashboard financeiro
     */
    static async getVendasDashboard() {
        // Vendas realizadas este mês
        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);

        const vendasDoMes = await prisma.venda.findMany({
            where: {
                dataVenda: {
                    gte: inicioMes
                },
                status: VendaStatus.Concluida
            },
            include: {
                cliente: true,
                projeto: true,
                contasReceber: true
            }
        });

        // Calcular totais
        const totalVendas = vendasDoMes.length;
        const valorTotalVendas = vendasDoMes.reduce((sum, venda) => sum + venda.valorTotal, 0);

        // Contas a receber
        const contasAReceber = await prisma.contaReceber.findMany({
            where: {
                status: 'Pendente'
            },
            include: {
                venda: {
                    include: {
                        cliente: true,
                        projeto: true
                    }
                }
            }
        });

        const valorAReceber = contasAReceber.reduce((sum, conta) => sum + conta.valorParcela, 0);

        // Contas em atraso
        const hoje = new Date();
        const contasEmAtraso = contasAReceber.filter(conta =>
            conta.dataVencimento < hoje && conta.status === 'Pendente'
        );

        const valorEmAtraso = contasEmAtraso.reduce((sum, conta) => sum + conta.valorParcela, 0);

        return {
            vendasDoMes: {
                total: totalVendas,
                valorTotal: valorTotalVendas,
                vendas: vendasDoMes
            },
            contasAReceber: {
                total: contasAReceber.length,
                valorTotal: valorAReceber,
                emAtraso: {
                    total: contasEmAtraso.length,
                    valorTotal: valorEmAtraso
                }
            }
        };
    }

    /**
     * Lista todas as vendas com paginação
     */
    static async listarVendas(page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;

        const [vendas, total] = await Promise.all([
            prisma.venda.findMany({
                skip,
                take: limit,
                orderBy: { dataVenda: 'desc' },
                include: {
                    cliente: true,
                    projeto: true,
                    contasReceber: true,
                    orcamento: {
                        include: {
                            items: {
                                include: {
                                    material: {
                                        select: {
                                            id: true,
                                            nome: true,
                                            sku: true,
                                            ncm: true
                                        }
                                    },
                                    cotacao: {
                                        select: {
                                            id: true,
                                            nome: true,
                                            ncm: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }),
            prisma.venda.count()
        ]);

        return {
            vendas,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Busca uma venda específica
     */
    static async buscarVenda(id: string) {
        return await prisma.venda.findUnique({
            where: { id },
            include: {
                cliente: true,
                projeto: true,
                contasReceber: true,
                orcamento: {
                    include: {
                        items: {
                            include: {
                                material: {
                                    select: {
                                        id: true,
                                        nome: true,
                                        sku: true,
                                        ncm: true
                                    }
                                },
                                cotacao: {
                                    select: {
                                        id: true,
                                        nome: true,
                                        ncm: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Cancela uma venda
     */
    static async cancelarVenda(id: string) {
        return await prisma.venda.update({
            where: { id },
            data: {
                status: VendaStatus.Cancelada,
                updatedAt: new Date()
            }
        });
    }

    /**
     * Marca uma conta a receber como paga e atualiza o status da venda
     * - Quando todas as parcelas forem pagas, a venda é marcada como "Concluida"
     */
    static async pagarConta(id: string, payload?: PagarContaPayload) {
        const conta = await prisma.contaReceber.findUnique({
            where: { id }
        });

        if (!conta) {
            throw new Error('Conta a receber não encontrada');
        }

        if (conta.status === ContaStatus.Pago) {
            throw new Error('Esta parcela já está marcada como paga');
        }

        const dataPagamento = payload?.dataPagamento
            ? new Date(payload.dataPagamento)
            : new Date();

        // Atualizar a conta como paga
        const contaAtualizada = await prisma.contaReceber.update({
            where: { id },
            data: {
                status: ContaStatus.Pago,
                dataPagamento,
                observacoes: payload?.observacoes ?? conta.observacoes,
                updatedAt: new Date()
            }
        });

        // Verificar todas as parcelas da mesma venda
        const contasDaVenda = await prisma.contaReceber.findMany({
            where: { vendaId: conta.vendaId }
        });

        const todasPagas = contasDaVenda.every(c => c.status === ContaStatus.Pago);

        if (todasPagas) {
            // Atualizar status da venda para Concluida
            await prisma.venda.update({
                where: { id: conta.vendaId },
                data: {
                    status: VendaStatus.Concluida,
                    updatedAt: new Date()
                }
            });
        }

        return contaAtualizada;
    }
}
