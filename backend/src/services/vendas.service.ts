import { prisma } from '../lib/prisma';
import { ContaStatus, VendaStatus } from '../types/index';
import { EstoqueService } from './estoque.service';
import { parseMoney, validarValoresFinanceiros } from '../utils/financeiroValor.util';
import {
  ORCAMENTO_STATUS_APROVADO,
  ORCAMENTO_STATUS_CONCRETIZADO,
  podeGerarPedidoVendaParaOrcamento
} from '../utils/orcamentoStatus.util';

export interface VendaPayload {
    orcamentoId: string; // ID do orçamento (deve estar com status Aprovado)
    clienteId: string;
    projetoId?: string;
    valorTotal: number;
    formaPagamento: string;
    parcelas?: number;
    valorEntrada?: number;
    /** Valores por parcela (opcional). Se length === parcelas, usa esses valores; última parcela pode ser o restante. */
    valoresParcelas?: number[];
    /** Data da primeira parcela / data única para boleto integral (YYYY-MM-DD) */
    dataVencimentoPrimeiraParcela?: string;
    /** Datas de vencimento de cada parcela (boleto parcelado); length deve ser igual a parcelas */
    datasParcelas?: string[];
    observacoes?: string;
}

interface PagarContaPayload {
    dataPagamento?: string;
    /** Valor base recebido (sem juros/desconto) */
    valorRecebido?: number;
    valorJuros?: number;
    valorDesconto?: number;
    observacoes?: string;
    meioPagamento?: string; // PIX, Boleto, Cartão, etc.
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
     * Garante que orçamento com PV fique em Concretizado (reconciliação pós-commit).
     */
    static async ensureOrcamentoConcretizadoAposPedidoVenda(orcamentoId: string): Promise<string> {
        const venda = await prisma.venda.findUnique({
            where: { orcamentoId },
            select: { id: true }
        });
        if (!venda) {
            return ORCAMENTO_STATUS_APROVADO;
        }

        const orc = await prisma.orcamento.findUnique({
            where: { id: orcamentoId },
            select: { status: true, aprovedAt: true }
        });
        if (!orc) {
            throw new Error('Orçamento não encontrado após gerar pedido de venda');
        }

        if (orc.status !== ORCAMENTO_STATUS_CONCRETIZADO) {
            await prisma.orcamento.update({
                where: { id: orcamentoId },
                data: {
                    status: ORCAMENTO_STATUS_CONCRETIZADO,
                    aprovedAt: orc.aprovedAt ?? new Date()
                }
            });
            return ORCAMENTO_STATUS_CONCRETIZADO;
        }

        return orc.status;
    }

    /**
     * Realiza uma venda completa, criando a venda principal e suas contas a receber
     */
    static async realizarVenda(data: VendaPayload) {
        const { orcamentoId, clienteId, projetoId, valorTotal, formaPagamento, parcelas = 1, valorEntrada = 0, valoresParcelas, dataVencimentoPrimeiraParcela, datasParcelas, observacoes } = data;

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

        // Valores por parcela: serão recalculados na transação com valorParaContasReceber quando houver itens "venda direta"
        const valorRestanteInicial = valorTotal - valorEntrada;
        let valoresPorParcela: number[];
        if (Array.isArray(valoresParcelas) && valoresParcelas.length === parcelas) {
            const soma = valoresParcelas.reduce((a, b) => a + (Number(b) || 0), 0);
            const diff = Math.round((valorRestanteInicial - soma) * 100) / 100;
            if (Math.abs(diff) > 0.01) {
                valoresPorParcela = valoresParcelas.slice(0, parcelas - 1).map(v => Math.round((Number(v) || 0) * 100) / 100);
                valoresPorParcela.push(Math.round((valorRestanteInicial - valoresPorParcela.reduce((a, b) => a + b, 0)) * 100) / 100);
            } else {
                valoresPorParcela = valoresParcelas.map(v => Math.round((Number(v) || 0) * 100) / 100);
            }
        } else {
            const valorParcela = Math.round((valorRestanteInicial / parcelas) * 100) / 100;
            valoresPorParcela = Array(parcelas).fill(valorParcela);
        }

        // Gerar número único da venda
        const numeroVenda = `VND-${Date.now()}`;

        // Transação só para venda + contas a receber. A baixa de estoque roda depois do commit:
        // ficar dentro do callback faz o Prisma contar o tempo de `processarBaixaOrcamento` no
        // timeout interativo (padrão 5s → P2028 em produção com orçamentos grandes).
        const resultadoTx = await prisma.$transaction(async (tx) => {
            // 0. Verificar se já existe venda para este orçamento
            const vendaExistente = await tx.venda.findUnique({
                where: { orcamentoId }
            });

            if (vendaExistente) {
                throw new Error(`Já existe uma venda registrada para este orçamento (Venda #${vendaExistente.numeroVenda}). Não é possível criar venda duplicada.`);
            }

            // 1. Buscar orçamento (com itens) e projeto vinculado
            const orcamento = await tx.orcamento.findUnique({
                where: { id: orcamentoId },
                include: { projeto: true, items: true }
            });

            if (!orcamento) {
                throw new Error('Orçamento não encontrado');
            }

            const statusOrc = String(orcamento.status || '').trim();
            if (!podeGerarPedidoVendaParaOrcamento(statusOrc, false)) {
                throw new Error(
                    `Pedido de venda só pode ser gerado com orçamento aprovado. Status atual: "${statusOrc || '—'}".`
                );
            }

            // Valor a receber pela empresa: total do orçamento menos itens "venda direta fornecedor" (não entram em contas a receber)
            const valorVendaDireta = (orcamento.items || []).filter((i: any) => i.vendaDiretaFornecedor).reduce((s: number, i: any) => s + (Number(i.subtotal) || 0), 0);
            const valorParaContasReceber = Math.round((Math.max(0, (Number(orcamento.precoVenda) || 0) - valorVendaDireta)) * 100) / 100;
            const valorTotalUsar = valorParaContasReceber > 0 ? valorParaContasReceber : valorTotal;

            // Empresa executora: do orçamento (Orçamento → PV → NF-e/NFS-e)
            let empresaFiscalIdFinal: string | null = (orcamento as any).empresaFiscalId || null;
            if (!empresaFiscalIdFinal && (orcamento as any).empresaCNPJ) {
                const cnpjNorm = String((orcamento as any).empresaCNPJ).replace(/\D/g, '');
                if (cnpjNorm.length === 14) {
                    const empresas = await tx.empresaFiscal.findMany({ where: { ativo: true }, take: 50 });
                    const emp = empresas.find(e => e.cnpj.replace(/\D/g, '') === cnpjNorm);
                    if (emp) empresaFiscalIdFinal = emp.id;
                }
            }

            // PV não cria nem altera OS/projeto — só referencia projeto existente do mesmo orçamento, se houver.
            let projetoIdFinal: string | null = orcamento.projeto?.id ?? null;
            if (!projetoIdFinal && projetoId) {
                const projOk = await tx.projeto.findUnique({
                    where: { id: projetoId },
                    select: { orcamentoId: true }
                });
                if (projOk?.orcamentoId === orcamentoId) {
                    projetoIdFinal = projetoId;
                }
            }

            // Recalcular entrada e parcelas quando valor a receber difere do total (itens venda direta)
            const valorEntradaUsar = Math.min(valorEntrada, valorTotalUsar);
            const valorRestanteUsar = Math.round((valorTotalUsar - valorEntradaUsar) * 100) / 100;
            let valoresPorParcelaUsar = valoresPorParcela;
            if (valorTotalUsar !== valorTotal && valorRestanteUsar > 0 && parcelas >= 1) {
                const valorParcelaUnica = Math.round((valorRestanteUsar / parcelas) * 100) / 100;
                valoresPorParcelaUsar = Array(parcelas).fill(valorParcelaUnica);
            }

            // 2. Criar a venda principal (valorTotal = valor que a empresa recebe; exclui venda direta)
            const venda = await tx.venda.create({
                data: {
                    numeroVenda,
                    orcamentoId,
                    valorTotal: valorTotalUsar,
                    clienteId,
                    projetoId: projetoIdFinal,
                    formaPagamento,
                    parcelas,
                    valorEntrada: valorEntradaUsar,
                    observacoes,
                    empresaFiscalId: empresaFiscalIdFinal,
                    vendedorNome: orcamento.orcamentistaNome || null,
                    status: VendaStatus.Pendente
                }
            });

            // 3. Orçamento → Concretizado somente após PV persistido (mesma transação)
            await tx.orcamento.update({
                where: { id: orcamentoId },
                data: {
                    status: ORCAMENTO_STATUS_CONCRETIZADO,
                    aprovedAt: orcamento.aprovedAt ?? new Date()
                }
            });

            // 4. Gerar contas a receber (entrada + parcelas; apenas valor que a empresa recebe)
            const contasReceber: any[] = [];

            if (valorEntradaUsar > 0) {
                const contaEntrada = await tx.contaReceber.create({
                    data: {
                        vendaId: venda.id,
                        descricao: `Entrada - Venda ${numeroVenda}`,
                        valorParcela: valorEntradaUsar,
                        dataVencimento: new Date(),
                        numeroParcela: 0,
                        totalParcelas: parcelas,
                        status: ContaStatus.Pendente
                    }
                });
                contasReceber.push(contaEntrada);
            }

            const parseData = (s: string): Date => {
                const [y, m, d] = s.split('-').map(Number);
                return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
            };

            const dataBasePrimeiraParcela = dataVencimentoPrimeiraParcela
                ? parseData(dataVencimentoPrimeiraParcela)
                : new Date();
            const usarDatasCustomizadas = Array.isArray(datasParcelas) && datasParcelas.length === parcelas;

            for (let i = 1; i <= parcelas; i++) {
                let dataVencimento: Date;
                if (usarDatasCustomizadas && datasParcelas[i - 1]) {
                    dataVencimento = parseData(datasParcelas[i - 1]);
                } else if (i === 1 && dataVencimentoPrimeiraParcela) {
                    dataVencimento = dataBasePrimeiraParcela;
                } else {
                    dataVencimento = new Date(dataBasePrimeiraParcela);
                    dataVencimento.setDate(dataVencimento.getDate() + ((i - 1) * 30));
                }

                const valorDestaParcela = valoresPorParcelaUsar[i - 1] ?? Math.round((valorRestanteUsar / parcelas) * 100) / 100;

                const contaReceber = await tx.contaReceber.create({
                    data: {
                        vendaId: venda.id,
                        descricao: `Parcela ${i}/${parcelas} - Venda ${numeroVenda}`,
                        valorParcela: valorDestaParcela,
                        dataVencimento,
                        numeroParcela: i,
                        totalParcelas: parcelas,
                        status: ContaStatus.Pendente
                    }
                });

                contasReceber.push(contaReceber);
            }

            return {
                venda,
                contasReceber
            };
        }, {
            maxWait: 15000,
            timeout: 60000
        });

        const { venda, contasReceber } = resultadoTx;

        // 4. Baixa de estoque (fora da transação interativa — evita P2028 quando há muitos itens/kits)
        let baixaEstoque: any = null;
        try {
            baixaEstoque = await EstoqueService.processarBaixaOrcamento(
                orcamentoId,
                venda.id
            );
        } catch (error: any) {
            const errMsg = error instanceof Error ? error.message : String(error);
            console.warn(`⚠️ Não foi possível processar baixa de estoque para venda ${venda.id}: ${errMsg}`);
            baixaEstoque = {
                success: false,
                error: errMsg
            };
            try {
                const { criarNotificacao } = await import('../services/notificacoes.service');
                const admins = await prisma.user.findMany({
                    where: { active: true, isAdmin: true },
                    select: { id: true }
                });
                const titulo = `Alerta: Falha ao processar baixa de estoque (Venda ${numeroVenda})`;
                const mensagem = `Ao processar a baixa de estoque para a venda ${numeroVenda} ocorreu um erro:\n${errMsg}\nVerifique o módulo de Estoque/Compras.`;
                for (const a of admins) {
                    await criarNotificacao({
                        userId: a.id,
                        tipo: 'financeiro',
                        titulo,
                        mensagem,
                        metadata: { vendaId: venda.id, orcamentoId, erro: errMsg },
                        enviarEmail: true
                    });
                }
            } catch (notifyErr) {
                console.error('Erro ao notificar administradores sobre problema de estoque:', notifyErr);
            }
        }

        const orcamentoStatusFinal = await VendasService.ensureOrcamentoConcretizadoAposPedidoVenda(orcamentoId);

        return {
            venda,
            contasReceber,
            baixaEstoque,
            orcamentoStatus: orcamentoStatusFinal
        };
    }

    /**
     * Atualiza o valor total da venda e das parcelas (contas a receber) com o valor final do orçamento para PV/Financeiro.
     * Regra: itens marcados como "vendaDiretaFornecedor" não entram no PV/Financeiro (valor a receber).
     * Uso: correção quando o desconto do orçamento não foi aplicado ao PV (apenas role desenvolvedor).
     */
    static async atualizarValorDoOrcamento(vendaId: string) {
        const venda = await prisma.venda.findUnique({
            where: { id: vendaId },
            include: {
                orcamento: {
                    include: {
                        items: true
                    }
                },
                contasReceber: { orderBy: [{ numeroParcela: 'asc' }, { createdAt: 'asc' }] }
            }
        });

        if (!venda) {
            throw new Error('Venda não encontrada');
        }
        if (!venda.orcamento) {
            throw new Error('Orçamento vinculado à venda não encontrado');
        }

        const valorOrcamento = Number(venda.orcamento.precoVenda) || 0;
        const valorVendaDireta = (venda.orcamento.items || [])
          .filter((i: any) => !!i.vendaDiretaFornecedor)
          .reduce((sum: number, i: any) => sum + (Number(i.subtotal) || 0), 0);

        const novoValorTotal = Math.round(Math.max(0, valorOrcamento - valorVendaDireta) * 100) / 100;
        if (novoValorTotal <= 0) {
            throw new Error('Orçamento sem valor final para PV/Financeiro definido');
        }

        const valorAtualVenda = venda.valorTotal;
        if (Math.abs(valorAtualVenda - novoValorTotal) < 0.01) {
            return {
                success: true,
                message: 'Valor já está correto',
                valorAnterior: valorAtualVenda,
                valorNovo: novoValorTotal,
                contasAtualizadas: 0
            };
        }

        return await prisma.$transaction(async (tx) => {
            await tx.venda.update({
                where: { id: vendaId },
                data: { valorTotal: novoValorTotal }
            });

            const contas = await tx.contaReceber.findMany({
                where: { vendaId },
                orderBy: [{ numeroParcela: 'asc' }, { createdAt: 'asc' }]
            });

            const valorEntrada = Number(venda.valorEntrada) || 0;
            const valorRestante = Math.round((novoValorTotal - valorEntrada) * 100) / 100;

            const parcelasNormais = contas.filter(c => c.numeroParcela != null && c.numeroParcela >= 1);
            const n = parcelasNormais.length;
            let contasAtualizadas = 0;

            if (n > 0) {
                const valorParcelaBase = Math.round((valorRestante / n) * 100) / 100;
                let soma = 0;
                for (let i = 0; i < parcelasNormais.length; i++) {
                    const conta = parcelasNormais[i];
                    const isLast = i === parcelasNormais.length - 1;
                    const novoValorParcela = isLast
                        ? Math.round((valorRestante - soma) * 100) / 100
                        : valorParcelaBase;
                    soma += novoValorParcela;

                    await tx.contaReceber.update({
                        where: { id: conta.id },
                        data: { valorParcela: novoValorParcela }
                    });
                    contasAtualizadas++;
                }
            }

            return {
                success: true,
                message: 'Valor do PV e parcelas atualizados com o valor final do orçamento',
                valorAnterior: valorAtualVenda,
                valorNovo: novoValorTotal,
                contasAtualizadas
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
    /**
     * Lista vendas com paginação
     * ✅ CORREÇÃO CRÍTICA: Aumentar limit padrão de 10 para 1000 para evitar perda de dados em auditoria
     */
    static async listarVendas(page: number = 1, limit: number = 1000) {
        const skip = (page - 1) * limit;

        const [vendas, total] = await Promise.all([
            prisma.venda.findMany({
                skip,
                take: limit,
                // Ordenar por número sequencial decrescente para que novos pedidos apareçam no topo
                orderBy: { numeroSequencial: 'desc' },
                include: {
                    cliente: true,
                    projeto: true,
                    contasReceber: true,
                    orcamento: {
                        include: {
                            empresaFiscal: { select: { id: true, razaoSocial: true, nomeFantasia: true, cnpj: true } },
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

        console.log(`💰 Vendas listadas: ${vendas.length} de ${total} total (página ${page}, limit ${limit})`);

        const valorFaturadoDefault = 0;
        const vendasComSaldo = vendas.map((v: any) => ({
            ...v,
            saldoAFaturar: Number(v.valorTotal || 0) - Number(v.valorFaturado ?? valorFaturadoDefault)
        }));

        return {
            vendas: vendasComSaldo,
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
        const venda = await prisma.venda.findUnique({
            where: { id },
            include: {
                cliente: true,
                projeto: true,
                contasReceber: true,
                orcamento: {
                    include: {
                        empresaFiscal: { select: { id: true, razaoSocial: true, nomeFantasia: true, cnpj: true } },
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
        if (!venda) return null;
        const valorFaturado = Number((venda as any).valorFaturado ?? 0);
        return {
            ...venda,
            saldoAFaturar: Number(venda.valorTotal || 0) - valorFaturado
        };
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
     * Atualiza o status da venda (ex.: para Faturado após emissão de NF-e/NFS-e)
     */
    static async atualizarStatus(id: string, status: string) {
        const venda = await prisma.venda.findUnique({ where: { id } });
        if (!venda) throw new Error('Venda não encontrada');
        return await prisma.venda.update({
            where: { id },
            data: { status, updatedAt: new Date() }
        });
    }

    /**
     * Registra recebimento (total ou parcial) em uma conta a receber.
     * - Cria registro em RecebimentoParcial (histórico).
     * - Atualiza valorRecebido e status: "Recebido Parcial" (azul) ou "Pago" quando quitar.
     * - Quando todas as parcelas da venda estiverem Pago, marca venda como Concluida.
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

        const valorRecebidoAtual = Number(conta.valorRecebido ?? 0);
        const saldoRestante = conta.valorParcela - valorRecebidoAtual;

        const valorBaseInformado = payload?.valorRecebido != null
            ? parseMoney(payload.valorRecebido)
            : saldoRestante;
        const jurosInformado = parseMoney(payload?.valorJuros);
        const descontoInformado = parseMoney(payload?.valorDesconto);

        let valorPago: number;
        let valorJurosRegistro = 0;
        let valorDescontoRegistro = 0;

        if (payload?.valorJuros != null || payload?.valorDesconto != null) {
            const validado = validarValoresFinanceiros(
                valorBaseInformado,
                jurosInformado,
                descontoInformado,
                { exigirBasePositivo: valorBaseInformado > 0 }
            );
            valorPago = validado.valorARegistrar;
            valorJurosRegistro = validado.valorJuros;
            valorDescontoRegistro = validado.valorDesconto;
        } else {
            valorPago = valorBaseInformado;
            if (valorPago <= 0) {
                throw new Error('Valor recebido deve ser maior que zero');
            }
        }

        if (valorPago <= 0) {
            throw new Error('Valor a registrar deve ser maior que zero');
        }
        if (valorPago > saldoRestante + 0.01) {
            throw new Error(
                `Valor a registrar (R$ ${valorPago.toFixed(2)}) não pode ser maior que o saldo restante (R$ ${saldoRestante.toFixed(2)})`
            );
        }

        // Parsear data
        let dataPagamento: Date;
        if (payload?.dataPagamento) {
            const dataStr = payload.dataPagamento;
            if (typeof dataStr === 'string') {
                if (dataStr.includes('-') && !dataStr.includes('T')) {
                    const [ano, mes, dia] = dataStr.split('-').map(Number);
                    dataPagamento = new Date(ano, mes - 1, dia, 12, 0, 0, 0);
                } else {
                    dataPagamento = new Date(dataStr);
                }
            } else {
                dataPagamento = new Date(dataStr);
            }
        } else {
            dataPagamento = new Date();
        }

        // Registrar no histórico de recebimentos parciais
        await prisma.recebimentoParcial.create({
            data: {
                contaReceberId: id,
                valorPago,
                valorJuros: valorJurosRegistro > 0 ? valorJurosRegistro : null,
                valorDesconto: valorDescontoRegistro > 0 ? valorDescontoRegistro : null,
                dataPagamento,
                observacoes: payload?.observacoes ?? null,
                meioPagamento: payload?.meioPagamento ?? null
            }
        });

        const novoValorRecebido = valorRecebidoAtual + valorPago;
        const quitado = novoValorRecebido >= conta.valorParcela - 0.005;
        const novoStatus = quitado ? ContaStatus.Pago : (ContaStatus as any).RecebidoParcial ?? 'Recebido Parcial';

        const contaAtualizada = await prisma.contaReceber.update({
            where: { id },
            data: {
                valorRecebido: novoValorRecebido,
                status: novoStatus,
                dataPagamento: dataPagamento,
                observacoes: payload?.observacoes ?? conta.observacoes,
                meioPagamento: payload?.meioPagamento ?? undefined,
                ...(valorJurosRegistro > 0 && { valorJuros: valorJurosRegistro }),
                ...(valorDescontoRegistro > 0 && { valorDesconto: valorDescontoRegistro }),
                updatedAt: new Date()
            }
        });

        if (conta.vendaId && quitado) {
            const contasDaVenda = await prisma.contaReceber.findMany({
                where: { vendaId: conta.vendaId }
            });
            const todasPagas = contasDaVenda.every(c => c.status === ContaStatus.Pago);
            if (todasPagas) {
                await prisma.venda.update({
                    where: { id: conta.vendaId },
                    data: { status: VendaStatus.Concluida, updatedAt: new Date() }
                });
            }
        }

        try {
            const { criarNotificacao } = await import('./notificacoes.service');
            const usuarios = await prisma.user.findMany({
                where: {
                    active: true,
                    role: { equals: 'financeiro_faturamento', mode: 'insensitive' }
                },
                select: { id: true }
            });
            const titulo = quitado ? 'Conta a receber quitada' : 'Recebimento parcial registrado';
            const mensagem = quitado
                ? `Parcela quitada • Valor: R$ ${conta.valorParcela.toFixed(2)} • Data: ${dataPagamento.toISOString().slice(0, 10)}`
                : `Recebido R$ ${valorPago.toFixed(2)} • Saldo restante: R$ ${(conta.valorParcela - novoValorRecebido).toFixed(2)}`;
            for (const u of usuarios) {
                await criarNotificacao({
                    userId: u.id,
                    tipo: 'financeiro',
                    titulo,
                    mensagem,
                    metadata: { contaReceberId: contaAtualizada.id, vendaId: contaAtualizada.vendaId },
                    enviarEmail: true
                });
            }
        } catch (err) {
            console.error('Erro ao notificar sobre pagamento de conta a receber:', err);
        }

        return contaAtualizada;
    }

    /**
     * Atualização parcial da venda: parcelas (datas/valores) e NCM dos itens do orçamento.
     * Não permite adicionar/remover itens.
     */
    static async atualizarVenda(
        id: string,
        payload: {
            parcelas?: Array<{ id: string; dataVencimento?: string; valorParcela?: number }>;
            itensNcm?: Array<{ id: string; ncm: string }>;
        }
    ) {
        const venda = await prisma.venda.findUnique({
            where: { id },
            include: { orcamento: { select: { id: true } }, contasReceber: { select: { id: true } } }
        });
        if (!venda) throw new Error('Venda não encontrada');

        await prisma.$transaction(async (tx) => {
            if (payload.parcelas && payload.parcelas.length > 0) {
                const contaIdsDaVenda = new Set((venda.contasReceber || []).map((c: any) => c.id));
                for (const p of payload.parcelas) {
                    if (!contaIdsDaVenda.has(p.id)) continue;
                    const data: any = { updatedAt: new Date() };
                    if (p.dataVencimento != null) {
                        const s = String(p.dataVencimento).trim();
                        if (s.includes('-') && !s.includes('T')) {
                            const [ano, mes, dia] = s.split('-').map(Number);
                            data.dataVencimento = new Date(ano, mes - 1, dia, 12, 0, 0, 0);
                        } else {
                            data.dataVencimento = new Date(s);
                        }
                    }
                    if (p.valorParcela != null && typeof p.valorParcela === 'number') data.valorParcela = p.valorParcela;
                    if (Object.keys(data).length > 1) {
                        await tx.contaReceber.update({ where: { id: p.id }, data });
                    }
                }
            }
            if (payload.itensNcm && payload.itensNcm.length > 0 && venda.orcamentoId) {
                const itensDoOrcamento = await tx.orcamentoItem.findMany({
                    where: { orcamentoId: venda.orcamentoId },
                    select: { id: true }
                });
                const idsValidos = new Set(itensDoOrcamento.map((i: any) => i.id));
                for (const it of payload.itensNcm) {
                    if (!idsValidos.has(it.id) || it.ncm == null) continue;
                    await tx.orcamentoItem.update({
                        where: { id: it.id },
                        data: { ncm: String(it.ncm).trim() }
                    });
                }
            }
        });
        return VendasService.buscarVenda(id);
    }
}
